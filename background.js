chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    if (msg.action === "send_to_backend") {
      try {
        const res = await fetch("http://localhost:8000/api/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(msg.data)
        });
        const result = await res.json();
        sendResponse({ success: true, result });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    }
    return true; // giữ connection async
  });
  