chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // First-time installation - set initial values
    chrome.storage.local.set({ 
      focusMode: "OFF",
      zoomFactor: 1.0,
      fontPreference: "default",
      textSize: "OFF",
      lineSpacing: "OFF",
      letterSpacing: "OFF",
      wordSpacing: "OFF", 
      columnWidth: "OFF",
      paragraphSpacing: "OFF",
      textGuide: false,
      highContrast: false,
      contrastMode: "normal"
    });
    chrome.action.setBadgeText({ text: "OFF" });
  }
});

// Mapping of filter types to CSS files
const filterMapping = {
  "GRAYSCALE": "filters/grayscale.css",
  "PROTANOPIA": "filters/protanopia.css",
  "DEUTERANOPIA": "filters/deuteranopia.css",
  "TRITANOPIA": "filters/tritanopia.css",
  "DARK": "filters/dark-mode.css"
};

// Mapping of font types to CSS files
const fontMapping = {
  "opendyslexic": "fonts/opendyslexic.css",
  "arial": "fonts/arial.css",
  "comic-sans": "fonts/comic-sans.css"
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "setFilter") {
    const filter = message.filter;
    const tabId = message.tabId;
    
    // Save the new filter setting
    chrome.storage.local.set({ focusMode: filter });
    
    // Update badge
    chrome.action.setBadgeText({ text: filter });
    
    // Apply to current tab if ID provided
    if (tabId) {
      // Check if we can access this tab
      chrome.tabs.get(tabId, (tab) => {
        if (tab && tab.url && !tab.url.startsWith("chrome:")) {
          applyFilterToTab(filter, tabId);
        }
      });
    }
    
    sendResponse({ success: true });
  } 
  else if (message.command === "setFont") {
    const font = message.font;
    const tabId = message.tabId;
    
    // Save the font preference
    chrome.storage.local.set({ fontPreference: font || "default" });
    
    // Apply to current tab if ID provided
    if (tabId) {
      // Check if we can access this tab
      chrome.tabs.get(tabId, (tab) => {
        if (tab && tab.url && !tab.url.startsWith("chrome:")) {
          applyFontToTab(font, tabId);
        }
      });
    }
    
    sendResponse({ success: true });
  }
  else if (message.command === "setTextSetting") {
    const setting = message.setting;
    const value = message.value;
    const tabId = message.tabId;
    
    // Create a storage object with the setting to update
    const storageObj = {};
    storageObj[setting] = value;
    
    // Save the setting
    chrome.storage.local.set(storageObj);
    
    // Apply to current tab if ID provided
    if (tabId) {
      // Check if we can access this tab
      chrome.tabs.get(tabId, (tab) => {
        if (tab && tab.url && !tab.url.startsWith("chrome:")) {
          applyTextSettingToTab(setting, value, tabId);
        }
      });
    }
    
    sendResponse({ success: true });
  }
  
  return true; 
});

// Function to apply filter to tab - updated version
function applyFilterToTab(filter, tabId) {
  // First remove any existing filter
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    function: clearFilter
  }).catch(() => {
    // Ignore errors - script might not be allowed on this page
  });
  
  // Apply new filter if not OFF
  if (filter !== "OFF") {
    // First apply the CSS file for basic styling
    const cssFile = filterMapping[filter];
    chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: [cssFile]
    }).catch((error) => {
      console.log("CSS injection error: " + error.message);
    });
    
    // Then inject the color-filter-handler.js script if needed
    if (filter === "PROTANOPIA" || filter === "DEUTERANOPIA" || filter === "TRITANOPIA") {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["color-filter-handler.js"]
      }).catch((error) => {
        console.log("Script injection error: " + error.message);
      });
      
      // Apply the appropriate filter to images using the handler
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: applyColorFilter,
        args: [filter]
      }).catch((error) => {
        console.log("Filter application error: " + error.message);
      });
    }
  }
}

// Function that runs in page context to clear filters
function clearFilter() {
  // Remove any directly injected CSS
  const filterStyle = document.getElementById('eyebrowse-filter-style');
  if (filterStyle) {
    filterStyle.remove();
  }
  
  // Try to remove image filters using the color-filter-handler if it exists
  if (typeof removeColorFiltersFromImages === 'function') {
    removeColorFiltersFromImages();
  } else {
    // Fallback - reset filter on all images
    const mediaElements = document.querySelectorAll('img, video, canvas, svg, [style*="background-image"]');
    mediaElements.forEach(element => {
      element.style.filter = 'none';
    });
  }
}

// Function to apply color filters using the handler script
function applyColorFilter(filterType) {
  // Check if the handler script was loaded
  if (typeof applyColorFilterToImages === 'function') {
    applyColorFilterToImages(filterType);
  } else {
    console.error('Color filter handler script not loaded');
  }
}

// Function to apply font to tab
function applyFontToTab(font, tabId) {
  // Remove any existing font CSS
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    function: removeFontCSS
  }).catch(() => {
    // Ignore errors
  });
  
  // Apply new font if not default
  if (font && font !== "default") {
    // If it's one of our standard fonts, use the CSS file
    if (fontMapping[font]) {
      const cssFile = fontMapping[font];
      
      // First try to insert CSS using the API
      chrome.scripting.insertCSS({
        target: { tabId: tabId },
        files: [cssFile]
      }).catch((error) => {
        console.log("CSS injection error, trying alternative method: " + error.message);
        
        // If that fails, inject CSS content directly
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          function: insertCSSFromExtension,
          args: [cssFile, 'eyebrowse-font-style']
        }).catch((error) => {
          console.log("Script injection error: " + error.message);
        });
      });
    } else {
      // Fallback for any font not in our mapping
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: applyGenericFont,
        args: [font]
      }).catch((error) => {
        console.log("Script injection error: " + error.message);
      });
    }
    
    // Also add the class to the HTML element for additional styling
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: addFontClass,
      args: [font]
    }).catch(() => {
      // Ignore errors
    });
  }
}

// Updated functions in background.js for CSS variable approach

// Updated functions in background.js for JavaScript text size handling

// Function to apply text settings with special handling for text size
function applyTextSettingToTab(setting, value, tabId) {
  // Special handling for text size - use JavaScript approach
  if (setting === 'textSize') {
    // First ensure text-size-handler.js is loaded
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["text-size-handler.js"]
    }).then(() => {
      // Then call the adjustTextSize function
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: callAdjustTextSize,
        args: [Math.round(value * 100)] // Convert decimal to percentage
      });
    }).catch((error) => {
      console.log("Script injection error: " + error.message);
    });
    return;
  }
  
  // Handle other text settings using CSS approach
  // First make sure text-customization.css is loaded
  chrome.scripting.insertCSS({
    target: { tabId: tabId },
    files: ["text-customization.css"]
  }).catch((error) => {
    console.log("CSS injection error: " + error.message);
  });
  
  // Handle boolean toggles with class-based approach
  if (setting === 'textGuide' || setting === 'highContrast' || setting === 'contrastMode') {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: updateTextSetting,
      args: [setting, value]
    }).catch((error) => {
      console.log("Script injection error: " + error.message);
    });
  } 
  // Handle other numeric settings with CSS variables
  else {
    let cssVarName = '';
    let cssVarValue = '';
    
    switch(setting) {
      case 'lineSpacing':
        cssVarName = '--line-spacing-factor';
        cssVarValue = value;
        break;
      case 'letterSpacing':
        cssVarName = '--letter-spacing-value';
        cssVarValue = `${value}px`;
        break;
      case 'wordSpacing':
        cssVarName = '--word-spacing-value';
        cssVarValue = `${value}px`;
        break;
      case 'columnWidth':
        cssVarName = '--column-width-percent';
        cssVarValue = `${value}%`;
        break;
      case 'paragraphSpacing':
        cssVarName = '--paragraph-spacing-factor';
        cssVarValue = value;
        break;
    }
    
    if (cssVarName) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: updateCSSVariable,
        args: [cssVarName, cssVarValue]
      }).catch((error) => {
        console.log("Script injection error: " + error.message);
      });
    }
  }
}

// Function that calls the adjustTextSize function from text-size-handler.js
function callAdjustTextSize(percentage) {
  if (typeof adjustTextSize === 'function') {
    adjustTextSize(percentage);
  } else {
    console.error('Text size handler not loaded');
  }
}

// Function to apply all text settings to a tab - updated for JS text handling
function applyAllTextSettings(settings, tabId) {
  // Apply text size using JavaScript
  if (settings.textSize && settings.textSize !== 1.0) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["text-size-handler.js"]
    }).then(() => {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: callAdjustTextSize,
        args: [Math.round(settings.textSize * 100)]
      });
    }).catch((error) => {
      console.log("Script injection error: " + error.message);
    });
  }
  
  // First load CSS if any other setting is active
  if (hasActiveTextSettings(settings)) {
    chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ["text-customization.css"]
    }).catch((error) => {
      console.log("CSS injection error: " + error.message);
    });
    
    // Apply CSS variables for numeric settings in a single script execution
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: applyAllCSSVariables,
      args: [{
        lineSpacing: settings.lineSpacing || 1.0,
        letterSpacing: settings.letterSpacing || 0,
        wordSpacing: settings.wordSpacing || 0,
        columnWidth: settings.columnWidth || 100,
        paragraphSpacing: settings.paragraphSpacing || 1.0
      }]
    }).catch((error) => {
      console.log("Script injection error: " + error.message);
    });
    
    // Apply toggle-based settings
    if (settings.textGuide === true) {
      applyTextSettingToTab('textGuide', true, tabId);
    }
    
    if (settings.highContrast === true) {
      applyTextSettingToTab('highContrast', true, tabId);
      applyTextSettingToTab('contrastMode', settings.contrastMode || 'normal', tabId);
    }
  }
}

// Function to check if any non-text-size settings are active
function hasActiveTextSettings(settings) {
  return (
    (settings.lineSpacing && settings.lineSpacing !== 1.0) ||
    (settings.letterSpacing && settings.letterSpacing !== 0) ||
    (settings.wordSpacing && settings.wordSpacing !== 0) ||
    (settings.columnWidth && settings.columnWidth !== 100) ||
    (settings.paragraphSpacing && settings.paragraphSpacing !== 1.0) ||
    settings.textGuide === true ||
    settings.highContrast === true
  );
}
// Function that runs in page context to update CSS variables
function updateCSSVariable(name, value) {
  document.documentElement.style.setProperty(name, value);
}


// Function to apply all CSS variables at once
function applyAllCSSVariables(settings) {
  const root = document.documentElement;
  
  // Set each CSS variable
  if (settings.textSize) {
    root.style.setProperty('--text-size-factor', settings.textSize);
  }
  
  if (settings.lineSpacing) {
    root.style.setProperty('--line-spacing-factor', settings.lineSpacing);
  }
  
  if (settings.letterSpacing !== undefined) {
    root.style.setProperty('--letter-spacing-value', `${settings.letterSpacing}px`);
  }
  
  if (settings.wordSpacing !== undefined) {
    root.style.setProperty('--word-spacing-value', `${settings.wordSpacing}px`);
  }
  
  if (settings.columnWidth) {
    root.style.setProperty('--column-width-percent', `${settings.columnWidth}%`);
  }
  
  if (settings.paragraphSpacing) {
    root.style.setProperty('--paragraph-spacing-factor', settings.paragraphSpacing);
  }
}

// Function to check if any text settings are active - updated for sliders
function hasActiveTextSettings(settings) {
  return (
    (settings.textSize && settings.textSize !== 1.0) ||
    (settings.lineSpacing && settings.lineSpacing !== 1.0) ||
    (settings.letterSpacing && settings.letterSpacing !== 0) ||
    (settings.wordSpacing && settings.wordSpacing !== 0) ||
    (settings.columnWidth && settings.columnWidth !== 100) ||
    (settings.paragraphSpacing && settings.paragraphSpacing !== 1.0) ||
    settings.textGuide === true ||
    settings.highContrast === true
  );
}
// Function that runs in page context to remove CSS
function removeCSS(cssFile) {
  // Look for link elements with this CSS file
  const links = document.querySelectorAll(`link[href$="${cssFile}"]`);
  links.forEach(link => link.remove());
}

// Function that runs in page context to remove font CSS
function removeFontCSS() {
  // Remove any font classes from HTML element
  document.documentElement.classList.remove(
    'eyebrowse-opendyslexic',
    'eyebrowse-arial',
    'eyebrowse-comic-sans'
  );
  
  // Remove any font style elements
  const styleEl = document.getElementById('eyebrowse-font-style');
  if (styleEl) {
    styleEl.remove();
  }
}

// Function to add a font class to the HTML element
function addFontClass(fontName) {
  document.documentElement.classList.add('eyebrowse-' + fontName);
}

// Function to apply a generic font style
function applyGenericFont(fontName) {
  let styleEl = document.getElementById('eyebrowse-font-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'eyebrowse-font-style';
    document.head.appendChild(styleEl);
  }
  
  styleEl.textContent = `
    body * {
      font-family: ${fontName}, sans-serif !important;
    }
  `;
}

// Function to update text settings
function updateTextSetting(setting, value) {
  const html = document.documentElement;
  
  // First remove all classes related to this setting
  switch(setting) {
    case 'textSize':
      html.classList.remove(
        'eyebrowse-text-size-large',
        'eyebrowse-text-size-larger',
        'eyebrowse-text-size-largest'
      );
      break;
    case 'lineSpacing':
      html.classList.remove(
        'eyebrowse-line-spacing-loose',
        'eyebrowse-line-spacing-looser',
        'eyebrowse-line-spacing-loosest'
      );
      break;
    case 'letterSpacing':
      html.classList.remove(
        'eyebrowse-letter-spacing-wide',
        'eyebrowse-letter-spacing-wider',
        'eyebrowse-letter-spacing-widest'
      );
      break;
    case 'wordSpacing':
      html.classList.remove(
        'eyebrowse-word-spacing-wide',
        'eyebrowse-word-spacing-wider',
        'eyebrowse-word-spacing-widest'
      );
      break;
    case 'columnWidth':
      html.classList.remove(
        'eyebrowse-column-width-narrow',
        'eyebrowse-column-width-narrower',
        'eyebrowse-column-width-narrowest'
      );
      break;
    case 'paragraphSpacing':
      html.classList.remove(
        'eyebrowse-paragraph-spacing-loose',
        'eyebrowse-paragraph-spacing-looser',
        'eyebrowse-paragraph-spacing-loosest'
      );
      break;
    case 'textGuide':
      html.classList.remove('eyebrowse-text-guide');
      break;
    case 'highContrast':
      html.classList.remove(
        'eyebrowse-high-contrast-text',
        'eyebrowse-high-contrast-text-inverted'
      );
      break;
  }
  
  // Add new class if value is not OFF
  if (value && value !== 'OFF' && value !== false) {
    switch(setting) {
      case 'textSize':
        html.classList.add(`eyebrowse-text-size-${value}`);
        break;
      case 'lineSpacing':
        html.classList.add(`eyebrowse-line-spacing-${value}`);
        break;
      case 'letterSpacing':
        html.classList.add(`eyebrowse-letter-spacing-${value}`);
        break;
      case 'wordSpacing':
        html.classList.add(`eyebrowse-word-spacing-${value}`);
        break;
      case 'columnWidth':
        html.classList.add(`eyebrowse-column-width-${value}`);
        break;
      case 'paragraphSpacing':
        html.classList.add(`eyebrowse-paragraph-spacing-${value}`);
        break;
      case 'textGuide':
        if (value === true) {
          html.classList.add('eyebrowse-text-guide');
        }
        break;
      case 'highContrast':
        if (value === true) {
          // For high contrast, we need to check the contrast mode
          const contrastMode = window.eyebrowseSettings?.contrastMode || 'normal';
          if (contrastMode === 'inverted') {
            html.classList.add('eyebrowse-high-contrast-text-inverted');
          } else {
            html.classList.add('eyebrowse-high-contrast-text');
          }
        }
        break;
      case 'contrastMode':
        // This requires checking if high contrast is enabled
        const highContrast = window.eyebrowseSettings?.highContrast || false;
        if (highContrast) {
          if (value === 'inverted') {
            html.classList.add('eyebrowse-high-contrast-text-inverted');
          } else {
            html.classList.add('eyebrowse-high-contrast-text');
          }
        }
        break;
    }
  }
  
  // Store settings in a window object for reference
  if (!window.eyebrowseSettings) {
    window.eyebrowseSettings = {};
  }
  window.eyebrowseSettings[setting] = value;
}

// Function to get and insert CSS from the extension
function insertCSSFromExtension(cssFile, styleId) {
  // Create a unique style element
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  
  // Use a fetch via the extension URL to get the CSS content
  fetch(chrome.runtime.getURL(cssFile))
    .then(response => response.text())
    .then(css => {
      styleEl.textContent = css;
    })
    .catch(error => {
      console.error('Failed to load CSS: ' + error);
    });
}

// Listen for tab updates to apply settings to new page loads
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only apply when the page has finished loading and isn't a chrome:// URL
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith("chrome:")) {
    // Get current settings
    chrome.storage.local.get([
      "focusMode", 
      "zoomFactor", 
      "fontPreference",
      "textSize",
      "lineSpacing",
      "letterSpacing",
      "wordSpacing", 
      "columnWidth",
      "paragraphSpacing",
      "textGuide",
      "highContrast",
      "contrastMode"
    ], (settings) => {
      try {
        // Apply zoom settings if available
        if (settings.zoomFactor) {
          chrome.scripting.executeScript({
            target: { tabId },
            function: (factor) => {
              // Try to communicate with the page-zoom.js content script
              try {
                chrome.runtime.sendMessage({
                  command: "setPageZoom",
                  factor: factor
                });
              } catch (e) {
                // If content script communication fails, update CSS variable directly
                document.documentElement.style.setProperty('--zoom-factor', factor);
              }
            },
            args: [settings.zoomFactor]
          }).catch(() => {
            // Ignore errors - script might not be allowed on this page
          });
        }
        
        // Apply filter if active
        if (settings.focusMode && settings.focusMode !== "OFF") {
          applyFilterToTab(settings.focusMode, tabId);
        }
        
        // Apply font settings if active
        if (settings.fontPreference && settings.fontPreference !== "default") {
          applyFontToTab(settings.fontPreference, tabId);
        }
        
        // First make sure text-customization.css is loaded
        if (hasActiveTextSettings(settings)) {
          chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: ["text-customization.css"]
          }).catch((error) => {
            console.log("CSS injection error: " + error.message);
          });
        }
        
        // Apply each text setting
        applyAllTextSettings(settings, tabId);
        
      } catch (error) {
        console.error("Error applying settings: " + error.message);
      }
    });
  }
});

// Function to check if any text settings are active
function hasActiveTextSettings(settings) {
  return (
    settings.textSize !== "OFF" &&
    settings.textSize !== undefined ||
    settings.lineSpacing !== "OFF" &&
    settings.lineSpacing !== undefined ||
    settings.letterSpacing !== "OFF" &&
    settings.letterSpacing !== undefined ||
    settings.wordSpacing !== "OFF" &&
    settings.wordSpacing !== undefined ||
    settings.columnWidth !== "OFF" &&
    settings.columnWidth !== undefined ||
    settings.paragraphSpacing !== "OFF" &&
    settings.paragraphSpacing !== undefined ||
    settings.textGuide === true ||
    settings.highContrast === true
  );
}

// Function to apply all text settings to a tab
function applyAllTextSettings(settings, tabId) {
  // Text size
  if (settings.textSize && settings.textSize !== "OFF") {
    applyTextSettingToTab('textSize', settings.textSize, tabId);
  }
  
  // Line spacing
  if (settings.lineSpacing && settings.lineSpacing !== "OFF") {
    applyTextSettingToTab('lineSpacing', settings.lineSpacing, tabId);
  }
  
  // Letter spacing
  if (settings.letterSpacing && settings.letterSpacing !== "OFF") {
    applyTextSettingToTab('letterSpacing', settings.letterSpacing, tabId);
  }
  
  // Word spacing
  if (settings.wordSpacing && settings.wordSpacing !== "OFF") {
    applyTextSettingToTab('wordSpacing', settings.wordSpacing, tabId);
  }
  
  // Column width
  if (settings.columnWidth && settings.columnWidth !== "OFF") {
    applyTextSettingToTab('columnWidth', settings.columnWidth, tabId);
  }
  
  // Paragraph spacing
  if (settings.paragraphSpacing && settings.paragraphSpacing !== "OFF") {
    applyTextSettingToTab('paragraphSpacing', settings.paragraphSpacing, tabId);
  }
  
  // Text guide
  if (settings.textGuide === true) {
    applyTextSettingToTab('textGuide', true, tabId);
  }
  
  // High contrast
  if (settings.highContrast === true) {
    applyTextSettingToTab('highContrast', true, tabId);
    applyTextSettingToTab('contrastMode', settings.contrastMode || 'normal', tabId);
  }
}