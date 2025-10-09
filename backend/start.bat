@echo off
echo Starting SurfScan Backend Server...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Create necessary directories
if not exist "data" mkdir data
if not exist "logs" mkdir logs
if not exist "data\exports" mkdir data\exports

REM Start the server
echo.
echo Starting server at http://localhost:8000
echo Press Ctrl+C to stop the server
echo.
python run.py

pause
