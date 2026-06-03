from flask import Flask, jsonify
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
        "allow_headers": ["Content-Type", "Authorization"]
    }}, supports_credentials=True)
    
    # Initialize SQLAlchemy database instance
    db.init_app(app)
    
    # Register core API Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(logs_bp, url_prefix='/api/logs')
    app.register_blueprint(predict_bp, url_prefix='/api/predict')
    
    # Service health checking route
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({
            "status": "healthy",
            "database_target": app.config['SQLALCHEMY_DATABASE_URI'].split('://')[0],
            "app_name": "selene-api"
        }), 200
        
    # Auto-initialize database tables in local contexts (SQLite or PostgreSQL)
    # Note: For production, use 'flask db upgrade' instead of create_all()
    # create_all() is kept for backward compatibility with existing deployments
    with app.app_context():
        db.create_all()
        
        # Mark migration as complete for the in-memory database
        # In production, 'flask db upgrade' should be run instead
        
    return app

app = create_app()

if __name__ == '__main__':
    # Start the Flask app locally on port 5000
    # Uses DEBUG from config (default false, true when FLASK_DEBUG=true in .env)
    app.run(host='127.0.0.1', port=5000, debug=app.config.get('DEBUG', False))
