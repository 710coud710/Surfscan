Rất hay — để triển khai tính năng **Auto-Scan** cho extension “Surf-can”, bạn cần hiểu rõ **logic hoạt động tổng thể**, tức là cách các 
## 🧠 1. Mục tiêu của Auto-Scan

> Khi người dùng bật chế độ **Auto-Scan**, extension sẽ **tự động quét dữ liệu của trang web mỗi khi người dùng mở hoặc chuyển sang một đường link mới**, mà **không cần bấm nút “Scan” thủ công**.

Tính năng này nên **hoạt động ổn định, tiết kiệm tài nguyên**, và **chỉ chạy khi bật**.

---

## 🧩 2. Các thành phần tham gia

| Thành phần                         | Vai trò                                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| **Popup**                          | Nơi người dùng bật/tắt auto-scan (toggle switch)                                          |
| **Content Script**                 | Chạy trong từng tab, thực hiện quét dữ liệu DOM khi cần                                   |
| **Background Service Worker**      | Giữ trạng thái toàn hệ thống, nhận dữ liệu scan và có thể gửi về server hoặc hiển thị log |
| **Storage (chrome.storage.local)** | Lưu trạng thái “autoScan = true/false” để dùng lại khi mở lại trình duyệt                 |

---

## ⚙️ 3. Luồng hoạt động logic chi tiết

### 🧩 Giai đoạn 1: Người dùng bật “Auto-Scan” trong popup

1. Khi mở popup, extension hiển thị một **nút bật/tắt** (toggle).
2. Khi người dùng **bật**:

   * Extension **ghi lại trạng thái** vào `chrome.storage.local`:

     ```
     autoScan = true
     ```
   * Background script (hoặc tất cả content scripts đang chạy) được **thông báo rằng chế độ auto-scan đã bật**.
3. Khi tắt, extension ghi lại:

   ```
   autoScan = false
   ```

   và dừng tất cả hành vi tự động.

→ Cơ chế lưu này giúp **giữ nguyên trạng thái** kể cả khi người dùng đóng trình duyệt hoặc reload tab.

---

### 🧩 Giai đoạn 2: Theo dõi sự kiện “trang load hoặc đổi link”

Khi `autoScan = true`, **content script trong mỗi tab** sẽ:

1. Lắng nghe sự kiện thay đổi trang:

   * Khi `window.onload` (load mới hoàn toàn),
   * Khi URL thay đổi do người dùng bấm link nội bộ (SPA navigation, `pushState`, `hashchange`),
   * Hoặc có thể kiểm tra URL thay đổi định kỳ (polling nhẹ mỗi 1–2 giây).
2. Khi phát hiện trang mới hoặc URL mới → **kích hoạt quy trình scan**.

---

### 🧩 Giai đoạn 3: Quét dữ liệu (scan)

Khi được kích hoạt:

1. Content script gọi hàm `extractData()` (đoạn bạn đã viết).
2. Hàm này trích:

   * `title`, `author`, `publisher`, `date`, `abstract`, `url`
3. Kết quả được đóng gói thành đối tượng JSON.

---

### 🧩 Giai đoạn 4: Gửi dữ liệu scan đi

Sau khi quét xong:

1. Content script gửi dữ liệu về **background script** qua `chrome.runtime.sendMessage`.
2. Background nhận được, thực hiện:

   * **Lưu log**, hoặc
   * **Gửi dữ liệu về server backend (API)** qua `fetch`, hoặc
   * **Hiển thị thông báo** cho người dùng (tùy bạn thiết kế).

Ví dụ luồng:

```
Content Script → (sendMessage) → Background → (POST) → Backend API
```

---

### 🧩 Giai đoạn 5: Lặp lại khi trang thay đổi

Content script tiếp tục theo dõi:

* Nếu người dùng click vào một bài mới, hoặc search trên cùng domain (SPA),
* Hoặc load một link khác,
  → thì **quét lại tự động**, vì `autoScan = true`.

Nếu người dùng tắt Auto-Scan trong popup, content script sẽ:

* Dừng theo dõi sự kiện (bỏ interval, removeEventListener),
* Không gửi scan mới nữa.

---

## 🔄 4. Tóm tắt chuỗi logic Auto-Scan

| Bước | Thành phần     | Hành động                     | Mục đích                           |
| ---- | -------------- | ----------------------------- | ---------------------------------- |
| 1    | Popup          | Người dùng bật “Auto-Scan”    | Ghi trạng thái autoScan=true       |
| 2    | Content Script | Theo dõi URL và sự kiện trang | Xác định khi nào cần scan          |
| 3    | Content Script | Gọi `extractData()`           | Quét dữ liệu trang hiện tại        |
| 4    | Background     | Nhận dữ liệu                  | Gửi về backend hoặc log            |
| 5    | Content Script | Lặp lại khi URL thay đổi      | Duy trì auto-scan cho tab hiện tại |
| 6    | Popup          | Tắt Auto-Scan                 | Dừng mọi auto trigger              |

---

## 🧠 5. Lưu ý thiết kế

* Không dùng `setInterval quá ngắn` (1 giây là hợp lý).
* Nên tránh chạy scan khi trang chưa load hoàn toàn (`DOMContentLoaded`).
* Cần debounce (trì hoãn 500ms sau khi phát hiện URL mới) để tránh quét trùng khi trang load liên tục.
* Không gửi dữ liệu trùng lặp: có thể so sánh `lastUrl` và `lastTitle` trước khi gửi.
* Nếu extension quét nhiều tab cùng lúc → mỗi tab giữ biến `lastUrl` riêng.

---

## 💬 Tóm lại (1 dòng)

> **Auto-Scan logic** = Theo dõi trạng thái bật/tắt + lắng nghe sự kiện thay đổi URL → quét DOM tự động → gửi dữ liệu về background/backend → lặp lại đến khi người dùng tắt.

---

Nếu bạn muốn, mình có thể **viết cho bạn sơ đồ hoạt động dạng flowchart** (Auto-Scan Mode Workflow) — rất phù hợp cho tài liệu kỹ thuật hoặc README của Surf-can.
Bạn có muốn mình vẽ sơ đồ đó không?
