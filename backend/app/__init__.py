"""
SurfScan Backend Application
Flask application factory and configuration
"""

from flask import Flask
from flask_cors import CORS
import logging
import os
import sys
from datetime import datetime

def create_app(config_name='development'):
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Enable CORS for Chrome Extension
    CORS(app)
    
    # Load configuration
    app.config.from_object(get_config(config_name))
    
    # Setup logging
    setup_logging(app)
    
    # Register blueprints
    register_blueprints(app)
    
    # Create necessary directories
    create_directories(app)
    
    return app

def get_config(config_name):
    """Get configuration based on environment"""
    configs = {
        'development': DevelopmentConfig,
        'production': ProductionConfig,
        'testing': TestingConfig
    }
    return configs.get(config_name, DevelopmentConfig)

def setup_logging(app):
    """Setup application logging"""
    if not app.debug:
        # Ensure logs directory exists
        os.makedirs('logs', exist_ok=True)
        
        # File handler
        file_handler = logging.FileHandler('logs/system.log')
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        
        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s'
        ))
        console_handler.setLevel(logging.INFO)
        app.logger.addHandler(console_handler)
        
        app.logger.setLevel(logging.INFO)
        app.logger.info('SurfScan Backend startup')

def register_blueprints(app):
    """Register application blueprints"""
    from app.routes.main import main_bp
    from app.routes.api import api_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix='/api')

def create_directories(app):
    """Create necessary directories"""
    directories = ['data', 'data/exports', 'logs']
    for directory in directories:
        os.makedirs(directory, exist_ok=True)

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'surfscan-secret-key'
    SURFSCAN_API_KEY = os.environ.get('SURFSCAN_API_KEY') or 'surfscan_123456'
    DATA_DIR = os.environ.get('DATA_DIR') or 'data'
    LOG_DIR = os.environ.get('LOG_DIR') or 'logs'
    MAX_FILE_AGE_DAYS = int(os.environ.get('MAX_FILE_AGE_DAYS', 30))
    MAX_EXPORT_FILES = int(os.environ.get('MAX_EXPORT_FILES', 100))

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False

class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True
    DATA_DIR = 'test_data'
