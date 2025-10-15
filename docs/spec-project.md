# 🧭 Web Data Scanner Extension

## 1. Giới thiệu

**Web Data Scanner** là một Chrome Extension cho phép người dùng **tự động quét thông tin từ các trang web học thuật, báo chí, hoặc bài viết** và trích xuất các trường dữ liệu sau:

- **Title** (Tiêu đề bài viết)
- **Author** (Tác giả)
- **Publisher** (Nhà xuất bản / nguồn)
- **Date Published** (Ngày đăng tải)
- **Abstract / Summary** (Tóm tắt nội dung)

Sau khi quét, dữ liệu sẽ được gửi đến backend để **lọc – phân tích – xuất file CSV/XLSX**.

---

## 2. Kiến trúc hệ thống

[Chrome Extension]
    ├─ Content Script -> quét DOM / scan dữ liệu
    ├─ Background Script -> điều phối, gửi request API
    └─ Popup UI -> cấu hình keyword, trigger scan

         |
         v  (HTTP request JSON)
[Backend API] (Python / Node / FastAPI / Express)
    ├─ API Endpoint nhận data JSON
    ├─ Data Processing:
    │    ├─ Filter theo keyword / regex
    │    ├─ Phân tích dữ liệu (tính tổng, thống kê, trích xuất trường)
    │    └─ Format data chuẩn để export
    └─ Response:s
         ├─ JSON summary
         └─ CSV/XLSX file (trả về link download hoặc Base64)

         |
         v
[User Download / Client]
    └─ CSV/XLSX file

---
**Layout Project**
---SurScan: extension
    │
    ├─ manifest.json
    ├─ background.js
    ├─ content.js
    ├─ popup/
    │   ├─ popup.html
    │   ├─ popup.js
    │   └─ popup.css
    └─ assets/
        └─ icon.png
--backend: Backend api

## 3. Quy trình hoạt động

### 3.1 Khi extension được bật:
1. **Popup UI** bật extension và cho phép người dùng quét dữ liệu trên trang hiện tại.  
2. **Background Script** gửi tín hiệu `"scan_page"` đến **Content Script**.  
3. **Content Script** chạy trong context của website:
   - Truy cập DOM.
   - Dò tìm các phần tử HTML phù hợp với **regex hoặc selector xác định trước**.
   - Thu thập dữ liệu thô.
   - Chuẩn hóa dữ liệu và trả về JSON.

4. **Background Script** gửi JSON này tới **Backend API**.
5. **Backend** lọc dữ liệu, lưu, và sinh file `.csv` hoặc `.xlsx`.

---

## 4. Chi tiết kỹ thuật từng phần

### 4.1 Content Script – Quét dữ liệu DOM

Mục tiêu: đọc cấu trúc trang, trích xuất các trường chính (title, author, publisher, date, abstract).

#### Ví dụ logic quét:

| Trường | Cách lấy | Regex / Selector gợi ý |
|--------|-----------|-------------------------|
| **Title** | Thường nằm trong `<title>` hoặc `<h1>` | `document.querySelector('h1, title')` |
| **Author** | Có thể nằm trong thẻ `<meta name="author">` hoặc `<span class="author">` | `meta\[name="author"\]`, hoặc `document.querySelectorAll('[class*="author"]')` |
| **Publisher** | Từ `<meta property="og:site_name">` hoặc footer | `meta\[property="og:site_name"\]` hoặc `[class*="publisher"]` |
| **Date Published** | Dạng `YYYY-MM-DD`, `DD/MM/YYYY`, `Month DD, YYYY` | Regex: `/(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|[A-Z][a-z]+ \d{1,2}, \d{4})/` |
| **Abstract** | `<meta name="description">`, `<p class="abstract">` | `meta\[name="description"\]`, hoặc `[class*="abstract"]` |

#### Ví dụ trích xuất:
```javascript
const extractData = () => {
  const getMeta = name => document.querySelector(`meta[name="${name}"]`)?.content || '';

  const data = {
    title: document.querySelector("h1, title")?.innerText.trim() || "",
    author: getMeta("author") || document.querySelector("[class*='author']")?.innerText || "",
    publisher: document.querySelector("meta[property='og:site_name']")?.content || "",
    date: (document.body.innerText.match(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|[A-Z][a-z]+ \d{1,2}, \d{4}/) || [])[0] || "",
    abstract: getMeta("description") || document.querySelector("[class*='abstract']")?.innerText || "",
    url: window.location.href0.
  };
  return data;
};

===========================================================
Scan & filter DOM → Vanilla JS / jQuery / Lodash / Fuse.js
regex: XRegExp/Fuse.js
Import CSV/XLSX → PapaParse / SheetJS
Export CSV/XLSX → SheetJS / FileSaver.js / Pandas (backend)
UI → Tailwind / Bootstrap /Charka UI
Backend → Python FastAPI + Pandas hoặc Node.js + ExcelJS
===========================================================




