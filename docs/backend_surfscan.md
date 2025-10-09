# 🌊 SurfScan Backend Specification

## 🧩 I. Giới thiệu
SurfScan Backend là thành phần xử lý trung gian giữa **Chrome Extension** và **hệ thống lưu trữ dữ liệu**.  
Nhiệm vụ chính:
- Nhận dữ liệu được quét (scan) từ extension.
- Phân tích / làm sạch dữ liệu cơ bản.
- Ghi dữ liệu vào file CSV trong thư mục lưu trữ.
- Mỗi ngày 1 file CSV riêng, dữ liệu được **append** liên tục trong ngày.

---

## ⚙️ II. Cấu trúc thư mục backend

```

backend/
├── app.py                  # file chính khởi chạy server API
├── services/
│   ├── file_service.py     # module ghi dữ liệu vào CSV
│   ├── parse_service.py    # module làm sạch, chuẩn hóa text (tuỳ chọn)
│   └── **init**.py
├── data/                   # thư mục chứa các file CSV theo ngày
│   ├── 2025-10-07.csv
│   ├── 2025-10-08.csv
│   └── ...
├── logs/
│   └── system.log          # ghi log hoạt động hoặc lỗi (tuỳ chọn)
├── requirements.txt
└── README.md

````

---

## 📡 III. API Endpoint

### 1️⃣ `POST /api/scan`

**Chức năng:**  
Nhận dữ liệu từ Chrome Extension sau khi scan xong một trang web.

**Request body (JSON):**
```json
{
  "title": "Neural Networks in NLP",
  "author": "John Doe",
  "publisher": "Springer",
  "date": "2025-10-08",
  "abstract": "This paper discusses...",
  "url": "https://example.com/paper123"
}
````

**Response:**

```json
{
  "status": "success",
  "file": "2025-10-08.csv"
}
```

**Luồng xử lý:**

1. Backend nhận dữ liệu → xác thực (nếu có token).
2. Làm sạch dữ liệu (xoá ký tự đặc biệt, xuống dòng,...).
3. Xác định tên file theo ngày hiện tại, ví dụ `data/2025-10-08.csv`.
4. Nếu file chưa có → tạo mới, ghi header.
5. Nếu file đã tồn tại → ghi thêm dòng (append).
6. Ghi log kết quả → trả JSON phản hồi.

---

## 🧠 IV. Logic ghi file CSV

### 🔹 Quy tắc đặt tên file

* Mỗi ngày tạo 1 file CSV riêng.
* Tên file theo format: `YYYY-MM-DD.csv`.
* Đường dẫn mặc định: `./data/<date>.csv`.

### 🔹 Cấu trúc cột dữ liệu

| Cột           | Mô tả                          |
| ------------- | ------------------------------ |
| title         | Tiêu đề bài viết               |
| author        | Tác giả                        |
| publisher     | Nhà xuất bản / nguồn           |
| date          | Ngày xuất bản (nếu có)         |
| abstract      | Tóm tắt nội dung               |
| url           | Liên kết nguồn                 |
| time_received | Thời gian backend nhận dữ liệu |

### 🔹 Logic ghi file (pseudo-code)

```python
def save_scan_data(data):
    today = datetime.now().strftime("%Y-%m-%d")
    file_path = f"data/{today}.csv"

    # Nếu file chưa tồn tại → tạo mới và ghi header
    if not os.path.exists(file_path):
        with open(file_path, "w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["title", "author", "publisher", "date", "abstract", "url", "time_received"])

    # Ghi nối tiếp dữ liệu
    with open(file_path, "a", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            data.get("title", ""),
            data.get("author", ""),
            data.get("publisher", ""),
            data.get("date", ""),
            data.get("abstract", "").replace("\n", " ").strip(),
            data.get("url", ""),
            datetime.now().isoformat()
        ])
```

---

## 🗃️ V. Thư mục và file quan trọng

| Thư mục / File     | Vai trò                                        |
| ------------------ | ---------------------------------------------- |
| `/data`            | Nơi lưu toàn bộ dữ liệu quét (CSV)             |
| `/logs/system.log` | Lưu log lỗi hoặc quá trình ghi file            |
| `file_service.py`  | Chứa hàm xử lý việc mở/tạo file và ghi dữ liệu |
| `parse_service.py` | Làm sạch dữ liệu text trước khi ghi            |
| `app.py`           | Điểm khởi chạy server Flask/FastAPI            |

---

## 📊 VI. Các API phụ (tùy chọn mở rộng)

| Endpoint                   | Chức năng                            | Mô tả                     |
| -------------------------- | ------------------------------------ | ------------------------- |
| `GET /api/files`           | Liệt kê danh sách file CSV có sẵn    | Đọc thư mục `/data`       |
| `GET /api/files/<date>`    | Lấy nội dung CSV theo ngày           | Trả về JSON list          |
| `GET /api/stats`           | Thống kê tổng số dòng, ngày gần nhất | Đọc toàn bộ metadata file |
| `DELETE /api/files/<date>` | Xoá file cũ (tuỳ chọn)               | Dọn dữ liệu cũ            |

---

## 🧩 VII. Quản lý & bảo trì

| Tính năng               | Mô tả                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| **Backup**              | Tự động copy thư mục `/data` mỗi tuần lên server hoặc cloud        |
| **Giới hạn dung lượng** | Tự động xoá file cũ sau X ngày (vd 30 ngày)                        |
| **Log hoạt động**       | Ghi toàn bộ request vào `logs/system.log`                          |
| **Đồng bộ**             | Có thể thêm cronjob đẩy CSV sang hệ thống khác (Google Sheet, API) |

---

## 🔐 VIII. Bảo mật (Tùy chọn)

Nếu muốn giới hạn ai được phép gửi dữ liệu:

* Bắt buộc gửi `x-api-key` trong header request.
* Backend kiểm tra API key hợp lệ trước khi ghi.

```http
POST /api/scan
x-api-key: surfscan_123456
```

---

## 🔁 IX. Luồng hoạt động tổng quát

```
[Chrome Extension Auto Scan]
        ↓ (POST JSON)
  [Backend /api/scan]
        ↓
  [File Service]
    → Tạo hoặc mở file CSV theo ngày
    → Ghi thêm 1 dòng dữ liệu
        ↓
  [Phản hồi: {status: "success"}]
```

---

## 🧠 X. Mở rộng trong tương lai

| Module              | Chức năng mở rộng                                            |
| ------------------- | ------------------------------------------------------------ |
| **AI Parser**       | Tự động tóm tắt abstract hoặc gắn nhãn nội dung              |
| **Dashboard**       | Giao diện web quản lý dữ liệu quét                           |
| **Webhook**         | Gửi dữ liệu sang hệ thống khác (Google Sheet, Notion, Slack) |
| **Auto Validation** | Phát hiện dữ liệu trùng lặp hoặc lỗi                         |
| **Scheduler**       | Tạo báo cáo định kỳ (theo ngày / tuần)                       |

---

## 📅 XI. Kết luận

Hệ thống **SurfScan Backend** là một backend tối giản nhưng mạnh mẽ:

* Không cần cơ sở dữ liệu.
* Ghi dữ liệu trực tiếp theo ngày → dễ truy cập, dễ backup.
* Tách rõ module xử lý (scan, ghi file, log).
* Có thể mở rộng dần khi cần AI hoặc dashboard quản lý.

Mô hình này phù hợp cho:

* Tool quét dữ liệu tự động (auto-scan extension).
* Các dự án nhỏ hoặc chạy nội bộ.
* Tích hợp pipeline AI xử lý văn bản.

---

```

---

Bạn có muốn mình **xuất file thật** (`backend_surfscan.md`) để bạn tải về luôn không?  
Nếu bạn đồng ý, mình sẽ tạo file Markdown đó và gửi link tải trực tiếp.
```
