# 🔄 Extension Reload Instructions

## Lỗi hiện tại:
```
background.js:98 Error processing data: Error: Missing required fields: date
    at validateData (background.js:24:11)
```

## Nguyên nhân:
Extension đang sử dụng code cũ (có hàm `validateData`) thay vì code mới (có hàm `normalizeData`).

## Cách khắc phục:

### 1. Reload Extension trong Chrome:
1. Mở `chrome://extensions/`
2. Tìm extension "Web Data Scanner"
3. Click nút **"Reload"** (🔄)
4. Hoặc tắt extension rồi bật lại

### 2. Clear Cache:
1. Mở DevTools (F12)
2. Right-click vào nút reload
3. Chọn "Empty Cache and Hard Reload"

### 3. Kiểm tra Version:
- Extension version hiện tại: **1.1**
- Nếu vẫn hiển thị 1.0 → chưa reload thành công

### 4. Test lại:
- Thử manual scan hoặc auto-scan
- Kiểm tra console logs:
  - Phải thấy: `🔄 Normalizing data:`
  - Phải thấy: `✅ Normalized data:`
  - KHÔNG được thấy: `validateData`

## Nếu vẫn lỗi:
1. Uninstall extension hoàn toàn
2. Restart Chrome
3. Install lại extension từ folder `Surfscan/`
