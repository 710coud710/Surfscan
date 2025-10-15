# 🚀 SurfScan Setup Guide

Hướng dẫn cài đặt và chạy SurfScan - bao gồm cả Extension và Backend API.

## 📋 Yêu cầu hệ thống

### Backend
- Python 3.8 hoặc cao hơn
- pip (Python package manager)
- Git

### Extension
- Google Chrome hoặc Chromium-based browser (Edge, Brave, etc.)
- Node.js 14.0 hoặc cao hơn (cho việc phát triển)

## Tạo Thư Mục Làm Việc & Tải Mã Nguồn

1. Tạo một thư mục mới cho dự án (ví dụ: `surfscan-project`) và di chuyển vào đó:
```bash
mkdir surfscan-project
cd surfscan-project
```

2. Khởi tạo git
```bash

git init

```

3. Clone repository SurfScan từ GitHub:
```bash
git clone https://github.com/ten-bien-dich/SurfScan.git
```

## 🔧 Cài đặt Backend

1. Clone repository và di chuyển vào thư mục backend:
```bash
cd backend
```

2. Tạo và kích hoạt môi trường ảo Python:
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Linux/MacOS
python3 -m venv venv
source venv/bin/activate
```

3. Cài đặt các dependencies:
```bash
pip install -r requirements.txt
```

4. Tạo file môi trường từ mẫu:
```bash
# Windows
copy env.example .env

# Linux/MacOS
cp env.example .env
```

5. Chạy server:
```bash
# Windows
python run.py

# Linux/MacOS
./start.sh
```

Server sẽ chạy mặc định tại `http://localhost:5000`

## 🔌 Cài đặt Extension

1. Di chuyển vào thư mục Surfscan:
```bash
cd Surfscan
```

2. Mở Chrome và truy cập `chrome://extensions/`

3. Bật "Developer mode" ở góc phải trên cùng

4. Click "Load unpacked" và chọn thư mục `Surfscan`

Extension sẽ xuất hiện trên thanh công cụ của Chrome.

## ⚙️ Cấu hình

### Backend Configuration (.env)
```env
FLASK_ENV=development
FLASK_DEBUG=True
SURFSCAN_API_KEY=surfscan_123456nineten
HOST=0.0.0.0
PORT=8000
DATA_DIR=data
LOG_DIR=logs
MAX_FILE_AGE_DAYS=30
MAX_EXPORT_FILES=100
SECRET_KEY=surfscan-secret-key-change-in-production
```

### Extension Configuration
Mặc định extension sẽ kết nối với backend tại `http://localhost:5000`. Để thay đổi:

1. Mở file `Surfscan/background.js`
2. Tìm và sửa biến `API_URL`
3. Reload extension trong `chrome://extensions/`

## 📁 Cấu trúc thư mục

```
SurfScan/
├── backend/            # Backend API
│   ├── app/            # Core application
│   ├── data/           # CSV storage
│   ├── logs/           # System logs
│   ├── .env            # Environment variables
│   ├── run.py          # Main entry point
│   ├── requirements.txt # Python dependencies
│   └── venv/           # Python virtual environment
│
└── Surfscan/         # Chrome Extension
    ├── popup/        # Extension UI
    ├── assets/       # Images & resources
    ├── background.js # Background script
    └── content.js    # Content script
```

## 🔍 Kiểm tra cài đặt

### Backend
1. Truy cập `http://localhost:5000/api/files`
2. Bạn sẽ thấy danh sách các file CSV (nếu có)

### Extension
1. Click vào icon extension trên Chrome
2. Popup interface sẽ hiện ra
3. Thử scan một trang web bất kỳ

## 🐛 Xử lý lỗi thường gặp

### Backend
- **Port đã được sử dụng**: Thay đổi PORT trong file .env
- **ModuleNotFoundError**: Chạy lại `pip install -r requirements.txt`
- **Permission denied**: Kiểm tra quyền thư mục data/ và logs/

### Extension
- **Không kết nối được backend**: Kiểm tra API_URL và đảm bảo backend đang chạy
- **Extension không load**: Kiểm tra manifest.json và reload extension
- **Popup không mở**: Kiểm tra lỗi trong Chrome DevTools

## 📚 Tài liệu tham khảo

- [Backend API Documentation](docs/backend_surfscan.md)
- [Extension Layout](docs/layout-extension.md)
- [Auto-scan Guide](docs/auto-scan.md)

## 🆘 Hỗ trợ

Nếu bạn gặp vấn đề trong quá trình cài đặt, vui lòng:
1. Kiểm tra logs trong `backend/logs/system.log`
2. Xem Chrome DevTools cho extension errors
3. Tạo issue trên repository với chi tiết lỗi
