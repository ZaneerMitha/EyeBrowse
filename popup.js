document.addEventListener("DOMContentLoaded", () => {
  const filterToggle = document.getElementById("filterToggle");
  const zoomSlider = document.getElementById("zoomSlider");
  const zoomValue = document.getElementById("zoomValue");

  // Mapping of filter states to their corresponding CSS files
  const cssMapping = {
    "GRAYSCALE": "focus-mode.css",
    "PROTANOPIA": "protanopia.css",
    "DEUTERANOPIA": "deuteranopia.css",
    "TRITANOPIA": "tritanopia.css"
  };

  // List of all possible filter CSS files
  const filterCSSFiles = Object.values(cssMapping);

  // Initialize the UI based on stored states
  chrome.storage.local.get(["focusMode", "zoomFactor"], (result) => {
    // Initialize filter dropdown
    const filterState = result.focusMode || "OFF";
    filterToggle.value = filterState;

    // Initialize zoom slider
    const zoomFactor = result.zoomFactor || 1.0;
    zoomSlider.value = zoomFactor * 100;
    zoomValue.textContent = zoomSlider.value;
  });

  // Handle filter changes
  filterToggle.addEventListener("change", async () => {
    const nextState = filterToggle.value;

    // Save the new state in storage
    await chrome.storage.local.set({ focusMode: nextState });

    // Update the active tab immediately
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs.length) return;
      const tabId = tabs[0].id;

      // Update badge text for visual feedback
      chrome.action.setBadgeText({ tabId, text: nextState });

      // Remove any previously injected filter CSS from the active tab
      for (const cssFile of filterCSSFiles) {
        try {
          await chrome.scripting.removeCSS({
            target: { tabId },
            files: [cssFile],
          });
        } catch (error) {
          // If the CSS wasn't present, ignore the error
          console.error(`Error removing ${cssFile}:`, error);
        }
      }

      // If a filter is selected, insert the corresponding CSS file immediately
      if (nextState !== "OFF") {
        const cssFile = cssMapping[nextState];
        await chrome.scripting.insertCSS({
          target: { tabId },
          files: [cssFile],
        });
      }
    });
  });

  // Handle zoom slider changes
  zoomSlider.addEventListener("input", () => {
    // Update the displayed value immediately while dragging
    zoomValue.textContent = zoomSlider.value;
  });

  zoomSlider.addEventListener("change", async () => {
    // Convert percentage to decimal factor (100% = 1.0)
    const factor = zoomSlider.value / 100;
    
    // Save the setting
    await chrome.storage.local.set({ zoomFactor: factor });
    
    // Apply to the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs.length) return;
      const tabId = tabs[0].id;

      // Execute the content script if it's not already injected
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["page-zoom.js"],
        // This will attempt to inject the script if not already present
      }).catch(err => console.error("Script injection error:", err));

      // Send message to the content script to update zoom
      chrome.tabs.sendMessage(tabId, {
        command: "setPageZoom",
        factor: factor
      });
    });
  });
});