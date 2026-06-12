from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate

# Robust import pattern supporting execution both as a package or direct script
try:
    from .config import Config
    from .models import db
    from .auth import auth_bp, limiter
    from .logs import logs_bp
    from .predict import predict_bp
except ImportError:
    from config import Config
    from models import db
    from auth import auth_bp, limiter
    from logs import logs_bp
    from predict import predict_bp


def create_app(config_class=Config):
    """
    Application factory to configure Flask, bind db, setup CORS, and register blueprints.
    """
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Validate SECRET_KEY is set unless in testing mode
    if not app.config.get('TESTING'):
        if not app.config.get('SECRET_KEY'):
            raise ValueError('SECRET_KEY environment variable is required for production.')
    
    # Initialize rate limiter with strict limits for auth endpoints
    limiter.init_app(app)
    
    # Initialize Flask-Migrate for database schema migrations
    migrate = Migrate(app, db)
    
    # Strict CORS configuration restricted to authorized origins (Vite frontend)
    CORS(app, resources={r"/api/*": {
        "origins": app.config['ALLOWED_ORIGINS'],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-CSRF-Token"]
    }}, supports_credentials=True)
    
    # Initialize SQLAlchemy database instance
    db.init_app(app)
    
    # Register core API Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(logs_bp, url_prefix='/api/logs')
    app.register_blueprint(predict_bp, url_prefix='/api/predict')
    
    # CSRF Protection Hook for Single Page Application
    @app.before_request
    def check_csrf():
        # Bypass for testing mode or safe methods
        if app.config.get('TESTING') or request.method in ('GET', 'OPTIONS', 'HEAD'):
            return
            
        csrf_cookie = request.cookies.get('csrf_token')
        csrf_header = request.headers.get('X-CSRF-Token')
        
        if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
            return jsonify({"error": "CSRF token validation failed."}), 400

    @app.after_request
    def set_csrf_cookie(response):
        # Only set cookie if it does not exist in request cookies
        if not request.cookies.get('csrf_token'):
            import secrets
            token = secrets.token_hex(16)
            response.set_cookie(
                'csrf_token',
                token,
                samesite='Strict',
                secure=app.config.get('SESSION_COOKIE_SECURE', True),
                httponly=False  # Must be read by React frontend JS
            )
        return response

    # Service health checking route
    @app.route('/health', methods=['GET'])
    def health_check():
        try:
            from sqlalchemy import text
            db.session.execute(text("SELECT 1"))
            db_status = "connected"
        except Exception:
            db_status = "disconnected"
            
        return jsonify({
            "status": "healthy" if db_status == "connected" else "unhealthy",
            "database": db_status,
            "app_name": "selene-api"
        }), 200 if db_status == "connected" else 500

    # Register global exception handler to avoid leaking error details
    @app.errorhandler(Exception)
    def handle_exception(e):
        from werkzeug.exceptions import HTTPException
        if isinstance(e, HTTPException):
            return jsonify({"error": e.description}), e.code
        app.logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
        return jsonify({"error": "An unexpected internal database or system error occurred."}), 500
        
    return app


app = create_app()

if __name__ == '__main__':
    # Start the Flask app locally on port 5000
    # Uses DEBUG from config (default false, true when FLASK_DEBUG=true in .env)
    app.run(host='127.0.0.1', port=5000, debug=app.config.get('DEBUG', False))
