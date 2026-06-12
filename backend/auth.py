import datetime
from functools import wraps
import jwt
import secrets
from flask import Blueprint, request, jsonify, g, current_app, make_response
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import generate_password_hash, check_password_hash
try:
    from .models import db, User, is_valid_pin
except ImportError:
    from models import db, User, is_valid_pin

# Define the authentication blueprint
auth_bp = Blueprint('auth', __name__)

# Token configuration constants
ACCESS_TOKEN_EXPIRY_MINUTES = 15
REFRESH_TOKEN_EXPIRY_DAYS = 30

# Rate limiting for auth endpoints
limiter = Limiter(key_func=get_remote_address, default_limits=[], storage_uri="memory://")

def generate_access_token(user_id):
    """
    Generate a short-lived JWT access token (15 minutes expiry).
    """
    payload = {
        'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRY_MINUTES),
        'iat': datetime.datetime.now(datetime.timezone.utc),
        'sub': user_id,
        'type': 'access'
    }
    return jwt.encode(
        payload,
        current_app.config['SECRET_KEY'],
        algorithm='HS256'
    )


def generate_refresh_token(user_id):
    """
    Generate a secure signed JWT refresh token for HttpOnly cookie storage.
    """
    payload = {
        'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=REFRESH_TOKEN_EXPIRY_DAYS),
        'iat': datetime.datetime.now(datetime.timezone.utc),
        'sub': user_id,
        'type': 'refresh',
        'jti': secrets.token_urlsafe(16)
    }
    return jwt.encode(
        payload,
        current_app.config['SECRET_KEY'],
        algorithm='HS256'
    )


def hash_token(token):
    """Hash a token for secure storage."""
    return generate_password_hash(token)


def jwt_required(f):
    """
    Reusable custom decorator function that extracts the JWT token from the
    Authorization header, decodes it, and attaches the user model to g.user.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({"error": "Authorization header is missing"}), 401
        
        try:
            parts = auth_header.split()
            if len(parts) != 2 or parts[0].lower() != 'bearer':
                return jsonify({"error": "Authorization header must follow 'Bearer <token>' format"}), 401
            
            token = parts[1]
            payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            user_id = payload['sub']
            
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
            
        pin_hash = generate_password_hash(str(pin))
        
        new_user = User(
            username=username,
            pin_hash=pin_hash,
            cycle_length_baseline=data.get('cycle_length_baseline', 28),
            period_length_baseline=data.get('period_length_baseline', 5),
            has_pcos=bool(data.get('has_pcos', False)),
            has_pmdd=bool(data.get('has_pmdd', False)),
            has_endo=bool(data.get('has_endo', False))
        )
        
        db.session.add(new_user)
        db.session.flush() # Populate the new_user.id
        
        refresh_token = generate_refresh_token(new_user.id)
        refresh_token_hash = hash_token(refresh_token)
        new_user.refresh_token_hash = refresh_token_hash
        
        db.session.commit()
        
        access_token = generate_access_token(new_user.id)
        
        response = make_response(jsonify({
            "status": "success",
            "message": "User registered successfully",
            "token": access_token,
            "user": new_user.to_dict()
        }), 201)
        
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
    
    if not user or not check_password_hash(user.pin_hash, str(pin)):
        return jsonify({"error": "Invalid username or PIN"}), 401
    
    access_token = generate_access_token(user.id)
    refresh_token = generate_refresh_token(user.id)
    user.refresh_token_hash = hash_token(refresh_token)
    db.session.commit()
    
    response = make_response(jsonify({
        "status": "success",
        "message": "Login successful",
        "token": access_token,
        "user": user.to_dict()
    }), 200)
    
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
    Exchange a valid refresh token for a new access token.
    """
    refresh_token = request.cookies.get('refresh_token')
    
    if not refresh_token:
        return jsonify({"error": "Refresh token not found"}), 401
    
    authenticated_user = verify_refresh_token(refresh_token)
    
    if not authenticated_user:
        return jsonify({"error": "Invalid refresh token"}), 401
    
    access_token = generate_access_token(authenticated_user.id)
    
    return jsonify({
        "status": "success",
        "token": access_token,
        "user": authenticated_user.to_dict()
    }), 200


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    Invalidate the refresh token by clearing it.
    """
    refresh_token = request.cookies.get('refresh_token')
    
    if refresh_token:
        authenticated_user = verify_refresh_token(refresh_token)
        if authenticated_user:
            authenticated_user.refresh_token_hash = None
            db.session.commit()
    
    response = make_response(jsonify({
        "status": "success",
        "message": "Logged out successfully"
    }), 200)
    
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
    Delete the current authenticated user account and all associated daily logs.
    """
    try:
        user = g.user
        db.session.delete(user)
        db.session.commit()
        
        response = make_response(jsonify({
            "status": "success",
            "message": "Account and all associated data deleted successfully"
        }), 200)
        
        response.delete_cookie('refresh_token')
        return response
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete account due to an internal error."}), 500


@auth_bp.route('/verify-pin', methods=['POST'])
@jwt_required
def verify_pin():
    """
    Verifies the user's PIN for the calculator camouflage guard.
    """
    data = request.get_json() or {}
    pin = data.get('pin')
    if not pin:
        return jsonify({"error": "PIN is required"}), 400
    
    if check_password_hash(g.user.pin_hash, str(pin)):
        return jsonify({"status": "success", "unlocked": True}), 200
    else:
        return jsonify({"error": "Incorrect PIN", "unlocked": False}), 401


def verify_refresh_token(refresh_token):

    """
    Verify a refresh token exists, is valid, and return the associated user.
    """
    if not refresh_token:
        return None
    try:
        payload = jwt.decode(refresh_token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        if payload.get('type') != 'refresh':
            return None
        user_id = payload['sub']
        user = db.session.get(User, user_id)
        if user and user.refresh_token_hash and check_password_hash(user.refresh_token_hash, refresh_token):
            return user
    except jwt.PyJWTError:
        pass
    return None
