document.getElementById("scanBtn").addEventListener("click", async () => {
    const keyword = document.getElementById("keyword").value;
  
    // Bước 1: scan trang
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await chrome.tabs.sendMessage(tab.id, { action: "scan_page" });
  
    // Bước 2: gửi về backend
    chrome.runtime.sendMessage(
      { action: "send_to_backend", data: { keyword, pageData: result.data } },
      (response) => {
        const output = document.getElementById("output");
        if (response.success) {
          output.textContent = JSON.stringify(response.result, null, 2);
        } else {
          output.textContent = "❌ Error: " + response.error;
        }
      }
    );
  });
  