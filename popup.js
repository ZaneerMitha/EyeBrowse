// State for setup wizard
let currentSetupStep = 0;
const setupConfig = {
  colorVision: "none",
  readingDifficulties: [],
  fontPreference: "default",
  brightnessSensitivity: 5,
  textSize: 100,
  darkMode: false,
};

let speechSynthesis = window.speechSynthesis;
let ttsVoices = [];

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
  const paragraphSpacingSlider = document.getElementById(
    "paragraphSpacingSlider"
  );
  const paragraphSpacingValue = document.getElementById(
    "paragraphSpacingValue"
  );

  // Text Tab toggles
  const textGuideToggle = document.getElementById("textGuideToggle");
  const highContrastToggle = document.getElementById("highContrastToggle");
  const contrastSelector = document.getElementById("contrastSelector");
  const contrastOptions = document.getElementById("contrastOptions");

  // Tabs
  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");

  // Main view containers
  const regularPopup = document.getElementById("regular-popup");
  const setupWizard = document.getElementById("setup-wizard");
  const setupComplete = document.getElementById("setup-complete");

  // Button elements
  const resetAllButton = document.getElementById("resetAll");
  const runSetupWizardButton = document.getElementById("runSetupWizard");

  // Setup wizard elements
  const setupSteps = document.querySelectorAll(".setup-step");
  const setupBackButton = document.getElementById("setup-back");
  const setupNextButton = document.getElementById("setup-next");
  const setupFinishButton = document.getElementById("setup-finish");
  const setupCancelButton = document.getElementById("setup-cancel");
  const setupCompleteButton = document.getElementById("setup-complete-done");

  // Setup wizard step-specific elements
  const optionCards = document.querySelectorAll(".option-card");
  const setupFontSelector = document.getElementById("setup-font-preference");
  const setupFontPreview = document.getElementById("setup-font-preview");
  const setupTextSize = document.getElementById("setup-text-size");
  const setupTextSizeValue = document.getElementById("setup-text-size-value");
  const setupTextSizePreview = document.getElementById(
    "setup-text-size-preview"
  );
  const setupBrightnessSensitivity = document.getElementById(
    "setup-brightness-sensitivity"
  );
  const setupDarkMode = document.getElementById("setup-dark-mode");
  const readingCheckboxes = document.querySelectorAll('input[name="reading"]');

  // Text-to-Speech UI elements
  const ttsToggle = document.getElementById("ttsToggle");
  const ttsOptions = document.getElementById("ttsOptions");
  const ttsRateSlider = document.getElementById("ttsRateSlider");
  const ttsRateValue = document.getElementById("ttsRateValue");
  const ttsPitchSlider = document.getElementById("ttsPitchSlider");
  const ttsPitchValue = document.getElementById("ttsPitchValue");
  const ttsVoiceSelector = document.getElementById("ttsVoiceSelector");
  const ttsStartButton = document.getElementById("ttsStartReading");
  const ttsStopButton = document.getElementById("ttsStopReading");

  const screenReaderToggle = document.getElementById("screenReaderToggle");
  const screenReaderInfo = document.getElementById("screenReaderInfo");

  const languageSelector = document.getElementById("languageSelector");

  const setupLanguageSelector = document.getElementById(
    "setupLanguageSelector"
  );

  const ttsHoverToggle = document.getElementById("ttsHoverToggle");

  // Initialize TTS hover option
  if (ttsHoverToggle) {
    chrome.storage.local.get("ttsHoverEnabled", (result) => {
      ttsHoverToggle.checked = result.ttsHoverEnabled === true;
    });

    // Handle hover toggle change
    ttsHoverToggle.addEventListener("change", () => {
      const isEnabled = ttsHoverToggle.checked;

      // Save setting
      chrome.storage.local.set({ ttsHoverEnabled: isEnabled });

      // Apply to active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs.length) return;
        const tabId = tabs[0].id;

        // Send message to toggle hover TTS
        chrome.tabs
          .sendMessage(tabId, {
            command: "toggleHoverTTS",
            enable: isEnabled,
          })
          .catch((error) => {
            // If error, try to inject the script first
            chrome.scripting
              .executeScript({
                target: { tabId: tabId },
                files: ["tts-content.js"],
              })
              .then(() => {
                // Try again after script is injected
                chrome.tabs.sendMessage(tabId, {
                  command: "toggleHoverTTS",
                  enable: isEnabled,
                });
              })
              .catch((error) =>
                console.log("Error injecting TTS script:", error)
              );
          });
      });
    });
  }

  // Handle language switch in setup wizard
  if (setupLanguageSelector) {
    // Initialize with current language when setup wizard is shown
    runSetupWizardButton.addEventListener("click", function () {
      // Load current language for setup wizard
      chrome.storage.local.get("uiLanguage", (result) => {
        if (result.uiLanguage) {
          setupLanguageSelector.value = result.uiLanguage;
        }
      });
    });

    // Handle language change in setup wizard
    setupLanguageSelector.addEventListener("change", function () {
      const language = setupLanguageSelector.value;

      // Save preference
      chrome.storage.local.set({ uiLanguage: language });

      // Apply translation
      applyTranslation(language);

      // Also update the main popup language selector to stay in sync
      const mainLanguageSelector = document.getElementById("languageSelector");
      if (mainLanguageSelector) {
        mainLanguageSelector.value = language;
      }
    });
  }

  // Load available translations
  let translations = {};

  // Initialize with current language
  let currentLanguage = "en";

  // Load saved language preference
  chrome.storage.local.get("uiLanguage", (result) => {
    if (result.uiLanguage) {
      currentLanguage = result.uiLanguage;
      if (languageSelector) languageSelector.value = currentLanguage;
      applyTranslation(currentLanguage);
    }
  });

  // Handle language change
  if (languageSelector) {
    languageSelector.addEventListener("change", function () {
      const language = languageSelector.value;

      // Save preference
      chrome.storage.local.set({ uiLanguage: language });

      // Apply translation
      applyTranslation(language);
    });
  }

  // Load translations
  function loadTranslations() {
    fetch(chrome.runtime.getURL("translations.json"))
      .then((response) => response.json())
      .then((data) => {
        translations = data;
        applyTranslation(currentLanguage);
      })
      .catch((error) => {
        console.error("Error loading translations:", error);
      });
  }

  // Apply translation to UI
  function applyTranslation(language) {
    currentLanguage = language;

    // If translations not loaded yet or language not available, use English
    if (!translations || !translations[language]) {
      if (language !== "en") {
        // Try to load translations if not loaded yet
        loadTranslations();
      }
      return;
    }

    // Get all elements with data-i18n attribute
    const elements = document.querySelectorAll("[data-i18n]");

    // Update text for each element
    elements.forEach((element) => {
      const key = element.getAttribute("data-i18n");

      if (translations[language][key]) {
        // Special handling for elements with HTML
        if (element.innerHTML.includes("<")) {
          // Only replace text nodes, not HTML
          const translatedText = translations[language][key];

          // Find and update any child text nodes
          let childNodes = element.childNodes;
          for (let i = 0; i < childNodes.length; i++) {
            if (childNodes[i].nodeType === Node.TEXT_NODE) {
              childNodes[i].nodeValue = translatedText;
              break;
            }
          }
        } else {
          // Simple text replacement
          element.textContent = translations[language][key];
        }
      }
    });

    // Update button texts
    updateButtonTexts(language);

    // Update aria-labels
    updateAriaLabels(language);

    updateSetupStepText(language);
  }

  // Function to update setup wizard step text
  function updateSetupStepText(language) {
    // Only proceed if translations are loaded
    if (!translations[language]) return;

    // Get current setup step
    const setupSteps = document.querySelectorAll(".setup-step");
    if (!setupSteps.length) return;

    // Find which step is active
    let activeStep = 0;
    setupSteps.forEach((step, index) => {
      if (step.classList.contains("active")) {
        activeStep = index;
      }
    });

    // Update step text
    const stepText = document.querySelector(".progress-indicator .sr-only");
    if (stepText) {
      const stepTemplate =
        translations[language]["step_x_of_y"] || "Step {0} of {1}";
      const totalSteps = setupSteps.length;
      stepText.textContent = stepTemplate
        .replace("{0}", activeStep + 1)
        .replace("{1}", totalSteps);
    }
  }

  // Update button texts
  function updateButtonTexts(language) {
    if (!translations[language]) return;

    // Common buttons
    const buttons = {
      resetAll: translations[language]["reset_all"] || "Reset All",
      runSetupWizard: translations[language]["setup_wizard"] || "Setup Wizard",
      setupNext: translations[language]["next"] || "Next",
      setupBack: translations[language]["back"] || "Back",
      setupFinish: translations[language]["finish"] || "Finish Setup",
      setupCancel: translations[language]["cancel"] || "Cancel",
      setupCompleteDone: translations[language]["done"] || "Done",
      ttsStartReading:
        translations[language]["start_reading"] || "Start Reading",
      ttsStopReading: translations[language]["stop"] || "Stop",
    };

    // Update each button
    Object.keys(buttons).forEach((id) => {
      const button = document.getElementById(id);
      if (button) button.textContent = buttons[id];
    });
  }

  // Update aria-labels
  function updateAriaLabels(language) {
    if (!translations[language] || !translations[language].aria) return;

    const ariaLabels = translations[language].aria;

    // Update elements with aria-label
    Object.keys(ariaLabels).forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        element.setAttribute("aria-label", ariaLabels[selector]);
      });
    });
  }

  // Load translations on startup
  loadTranslations();

  // Initialize screen reader support
  if (screenReaderToggle) {
    chrome.storage.local.get("screenReaderImprovements", (result) => {
      screenReaderToggle.checked = result.screenReaderImprovements === true;

      // Show info if enabled
      if (screenReaderInfo) {
        screenReaderInfo.style.display = screenReaderToggle.checked
          ? "block"
          : "none";
      }
    });

    // Handle toggle change
    screenReaderToggle.addEventListener("change", () => {
      const isEnabled = screenReaderToggle.checked;

      // Save setting
      chrome.storage.local.set({ screenReaderImprovements: isEnabled });

      // Show/hide info
      if (screenReaderInfo) {
        screenReaderInfo.style.display = isEnabled ? "block" : "none";
      }

      // Apply to active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs.length) return;
        const tabId = tabs[0].id;

        // Inject content script if needed
        if (isEnabled) {
          chrome.scripting
            .executeScript({
              target: { tabId: tabId },
              files: ["screen-reader-support.js"],
            })
            .catch((error) =>
              console.log("Error injecting screen reader script:", error)
            );
        }

        // Send toggle message
        chrome.tabs
          .sendMessage(tabId, {
            command: "toggleScreenReaderImprovements",
            enable: isEnabled,
          })
          .catch((error) => {
            // If error, script might not be injected yet
            if (isEnabled) {
              chrome.scripting
                .executeScript({
                  target: { tabId: tabId },
                  files: ["screen-reader-support.js"],
                })
                .then(() => {
                  // Try again after injection
                  chrome.tabs
                    .sendMessage(tabId, {
                      command: "toggleScreenReaderImprovements",
                      enable: isEnabled,
                    })
                    .catch((error) =>
                      console.log(
                        "Error toggling screen reader improvements:",
                        error
                      )
                    );
                })
                .catch((error) =>
                  console.log("Error injecting screen reader script:", error)
                );
            }
          });
      });
    });
  }

  // Initialize TTS settings
  initializeTTS();

  // Handle TTS toggle
  if (ttsToggle) {
    ttsToggle.addEventListener("change", function () {
      if (ttsToggle.checked) {
        if (ttsOptions) ttsOptions.style.display = "block";
        enableTTS(true);
      } else {
        if (ttsOptions) ttsOptions.style.display = "none";
        enableTTS(false);
      }
    });
  }

  // Handle TTS rate slider
  if (ttsRateSlider) {
    ttsRateSlider.addEventListener("input", function () {
      if (ttsRateValue) {
        ttsRateValue.textContent = parseFloat(ttsRateSlider.value).toFixed(1);
      }
    });

    ttsRateSlider.addEventListener("change", function () {
      const rate = parseFloat(ttsRateSlider.value);
      chrome.storage.local.set({ ttsRate: rate });
    });
  }

  // Handle TTS pitch slider
  if (ttsPitchSlider) {
    ttsPitchSlider.addEventListener("input", function () {
      if (ttsPitchValue) {
        ttsPitchValue.textContent = parseFloat(ttsPitchSlider.value).toFixed(1);
      }
    });

    ttsPitchSlider.addEventListener("change", function () {
      const pitch = parseFloat(ttsPitchSlider.value);
      chrome.storage.local.set({ ttsPitch: pitch });
    });
  }

  // Handle TTS voice selection
  if (ttsVoiceSelector) {
    ttsVoiceSelector.addEventListener("change", function () {
      const voice = ttsVoiceSelector.value;
      chrome.storage.local.set({ ttsVoice: voice });
    });
  }

  // Handle TTS start button
  if (ttsStartButton) {
    ttsStartButton.addEventListener("click", function () {
      // Send message to start reading the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs.length > 0) {
          chrome.tabs.sendMessage(tabs[0].id, { command: "startTTS" });
        }
      });
    });
  }

  // Handle TTS stop button
  if (ttsStopButton) {
    ttsStopButton.addEventListener("click", function () {
      // Send message to stop reading
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs.length > 0) {
          chrome.tabs.sendMessage(tabs[0].id, { command: "stopTTS" });
        }
      });

      // Also stop any synthesis happening in the popup
      if (speechSynthesis) {
        speechSynthesis.cancel();
      }
    });
  }

  // Set up tab switching
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Remove active class from all tabs and contents
      tabs.forEach((t) => t.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      // Add active class to clicked tab and corresponding content
      tab.classList.add("active");
      const tabName = tab.getAttribute("data-tab");
      document.getElementById(`${tabName}-tab`).classList.add("active");
    });
  });

  // Initialize the UI based on stored states
  initializeUI();

  // Handle filter changes
  if (filterToggle) {
    filterToggle.addEventListener("change", () => {
      const nextState = filterToggle.value;

      // Get active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab) return;

        // Update badge
        chrome.action.setBadgeText({ text: nextState });

        // Save the setting
        chrome.storage.local.set({ focusMode: nextState });

        // Apply filter via the filter manager
        chrome.runtime.sendMessage({
          command: "setFilter",
          filter: nextState,
          tabId: tab.id,
        });
      });
    });
  }

  // Handle zoom slider input (live preview)
  if (zoomSlider) {
    zoomSlider.addEventListener("input", () => {
      // Update the displayed value immediately while dragging
      if (zoomValue) {
        zoomValue.textContent = zoomSlider.value;
      }
    });
  }

  // Handle zoom slider changes (on release)
  if (zoomSlider) {
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
        chrome.tabs
          .sendMessage(tabId, {
            command: "setPageZoom",
            factor: factor,
          })
          .catch(() => {
            // If error, try to inject the script first
            chrome.scripting
              .executeScript({
                target: { tabId },
                files: ["page-zoom.js"],
              })
              .then(() => {
                // Try again after script is injected
                chrome.tabs
                  .sendMessage(tabId, {
                    command: "setPageZoom",
                    factor: factor,
                  })
                  .catch(() => {
                    // Silently fail - might be a chrome:// URL
                  });
              })
              .catch(() => {
                // Silently fail - might be a chrome:// URL
              });
          });
      });
    });
  }

  // Handle font toggle
  if (fontToggle) {
    fontToggle.addEventListener("change", () => {
      if (fontToggle.checked) {
        if (fontOptions) fontOptions.style.display = "block";
        if (fontSelector) applyFontSettings(fontSelector.value);
      } else {
        if (fontOptions) fontOptions.style.display = "none";
        removeFontSettings(); // Remove font without page refresh
      }
    });
  }

  // Handle font selection changes
  if (fontSelector) {
    fontSelector.addEventListener("change", () => {
      if (fontToggle && fontToggle.checked) {
        applyFontSettings(fontSelector.value);
      }
    });
  }

  // Handle text size slider input (live preview)
  if (textSizeSlider) {
    textSizeSlider.addEventListener("input", () => {
      if (textSizeValue) {
        textSizeValue.textContent = textSizeSlider.value;
      }
    });
  }

  // Handle text size slider changes (on release)
  if (textSizeSlider) {
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
        chrome.scripting
          .executeScript({
            target: { tabId },
            files: ["text-size-handler.js"],
          })
          .then(() => {
            // Then call the adjustTextSize function
            chrome.scripting.executeScript({
              target: { tabId },
              function: (percentage) => {
                if (typeof adjustTextSize === "function") {
                  adjustTextSize(percentage);
                }
              },
              args: [parseInt(textSizeSlider.value)],
            });
          })
          .catch((error) => {
            console.log("Text size adjustment error: " + error.message);
          });
      });
    });
  }

  // Handle line spacing slider input (live preview)
  if (lineSpacingSlider) {
    lineSpacingSlider.addEventListener("input", () => {
      // Convert slider value (10-30) to factor (1.0-3.0)
      const factor = lineSpacingSlider.value / 10;
      if (lineSpacingValue) {
        lineSpacingValue.textContent = factor.toFixed(1);
      }
    });
  }

  // Handle line spacing slider changes (on release)
  if (lineSpacingSlider) {
    lineSpacingSlider.addEventListener("change", () => {
      // Convert slider value (10-30) to factor (1.0-3.0)
      const factor = lineSpacingSlider.value / 10;

      // Save the setting
      chrome.storage.local.set({ lineSpacing: factor });

      // Apply CSS variable value
      applyCSSVariable("--line-spacing-factor", factor);
    });
  }

  // Handle letter spacing slider input (live preview)
  if (letterSpacingSlider) {
    letterSpacingSlider.addEventListener("input", () => {
      if (letterSpacingValue) {
        letterSpacingValue.textContent = letterSpacingSlider.value;
      }
    });
  }

  // Handle letter spacing slider changes (on release)
  if (letterSpacingSlider) {
    letterSpacingSlider.addEventListener("change", () => {
      const value = parseInt(letterSpacingSlider.value);

      // Save the setting
      chrome.storage.local.set({ letterSpacing: value });

      // Apply CSS variable value
      applyCSSVariable("--letter-spacing-value", `${value}px`);
    });
  }

  // Handle word spacing slider input (live preview)
  if (wordSpacingSlider) {
    wordSpacingSlider.addEventListener("input", () => {
      if (wordSpacingValue) {
        wordSpacingValue.textContent = wordSpacingSlider.value;
      }
    });
  }

  // Handle word spacing slider changes (on release)
  if (wordSpacingSlider) {
    wordSpacingSlider.addEventListener("change", () => {
      const value = parseInt(wordSpacingSlider.value);

      // Save the setting
      chrome.storage.local.set({ wordSpacing: value });

      // Apply CSS variable value
      applyCSSVariable("--word-spacing-value", `${value}px`);
    });
  }

  // Handle column width slider input (live preview)
  if (columnWidthSlider) {
    columnWidthSlider.addEventListener("input", () => {
      if (columnWidthValue) {
        columnWidthValue.textContent = columnWidthSlider.value;
      }
    });
  }

  // Handle column width slider changes (on release)
  if (columnWidthSlider) {
    columnWidthSlider.addEventListener("change", () => {
      const value = parseInt(columnWidthSlider.value);

      // Save the setting
      chrome.storage.local.set({ columnWidth: value });

      // Apply CSS variable value
      applyCSSVariable("--column-width-percent", `${value}%`);
    });
  }

  // Handle paragraph spacing slider input (live preview)
  if (paragraphSpacingSlider) {
    paragraphSpacingSlider.addEventListener("input", () => {
      // Convert slider value (10-30) to factor (1.0-3.0)
      const factor = paragraphSpacingSlider.value / 10;
      if (paragraphSpacingValue) {
        paragraphSpacingValue.textContent = factor.toFixed(1);
      }
    });
  }

  // Handle paragraph spacing slider changes (on release)
  if (paragraphSpacingSlider) {
    paragraphSpacingSlider.addEventListener("change", () => {
      // Convert slider value (10-30) to factor (1.0-3.0)
      const factor = paragraphSpacingSlider.value / 10;

      // Save the setting
      chrome.storage.local.set({ paragraphSpacing: factor });

      // Apply CSS variable value
      applyCSSVariable("--paragraph-spacing-factor", factor);
    });
  }

  // Handle text guide toggle
  if (textGuideToggle) {
    textGuideToggle.addEventListener("change", () => {
      const isActive = textGuideToggle.checked;

      // Save the setting
      chrome.storage.local.set({ textGuide: isActive });

      // Apply the setting
      applyTextSetting("textGuide", isActive);
    });
  }

  // Handle high contrast toggle
  if (highContrastToggle) {
    highContrastToggle.addEventListener("change", () => {
      const isActive = highContrastToggle.checked;

      if (isActive) {
        if (contrastOptions) contrastOptions.style.display = "block";
      } else {
        if (contrastOptions) contrastOptions.style.display = "none";
      }

      // Save the setting
      chrome.storage.local.set({ highContrast: isActive });

      // Apply the setting
      applyTextSetting("highContrast", isActive);
    });
  }

  // Handle contrast selector changes
  if (contrastSelector) {
    contrastSelector.addEventListener("change", () => {
      const mode = contrastSelector.value;

      // Save the setting
      chrome.storage.local.set({ contrastMode: mode });

      // Apply the setting
      applyTextSetting("contrastMode", mode);
    });
  }

  // Update your Reset All button handler in popup.js

  // Find your existing Reset All button handler
  resetAllButton.addEventListener("click", () => {
    console.log("Reset All button clicked");

    // Reset to defaults in storage
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
      // Add these lines to reset TTS and screen reader settings
      ttsEnabled: false,
      ttsRate: 1.0,
      ttsPitch: 1.0,
      ttsVoice: "",
      screenReaderImprovements: false,
      ttsHoverEnabled: false,
    });

    // Update badge
    chrome.action.setBadgeText({ text: "OFF" });

    // Reset UI elements
    if (filterToggle) filterToggle.value = "OFF";
    if (zoomSlider) zoomSlider.value = 100;
    if (zoomValue) zoomValue.textContent = "100";
    if (fontToggle) fontToggle.checked = false;
    if (fontOptions) fontOptions.style.display = "none";

    // Reset text controls
    if (textSizeSlider) textSizeSlider.value = 100;
    if (textSizeValue) textSizeValue.textContent = "100";
    if (lineSpacingSlider) lineSpacingSlider.value = 10;
    if (lineSpacingValue) lineSpacingValue.textContent = "1.0";
    if (letterSpacingSlider) letterSpacingSlider.value = 0;
    if (letterSpacingValue) letterSpacingValue.textContent = "0";
    if (wordSpacingSlider) wordSpacingSlider.value = 0;
    if (wordSpacingValue) wordSpacingValue.textContent = "0";
    if (columnWidthSlider) columnWidthSlider.value = 100;
    if (columnWidthValue) columnWidthValue.textContent = "100";
    if (paragraphSpacingSlider) paragraphSpacingSlider.value = 10;
    if (paragraphSpacingValue) paragraphSpacingValue.textContent = "1.0";

    // Reset TTS UI elements
    const ttsToggle = document.getElementById("ttsToggle");
    const ttsHoverToggle = document.getElementById("ttsHoverToggle");
    const ttsOptions = document.getElementById("ttsOptions");
    const ttsRateSlider = document.getElementById("ttsRateSlider");
    const ttsRateValue = document.getElementById("ttsRateValue");
    const ttsPitchSlider = document.getElementById("ttsPitchSlider");
    const ttsPitchValue = document.getElementById("ttsPitchValue");
    const ttsVoiceSelector = document.getElementById("ttsVoiceSelector");

    if (ttsToggle) ttsToggle.checked = false;
    if (ttsHoverToggle) ttsHoverToggle.checked = false;
    if (ttsOptions) ttsOptions.style.display = "none";
    if (ttsRateSlider) ttsRateSlider.value = 1.0;
    if (ttsRateValue) ttsRateValue.textContent = "1.0";
    if (ttsPitchSlider) ttsPitchSlider.value = 1.0;
    if (ttsPitchValue) ttsPitchValue.textContent = "1.0";
    if (ttsVoiceSelector) ttsVoiceSelector.value = "";

    // Add these lines to reset screen reader UI elements
    const screenReaderToggle = document.getElementById("screenReaderToggle");
    const screenReaderInfo = document.getElementById("screenReaderInfo");

    if (screenReaderToggle) screenReaderToggle.checked = false;
    if (screenReaderInfo) screenReaderInfo.style.display = "none";

    // Apply changes to active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        const tabId = tabs[0].id;

        // Send reset command to background script
        chrome.runtime.sendMessage({
          command: "resetSettings",
          tabId: tabId,
        });

        // Stop any ongoing TTS
        chrome.tabs.sendMessage(tabId, { command: "stopTTS" }).catch(() => {
          // Ignore errors - content script might not be loaded
        });

        // Cancel any synthesis in popup
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }

        // Disable screen reader improvements
        chrome.tabs
          .sendMessage(tabId, {
            command: "toggleScreenReaderImprovements",
            enable: false,
          })
          .catch(() => {
            // Ignore errors - content script might not be loaded
          });
      }
    });
  });

  // Run Setup Wizard Button
  if (runSetupWizardButton) {
    runSetupWizardButton.addEventListener("click", () => {
      console.log("Setup Wizard button clicked");

      // Switch to setup wizard view
      if (regularPopup) regularPopup.style.display = "none";
      if (setupWizard) setupWizard.style.display = "block";

      // Reset setup wizard to step 1
      resetSetupWizard();

      // Load existing settings into setup wizard
      loadExistingSettingsToSetup();

      // Initialize slider handling
      initializeSetupWizardSliders();
    });
  }

  // Setup wizard: Back button
  if (setupBackButton) {
    setupBackButton.addEventListener("click", () => {
      navigateSetupWizard("back");
    });
  }

  // Setup wizard: Next button
  if (setupNextButton) {
    setupNextButton.addEventListener("click", () => {
      navigateSetupWizard("next");
    });
  }

  // Setup wizard: Finish button
  if (setupFinishButton) {
    setupFinishButton.addEventListener("click", () => {
      finishSetupWizard();
    });
  }

  // Setup wizard: Cancel button
  if (setupCancelButton) {
    setupCancelButton.addEventListener("click", () => {
      cancelSetupWizard();
    });
  }

  // Setup complete: Done button
  if (setupCompleteButton) {
    setupCompleteButton.addEventListener("click", () => {
      // Return to regular popup and refresh UI
      if (setupComplete) setupComplete.style.display = "none";
      if (regularPopup) regularPopup.style.display = "block";
      initializeUI(); // Refresh UI with new settings
    });
  }

  // Setup option cards (radio button behavior)
  if (optionCards) {
    optionCards.forEach((card) => {
      card.addEventListener("click", function () {
        // Remove selected state from all cards
        optionCards.forEach((c) => {
          c.classList.remove("selected");
          c.setAttribute("aria-checked", "false");
        });

        // Add selected state to clicked card
        this.classList.add("selected");
        this.setAttribute("aria-checked", "true");

        // Update config
        setupConfig.colorVision = this.getAttribute("data-value");
      });

      // Keyboard accessibility for option cards
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.click();
        }
      });
    });
  }

  // Handle font selection in setup
  if (setupFontSelector) {
    setupFontSelector.addEventListener("change", function () {
      setupConfig.fontPreference = this.value;
      updateSetupFontPreview(this.value);
    });
  }

  // Handle reading difficulties checkboxes
  if (readingCheckboxes) {
    readingCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", function () {
        if (this.checked) {
          if (!setupConfig.readingDifficulties.includes(this.value)) {
            setupConfig.readingDifficulties.push(this.value);
          }
        } else {
          const index = setupConfig.readingDifficulties.indexOf(this.value);
          if (index > -1) {
            setupConfig.readingDifficulties.splice(index, 1);
          }
        }
      });
    });
  }

  // Handle text size slider in setup
  if (setupTextSize) {
    setupTextSize.addEventListener("input", function () {
      const value = this.value;
      setupConfig.textSize = parseInt(value);

      // Update display value
      if (setupTextSizeValue) {
        setupTextSizeValue.textContent = value + "%";
      }

      // Update preview size
      if (setupTextSizePreview) {
        setupTextSizePreview.style.fontSize = value / 100 + "em";
      }
    });
  }

  // Handle brightness sensitivity slider
  if (setupBrightnessSensitivity) {
    setupBrightnessSensitivity.addEventListener("input", function () {
      setupConfig.brightnessSensitivity = parseInt(this.value);
    });
  }

  // Handle dark mode toggle
  if (setupDarkMode) {
    setupDarkMode.addEventListener("change", function () {
      setupConfig.darkMode = this.checked;
    });
  }

  // Initialize slider handling
  initializeSetupWizardSliders();
});

// Modified initializeUI function - High contrast removed
function initializeUI() {
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
      "ttsEnabled",
      "ttsRate",
      "ttsPitch",
      "ttsVoice",
    ],
    (result) => {
      // Vision Tab - Initialize filter dropdown
      const filterToggle = document.getElementById("filterToggle");
      const filterState = result.focusMode || "OFF";
      if (filterToggle) filterToggle.value = filterState;

      // Vision Tab - Initialize zoom slider
      const zoomSlider = document.getElementById("zoomSlider");
      const zoomValue = document.getElementById("zoomValue");
      const zoomFactor = result.zoomFactor || 1.0;
      if (zoomSlider) zoomSlider.value = Math.round(zoomFactor * 100);
      if (zoomValue)
        zoomValue.textContent = zoomSlider ? zoomSlider.value : "100";

      // Vision Tab - Initialize font toggle and selector
      const fontToggle = document.getElementById("fontToggle");
      const fontOptions = document.getElementById("fontOptions");
      const fontSelector = document.getElementById("fontSelector");
      const fontPreference = result.fontPreference || "default";

      if (fontPreference !== "default" && fontToggle && fontOptions) {
        fontToggle.checked = true;
        fontOptions.style.display = "block";

        // Only set selector value if the option exists
        if (
          fontSelector &&
          fontSelector.querySelector(`option[value="${fontPreference}"]`)
        ) {
          fontSelector.value = fontPreference;
        }
      }

      // Text Tab - Initialize text size slider
      const textSizeSlider = document.getElementById("textSizeSlider");
      const textSizeValue = document.getElementById("textSizeValue");
      const textSize = result.textSize || 1.0;
      if (textSizeSlider) textSizeSlider.value = Math.round(textSize * 100);
      if (textSizeValue)
        textSizeValue.textContent = textSizeSlider
          ? textSizeSlider.value
          : "100";

      // Text Tab - Initialize line spacing slider
      // Converting from 1.0 - 3.0 range to 10-30 slider value
      const lineSpacingSlider = document.getElementById("lineSpacingSlider");
      const lineSpacingValue = document.getElementById("lineSpacingValue");
      const lineSpacing = result.lineSpacing || 1.0;
      if (lineSpacingSlider)
        lineSpacingSlider.value = Math.round(lineSpacing * 10);
      if (lineSpacingValue)
        lineSpacingValue.textContent = lineSpacing.toFixed(1);

      // Text Tab - Initialize letter spacing slider
      const letterSpacingSlider = document.getElementById(
        "letterSpacingSlider"
      );
      const letterSpacingValue = document.getElementById("letterSpacingValue");
      const letterSpacing = result.letterSpacing || 0;
      if (letterSpacingSlider) letterSpacingSlider.value = letterSpacing;
      if (letterSpacingValue) letterSpacingValue.textContent = letterSpacing;

      // Text Tab - Initialize word spacing slider
      const wordSpacingSlider = document.getElementById("wordSpacingSlider");
      const wordSpacingValue = document.getElementById("wordSpacingValue");
      const wordSpacing = result.wordSpacing || 0;
      if (wordSpacingSlider) wordSpacingSlider.value = wordSpacing;
      if (wordSpacingValue) wordSpacingValue.textContent = wordSpacing;

      // Text Tab - Initialize column width slider
      const columnWidthSlider = document.getElementById("columnWidthSlider");
      const columnWidthValue = document.getElementById("columnWidthValue");
      const columnWidth = result.columnWidth || 100;
      if (columnWidthSlider) columnWidthSlider.value = columnWidth;
      if (columnWidthValue) columnWidthValue.textContent = columnWidth;

      // Text Tab - Initialize paragraph spacing slider
      // Converting from 1.0 - 3.0 range to 10-30 slider value
      const paragraphSpacingSlider = document.getElementById(
        "paragraphSpacingSlider"
      );
      const paragraphSpacingValue = document.getElementById(
        "paragraphSpacingValue"
      );
      const paragraphSpacing = result.paragraphSpacing || 1.0;
      if (paragraphSpacingSlider)
        paragraphSpacingSlider.value = Math.round(paragraphSpacing * 10);
      if (paragraphSpacingValue)
        paragraphSpacingValue.textContent = paragraphSpacing.toFixed(1);

      // Text-to-Speech initialization
      const ttsToggle = document.getElementById("ttsToggle");
      const ttsOptions = document.getElementById("ttsOptions");
      const ttsRateSlider = document.getElementById("ttsRateSlider");
      const ttsRateValue = document.getElementById("ttsRateValue");
      const ttsPitchSlider = document.getElementById("ttsPitchSlider");
      const ttsPitchValue = document.getElementById("ttsPitchValue");
      const ttsVoiceSelector = document.getElementById("ttsVoiceSelector");

      if (ttsToggle) ttsToggle.checked = result.ttsEnabled === true;
      if (ttsOptions)
        ttsOptions.style.display =
          result.ttsEnabled === true ? "block" : "none";

      const ttsRate = result.ttsRate || 1.0;
      if (ttsRateSlider) ttsRateSlider.value = ttsRate;
      if (ttsRateValue) ttsRateValue.textContent = ttsRate.toFixed(1);

      const ttsPitch = result.ttsPitch || 1.0;
      if (ttsPitchSlider) ttsPitchSlider.value = ttsPitch;
      if (ttsPitchValue) ttsPitchValue.textContent = ttsPitch.toFixed(1);

      if (ttsVoiceSelector && result.ttsVoice) {
        ttsVoiceSelector.value = result.ttsVoice;
      }
    }
  );
}

// Update the TTS initialization in popup.js
function initializeTTS() {
  // Check if browser supports speech synthesis
  if (!("speechSynthesis" in window)) {
    console.log("This browser doesn't support speech synthesis");
    return;
  }

  // Get available voices
  function populateVoiceList() {
    ttsVoices = speechSynthesis.getVoices();

    const ttsVoiceSelector = document.getElementById("ttsVoiceSelector");
    if (!ttsVoiceSelector) return;

    // Clear existing options
    while (ttsVoiceSelector.firstChild) {
      ttsVoiceSelector.removeChild(ttsVoiceSelector.firstChild);
    }

    // Add default option
    const defaultOption = document.createElement("option");
    defaultOption.textContent = "Default Voice";
    defaultOption.setAttribute("data-i18n", "default_voice");
    defaultOption.value = "";
    ttsVoiceSelector.appendChild(defaultOption);

    // Add available voices
    ttsVoices.forEach(function (voice, index) {
      const option = document.createElement("option");
      option.textContent = voice.name + " (" + voice.lang + ")";
      option.value = index;

      ttsVoiceSelector.appendChild(option);
    });

    // Set selected voice from storage
    chrome.storage.local.get("ttsVoice", function (result) {
      if (result.ttsVoice) {
        ttsVoiceSelector.value = result.ttsVoice;
      }
    });
  }

  // Populate voice list on load
  populateVoiceList();

  // Chrome needs this event to populate voices
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoiceList;
  }
}

// function applySettingsToPopup() {
//   console.log("Applying accessibility settings to extension popup");

//   // Load all current settings
//   chrome.storage.local.get(
//     [
//       "focusMode",
//       "fontPreference",
//       "textSize",
//       "lineSpacing",
//       "letterSpacing",
//       "wordSpacing",
//       "textGuide",
//       "zoomFactor",
//     ],
//     (settings) => {
//       // Get popup document
//       const popupDoc = document;
//       const popupRoot = popupDoc.documentElement;
//       const popupBody = popupDoc.body;

//       // 1. Apply color filter / focus mode
//       const filter = settings.focusMode || "OFF";

//       // Remove any existing filter classes
//       popupRoot.classList.remove(
//         "eyebrowse-filter-grayscale",
//         "eyebrowse-filter-protanopia",
//         "eyebrowse-filter-deuteranopia",
//         "eyebrowse-filter-tritanopia",
//         "eyebrowse-filter-dark"
//       );

//       // Add appropriate filter class
//       if (filter !== "OFF") {
//         popupRoot.classList.add(`eyebrowse-filter-${filter.toLowerCase()}`);
//       }

//       // 2. Apply font preference
//       const font = settings.fontPreference || "default";

//       // Remove any existing font classes
//       popupRoot.classList.remove(
//         "eyebrowse-font-opendyslexic",
//         "eyebrowse-font-arial",
//         "eyebrowse-font-verdana",
//         "eyebrowse-font-tahoma",
//         "eyebrowse-font-comic-sans"
//       );

//       // Add appropriate font class
//       if (font !== "default") {
//         popupRoot.classList.add(`eyebrowse-font-${font.toLowerCase()}`);

//         // Apply font directly
//         applyFontToPopup(font);
//       }

//       // 3. Apply text size
//       const textSize = settings.textSize || 1.0;
//       popupRoot.style.setProperty("--text-size-factor", textSize);

//       // 4. Apply line spacing
//       const lineSpacing = settings.lineSpacing || 1.0;
//       popupRoot.style.setProperty("--line-spacing-factor", lineSpacing);

//       // 5. Apply letter spacing
//       const letterSpacing = settings.letterSpacing || 0;
//       popupRoot.style.setProperty(
//         "--letter-spacing-value",
//         `${letterSpacing}px`
//       );

//       // 6. Apply word spacing
//       const wordSpacing = settings.wordSpacing || 0;
//       popupRoot.style.setProperty("--word-spacing-value", `${wordSpacing}px`);

//       // 7. Apply text guide if enabled
//       const textGuide = settings.textGuide === true;

//       // Remove existing text guide class
//       popupRoot.classList.remove("eyebrowse-text-guide");

//       // Add text guide class if enabled
//       if (textGuide) {
//         popupRoot.classList.add("eyebrowse-text-guide");
//       }

//       // 8. Apply zoom factor
//       const zoom = settings.zoomFactor || 1.0;

//       // For popup, we'll apply zoom via transform to keep it contained
//       if (zoom !== 1.0) {
//         popupBody.style.transform = `scale(${zoom})`;
//         popupBody.style.transformOrigin = "top left";
//         // Adjust container size
//         popupBody.style.width = `${100 / zoom}%`;
//         popupBody.style.height = `${100 / zoom}%`;
//       } else {
//         popupBody.style.transform = "";
//         popupBody.style.width = "";
//         popupBody.style.height = "";
//       }

//       console.log("Applied accessibility settings to popup");
//     }
//   );
// }

// // Helper function to apply font to popup
// function applyFontToPopup(fontName) {
//   const styleId = "eyebrowse-popup-font-style";

//   // Remove existing style if present
//   let styleEl = document.getElementById(styleId);
//   if (styleEl) {
//     styleEl.remove();
//   }

//   // Create new style element
//   styleEl = document.createElement("style");
//   styleEl.id = styleId;

//   // Set appropriate font CSS
//   switch (fontName) {
//     case "opendyslexic":
//       styleEl.textContent = `
//         @font-face {
//           font-family: 'OpenDyslexic';
//           src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Regular.woff') format('woff');
//           font-weight: normal;
//           font-style: normal;
//         }
        
//         @font-face {
//           font-family: 'OpenDyslexic';
//           src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Bold.woff') format('woff');
//           font-weight: bold;
//           font-style: normal;
//         }
        
//         body * {
//           font-family: 'OpenDyslexic', Arial, sans-serif !important;
//           letter-spacing: 0.15em !important;
//           word-spacing: 0.25em !important;
//           line-height: 1.4 !important;
//         }
//       `;
//       break;

//     case "arial":
//       styleEl.textContent = `
//         body * {
//           font-family: Arial, sans-serif !important;
//           letter-spacing: 0.05em !important;
//           word-spacing: 0.1em !important;
//           line-height: 1.3 !important;
//         }
//       `;
//       break;

//     case "verdana":
//       styleEl.textContent = `
//         body * {
//           font-family: Verdana, Geneva, sans-serif !important;
//           letter-spacing: 0.08em !important;
//           word-spacing: 0.15em !important;
//           line-height: 1.4 !important;
//         }
//       `;
//       break;

//     case "tahoma":
//       styleEl.textContent = `
//         body * {
//           font-family: Tahoma, Geneva, sans-serif !important;
//           letter-spacing: 0.07em !important;
//           word-spacing: 0.15em !important;
//           line-height: 1.35 !important;
//         }
//       `;
//       break;

//     case "comic-sans":
//       styleEl.textContent = `
//         body * {
//           font-family: 'Comic Sans MS', cursive, sans-serif !important;
//           letter-spacing: 0.05em !important;
//           word-spacing: 0.1em !important;
//           line-height: 1.3 !important;
//         }
//       `;
//       break;
//   }

//   // Add to document
//   if (styleEl.textContent) {
//     document.head.appendChild(styleEl);
//   }
// }

// // Add CSS for popup filters and accessibility styles
// function addPopupAccessibilityStyles() {
//   const styleId = "eyebrowse-popup-accessibility-styles";

//   // Check if style already exists
//   let styleEl = document.getElementById(styleId);
//   if (styleEl) {
//     return; // Already added
//   }

//   // Create new style element
//   styleEl = document.createElement("style");
//   styleEl.id = styleId;

//   // Set CSS content
//   styleEl.textContent = `
//     /* Text size */
//     :root {
//       --text-size-factor: 1;
//       --line-spacing-factor: 1;
//       --letter-spacing-value: 0px;
//       --word-spacing-value: 0px;
//     }
    
//     /* Apply text size */
//     html {
//       font-size: calc(100% * var(--text-size-factor)) !important;
//     }
    
//     /* Apply line spacing */
//     body * {
//       line-height: calc(1.4 * var(--line-spacing-factor)) !important;
//     }
    
//     /* Apply letter spacing */
//     body * {
//       letter-spacing: var(--letter-spacing-value) !important;
//     }
    
//     /* Apply word spacing */
//     body * {
//       word-spacing: var(--word-spacing-value) !important;
//     }
    
//     /* Text guide */
//     html.eyebrowse-text-guide p,
//     html.eyebrowse-text-guide li,
//     html.eyebrowse-text-guide label {
//       border-left: 3px solid rgba(0, 0, 0, 0.2) !important;
//       padding-left: 10px !important;
//     }
    
//     /* Color filters */
//     html.eyebrowse-filter-grayscale {
//       filter: grayscale(100%) !important;
//     }
    
//     html.eyebrowse-filter-protanopia {
//       filter: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><filter id="protanopia"><feColorMatrix in="SourceGraphic" type="matrix" values="0.567, 0.433, 0, 0, 0, 0.558, 0.442, 0, 0, 0, 0, 0.242, 0.758, 0, 0, 0, 0, 0, 1, 0" /></filter></svg>#protanopia') !important;
//     }
    
//     html.eyebrowse-filter-deuteranopia {
//       filter: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><filter id="deuteranopia"><feColorMatrix in="SourceGraphic" type="matrix" values="0.625, 0.375, 0, 0, 0, 0.7, 0.3, 0, 0, 0, 0, 0.3, 0.7, 0, 0, 0, 0, 0, 1, 0" /></filter></svg>#deuteranopia') !important;
//     }
    
//     html.eyebrowse-filter-tritanopia {
//       filter: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><filter id="tritanopia"><feColorMatrix in="SourceGraphic" type="matrix" values="0.95, 0.05, 0, 0, 0, 0, 0.433, 0.567, 0, 0, 0, 0.475, 0.525, 0, 0, 0, 0, 0, 1, 0" /></filter></svg>#tritanopia') !important;
//     }
    
//     html.eyebrowse-filter-dark {
//       filter: invert(90%) hue-rotate(180deg) !important;
//     }
    
//     /* Font classes */
//     html.eyebrowse-font-opendyslexic * {
//       font-family: 'OpenDyslexic', Arial, sans-serif !important;
//     }
    
//     html.eyebrowse-font-arial * {
//       font-family: Arial, sans-serif !important;
//     }
    
//     html.eyebrowse-font-verdana * {
//       font-family: Verdana, Geneva, sans-serif !important;
//     }
    
//     html.eyebrowse-font-tahoma * {
//       font-family: Tahoma, Geneva, sans-serif !important;
//     }
    
//     html.eyebrowse-font-comic-sans * {
//       font-family: 'Comic Sans MS', cursive, sans-serif !important;
//     }
//   `;

//   document.head.appendChild(styleEl);
// }

// // Add styles for popup accessibility
// addPopupAccessibilityStyles();

// // Apply settings to popup
// applySettingsToPopup();

// // Listen for storage changes to update popup immediately
// chrome.storage.onChanged.addListener((changes, area) => {
//   if (area === "local") {
//     // Check if any accessibility settings changed
//     const accessibilityKeys = [
//       "focusMode",
//       "fontPreference",
//       "textSize",
//       "lineSpacing",
//       "letterSpacing",
//       "wordSpacing",
//       "textGuide",
//       "zoomFactor",
//     ];

//     let shouldUpdatePopup = false;
//     for (const key of accessibilityKeys) {
//       if (changes[key]) {
//         shouldUpdatePopup = true;
//         break;
//       }
//     }

//     if (shouldUpdatePopup) {
//       // Apply updated settings to popup
//       applySettingsToPopup();
//     }
//   }
// });

// Function to enable/disable TTS
function enableTTS(enable) {
  chrome.storage.local.set({ ttsEnabled: enable });

  // Handle hover option visibility
  const ttsHoverToggle = document.getElementById("ttsHoverToggle");
  if (ttsHoverToggle) {
    // If TTS is disabled, also ensure hover is disabled
    if (!enable) {
      ttsHoverToggle.checked = false;
      chrome.storage.local.set({ ttsHoverEnabled: false });
    }
  }

  // Inject or remove TTS content script as needed
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (!tabs || !tabs.length) return;

    const tabId = tabs[0].id;

    if (enable) {
      // Inject TTS content script
      chrome.scripting
        .executeScript({
          target: { tabId: tabId },
          files: ["tts-content.js"],
        })
        .catch((error) => console.log("Error injecting TTS script:", error));
    } else {
      // Send message to stop any ongoing TTS
      chrome.tabs
        .sendMessage(tabId, {
          command: "stopTTS",
        })
        .catch(() => {
          // Silently fail if content script is not loaded
        });

      // Also send message to disable hover TTS if it was enabled
      chrome.tabs
        .sendMessage(tabId, {
          command: "toggleHoverTTS",
          enable: false,
        })
        .catch(() => {
          // Silently fail if content script is not loaded
        });
    }
  });
}

// Function to apply font settings
function applyFontSettings(fontName) {
  // Save the setting
  chrome.storage.local.set({ fontPreference: fontName });

  // Apply to active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length) return;
    const tabId = tabs[0].id;

    // Apply font via background.js
    chrome.runtime.sendMessage({
      command: "setFont",
      font: fontName,
      tabId: tabId,
    });
  });
}

// Function to remove font settings without page refresh
function removeFontSettings() {
  // Save the setting
  chrome.storage.local.set({ fontPreference: "default" });

  // Apply to active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length) return;
    const tabId = tabs[0].id;

    // Remove font via background.js
    chrome.runtime.sendMessage({
      command: "setFont",
      font: "default",
      tabId: tabId,
    });
  });
}

// Function to apply CSS variable settings
function applyCSSVariable(variableName, value) {
  // Apply to active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length) return;
    const tabId = tabs[0].id;

    // Inject text-customization.css if not already present
    chrome.scripting
      .insertCSS({
        target: { tabId },
        files: ["text-customization.css"],
      })
      .catch(() => {
        // Silently fail - CSS might already be injected
      })
      .finally(() => {
        // Update the CSS variable
        chrome.scripting
          .executeScript({
            target: { tabId },
            function: (name, value) => {
              document.documentElement.style.setProperty(name, value);
              // Force layout recalculation for immediate visual update
              document.body.getBoundingClientRect();
            },
            args: [variableName, value],
          })
          .catch(() => {
            // Silently fail - might be a chrome:// URL
          });
      });
  });
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
      tabId: tabId,
    });

    // Force page update
    forcePageUpdate(tabId);
  });
}

// Function to force immediate page update
function forcePageUpdate(tabId) {
  chrome.scripting
    .executeScript({
      target: { tabId },
      function: () => {
        // This tiny DOM change forces an immediate repaint
        document.body.style.zoom = "0.99999";
        setTimeout(() => {
          document.body.style.zoom = "1";
        }, 10);
      },
    })
    .catch(() => {
      // Ignore errors on restricted pages
    });
}

// Function to initialize the setup wizard sliders with proper event handling
function initializeSetupWizardSliders() {
  // Get all slider elements in the setup wizard
  const setupSliders = document.querySelectorAll(
    "#setup-wizard input[type='range']"
  );

  // Prevent propagation of click events on sliders
  if (setupSliders) {
    setupSliders.forEach((slider) => {
      // Prevent click events from bubbling up
      slider.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      // Ensure mousedown events are contained
      slider.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });

      // Add a transparent overlay to prevent clicks outside the slider
      const sliderContainer = slider.closest(".slider-container");
      if (sliderContainer) {
        sliderContainer.addEventListener("click", (e) => {
          // Only allow clicks on the slider itself
          if (e.target !== slider) {
            e.preventDefault();
            e.stopPropagation();
          }
        });
      }
    });
  }

  // Specifically fix the text size slider
  const setupTextSize = document.getElementById("setup-text-size");
  if (setupTextSize) {
    // Ensure the input event doesn't bubble
    setupTextSize.addEventListener("input", (e) => {
      e.stopPropagation();
      const value = setupTextSize.value;

      // Update the preview text directly
      const setupTextSizeValue = document.getElementById(
        "setup-text-size-value"
      );
      if (setupTextSizeValue) {
        setupTextSizeValue.textContent = value + "%";
      }

      // Update the preview size
      const setupTextSizePreview = document.getElementById(
        "setup-text-size-preview"
      );
      if (setupTextSizePreview) {
        setupTextSizePreview.style.fontSize = value / 100 + "em";
      }

      // Update the config
      setupConfig.textSize = parseInt(value);
    });
  }

  // Fix the brightness sensitivity slider
  const setupBrightnessSensitivity = document.getElementById(
    "setup-brightness-sensitivity"
  );
  if (setupBrightnessSensitivity) {
    setupBrightnessSensitivity.addEventListener("input", (e) => {
      e.stopPropagation();
      setupConfig.brightnessSensitivity = parseInt(
        setupBrightnessSensitivity.value
      );
    });
  }
}

// Function to reset the setup wizard to initial state
function resetSetupWizard() {
  // Reset current step to 0
  currentSetupStep = 0;

  // Reset configuration
  setupConfig.colorVision = "none";
  setupConfig.readingDifficulties = [];
  setupConfig.fontPreference = "default";
  setupConfig.brightnessSensitivity = 5;
  setupConfig.textSize = 100;
  setupConfig.darkMode = false;

  // Reset UI to show step 1
  const setupSteps = document.querySelectorAll(".setup-step");
  setupSteps.forEach((step) => step.classList.remove("active"));
  if (setupSteps[0]) setupSteps[0].classList.add("active");

  // Reset progress indicators
  updateProgressIndicators(0);

  // Reset navigation buttons
  updateSetupNavigation();

  // Reset form elements
  resetSetupFormElements();
}

// Function to update progress indicators
function updateProgressIndicators(stepIndex) {
  const progressDots = document.querySelectorAll(".progress-dot");
  if (progressDots.length > 0) {
    progressDots.forEach((dot, index) => {
      if (index <= stepIndex) {
        dot.classList.add("active");
      } else {
        dot.classList.remove("active");
      }
    });

    // Update screen reader text
    const srIndicator = document.querySelector(".progress-indicator .sr-only");
    if (srIndicator) {
      srIndicator.textContent = `Step ${stepIndex + 1} of ${
        progressDots.length
      }`;
    }
  }
}

// Function to update setup navigation buttons
function updateSetupNavigation() {
  const setupSteps = document.querySelectorAll(".setup-step");
  const setupBackButton = document.getElementById("setup-back");
  const setupNextButton = document.getElementById("setup-next");
  const setupFinishButton = document.getElementById("setup-finish");

  // Back button visibility
  if (setupBackButton) {
    if (currentSetupStep === 0) {
      setupBackButton.style.display = "none";
    } else {
      setupBackButton.style.display = "block";
    }
  }

  // Next/Finish button visibility
  if (setupNextButton && setupFinishButton) {
    if (currentSetupStep === setupSteps.length - 1) {
      setupNextButton.style.display = "none";
      setupFinishButton.style.display = "block";
    } else {
      setupNextButton.style.display = "block";
      setupFinishButton.style.display = "none";
    }
  }
}

// Function to navigate the setup wizard
function navigateSetupWizard(direction) {
  const setupSteps = document.querySelectorAll(".setup-step");

  // Hide current step
  if (setupSteps[currentSetupStep]) {
    setupSteps[currentSetupStep].classList.remove("active");
  }

  // Update step index
  if (direction === "next" && currentSetupStep < setupSteps.length - 1) {
    currentSetupStep++;
  } else if (direction === "back" && currentSetupStep > 0) {
    currentSetupStep--;
  }

  // Show new step
  if (setupSteps[currentSetupStep]) {
    setupSteps[currentSetupStep].classList.add("active");
  }

  // Update progress indicators
  updateProgressIndicators(currentSetupStep);

  // Update navigation buttons
  updateSetupNavigation();

  // Reinitialize slider handling for the new step
  initializeSetupWizardSliders();
}

// Function to finish the setup wizard
function finishSetupWizard() {
  // Apply configuration
  applySetupConfiguration();

  // Show success message
  const setupWizard = document.getElementById("setup-wizard");
  const setupComplete = document.getElementById("setup-complete");

  if (setupWizard && setupComplete) {
    setupWizard.style.display = "none";
    setupComplete.style.display = "block";
  }
}

// Function to cancel the setup wizard
function cancelSetupWizard() {
  // Show regular popup again
  const setupWizard = document.getElementById("setup-wizard");
  const regularPopup = document.getElementById("regular-popup");

  if (setupWizard && regularPopup) {
    setupWizard.style.display = "none";
    regularPopup.style.display = "block";
  }
}

// Function to apply setup configuration
function applySetupConfiguration() {
  // Determine which filter to enable based on color vision selection
  let activeFilter = "OFF";

  if (setupConfig.colorVision === "grayscale") {
    activeFilter = "GRAYSCALE";
  } else if (setupConfig.colorVision !== "none") {
    activeFilter = setupConfig.colorVision.toUpperCase();
  } else if (setupConfig.readingDifficulties.includes("focus")) {
    activeFilter = "GRAYSCALE";
  } else if (setupConfig.darkMode) {
    activeFilter = "DARK";
  }

  // Determine text settings based on user selections
  let textSize = setupConfig.textSize / 100; // Convert percentage to decimal
  let lineSpacing = 1.0;
  let letterSpacing = 0;
  let wordSpacing = 0;

  // Adjust text settings for dyslexia or small text difficulties
  if (setupConfig.readingDifficulties.includes("dyslexia")) {
    lineSpacing = 1.5;
    letterSpacing = 2;
    wordSpacing = 4;
  } else if (setupConfig.readingDifficulties.includes("small-text")) {
    textSize = Math.max(textSize, 1.2); // Ensure minimum 120% text size
  }

  // Save all settings to chrome.storage.local
  chrome.storage.local.set(
    {
      // Base settings
      userSetup: true,

      // Color vision settings
      colorVisionType: setupConfig.colorVision,
      focusMode: activeFilter,

      // Reading settings
      readingDifficulties: setupConfig.readingDifficulties,
      fontPreference: setupConfig.fontPreference,

      // Visual comfort settings
      brightnessSensitivity: setupConfig.brightnessSensitivity,
      textSize: textSize,
      zoomFactor: textSize, // Use same factor for zoom
      darkMode: setupConfig.darkMode,

      // Text customization settings
      lineSpacing: lineSpacing,
      letterSpacing: letterSpacing,
      wordSpacing: wordSpacing,
      textGuide: setupConfig.readingDifficulties.includes("tracking"),
      highContrast: setupConfig.brightnessSensitivity > 7, // Enable high contrast for high sensitivity
      contrastMode: setupConfig.darkMode ? "inverted" : "normal",
    },
    function () {
      // Apply settings to the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs.length > 0) {
          const tabId = tabs[0].id;

          // Send message to background script to apply all settings
          chrome.runtime.sendMessage({
            command: "applyAllSettings",
            tabId: tabId,
          });
        }
      });
    }
  );
}

// Function to reset all setup form elements
function resetSetupFormElements() {
  // Reset color vision selection
  const colorCards = document.querySelectorAll(".option-card");
  if (colorCards) {
    colorCards.forEach((card) => {
      card.classList.remove("selected");
      card.setAttribute("aria-checked", "false");
    });
  }

  // Reset checkboxes
  const checkboxes = document.querySelectorAll(
    '#setup-wizard input[type="checkbox"]'
  );
  if (checkboxes) {
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });
  }

  // Reset font preference
  const fontSelector = document.getElementById("setup-font-preference");
  if (fontSelector) fontSelector.value = "default";

  // Reset sliders
  const brightnessSlider = document.getElementById(
    "setup-brightness-sensitivity"
  );
  if (brightnessSlider) brightnessSlider.value = 5;

  const textSizeSlider = document.getElementById("setup-text-size");
  const textSizeValue = document.getElementById("setup-text-size-value");
  if (textSizeSlider) textSizeSlider.value = 100;
  if (textSizeValue) textSizeValue.textContent = "100%";

  // Reset font preview
  updateSetupFontPreview("default");
}

// Function to update font preview in setup
function updateSetupFontPreview(fontName) {
  const setupFontPreview = document.getElementById("setup-font-preview");
  if (!setupFontPreview) return;

  // Reset any previous styling
  setupFontPreview.style.fontFamily = "";
  setupFontPreview.style.letterSpacing = "";
  setupFontPreview.style.wordSpacing = "";
  setupFontPreview.style.lineHeight = "";

  // Apply new font styling
  switch (fontName) {
    case "opendyslexic":
      setupFontPreview.style.fontFamily = "'OpenDyslexic', Arial, sans-serif";
      setupFontPreview.style.letterSpacing = "0.15em";
      setupFontPreview.style.wordSpacing = "0.25em";
      setupFontPreview.style.lineHeight = "1.4";
      break;

    case "arial":
      setupFontPreview.style.fontFamily = "Arial, sans-serif";
      setupFontPreview.style.letterSpacing = "0.05em";
      setupFontPreview.style.wordSpacing = "0.1em";
      setupFontPreview.style.lineHeight = "1.3";
      break;

    case "comic-sans":
      setupFontPreview.style.fontFamily =
        "'Comic Sans MS', cursive, sans-serif";
      setupFontPreview.style.letterSpacing = "0.05em";
      setupFontPreview.style.wordSpacing = "0.1em";
      setupFontPreview.style.lineHeight = "1.3";
      break;

    default:
      // Default font - browser default
      break;
  }
}

// Function to load existing settings into setup wizard
function loadExistingSettingsToSetup() {
  chrome.storage.local.get(
    [
      "colorVisionType",
      "readingDifficulties",
      "fontPreference",
      "brightnessSensitivity",
      "textSize",
      "darkMode",
      "uiLanguage",
    ],
    function (result) {
      // Pre-fill color vision selection
      if (result.colorVisionType) {
        setupConfig.colorVision = result.colorVisionType;

        // Select the correct card
        const cards = document.querySelectorAll(".option-card");
        if (cards) {
          cards.forEach((card) => {
            if (card.getAttribute("data-value") === result.colorVisionType) {
              card.classList.add("selected");
              card.setAttribute("aria-checked", "true");
            }
          });
        }
      }

      // Pre-fill reading difficulties
      if (
        result.readingDifficulties &&
        Array.isArray(result.readingDifficulties)
      ) {
        setupConfig.readingDifficulties = result.readingDifficulties;

        // Check the boxes
        result.readingDifficulties.forEach((difficulty) => {
          const checkbox = document.querySelector(
            `input[name="reading"][value="${difficulty}"]`
          );
          if (checkbox) {
            checkbox.checked = true;
          }
        });
      }

      // Pre-fill font preference
      if (result.fontPreference) {
        setupConfig.fontPreference = result.fontPreference;

        // Select the correct font option
        const setupFontSelector = document.getElementById(
          "setup-font-preference"
        );
        if (setupFontSelector) {
          setupFontSelector.value = result.fontPreference;

          // Update the font preview
          updateSetupFontPreview(result.fontPreference);
        }
      }

      // Pre-fill brightness sensitivity
      if (result.brightnessSensitivity) {
        setupConfig.brightnessSensitivity = result.brightnessSensitivity;

        // Set the slider value
        const brightnessSlider = document.getElementById(
          "setup-brightness-sensitivity"
        );
        if (brightnessSlider) {
          brightnessSlider.value = result.brightnessSensitivity;
        }
      }

      // Pre-fill text size
      if (result.textSize) {
        // Convert decimal back to percentage
        const textSizePercentage = Math.round(result.textSize * 100);
        setupConfig.textSize = textSizePercentage;

        // Set the slider value
        const textSizeSlider = document.getElementById("setup-text-size");
        if (textSizeSlider) {
          textSizeSlider.value = textSizePercentage;

          // Update preview text if available
          const textSizeValue = document.getElementById(
            "setup-text-size-value"
          );
          if (textSizeValue) {
            textSizeValue.textContent = textSizePercentage + "%";
          }

          // Update preview size
          const textSizePreview = document.getElementById(
            "setup-text-size-preview"
          );
          if (textSizePreview) {
            textSizePreview.style.fontSize = textSizePercentage / 100 + "em";
          }
        }
      }

      if (result.uiLanguage) {
        const setupLanguageSelector = document.getElementById(
          "setupLanguageSelector"
        );
        if (setupLanguageSelector) {
          setupLanguageSelector.value = result.uiLanguage;
        }
      }

      // Pre-fill dark mode
      if (result.darkMode === true) {
        setupConfig.darkMode = true;

        // Check the box
        const darkModeCheckbox = document.getElementById("setup-dark-mode");
        if (darkModeCheckbox) {
          darkModeCheckbox.checked = true;
        }
      }
    }
  );
}
