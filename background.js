// background.js

// Set the default values when the extension is installed
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({ 
    focusMode: "OFF",
    zoomFactor: 1.0
  });
  chrome.action.setBadgeText({ text: "OFF" });
});

// Function to register the CSS to be injected at document_start on all pages
async function registerFocusModeCSS(cssFile) {
  try {
    await chrome.scripting.registerContentScripts([
      {
        id: "focusModeCSS",
        matches: ["<all_urls>"],
        css: [cssFile],
        runAt: "document_start",
      },
    ]);
  } catch (error) {
    // This may throw an error if already registered; you can safely ignore it
    console.error("Error registering content script:", error);
  }
}

// Function to unregister the dynamically registered CSS content script
async function unregisterFocusModeCSS() {
  try {
    await chrome.scripting.unregisterContentScripts({ ids: ["focusModeCSS"] });
  } catch (error) {
    console.error("Error unregistering content script:", error);
  }
}

// Listen for clicks on the extension icon to toggle focus mode
chrome.action.onClicked.addListener(async (tab) => {
  // Ignore chrome:// URLs as they cannot be modified
  if (tab.url.startsWith("chrome://")) return;
  
  // Retrieve the current focus mode from storage (default OFF)
  const { focusMode: prevState = "OFF" } = await chrome.storage.local.get("focusMode");
  const nextState = prevState === "ON" ? "OFF" : "ON";
  
  // Update storage with the new state and update the badge for the current tab
  await chrome.storage.local.set({ focusMode: nextState });
  await chrome.action.setBadgeText({
    tabId: tab.id,
    text: nextState,
  });
  
  if (nextState === "ON") {
    // Register the CSS injection for future navigations (applied at document_start)
    await registerFocusModeCSS("focus-mode.css");
    // Immediately insert CSS into the current tab
    await chrome.scripting.insertCSS({
      files: ["focus-mode.css"],
      target: { tabId: tab.id },
    });
  } else {
    // Unregister the dynamic CSS injection and remove the CSS from the current tab
    await unregisterFocusModeCSS();
    await chrome.scripting.removeCSS({
      files: ["focus-mode.css"],
      target: { tabId: tab.id },
    });
  }
});

// Listen for tab updates to apply the saved settings to new page loads
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only apply when the page has finished loading
  if (changeInfo.status === 'complete') {
    try {
      // Get current settings
      const { focusMode, zoomFactor } = await chrome.storage.local.get([
        "focusMode", 
        "zoomFactor"
      ]);
      
      // Apply zoom settings if available
      if (zoomFactor) {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["page-zoom.js"],
        }).catch(err => console.log("Script may already be injected:", err));
        
        // Send the message to update page zoom
        chrome.tabs.sendMessage(tabId, {
          command: "setPageZoom",
          factor: zoomFactor
        }).catch(err => console.log("Message sending error:", err));
      }
    } catch (error) {
      console.error("Error applying settings to updated tab:", error);
    }
  }
});