// filter-manager.js
// A comprehensive system for applying and removing filters

// Track all modifications made by the extension
const filterState = {
    activeFilter: "OFF",
    appliedStyles: [],
    modifiedElements: new Map(),
    svgFilterId: null
  };
  
  // Function to apply a filter
  function applyFilter(filterType) {
    // First, remove any existing filter
    removeFilter();
    
    // Set the active filter
    filterState.activeFilter = filterType;
    
    // If the filter is OFF, just return since we've already removed everything
    if (filterType === "OFF") {
      return;
    }
    
    // Apply the appropriate filter based on type
    switch (filterType) {
      case "PROTANOPIA":
        applyProtanopiaFilter();
        break;
      case "DEUTERANOPIA":
        applyDeuteranopiaFilter();
        break;
      case "TRITANOPIA":
        applyTritanopiaFilter();
        break;
      case "GRAYSCALE":
        applyGrayscaleFilter();
        break;
      case "DARK":
        applyDarkModeFilter();
        break;
    }
  }
  
  // Function to completely remove all filter effects
  function removeFilter() {
    // Remove all applied style elements
    filterState.appliedStyles.forEach(styleEl => {
      if (styleEl && document.contains(styleEl)) {
        styleEl.remove();
      }
    });
    filterState.appliedStyles = [];
    
    // Reset modified elements to their original state
    filterState.modifiedElements.forEach((originalValue, element) => {
      if (element && document.contains(element)) {
        if (originalValue.filter !== undefined) {
          element.style.filter = originalValue.filter;
        }
        if (originalValue.className !== undefined) {
          element.className = originalValue.className;
        }
        // Add more properties as needed
      }
    });
    filterState.modifiedElements.clear();
    
    // Remove any SVG filters
    if (filterState.svgFilterId) {
      const filterElement = document.getElementById(filterState.svgFilterId);
      if (filterElement) {
        filterElement.remove();
      }
      filterState.svgFilterId = null;
    }
    
    // Set active filter to OFF
    filterState.activeFilter = "OFF";
    
    // Force a repaint to ensure changes take effect
    document.body.style.transform = 'translateZ(0)';
    setTimeout(() => {
      document.body.style.transform = '';
    }, 10);
  }
  
  // Function to create and track a style element
  function createStyleElement(id, css) {
    // Check if a style with this ID already exists
    let styleEl = document.getElementById(id);
    if (!styleEl) {
      // Create new style element
      styleEl = document.createElement('style');
      styleEl.id = id;
      document.head.appendChild(styleEl);
    }
    
    // Set the CSS content
    styleEl.textContent = css;
    
    // Track this style element
    filterState.appliedStyles.push(styleEl);
    
    return styleEl;
  }
  
  // Function to modify an element and track the change
  function modifyElement(element, property, value) {
    // Store original value if not already tracked
    if (!filterState.modifiedElements.has(element)) {
      const originalValues = {};
      
      // Store original filter
      if (property === 'filter') {
        originalValues.filter = element.style.filter;
      }
      // Store original class
      if (property === 'className') {
        originalValues.className = element.className;
      }
      // Add more properties as needed
      
      filterState.modifiedElements.set(element, originalValues);
    }
    
    // Apply the new value
    if (property === 'filter') {
      element.style.filter = value;
    } else if (property === 'className') {
      element.className = value;
    }
    // Add more properties as needed
  }
  
  // Create SVG filter for protanopia
  function applyProtanopiaFilter() {
    // Create base styles
    createStyleElement('eyebrowse-protanopia-style', `
      html {
        filter: brightness(1.05) saturate(1.2) !important;
      }
    `);
    
    // Create SVG filter
    const svgFilter = document.createElement('div');
    svgFilter.id = 'eyebrowse-protanopia-filter';
    svgFilter.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
        <filter id="protanopia-filter">
          <feColorMatrix type="matrix" values="
            0.567, 0.433, 0,     0, 0
            0.558, 0.442, 0,     0, 0
            0,     0.242, 0.758, 0, 0
            0,     0,     0,     1, 0"/>
        </filter>
      </svg>
    `;
    document.body.appendChild(svgFilter);
    filterState.svgFilterId = 'eyebrowse-protanopia-filter';
    
    // Apply filter to images
    const mediaElements = document.querySelectorAll('img, video, canvas, svg, [style*="background-image"]');
    mediaElements.forEach(element => {
      modifyElement(element, 'filter', 'url(#protanopia-filter)');
    });
    
    // Set up observer to catch new elements
    setupObserver('protanopia-filter');
  }
  
  // Create SVG filter for deuteranopia
  function applyDeuteranopiaFilter() {
    // Create base styles
    createStyleElement('eyebrowse-deuteranopia-style', `
      html {
        filter: brightness(1.05) saturate(1.1) !important;
      }
    `);
    
    // Create SVG filter
    const svgFilter = document.createElement('div');
    svgFilter.id = 'eyebrowse-deuteranopia-filter';
    svgFilter.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
        <filter id="deuteranopia-filter">
          <feColorMatrix type="matrix" values="
            0.625, 0.375, 0,     0, 0
            0.7,   0.3,   0,     0, 0
            0,     0.3,   0.7,   0, 0
            0,     0,     0,     1, 0"/>
        </filter>
      </svg>
    `;
    document.body.appendChild(svgFilter);
    filterState.svgFilterId = 'eyebrowse-deuteranopia-filter';
    
    // Apply filter to images
    const mediaElements = document.querySelectorAll('img, video, canvas, svg, [style*="background-image"]');
    mediaElements.forEach(element => {
      modifyElement(element, 'filter', 'url(#deuteranopia-filter)');
    });
    
    // Set up observer to catch new elements
    setupObserver('deuteranopia-filter');
  }
  
  // Create SVG filter for tritanopia
  function applyTritanopiaFilter() {
    // Create base styles
    createStyleElement('eyebrowse-tritanopia-style', `
      html {
        filter: brightness(1.05) saturate(1.0) !important;
      }
    `);
    
    // Create SVG filter
    const svgFilter = document.createElement('div');
    svgFilter.id = 'eyebrowse-tritanopia-filter';
    svgFilter.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
        <filter id="tritanopia-filter">
          <feColorMatrix type="matrix" values="
            0.95, 0.05,  0,     0, 0
            0,    0.433, 0.567, 0, 0
            0,    0.475, 0.525, 0, 0
            0,    0,     0,     1, 0"/>
        </filter>
      </svg>
    `;
    document.body.appendChild(svgFilter);
    filterState.svgFilterId = 'eyebrowse-tritanopia-filter';
    
    // Apply filter to images
    const mediaElements = document.querySelectorAll('img, video, canvas, svg, [style*="background-image"]');
    mediaElements.forEach(element => {
      modifyElement(element, 'filter', 'url(#tritanopia-filter)');
    });
    
    // Set up observer to catch new elements
    setupObserver('tritanopia-filter');
  }
  
  // Apply grayscale filter
  function applyGrayscaleFilter() {
    createStyleElement('eyebrowse-grayscale-style', `
      html {
        filter: grayscale(100%) !important;
      }
    `);
  }
  
  // Apply dark mode filter
  function applyDarkModeFilter() {
    createStyleElement('eyebrowse-dark-mode-style', `
      html {
        filter: invert(90%) hue-rotate(180deg) brightness(0.8) !important;
      }
      
      img, picture, video, canvas, svg {
        filter: invert(100%) hue-rotate(180deg) !important;
      }
    `);
  }
  
  // Set up mutation observer to apply filters to new elements
  function setupObserver(filterId) {
    // Remove existing observer if there is one
    if (window.eyebrowseObserver) {
      window.eyebrowseObserver.disconnect();
    }
    
    // Create new observer
    window.eyebrowseObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes) {
          mutation.addedNodes.forEach(node => {
            // Check if this is a media element
            if (node.tagName === 'IMG' || node.tagName === 'VIDEO' || 
                node.tagName === 'CANVAS' || node.tagName === 'SVG') {
              modifyElement(node, 'filter', `url(#${filterId})`);
            } 
            // Check if it contains media elements
            else if (node.querySelectorAll) {
              const mediaElements = node.querySelectorAll('img, video, canvas, svg, [style*="background-image"]');
              mediaElements.forEach(element => {
                modifyElement(element, 'filter', `url(#${filterId})`);
              });
            }
          });
        }
      });
    });
    
    // Start observing
    window.eyebrowseObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Check if filter was already applied
  function getActiveFilter() {
    return filterState.activeFilter;
  }
  
  // Export functions for use in extension
  if (typeof window !== 'undefined') {
    window.EyeBrowseFilterManager = {
      applyFilter,
      removeFilter,
      getActiveFilter
    };
  }