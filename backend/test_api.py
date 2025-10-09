#!/usr/bin/env python3
"""
Simple API test script for SurfScan Backend
Updated for new project structure
"""

import requests
import json
from datetime import datetime
import os
import sys

# Add app directory to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

# Configuration
BASE_URL = "http://localhost:8000"
API_KEY = "surfscan_123456"

def test_health_check():
    """Test health check endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"Health Check: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_scan_endpoint():
    """Test scan data endpoint"""
    try:
        test_data = {
            "title": "Test Article - Machine Learning in Healthcare",
            "author": "Dr. Jane Smith",
            "publisher": "Nature Medicine",
            "date": "2025-10-09",
            "abstract": "This study explores the application of machine learning algorithms in healthcare diagnostics, showing promising results in early disease detection.",
            "url": "https://example.com/ml-healthcare-2025"
        }
        
        headers = {
            "Content-Type": "application/json",
            # "x-api-key": API_KEY  # Uncomment if API key is enabled
        }
        
        response = requests.post(
            f"{BASE_URL}/api/scan",
            headers=headers,
            json=test_data
        )
        
        print(f"Scan Endpoint: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
        
    except Exception as e:
        print(f"Scan test failed: {e}")
        return False

def test_stats_endpoint():
    """Test statistics endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/api/stats")
        print(f"Stats Endpoint: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Stats test failed: {e}")
        return False

def test_files_endpoint():
    """Test files listing endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/api/files")
        print(f"Files Endpoint: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Files test failed: {e}")
        return False

def test_process_endpoint():
    """Test process endpoint (for export)"""
    try:
        test_data = {
            "exportAll": True,
            "data": [
                {
                    "title": "Export Test Article 1",
                    "author": "Test Author 1",
                    "publisher": "Test Publisher",
                    "date": "2025-10-09",
                    "abstract": "Test abstract 1",
                    "url": "https://example.com/test1",
                    "timestamp": datetime.now().isoformat()
                },
                {
                    "title": "Export Test Article 2",
                    "author": "Test Author 2",
                    "publisher": "Test Publisher",
                    "date": "2025-10-09",
                    "abstract": "Test abstract 2",
                    "url": "https://example.com/test2",
                    "timestamp": datetime.now().isoformat()
                }
            ]
        }
        
        headers = {"Content-Type": "application/json"}
        
        response = requests.post(
            f"{BASE_URL}/api/process",
            headers=headers,
            json=test_data
        )
        
        print(f"Process Endpoint: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
        
    except Exception as e:
        print(f"Process test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing SurfScan Backend API")
    print("=" * 40)
    
    tests = [
        ("Health Check", test_health_check),
        ("Scan Endpoint", test_scan_endpoint),
        ("Stats Endpoint", test_stats_endpoint),
        ("Files Endpoint", test_files_endpoint),
        ("Process Endpoint", test_process_endpoint),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n🔍 Testing {test_name}...")
        try:
            result = test_func()
            results.append((test_name, result))
            print(f"✅ {test_name}: {'PASSED' if result else 'FAILED'}")
        except Exception as e:
            results.append((test_name, False))
            print(f"❌ {test_name}: ERROR - {e}")
    
    print("\n" + "=" * 40)
    print("📊 Test Results Summary:")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"  {test_name}: {status}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
    else:
        print("⚠️  Some tests failed. Check server logs for details.")

if __name__ == "__main__":
    main()
