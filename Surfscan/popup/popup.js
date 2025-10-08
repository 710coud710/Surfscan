let scannedData = null;

// Helper to update status
const updateStatus = (message, isError = false) => {
  const status = document.getElementById("status");
  status.textContent = message;
  status.className = `status ${isError ? 'error' : 'success'}`;
};

// Helper to display data
const displayData = (data) => {
  const fields = ['title', 'author', 'publisher', 'date', 'abstract'];
  fields.forEach(field => {
    const el = document.getElementById(field);
    el.textContent = data[field] || 'Not found';
    el.className = `value ${data[field] ? '' : 'empty'}`;
  });
};

// Function to inject content script
const injectContentScript = async (tabId) => {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    return true;
  } catch (error) {
    console.error('Failed to inject content script:', error);
    return false;
  }
};

// Function to check if we can access the tab
const isValidTab = (tab) => {
  return tab.url && (
    tab.url.startsWith('http://') || 
    tab.url.startsWith('https://') || 
    tab.url.startsWith('file://')
  );
};

// Scan button handler
document.getElementById("scanBtn").addEventListener("click", async () => {
  try {
    updateStatus("Preparing to scan...");
    
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !isValidTab(tab)) {
      throw new Error("Cannot scan this page. Please try on a web page.");
    }
    
    // Try to scan the page
    try {
      updateStatus("Scanning page...");
      const result = await chrome.tabs.sendMessage(tab.id, { action: "scan_page" });
      scannedData = result.data;
    } catch (error) {
      // If content script is not injected, try to inject it
      if (error.message.includes("Receiving end does not exist")) {
        updateStatus("Initializing scanner...");
        const injected = await injectContentScript(tab.id);
        if (!injected) {
          throw new Error("Failed to initialize scanner");
        }
        // Retry the scan after injection
        const result = await chrome.tabs.sendMessage(tab.id, { action: "scan_page" });
        scannedData = result.data;
      } else {
        throw error;
      }
    }
    
    // Display results
    displayData(scannedData);
    
    // Enable export button
    document.getElementById("exportBtn").disabled = false;
    
    updateStatus("Scan completed!");
  } catch (error) {
    updateStatus("Error: " + error.message, true);
    console.error('Scan error:', error);
  }
});

// Export button handler
document.getElementById("exportBtn").addEventListener("click", async () => {
  if (!scannedData) return;
  
  try {
    updateStatus("Exporting data...");
    
    // Send to backend
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "send_to_backend", data: scannedData },
        resolve
      );
    });
    
    if (response.success) {
      updateStatus(" Data exported successfully!");
      
      // If backend returns a download URL
      if (response.result.downloadUrl) {
        chrome.tabs.create({ url: response.result.downloadUrl });
      }
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    updateStatus(" Export failed: " + error.message, true);
  }
});
  