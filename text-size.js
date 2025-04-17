// page-zoom.js
// This script applies page-wide zoom adjustment by setting a CSS variable

// Function to set the zoom based on the provided scale factor
function setPageZoom(factor) {
    // Apply the zoom factor to the document root
    document.documentElement.style.setProperty('--zoom-factor', factor);
    
    // Update body size to compensate for the scaling
    document.body.style.minHeight = `calc(100vh / ${factor})`;
    
    // Handle scroll position to maintain focus on visible content
    const currentScrollY = window.scrollY;
    const currentScrollX = window.scrollX;
    
    // Apply scroll position adjustment based on zoom factor
    window.scrollTo({
      top: currentScrollY * factor,
      left: currentScrollX * factor,
      behavior: 'auto'
    });
    
    // Fix potential layout issues with elements that might not scale properly
    fixLayoutIssues(factor);
  }
  
  // Helper function to address common layout issues with zooming
  function fixLayoutIssues(factor) {
    // Find elements that might need special handling (like fixed position elements)
    const fixedElements = document.querySelectorAll(
      '[style*="position: fixed"], [style*="position:fixed"], .fixed, [class*="sticky"], [style*="position: sticky"], [style*="position:sticky"]'
    );
    
    // Apply inverse scaling to fixed elements to maintain their relative size
    fixedElements.forEach(element => {
      // Only apply if we haven't already processed this element
      if (!element.hasAttribute('data-zoom-processed')) {
        element.style.transform = `scale(${1 / factor})`;
        element.style.transformOrigin = 'left top';
        element.setAttribute('data-zoom-processed', 'true');
      }
    });
  }
  
  // Listen for messages from the extension
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === "setPageZoom") {
      setPageZoom(message.factor);
      sendResponse({ success: true });
    }
  });
  
  // Apply the saved zoom (if any) when the content script loads
  chrome.storage.local.get("zoomFactor", (result) => {
    if (result.zoomFactor) {
      setPageZoom(result.zoomFactor);
    }
  });