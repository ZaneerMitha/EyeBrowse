// text-size-handler.js
// A direct JavaScript approach to text size adjustment

// Function to adjust text size throughout the page
function adjustTextSize(sizePercentage) {
    // Convert percentage to a decimal multiplier
    const sizeFactor = sizePercentage / 100;
    
    // Only proceed if it's a valid number
    if (isNaN(sizeFactor)) return;
    
    // Calculate actual size increase (more conservative)
    // This formula makes the increase more gradual
    // At 200%, text will be 30% larger
    const actualSizeFactor = 1 + ((sizeFactor - 1) * 0.3);
    
    // Get all text elements
    const textElements = document.querySelectorAll(
      'p, h1, h2, h3, h4, h5, h6, li, td, th, span, div, a, button, input, textarea, label'
    );
    
    // Adjust each element's font size
    textElements.forEach(el => {
      // Skip elements that contain images or media
      if (el.querySelector('img, video, iframe, canvas, svg')) return;
      
      // Get computed style
      const style = window.getComputedStyle(el);
      const originalSize = parseFloat(style.fontSize);
      
      // Only adjust if we can get a valid size
      if (!isNaN(originalSize)) {
        // Store original size if not already stored
        if (!el.hasAttribute('data-original-size')) {
          el.setAttribute('data-original-size', originalSize);
        }
        
        // Calculate new size based on original size
        const baseSize = parseFloat(el.getAttribute('data-original-size'));
        const newSize = baseSize * actualSizeFactor;
        
        // Apply new size
        el.style.fontSize = `${newSize}px`;
      }
    });
    
    // Add a class to the body to indicate text size has been adjusted
    document.body.classList.add('eyebrowse-text-adjusted');
  }
  
  // Function to reset text size to original
  function resetTextSize() {
    // Get all elements with stored original size
    const adjustedElements = document.querySelectorAll('[data-original-size]');
    
    // Reset each element's font size
    adjustedElements.forEach(el => {
      const originalSize = parseFloat(el.getAttribute('data-original-size'));
      el.style.fontSize = `${originalSize}px`;
      
      // Remove the data attribute
      el.removeAttribute('data-original-size');
    });
    
    // Remove the indicator class
    document.body.classList.remove('eyebrowse-text-adjusted');
  }
  
  // Export the functions for use in the extension
  if (typeof module !== 'undefined') {
    module.exports = { adjustTextSize, resetTextSize };
  }