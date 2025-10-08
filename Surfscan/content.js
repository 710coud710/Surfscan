
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
          extractDate(document.body.innerText) || "",
          
    abstract: getMeta("description") ||
              getMeta("og:description") ||
              document.querySelector("[class*='abstract']")?.innerText.trim() ||
              document.querySelector("[class*='summary']")?.innerText.trim() || "",
              
    url: window.location.href
  };
};

// Listen for scan request
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "scan_page") {
    const data = extractData();
    sendResponse({ data });
  }
});
  