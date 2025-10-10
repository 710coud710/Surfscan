
// Helper function to get meta content
const getMeta = (name) => {
  const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
  return el ? el.content : '';
};

// Helper function to extract date using regex
const extractDate = (text) => {
  const dateRegex = /(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|[A-Z][a-z]+ \d{1,2}, \d{4})/;
  const match = text.match(dateRegex);
  return match ? match[0] : '';
};

// Main extraction function
const extractData = () => {
  return {
    title: document.querySelector("h1")?.innerText.trim() || 
           document.querySelector("title")?.innerText.trim() || 
           getMeta("og:title") || "",
           
    author: getMeta("author") || 
            document.querySelector("[class*='author']")?.innerText.trim() ||
            document.querySelector("[rel='author']")?.innerText.trim() || "",
            
    publisher: getMeta("og:site_name") || 
               document.querySelector("[class*='publisher']")?.innerText.trim() ||
               document.domain || "",
               
    date: getMeta("article:published_time") ||
          getMeta("datePublished") ||
          getMeta("date") ||
          getMeta("displayPublicationDate") ||
          extractDate(document.body.innerText) || "",
          
    abstract: getMeta("description") ||
              getMeta("og:description") ||
              document.querySelector("[class*='abstract']")?.innerText.trim() ||
              document.querySelector("[class*='summary']")?.innerText.trim() || "",
              
    url: window.location.href
  };
};

// Biến theo dõi trạng thái auto-scan
let autoScanEnabled = false;
let currentUrl = window.location.href;
let scanTimeout = null;

// Hàm gửi dữ liệu auto-scan
const sendAutoScanData = () => {
  if (!autoScanEnabled) return;
  
  const data = extractData();
  // Always send data, even if some fields are empty (they will be normalized to null)
  console.log('📤 Sending auto-scan data:', {
    title: data.title || "'null'",
    url: data.url || window.location.href,
    timestamp: new Date().toISOString()
  });
  
  chrome.runtime.sendMessage({
    action: "auto_scan_data",
    data: data
  });
};

// Theo dõi thay đổi URL
const observeUrlChange = () => {
  const observer = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      console.log('🔄 URL changed:', currentUrl);
      
      if (autoScanEnabled) {
        // Đợi 0.5 giây để trang load xong rồi mới scan
        clearTimeout(scanTimeout);
        scanTimeout = setTimeout(() => {
          sendAutoScanData();
        }, 500);
      }
    }
  });
  
  observer.observe(document, { 
    childList: true, 
    subtree: true 
  });
  
  return observer;
};

// Khởi tạo observer
let urlObserver = observeUrlChange();

// Listen for messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "scan_page") {
    const data = extractData();
    sendResponse({ data });
  }
  
  if (msg.action === "toggle_auto_scan") {
    autoScanEnabled = msg.enabled;
    console.log(`🔧 Auto-scan ${autoScanEnabled ? 'enabled' : 'disabled'} on page:`, window.location.href);
    
    if (autoScanEnabled) {
      // Scan ngay lập tức khi bật
      setTimeout(() => {
        sendAutoScanData();
      }, 500);
    } else {
      // Hủy timeout khi tắt
      clearTimeout(scanTimeout);
    }
    
    sendResponse({ success: true });
  }
});

// Scan tự động khi trang load xong (nếu auto-scan đã bật)
window.addEventListener('load', () => {
  // Kiểm tra trạng thái auto-scan từ storage
  chrome.runtime.sendMessage({ action: "get_auto_scan_state" }, (response) => {
    if (response && response.enabled) {
      autoScanEnabled = true;
      setTimeout(() => {
        sendAutoScanData();
      }, 1000);
    }
  });
});
  