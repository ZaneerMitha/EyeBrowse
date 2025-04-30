document.addEventListener('DOMContentLoaded', function() {
    // Step navigation
    const steps = document.querySelectorAll('.step');
    const nextButtons = document.querySelectorAll('.btn-next');
    const backButtons = document.querySelectorAll('.btn-back');
    const finishButton = document.querySelector('.btn-finish');
    let currentStep = 0;
  
    // Configuration object to store user selections
    const config = {
      colorVision: 'none',
      readingDifficulties: [],
      fontPreference: 'default',
      brightnessSensitivity: 5,
      textSize: 100,
      reduceMotion: false,
      darkMode: false
    };
  
    // Check if this is a rerun of the setup wizard
    let isRerun = false;
  
    // Load previously saved settings if this is a rerun
    chrome.storage.local.get([
      "setupRerun",
      "colorVisionType",
      "readingDifficulties",
      "fontPreference",
      "brightnessSensitivity",
      "textSize",
      "darkMode"
    ], (result) => {
      isRerun = result.setupRerun === true;
      
      if (isRerun) {
        console.log("This is a setup wizard rerun - loading saved preferences");
        
        // Pre-fill color vision selection
        if (result.colorVisionType) {
          config.colorVision = result.colorVisionType;
          
          // Select the correct card
          const cards = document.querySelectorAll('.option-card');
          cards.forEach(card => {
            if (card.getAttribute('data-value') === result.colorVisionType) {
              card.classList.add('selected');
            }
          });
        }
        
        // Pre-fill reading difficulties
        if (result.readingDifficulties && Array.isArray(result.readingDifficulties)) {
          config.readingDifficulties = result.readingDifficulties;
          
          // Check the boxes
          result.readingDifficulties.forEach(difficulty => {
            const checkbox = document.querySelector(`input[name="reading"][value="${difficulty}"]`);
            if (checkbox) {
              checkbox.checked = true;
            }
          });
        }
        
        // Pre-fill font preference
        if (result.fontPreference) {
          config.fontPreference = result.fontPreference;
          
          // Select the correct font option
          const fontSelector = document.getElementById('font-preference');
          if (fontSelector) {
            fontSelector.value = result.fontPreference;
            
            // Update the font preview
            updateFontPreview(result.fontPreference);
          }
        }
        
        // Pre-fill brightness sensitivity
        if (result.brightnessSensitivity) {
          config.brightnessSensitivity = result.brightnessSensitivity;
          
          // Set the slider value
          const sensitivitySlider = document.getElementById('brightness-sensitivity');
          if (sensitivitySlider) {
            sensitivitySlider.value = result.brightnessSensitivity;
          }
        }
        
        // Pre-fill text size
        if (result.textSize) {
          // Convert decimal back to percentage
          const textSizePercentage = Math.round(result.textSize * 100);
          config.textSize = textSizePercentage;
          
          // Set the slider value
          const textSizeSlider = document.getElementById('text-size');
          if (textSizeSlider) {
            textSizeSlider.value = textSizePercentage;
            
            // Update preview text if available
            const textSizeValue = document.getElementById('text-size-value');
            if (textSizeValue) {
              textSizeValue.textContent = textSizePercentage + '%';
            }
          }
        }
        
        // Pre-fill dark mode
        if (result.darkMode === true) {
          config.darkMode = true;
          
          // Check the box
          const darkModeCheckbox = document.getElementById('dark-mode');
          if (darkModeCheckbox) {
            darkModeCheckbox.checked = true;
          }
        }
      }
    });
  
    // Handle option card selection in Step 1
    const optionCards = document.querySelectorAll('.option-card');
    optionCards.forEach(card => {
      card.addEventListener('click', function() {
        // Remove selected class from all cards
        optionCards.forEach(c => c.classList.remove('selected'));
        // Add selected class to clicked card
        this.classList.add('selected');
        // Update config
        config.colorVision = this.getAttribute('data-value');
      });
    });
  
    // Handle reading difficulties checkboxes in Step 2
    const readingCheckboxes = document.querySelectorAll('input[name="reading"]');
    readingCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        if (this.checked) {
          if (!config.readingDifficulties.includes(this.value)) {
            config.readingDifficulties.push(this.value);
          }
        } else {
          const index = config.readingDifficulties.indexOf(this.value);
          if (index > -1) {
            config.readingDifficulties.splice(index, 1);
          }
        }
      });
    });
  
    // Handle font preference selection
    const fontSelector = document.getElementById('font-preference');
    const fontPreview = document.getElementById('font-preview');
    
    // Update the font preview when selection changes
    fontSelector.addEventListener('change', function() {
      config.fontPreference = this.value;
      updateFontPreview(this.value);
    });
    
    // Function to update the font preview
    function updateFontPreview(fontName) {
      // Reset any previous styling
      fontPreview.style.fontFamily = '';
      fontPreview.style.letterSpacing = '';
      fontPreview.style.wordSpacing = '';
      fontPreview.style.lineHeight = '';
      
      // Remove any previous font classes
      fontPreview.className = 'font-preview';
      
      // Apply new font styling
      switch(fontName) {
        case 'opendyslexic':
          // Try to load OpenDyslexic from CDN
          const openDyslexicStyle = document.createElement('style');
          openDyslexicStyle.textContent = `
            @font-face {
              font-family: 'OpenDyslexic';
              src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Regular.woff') format('woff');
              font-weight: normal;
              font-style: normal;
            }
          `;
          document.head.appendChild(openDyslexicStyle);
          
          fontPreview.style.fontFamily = "'OpenDyslexic', Arial, sans-serif";
          fontPreview.style.letterSpacing = "0.15em";
          fontPreview.style.wordSpacing = "0.25em";
          fontPreview.style.lineHeight = "1.4";
          fontPreview.classList.add('opendyslexic');
          break;
        
        case 'arial':
          fontPreview.style.fontFamily = "Arial, sans-serif";
          fontPreview.style.letterSpacing = "0.05em";
          fontPreview.style.wordSpacing = "0.1em";
          fontPreview.style.lineHeight = "1.3";
          fontPreview.classList.add('arial');
          break;
        
        case 'comic-sans':
          fontPreview.style.fontFamily = "'Comic Sans MS', cursive, sans-serif";
          fontPreview.style.letterSpacing = "0.05em";
          fontPreview.style.wordSpacing = "0.1em";
          fontPreview.style.lineHeight = "1.3";
          fontPreview.classList.add('comic-sans');
          break;
        
        default:
          // Default font - browser default
          break;
      }
    }
  
    // Handle visual comfort settings in Step 3
    const brightnessSensitivity = document.getElementById('brightness-sensitivity');
    brightnessSensitivity.addEventListener('input', function() {
      config.brightnessSensitivity = parseInt(this.value);
    });
  
    const textSize = document.getElementById('text-size');
    textSize.addEventListener('input', function() {
      config.textSize = parseInt(this.value);
      
      // Update the text size preview
      const textSizeValue = document.getElementById('text-size-value');
      if (textSizeValue) {
        textSizeValue.textContent = this.value + '%';
      }
      
      // If there's a preview element for text size, update it
      const textSizePreview = document.getElementById('text-size-preview');
      if (textSizePreview) {
        textSizePreview.style.fontSize = (this.value / 100) + 'em';
      }
    });
  
    const darkMode = document.getElementById('dark-mode');
    darkMode.addEventListener('change', function() {
      config.darkMode = this.checked;
    });
  
    // Navigation functionality
    nextButtons.forEach(button => {
      button.addEventListener('click', function() {
        // Validate current step if needed
        if (currentStep === 0 && config.colorVision === 'none' && !document.querySelector('.option-card.selected')) {
          // Just let them proceed even with none selected - we'll use "none" as default
          config.colorVision = 'none';
        }
        
        // Hide current step
        steps[currentStep].classList.remove('active');
        // Show next step
        currentStep++;
        if (currentStep >= steps.length) {
          currentStep = steps.length - 1;
        }
        steps[currentStep].classList.add('active');
      });
    });
  
    backButtons.forEach(button => {
      button.addEventListener('click', function() {
        // Hide current step
        steps[currentStep].classList.remove('active');
        // Show previous step
        currentStep--;
        if (currentStep < 0) {
          currentStep = 0;
        }
        steps[currentStep].classList.add('active');
      });
    });
  
    // Finish button functionality
    finishButton.addEventListener('click', function() {
      // Apply configurations and save to storage
      applyConfiguration();
    });
  
    function applyConfiguration() {
      // Determine which filter to enable based on color vision selection
      let activeFilter = "OFF";
      
      if (config.colorVision === 'achromatopsia' || config.colorVision === 'grayscale') {
        activeFilter = "GRAYSCALE"; // Map achromatopsia to grayscale filter
      } else if (config.colorVision !== 'none') {
        activeFilter = config.colorVision.toUpperCase();
      } else if (config.readingDifficulties.includes('focus')) {
        activeFilter = "GRAYSCALE";
      } else if (config.darkMode) {
        activeFilter = "DARK";
      }
      
      // Determine text settings based on user selections
      let textSize = config.textSize / 100; // Convert percentage to decimal
      let lineSpacing = 1.0;
      let letterSpacing = 0;
      let wordSpacing = 0;
      
      // Adjust text settings for dyslexia or small text difficulties
      if (config.readingDifficulties.includes('dyslexia')) {
        lineSpacing = 1.5;
        letterSpacing = 2;
        wordSpacing = 4;
      } else if (config.readingDifficulties.includes('small-text')) {
        textSize = Math.max(textSize, 1.2); // Ensure minimum 120% text size
      }
      
      // Save all settings to chrome.storage.local
      chrome.storage.local.set({
        // Base settings
        userSetup: true,
        
        // Color vision settings
        colorVisionType: config.colorVision,
        focusMode: activeFilter,
        
        // Reading settings
        readingDifficulties: config.readingDifficulties,
        fontPreference: config.fontPreference,
        
        // Visual comfort settings
        brightnessSensitivity: config.brightnessSensitivity,
        textSize: textSize,
        zoomFactor: textSize, // Use same factor for zoom
        darkMode: config.darkMode,
        
        // Text customization settings
        lineSpacing: lineSpacing,
        letterSpacing: letterSpacing,
        wordSpacing: wordSpacing,
        textGuide: config.readingDifficulties.includes('tracking'),
        highContrast: config.brightnessSensitivity > 7, // Enable high contrast for high sensitivity
        contrastMode: config.darkMode ? "inverted" : "normal"
      }, function() {
        // After saving, open a new tab to show the effect or show completion message
        chrome.tabs.create({ url: 'setup-complete.html' }, function() {
          // Close the setup window after opening the new tab
          window.close();
        });
      });
    }
    
    // Initialize the font preview with the current selection
    updateFontPreview(fontSelector.value);
  });
