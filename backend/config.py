import os
from dotenv import load_dotenv

# Base directory of the application
basedir = os.path.abspath(os.path.dirname(__file__))

# Load environment variables from .env file
load_dotenv(os.path.join(basedir, '.env'))

class Config:
    # Flask secret key for JWT signing
    SECRET_KEY = os.environ.get('SECRET_KEY')
    
    # Database URI - target PostgreSQL (Neon DB / local), fallback to local SQLite
    _db_url = os.environ.get('DATABASE_URL') or 'postgresql://postgres:admin@localhost:5432/selene'
    if _db_url.startswith('postgres://'):
        _db_url = _db_url.replace('postgres://', 'postgresql://', 1)
    SQLALCHEMY_DATABASE_URI = _db_url
    
    # Connection pooling configuration for PostgreSQL in production
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": int(os.environ.get("DATABASE_POOL_SIZE", 10)),
        "max_overflow": int(os.environ.get("DATABASE_MAX_OVERFLOW", 20)),
        "pool_timeout": 30,
        "pool_recycle": 1800,
    }
    
    # Silence Flask-SQLAlchemy tracking overhead
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Allowed CORS origins
    ALLOWED_ORIGINS = [
        origin.strip() for origin in os.environ.get('ALLOWED_ORIGINS', 'http://localhost:5173').split(',')
    ]
    
    # Debug mode - disabled by default for security
    DEBUG = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    
    # Cookie security flags
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'true').lower() == 'true'
    REMEMBER_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True

    # Redis connection URL
    REDIS_URL = os.environ.get('REDIS_URL')
    
    # Rate Limiter storage uri
    RATELIMIT_STORAGE_URI = REDIS_URL or 'memory://'


class ProductionConfig(Config):
    DEBUG = False

