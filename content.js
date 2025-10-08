
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "scan_page") {
      // Ví dụ: lấy toàn bộ text và link
      const data = Array.from(document.querySelectorAll("a")).map(a => ({
        text: a.innerText.trim(),
        href: a.href
      }));
  
      sendResponse({ data });
    }
  });
  