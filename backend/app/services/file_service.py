#!/usr/bin/env python3
"""
File Service - Handle CSV file operations
Manages daily CSV files for scan data storage
"""

import csv
import os
import json
from datetime import datetime
from typing import Dict, List, Optional
import logging
import uuid

logger = logging.getLogger(__name__)

class FileService:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.export_dir = os.path.join(data_dir, "exports")
        
        # Ensure directories exist
        os.makedirs(self.data_dir, exist_ok=True)
        os.makedirs(self.export_dir, exist_ok=True)
        
        # CSV headers
        self.csv_headers = [
            "title",
            "author", 
            "publisher",
            "date",
            "abstract",
            "url",
            "time_received"
        ]
    
    def get_daily_filename(self, date: Optional[str] = None) -> str:
        """Get CSV filename for specific date (default: today)"""
        if date is None:
            date = datetime.now().strftime("%Y-%m-%d")
        return f"{date}.csv"
    
    def get_file_path(self, filename: str) -> str:
        """Get full file path"""
        return os.path.join(self.data_dir, filename)
    
    def create_csv_file(self, file_path: str) -> bool:
        """Create new CSV file with headers"""
        try:
            with open(file_path, "w", encoding="utf-8", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(self.csv_headers)
            logger.info(f"Created new CSV file: {file_path}")
            return True
        except Exception as e:
            logger.error(f"Error creating CSV file {file_path}: {str(e)}")
            return False
    
    def save_scan_data(self, data: Dict) -> Dict:
        """
        Save scan data to daily CSV file
        Returns: {'success': bool, 'file': str, 'error': str}
        """
        try:
            # Get today's filename
            filename = self.get_daily_filename()
            file_path = self.get_file_path(filename)
            
            # Create file if it doesn't exist
            if not os.path.exists(file_path):
                if not self.create_csv_file(file_path):
                    return {
                        'success': False,
                        'error': 'Failed to create CSV file'
                    }
            
            # Prepare data row
            current_time = datetime.now().isoformat()
            row_data = [
                data.get("title", ""),
                data.get("author", ""),
                data.get("publisher", ""),
                data.get("date", ""),
                data.get("abstract", ""),
                data.get("url", ""),
                current_time
            ]
            
            # Append data to CSV
            with open(file_path, "a", encoding="utf-8", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(row_data)
            
            logger.info(f"Data saved to {filename}")
            return {
                'success': True,
                'file': filename,
                'error': None
            }
            
        except Exception as e:
            error_msg = f"Error saving scan data: {str(e)}"
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg
            }
    
    def export_all_data(self, data_list: List[Dict]) -> Dict:
        """
        Export all data to a single CSV file
        Returns: {'success': bool, 'file_id': str, 'error': str}
        """
        try:
            # Generate unique file ID
            file_id = str(uuid.uuid4())
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"export_{timestamp}_{file_id[:8]}.csv"
            file_path = os.path.join(self.export_dir, filename)
            
            # Create export file
            with open(file_path, "w", encoding="utf-8", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(self.csv_headers)
                
                for item in data_list:
                    row_data = [
                        item.get("title", ""),
                        item.get("author", ""),
                        item.get("publisher", ""),
                        item.get("date", ""),
                        item.get("abstract", ""),
                        item.get("url", ""),
                        item.get("timestamp", datetime.now().isoformat())
                    ]
                    writer.writerow(row_data)
            
            logger.info(f"Exported {len(data_list)} records to {filename}")
            return {
                'success': True,
                'file_id': file_id,
                'filename': filename,
                'error': None
            }
            
        except Exception as e:
            error_msg = f"Error exporting data: {str(e)}"
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg
            }
    
    def list_csv_files(self) -> List[Dict]:
        """List all CSV files in data directory"""
        files = []
        try:
            for filename in os.listdir(self.data_dir):
                if filename.endswith('.csv') and not filename.startswith('export_'):
                    file_path = self.get_file_path(filename)
                    stat = os.stat(file_path)
                    
                    # Count rows (excluding header)
                    row_count = 0
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            row_count = sum(1 for line in f) - 1  # Exclude header
                    except:
                        row_count = 0
                    
                    files.append({
                        'filename': filename,
                        'date': filename.replace('.csv', ''),
                        'size': stat.st_size,
                        'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        'row_count': row_count
                    })
            
            # Sort by date (newest first)
            files.sort(key=lambda x: x['date'], reverse=True)
            
        except Exception as e:
            logger.error(f"Error listing CSV files: {str(e)}")
        
        return files
    
    def get_csv_data(self, date: str) -> Optional[List[Dict]]:
        """Get CSV data for specific date"""
        try:
            filename = self.get_daily_filename(date)
            file_path = self.get_file_path(filename)
            
            if not os.path.exists(file_path):
                return None
            
            data = []
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    data.append(dict(row))
            
            return data
            
        except Exception as e:
            logger.error(f"Error reading CSV data for {date}: {str(e)}")
            return None
    
    def get_statistics(self) -> Dict:
        """Get statistics about all CSV files"""
        try:
            files = self.list_csv_files()
            total_records = sum(f['row_count'] for f in files)
            
            stats = {
                'total_files': len(files),
                'total_records': total_records,
                'latest_file': files[0]['filename'] if files else None,
                'date_range': {
                    'start': files[-1]['date'] if files else None,
                    'end': files[0]['date'] if files else None
                },
                'files': files[:10]  # Latest 10 files
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting statistics: {str(e)}")
            return {
                'total_files': 0,
                'total_records': 0,
                'error': str(e)
            }
    
    def get_export_file_path(self, file_id: str) -> Optional[str]:
        """Get export file path by file ID"""
        try:
            for filename in os.listdir(self.export_dir):
                if file_id in filename:
                    return os.path.join(self.export_dir, filename)
            return None
        except Exception as e:
            logger.error(f"Error finding export file {file_id}: {str(e)}")
            return None
    
    def cleanup_old_files(self, days_to_keep: int = 30) -> Dict:
        """Clean up files older than specified days"""
        try:
            cutoff_date = datetime.now().timestamp() - (days_to_keep * 24 * 60 * 60)
            deleted_files = []
            
            for filename in os.listdir(self.data_dir):
                if filename.endswith('.csv'):
                    file_path = self.get_file_path(filename)
                    if os.path.getmtime(file_path) < cutoff_date:
                        os.remove(file_path)
                        deleted_files.append(filename)
                        logger.info(f"Deleted old file: {filename}")
            
            return {
                'success': True,
                'deleted_files': deleted_files,
                'count': len(deleted_files)
            }
            
        except Exception as e:
            error_msg = f"Error cleaning up files: {str(e)}"
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg
            }
