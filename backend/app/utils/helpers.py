"""
Helper utilities for SurfScan Backend
Common utility functions and helpers
"""

from datetime import datetime
from typing import Dict, Any, Optional
import logging
import os
import json

logger = logging.getLogger(__name__)

def get_current_timestamp() -> str:
    """
    Get current timestamp in ISO format
    
    Returns:
        str: Current timestamp
    """
    return datetime.now().isoformat()

def format_response(status: str, data: Any = None, message: str = None, error: str = None) -> Dict[str, Any]:
    """
    Format standardized API response
    
    Args:
        status: Response status ('success', 'error', etc.)
        data: Response data
        message: Success message
        error: Error message
        
    Returns:
        Dict: Formatted response
    """
    response = {
        'status': status,
        'timestamp': get_current_timestamp()
    }
    
    if data is not None:
        response['data'] = data
    
    if message:
        response['message'] = message
    
    if error:
        response['error'] = error
    
    return response

def ensure_directory_exists(directory_path: str) -> bool:
    """
    Ensure directory exists, create if it doesn't
    
    Args:
        directory_path: Path to directory
        
    Returns:
        bool: True if directory exists or was created successfully
    """
    try:
        os.makedirs(directory_path, exist_ok=True)
        return True
    except Exception as e:
        logger.error(f"Error creating directory {directory_path}: {str(e)}")
        return False

def safe_json_loads(json_string: str, default: Any = None) -> Any:
    """
    Safely parse JSON string
    
    Args:
        json_string: JSON string to parse
        default: Default value if parsing fails
        
    Returns:
        Parsed JSON or default value
    """
    try:
        return json.loads(json_string)
    except (json.JSONDecodeError, TypeError) as e:
        logger.warning(f"Error parsing JSON: {str(e)}")
        return default

def safe_json_dumps(data: Any, default: str = "{}") -> str:
    """
    Safely serialize data to JSON string
    
    Args:
        data: Data to serialize
        default: Default value if serialization fails
        
    Returns:
        JSON string or default value
    """
    try:
        return json.dumps(data, ensure_ascii=False, indent=2)
    except (TypeError, ValueError) as e:
        logger.warning(f"Error serializing JSON: {str(e)}")
        return default

def truncate_string(text: str, max_length: int, suffix: str = "...") -> str:
    """
    Truncate string to maximum length
    
    Args:
        text: Text to truncate
        max_length: Maximum length
        suffix: Suffix to add when truncating
        
    Returns:
        Truncated string
    """
    if not text or len(text) <= max_length:
        return text
    
    return text[:max_length - len(suffix)] + suffix

def get_file_size_human(file_path: str) -> str:
    """
    Get human-readable file size
    
    Args:
        file_path: Path to file
        
    Returns:
        Human-readable file size
    """
    try:
        size = os.path.getsize(file_path)
        
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        
        return f"{size:.1f} TB"
    except Exception as e:
        logger.warning(f"Error getting file size for {file_path}: {str(e)}")
        return "Unknown"

def validate_date_string(date_string: str) -> Optional[datetime]:
    """
    Validate and parse date string
    
    Args:
        date_string: Date string to validate
        
    Returns:
        datetime object if valid, None otherwise
    """
    date_formats = [
        '%Y-%m-%d',
        '%m/%d/%Y',
        '%m-%d-%Y',
        '%B %d, %Y',
        '%b %d, %Y',
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%dT%H:%M:%S'
    ]
    
    for fmt in date_formats:
        try:
            return datetime.strptime(date_string.strip(), fmt)
        except ValueError:
            continue
    
    return None

def clean_text_for_csv(text: str) -> str:
    """
    Clean text for safe CSV storage
    
    Args:
        text: Text to clean
        
    Returns:
        Cleaned text
    """
    if not text:
        return ""
    
    # Remove or replace problematic characters
    text = str(text)
    text = text.replace('\n', ' ')
    text = text.replace('\r', ' ')
    text = text.replace('\t', ' ')
    
    # Normalize whitespace
    import re
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()

def generate_unique_filename(base_name: str, extension: str, directory: str = "") -> str:
    """
    Generate unique filename by adding counter if file exists
    
    Args:
        base_name: Base filename without extension
        extension: File extension (with or without dot)
        directory: Directory to check for existing files
        
    Returns:
        Unique filename
    """
    if not extension.startswith('.'):
        extension = '.' + extension
    
    filename = base_name + extension
    full_path = os.path.join(directory, filename) if directory else filename
    
    counter = 1
    while os.path.exists(full_path):
        filename = f"{base_name}_{counter}{extension}"
        full_path = os.path.join(directory, filename) if directory else filename
        counter += 1
    
    return filename

def log_request_info(request, logger_instance=None):
    """
    Log request information for debugging
    
    Args:
        request: Flask request object
        logger_instance: Logger instance to use
    """
    if logger_instance is None:
        logger_instance = logger
    
    logger_instance.info(f"Request: {request.method} {request.path}")
    logger_instance.debug(f"Headers: {dict(request.headers)}")
    logger_instance.debug(f"Args: {dict(request.args)}")
    
    if request.is_json:
        try:
            logger_instance.debug(f"JSON: {request.get_json()}")
        except Exception:
            logger_instance.debug("JSON: <invalid>")

def calculate_processing_time(start_time: datetime) -> float:
    """
    Calculate processing time in seconds
    
    Args:
        start_time: Start time
        
    Returns:
        Processing time in seconds
    """
    return (datetime.now() - start_time).total_seconds()
