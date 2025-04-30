chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // First-time installation - set initial values
    chrome.storage.local.set({
      userSetup: false, // Flag to indicate setup needs to be completed
      focusMode: "OFF",
      zoomFactor: 1.0,
      fontPreference: "default",
      textSize: "OFF",
      lineSpacing: "OFF",
      letterSpacing: "OFF",
      wordSpacing: "OFF",
      columnWidth: "OFF",
      paragraphSpacing: "OFF",
    });
    chrome.action.setBadgeText({ text: "OFF" });

    // Open setup page for first-time users
    chrome.tabs.create({ url: "setup.html" });
  }
});

// Check if this is first run or needs setup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get("userSetup", (result) => {
    // If user hasn't completed setup, open the setup page
    if (result.userSetup === false) {
      chrome.tabs.create({ url: "setup.html" });
    }
  });
});

// Mapping of filter types to CSS files
const filterMapping = {
  GRAYSCALE: "filters/grayscale.css",
  PROTANOPIA: "filters/protanopia.css",
  DEUTERANOPIA: "filters/deuteranopia.css",
  TRITANOPIA: "filters/tritanopia.css",
  DARK: "filters/dark-mode.css",
};

// Mapping of font types to CSS files
const fontMapping = {
  opendyslexic: "fonts/opendyslexic.css",
  arial: "fonts/arial.css",
  "comic-sans": "fonts/comic-sans.css",
};

// Add this to your background.js file

// Add a new message handler for applying all settings at once
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "applyAllSettings") {
    const tabId = message.tabId;

    if (tabId) {
      // Get all the settings
      chrome.storage.local.get(
        [
          "focusMode",
          "zoomFactor",
          "fontPreference",
          "textSize",
          "lineSpacing",
          "letterSpacing",
          "wordSpacing",
          "columnWidth",
          "paragraphSpacing",
        ],
        (settings) => {
          // Apply filter if active
          if (settings.focusMode && settings.focusMode !== "OFF") {
            applyFilterToTab(settings.focusMode, tabId);
          }

          // Apply font settings if active
          if (
            settings.fontPreference &&
            settings.fontPreference !== "default"
          ) {
            applyFontToTab(settings.fontPreference, tabId);
          }

          // Apply zoom settings if set
          if (settings.zoomFactor && settings.zoomFactor !== 1.0) {
            chrome.tabs
              .sendMessage(tabId, {
                command: "setPageZoom",
                factor: settings.zoomFactor,
              })
              .catch(() => {
                // If error, try to inject the script first
                chrome.scripting
                  .executeScript({
                    target: { tabId },
                    files: ["page-zoom.js"],
                  })
                  .then(() => {
                    chrome.tabs.sendMessage(tabId, {
                      command: "setPageZoom",
                      factor: settings.zoomFactor,
                    });
                  })
                  .catch((error) => {
                    console.error("Error setting zoom:", error);
                  });
              });
          }

          // Apply text size if set
          if (settings.textSize && settings.textSize !== 1.0) {
            chrome.scripting
              .executeScript({
                target: { tabId },
                files: ["text-size-handler.js"],
              })
              .then(() => {
                chrome.scripting.executeScript({
                  target: { tabId },
                  function: (percentage) => {
                    if (typeof adjustTextSize === "function") {
                      adjustTextSize(percentage);
                    }
                  },
                  args: [Math.round(settings.textSize * 100)],
                });
              })
              .catch((error) => {
                console.error("Error setting text size:", error);
              });
          }

          // Apply text customization settings if any are active
          if (hasActiveTextSettings(settings)) {
            applyAllTextSettings(settings, tabId);
          }
        }
      );
    }

    sendResponse({ success: true });
    return true;
  }
});

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
  } else if (message.command === "setFont") {
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
  } else if (message.command === "setTextSetting") {
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
  } else if (message.command === "openSetup") {
    // Command to open setup page
    chrome.tabs.create({ url: "setup.html" });
    sendResponse({ success: true });
  } else if (message.command === "resetSettings") {
    // Reset all settings to default
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
      contrastMode: "normal",
    });
    chrome.action.setBadgeText({ text: "OFF" });

    // Apply reset to current tab if ID provided
    if (message.tabId) {
      resetAllSettingsForTab(message.tabId);
    }

    sendResponse({ success: true });
  } else if (message.command === "openSetup") {
    // Track whether this is a rerun
    const isRerun = message.rerun === true;

    if (isRerun) {
      chrome.storage.local.set({ setupRerun: true });
    }

    chrome.tabs.create({ url: "setup.html" });
    sendResponse({ success: true });
  }

  function handleSetupRerun() {
    chrome.storage.local.get("setupRerun", (result) => {
      if (result.setupRerun === true) {
        chrome.storage.local.remove("setupRerun");
      }
    });
  }

  // Call this function when the setup page is loaded
  // You can trigger this by adding this to your chrome.tabs.onUpdated listener:
  if (tab.url && tab.url.includes("setup.html")) {
    handleSetupRerun();
  }

  return true;
});


// Function to reset all settings for a tab
function resetAllSettingsForTab(tabId) {
  // Reset filter
  chrome.scripting
    .executeScript({
      target: { tabId: tabId },
      files: ["filter-manager.js"],
    })
    .then(() => {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: () => {
          if (window.EyeBrowseFilterManager) {
            window.EyeBrowseFilterManager.removeFilter();
          }
        },
      });
    })
    .catch((error) => {
      console.error("Error resetting filter:", error);
    });

  // Reset font
  chrome.scripting
    .executeScript({
      target: { tabId: tabId },
      files: ["font-manager.js"],
    })
    .then(() => {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: () => {
          if (window.EyeBrowseFontManager) {
            window.EyeBrowseFontManager.removeFont();
          }
        },
      });
    })
    .catch((error) => {
      console.error("Error resetting font:", error);
    });

  // Reset text size
  chrome.scripting
    .executeScript({
      target: { tabId: tabId },
      files: ["text-size-handler.js"],
    })
    .then(() => {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: () => {
          if (typeof resetTextSize === "function") {
            resetTextSize();
          }
        },
      });
    })
    .catch((error) => {
      console.error("Error resetting text size:", error);
    });

  // Reset zoom
  chrome.tabs
    .sendMessage(tabId, {
      command: "setPageZoom",
      factor: 1.0,
    })
    .catch(() => {
      // If that fails, try injecting the script first
      chrome.scripting
        .executeScript({
          target: { tabId: tabId },
          files: ["page-zoom.js"],
        })
        .then(() => {
          chrome.tabs.sendMessage(tabId, {
            command: "setPageZoom",
            factor: 1.0,
          });
        })
        .catch((error) => {
          console.error("Error resetting zoom:", error);
        });
    });

  // Reset CSS variables
  chrome.scripting
    .executeScript({
      target: { tabId: tabId },
      function: () => {
        // Remove all CSS variables
        const root = document.documentElement;
        root.style.removeProperty("--text-size-factor");
        root.style.removeProperty("--line-spacing-factor");
        root.style.removeProperty("--letter-spacing-value");
        root.style.removeProperty("--word-spacing-value");
        root.style.removeProperty("--column-width-percent");
        root.style.removeProperty("--paragraph-spacing-factor");

        // Remove any text-related classes
        root.classList.remove(
          "eyebrowse-text-guide",
          "eyebrowse-high-contrast-text",
          "eyebrowse-high-contrast-text-inverted"
        );
      },
    })
    .catch((error) => {
      console.error("Error resetting CSS variables:", error);
    });
}

// Function to apply filter to tab using filter manager
function applyFilterToTab(filter, tabId) {
  // First ensure the filter manager is loaded
  chrome.scripting
    .executeScript({
      target: { tabId: tabId },
      files: ["filter-manager.js"],
    })
    .then(() => {
      // Then call the appropriate filter manager function
      if (filter === "OFF") {
        // For Normal Vision, explicitly remove all filters
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          function: () => {
            if (window.EyeBrowseFilterManager) {
              window.EyeBrowseFilterManager.removeFilter();
            }
          },
        });
      } else {
        // For other filters, apply the selected filter
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          function: (filterType) => {
            if (window.EyeBrowseFilterManager) {
              window.EyeBrowseFilterManager.applyFilter(filterType);
            }
          },
          args: [filter],
        });
      }
    })
    .catch((error) => {
      console.error("Error applying filter:", error);
    });
}

// Function that runs in page context to clear filters
function clearFilter() {
  // Remove any directly injected CSS
  const filterStyle = document.getElementById("eyebrowse-filter-style");
  if (filterStyle) {
    filterStyle.remove();
  }

  // Try to remove image filters using the color-filter-handler if it exists
  if (typeof removeColorFiltersFromImages === "function") {
    removeColorFiltersFromImages();
  } else {
    // Fallback - reset filter on all images
    const mediaElements = document.querySelectorAll(
      'img, video, canvas, svg, [style*="background-image"]'
    );
    mediaElements.forEach((element) => {
      element.style.filter = "none";
    });
  }
}

// Function to apply color filters using the handler script
function applyColorFilter(filterType) {
  // Check if the handler script was loaded
  if (typeof applyColorFilterToImages === "function") {
    applyColorFilterToImages(filterType);
  } else {
    console.error("Color filter handler script not loaded");
  }
}

// Function to apply font to tab
function applyFontToTab(font, tabId) {
  // Remove any existing font CSS
  chrome.scripting
    .executeScript({
      target: { tabId: tabId },
      function: removeFontCSS,
    })
    .catch(() => {
      // Ignore errors
    });

  // Apply new font if not default
  if (font && font !== "default") {
    // First try to load the font manager
    chrome.scripting
      .executeScript({
        target: { tabId: tabId },
        files: ["font-manager.js"],
      })
      .then(() => {
        // Then call the applyFont function
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          function: (fontName) => {
            if (window.EyeBrowseFontManager) {
              window.EyeBrowseFontManager.applyFont(fontName);
            }
          },
          args: [font],
        });
      })
      .catch((error) => {
        console.error("Error applying font with manager:", error);

        // Fallback to standard font CSS approach
        if (fontMapping[font]) {
          const cssFile = fontMapping[font];

          // Try to insert CSS using the API
          chrome.scripting
            .insertCSS({
              target: { tabId: tabId },
              files: [cssFile],
            })
            .catch((error) => {
              console.log(
                "CSS injection error, trying alternative method: " +
                  error.message
              );

              // If that fails, inject CSS content directly
              chrome.scripting
                .executeScript({
                  target: { tabId: tabId },
                  function: insertCSSFromExtension,
                  args: [cssFile, "eyebrowse-font-style"],
                })
                .catch((error) => {
                  console.log("Script injection error: " + error.message);
                });
            });
        } else {
          // Fallback for any font not in our mapping
          chrome.scripting
            .executeScript({
              target: { tabId: tabId },
              function: applyGenericFont,
              args: [font],
            })
            .catch((error) => {
              console.log("Script injection error: " + error.message);
            });
        }
      });

    // Also add the class to the HTML element for additional styling
    chrome.scripting
      .executeScript({
        target: { tabId: tabId },
        function: addFontClass,
        args: [font],
      })
      .catch(() => {
        // Ignore errors
      });
  }
}

// Function to apply text settings with special handling for text size
function applyTextSettingToTab(setting, value, tabId) {
  // Special handling for text size - use JavaScript approach
  if (setting === "textSize") {
    // First ensure text-size-handler.js is loaded
    chrome.scripting
      .executeScript({
        target: { tabId: tabId },
        files: ["text-size-handler.js"],
      })
      .then(() => {
        // Then call the adjustTextSize function
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          function: callAdjustTextSize,
          args: [Math.round(value * 100)], // Convert decimal to percentage
        });
      })
      .catch((error) => {
        console.log("Script injection error: " + error.message);
      });
    return;
  }

  // Handle other text settings using CSS approach
  // First make sure text-customization.css is loaded
  chrome.scripting
    .insertCSS({
      target: { tabId: tabId },
      files: ["text-customization.css"],
    })
    .catch((error) => {
      console.log("CSS injection error: " + error.message);
    });

  // Handle boolean toggles with class-based approach
  if (
    setting === "textGuide" ||
    setting === "highContrast" ||
    setting === "contrastMode"
  ) {
    chrome.scripting
      .executeScript({
        target: { tabId: tabId },
        function: updateTextSetting,
        args: [setting, value],
      })
      .catch((error) => {
        console.log("Script injection error: " + error.message);
      });
  }
  // Handle other numeric settings with CSS variables
  else {
    let cssVarName = "";
    let cssVarValue = "";

    switch (setting) {
      case "lineSpacing":
        cssVarName = "--line-spacing-factor";
        cssVarValue = value;
        break;
      case "letterSpacing":
        cssVarName = "--letter-spacing-value";
        cssVarValue = `${value}px`;
        break;
      case "wordSpacing":
        cssVarName = "--word-spacing-value";
        cssVarValue = `${value}px`;
        break;
      case "columnWidth":
        cssVarName = "--column-width-percent";
        cssVarValue = `${value}%`;
        break;
      case "paragraphSpacing":
        cssVarName = "--paragraph-spacing-factor";
        cssVarValue = value;
        break;
    }

    if (cssVarName) {
      chrome.scripting
        .executeScript({
          target: { tabId: tabId },
          function: updateCSSVariable,
          args: [cssVarName, cssVarValue],
        })
        .catch((error) => {
          console.log("Script injection error: " + error.message);
        });
    }
  }
}

// Function that calls the adjustTextSize function from text-size-handler.js
function callAdjustTextSize(percentage) {
  if (typeof adjustTextSize === "function") {
    adjustTextSize(percentage);
  } else {
    console.error("Text size handler not loaded");
  }
}

// Function to apply all text settings to a tab - updated for JS text handling
function applyAllTextSettings(settings, tabId) {
  // Apply text size using JavaScript
  if (settings.textSize && settings.textSize !== 1.0) {
    chrome.scripting
      .executeScript({
        target: { tabId: tabId },
        files: ["text-size-handler.js"],
      })
      .then(() => {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          function: callAdjustTextSize,
          args: [Math.round(settings.textSize * 100)],
        });
      })
      .catch((error) => {
        console.log("Script injection error: " + error.message);
      });
  }

  // First load CSS if any other setting is active
  if (hasActiveTextSettings(settings)) {
    chrome.scripting
      .insertCSS({
        target: { tabId: tabId },
        files: ["text-customization.css"],
      })
      .catch((error) => {
        console.log("CSS injection error: " + error.message);
      });

    // Apply CSS variables for numeric settings in a single script execution
    chrome.scripting
      .executeScript({
        target: { tabId: tabId },
        function: applyAllCSSVariables,
        args: [
          {
            lineSpacing: settings.lineSpacing || 1.0,
            letterSpacing: settings.letterSpacing || 0,
            wordSpacing: settings.wordSpacing || 0,
            columnWidth: settings.columnWidth || 100,
            paragraphSpacing: settings.paragraphSpacing || 1.0,
          },
        ],
      })
      .catch((error) => {
        console.log("Script injection error: " + error.message);
      });

    // Apply toggle-based settings
    if (settings.textGuide === true) {
      applyTextSettingToTab("textGuide", true, tabId);
    }

    if (settings.highContrast === true) {
      applyTextSettingToTab("highContrast", true, tabId);
      applyTextSettingToTab(
        "contrastMode",
        settings.contrastMode || "normal",
        tabId
      );
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
    root.style.setProperty("--text-size-factor", settings.textSize);
  }

  if (settings.lineSpacing) {
    root.style.setProperty("--line-spacing-factor", settings.lineSpacing);
  }

  if (settings.letterSpacing !== undefined) {
    root.style.setProperty(
      "--letter-spacing-value",
      `${settings.letterSpacing}px`
    );
  }

  if (settings.wordSpacing !== undefined) {
    root.style.setProperty("--word-spacing-value", `${settings.wordSpacing}px`);
  }

  if (settings.columnWidth) {
    root.style.setProperty(
      "--column-width-percent",
      `${settings.columnWidth}%`
    );
  }

  if (settings.paragraphSpacing) {
    root.style.setProperty(
      "--paragraph-spacing-factor",
      settings.paragraphSpacing
    );
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
  links.forEach((link) => link.remove());
}

// Function that runs in page context to remove font CSS
function removeFontCSS() {
  // Remove any font classes from HTML element
  document.documentElement.classList.remove(
    "eyebrowse-opendyslexic",
    "eyebrowse-arial",
    "eyebrowse-comic-sans"
  );

  // Remove any font style elements
  const styleEl = document.getElementById("eyebrowse-font-style");
  if (styleEl) {
    styleEl.remove();
  }
}

// Function to add a font class to the HTML element
function addFontClass(fontName) {
  document.documentElement.classList.add("eyebrowse-" + fontName);
}

// Function to apply a generic font style
function applyGenericFont(fontName) {
  let styleEl = document.getElementById("eyebrowse-font-style");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "eyebrowse-font-style";
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
  switch (setting) {
    case "textSize":
      html.classList.remove(
        "eyebrowse-text-size-large",
        "eyebrowse-text-size-larger",
        "eyebrowse-text-size-largest"
      );
      break;
    case "lineSpacing":
      html.classList.remove(
        "eyebrowse-line-spacing-loose",
        "eyebrowse-line-spacing-looser",
        "eyebrowse-line-spacing-loosest"
      );
      break;
    case "letterSpacing":
      html.classList.remove(
        "eyebrowse-letter-spacing-wide",
        "eyebrowse-letter-spacing-wider",
        "eyebrowse-letter-spacing-widest"
      );
      break;
    case "wordSpacing":
      html.classList.remove(
        "eyebrowse-word-spacing-wide",
        "eyebrowse-word-spacing-wider",
        "eyebrowse-word-spacing-widest"
      );
      break;
    case "columnWidth":
      html.classList.remove(
        "eyebrowse-column-width-narrow",
        "eyebrowse-column-width-narrower",
        "eyebrowse-column-width-narrowest"
      );
      break;
    case "paragraphSpacing":
      html.classList.remove(
        "eyebrowse-paragraph-spacing-loose",
        "eyebrowse-paragraph-spacing-looser",
        "eyebrowse-paragraph-spacing-loosest"
      );
      break;
  }

  // Add new class if value is not OFF
  if (value && value !== "OFF" && value !== false) {
    switch (setting) {
      case "textSize":
        html.classList.add(`eyebrowse-text-size-${value}`);
        break;
      case "lineSpacing":
        html.classList.add(`eyebrowse-line-spacing-${value}`);
        break;
      case "letterSpacing":
        html.classList.add(`eyebrowse-letter-spacing-${value}`);
        break;
      case "wordSpacing":
        html.classList.add(`eyebrowse-word-spacing-${value}`);
        break;
      case "columnWidth":
        html.classList.add(`eyebrowse-column-width-${value}`);
        break;
      case "paragraphSpacing":
        html.classList.add(`eyebrowse-paragraph-spacing-${value}`);
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
    styleEl = document.createElement("style");
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  // Use a fetch via the extension URL to get the CSS content
  fetch(chrome.runtime.getURL(cssFile))
    .then((response) => response.text())
    .then((css) => {
      styleEl.textContent = css;
    })
    .catch((error) => {
      console.error("Failed to load CSS: " + error);
    });
}

// Function to apply all settings from setup to a tab
function applyAllSettingsFromSetup(tabId) {
  chrome.storage.local.get(
    [
      "focusMode",
      "zoomFactor",
      "fontPreference",
      "textSize",
      "lineSpacing",
      "letterSpacing",
      "wordSpacing",
      "columnWidth",
      "paragraphSpacing",
    ],
    (settings) => {
      // Only proceed if user has completed setup
      if (settings.focusMode !== undefined) {
        // Apply filter if active
        if (settings.focusMode !== "OFF") {
          applyFilterToTab(settings.focusMode, tabId);
        }

        // Apply font settings if active
        if (settings.fontPreference && settings.fontPreference !== "default") {
          applyFontToTab(settings.fontPreference, tabId);
        }

        // Apply zoom if set
        if (settings.zoomFactor && settings.zoomFactor !== 1.0) {
          chrome.scripting
            .executeScript({
              target: { tabId },
              function: (factor) => {
                // Set zoom factor
                document.documentElement.style.setProperty(
                  "--zoom-factor",
                  factor
                );

                // Update body size to compensate for the scaling
                document.body.style.minHeight = `calc(100vh / ${factor})`;
              },
              args: [settings.zoomFactor],
            })
            .catch(() => {
              // Ignore errors on restricted pages
            });
        }

        // Apply text settings if any are active
        if (hasActiveTextSettings(settings)) {
          applyAllTextSettings(settings, tabId);
        }
      }
    }
  );
}

// Listen for tab updates to apply settings to new page loads
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only apply when the page has finished loading and isn't a chrome:// URL
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    !tab.url.startsWith("chrome:")
  ) {
    // Check if user has completed setup
    chrome.storage.local.get("userSetup", (result) => {
      // Apply settings automatically if setup is completed
      if (result.userSetup === true) {
        // Get all settings and apply them
        applyAllSettingsFromSetup(tabId);
      }
      // If setup is not completed but not explicitly false, check all settings
      else if (result.userSetup !== false) {
        // Get current settings
        chrome.storage.local.get(
          [
            "focusMode",
            "zoomFactor",
            "fontPreference",
            "textSize",
            "lineSpacing",
            "letterSpacing",
            "wordSpacing",
            "columnWidth",
            "paragraphSpacing",
          ],
          (settings) => {
            try {
              // Apply zoom settings if available
              if (settings.zoomFactor) {
                chrome.scripting
                  .executeScript({
                    target: { tabId },
                    function: (factor) => {
                      // Try to communicate with the page-zoom.js content script
                      try {
                        chrome.runtime.sendMessage({
                          command: "setPageZoom",
                          factor: factor,
                        });
                      } catch (e) {
                        // If content script communication fails, update CSS variable directly
                        document.documentElement.style.setProperty(
                          "--zoom-factor",
                          factor
                        );
                      }
                    },
                    args: [settings.zoomFactor],
                  })
                  .catch(() => {
                    // Ignore errors - script might not be allowed on this page
                  });
              }

              // Apply filter if active
              if (settings.focusMode && settings.focusMode !== "OFF") {
                applyFilterToTab(settings.focusMode, tabId);
              }

              // Apply font settings if active
              if (
                settings.fontPreference &&
                settings.fontPreference !== "default"
              ) {
                applyFontToTab(settings.fontPreference, tabId);
              }

              // Apply each text setting
              applyAllTextSettings(settings, tabId);
            } catch (error) {
              console.error("Error applying settings: " + error.message);
            }
          }
        );
      }
    });
  }
});
