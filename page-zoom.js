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
}

// Function to apply font styling
function setPageFont(fontName) {
  // Remove all possible font classes
  document.documentElement.classList.remove(
    'eyebrowse-opendyslexic',
    'eyebrowse-arial',
    'eyebrowse-comic-sans'
  );
  
  // Add the selected font class if needed
  if (fontName && fontName !== 'default') {
    document.documentElement.classList.add('eyebrowse-' + fontName);
  }
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "setPageZoom") {
    setPageZoom(message.factor);
    sendResponse({ success: true });
  }
  else if (message.command === "setPageFont") {
    setPageFont(message.font);
    sendResponse({ success: true });
  }
  return true;
});

// Apply the saved zoom and font (if any) when the content script loads
chrome.storage.local.get(["zoomFactor", "fontPreference"], (result) => {
  if (result.zoomFactor) {
    setPageZoom(result.zoomFactor);
  }
  
  if (result.fontPreference && result.fontPreference !== "default") {
    setPageFont(result.fontPreference);
  }
});