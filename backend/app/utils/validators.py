"""
Data validation utilities for SurfScan Backend
Input validation and data structure validation
"""

import re
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

def validate_scan_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate scan data structure and content
    
    Args:
        data: Dictionary containing scan data
        
    Returns:
        Dict with 'valid' boolean and 'errors' list
    """
    errors = []
    
    if not isinstance(data, dict):
        return {
            'valid': False,
            'errors': ['Data must be a JSON object']
        }
    
    # Check required fields (at least one should be present)
    required_fields = ['title', 'url']
    has_required = any(data.get(field) for field in required_fields)
    
    if not has_required:
        errors.append('At least one of the following fields is required: title, url')
    
    # Validate individual fields if present
    if 'title' in data:
        title_validation = validate_title(data['title'])
        if not title_validation['valid']:
            errors.extend(title_validation['errors'])
    
    if 'author' in data:
        author_validation = validate_author(data['author'])
        if not author_validation['valid']:
            errors.extend(author_validation['errors'])
    
    if 'publisher' in data:
        publisher_validation = validate_publisher(data['publisher'])
        if not publisher_validation['valid']:
            errors.extend(publisher_validation['errors'])
    
    if 'date' in data:
        date_validation = validate_date(data['date'])
        if not date_validation['valid']:
            errors.extend(date_validation['errors'])
    
    if 'abstract' in data:
        abstract_validation = validate_abstract(data['abstract'])
        if not abstract_validation['valid']:
            errors.extend(abstract_validation['errors'])
    
    if 'url' in data:
        url_validation = validate_url(data['url'])
        if not url_validation['valid']:
            errors.extend(url_validation['errors'])
    
    return {
        'valid': len(errors) == 0,
        'errors': errors
    }

def validate_title(title: Any) -> Dict[str, Any]:
    """Validate title field"""
    errors = []
    
    if not isinstance(title, str):
        errors.append('Title must be a string')
    elif len(title.strip()) == 0:
        errors.append('Title cannot be empty')
    elif len(title) > 500:
        errors.append('Title is too long (max 500 characters)')
    
    return {
        'valid': len(errors) == 0,
        'errors': errors
    }

def validate_author(author: Any) -> Dict[str, Any]:
    """Validate author field"""
    errors = []
    
    if author is not None and not isinstance(author, str):
        errors.append('Author must be a string')
    elif isinstance(author, str) and len(author) > 200:
        errors.append('Author is too long (max 200 characters)')
    
    return {
        'valid': len(errors) == 0,
        'errors': errors
    }

def validate_publisher(publisher: Any) -> Dict[str, Any]:
    """Validate publisher field"""
    errors = []
    
    if publisher is not None and not isinstance(publisher, str):
        errors.append('Publisher must be a string')
    elif isinstance(publisher, str) and len(publisher) > 200:
        errors.append('Publisher is too long (max 200 characters)')
    
    return {
        'valid': len(errors) == 0,
        'errors': errors
    }

def validate_date(date: Any) -> Dict[str, Any]:
    """Validate date field"""
    errors = []
    
    if date is not None and not isinstance(date, str):
        errors.append('Date must be a string')
    elif isinstance(date, str) and date.strip():
        # Basic date format validation
        date_patterns = [
            r'^\d{4}-\d{1,2}-\d{1,2}$',  # YYYY-MM-DD
            r'^\d{1,2}/\d{1,2}/\d{4}$',   # MM/DD/YYYY
            r'^\d{1,2}-\d{1,2}-\d{4}$',   # MM-DD-YYYY
            r'^[A-Z][a-z]+ \d{1,2}, \d{4}$'  # Month DD, YYYY
        ]
        
        if not any(re.match(pattern, date.strip()) for pattern in date_patterns):
            errors.append('Date format not recognized. Use YYYY-MM-DD, MM/DD/YYYY, MM-DD-YYYY, or Month DD, YYYY')
    
    return {
        'valid': len(errors) == 0,
        'errors': errors
    }

def validate_abstract(abstract: Any) -> Dict[str, Any]:
    """Validate abstract field"""
    errors = []
    
    if abstract is not None and not isinstance(abstract, str):
        errors.append('Abstract must be a string')
    elif isinstance(abstract, str) and len(abstract) > 2000:
        errors.append('Abstract is too long (max 2000 characters)')
    
    return {
        'valid': len(errors) == 0,
        'errors': errors
    }

def validate_url(url: Any) -> Dict[str, Any]:
    """Validate URL field"""
    errors = []
    
    if not isinstance(url, str):
        errors.append('URL must be a string')
    elif len(url.strip()) == 0:
        errors.append('URL cannot be empty')
    else:
        # Basic URL validation
        url_pattern = r'^https?://[^\s<>"{}|\\^`\[\]]+$'
        if not re.match(url_pattern, url.strip()):
            errors.append('URL format is invalid')
        elif len(url) > 1000:
            errors.append('URL is too long (max 1000 characters)')
    
    return {
        'valid': len(errors) == 0,
        'errors': errors
    }

def validate_export_data(data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Validate export data array
    
    Args:
        data: List of dictionaries containing scan data
        
    Returns:
        Dict with 'valid' boolean and 'errors' list
    """
    errors = []
    
    if not isinstance(data, list):
        return {
            'valid': False,
            'errors': ['Export data must be an array']
        }
    
    if len(data) == 0:
        return {
            'valid': False,
            'errors': ['Export data cannot be empty']
        }
    
    if len(data) > 10000:
        errors.append('Too many records to export (max 10000)')
    
    # Validate each record
    for i, record in enumerate(data[:100]):  # Only validate first 100 for performance
        record_validation = validate_scan_data(record)
        if not record_validation['valid']:
            errors.append(f"Record {i+1}: {', '.join(record_validation['errors'])}")
    
    return {
        'valid': len(errors) == 0,
        'errors': errors
    }

def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename for safe file system operations
    
    Args:
        filename: Original filename
        
    Returns:
        Sanitized filename
    """
    # Remove or replace unsafe characters
    unsafe_chars = r'[<>:"/\\|?*]'
    sanitized = re.sub(unsafe_chars, '_', filename)
    
    # Remove leading/trailing dots and spaces
    sanitized = sanitized.strip('. ')
    
    # Ensure filename is not empty
    if not sanitized:
        sanitized = 'unnamed_file'
    
    # Limit length
    if len(sanitized) > 255:
        sanitized = sanitized[:255]
    
    return sanitized
