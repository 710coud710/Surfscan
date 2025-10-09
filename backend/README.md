# 🌊 SurfScan Backend

Backend service for SurfScan Chrome Extension - Auto-scan and collect data from academic websites, news, and articles.

## 🏗️ Project Structure

```
Backend/
├── app/
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── main.py          # Health check and general endpoints
│   │   └── api.py           # Main API endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── file_service.py  # CSV file operations
│   │   └── parse_service.py # Data cleaning & validation
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── auth.py          # Authentication utilities
│   │   ├── validators.py    # Data validation
│   │   └── helpers.py       # Helper functions
│   ├── run.py               # Application runner
│   └── __init__.py          # Application factory
├── data/                    # CSV data storage
│   └── exports/             # Exported files
├── logs/                    # Application logs
├── .env                     # Environment configuration
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Setup

Create a `.env` file in the backend directory:

```env
# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=True

# API Security
SURFSCAN_API_KEY=your_api_key_here

# Server Configuration
HOST=0.0.0.0
PORT=8000

# Data Storage
DATA_DIR=data
LOG_DIR=logs

# File Management
MAX_FILE_AGE_DAYS=30
MAX_EXPORT_FILES=100

# Security
SECRET_KEY=your-secret-key-here
```

### 3. Run Server

```bash
# Development mode
python app/run.py

# Or using the startup scripts
./start.sh    # Linux/Mac
start.bat     # Windows
```

Server will start at: `http://localhost:8000`

## 📡 API Endpoints

### Health & Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Basic health check |
| `GET` | `/status` | Detailed system status |

### Data Collection

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/scan` | Receive scan data from extension |
| `POST` | `/api/process` | Process data for export |

### Data Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/files` | List all CSV files |
| `GET` | `/api/files/<date>` | Get data for specific date |
| `GET` | `/api/stats` | Get statistics |
| `GET` | `/api/download/<file_id>` | Download exported file |
| `POST` | `/api/cleanup` | Clean up old files |

## 📊 Data Format

### Input (from Extension)
```json
{
  "title": "Article Title",
  "author": "Author Name",
  "publisher": "Publisher",
  "date": "2025-10-09",
  "abstract": "Article abstract...",
  "url": "https://example.com"
}
```

### Storage (CSV)
Data is stored in daily CSV files: `data/YYYY-MM-DD.csv`

Columns:
- `title` - Article title
- `author` - Author name
- `publisher` - Publisher/source
- `date` - Publication date
- `abstract` - Article abstract
- `url` - Source URL
- `time_received` - When backend received the data

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FLASK_ENV` | Flask environment | `development` |
| `FLASK_DEBUG` | Enable debug mode | `True` |
| `SURFSCAN_API_KEY` | API key for authentication | `surfscan_123456` |
| `HOST` | Server host | `0.0.0.0` |
| `PORT` | Server port | `8000` |
| `DATA_DIR` | Data storage directory | `data` |
| `LOG_DIR` | Logs directory | `logs` |
| `MAX_FILE_AGE_DAYS` | Days to keep old files | `30` |
| `MAX_EXPORT_FILES` | Max export files to keep | `100` |
| `SECRET_KEY` | Flask secret key | `surfscan-secret-key` |

### Security (Optional)

To enable API key authentication, uncomment the validation in `app/routes/api.py`:

```python
# Validate API key (optional - uncomment to enable)
if not validate_api_key(request):
    return jsonify({'error': 'Invalid API key'}), 401
```

Then send requests with header:
```
x-api-key: your_api_key_here
```

## 📈 Features

### Data Processing
- ✅ Automatic text cleaning and normalization
- ✅ Date format standardization
- ✅ URL validation
- ✅ HTML entity decoding
- ✅ Input validation with detailed error messages
- ✅ Duplicate handling

### File Management
- ✅ Daily CSV file creation
- ✅ Automatic header generation
- ✅ Data export functionality
- ✅ File statistics and metadata
- ✅ Old file cleanup
- ✅ Export file management

### Architecture
- ✅ Modular Flask application structure
- ✅ Blueprint-based routing
- ✅ Service layer architecture
- ✅ Utility functions separation
- ✅ Configuration management
- ✅ Environment-based settings

### Monitoring
- ✅ Comprehensive logging
- ✅ Error handling with detailed responses
- ✅ Health check endpoints
- ✅ Statistics tracking
- ✅ Request validation

## 🔍 Usage Examples

### Test Health Check
```bash
curl http://localhost:8000/
```

### Send Scan Data
```bash
curl -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -H "x-api-key: surfscan_123456" \
  -d '{
    "title": "Test Article",
    "author": "John Doe",
    "publisher": "Test Publisher",
    "date": "2025-10-09",
    "abstract": "This is a test abstract",
    "url": "https://example.com"
  }'
```

### Get Statistics
```bash
curl http://localhost:8000/api/stats
```

### List Files
```bash
curl http://localhost:8000/api/files
```

### Export Data
```bash
curl -X POST http://localhost:8000/api/process \
  -H "Content-Type: application/json" \
  -d '{
    "exportAll": true,
    "data": [...]
  }'
```

## 🛠️ Development

### Project Structure Explanation

- **`app/`** - Main application package
  - **`routes/`** - Flask blueprints for different endpoint groups
  - **`services/`** - Business logic and data processing
  - **`utils/`** - Utility functions and helpers
  - **`run.py`** - Application entry point
  - **`__init__.py`** - Application factory

### Running Tests
```bash
pytest
```

### Code Quality
```bash
# Install development dependencies
pip install flake8 black

# Format code
black app/

# Check code quality
flake8 app/
```

### Adding New Features

1. **New API Endpoint**: Add to appropriate blueprint in `app/routes/`
2. **Business Logic**: Add service class in `app/services/`
3. **Utilities**: Add helper functions in `app/utils/`
4. **Configuration**: Update `app/__init__.py` and environment variables

## 🔄 Data Flow

```
[Chrome Extension] 
    ↓ POST /api/scan
[API Routes (api.py)]
    ↓ Validate & Clean
[Parse Service]
    ↓ Save to CSV
[File Service]
    ↓ Daily Files
[data/YYYY-MM-DD.csv]
```

## 📝 Logging

Application logs are stored in `logs/system.log` with the following format:
```
2025-10-09 15:30:45,123 - app.routes.api - INFO - Data saved to 2025-10-09.csv
2025-10-09 15:30:46,456 - app.services.file_service - ERROR - Error processing scan data
```

Log levels:
- **INFO**: General application flow
- **WARNING**: Potential issues
- **ERROR**: Error conditions
- **DEBUG**: Detailed debugging information (development only)

## 🚀 Production Deployment

### Using Gunicorn
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 "app:create_app()"
```

### Using Docker
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "app:create_app()"]
```

### Environment Variables for Production
```env
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=your-production-secret-key
SURFSCAN_API_KEY=your-production-api-key
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes following the project structure
4. Add tests for new functionality
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Troubleshooting

### Common Issues

1. **Port already in use**: Change PORT in `.env` file
2. **Permission denied**: Check file permissions for data/ and logs/ directories
3. **Module not found**: Ensure you're running from the backend/ directory
4. **CSV encoding issues**: Check that your system supports UTF-8 encoding

### Debug Mode

Enable debug mode by setting `FLASK_DEBUG=True` in `.env` file for detailed error messages.

### Logs

Check `logs/system.log` for detailed error information and application flow.