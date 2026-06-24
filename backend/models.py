from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.types import TypeDecorator, Text
from datetime import date
import secrets
import hashlib
import os
import json
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import base64

# Shared database instance to be initialized in app.py
db = SQLAlchemy()


def is_valid_pin(pin):
    """
    Validates PIN meets security requirements:
    - Minimum 6 characters (digits or alphanumeric)
    - For numeric PINs: exactly 6+ digits
    - For alphanumeric: mixed character types recommended
    """
    if not pin:
        return False, "PIN is required"
    pin_str = str(pin)
    if len(pin_str) < 6:
        return False, "PIN must be at least 6 characters"
    return True, None


def get_cipher_key():
    from flask import g, has_app_context
    if has_app_context() and hasattr(g, 'user_encryption_key') and g.user_encryption_key:
        return g.user_encryption_key
    raise ValueError("User encryption key is missing. Active session or context required.")


def encrypt_val(val):
    if val is None:
        return None
    val_str = str(val)
    # Check if it already looks like a valid base64-encoded AES-GCM ciphertext
    if isinstance(val, str) and len(val) > 20:
        try:
            decoded = base64.b64decode(val.replace('-', '+').replace('_', '/'), validate=True)
            if len(decoded) >= 12:
                # Already encrypted!
                return val
        except Exception:
            pass

    try:
        dek = get_cipher_key()
        key = base64.b64decode(dek.replace('-', '+').replace('_', '/'))
        aesgcm = AESGCM(key)
        iv = os.urandom(12)
        ciphertext = aesgcm.encrypt(iv, val_str.encode('utf-8'), None)
        combined = iv + ciphertext
        return base64.b64encode(combined).decode('utf-8')
    except Exception as e:
        raise ValueError(f"Encryption failed: {str(e)}")


def decrypt_val(encrypted_val, target_type=str):
    if encrypted_val is None:
        return None
    val_str = str(encrypted_val)
    if not (val_str.endswith("==") or len(val_str) > 20):
        # Fallback to direct casting for plaintext/legacy values
        try:
            if target_type == int:
                return int(val_str)
            elif target_type == float:
                return float(val_str)
            elif target_type == dict:
                return json.loads(val_str)
            return val_str
        except Exception:
            return val_str

    try:
        dek = get_cipher_key()
        key = base64.b64decode(dek.replace('-', '+').replace('_', '/'))
        raw_data = base64.b64decode(val_str)
        if len(raw_data) < 12:
            return val_str
        iv = raw_data[:12]
        ciphertext = raw_data[12:]
        aesgcm = AESGCM(key)
        decrypted_bytes = aesgcm.decrypt(iv, ciphertext, None)
        decrypted_str = decrypted_bytes.decode('utf-8')
        
        if target_type == int:
            return int(decrypted_str)
        elif target_type == float:
            return float(decrypted_str)
        elif target_type == dict:
            return json.loads(decrypted_str)
        return decrypted_str
    except Exception:
        # Fallback to raw string if decryption fails (e.g. key mismatch or not actually encrypted)
        return val_str


class EncryptedString(TypeDecorator):
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return encrypt_val(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return decrypt_val(value, str)


class EncryptedInt(TypeDecorator):
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return encrypt_val(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return decrypt_val(value, int)


class EncryptedFloat(TypeDecorator):
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return encrypt_val(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return decrypt_val(value, float)


class EncryptedJSON(TypeDecorator):
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return encrypt_val(json.dumps(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return decrypt_val(value, dict)


class User(db.Model):
    """
    User Model representing the user credentials, baseline characteristics, 
    and underlying chronic health conditions.
    """
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    pin_hash = db.Column(db.String(255), nullable=False)
    refresh_token_hash = db.Column(db.String(255), nullable=True)
    recovery_hash = db.Column(db.String(255), nullable=True)
    encrypted_dek_pin = db.Column(db.Text, nullable=True)
    encrypted_dek_recovery = db.Column(db.Text, nullable=True)

    
    # Baseline configurations (used for cycle prediction computations)
    cycle_length_baseline = db.Column(db.Integer, nullable=False, default=28)
    period_length_baseline = db.Column(db.Integer, nullable=False, default=5)
    
    # Chronic condition profile flags
    has_pcos = db.Column(db.Boolean, nullable=False, default=False)
    has_pmdd = db.Column(db.Boolean, nullable=False, default=False)
    has_endo = db.Column(db.Boolean, nullable=False, default=False)
    has_onboarded = db.Column(db.Boolean, nullable=False, default=False)
    
    # Medical Disclaimer Agreement
    disclaimer_accepted = db.Column(db.Boolean, nullable=False, default=False)
    disclaimer_signed_name = db.Column(EncryptedString, nullable=True)
    
    # Terms & Conditions Agreement
    terms_accepted = db.Column(db.Boolean, nullable=False, default=False)
    terms_signed_name = db.Column(EncryptedString, nullable=True)
    
    # Soft delete flags for 30-day recovery window
    is_deleted = db.Column(db.Boolean, nullable=False, default=False)
    deleted_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    logs = db.relationship('DailyLog', backref='user', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        """Helper method to serialize a user profile."""
        return {
            "id": self.id,
            "username": self.username,
            "cycle_length_baseline": self.cycle_length_baseline,
            "period_length_baseline": self.period_length_baseline,
            "has_pcos": self.has_pcos,
            "has_pmdd": self.has_pmdd,
            "has_endo": self.has_endo,
            "has_onboarded": self.has_onboarded,
            "disclaimer_accepted": self.disclaimer_accepted,
            "disclaimer_signed_name": self.disclaimer_signed_name,
            "terms_accepted": self.terms_accepted,
            "terms_signed_name": self.terms_signed_name
        }

    def __repr__(self):
        return f"<User {self.username}>"


CLINICAL_CODE_MAPPING = {
    "energy_level": {
        "loinc": "85585-8",
        "loinc_name": "Energy level",
        "snomed": "248250005",
        "snomed_name": "Fatigue"
    },
    "pelvic_pain": {
        "loinc": "72514-3",
        "loinc_name": "Pain severity - Pelvic region",
        "snomed": "76046002",
        "snomed_name": "Pelvic pain"
    },
    "flow_intensity": {
        "loinc": "84566-9",
        "loinc_name": "Menstrual flow intensity",
        "snomed": "128704005",
        "snomed_name": "Menstrual flow"
    },
    "back_pain": {
        "loinc": "29463-7",
        "loinc_name": "Back pain",
        "snomed": "279039007",
        "snomed_name": "Low back pain"
    },
    "sleep_quality": {
        "loinc": "81320-4",
        "loinc_name": "Sleep quality",
        "snomed": "301345002",
        "snomed_name": "Sleep pattern"
    },
    "basal_body_temp": {
        "loinc": "8310-5",
        "loinc_name": "Body temperature",
        "snomed": "386725007",
        "snomed_name": "Body temperature"
    }
}


class DailyLog(db.Model):
    """
    DailyLog Model representing symptoms, vitals, moods, and actions logged on a specific date.
    Strictly enforced unique constraint on (user_id, log_date).
    """
    __tablename__ = 'daily_logs'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    log_date = db.Column(db.Date, nullable=False, index=True)
    
    # Store all encrypted symptom values in a single text column
    encrypted_data = db.Column(db.Text, nullable=True)
    
    # Composite unique key: one log per user per calendar day
    __table_args__ = (
        db.UniqueConstraint('user_id', 'log_date', name='uq_user_log_date'),
    )

    @property
    def decrypted_dict(self):
        if not hasattr(self, '_decrypted_cache'):
            if not self.encrypted_data:
                self._decrypted_cache = {}
            else:
                try:
                    decrypted_str = decrypt_val(self.encrypted_data, str)
                    self._decrypted_cache = json.loads(decrypted_str)
                except Exception:
                    self._decrypted_cache = {}
        return self._decrypted_cache

    def update_encrypted_data(self, key, value):
        d = dict(self.decrypted_dict)
        d[key] = value
        self._decrypted_cache = d
        self.encrypted_data = encrypt_val(json.dumps(d))

    @property
    def phase(self):
        val = self.decrypted_dict.get('phase')
        return val if val is not None else 'follicular'

    @phase.setter
    def phase(self, val):
        self.update_encrypted_data('phase', val)

    @property
    def energy_level(self):
        return self.decrypted_dict.get('energy_level')

    @energy_level.setter
    def energy_level(self, val):
        self.update_encrypted_data('energy_level', val)

    @property
    def pelvic_pain(self):
        return self.decrypted_dict.get('pelvic_pain')

    @pelvic_pain.setter
    def pelvic_pain(self, val):
        self.update_encrypted_data('pelvic_pain', val)

    @property
    def flow_intensity(self):
        return self.decrypted_dict.get('flow_intensity')

    @flow_intensity.setter
    def flow_intensity(self, val):
        self.update_encrypted_data('flow_intensity', val)

    @property
    def back_pain(self):
        return self.decrypted_dict.get('back_pain')

    @back_pain.setter
    def back_pain(self, val):
        self.update_encrypted_data('back_pain', val)

    @property
    def sleep_quality(self):
        return self.decrypted_dict.get('sleep_quality')

    @sleep_quality.setter
    def sleep_quality(self, val):
        self.update_encrypted_data('sleep_quality', val)

    @property
    def basal_body_temp(self):
        return self.decrypted_dict.get('basal_body_temp')

    @basal_body_temp.setter
    def basal_body_temp(self, val):
        self.update_encrypted_data('basal_body_temp', val)

    @property
    def mood_toggles(self):
        return self.decrypted_dict.get('mood_toggles') or {}

    @mood_toggles.setter
    def mood_toggles(self, val):
        self.update_encrypted_data('mood_toggles', val)

    @property
    def symptom_tags(self):
        return self.decrypted_dict.get('symptom_tags') or {}

    @symptom_tags.setter
    def symptom_tags(self, val):
        self.update_encrypted_data('symptom_tags', val)

    @property
    def lifestyle_actions(self):
        return self.decrypted_dict.get('lifestyle_actions') or {}

    @lifestyle_actions.setter
    def lifestyle_actions(self, val):
        self.update_encrypted_data('lifestyle_actions', val)

    def to_dict(self):
        """Helper method to serialize a daily log entry with legacy read fallbacks."""
        flow = self.flow_intensity
        pelvic = self.pelvic_pain
        back = self.back_pain
        energy = self.energy_level

        tags = self.symptom_tags or {}
        
        if self.phase == 'follicular':
            if 'focus' in tags:
                flow = tags['focus']
            if 'strength' in tags:
                pelvic = tags['strength']
            if 'glow' in tags:
                back = tags['glow']
        elif self.phase == 'ovulatory':
            if 'libido' in tags:
                flow = tags['libido']
            if 'confidence' in tags:
                pelvic = tags['confidence']
            if 'bloating' in tags:
                back = tags['bloating']
        elif self.phase == 'luteal':
            if 'bloating' in tags:
                flow = tags['bloating']
            if 'breastSensitivity' in tags:
                pelvic = tags['breastSensitivity']
            if 'anxiety' in tags:
                energy = tags['anxiety']
            if 'cravings' in tags:
                back = tags['cravings']

        return {
            "id": self.id,
            "user_id": self.user_id,
            "log_date": self.log_date.isoformat() if isinstance(self.log_date, date) else self.log_date,
            "phase": self.phase,
            "energy_level": energy,
            "pelvic_pain": pelvic,
            "flow_intensity": flow,
            "back_pain": back,
            "sleep_quality": self.sleep_quality,
            "basal_body_temp": self.basal_body_temp,
            "mood_toggles": self.mood_toggles,
            "symptom_tags": self.symptom_tags,
            "lifestyle_actions": self.lifestyle_actions,
            "clinical_codes": CLINICAL_CODE_MAPPING
        }
    def __repr__(self):
        return f"<DailyLog User {self.user_id} on {self.log_date}>"


class RevokedToken(db.Model):
    """
    RevokedToken Model representing blacklisted JWT identifiers (jti)
    along with their expiration dates, to clean up expired entries periodically.
    """
    __tablename__ = 'revoked_tokens'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    jti = db.Column(db.String(120), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)

    def __repr__(self):
        return f"<RevokedToken {self.jti}>"


class PredictionFeedback(db.Model):
    """
    PredictionFeedback Model representing the rating and validation feedback 
    provided by users on cycle predictions.
    """
    __tablename__ = 'prediction_feedback'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    prediction_date = db.Column(db.Date, nullable=False)
    actual_start_date = db.Column(db.Date, nullable=True)
    rating = db.Column(db.Integer, nullable=False)  # 1 to 5 stars
    comments = db.Column(EncryptedString, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "prediction_date": self.prediction_date.isoformat() if self.prediction_date else None,
            "actual_start_date": self.actual_start_date.isoformat() if self.actual_start_date else None,
            "rating": self.rating,
            "comments": self.comments,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<PredictionFeedback User {self.user_id} Rating {self.rating}>"
