// Configuration
const API_ENDPOINT = "http://localhost:8000/api";

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
  