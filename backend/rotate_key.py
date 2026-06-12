import os
import sys
from cryptography.fernet import Fernet
from sqlalchemy import text

# Ensure backend directory is in python path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from models import db

def rotate_keys(app=None, key_path=None, old_key=None, new_key=None):
    if app is None:
        app = create_app()
    with app.app_context():
        # Retrieve the old key
        if old_key is None:
            if key_path is not None and os.path.exists(key_path):
                with open(key_path, 'r') as f:
                    old_key = f.read().strip()
            else:
                old_key = os.environ.get('SELENE_ENCRYPTION_KEY')
                
        if not old_key:
            print("Error: No old encryption key provided or found in environment variable 'SELENE_ENCRYPTION_KEY'.")
            sys.exit(1)
            
        # Generate new key if not provided
        if new_key is None:
            new_key = Fernet.generate_key().decode()
            
        print(f"Old key: {old_key[:10]}...{old_key[-10:]}")
        print(f"New key: {new_key[:10]}...{new_key[-10:]}")
        
        old_cipher = Fernet(old_key.encode())
        new_cipher = Fernet(new_key.encode())
        
        # We need to decrypt existing data using old_cipher and encrypt with new_cipher
        columns = [
            'phase', 'energy_level', 'pelvic_pain', 'flow_intensity', 
            'back_pain', 'sleep_quality', 'basal_body_temp', 
            'mood_toggles', 'symptom_tags', 'lifestyle_actions'
        ]
        
        try:
            # Query all logs from the daily_logs table using raw SQL
            sql_select = text(f"SELECT id, {', '.join(columns)} FROM daily_logs")
            rows = db.session.execute(sql_select).fetchall()
            
            print(f"Found {len(rows)} daily log entries to rotate.")
            
            rotated_count = 0
            for row in rows:
                log_id = row[0]
                updates = {}
                for idx, col in enumerate(columns, start=1):
                    raw_val = row[idx]
                    if raw_val is not None:
                        # Decrypt with old key, fallback to raw value if it is legacy plaintext
                        decrypted_val = None
                        try:
                            decrypted_val = old_cipher.decrypt(raw_val.encode()).decode()
                        except Exception:
                            # It could be plaintext, try to keep it as is
                            decrypted_val = raw_val
                        
                        # Re-encrypt with new key
                        new_encrypted_val = new_cipher.encrypt(decrypted_val.encode()).decode()
                        updates[col] = new_encrypted_val
                
                if updates:
                    set_clause = ", ".join([f"{col} = :{col}" for col in updates.keys()])
                    sql_update = text(f"UPDATE daily_logs SET {set_clause} WHERE id = :id")
                    db.session.execute(sql_update, {**updates, 'id': log_id})
                    rotated_count += 1
            
            # Save new key to file if key_path was explicitly provided (e.g. during testing)
            if key_path is not None:
                with open(key_path, 'w') as f:
                    f.write(new_key)
            else:
                print("\n" + "="*80)
                print("DATABASE ROTATION SUCCESSFUL!")
                print("Please update your .env file with the new key:")
                print(f"SELENE_ENCRYPTION_KEY={new_key}")
                print("="*80 + "\n")
                
            # Update the loaded models cipher suite in memory
            for module_name in ['models', 'backend.models']:
                if module_name in sys.modules:
                    sys.modules[module_name].cipher_suite = new_cipher

            db.session.commit()
            print(f"Successfully rotated keys for {rotated_count} daily log entries.")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error during key rotation: {str(e)}")
            sys.exit(1)

if __name__ == '__main__':
    rotate_keys()
