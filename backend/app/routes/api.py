"""
API routes for SurfScan Backend
Main API endpoints for data processing
"""

from flask import Blueprint, request, jsonify, send_file, current_app
from datetime import datetime
import logging
import os

from app.services.file_service import FileService
from app.services.parse_service import ParseService
from app.utils.auth import validate_api_key
# from app.utils.validators import validate_scan_data  # Not needed - extension handles validation

logger = logging.getLogger(__name__)

# Create blueprint
api_bp = Blueprint('api', __name__)

# Initialize services
file_service = FileService()
parse_service = ParseService()

@api_bp.route('/scan', methods=['POST'])
def receive_scan_data():
    """
    Expected JSON format:
    {
        "title": "Article Title",
        "author": "Author Name", 
        "publisher": "Publisher",
        "date": "2025-10-09",
        "abstract": "Article abstract...",
        "url": "https://example.com"
    }
    """
    try:
        # Validate API key (optional - uncomment to enable)
        # if not validate_api_key(request):
        #     return jsonify({'error': 'Invalid API key'}), 401
        
        # Get JSON data
        request_data = request.get_json()
        if not request_data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Extract actual data from nested structure if present
        if 'data' in request_data and isinstance(request_data['data'], dict):
            data = request_data['data']
        else:
            data = request_data
        
        # Skip validation - extension already handles data formatting
        # validation_result = validate_scan_data(data)
        # if not validation_result['valid']:
        #     return jsonify({
        #         'error': 'Invalid data format',
        #         'details': validation_result['errors']
        #     }), 400
        
        # Log received data
        logger.info(f"Received scan data from: {data.get('url', 'unknown')}")
        logger.info(f"Full data: {data}")
        
        # Parse and clean data
        cleaned_data = parse_service.clean_scan_data(data)
        
        # Save to CSV file
        result = file_service.save_scan_data(cleaned_data)
        
        if result['success']:
            logger.info(f"Data saved successfully to: {result['file']}")
            return jsonify({
                'status': 'success',
                'file': result['file'],
                'timestamp': datetime.now().isoformat(),
                'message': 'Data saved successfully'
            })
        else:
            logger.error(f"Failed to save data: {result['error']}")
            return jsonify({'error': result['error']}), 500
            
    except Exception as e:
        logger.error(f"Error processing scan data: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@api_bp.route('/process', methods=['POST'])
def process_data():
    """
    Process data endpoint for export functionality
    Compatible with existing extension code
    """
    try:
        request_data = request.get_json()
        if not request_data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Handle export all data
        if request_data.get('exportAll') and request_data.get('data'):
            logger.info(f"Exporting {len(request_data['data'])} records")
            result = file_service.export_all_data(request_data['data'])
            
            if result['success']:
                return jsonify({
                    'success': True,
                    'result': {
                        'fileId': result['file_id'],
                        'filename': result['filename'],
                        'downloadUrl': f"/api/download/{result['file_id']}",
                        'recordCount': len(request_data['data'])
                    }
                })
            else:
                return jsonify({'success': False, 'error': result['error']}), 500
        
        # Handle single data point - extract data from nested structure if present
        if 'data' in request_data and isinstance(request_data['data'], dict):
            data = request_data['data']
        else:
            data = request_data
        
        # Skip validation (extension handles formatting)
        # validation_result = validate_scan_data(data)
        # if not validation_result['valid']:
        #     return jsonify({
        #         'success': False,
        #         'error': 'Invalid data format',
        #         'details': validation_result['errors']
        #     }), 400
        
        cleaned_data = parse_service.clean_scan_data(data)
        result = file_service.save_scan_data(cleaned_data)
        
        if result['success']:
            return jsonify({
                'success': True,
                'result': {
                    'file': result['file'],
                    'timestamp': datetime.now().isoformat()
                }
            })
        else:
            return jsonify({'success': False, 'error': result['error']}), 500
            
    except Exception as e:
        logger.error(f"Error processing data: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@api_bp.route('/files', methods=['GET'])
def list_files():
    """List all available CSV files"""
    try:
        files = file_service.list_csv_files()
        return jsonify({
            'status': 'success',
            'files': files,
            'count': len(files),
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@api_bp.route('/files/<date>', methods=['GET'])
def get_file_data(date):
    """Get CSV data for specific date"""
    try:
        # Validate date format
        try:
            datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        data = file_service.get_csv_data(date)
        if data is not None:
            return jsonify({
                'status': 'success',
                'date': date,
                'data': data,
                'count': len(data),
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({'error': f'No data found for date: {date}'}), 404
    except Exception as e:
        logger.error(f"Error getting file data for {date}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@api_bp.route('/stats', methods=['GET'])
def get_stats():
    """Get statistics about collected data"""
    try:
        stats = file_service.get_statistics()
        return jsonify({
            'status': 'success',
            'stats': stats,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@api_bp.route('/download/<file_id>', methods=['GET'])
def download_file(file_id):
    """Download exported file"""
    try:
        file_path = file_service.get_export_file_path(file_id)
        if file_path and os.path.exists(file_path):
            logger.info(f"Downloading file: {file_path}")
            return send_file(
                file_path,
                as_attachment=True,
                download_name=os.path.basename(file_path)
            )
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        logger.error(f"Error downloading file {file_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@api_bp.route('/cleanup', methods=['POST'])
def cleanup_old_files():
    """Clean up old files (admin endpoint)"""
    try:
        # Get days parameter from request
        data = request.get_json() or {}
        days_to_keep = data.get('days', current_app.config.get('MAX_FILE_AGE_DAYS', 30))
        
        result = file_service.cleanup_old_files(days_to_keep)
        
        if result['success']:
            logger.info(f"Cleaned up {result['count']} old files")
            return jsonify({
                'status': 'success',
                'message': f"Cleaned up {result['count']} files older than {days_to_keep} days",
                'deleted_files': result['deleted_files'],
                'count': result['count']
            })
        else:
            return jsonify({'error': result['error']}), 500
            
    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# Error handlers for API blueprint
@api_bp.errorhandler(400)
def bad_request(error):
    """Handle 400 errors"""
    return jsonify({
        'error': 'Bad request',
        'message': 'Invalid request format or parameters',
        'status_code': 400
    }), 400

@api_bp.errorhandler(404)
def api_not_found(error):
    """Handle 404 errors for API routes"""
    return jsonify({
        'error': 'API endpoint not found',
        'message': 'The requested API endpoint does not exist',
        'status_code': 404
    }), 404

@api_bp.errorhandler(500)
def api_internal_error(error):
    """Handle 500 errors for API routes"""
    logger.error(f"API internal server error: {str(error)}")
    return jsonify({
        'error': 'Internal server error',
        'message': 'An unexpected error occurred while processing the request',
        'status_code': 500
    }), 500
