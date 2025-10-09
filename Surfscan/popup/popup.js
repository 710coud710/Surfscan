let scannedData = [];
let autoScanEnabled = false;

// DOM Elements
const phase1 = document.getElementById('phase1');
const phase2 = document.getElementById('phase2');
const startBtn = document.getElementById('startAutoScan');
const stopBtn = document.getElementById('stopAutoScan');
const dataCount = document.getElementById('dataCount');
const dataRows = document.getElementById('dataRows');
const exportAllBtn = document.getElementById('exportAllBtn');
const clearDataBtn = document.getElementById('clearDataBtn');
const dataTableContainer = document.getElementById('dataTableContainer');

// Khởi tạo khi popup mở
document.addEventListener('DOMContentLoaded', async () => {
  // Kiểm tra trạng thái auto-scan hiện tại
  const result = await chrome.storage.local.get(['autoScanEnabled', 'autoScanResults']);
  autoScanEnabled = result.autoScanEnabled || false;
  scannedData = result.autoScanResults || [];
  
  if (autoScanEnabled) {
    switchToPhase2();
    updateDataTable();
  } else {
    switchToPhase1();
  }
  
  // Load dữ liệu đã lưu
  loadSavedData();
});

// Chuyển đổi giao diện
const switchToPhase1 = () => {
  phase1.classList.remove('hidden');
  phase2.classList.add('hidden');
};

const switchToPhase2 = () => {
  phase1.classList.add('hidden');
  phase2.classList.remove('hidden');
  updateStatus("Auto-scan is running", false);
};

// Helper to update status
const updateStatus = (message, isError = false) => {
  const status = document.getElementById("status");
  if (status) {
    status.textContent = message;
    status.className = `status ${isError ? 'error' : 'success'}`;
  }
};

// Notification system
const showNotification = (title, message, url = '', type = 'success', duration = 4000) => {
  const container = document.getElementById('notificationContainer');
  if (!container) return;
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  const truncateUrl = (url) => {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + (urlObj.pathname.length > 20 ? urlObj.pathname.substring(0, 20) + '...' : urlObj.pathname);
    } catch {
      return url.length > 30 ? url.substring(0, 30) + '...' : url;
    }
  };
  
  notification.innerHTML = `
    <div class="notification-content">
      <div>
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
        ${url ? `<div class="notification-url">${truncateUrl(url)}</div>` : ''}
      </div>
    </div>
  `;
  
  container.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  // Animate out and remove
  setTimeout(() => {
    notification.classList.add('hide');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, duration);
};

// Bắt đầu Auto-Scan
startBtn.addEventListener('click', async () => {
  try {
    autoScanEnabled = true;
    
    // Lưu trạng thái
    await chrome.storage.local.set({ autoScanEnabled: true });
    
    // Gửi thông báo đến background script
    chrome.runtime.sendMessage({ 
      action: "toggle_auto_scan", 
      enabled: true 
    });
    
    // Gửi thông báo đến content script của tab hiện tại
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && isValidTab(tab)) {
      try {
        await chrome.tabs.sendMessage(tab.id, { 
          action: "toggle_auto_scan", 
          enabled: true 
        });
      } catch (error) {
        console.log("Content script not ready:", error.message);
      }
    }
    
    // Chuyển sang giao diện Phase 2
    switchToPhase2();
    
  } catch (error) {
    updateStatus("Error: " + error.message, true);
  }
});

// Dừng Auto-Scan
stopBtn.addEventListener('click', async () => {
  try {
    autoScanEnabled = false;
    
    // Lưu trạng thái
    await chrome.storage.local.set({ autoScanEnabled: false });
    
    // Gửi thông báo đến background script
    chrome.runtime.sendMessage({ 
      action: "toggle_auto_scan", 
      enabled: false 
    });
    
    // Gửi thông báo đến tất cả tabs
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (isValidTab(tab)) {
        try {
          await chrome.tabs.sendMessage(tab.id, { 
            action: "toggle_auto_scan", 
            enabled: false 
          });
        } catch (error) {
          // Ignore errors for tabs without content script
        }
      }
    }
    
    // Switch back to Phase 1
    switchToPhase1();
    updateStatus("Auto-scan stopped", false);
    
  } catch (error) {
    updateStatus("Error: " + error.message, true);
  }
});

// Kiểm tra tab hợp lệ
const isValidTab = (tab) => {
  return tab.url && (
    tab.url.startsWith('http://') || 
    tab.url.startsWith('https://') || 
    tab.url.startsWith('file://')
  );
};

// Load dữ liệu đã lưu
const loadSavedData = async () => {
  const result = await chrome.storage.local.get(['autoScanResults']);
  if (result.autoScanResults) {
    scannedData = result.autoScanResults;
    updateDataTable();
  }
};

// Update data table
const updateDataTable = () => {
  dataCount.textContent = `${scannedData.length} items`;
  
  // Xóa dữ liệu cũ
  dataRows.innerHTML = '';
  
  // Thêm dữ liệu mới (hiển thị 50 mục gần nhất)
  const recentData = scannedData.slice(-50).reverse();
  
  recentData.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'table-row';
    
    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN');
      } catch {
        return dateStr.substring(0, 10);
      }
    };
    
    const truncateText = (text, maxLength = 30) => {
      if (!text) return '-';
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };
    
    row.innerHTML = `
      <div class="col-title" title="${item.title || ''}">${truncateText(item.title)}</div>
      <div class="col-author" title="${item.author || ''}">${truncateText(item.author, 20)}</div>
      <div class="col-publisher" title="${item.publisher || ''}">${truncateText(item.publisher, 20)}</div>
      <div class="col-date" title="${item.date || ''}">${formatDate(item.date)}</div>
    `;
    
    dataRows.appendChild(row);
  });
  
  // Scroll to top
  const tableContent = document.getElementById('tableContent');
  if (tableContent) {
    tableContent.scrollTop = 0;
  }
};

// Xuất dữ liệu
exportAllBtn.addEventListener('click', async () => {
  if (scannedData.length === 0) {
    updateStatus("No data to export", true);
    return;
  }
  
  try {
    updateStatus("Exporting data...", false);
    
    // Gửi dữ liệu đến backend để xuất
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "send_to_backend", data: { exportAll: true, data: scannedData } },
        resolve
      );
    });
    
    if (response && response.success) {
      updateStatus("Data exported successfully!", false);
      
      // Mở link download nếu có
      if (response.result && response.result.downloadUrl) {
        chrome.tabs.create({ url: response.result.downloadUrl });
      }
    } else {
      throw new Error(response ? response.error : "No response from server");
    }
  } catch (error) {
    updateStatus("Export failed: " + error.message, true);
  }
});

// Clear all data
clearDataBtn.addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all scanned data?')) {
    scannedData = [];
    await chrome.storage.local.set({ autoScanResults: [] });
    updateDataTable();
    updateStatus("All data cleared", false);
  }
});

// Listen for new data from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "new_scan_data") {
    scannedData.push(message.data);
    updateDataTable();
    
    // Show sliding notification
    const title = message.data.title || 'New Page Scanned';
    const truncatedTitle = title.length > 50 ? title.substring(0, 50) + '...' : title;
    showNotification(
      'Data Collected',
      truncatedTitle,
      message.data.url,
      'success',
      3000
    );
    
    // Update status briefly
    updateStatus(`Scanned: ${truncatedTitle}`, false);
    setTimeout(() => {
      if (autoScanEnabled) {
        updateStatus("Auto-scan is running", false);
      }
    }, 2000);
  }
});

// ===== DRAG AND DROP FUNCTIONALITY =====
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

// Chỉ cho phép kéo khi đang ở Phase 2
const initializeDragAndDrop = () => {
  const dragHandle = document.querySelector('.drag-handle');
  
  if (dragHandle) {
    dragHandle.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
  }
};

const dragStart = (e) => {
  if (!phase2.classList.contains('hidden')) {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    
    if (e.target === document.querySelector('.drag-handle')) {
      isDragging = true;
      dataTableContainer.style.position = 'fixed';
      dataTableContainer.style.zIndex = '9999';
      dataTableContainer.style.cursor = 'grabbing';
    }
  }
};

const drag = (e) => {
  if (isDragging) {
    e.preventDefault();
    
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;
    
    xOffset = currentX;
    yOffset = currentY;
    
    // Giới hạn trong viewport
    const rect = dataTableContainer.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;
    
    xOffset = Math.max(0, Math.min(xOffset, maxX));
    yOffset = Math.max(0, Math.min(yOffset, maxY));
    
    dataTableContainer.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
  }
};

const dragEnd = () => {
  if (isDragging) {
    isDragging = false;
    dataTableContainer.style.cursor = 'move';
  }
};

// Khởi tạo drag and drop sau khi DOM load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initializeDragAndDrop, 100);
});

// Theo dõi thay đổi dữ liệu từ storage
setInterval(async () => {
  if (autoScanEnabled) {
    const result = await chrome.storage.local.get(['autoScanResults']);
    if (result.autoScanResults && result.autoScanResults.length !== scannedData.length) {
      scannedData = result.autoScanResults;
      updateDataTable();
    }
  }
}, 2000);