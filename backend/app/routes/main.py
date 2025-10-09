"""
Main routes for SurfScan Backend
Health check and general endpoints
"""

from flask import Blueprint, jsonify
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Create blueprint
main_bp = Blueprint('main', __name__)

@main_bp.route('/', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'running',
        'service': 'SurfScan Backend',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat(),
        'message': 'Backend is healthy and ready to receive data'
    })

@main_bp.route('/status', methods=['GET'])
def detailed_status():
    """Detailed status endpoint"""
    import os
    from app.services.file_service import FileService
    
    try:
        file_service = FileService()
        stats = file_service.get_statistics()
        
        return jsonify({
            'status': 'running',
            'service': 'SurfScan Backend',
            'version': '1.0.0',
            'timestamp': datetime.now().isoformat(),
            'system': {
                'python_version': f"{os.sys.version_info.major}.{os.sys.version_info.minor}.{os.sys.version_info.micro}",
                'platform': os.sys.platform,
                'working_directory': os.getcwd()
            },
            'data': {
                'total_files': stats.get('total_files', 0),
                'total_records': stats.get('total_records', 0),
                'latest_file': stats.get('latest_file'),
                'data_directory': 'data/',
                'logs_directory': 'logs/'
            }
        })
    except Exception as e:
        logger.error(f"Error getting detailed status: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Error retrieving system status',
            'error': str(e)
        }), 500

@main_bp.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'error': 'Endpoint not found',
        'message': 'The requested endpoint does not exist',
        'status_code': 404
    }), 404

@main_bp.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({
        'error': 'Internal server error',
        'message': 'An unexpected error occurred',
        'status_code': 500
    }), 500
