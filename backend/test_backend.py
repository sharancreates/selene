import unittest
import json
from datetime import date

# Import Flask elements
try:
    from .app import create_app
    from .models import db, User, DailyLog
except ImportError:
    from app import create_app
    from models import db, User, DailyLog

class TestingConfig:
    """
    Test configuration target setting up an in-memory SQLite database 
    and enabling testing modes.
    """
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'test_secret_key_for_unit_tests_only'
    ALLOWED_ORIGINS = ['http://localhost:5173']
    DEBUG = False
    SESSION_COOKIE_SECURE = False  # Allow cookies in tests without HTTPS
    RATELIMIT_ENABLED = False  # Disable rate limiting in tests


class SeleneBackendTestCase(unittest.TestCase):
    
    def setUp(self):
        """
        Creates clean, isolated app instance and database tables for each test.
        """
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self):
        """
        Rolls back session transactions and drops tables to avoid side effects.
        """
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_registration_and_login(self):
        """
        Verifies registration logic, unique constraints, password hashing validation, and logins.
        """
        # 1. Test successful user registration
        register_payload = {
            "username": "selenetester",
            "pin": "123456",  # Updated to 6 characters for new PIN policy
            "cycle_length_baseline": 29,
            "period_length_baseline": 6,
            "has_pcos": True,
            "has_pmdd": False,
            "has_endo": True
        }
        res = self.client.post('/api/auth/register', json=register_payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['user']['username'], 'selenetester')
        self.assertEqual(data['user']['cycle_length_baseline'], 29)
        self.assertEqual(data['user']['period_length_baseline'], 6)
        self.assertEqual(data['user']['has_pcos'], True)
        self.assertEqual(data['user']['has_pmdd'], False)
        self.assertEqual(data['user']['has_endo'], True)
        self.assertIn('token', data)

        # 2. Test duplicate registration (checks atomic uniqueness rollback)
        res_dup = self.client.post('/api/auth/register', json=register_payload)
        self.assertEqual(res_dup.status_code, 400)
        self.assertIn('error', res_dup.get_json())

        # 3. Test login with correct PIN
        login_payload = {
            "username": "selenetester",
            "pin": "123456"
        }
        res_login = self.client.post('/api/auth/login', json=login_payload)
        self.assertEqual(res_login.status_code, 200)
        login_data = res_login.get_json()
        self.assertEqual(login_data['status'], 'success')
        self.assertIn('token', login_data)

        # 4. Test login with invalid PIN
        login_bad_pin = {
            "username": "selenetester",
            "pin": "000000"
        }
        res_bad = self.client.post('/api/auth/login', json=login_bad_pin)
        self.assertEqual(res_bad.status_code, 401)
        self.assertIn('error', res_bad.get_json())

    def test_pin_validation_6_chars(self):
        """
        Verifies PIN must be at least 6 characters.
        """
        # Test PIN too short
        register_payload = {"username": "short_pin_user", "pin": "123"}
        res = self.client.post('/api/auth/register', json=register_payload)
        self.assertEqual(res.status_code, 400)
        self.assertIn('6 characters', res.get_json()['error'])
        
        # Test PIN with exactly 6 characters (should succeed)
        register_payload = {"username": "valid_pin_user", "pin": "123456"}
        res = self.client.post('/api/auth/register', json=register_payload)
        self.assertEqual(res.status_code, 201)

    def test_jwt_required_protection(self):
        """
        Validates token format verification and access restriction checks.
        """
        # Test endpoint without Authorization header
        res_no_auth = self.client.get('/api/logs')
        self.assertEqual(res_no_auth.status_code, 401)
        self.assertIn('missing', res_no_auth.get_json()['error'])

        # Test malformed Header scheme (not Bearer)
        headers_bad_scheme = {'Authorization': 'Token invalid_token_value'}
        res_bad_scheme = self.client.get('/api/logs', headers=headers_bad_scheme)
        self.assertEqual(res_bad_scheme.status_code, 401)
        self.assertIn('format', res_bad_scheme.get_json()['error'])

        # Test invalid JWT signature
        headers_bad_sig = {'Authorization': 'Bearer eye.fake.token'}
        res_bad_sig = self.client.get('/api/logs', headers=headers_bad_sig)
        self.assertEqual(res_bad_sig.status_code, 401)
        self.assertIn('Invalid token', res_bad_sig.get_json()['error'])

    def test_daily_logs_upsert_logic(self):
        """
        Performs thorough checks on sync operations: insert, sliders clamping,
        unique constraints validation, and update value merge processes.
        """
        # Register user and acquire token
        register_payload = {"username": "sync_tester", "pin": "999999"}  # 6 characters
        res_reg = self.client.post('/api/auth/register', json=register_payload)
        token = res_reg.get_json()['token']
        headers = {'Authorization': f'Bearer {token}'}

        # 1. Sync a new log (checks creation logic and default parameters clamping)
        log_date = "2026-06-01"
        sync_payload = {
            "log_date": log_date,
            "phase": "follicular",
            "energy_level": 85,
            "pelvic_pain": 5,
            "flow_intensity": 10,
            "back_pain": 200, # Should clamp to 100
            "sleep_quality": -50, # Should clamp to 0
            "basal_body_temp": "98.2", # Parsed as float
            "mood_toggles": {"motivated": True, "creative": False},
            "symptom_tags": {"mentalClarity": True},
            "lifestyle_actions": {"strengthWorkout": True}
        }
        res_sync = self.client.post('/api/logs/sync', json=sync_payload, headers=headers)
        self.assertEqual(res_sync.status_code, 200)
        
        sync_data = res_sync.get_json()
        self.assertEqual(sync_data['status'], 'success')
        self.assertIn('created', sync_data['message'])
        
        log = sync_data['log']
        self.assertEqual(log['phase'], 'follicular')
        self.assertEqual(log['energy_level'], 85)
        self.assertEqual(log['pelvic_pain'], 5)
        self.assertEqual(log['flow_intensity'], 10)
        self.assertEqual(log['back_pain'], 100) # Clamped limit check
        self.assertEqual(log['sleep_quality'], 0) # Clamped floor check
        self.assertEqual(log['basal_body_temp'], 98.2)
        self.assertEqual(log['mood_toggles']['motivated'], True)
        self.assertEqual(log['mood_toggles']['creative'], False)

        # 2. Sync for the same date with update fields (checks upsert overwrite logic)
        update_payload = {
            "log_date": log_date,
            "phase": "follicular",
            "energy_level": 95, # Modified slider
            "mood_toggles": {"creative": True, "calm": True} # Merge values
        }
        res_update = self.client.post('/api/logs/sync', json=update_payload, headers=headers)
        self.assertEqual(res_update.status_code, 200)
        
        update_data = res_update.get_json()
        self.assertEqual(update_data['status'], 'success')
        self.assertIn('updated', update_data['message'])
        
        updated_log = update_data['log']
        self.assertEqual(updated_log['energy_level'], 95) # Overwritten
        self.assertEqual(updated_log['back_pain'], 100) # Unchanged field preserved
        self.assertEqual(updated_log['mood_toggles']['motivated'], True) # Preserved key
        self.assertEqual(updated_log['mood_toggles']['creative'], True) # Overwritten key
        self.assertEqual(updated_log['mood_toggles']['calm'], True) # Newly added key

        # 3. Fetch logs and verify history content
        res_get = self.client.get('/api/logs', headers=headers)
        self.assertEqual(res_get.status_code, 200)
        logs = res_get.get_json()['logs']
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0]['log_date'], log_date)
        self.assertEqual(logs[0]['energy_level'], 95)

    def test_preprocessing_pipeline(self):
        """
        Validates pipeline.py DataFrame compilation, missing value imputation,
        JSON flattening, and one-hot encoding.
        """
        # Register user
        register_payload = {"username": "pipeline_tester", "pin": "111111"}
        res_reg = self.client.post('/api/auth/register', json=register_payload)
        user_id = res_reg.get_json()['user']['id']
        token = res_reg.get_json()['token']
        headers = {'Authorization': f'Bearer {token}'}

        # Sync some logs with missing fields
        # Log 1: Missing energy_level, pelvic_pain, flow_intensity, basal_body_temp
        self.client.post('/api/logs/sync', json={
            "log_date": "2026-06-01", "phase": "menstrual",
            "mood_toggles": {"calm": True}
        }, headers=headers)
        
        # Log 2: Has temperature and sleep, missing back_pain
        self.client.post('/api/logs/sync', json={
            "log_date": "2026-06-02", "phase": "menstrual",
            "basal_body_temp": 98.4, "sleep_quality": 80,
            "symptom_tags": {"brainFog": True}
        }, headers=headers)

        # Log 3: Has energy and back pain, missing temperature
        self.client.post('/api/logs/sync', json={
            "log_date": "2026-06-03", "phase": "follicular",
            "energy_level": 70, "back_pain": 10
        }, headers=headers)

        # Call the pipeline module directly
        try:
            from pipeline import extract_log_dataframe
        except ImportError:
            from .pipeline import extract_log_dataframe

        df = extract_log_dataframe(user_id)
        self.assertEqual(len(df), 3)

        # Verify temperature imputation (Log 3 should forward-fill from Log 2)
        self.assertEqual(df.loc[2, 'basal_body_temp'], 98.4)
        # Log 1 should backward-fill from Log 2
        self.assertEqual(df.loc[0, 'basal_body_temp'], 98.4)

        # Verify slider columns and default fills
        self.assertEqual(df.loc[0, 'energy_level'], 50) # default level fallback
        self.assertEqual(df.loc[0, 'pelvic_pain'], 0) # default symptom fallback
        self.assertEqual(df.loc[2, 'energy_level'], 70) # explicitly set

        # Verify JSON flattening and defaults
        self.assertEqual(df.loc[0, 'mood_calm'], 1)
        self.assertEqual(df.loc[1, 'mood_calm'], 0) # default empty fill
        self.assertEqual(df.loc[1, 'symptom_brainFog'], 1)

        # Verify one-hot phase encoding
        self.assertEqual(df.loc[0, 'phase_menstrual'], 1)
        self.assertEqual(df.loc[0, 'phase_follicular'], 0)
        self.assertEqual(df.loc[2, 'phase_follicular'], 1)

    def test_prediction_safeguard(self):
        """
        Ensures the prediction endpoint handles users with less than 10 entries
        with the appropriate calibration response.
        """
        # Register user
        register_payload = {"username": "safeguard_tester", "pin": "222222"}
        res_reg = self.client.post('/api/auth/register', json=register_payload)
        token = res_reg.get_json()['token']
        headers = {'Authorization': f'Bearer {token}'}

        # Log 3 entries (which is < 10 threshold)
        for i in range(1, 4):
            self.client.post('/api/logs/sync', json={
                "log_date": f"2026-06-0{i}", "phase": "menstrual"
            }, headers=headers)

        # Retrieve prediction
        res = self.client.get('/api/predict/next-cycle', headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['status'], 'calibrating')
        self.assertIn('calibration', data['prediction']['insight'].lower() or data['message'].lower())
        self.assertIsNone(data['prediction']['next_period_date'])

    def test_prediction_fallback_and_condition_insights(self):
        """
        Validates mathematical fallback prediction when no ML binary exists,
        testing custom phase-calculation logic and condition-specific insights.
        """
        # 1. Test PCOS + PMDD user prediction
        register_pcos_pmdd = {
            "username": "pcos_pmdd_user", "pin": "333333",
            "cycle_length_baseline": 30, "period_length_baseline": 6,
            "has_pcos": True, "has_pmdd": True, "has_endo": False
        }
        res_reg1 = self.client.post('/api/auth/register', json=register_pcos_pmdd)
        token1 = res_reg1.get_json()['token']
        headers1 = {'Authorization': f'Bearer {token1}'}

        # Log 11 entries to satisfy calibration threshold (start date = 2026-06-01)
        # Cycle 1 start: 2026-06-01 (menstrual for 5 days, then follicular)
        for i in range(1, 12):
            log_date = f"2026-06-{i:02d}"
            phase = "menstrual" if i <= 5 else "follicular"
            self.client.post('/api/logs/sync', json={
                "log_date": log_date, "phase": phase, "energy_level": 60
            }, headers=headers1)

        # Get prediction relative to a reference test date (2026-06-12)
        # Estimated cycle length: falls back to user.cycle_length_baseline = 30
        # Days since start (2026-06-12 vs 2026-06-01) = 11 days.
        # Ovulation day = 30 - 14 = 16.
        # Days in cycle = 11. Since 5 <= 11 < 15 (ovulation_day - 1), it is "follicular".
        # Empathetic insight for PMDD + follicular: "Resilience is naturally higher now..."
        res_pred = self.client.get('/api/predict/next-cycle?date=2026-06-12', headers=headers1)
        self.assertEqual(res_pred.status_code, 200)
        data = res_pred.get_json()
        self.assertEqual(data['status'], 'success')
        
        pred = data['prediction']
        self.assertEqual(pred['estimated_phase'], 'follicular')
        self.assertEqual(pred['next_period_date'], '2026-07-01') # 2026-06-01 + 30 days
        self.assertIn('Resilience is naturally higher now', pred['insight'])

        # 2. Test Endometriosis user prediction on Luteal Phase
        register_endo = {
            "username": "endo_user", "pin": "444444",
            "cycle_length_baseline": 28, "period_length_baseline": 5,
            "has_pcos": False, "has_pmdd": False, "has_endo": True
        }
        res_reg2 = self.client.post('/api/auth/register', json=register_endo)
        token2 = res_reg2.get_json()['token']
        headers2 = {'Authorization': f'Bearer {token2}'}

        # Log 11 entries starting 2026-06-01
        for i in range(1, 12):
            log_date = f"2026-06-{i:02d}"
            phase = "menstrual" if i <= 5 else "follicular"
            self.client.post('/api/logs/sync', json={
                "log_date": log_date, "phase": phase
            }, headers=headers2)

        # Get prediction relative to a reference test date (2026-06-25)
        # Cycle length: 28. Last period: 2026-06-01.
        # Days since start = 24 days.
        # Days in cycle = 24. Ovulation day = 28 - 14 = 14.
        # Since days_in_cycle (24) > ovulation_day + 1 (15), phase is "luteal".
        # Empathetic insight for Endo + luteal: "Premenstrual pelvic tension..."
        res_pred2 = self.client.get('/api/predict/next-cycle?date=2026-06-25', headers=headers2)
        self.assertEqual(res_pred2.status_code, 200)
        data2 = res_pred2.get_json()
        
        pred2 = data2['prediction']
        self.assertEqual(pred2['estimated_phase'], 'luteal')
        self.assertEqual(pred2['next_period_date'], '2026-06-29') # 2026-06-01 + 28 days
        self.assertIn('Premenstrual pelvic tension or bloating', pred2['insight'])

    def test_database_encryption(self):
        """
        Verifies that daily logs are stored in encrypted ciphertext inside the database,
        but automatically decrypt back to cleartext when queried via SQLAlchemy models.
        """
        reg_payload = {
            "username": "crypt_user", "pin": "999999",
            "cycle_length_baseline": 28, "period_length_baseline": 5
        }
        res_reg = self.client.post('/api/auth/register', json=reg_payload)
        token = res_reg.get_json()['token']
        headers = {'Authorization': f'Bearer {token}'}

        log_payload = {
            "log_date": "2026-06-01",
            "phase": "menstrual",
            "energy_level": 75,
            "pelvic_pain": 20,
            "basal_body_temp": 98.4
        }
        res_sync = self.client.post('/api/logs/sync', json=log_payload, headers=headers)
        self.assertEqual(res_sync.status_code, 200)

        log = DailyLog.query.filter_by(log_date=date(2026, 6, 1)).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.phase, "menstrual")
        self.assertEqual(log.energy_level, 75)
        self.assertEqual(log.pelvic_pain, 20)
        self.assertEqual(log.basal_body_temp, 98.4)

        connection = db.engine.raw_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT phase, energy_level, pelvic_pain, basal_body_temp FROM daily_logs LIMIT 1")
        row = cursor.fetchone()
        cursor.close()
        connection.close()

        raw_phase, raw_energy, raw_pelvic, raw_temp = row
        self.assertNotEqual(raw_phase, "menstrual")
        self.assertTrue(raw_phase.startswith("gAAAAA"))
        self.assertNotEqual(str(raw_energy), "75")
        self.assertTrue(str(raw_energy).startswith("gAAAAA"))
        self.assertNotEqual(str(raw_temp), "98.4")
        self.assertTrue(str(raw_temp).startswith("gAAAAA"))

    def test_verify_pin(self):
        """
        Verifies the PIN verification endpoint used by the camouflage guard.
        """
        reg_payload = {
            "username": "pin_user", "pin": "888888",
            "cycle_length_baseline": 28, "period_length_baseline": 5
        }
        res_reg = self.client.post('/api/auth/register', json=reg_payload)
        token = res_reg.get_json()['token']
        headers = {'Authorization': f'Bearer {token}'}

        # 1. Correct PIN
        res_correct = self.client.post('/api/auth/verify-pin', json={"pin": "888888"}, headers=headers)
        self.assertEqual(res_correct.status_code, 200)
        self.assertTrue(res_correct.get_json()['unlocked'])

        # 2. Incorrect PIN
        res_incorrect = self.client.post('/api/auth/verify-pin', json={"pin": "111111"}, headers=headers)
        self.assertEqual(res_incorrect.status_code, 401)
        self.assertFalse(res_incorrect.get_json()['unlocked'])

        # 3. Missing PIN
        res_missing = self.client.post('/api/auth/verify-pin', json={}, headers=headers)
        self.assertEqual(res_missing.status_code, 400)

    def test_insights_engine(self):
        """
        Verifies the rule-based insights engine returns proper responses.
        """
        # Register user
        reg_payload = {
            "username": "insight_user", "pin": "123456",
            "cycle_length_baseline": 30, "period_length_baseline": 6
        }
        res_reg = self.client.post('/api/auth/register', json=reg_payload)
        token = res_reg.get_json()['token']
        headers = {'Authorization': f'Bearer {token}'}

        # 1. Less than 7 logs (calibration status)
        res_ins1 = self.client.get('/api/predict/insights', headers=headers)
        self.assertEqual(res_ins1.status_code, 200)
        insights1 = res_ins1.get_json()['insights']
        self.assertEqual(len(insights1), 1)
        self.assertEqual(insights1[0]['title'], 'Insight Engine Calibrating')
        self.assertEqual(insights1[0]['supporting_data']['status'], 'insufficient_data')

        # 2. Add 8 logs to simulate standard logs and test insights generation
        from datetime import date, timedelta
        for i in range(8):
            log_date = (date(2026, 6, 1) + timedelta(days=i)).isoformat()
            log_payload = {
                "log_date": log_date,
                "phase": "follicular" if i < 5 else "ovulatory",
                "energy_level": 70 - i * 5,  # decreasing trend
                "pelvic_pain": 10 + i * 5,   # increasing trend
                "basal_body_temp": 98.1
            }
            res_sync = self.client.post('/api/logs/sync', json=log_payload, headers=headers)
            self.assertEqual(res_sync.status_code, 200)

        res_ins2 = self.client.get('/api/predict/insights', headers=headers)
        self.assertEqual(res_ins2.status_code, 200)
        insights2 = res_ins2.get_json()['insights']
        self.assertGreaterEqual(len(insights2), 1)
        titles = [ins['title'] for ins in insights2]
        self.assertTrue(any("Trend" in t or "Window" in t or "Calibrating" in t for t in titles))

    def test_medical_disclaimer_prediction(self):
        """
        Verifies that predictions returned for users with chronic conditions
        contain the medical disclaimer.
        """
        # Register user with PCOS
        register_payload = {
            "username": "disclaimer_user", "pin": "777777",
            "cycle_length_baseline": 28, "period_length_baseline": 5,
            "has_pcos": True, "has_pmdd": False, "has_endo": False
        }
        res_reg = self.client.post('/api/auth/register', json=register_payload)
        token = res_reg.get_json()['token']
        headers = {'Authorization': f'Bearer {token}'}

        # Log 11 entries starting 2026-06-01
        from datetime import date, timedelta
        for i in range(1, 12):
            self.client.post('/api/logs/sync', json={
                "log_date": f"2026-06-{i:02d}", "phase": "menstrual" if i <= 5 else "follicular"
            }, headers=headers)

        res_pred = self.client.get('/api/predict/next-cycle?date=2026-06-25', headers=headers)
        self.assertEqual(res_pred.status_code, 200)
        data = res_pred.get_json()
        insight = data['prediction']['insight']
        self.assertIn("Disclaimer: This insight is for educational tracking and does not constitute medical advice.", insight)

    def test_global_exception_handler(self):
        """
        Verifies that unhandled exceptions are caught by the global error handler
        and return a generic error payload instead of leaking internal traces.
        """
        from unittest.mock import patch
        register_payload = {"username": "error_tester", "pin": "123456"}
        res_reg = self.client.post('/api/auth/register', json=register_payload)
        token = res_reg.get_json()['token']
        headers = {'Authorization': f'Bearer {token}'}

        # Mock check_password_hash in auth to raise an unhandled exception
        with patch('auth.check_password_hash', side_effect=RuntimeError("Auth hash error simulation")):
            res = self.client.post('/api/auth/verify-pin', json={"pin": "123456"}, headers=headers)
            self.assertEqual(res.status_code, 500)
            data = res.get_json()
            self.assertEqual(data['error'], "An unexpected internal database or system error occurred.")

    def test_key_rotation_and_data_preservation(self):
        """
        Verifies key rotation successfully decrypts with the old key,
        re-encrypts with the new key, preserves correct data, and changes ciphertext.
        """
        import tempfile
        import os
        from rotate_key import rotate_keys
        
        # Create a temporary key file
        fd, temp_key_path = tempfile.mkstemp()
        os.close(fd)
        
        try:
            # Write a valid initial key to this path
            from cryptography.fernet import Fernet
            initial_key = Fernet.generate_key().decode()
            with open(temp_key_path, 'w') as f:
                f.write(initial_key)
                
            # Temporarily set the active models.cipher_suite to match this initial key
            import models
            old_cipher_suite = models.cipher_suite
            models.cipher_suite = Fernet(initial_key.encode())

            reg_payload = {"username": "rotation_tester", "pin": "999999"}
            res_reg = self.client.post('/api/auth/register', json=reg_payload)
            token = res_reg.get_json()['token']
            headers = {'Authorization': f'Bearer {token}'}

            log_payload = {
                "log_date": "2026-06-01",
                "phase": "menstrual",
                "energy_level": 75,
                "basal_body_temp": 98.4
            }
            self.client.post('/api/logs/sync', json=log_payload, headers=headers)

            # Retrieve first raw ciphertexts
            connection = db.engine.raw_connection()
            cursor = connection.cursor()
            cursor.execute("SELECT phase, energy_level, basal_body_temp FROM daily_logs LIMIT 1")
            row = cursor.fetchone()
            cursor.close()
            connection.close()
            
            raw_phase_1, raw_energy_1, raw_temp_1 = row
            self.assertTrue(raw_phase_1.startswith("gAAAAA"))

            # Run key rotation using the active testing app context and temp key path
            rotate_keys(app=self.app, key_path=temp_key_path)

            # Check that querying via models still returns correct decrypted data
            log = DailyLog.query.filter_by(log_date=date(2026, 6, 1)).first()
            self.assertEqual(log.phase, "menstrual")
            self.assertEqual(log.energy_level, 75)
            self.assertEqual(log.basal_body_temp, 98.4)

            # Retrieve second raw ciphertexts
            connection = db.engine.raw_connection()
            cursor = connection.cursor()
            cursor.execute("SELECT phase, energy_level, basal_body_temp FROM daily_logs LIMIT 1")
            row_new = cursor.fetchone()
            cursor.close()
            connection.close()

            raw_phase_2, raw_energy_2, raw_temp_2 = row_new
            self.assertTrue(raw_phase_2.startswith("gAAAAA"))
            
            # Verify that ciphertexts are different because of the new key
            self.assertNotEqual(raw_phase_1, raw_phase_2)
            self.assertNotEqual(raw_energy_1, raw_energy_2)
            self.assertNotEqual(raw_temp_1, raw_temp_2)
            
        finally:
            # Clean up temp key file
            if os.path.exists(temp_key_path):
                os.remove(temp_key_path)
            # Restore original models.cipher_suite
            models.cipher_suite = old_cipher_suite


if __name__ == '__main__':
    unittest.main()



