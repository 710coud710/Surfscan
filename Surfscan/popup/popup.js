let scannedData = [];
let autoScanEnabled = false;

// DOM Elements
const phase1 = document.getElementById('phase1');
const phase2 = document.getElementById('phase2');
const phase3 = document.getElementById('phase3');
const startBtn = document.getElementById('startAutoScan');
const stopBtn = document.getElementById('stopAutoScan');
const manualScanBtn = document.getElementById('manualScanBtn');
const backToPhase1Btn = document.getElementById('backToPhase1');
const scanCurrentPageBtn = document.getElementById('scanCurrentPage');
const saveDataBtn = document.getElementById('saveDataBtn');
const clearPreviewBtn = document.getElementById('clearPreviewBtn');
const scanStatus = document.getElementById('scanStatus');
const previewContent = document.getElementById('previewContent');
const dataCount = document.getElementById('dataCount');
const dataRows = document.getElementById('dataRows');
const exportAllBtn = document.getElementById('exportAllBtn');
const clearDataBtn = document.getElementById('clearDataBtn');
const dataTableContainer = document.getElementById('dataTableContainer');

// Manual scan data
let currentScannedData = null;

// Khởi tạo khi popup mở
document.addEventListener('DOMContentLoaded', async () => {
  // Kiểm tra trạng thái auto-scan và manual scan hiện tại
  const result = await chrome.storage.local.get(['autoScanEnabled', 'autoScanResults', 'currentPhase']);
  autoScanEnabled = result.autoScanEnabled || false;
  scannedData = result.autoScanResults || [];
  const currentPhase = result.currentPhase || 'phase1';
  
  if (autoScanEnabled) {
    switchToPhase2();
    updateDataTable();
  } else if (currentPhase === 'phase3') {
    // Stay in manual scan mode if it was the last active phase
    switchToPhase3();
  } else {
    switchToPhase1();
  }
  
  // Load dữ liệu đã lưu
  loadSavedData();
});

// Chuyển đổi giao diện
const switchToPhase1 = async () => {
  phase1.classList.remove('hidden');
  phase2.classList.add('hidden');
  phase3.classList.add('hidden');
  await chrome.storage.local.set({ currentPhase: 'phase1' });
};

const switchToPhase2 = async () => {
  phase1.classList.add('hidden');
  phase2.classList.remove('hidden');
  phase3.classList.add('hidden');
  updateStatus("Auto-scan is running", false);
  await chrome.storage.local.set({ currentPhase: 'phase2' });
};

const switchToPhase3 = async () => {
  phase1.classList.add('hidden');
  phase2.classList.add('hidden');
  phase3.classList.remove('hidden');
  clearPreview();
  await chrome.storage.local.set({ currentPhase: 'phase3' });
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

// Manual Scan Button
manualScanBtn.addEventListener('click', () => {
  switchToPhase3();
});

// Back to Phase 1 Button
backToPhase1Btn.addEventListener('click', () => {
  switchToPhase1();
});

// Scan Current Page Button
scanCurrentPageBtn.addEventListener('click', async () => {
  try {
    scanCurrentPageBtn.disabled = true;
    updateScanStatus("Scanning current page...", false);
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !isValidTab(tab)) {
      throw new Error("Cannot scan this page. Please navigate to a valid website.");
    }
    
    // Inject content script if needed
    await injectContentScript(tab);
    
    // Send scan message
    const response = await chrome.tabs.sendMessage(tab.id, { action: "scan_page" });
    
    if (response && response.data) {
      currentScannedData = response.data;
      displayScannedData(currentScannedData);
      saveDataBtn.disabled = false;
      updateScanStatus("Scan completed successfully!", false);
    } else {
      // Even if no response, create empty data structure
      currentScannedData = {
        title: 'null',
        author: 'null',
        publisher: 'null',
        date: 'null',
        abstract: 'null',
        url: tab.url
      };
      displayScannedData(currentScannedData);
      saveDataBtn.disabled = false;
      updateScanStatus("Scan completed - some fields may be empty", false);
    }
    
  } catch (error) {
    updateScanStatus("Scan failed: " + error.message, true);
    // Still allow saving with minimal data
    currentScannedData = {
      title: 'null',
      author: 'null',
      publisher: 'null',
      date: 'null',
      abstract: 'null',
      url: tab?.url || window.location.href
    };
    displayScannedData(currentScannedData);
    saveDataBtn.disabled = false;
  } finally {
    scanCurrentPageBtn.disabled = false;
  }
});

// Save Data Button
saveDataBtn.addEventListener('click', async () => {
  if (!currentScannedData) {
    updateScanStatus("No data to save", true);
    return;
  }
  
  try {
    saveDataBtn.disabled = true;
    updateScanStatus("Saving data to backend...", false);
    
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "send_to_backend", data: currentScannedData },
        resolve
      );
    });
    
    if (response && response.success) {
      updateScanStatus("Data saved successfully!", false);
      showNotification(
        'Data Saved',
        'Manual scan data sent to backend',
        currentScannedData.url,
        'success',
        3000
      );
      
      // Add to auto-scan results for consistency
      const existingData = await chrome.storage.local.get(['autoScanResults']) || { autoScanResults: [] };
      const results = existingData.autoScanResults || [];
      results.push({
        ...currentScannedData,
        timestamp: new Date().toISOString(),
        backendStatus: 'sent',
        source: 'manual'
      });
      await chrome.storage.local.set({ autoScanResults: results });
      
    } else {
      throw new Error(response ? response.error : "No response from server");
    }
  } catch (error) {
    updateScanStatus("Save failed: " + error.message, true);
    showNotification(
      'Save Error',
      error.message,
      '',
      'error',
      4000
    );
  } finally {
    saveDataBtn.disabled = false;
  }
});

// Clear Preview Button
clearPreviewBtn.addEventListener('click', () => {
  clearPreview();
  updateScanStatus("Preview cleared", false);
});

// Kiểm tra tab hợp lệ
const isValidTab = (tab) => {
  return tab.url && (
    tab.url.startsWith('http://') || 
    tab.url.startsWith('https://') || 
    tab.url.startsWith('file://')
  );
};

// Helper functions for manual scan
const updateScanStatus = (message, isError = false) => {
  if (scanStatus) {
    scanStatus.textContent = message;
    scanStatus.className = `scan-status ${isError ? 'error' : 'success'}`;
  }
};

const clearPreview = () => {
  currentScannedData = null;
  saveDataBtn.disabled = true;
  previewContent.innerHTML = '<div class="no-data">No data scanned yet. Click "SCAN CURRENT PAGE" to start.</div>';
  updateScanStatus("", false);
};

const displayScannedData = (data) => {
  if (!data) {
    clearPreview();
    return;
  }
  
  const fields = [
    { key: 'title', label: 'Title' },
    { key: 'author', label: 'Author' },
    { key: 'publisher', label: 'Publisher' },
    { key: 'date', label: 'Date' },
    { key: 'abstract', label: 'Abstract' },
    { key: 'url', label: 'URL' }
  ];
  
  // Clear previous content
  previewContent.innerHTML = '';
  
  fields.forEach(field => {
    const value = data[field.key];
    const isEmpty = !value || !value.toString().trim() || value === 'null';
    const displayValue = isEmpty ? 'null' : value;
        const isLongText = !isEmpty && displayValue.length > 150;
        const truncatedValue = isLongText ? displayValue.substring(0, 150) + '...' : displayValue;
    
    // Create field container
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'data-field';
    fieldDiv.id = `field-${field.key}`;
    
    // Create label
    const labelDiv = document.createElement('div');
    labelDiv.className = 'data-field-label';
    labelDiv.textContent = field.label;
    
    // Create value container
    const valueDiv = document.createElement('div');
    valueDiv.className = `data-field-value ${isEmpty ? 'empty' : ''} ${isLongText ? 'truncated' : ''}`;
    valueDiv.id = `value-${field.key}`;
    
    // Create truncated text span
    const truncatedSpan = document.createElement('span');
    truncatedSpan.className = 'truncated-text';
    truncatedSpan.innerHTML = isLongText ? truncatedValue.replace(/\n/g, '<br>') : displayValue.replace(/\n/g, '<br>');

    // Create full text span
    const fullSpan = document.createElement('span');
    fullSpan.className = 'full-text hidden';
    fullSpan.innerHTML = displayValue.replace(/\n/g, '<br>');
    
    // Add spans to value div
    valueDiv.appendChild(truncatedSpan);
    valueDiv.appendChild(fullSpan);
    
    // Add label and value to field
    fieldDiv.appendChild(labelDiv);
    fieldDiv.appendChild(valueDiv);
    
    // Add More button if needed
    if (isLongText) {
      const moreBtn = document.createElement('button');
      moreBtn.className = 'more-btn';
      moreBtn.id = `btn-${field.key}`;
      moreBtn.textContent = 'More';
      moreBtn.onclick = () => toggleDataView(field.key);
      fieldDiv.appendChild(moreBtn);
    }
    
    // Add field to container
    previewContent.appendChild(fieldDiv);
  });
};

const injectContentScript = async (tab) => {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  } catch (error) {
    // Content script might already be injected, ignore error
    console.log('Content script injection:', error.message);
  }
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
    
    // Status indicator for backend sync
    const getStatusIndicator = (item) => {
      if (item.backendStatus === 'sent') {
        return '<span class="status-indicator success" title="Sent to backend">✓</span>';
      } else if (item.backendStatus === 'failed') {
        return '<span class="status-indicator error" title="Failed to send to backend">✗</span>';
      } else {
        return '<span class="status-indicator pending" title="Pending">⏳</span>';
      }
    };
    
    row.innerHTML = `
      <div class="col-title" title="${item.title || ''}">${truncateText(item.title)} ${getStatusIndicator(item)}</div>
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
    
    // Show sliding notification with backend status
    const title = message.data.title || 'New Page Scanned';
    const truncatedTitle = title.length > 50 ? title.substring(0, 50) + '...' : title;
    
    // Determine notification type based on backend result
    const backendResult = message.backendResult;
    let notificationTitle = 'Data Collected';
    let notificationType = 'success';
    
    if (backendResult && backendResult.success) {
      notificationTitle = 'Data Sent to Backend';
      notificationType = 'success';
    } else if (backendResult && !backendResult.success) {
      notificationTitle = 'Backend Error';
      notificationType = 'error';
    }
    
    showNotification(
      notificationTitle,
      truncatedTitle,
      message.data.url,
      notificationType,
      4000
    );
    
    // Update status briefly with backend info
    let statusMessage = `Scanned: ${truncatedTitle}`;
    if (backendResult) {
      if (backendResult.success) {
        statusMessage += ' ✓ Sent to backend';
      } else {
        statusMessage += ' ✗ Backend failed';
      }
    }
    
    updateStatus(statusMessage, !backendResult?.success);
    setTimeout(() => {
      if (autoScanEnabled) {
        updateStatus("Auto-scan is running", false);
      }
    }, 3000);
  }
});

// ===== DATA VIEW TOGGLE FUNCTIONALITY =====
const toggleDataView = (fieldKey) => {
  console.log('🔄 Toggling data view for field:', fieldKey);
  
  const truncatedText = document.querySelector(`#value-${fieldKey} .truncated-text`);
  const fullText = document.querySelector(`#value-${fieldKey} .full-text`);
  const button = document.getElementById(`btn-${fieldKey}`);
  
  console.log('Elements found:', {
    truncatedText: !!truncatedText,
    fullText: !!fullText,
    button: !!button
  });
  
  if (!truncatedText || !fullText || !button) {
    console.error('❌ Missing elements for field:', fieldKey);
    return;
  }
  
  const isCurrentlyHidden = fullText.classList.contains('hidden');
  console.log('Current state - fullText hidden:', isCurrentlyHidden);
  
  if (isCurrentlyHidden) {
    // Show full text
    truncatedText.classList.add('hidden');
    fullText.classList.remove('hidden');
    button.textContent = 'Hide';
    button.classList.add('hide-mode');
    console.log('✅ Switched to full text view');
  } else {
    // Show truncated text
    truncatedText.classList.remove('hidden');
    fullText.classList.add('hidden');
    button.textContent = 'More';
    button.classList.remove('hide-mode');
    console.log('✅ Switched to truncated view');
  }
};

// ===== MODAL FUNCTIONALITY =====
const showDataModal = (fieldLabel, fieldKey) => {
  if (!currentScannedData || !currentScannedData[fieldKey]) return;
  
  const modal = document.getElementById('dataDetailModal');
  const modalFieldName = document.getElementById('modalFieldName');
  const modalFieldContent = document.getElementById('modalFieldContent');
  
  modalFieldName.textContent = fieldLabel;
  modalFieldContent.innerHTML = currentScannedData[fieldKey].replace(/\n/g, '<br>');
  
  modal.classList.remove('hidden');
};

const closeDataModal = () => {
  const modal = document.getElementById('dataDetailModal');
  modal.classList.add('hidden');
};

// Add event listeners for modal
document.addEventListener('DOMContentLoaded', () => {
  const closeModalBtn = document.getElementById('closeModal');
  const modal = document.getElementById('dataDetailModal');
  
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeDataModal);
  }
  
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeDataModal();
      }
    });
  }
  
  // ESC key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDataModal();
    }
  });
});

// Make functions globally accessible
window.showDataModal = showDataModal;
window.toggleDataView = toggleDataView;

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