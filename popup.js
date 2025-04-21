// popup.js - Updated with slider controls for text settings

document.addEventListener("DOMContentLoaded", () => {
  // Main UI elements - Vision Tab
  const filterToggle = document.getElementById("filterToggle");
  const zoomSlider = document.getElementById("zoomSlider");
  const zoomValue = document.getElementById("zoomValue");
  const fontToggle = document.getElementById("fontToggle");
  const fontSelector = document.getElementById("fontSelector");
  const fontOptions = document.getElementById("fontOptions");
  
  // Text Tab sliders
  const textSizeSlider = document.getElementById("textSizeSlider");
  const textSizeValue = document.getElementById("textSizeValue");
  const lineSpacingSlider = document.getElementById("lineSpacingSlider");
  const lineSpacingValue = document.getElementById("lineSpacingValue");
  const letterSpacingSlider = document.getElementById("letterSpacingSlider");
  const letterSpacingValue = document.getElementById("letterSpacingValue");
  const wordSpacingSlider = document.getElementById("wordSpacingSlider");
  const wordSpacingValue = document.getElementById("wordSpacingValue");
  const columnWidthSlider = document.getElementById("columnWidthSlider");
  const columnWidthValue = document.getElementById("columnWidthValue");
  const paragraphSpacingSlider = document.getElementById("paragraphSpacingSlider");
  const paragraphSpacingValue = document.getElementById("paragraphSpacingValue");
  
  // Text Tab toggles
  const textGuideToggle = document.getElementById("textGuideToggle");
  const highContrastToggle = document.getElementById("highContrastToggle");
  const contrastSelector = document.getElementById("contrastSelector");
  const contrastOptions = document.getElementById("contrastOptions");
  
  // Tabs
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Reset button
  const resetAllButton = document.getElementById("resetAll");
  
  // Set up tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      tab.classList.add('active');
      const tabName = tab.getAttribute('data-tab');
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });
  
  // Initialize the UI based on stored states
  initializeUI();
  
  function initializeUI() {
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
    ], (result) => {
      // Vision Tab - Initialize filter dropdown
      const filterState = result.focusMode || "OFF";
      filterToggle.value = filterState;
  
      // Vision Tab - Initialize zoom slider
      const zoomFactor = result.zoomFactor || 1.0;
      zoomSlider.value = Math.round(zoomFactor * 100);
      zoomValue.textContent = zoomSlider.value;
      
      // Vision Tab - Initialize font toggle and selector
      const fontPreference = result.fontPreference || "default";
      if (fontPreference !== "default") {
        fontToggle.checked = true;
        fontOptions.style.display = "block";
        
        // Only set selector value if the option exists
        if (fontSelector.querySelector(`option[value="${fontPreference}"]`)) {
          fontSelector.value = fontPreference;
        }
      }
      
      // Text Tab - Initialize text size slider
      const textSize = result.textSize || 1.0;
      textSizeSlider.value = Math.round(textSize * 100);
      textSizeValue.textContent = textSizeSlider.value;
      
      // Text Tab - Initialize line spacing slider
      // Converting from 1.0 - 3.0 range to 10-30 slider value
      const lineSpacing = result.lineSpacing || 1.0;
      lineSpacingSlider.value = Math.round(lineSpacing * 10);
      lineSpacingValue.textContent = lineSpacing.toFixed(1);
      
      // Text Tab - Initialize letter spacing slider
      const letterSpacing = result.letterSpacing || 0;
      letterSpacingSlider.value = letterSpacing;
      letterSpacingValue.textContent = letterSpacing;
      
      // Text Tab - Initialize word spacing slider
      const wordSpacing = result.wordSpacing || 0;
      wordSpacingSlider.value = wordSpacing;
      wordSpacingValue.textContent = wordSpacing;
      
      // Text Tab - Initialize column width slider
      const columnWidth = result.columnWidth || 100;
      columnWidthSlider.value = columnWidth;
      columnWidthValue.textContent = columnWidth;
      
      // Text Tab - Initialize paragraph spacing slider
      // Converting from 1.0 - 3.0 range to 10-30 slider value
      const paragraphSpacing = result.paragraphSpacing || 1.0;
      paragraphSpacingSlider.value = Math.round(paragraphSpacing * 10);
      paragraphSpacingValue.textContent = paragraphSpacing.toFixed(1);
      
      // Text Tab - Initialize text guide
      textGuideToggle.checked = result.textGuide === true;
      
      // Text Tab - Initialize high contrast
      highContrastToggle.checked = result.highContrast === true;
      if (result.highContrast === true) {
        contrastOptions.style.display = "block";
        contrastSelector.value = result.contrastMode || "normal";
      }
    });
  }
  
  // Handle filter changes
  filterToggle.addEventListener("change", () => {
    const nextState = filterToggle.value;
    
    // Get active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) return;
      
      // Update badge
      chrome.action.setBadgeText({ text: nextState });
      
      // Send message to background to apply filter
      chrome.runtime.sendMessage({
        command: "setFilter",
        filter: nextState,
        tabId: tab.id
      });
      
      // Force page refresh if selecting Normal Vision
      if (nextState === "OFF") {
        chrome.tabs.reload(tab.id);
      } else {
        // For other filters, apply script to force immediate display update
        forcePageUpdate(tab.id);
      }
    });
  });

  // Function to force immediate page update
  function forcePageUpdate(tabId) {
    chrome.scripting.executeScript({
      target: { tabId },
      function: () => {
        // This tiny DOM change forces an immediate repaint
        document.body.style.zoom = "0.99999";
        setTimeout(() => {
          document.body.style.zoom = "1";
        }, 10);
      }
    }).catch(() => {
      // Ignore errors on restricted pages
    });
  }

  // Handle zoom slider changes
  zoomSlider.addEventListener("input", () => {
    // Update the displayed value immediately while dragging
    zoomValue.textContent = zoomSlider.value;
  });

  zoomSlider.addEventListener("change", () => {
    // Convert percentage to decimal factor (100% = 1.0)
    const factor = zoomSlider.value / 100;
    
    // Save the setting
    chrome.storage.local.set({ zoomFactor: factor });
    
    // Apply to the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length) return;
      const tabId = tabs[0].id;

      // Send message to the content script to update zoom
      chrome.tabs.sendMessage(tabId, {
        command: "setPageZoom",
        factor: factor
      }).catch(() => {
        // If error, try to inject the script first
        chrome.scripting.executeScript({
          target: { tabId },
          files: ["page-zoom.js"]
        }).then(() => {
          // Try again after script is injected
          chrome.tabs.sendMessage(tabId, {
            command: "setPageZoom",
            factor: factor
          }).catch(() => {
            // Silently fail - might be a chrome:// URL
          });
        }).catch(() => {
          // Silently fail - might be a chrome:// URL
        });
      });
    });
  });
  
  // Handle font toggle
  fontToggle.addEventListener("change", () => {
    if (fontToggle.checked) {
      fontOptions.style.display = "block";
      applyFontSettings(fontSelector.value);
    } else {
      fontOptions.style.display = "none";
      applyFontSettings(null);
      
      // Force page refresh when disabling font
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0) {
          chrome.tabs.reload(tabs[0].id);
        }
      });
    }
  });
  
  // Handle font selection changes
  fontSelector.addEventListener("change", () => {
    if (fontToggle.checked) {
      applyFontSettings(fontSelector.value);
      
      // Force page refresh when changing font
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0) {
          chrome.tabs.reload(tabs[0].id);
        }
      });
    }
  });
  
  // Function to apply font settings
  function applyFontSettings(fontName) {
    // Get active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) return;
      
      // Send message to background to apply font
      chrome.runtime.sendMessage({
        command: "setFont",
        font: fontName,
        tabId: tab.id
      });
    });
  }
  
// Handle text size slider changes
textSizeSlider.addEventListener("input", () => {
  textSizeValue.textContent = textSizeSlider.value;
});

textSizeSlider.addEventListener("change", () => {
  // Convert percentage to decimal factor (100% = 1.0)
  const factor = textSizeSlider.value / 100;
  
  // Save the setting
  chrome.storage.local.set({ textSize: factor });
  
  // Apply to active tab using the JavaScript handler
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length) return;
    const tabId = tabs[0].id;
    
    // First ensure the handler script is loaded
    chrome.scripting.executeScript({
      target: { tabId },
      files: ["text-size-handler.js"]
    }).then(() => {
      // Then call the adjustTextSize function
      chrome.scripting.executeScript({
        target: { tabId },
        function: (percentage) => {
          if (typeof adjustTextSize === 'function') {
            adjustTextSize(percentage);
          }
        },
        args: [parseInt(textSizeSlider.value)]
      });
    }).catch((error) => {
      console.log("Text size adjustment error: " + error.message);
    });
  });
});

// Add this to the reset function
// Inside the resetAllButton.addEventListener callback:
// Reset text size using the JavaScript handler
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs.length) return;
  const tabId = tabs[0].id;
  
  chrome.scripting.executeScript({
    target: { tabId },
    files: ["text-size-handler.js"]
  }).then(() => {
    chrome.scripting.executeScript({
      target: { tabId },
      function: () => {
        if (typeof resetTextSize === 'function') {
          resetTextSize();
        }
      }
    });
  }).catch(() => {
    // Silently fail - might be a chrome:// URL
  });
});

  // Handle line spacing slider changes
  lineSpacingSlider.addEventListener("input", () => {
    // Convert slider value (10-30) to factor (1.0-3.0)
    const factor = lineSpacingSlider.value / 10;
    lineSpacingValue.textContent = factor.toFixed(1);
  });
  
  lineSpacingSlider.addEventListener("change", () => {
    // Convert slider value (10-30) to factor (1.0-3.0)
    const factor = lineSpacingSlider.value / 10;
    
    // Save the setting
    chrome.storage.local.set({ lineSpacing: factor });
    
    // Apply CSS variable value
    applyCSSVariable("--line-spacing-factor", factor);
  });
  
  // Handle letter spacing slider changes
  letterSpacingSlider.addEventListener("input", () => {
    letterSpacingValue.textContent = letterSpacingSlider.value;
  });
  
  letterSpacingSlider.addEventListener("change", () => {
    const value = parseInt(letterSpacingSlider.value);
    
    // Save the setting
    chrome.storage.local.set({ letterSpacing: value });
    
    // Apply CSS variable value
    applyCSSVariable("--letter-spacing-value", `${value}px`);
  });
  
  // Handle word spacing slider changes
  wordSpacingSlider.addEventListener("input", () => {
    wordSpacingValue.textContent = wordSpacingSlider.value;
  });
  
  wordSpacingSlider.addEventListener("change", () => {
    const value = parseInt(wordSpacingSlider.value);
    
    // Save the setting
    chrome.storage.local.set({ wordSpacing: value });
    
    // Apply CSS variable value
    applyCSSVariable("--word-spacing-value", `${value}px`);
  });
  
  // Handle column width slider changes
  columnWidthSlider.addEventListener("input", () => {
    columnWidthValue.textContent = columnWidthSlider.value;
  });
  
  columnWidthSlider.addEventListener("change", () => {
    const value = parseInt(columnWidthSlider.value);
    
    // Save the setting
    chrome.storage.local.set({ columnWidth: value });
    
    // Apply CSS variable value
    applyCSSVariable("--column-width-percent", `${value}%`);
  });
  
  // Handle paragraph spacing slider changes
  paragraphSpacingSlider.addEventListener("input", () => {
    // Convert slider value (10-30) to factor (1.0-3.0)
    const factor = paragraphSpacingSlider.value / 10;
    paragraphSpacingValue.textContent = factor.toFixed(1);
  });
  
  paragraphSpacingSlider.addEventListener("change", () => {
    // Convert slider value (10-30) to factor (1.0-3.0)
    const factor = paragraphSpacingSlider.value / 10;
    
    // Save the setting
    chrome.storage.local.set({ paragraphSpacing: factor });
    
    // Apply CSS variable value
    applyCSSVariable("--paragraph-spacing-factor", factor);
  });
  
  // Handle text guide toggle
  textGuideToggle.addEventListener("change", () => {
    const isActive = textGuideToggle.checked;
    
    // Save the setting
    chrome.storage.local.set({ textGuide: isActive });
    
    // Apply the setting
    applyTextSetting("textGuide", isActive);
  });
  
  // Handle high contrast toggle
  highContrastToggle.addEventListener("change", () => {
    const isActive = highContrastToggle.checked;
    
    if (isActive) {
      contrastOptions.style.display = "block";
    } else {
      contrastOptions.style.display = "none";
    }
    
    // Save the setting
    chrome.storage.local.set({ highContrast: isActive });
    
    // Apply the setting
    applyTextSetting("highContrast", isActive);
  });
  
  // Handle contrast selector changes
  contrastSelector.addEventListener("change", () => {
    const mode = contrastSelector.value;
    
    // Save the setting
    chrome.storage.local.set({ contrastMode: mode });
    
    // Apply the setting
    applyTextSetting("contrastMode", mode);
  });
  
  // Function to apply CSS variable settings
  function applyCSSVariable(variableName, value) {
    // Apply to active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length) return;
      const tabId = tabs[0].id;
      
      // Inject text-customization.css if not already present
      chrome.scripting.insertCSS({
        target: { tabId },
        files: ["text-customization.css"]
      }).catch(() => {
        // Silently fail - CSS might already be injected
      }).finally(() => {
        // Update the CSS variable
        chrome.scripting.executeScript({
          target: { tabId },
          function: updateCSSVariable,
          args: [variableName, value]
        }).catch(() => {
          // Silently fail - might be a chrome:// URL
        });
      });
    });
  }
  
  // Function that runs in page context to update CSS variables
  function updateCSSVariable(name, value) {
    document.documentElement.style.setProperty(name, value);
    
    // Force layout recalculation for immediate visual update
    document.body.getBoundingClientRect();
  }
  
  // Function to apply text settings (for boolean toggles)
  function applyTextSetting(setting, value) {
    // Apply to active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length) return;
      const tabId = tabs[0].id;
      
      // Send message to background to apply setting
      chrome.runtime.sendMessage({
        command: "setTextSetting",
        setting: setting,
        value: value,
        tabId: tabId
      });
      
      // Force page update
      forcePageUpdate(tabId);
    });
  }
  
  // Handle reset all button
  resetAllButton.addEventListener("click", () => {
    // Reset to defaults
    chrome.storage.local.set({
      focusMode: "OFF",
      zoomFactor: 1.0,
      fontPreference: "default",
      textSize: 1.0,
      lineSpacing: 1.0,
      letterSpacing: 0,
      wordSpacing: 0, 
      columnWidth: 100,
      paragraphSpacing: 1.0,
      textGuide: false,
      highContrast: false,
      contrastMode: "normal"
    });
    
    // Update badge
    chrome.action.setBadgeText({ text: "OFF" });
    
    // Apply changes to active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        const tabId = tabs[0].id;
        
        // Reset filter
        chrome.runtime.sendMessage({
          command: "setFilter",
          filter: "OFF",
          tabId: tabId
        });
        
        // Reset font
        chrome.runtime.sendMessage({
          command: "setFont",
          font: null,
          tabId: tabId
        });
        
        // Forcibly remove styles using script injection for maximum reliability
        chrome.scripting.executeScript({
          target: { tabId },
          function: () => {
            // Remove any filter styles
            const filterStyle = document.getElementById('eyebrowse-filter-style');
            if (filterStyle) filterStyle.remove();
            
            // Remove any font styles
            const fontStyle = document.getElementById('eyebrowse-font-style');
            if (fontStyle) fontStyle.remove();
            
            // Remove all eyebrowse classes from HTML element
            const html = document.documentElement;
            const allClasses = html.className.split(' ');
            allClasses.forEach(cls => {
              if (cls.startsWith('eyebrowse-')) {
                html.classList.remove(cls);
              }
            });
            
            // Reset all CSS variables
            html.style.removeProperty('--text-size-factor');
            html.style.removeProperty('--line-spacing-factor');
            html.style.removeProperty('--letter-spacing-value');
            html.style.removeProperty('--word-spacing-value');
            html.style.removeProperty('--column-width-percent');
            html.style.removeProperty('--paragraph-spacing-factor');
            
            // Reset zoom
            html.style.setProperty('--zoom-factor', 1.0);
            document.body.style.minHeight = '';
          }
        }).catch(() => {
          // Ignore errors on restricted pages
        });
        
        // Reload the page to ensure all changes take effect
        chrome.tabs.reload(tabId);
      }
    });
    
    // Reset UI
    textSizeSlider.value = 100;
    textSizeValue.textContent = "100";
    lineSpacingSlider.value = 10;
    lineSpacingValue.textContent = "1.0";
    letterSpacingSlider.value = 0;
    letterSpacingValue.textContent = "0";
    wordSpacingSlider.value = 0;
    wordSpacingValue.textContent = "0";
    columnWidthSlider.value = 100;
    columnWidthValue.textContent = "100";
    paragraphSpacingSlider.value = 10;
    paragraphSpacingValue.textContent = "1.0";
    textGuideToggle.checked = false;
    highContrastToggle.checked = false;
    contrastOptions.style.display = "none";
    
    // Reset Vision tab UI
    filterToggle.value = "OFF";
    zoomSlider.value = 100;
    zoomValue.textContent = "100";
    fontToggle.checked = false;
    fontOptions.style.display = "none";
  });
});