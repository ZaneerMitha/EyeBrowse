// color-filter-handler.js
// Script to properly inject colorblindness SVG filters

// Function to add SVG filter definitions to the document
function injectSVGFilters() {
    // Create SVG element to hold filter definitions
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", "eyebrowse-filters");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    svg.style.zIndex = "-9999";
    
    // Add filter definitions to the SVG
    svg.innerHTML = `
      <defs>
        <!-- Protanopia (red-blind) filter -->
        <filter id="protanopia-filter">
          <feColorMatrix type="matrix" values="
            0.567, 0.433, 0,     0, 0
            0.558, 0.442, 0,     0, 0
            0,     0.242, 0.758, 0, 0
            0,     0,     0,     1, 0"/>
        </filter>
        
        <!-- Deuteranopia (green-blind) filter -->
        <filter id="deuteranopia-filter">
          <feColorMatrix type="matrix" values="
            0.625, 0.375, 0,     0, 0
            0.7,   0.3,   0,     0, 0
            0,     0.3,   0.7,   0, 0
            0,     0,     0,     1, 0"/>
        </filter>
        
        <!-- Tritanopia (blue-blind) filter -->
        <filter id="tritanopia-filter">
          <feColorMatrix type="matrix" values="
            0.95, 0.05,  0,     0, 0
            0,    0.433, 0.567, 0, 0
            0,    0.475, 0.525, 0, 0
            0,    0,     0,     1, 0"/>
        </filter>
      </defs>
    `;
    
    // Add the SVG to the document
    document.body.appendChild(svg);
  }
  
  // Function to apply color filters to all images dynamically
  function applyColorFilterToImages(filterType) {
    // First inject SVG filters if not already present
    if (!document.getElementById('eyebrowse-filters')) {
      injectSVGFilters();
    }
    
    // Get all images, videos, and canvases
    const mediaElements = document.querySelectorAll('img, video, canvas, svg, [style*="background-image"]');
    
    // Map filter type to filter ID
    let filterId;
    switch(filterType) {
      case 'PROTANOPIA':
        filterId = 'url(#protanopia-filter)';
        break;
      case 'DEUTERANOPIA':
        filterId = 'url(#deuteranopia-filter)';
        break;
      case 'TRITANOPIA':
        filterId = 'url(#tritanopia-filter)';
        break;
      default:
        filterId = 'none';
    }
    
    // Apply filter to each element
    mediaElements.forEach(element => {
      element.style.filter = filterId;
    });
    
    // Also watch for new images that might be added to the page
    setupImageObserver(filterType);
  }
  
  // Function to observe DOM for new images
  function setupImageObserver(filterType) {
    // Create a mapping of filter types to filter IDs
    const filterMap = {
      'PROTANOPIA': 'url(#protanopia-filter)',
      'DEUTERANOPIA': 'url(#deuteranopia-filter)',
      'TRITANOPIA': 'url(#tritanopia-filter)'
    };
    
    // Don't set up observer if filter is OFF
    if (!filterMap[filterType]) return;
    
    // Check if we already have an observer
    if (window.eyebrowseImageObserver) {
      window.eyebrowseImageObserver.disconnect();
    }
    
    // Create new observer
    window.eyebrowseImageObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes) {
          mutation.addedNodes.forEach(node => {
            // Check if the added node is an image or contains images
            if (node.nodeName === 'IMG' || node.nodeName === 'VIDEO' || 
                node.nodeName === 'CANVAS' || node.nodeName === 'SVG') {
              node.style.filter = filterMap[filterType];
            } else if (node.querySelectorAll) {
              const mediaElements = node.querySelectorAll('img, video, canvas, svg, [style*="background-image"]');
              mediaElements.forEach(element => {
                element.style.filter = filterMap[filterType];
              });
            }
          });
        }
      });
    });
    
    // Start observing
    window.eyebrowseImageObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Function to remove color filters from images
  function removeColorFiltersFromImages() {
    // Get all images and reset their filters
    const mediaElements = document.querySelectorAll('img, video, canvas, svg, [style*="background-image"]');
    mediaElements.forEach(element => {
      element.style.filter = 'none';
    });
    
    // Stop observing for new images
    if (window.eyebrowseImageObserver) {
      window.eyebrowseImageObserver.disconnect();
      window.eyebrowseImageObserver = null;
    }
    
    // Remove SVG filter definitions
    const filters = document.getElementById('eyebrowse-filters');
    if (filters) {
      filters.remove();
    }
  }
  
  // Export functions for use by background.js
  if (typeof module !== 'undefined') {
    module.exports = {
      applyColorFilterToImages,
      removeColorFiltersFromImages
    };
  }