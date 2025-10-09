// Configuration
const API_ENDPOINT = "http://localhost:8000/api";

// Biến lưu trạng thái auto-scan
let autoScanEnabled = false;

// Khởi tạo khi extension start
chrome.runtime.onStartup.addListener(async () => {
  const result = await chrome.storage.local.get(['autoScanEnabled']);
  autoScanEnabled = result.autoScanEnabled || false;
});

chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.local.get(['autoScanEnabled']);
  autoScanEnabled = result.autoScanEnabled || false;
});

// Helper function to validate data
const validateData = (data) => {
  const requiredFields = ['title', 'author', 'publisher', 'date', 'abstract', 'url'];
  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
  
  return true;
};

// Message handler
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Xử lý toggle auto-scan
  if (msg.action === "toggle_auto_scan") {
    autoScanEnabled = msg.enabled;
    console.log(`Auto-scan ${autoScanEnabled ? 'bật' : 'tắt'}`);
    
    // Inject content script vào tất cả tabs nếu bật auto-scan
    if (autoScanEnabled) {
      injectContentScriptToAllTabs();
    }
    
    sendResponse({ success: true });
    return true;
  }
  
  // Xử lý auto-scan data
  if (msg.action === "auto_scan_data") {
    if (autoScanEnabled) {
      console.log("Nhận dữ liệu auto-scan từ:", sender.tab?.url);
      // Xử lý dữ liệu tự động (có thể gửi về backend hoặc lưu)
      processAutoScanData(msg.data, sender.tab);
    }
    sendResponse({ success: true });
    return true;
  }
  
  // Lấy trạng thái auto-scan
  if (msg.action === "get_auto_scan_state") {
    sendResponse({ enabled: autoScanEnabled });
    return true;
  }
  
  if (msg.action === "send_to_backend") {
    // Process data asynchronously
    (async () => {
      try {
        // Validate data
        validateData(msg.data);
        
        // Send to backend
        const response = await fetch(`${API_ENDPOINT}/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Extension-Version": chrome.runtime.getManifest().version
          },
          body: JSON.stringify({
            data: msg.data,
            timestamp: new Date().toISOString(),
            source: sender.tab?.url || 'unknown'
          })
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
        
        const result = await response.json();
        
        sendResponse({
          success: true,
          result: {
            ...result,
            downloadUrl: `${API_ENDPOINT}/download/${result.fileId}`
          }
        });
      } catch (error) {
        console.error('Error processing data:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      }
    })();
    
    return true; // Keep the message channel open for async response
  }
});

// Hàm inject content script vào tất cả tabs
const injectContentScriptToAllTabs = async () => {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          
          // Gửi thông báo bật auto-scan
          await chrome.tabs.sendMessage(tab.id, { 
            action: "toggle_auto_scan", 
            enabled: true 
          });
        } catch (error) {
          console.log(`Không thể inject vào tab ${tab.id}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('Lỗi khi inject content script:', error);
  }
};

// Hàm xử lý dữ liệu auto-scan
const processAutoScanData = async (data, tab) => {
  try {
    // Log dữ liệu
    console.log('Dữ liệu auto-scan:', {
      url: tab?.url,
      title: data.title,
      timestamp: new Date().toISOString()
    });
    
    // Có thể gửi về backend tự động
    // await sendToBackend(data);
    
    // Hoặc lưu vào storage để xử lý sau
    const existingData = await chrome.storage.local.get(['autoScanResults']) || { autoScanResults: [] };
    const results = existingData.autoScanResults || [];
    
    results.push({
      ...data,
      timestamp: new Date().toISOString(),
      tabUrl: tab?.url
    });
    
    // Giới hạn số lượng kết quả (giữ 100 kết quả gần nhất)
    if (results.length > 100) {
      results.splice(0, results.length - 100);
    }
    
    await chrome.storage.local.set({ autoScanResults: results });
    
    // Gửi thông báo đến popup nếu đang mở
    try {
      chrome.runtime.sendMessage({
        action: "new_scan_data",
        data: data
      });
    } catch (error) {
      // Popup có thể không mở, bỏ qua lỗi
    }
    
  } catch (error) {
    console.error('Lỗi xử lý auto-scan data:', error);
  }
};
  