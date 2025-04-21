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
    fontSelector.addEventListener('change', function() {
      config.fontPreference = this.value;
    });
  
    // Handle visual comfort settings in Step 3
    const brightnessSensitivity = document.getElementById('brightness-sensitivity');
    brightnessSensitivity.addEventListener('input', function() {
      config.brightnessSensitivity = parseInt(this.value);
    });
  
    const textSize = document.getElementById('text-size');
    textSize.addEventListener('input', function() {
      config.textSize = parseInt(this.value);
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
      
      if (config.colorVision !== 'none') {
        activeFilter = config.colorVision.toUpperCase();
      } else if (config.readingDifficulties.includes('focus')) {
        activeFilter = "GRAYSCALE";
      } else if (config.darkMode) {
        activeFilter = "DARK";
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
        textSize: config.textSize / 100, // Convert percentage to decimal
        zoomFactor: config.textSize / 100, // Convert percentage to decimal
        darkMode: config.darkMode,
        
        // Reading guide based on reading difficulties
        readingGuideActive: config.readingDifficulties.includes('tracking')
      }, function() {
        // Close the setup window and return to the extension
        window.close();
      });
    }
  });