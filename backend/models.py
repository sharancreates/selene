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


def get_cipher():
    from flask import g, has_app_context
    if has_app_context() and hasattr(g, 'user_encryption_key') and g.user_encryption_key:
        return Fernet(g.user_encryption_key.encode())
    raise ValueError("User encryption key is missing. Active session or context required.")


def encrypt_val(val):
    if val is None:
        return None
    val_str = str(val)
    cipher = get_cipher()
    return cipher.encrypt(val_str.encode()).decode()


def decrypt_val(encrypted_val, target_type=str):
    if encrypted_val is None:
        return None
    cipher = get_cipher()
    decrypted_str = cipher.decrypt(encrypted_val.encode()).decode()
    if target_type == int:
        return int(decrypted_str)
    elif target_type == float:
        return float(decrypted_str)
    elif target_type == dict:
        return json.loads(decrypted_str)
    return decrypted_str



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
            "lifestyle_actions": self.lifestyle_actions
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
