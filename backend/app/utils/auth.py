"""
Authentication utilities for SurfScan Backend
API key validation and security functions
"""

from flask import current_app
import logging

logger = logging.getLogger(__name__)

def validate_api_key(request):
    """
    Validate API key from request headers
    
    Args:
        request: Flask request object
        Ư
    Returns:
        bool: True if API key is valid, False otherwise
    """
    try:
        # Get API key from headers
        api_key = request.headers.get('x-api-key') or request.headers.get('X-API-Key')
        
        if not api_key:
            logger.warning("API request without API key")
            return False
        
        # Get expected API key from config
        expected_key = current_app.config.get('SURFSCAN_API_KEY')
        
        if not expected_key:
            logger.warning("No API key configured in application")
            return True  # If no key is configured, allow all requests
        
        # Validate key
        if api_key == expected_key:
            logger.debug("Valid API key provided")
            return True
        else:
            logger.warning(f"Invalid API key provided: {api_key[:8]}...")
            return False
            
    except Exception as e:
        logger.error(f"Error validating API key: {str(e)}")
        return False

def generate_api_key(length=32):
    """
    Generate a random API key
    
    Args:
        length (int): Length of the API key
        
    Returns:
        str: Generated API key
    """
    import secrets
    import string
    
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def hash_api_key(api_key):
    """
    Hash an API key for secure storage
    
    Args:
        api_key (str): API key to hash
        
    Returns:
        str: Hashed API key
    """
    import hashlib
    return hashlib.sha256(api_key.encode()).hexdigest()

def verify_api_key_hash(api_key, hashed_key):
    """
    Verify an API key against its hash
    
    Args:
        api_key (str): API key to verify
        hashed_key (str): Hashed API key to verify against
        
    Returns:
        bool: True if API key matches hash, False otherwise
    """
    return hash_api_key(api_key) == hashed_key
