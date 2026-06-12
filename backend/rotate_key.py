import os
import sys
from cryptography.fernet import Fernet
from sqlalchemy import text

# Ensure backend directory is in python path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from models import db

def rotate_keys(app=None, key_path=None):
    if app is None:
        app = create_app()
    with app.app_context():
        if key_path is None:
            key_file_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), '.encryption_key')
        else:
            key_file_path = key_path
        
        # Read old key if it exists
        old_key = None
        if os.path.exists(key_file_path):
            with open(key_file_path, 'r') as f:
                old_key = f.read().strip()
                
        # Generate new key
        new_key = Fernet.generate_key().decode()
        
        if not old_key:
            print("No old encryption key found. Writing new key to .encryption_key.")
            with open(key_file_path, 'w') as f:
                f.write(new_key)
            # Update in-memory models
            try:
                import models
                models.cipher_suite = Fernet(new_key.encode())
            except ImportError:
                pass
            try:
                import backend.models as backend_models
                backend_models.cipher_suite = Fernet(new_key.encode())
            except ImportError:
                pass
            print("Key initialized successfully.")
            return

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
            
            # Save new key to file
            with open(key_file_path, 'w') as f:
                f.write(new_key)
                
            # Update the loaded models cipher suite in memory
            try:
                import models
                models.cipher_suite = new_cipher
            except ImportError:
                pass
            try:
                import backend.models as backend_models
                backend_models.cipher_suite = new_cipher
            except ImportError:
                pass

            db.session.commit()
            print(f"Successfully rotated keys for {rotated_count} daily log entries.")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error during key rotation: {str(e)}")
            sys.exit(1)

if __name__ == '__main__':
    rotate_keys()
