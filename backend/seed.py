import os
import sys
import base64
import secrets
import random
from datetime import datetime, date, timedelta
from flask import g
from argon2 import PasswordHasher

# Ensure backend directory is in path for imports
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from models import db, User, DailyLog
from auth import derive_kek_server
from cryptography.fernet import Fernet

def seed_data():
    app = create_app()
    ph = PasswordHasher()

    with app.app_context():
        print("Initializing Selene Demo Data Seeder...")
        
        # 1. Clean up existing demouser to keep script idempotent
        username = "demouser"
        pin = "123456"
        
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            print(f"Removing existing {username} and associated logs...")
            db.session.delete(existing_user)
            db.session.commit()
            
        print(f"Registering new test user: {username} (PIN: {pin})...")
        
        # 2. Key Derivation & Hashing
        kek_pin = derive_kek_server(pin, username, is_recovery=False)
        dek = Fernet.generate_key().decode()
        
        pin_hash = ph.hash(pin)
        
        cipher_pin = Fernet(kek_pin.encode())
        encrypted_dek_pin = cipher_pin.encrypt(dek.encode()).decode()
        
        recovery_key = "selene-recovery-" + secrets.token_hex(16)
        recovery_hash = ph.hash(recovery_key)
        
        kek_recovery = derive_kek_server(recovery_key, username, is_recovery=True)
        cipher_recovery = Fernet(kek_recovery.encode())
        encrypted_dek_recovery = cipher_recovery.encrypt(dek.encode()).decode()
        
        # Set g.user_encryption_key so the models auto-encrypt logs and user attributes
        g.user_encryption_key = dek

        # 3. Create User Profile
        user = User(
            username=username,
            pin_hash=pin_hash,
            recovery_hash=recovery_hash,
            encrypted_dek_pin=encrypted_dek_pin,
            encrypted_dek_recovery=encrypted_dek_recovery,
            cycle_length_baseline=28,
            period_length_baseline=5,
            has_pcos=False,
            has_pmdd=False,
            has_endo=False,
            has_onboarded=True,
            disclaimer_accepted=True,
            disclaimer_signed_name="Demo User",
            terms_accepted=True,
            terms_signed_name="Demo User"
        )
        db.session.add(user)
        db.session.flush()  # Populate user.id
        
        # 4. Generate 120 Days of Menstrual Tracking logs
        print("Generating 120 days of physiological logs...")
        start_date = date.today() - timedelta(days=119)
        
        for d in range(120):
            current_date = start_date + timedelta(days=d)
            cycle_day = d % 28
            
            # Initialize metrics
            phase = 'follicular'
            energy_level = 50
            pelvic_pain = 0
            flow_intensity = 0
            back_pain = 0
            sleep_quality = 70
            bbt = 97.5
            mood_toggles = {}
            symptom_tags = {}
            lifestyle_actions = {}
            
            if 0 <= cycle_day < 5:
                # Menstrual Phase
                phase = 'menstrual'
                flow_map = [75, 85, 55, 30, 10]
                pain_map = [60, 70, 45, 20, 5]
                flow_intensity = flow_map[cycle_day]
                pelvic_pain = pain_map[cycle_day]
                back_pain = max(0, pelvic_pain - 20)
                energy_level = random.randint(25, 45)
                sleep_quality = random.randint(50, 68)
                bbt = round(97.2 + random.uniform(-0.15, 0.15), 2)
                
                if cycle_day < 3:
                    mood_toggles = {"fatigued": True, "crampy": True}
                    symptom_tags = {"bloating": True, "headache": True}
                    lifestyle_actions = {"meds": [True, False, False]}
                else:
                    mood_toggles = {"fatigued": True}
                    symptom_tags = {"bloating": True}
                    lifestyle_actions = {"meds": [False, False, False]}
                    
            elif 5 <= cycle_day < 13:
                # Follicular Phase
                phase = 'follicular'
                flow_intensity = 0
                pelvic_pain = 0
                back_pain = 0
                energy_level = random.randint(65, 85)
                sleep_quality = random.randint(70, 90)
                bbt = round(97.4 + random.uniform(-0.15, 0.15), 2)
                
                mood_toggles = {"motivated": True, "creative": True, "calm": True}
                symptom_tags = {"mentalClarity": True, "skinImprovement": True}
                lifestyle_actions = {"meds": [False, False, False]}
                
            elif 13 <= cycle_day < 16:
                # Ovulatory Phase
                phase = 'ovulatory'
                flow_intensity = 0
                pelvic_pain = random.choice([0, 0, 10])  # slight twinges
                back_pain = 0
                energy_level = random.randint(80, 95)
                sleep_quality = random.randint(75, 95)
                bbt = round(97.6 + random.uniform(-0.1, 0.1), 2)
                
                mood_toggles = {"magnetic": True, "outgoing": True, "highEnergy": True}
                symptom_tags = {"positiveLh": True, "stretchyMucus": True}
                lifestyle_actions = {"meds": [False, False, False]}
                
            else:
                # Luteal Phase (days 16-27)
                phase = 'luteal'
                flow_intensity = 0
                
                # PMS builds in late luteal
                days_until_period = 27 - cycle_day
                if days_until_period <= 4:
                    pelvic_pain = random.randint(10, 25)
                    back_pain = random.randint(15, 30)
                    energy_level = random.randint(35, 55)
                    sleep_quality = random.randint(45, 65)
                    mood_toggles = {"anxious": True, "tired": True}
                    symptom_tags = {"bloating": True, "waterRetention": True}
                    lifestyle_actions = {"meds": [False, True, False]}
                    bbt = round(98.3 + random.uniform(-0.15, 0.15), 2)
                else:
                    pelvic_pain = 0
                    back_pain = 0
                    energy_level = random.randint(55, 75)
                    sleep_quality = random.randint(65, 85)
                    mood_toggles = {"nesting": True}
                    lifestyle_actions = {"meds": [False, False, False]}
                    bbt = round(98.1 + random.uniform(-0.15, 0.15), 2)
            
            log = DailyLog(
                user_id=user.id,
                log_date=current_date
            )
            # Set properties individually to ensure correct encryption mapping
            log.phase = phase
            log.energy_level = energy_level
            log.pelvic_pain = pelvic_pain
            log.flow_intensity = flow_intensity
            log.back_pain = back_pain
            log.sleep_quality = sleep_quality
            log.basal_body_temp = bbt
            log.mood_toggles = mood_toggles
            log.symptom_tags = symptom_tags
            log.lifestyle_actions = lifestyle_actions
            
            db.session.add(log)
            
        db.session.commit()
        print("\nSuccess! Generated 120 days of high-fidelity tracking history.")
        print(f"Demo Account username: {username}")
        print(f"Demo Account PIN:      {pin}")
        print(f"Demo Recovery key:     {recovery_key}")
        print("You can now login with this account to view immediate data visualizations.")

if __name__ == "__main__":
    seed_data()
