#!/usr/bin/env python3
"""
Parse Service - Clean and normalize scan data
Handles text cleaning, validation, and data normalization
"""

import re
import html
from typing import Dict, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ParseService:
    def __init__(self):
        # Common patterns for cleaning
        self.whitespace_pattern = re.compile(r'\s+')
        self.special_chars_pattern = re.compile(r'[^\w\s\-.,;:!?()\[\]{}"\'/]')
        self.url_pattern = re.compile(r'https?://[^\s<>"{}|\\^`\[\]]+')
        
        # Date patterns for normalization
        self.date_patterns = [
            (r'(\d{4})-(\d{1,2})-(\d{1,2})', '%Y-%m-%d'),  # 2025-10-09
            (r'(\d{1,2})/(\d{1,2})/(\d{4})', '%m/%d/%Y'),   # 10/09/2025
            (r'(\d{1,2})-(\d{1,2})-(\d{4})', '%m-%d-%Y'),   # 10-09-2025
            (r'([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})', '%B %d, %Y'),  # October 09, 2025
        ]
    
    def clean_text(self, text: str, max_length: Optional[int] = None) -> str:
        """Clean and normalize text content"""
        if not text or not isinstance(text, str):
            return ""
        
        try:
            # Decode HTML entities
            text = html.unescape(text)
            
            # Remove excessive whitespace and normalize
            text = self.whitespace_pattern.sub(' ', text)
            
            # Strip leading/trailing whitespace
            text = text.strip()
            
            # Remove control characters but keep basic punctuation
            # text = self.special_chars_pattern.sub('', text)
            
            # Truncate if max_length specified
            if max_length and len(text) > max_length:
                text = text[:max_length].rsplit(' ', 1)[0] + '...'
            
            return text
            
        except Exception as e:
            logger.warning(f"Error cleaning text: {str(e)}")
            return str(text)[:max_length] if max_length else str(text)
    
    def clean_url(self, url: str) -> str:
        """Clean and validate URL"""
        if not url or not isinstance(url, str):
            return ""
        
        try:
            url = url.strip()
            
            # Basic URL validation
            if self.url_pattern.match(url):
                return url
            
            # Try to fix common issues
            if url.startswith('www.'):
                url = 'https://' + url
            elif not url.startswith(('http://', 'https://')):
                url = 'https://' + url
            
            # Validate again
            if self.url_pattern.match(url):
                return url
            
            return url  # Return as-is if can't validate
            
        except Exception as e:
            logger.warning(f"Error cleaning URL: {str(e)}")
            return str(url)
    
    def normalize_date(self, date_str: str) -> str:
        """Normalize date to YYYY-MM-DD format"""
        if not date_str or not isinstance(date_str, str):
            return ""
        
        try:
            date_str = date_str.strip()
            
            # Try each date pattern
            for pattern, format_str in self.date_patterns:
                match = re.search(pattern, date_str)
                if match:
                    try:
                        if format_str == '%B %d, %Y':
                            # Handle month name format
                            date_obj = datetime.strptime(match.group(0), format_str)
                        else:
                            # Handle numeric formats
                            groups = match.groups()
                            if format_str == '%Y-%m-%d':
                                date_obj = datetime(int(groups[0]), int(groups[1]), int(groups[2]))
                            elif format_str in ['%m/%d/%Y', '%m-%d-%Y']:
                                date_obj = datetime(int(groups[2]), int(groups[0]), int(groups[1]))
                        
                        return date_obj.strftime('%Y-%m-%d')
                    except ValueError:
                        continue
            
            # If no pattern matches, return cleaned string
            return self.clean_text(date_str, 20)
            
        except Exception as e:
            logger.warning(f"Error normalizing date '{date_str}': {str(e)}")
            return str(date_str)
    
    def extract_domain(self, url: str) -> str:
        """Extract domain from URL for publisher fallback"""
        try:
            if not url:
                return ""
            
            # Remove protocol
            domain = re.sub(r'https?://', '', url)
            # Remove path and parameters
            domain = domain.split('/')[0]
            # Remove www prefix
            domain = re.sub(r'^www\.', '', domain)
            
            return domain
            
        except Exception as e:
            logger.warning(f"Error extracting domain from '{url}': {str(e)}")
            return ""
    
    def validate_required_fields(self, data: Dict) -> Dict:
        """Validate and ensure required fields exist"""
        validated = {}
        
        # Title is most important
        validated['title'] = self.clean_text(data.get('title', ''), 200)
        if not validated['title']:
            validated['title'] = "Untitled"
        
        # Author
        validated['author'] = self.clean_text(data.get('author', ''), 100)
        
        # Publisher with fallback to domain
        validated['publisher'] = self.clean_text(data.get('publisher', ''), 100)
        if not validated['publisher'] and data.get('url'):
            validated['publisher'] = self.extract_domain(data.get('url', ''))
        
        # Date
        validated['date'] = self.normalize_date(data.get('date', ''))
        
        # Abstract
        validated['abstract'] = self.clean_text(data.get('abstract', ''), 500)
        
        # URL
        validated['url'] = self.clean_url(data.get('url', ''))
        
        return validated
    
    def clean_scan_data(self, data: Dict) -> Dict:
        """Main method to clean and validate scan data"""
        try:
            if not data or not isinstance(data, dict):
                logger.warning("Invalid data format received")
                return self.get_empty_data()
            
            # Validate and clean all fields
            cleaned_data = self.validate_required_fields(data)
            
            # Log cleaning results
            logger.debug(f"Cleaned data for: {cleaned_data.get('title', 'Unknown')}")
            
            return cleaned_data
            
        except Exception as e:
            logger.error(f"Error cleaning scan data: {str(e)}")
            return self.get_empty_data()
    
    def get_empty_data(self) -> Dict:
        """Return empty data structure"""
        return {
            'title': 'Data Processing Error',
            'author': '',
            'publisher': '',
            'date': '',
            'abstract': '',
            'url': ''
        }
    
    def detect_language(self, text: str) -> str:
        """Simple language detection (optional feature)"""
        if not text:
            return "unknown"
        
        try:
            # Simple heuristic based on character patterns
            # This is very basic - for production, use proper language detection library
            
            # Check for common English words
            english_words = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
            text_lower = text.lower()
            english_count = sum(1 for word in english_words if word in text_lower)
            
            if english_count >= 3:
                return "en"
            
            # Check for Vietnamese characters
            vietnamese_chars = ['ă', 'â', 'đ', 'ê', 'ô', 'ơ', 'ư', 'á', 'à', 'ả', 'ã', 'ạ']
            if any(char in text_lower for char in vietnamese_chars):
                return "vi"
            
            return "unknown"
            
        except Exception as e:
            logger.warning(f"Error detecting language: {str(e)}")
            return "unknown"
    
    def extract_keywords(self, text: str, max_keywords: int = 10) -> list:
        """Extract keywords from text (optional feature)"""
        if not text:
            return []
        
        try:
            # Simple keyword extraction
            # Remove common stop words
            stop_words = {
                'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
                'a', 'an', 'as', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had',
                'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
                'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
            }
            
            # Extract words
            words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
            
            # Filter stop words and count frequency
            word_freq = {}
            for word in words:
                if word not in stop_words:
                    word_freq[word] = word_freq.get(word, 0) + 1
            
            # Sort by frequency and return top keywords
            keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
            return [word for word, freq in keywords[:max_keywords]]
            
        except Exception as e:
            logger.warning(f"Error extracting keywords: {str(e)}")
            return []
