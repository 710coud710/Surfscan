import os
import sys
from pathlib import Path
from app import create_app
# Get current directory
current_dir = Path(__file__).parent

def validate_environment():
    required_dirs = ['data', 'data/exports', 'logs']
    for dir_path in required_dirs:
        full_path = current_dir / dir_path
        full_path.mkdir(parents=True, exist_ok=True)
        print(f"📁 Directory ready: {dir_path}")
    
    return True

def get_server_config():
    """Get server configuration from environment variables"""
    config = {
        'env': os.environ.get('FLASK_ENV', 'development'),
        'host': os.environ.get('HOST', '127.0.0.1'),
        'port': int(os.environ.get('PORT', 8000)),
        'debug': os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    }
    
    # Override debug based on environment
    if config['env'] == 'production':
        config['debug'] = False
    elif config['env'] == 'development':
        config['debug'] = True
    
    return config

def printStartupInfo(config):
    """Print startup information"""
    print("🌊 SurfScan Backend Server")
    print("=" * 50)
    print(f"📍 Server URL: http://{config['host']}:{config['port']}")
    print(f"🔧 Environment: {config['env']}")
    print(f"🐛 Debug mode: {config['debug']}")
    print(f"🐍 Python version: {sys.version.split()[0]}")
    print(f"📂 Working directory: {current_dir}")
    # API endpoints info
    print("\nAvailable endpoints:")
    print("  GET  /              - Health check")
    print("  GET  /status        - Detailed status")
    print("  POST /api/scan      - Receive scan data")
    print("  POST /api/process   - Process export data")
    print("  GET  /api/files     - List CSV files")
    print("  GET  /api/stats     - Get statistics")
    print("\n" + "=" * 50)
    print()

def main():
    try:
        validate_environment()
        config = get_server_config()
        printStartupInfo(config)
        app = create_app(config['env'])
        app.run(
            host=config['host'],
            port=config['port'],
            debug=config['debug'],
            threaded=True,
            use_reloader=config['debug']
        )  
    except Exception as e:
        print(f"Error starting server: {e}")

if __name__ == '__main__':
    main()