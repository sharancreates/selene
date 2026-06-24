import datetime
from functools import wraps
import jwt
import secrets
import base64
import hashlib
import redis
from flask import Blueprint, request, jsonify, g, current_app, make_response
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import generate_password_hash, check_password_hash
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from argon2 import PasswordHasher

try:
    from .models import db, User, is_valid_pin, RevokedToken
except ImportError:
    from models import db, User, is_valid_pin, RevokedToken

# Define the authentication blueprint
auth_bp = Blueprint('auth', __name__)

# Token configuration constants
ACCESS_TOKEN_EXPIRY_MINUTES = 15
REFRESH_TOKEN_EXPIRY_DAYS = 30

# Initialize Argon2 PasswordHasher
ph = PasswordHasher()

# Rate limiting for auth endpoints (storage_uri will be loaded dynamically via init_app)
limiter = Limiter(key_func=get_remote_address, default_limits=[])

redis_client = None

def get_redis_client():
    global redis_client
    if redis_client is None:
        redis_url = current_app.config.get('REDIS_URL')
        if redis_url:
            try:
                redis_client = redis.from_url(redis_url, decode_responses=True)
            except Exception as e:
                current_app.logger.error(f"Failed to connect to Redis at {redis_url}: {e}")
                redis_client = None
    return redis_client


def derive_kek_server(secret, salt_input, is_recovery=False):
    suffix = "selene-recovery-salt-suffix" if is_recovery else "selene-salt-suffix"
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=(salt_input + suffix).encode(),
        iterations=100000
    )
    derived = kdf.derive(secret.encode())
    return base64.urlsafe_b64encode(derived).decode()


def generate_access_token(user_id, dek):
    """
    Generate a short-lived JWT access token (15 minutes expiry) with a unique JTI and encrypted DEK.
    """
    server_cipher = Fernet(base64.urlsafe_b64encode(hashlib.sha256(current_app.config['SECRET_KEY'].encode()).digest()))
    encrypted_dek = server_cipher.encrypt(dek.encode()).decode()
    
    payload = {
        'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRY_MINUTES),
        'iat': datetime.datetime.now(datetime.timezone.utc),
        'sub': user_id,
        'type': 'access',
        'jti': secrets.token_urlsafe(16),
        'dek': encrypted_dek
    }
    return jwt.encode(
        payload,
        current_app.config['SECRET_KEY'],
        algorithm='HS256'
    )


def generate_refresh_token(user_id, dek):
    """
    Generate a secure signed JWT refresh token for HttpOnly cookie storage with encrypted DEK.
    """
    server_cipher = Fernet(base64.urlsafe_b64encode(hashlib.sha256(current_app.config['SECRET_KEY'].encode()).digest()))
    encrypted_dek = server_cipher.encrypt(dek.encode()).decode()
    
    payload = {
        'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=REFRESH_TOKEN_EXPIRY_DAYS),
        'iat': datetime.datetime.now(datetime.timezone.utc),
        'sub': user_id,
        'type': 'refresh',
        'jti': secrets.token_urlsafe(16),
        'dek': encrypted_dek
    }
    return jwt.encode(
        payload,
        current_app.config['SECRET_KEY'],
        algorithm='HS256'
    )


def hash_token(token):
    """Hash a token for secure storage."""
    return hashlib.sha256(token.encode()).hexdigest()


def is_token_revoked(jti):
    """Check if a token's JTI is in Redis or the database blacklist."""
    if not jti:
        return False
    
    # Try Redis first
    try:
        r = get_redis_client()
        if r:
            if r.exists(f"jwt:revoked:{jti}"):
                return True
    except Exception as e:
        current_app.logger.warning(f"Redis lookup failed for JTI {jti}: {e}. Falling back to DB.")
        
    # Fallback to DB
    return db.session.query(RevokedToken.query.filter_by(jti=jti).exists()).scalar()


def revoke_jti(jti, exp_datetime):
    """Revoke a token JTI globally (Redis + DB fallback)."""
    if not jti:
        return
    # Add to DB
    try:
        db.session.add(RevokedToken(jti=jti, expires_at=exp_datetime))
    except Exception as e:
        current_app.logger.error(f"Failed to add revoked token to DB: {e}")
        
    # Add to Redis
    try:
        r = get_redis_client()
        if r:
            now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
            ttl = int((exp_datetime - now).total_seconds())
            if ttl > 0:
                r.setex(f"jwt:revoked:{jti}", ttl, "1")
    except Exception as e:
        current_app.logger.error(f"Failed to add revoked token to Redis: {e}")


def verify_hash(hash_str, plain):
    if not hash_str:
        return False
    if hash_str.startswith('$argon2id$'):
        try:
            return ph.verify(hash_str, plain)
        except Exception:
            return False
    else:
        return check_password_hash(hash_str, plain)


def jwt_required(f):
    """
    Reusable custom decorator function that extracts the JWT token from the
    access_token cookie (or Authorization header fallback), decodes it, and attaches the user model to g.user.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.cookies.get('access_token')
        if not token:
            auth_header = request.headers.get('Authorization')
            if auth_header:
                parts = auth_header.split()
                if len(parts) != 2 or parts[0].lower() != 'bearer':
                    return jsonify({"error": "Authorization header must follow 'Bearer <token>' format"}), 401
                token = parts[1]
                    
        if not token:
            return jsonify({"error": "Authorization header or access_token cookie is missing"}), 401
        
        try:
            payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            if payload.get('type') != 'access':
                return jsonify({"error": "Invalid token type"}), 401
                
            jti = payload.get('jti')
            if not jti:
                return jsonify({"error": "Invalid token"}), 401
            if is_token_revoked(jti):
                return jsonify({"error": "Token has been revoked"}), 401
                
            user_id = payload.get('sub')
            if not user_id:
                return jsonify({"error": "Invalid token"}), 401
            
            encrypted_dek = payload.get('dek')
            if encrypted_dek:
                server_cipher = Fernet(base64.urlsafe_b64encode(hashlib.sha256(current_app.config['SECRET_KEY'].encode()).digest()))
                g.user_encryption_key = server_cipher.decrypt(encrypted_dek.encode()).decode()
            else:
                g.user_encryption_key = None

            # Retrieve the user model safely from db session
            user = db.session.get(User, user_id)
            if not user:
                return jsonify({"error": "User associated with this token was not found"}), 401
            
            # Attach the user to Flask's thread-local global context
            g.user = user
            
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
            
        return f(*args, **kwargs)
    return decorated


@auth_bp.route('/csrf', methods=['GET'])
def get_csrf_token():
    """
    GET-safe endpoint that seeds the csrf_token cookie via the after_request hook.
    Call this once on app boot before any mutating requests.
    """
    return jsonify({"status": "ok"}), 200


@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    """
    Registers a new user and returns access and refresh tokens.
    """
    data = request.get_json() or {}
    username = data.get('username')
    pin = data.get('pin')
    
    if not username or not pin:
        return jsonify({"error": "Username and PIN are required parameters"}), 400
        
    username = str(username).strip()
    if len(username) < 3 or len(username) > 80:
        return jsonify({"error": "Username must be between 3 and 80 characters long."}), 400
    
    is_valid, error_msg = is_valid_pin(pin)
    if not is_valid:
        return jsonify({"error": error_msg}), 400
        
    try:
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return jsonify({"error": "Username is already taken"}), 400
            
        kek_pin = data.get('kek_pin')
        if not kek_pin:
            kek_pin = derive_kek_server(str(pin), username, is_recovery=False)
            
        dek = Fernet.generate_key().decode()
        g.user_encryption_key = dek
        
        # Terms & Conditions verification
        terms_accepted = data.get('terms_accepted')
        terms_signed_name = data.get('terms_signed_name')
        
        if current_app.config.get('TESTING') and (not terms_accepted or not terms_signed_name):
            terms_accepted = True
            terms_signed_name = "Test User"
        
        if not terms_accepted or not terms_signed_name:
            return jsonify({"error": "You must accept and sign the Terms and Conditions to register."}), 400
        
        # Argon2 PIN hash
        pin_hash = ph.hash(str(pin))
        
        # Encrypt DEK under kek_pin
        cipher_pin = Fernet(kek_pin.encode())
        encrypted_dek_pin = cipher_pin.encrypt(dek.encode()).decode()
        
        # Generate recovery key
        recovery_key = "selene-recovery-" + secrets.token_hex(16)
        recovery_hash = ph.hash(recovery_key)
        
        kek_recovery = derive_kek_server(recovery_key, username, is_recovery=True)
        cipher_recovery = Fernet(kek_recovery.encode())
        encrypted_dek_recovery = cipher_recovery.encrypt(dek.encode()).decode()
        
        new_user = User(
            username=username,
            pin_hash=pin_hash,
            recovery_hash=recovery_hash,
            encrypted_dek_pin=encrypted_dek_pin,
            encrypted_dek_recovery=encrypted_dek_recovery,
            cycle_length_baseline=data.get('cycle_length_baseline', 28),
            period_length_baseline=data.get('period_length_baseline', 5),
            has_pcos=bool(data.get('has_pcos', False)),
            has_pmdd=bool(data.get('has_pmdd', False)),
            has_endo=bool(data.get('has_endo', False)),
            terms_accepted=bool(terms_accepted),
            terms_signed_name=terms_signed_name
        )
        
        db.session.add(new_user)
        db.session.flush() # Populate the new_user.id
        
        refresh_token = generate_refresh_token(new_user.id, dek)
        refresh_token_hash = hash_token(refresh_token)
        new_user.refresh_token_hash = refresh_token_hash
        
        db.session.commit()
        
        access_token = generate_access_token(new_user.id, dek)
        
        response = make_response(jsonify({
            "status": "success",
            "message": "User registered successfully",
            "token": access_token,
            "recovery_key": recovery_key,
            "user": new_user.to_dict(),
            "dek": dek
        }), 201)
        
        response.set_cookie(
            'access_token',
            access_token,
            httponly=True,
            samesite='Strict',
            secure=current_app.config.get('SESSION_COOKIE_SECURE', True),
            max_age=ACCESS_TOKEN_EXPIRY_MINUTES * 60
        )
        
        response.set_cookie(
            'refresh_token',
            refresh_token,
            httponly=True,
            samesite='Strict',
            secure=current_app.config.get('SESSION_COOKIE_SECURE', True),
            max_age=REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60
        )
        
        return response
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Failed to register user: {e}")
        return jsonify({"error": "Failed to register user due to an internal database error."}), 500


@auth_bp.route('/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    """
    Authenticates username and PIN, issuing access and refresh tokens.
    """
    data = request.get_json() or {}
    username = data.get('username')
    pin = data.get('pin')
    
    if not username or not pin:
        return jsonify({"error": "Username and PIN are required"}), 400
    
    user = User.query.filter_by(username=username).first()
    
    if not user or not verify_hash(user.pin_hash, str(pin)):
        return jsonify({"error": "Invalid username or PIN"}), 401
        
    if user.is_deleted:
        now = datetime.datetime.utcnow()
        if user.deleted_at and (now - user.deleted_at).days <= 30:
            user.is_deleted = False
            user.deleted_at = None
            try:
                db.session.commit()
                current_app.logger.info(f"Soft-deleted user account restored: {username}")
            except Exception as e:
                db.session.rollback()
                current_app.logger.error(f"Failed to restore user account: {e}")
                return jsonify({"error": "An internal error occurred while restoring your account."}), 500
        else:
            return jsonify({"error": "Account has been permanently deleted or does not exist."}), 401
        
    kek_pin = data.get('kek_pin')
    if not kek_pin:
        kek_pin = derive_kek_server(str(pin), username, is_recovery=False)
        
    legacy_migration = False
    recovery_key_to_send = None
    
    if user.encrypted_dek_pin:
        try:
            cipher_pin = Fernet(kek_pin.encode())
            dek = cipher_pin.decrypt(user.encrypted_dek_pin.encode()).decode()
        except Exception:
            return jsonify({"error": "Failed to decrypt data key. PIN is invalid."}), 401
    else:
        # Legacy user migration
        legacy_migration = True
        dek = Fernet.generate_key().decode()
        
        # Upgrade PIN hash to Argon2
        user.pin_hash = ph.hash(str(pin))
        
        # Encrypt DEK under kek_pin
        cipher_pin = Fernet(kek_pin.encode())
        user.encrypted_dek_pin = cipher_pin.encrypt(dek.encode()).decode()
        
        # Generate new recovery key
        recovery_key_to_send = "selene-recovery-" + secrets.token_hex(16)
        user.recovery_hash = ph.hash(recovery_key_to_send)
        
        kek_recovery = derive_kek_server(recovery_key_to_send, username, is_recovery=True)
        cipher_recovery = Fernet(kek_recovery.encode())
        user.encrypted_dek_recovery = cipher_recovery.encrypt(dek.encode()).decode()
        
        # Migrate legacy daily logs to new DEK
        try:
            g.user_encryption_key = "p_Mh8N-YsKDORo4aEg5zYf51CJ8KD0qkmMDEOdrCVo4="
            user_logs = user.logs
            
            logs_data = []
            for log in user_logs:
                logs_data.append({
                    'id': log.id,
                    'phase': log.phase,
                    'energy_level': log.energy_level,
                    'pelvic_pain': log.pelvic_pain,
                    'flow_intensity': log.flow_intensity,
                    'back_pain': log.back_pain,
                    'sleep_quality': log.sleep_quality,
                    'basal_body_temp': log.basal_body_temp,
                    'mood_toggles': log.mood_toggles,
                    'symptom_tags': log.symptom_tags,
                    'lifestyle_actions': log.lifestyle_actions
                })
            
            g.user_encryption_key = dek
            from sqlalchemy.orm.attributes import flag_modified
            for i, log in enumerate(user_logs):
                d = logs_data[i]
                log.phase = d['phase']
                log.energy_level = d['energy_level']
                log.pelvic_pain = d['pelvic_pain']
                log.flow_intensity = d['flow_intensity']
                log.back_pain = d['back_pain']
                log.sleep_quality = d['sleep_quality']
                log.basal_body_temp = d['basal_body_temp']
                log.mood_toggles = d['mood_toggles']
                log.symptom_tags = d['symptom_tags']
                log.lifestyle_actions = d['lifestyle_actions']
                flag_modified(log, 'encrypted_data')
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Legacy logs migration failed for user {username}: {e}")
            return jsonify({"error": "Failed to migrate legacy logs during login."}), 500
            
    access_token = generate_access_token(user.id, dek)
    refresh_token = generate_refresh_token(user.id, dek)
    user.refresh_token_hash = hash_token(refresh_token)
    db.session.commit()
    
    response_payload = {
        "status": "success",
        "message": "Login successful",
        "token": access_token,
        "user": user.to_dict(),
        "dek": dek
    }
    if recovery_key_to_send:
        response_payload["recovery_key"] = recovery_key_to_send
        
    response = make_response(jsonify(response_payload), 200)
    
    response.set_cookie(
        'access_token',
        access_token,
        httponly=True,
        samesite='Strict',
        secure=current_app.config.get('SESSION_COOKIE_SECURE', True),
        max_age=ACCESS_TOKEN_EXPIRY_MINUTES * 60
    )
    
    response.set_cookie(
        'refresh_token',
        refresh_token,
        httponly=True,
        samesite='Strict',
        secure=current_app.config.get('SESSION_COOKIE_SECURE', True),
        max_age=REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60
    )
    
    return response


@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    """
    Exchange a valid refresh token for a new access token and rotate the refresh token.
    """
    refresh_token = request.cookies.get('refresh_token')
    
    if not refresh_token:
        return jsonify({"error": "Refresh token not found"}), 401
    
    authenticated_user = verify_refresh_token(refresh_token)
    
    if not authenticated_user:
        return jsonify({"error": "Invalid refresh token"}), 401
        
    # Blacklist the old refresh token's jti before generating the new one
    try:
        payload = jwt.decode(refresh_token, current_app.config['SECRET_KEY'], algorithms=['HS256'], options={"verify_exp": False})
        jti = payload.get('jti')
        exp = payload.get('exp')
        if jti and exp:
            exp_datetime = datetime.datetime.fromtimestamp(exp, datetime.timezone.utc).replace(tzinfo=None)
            revoke_jti(jti, exp_datetime)
            db.session.commit()
    except Exception:
        pass
        
    dek = getattr(g, 'user_encryption_key', None)
    if not dek:
        return jsonify({"error": "Session expired. Please log in again."}), 401
    
    access_token = generate_access_token(authenticated_user.id, dek)
    new_refresh_token = generate_refresh_token(authenticated_user.id, dek)
    
    authenticated_user.refresh_token_hash = hash_token(new_refresh_token)
    db.session.commit()
    
    response = make_response(jsonify({
        "status": "success",
        "token": access_token,
        "user": authenticated_user.to_dict()
    }), 200)
    
    response.set_cookie(
        'access_token',
        access_token,
        httponly=True,
        samesite='Strict',
        secure=current_app.config.get('SESSION_COOKIE_SECURE', True),
        max_age=ACCESS_TOKEN_EXPIRY_MINUTES * 60
    )
    
    response.set_cookie(
        'refresh_token',
        new_refresh_token,
        httponly=True,
        samesite='Strict',
        secure=current_app.config.get('SESSION_COOKIE_SECURE', True),
        max_age=REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60
    )
    
    return response


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    Invalidate the access and refresh tokens by blacklisting their JTIs and clearing cookies.
    """
    refresh_token = request.cookies.get('refresh_token')
    access_token = request.cookies.get('access_token')
    
    # Blacklist access token
    if access_token:
        try:
            payload = jwt.decode(access_token, current_app.config['SECRET_KEY'], algorithms=['HS256'], options={"verify_exp": False})
            jti = payload.get('jti')
            exp = payload.get('exp')
            if jti and exp:
                exp_datetime = datetime.datetime.fromtimestamp(exp, datetime.timezone.utc).replace(tzinfo=None)
                revoke_jti(jti, exp_datetime)
        except Exception:
            pass
            
    # Blacklist refresh token
    if refresh_token:
        try:
            payload = jwt.decode(refresh_token, current_app.config['SECRET_KEY'], algorithms=['HS256'], options={"verify_exp": False})
            jti = payload.get('jti')
            exp = payload.get('exp')
            if jti and exp:
                exp_datetime = datetime.datetime.fromtimestamp(exp, datetime.timezone.utc).replace(tzinfo=None)
                revoke_jti(jti, exp_datetime)
        except Exception:
            pass
            
        authenticated_user = verify_refresh_token(refresh_token)
        if authenticated_user:
            authenticated_user.refresh_token_hash = None
            
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        
    response = make_response(jsonify({
        "status": "success",
        "message": "Logged out successfully"
    }), 200)
    
    response.delete_cookie('access_token')
    response.delete_cookie('refresh_token')
    return response


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required
def update_profile():
    """
    Updates the authenticated user's baseline configurations and condition profile flags.
    """
    data = request.get_json() or {}
    user = g.user
    
    if 'cycle_length_baseline' in data:
        try:
            val = int(data['cycle_length_baseline'])
            if 18 <= val <= 45:
                user.cycle_length_baseline = val
        except ValueError:
            pass
            
    if 'period_length_baseline' in data:
        try:
            val = int(data['period_length_baseline'])
            if 2 <= val <= 10:
                user.period_length_baseline = val
        except ValueError:
            pass
            
    if 'has_pcos' in data:
        user.has_pcos = bool(data['has_pcos'])
    if 'has_pmdd' in data:
        user.has_pmdd = bool(data['has_pmdd'])
    if 'has_endo' in data:
        user.has_endo = bool(data['has_endo'])
    if 'has_onboarded' in data:
        user.has_onboarded = bool(data['has_onboarded'])
    if 'disclaimer_accepted' in data:
        user.disclaimer_accepted = bool(data['disclaimer_accepted'])
    if 'disclaimer_signed_name' in data:
        user.disclaimer_signed_name = data['disclaimer_signed_name']
        
    try:
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Profile updated successfully",
            "user": user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update profile due to an internal error."}), 500


@auth_bp.route('/account', methods=['DELETE'])
@jwt_required
def delete_account():
    """
    Flags the active user account as deleted and records the timestamp (soft-delete).
    Revokes the active access and refresh tokens.
    """
    user = g.user
    user.is_deleted = True
    user.deleted_at = datetime.datetime.utcnow()
    user.refresh_token_hash = None
    
    # Revoke tokens
    access_token = request.cookies.get('access_token')
    refresh_token = request.cookies.get('refresh_token')
    
    if access_token:
        try:
            payload = jwt.decode(access_token, current_app.config['SECRET_KEY'], algorithms=['HS256'], options={"verify_exp": False})
            jti = payload.get('jti')
            exp = payload.get('exp')
            if jti and exp:
                exp_datetime = datetime.datetime.fromtimestamp(exp, datetime.timezone.utc).replace(tzinfo=None)
                revoke_jti(jti, exp_datetime)
        except Exception:
            pass
            
    if refresh_token:
        try:
            payload = jwt.decode(refresh_token, current_app.config['SECRET_KEY'], algorithms=['HS256'], options={"verify_exp": False})
            jti = payload.get('jti')
            exp = payload.get('exp')
            if jti and exp:
                exp_datetime = datetime.datetime.fromtimestamp(exp, datetime.timezone.utc).replace(tzinfo=None)
                revoke_jti(jti, exp_datetime)
        except Exception:
            pass

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Failed to flag account deletion: {e}")
        return jsonify({"error": "Failed to delete account due to an internal error."}), 500
        
    response = make_response(jsonify({
        "status": "success",
        "message": "Account soft-deleted. You can restore it by logging back in within 30 days."
    }), 200)
    
    response.delete_cookie('access_token')
    response.delete_cookie('refresh_token')
    return response


@auth_bp.route('/verify-pin', methods=['POST'])
@jwt_required
def verify_pin():
    """
    Verifies the user's PIN for the calculator camouflage guard.
    """
    data = request.get_json() or {}
    pin = data.get('pin')
    kek_pin = data.get('kek_pin')
    if not pin:
        return jsonify({"error": "PIN is required"}), 400
    
    if not verify_hash(g.user.pin_hash, str(pin)):
        return jsonify({"error": "Incorrect PIN", "unlocked": False}), 401
        
    if not kek_pin:
        kek_pin = derive_kek_server(str(pin), g.user.username, is_recovery=False)
        
    if g.user.encrypted_dek_pin:
        try:
            cipher_pin = Fernet(kek_pin.encode())
            cipher_pin.decrypt(g.user.encrypted_dek_pin.encode()).decode()
        except Exception:
            return jsonify({"error": "Invalid decryption key", "unlocked": False}), 401
            
    return jsonify({"status": "success", "unlocked": True}), 200


@auth_bp.route('/reset-pin', methods=['POST'])
@limiter.limit("5 per minute")
def reset_pin():
    """
    Resets the user PIN if they supply a valid recovery key.
    """
    data = request.get_json() or {}
    username = data.get('username')
    recovery_key = data.get('recovery_key')
    new_pin = data.get('new_pin')
    
    if not username or not recovery_key or not new_pin:
        return jsonify({"error": "Username, recovery key, and new PIN are required"}), 400
        
    user = User.query.filter_by(username=username).first()
    if not user or not user.recovery_hash:
        return jsonify({"error": "Invalid username or recovery key"}), 401
        
    if not verify_hash(user.recovery_hash, str(recovery_key).strip()):
        return jsonify({"error": "Invalid username or recovery key"}), 401
        
    is_valid, error_msg = is_valid_pin(new_pin)
    if not is_valid:
        return jsonify({"error": error_msg}), 400
        
    # Decrypt existing DEK using recovery key
    try:
        kek_recovery = derive_kek_server(str(recovery_key).strip(), username, is_recovery=True)
        cipher_recovery = Fernet(kek_recovery.encode())
        dek = cipher_recovery.decrypt(user.encrypted_dek_recovery.encode()).decode()
    except Exception as e:
        current_app.logger.error(f"Failed to decrypt DEK with recovery key: {e}")
        return jsonify({"error": "Failed to decrypt data key. Recovery key is invalid."}), 401
        
    new_kek_pin = data.get('new_kek_pin')
    if not new_kek_pin:
        new_kek_pin = derive_kek_server(str(new_pin), username, is_recovery=False)
        
    # Re-encrypt under new kek_pin
    cipher_pin = Fernet(new_kek_pin.encode())
    user.encrypted_dek_pin = cipher_pin.encrypt(dek.encode()).decode()
    
    # Generate new recovery key
    new_recovery_key = "selene-recovery-" + secrets.token_hex(16)
    user.recovery_hash = ph.hash(new_recovery_key)
    new_kek_recovery = derive_kek_server(new_recovery_key, username, is_recovery=True)
    cipher_recovery = Fernet(new_kek_recovery.encode())
    user.encrypted_dek_recovery = cipher_recovery.encrypt(dek.encode()).decode()
    
    user.pin_hash = ph.hash(str(new_pin))
    user.refresh_token_hash = None # invalidate active sessions
    
    try:
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "PIN reset successfully. Please log in with your new PIN.",
            "recovery_key": new_recovery_key
        }), 200
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to reset PIN due to an internal error."}), 500





def verify_refresh_token(refresh_token):
    """
    Verify a refresh token exists, is valid, is not revoked, and return the associated user.
    """
    if not refresh_token:
        return None
    try:
        payload = jwt.decode(refresh_token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        if payload.get('type') != 'refresh':
            return None
            
        jti = payload.get('jti')
        if is_token_revoked(jti):
            return None
            
        user_id = payload['sub']
        user = db.session.get(User, user_id)
        if user and user.refresh_token_hash and user.refresh_token_hash == hash_token(refresh_token):
            # Extract DEK and store in g.user_encryption_key
            encrypted_dek = payload.get('dek')
            if encrypted_dek:
                server_cipher = Fernet(base64.urlsafe_b64encode(hashlib.sha256(current_app.config['SECRET_KEY'].encode()).digest()))
                g.user_encryption_key = server_cipher.decrypt(encrypted_dek.encode()).decode()
            return user
    except Exception:
        pass
    return None
