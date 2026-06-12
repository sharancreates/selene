from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.types import TypeDecorator, Text
from datetime import date
import secrets
import hashlib
import os
import json
from cryptography.fernet import Fernet

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


# Setup Fernet Encryption Key
# Attempts to read environment key; if absent, raises ValueError unless in a testing context
encryption_key = os.environ.get('SELENE_ENCRYPTION_KEY')
if not encryption_key:
    import sys
    is_testing = 'unittest' in sys.modules or os.environ.get('TESTING') == 'True' or os.environ.get('FLASK_ENV') == 'testing'
    if is_testing:
        # Generate temporary key for unit testing execution contexts
        encryption_key = Fernet.generate_key().decode()
    else:
        raise ValueError("SELENE_ENCRYPTION_KEY environment variable is required.")

cipher_suite = Fernet(encryption_key.encode())


def encrypt_val(val):
    if val is None:
        return None
    val_str = str(val)
    return cipher_suite.encrypt(val_str.encode()).decode()


def decrypt_val(encrypted_val, target_type=str):
    if encrypted_val is None:
        return None
    try:
        decrypted_str = cipher_suite.decrypt(encrypted_val.encode()).decode()
        if target_type == int:
            return int(decrypted_str)
        elif target_type == float:
            return float(decrypted_str)
        elif target_type == dict:
            return json.loads(decrypted_str)
        return decrypted_str
    except Exception:
        # Graceful fallback: If it is not ciphertext (e.g. legacy logs), return cleartext
        try:
            if target_type == int:
                return int(encrypted_val)
            elif target_type == float:
                return float(encrypted_val)
            elif target_type == dict:
                return json.loads(encrypted_val)
        except Exception:
            pass
        return encrypted_val


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
    
    # Baseline configurations (used for cycle prediction computations)
    cycle_length_baseline = db.Column(db.Integer, nullable=False, default=28)
    period_length_baseline = db.Column(db.Integer, nullable=False, default=5)
    
    # Chronic condition profile flags
    has_pcos = db.Column(db.Boolean, nullable=False, default=False)
    has_pmdd = db.Column(db.Boolean, nullable=False, default=False)
    has_endo = db.Column(db.Boolean, nullable=False, default=False)
    
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
            "has_endo": self.has_endo
        }

    def __repr__(self):
        return f"<User {self.username}>"


class DailyLog(db.Model):
    """
    DailyLog Model representing symptoms, vitals, moods, and actions logged on a specific date.
    Strictly enforced unique constraint on (user_id, log_date).
    """
    __tablename__ = 'daily_logs'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    log_date = db.Column(db.Date, nullable=False, index=True)
    
    # Cycle phase string (menstrual, follicular, ovulatory, luteal) (Encrypted)
    phase = db.Column(EncryptedString, nullable=False)
    
    # Symptom spectrum fields (bounded in the 0–100 integer range) (Encrypted)
    energy_level = db.Column(EncryptedInt, nullable=True)
    pelvic_pain = db.Column(EncryptedInt, nullable=True)
    flow_intensity = db.Column(EncryptedInt, nullable=True)
    back_pain = db.Column(EncryptedInt, nullable=True)
    sleep_quality = db.Column(EncryptedInt, nullable=True)
    
    # Physiological vitals (Encrypted)
    basal_body_temp = db.Column(EncryptedFloat, nullable=True)
    
    # Flexible JSON objects: mood tracking, condition symptoms, and lifestyle activities. (Encrypted)
    mood_toggles = db.Column(EncryptedJSON, nullable=True, default=dict)
    symptom_tags = db.Column(EncryptedJSON, nullable=True, default=dict)
    lifestyle_actions = db.Column(EncryptedJSON, nullable=True, default=dict)
    
    # Composite unique key: one log per user per calendar day
    __table_args__ = (
        db.UniqueConstraint('user_id', 'log_date', name='uq_user_log_date'),
    )

    def to_dict(self):
        """Helper method to serialize a daily log entry."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "log_date": self.log_date.isoformat() if isinstance(self.log_date, date) else self.log_date,
            "phase": self.phase,
            "energy_level": self.energy_level,
            "pelvic_pain": self.pelvic_pain,
            "flow_intensity": self.flow_intensity,
            "back_pain": self.back_pain,
            "sleep_quality": self.sleep_quality,
            "basal_body_temp": self.basal_body_temp,
            "mood_toggles": self.mood_toggles,
            "symptom_tags": self.symptom_tags,
            "lifestyle_actions": self.lifestyle_actions
        }

    def __repr__(self):
        return f"<DailyLog User {self.user_id} on {self.log_date}>"
