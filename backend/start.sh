#!/bin/bash

echo "🌊 Starting SurfScan Backend Server..."
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Create necessary directories
mkdir -p data/exports
mkdir -p logs

# Start the server
echo
echo "🚀 Starting server at http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo

python run.py
