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

// Helper function to normalize data (replace empty fields with 'null' string)
const normalizeData = (data) => {
  console.log('🔄 Normalizing data:', data);
  const fields = ['title', 'author', 'publisher', 'date', 'abstract', 'url'];
  const normalizedData = {};
  
  fields.forEach(field => {
    const value = data[field];
    // Convert empty strings, undefined, or whitespace-only strings to 'null' string
    normalizedData[field] = (value && value.trim()) ? value.trim() : 'null';
  });
  
  console.log('✅ Normalized data:', normalizedData);
  return normalizedData;
};

// Message handler
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Xử lý toggle auto-scan
  if (msg.action === "toggle_auto_scan") {
    autoScanEnabled = msg.enabled;
    console.log(`🔧 Auto-scan ${autoScanEnabled ? 'enabled' : 'disabled'}`);
    
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
      // Check if we're in phase 2 (auto-scan mode)
      chrome.storage.local.get(['currentPhase']).then(result => {
        const currentPhase = result.currentPhase || 'phase1';
        if (currentPhase === 'phase2') {
          console.log("📥 Received auto-scan data from:", sender.tab?.url);
          processAutoScanData(msg.data, sender.tab);
        } else {
          console.log("Auto-scan data ignored - not in phase 2, current phase:", currentPhase);
        }
      });
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
        // Normalize data before sending
        const normalizedData = normalizeData(msg.data);
        
        // Send to backend
        const response = await fetch(`${API_ENDPOINT}/scan`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Extension-Version": chrome.runtime.getManifest().version
          },
          body: JSON.stringify({
            data: normalizedData,
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
          console.log(`❌ Cannot inject into tab ${tab.id}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error injecting content script:', error);
  }
};

// Hàm gửi dữ liệu về backend
const sendToBackend = async (data) => {
  try {
    // Normalize data before sending
    const normalizedData = normalizeData(data);
    
    const response = await fetch(`${API_ENDPOINT}/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Extension-Version": chrome.runtime.getManifest().version
      },
      body: JSON.stringify(normalizedData)
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Data sent to backend successfully:', result);
    return { success: true, result };
    
  } catch (error) {
    console.error('❌ Error sending data to backend:', error);
    return { success: false, error: error.message };
  }
};

// Hàm xử lý dữ liệu auto-scan
const processAutoScanData = async (data, tab) => {
  try {
    // Log dữ liệu
    console.log('Processing auto-scan data:', {
      url: tab?.url,
      title: data.title,
      timestamp: new Date().toISOString()
    });
    
    // Tự động gửi về backend
    const backendResult = await sendToBackend(data);
    
    // Lưu vào storage (bao gồm cả trạng thái gửi backend)
    const existingData = await chrome.storage.local.get(['autoScanResults']) || { autoScanResults: [] };
    const results = existingData.autoScanResults || [];
    
    const dataWithMetadata = {
      ...data,
      timestamp: new Date().toISOString(),
      tabUrl: tab?.url,
      backendStatus: backendResult.success ? 'sent' : 'failed',
      backendError: backendResult.error || null
    };
    
    results.push(dataWithMetadata);
    
    // Giới hạn số lượng kết quả (giữ 100 kết quả gần nhất)
    if (results.length > 100) {
      results.splice(0, results.length - 100);
    }
    
    await chrome.storage.local.set({ autoScanResults: results });
    
    // Gửi thông báo đến popup nếu đang mở
    try {
      chrome.runtime.sendMessage({
        action: "new_scan_data",
        data: dataWithMetadata,
        backendResult: backendResult
      });
    } catch (error) {
      // Popup có thể không mở, bỏ qua lỗi
      console.log('Popup not available for notification');
    }
    
  } catch (error) {
    console.error('Error processing auto-scan data:', error);
  }
};
  