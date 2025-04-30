// font-manager.js
// A system for applying and removing fonts without page reloads - with improved reset

// Track font-related modifications
const fontState = {
    activeFont: "default",
    fontStyleElement: null,
    originalFonts: new Map()
  };
  
  // Function to apply a font
  function applyFont(fontName) {
    // First, remove any existing font
    removeFont();
    
    // If default font, we're done (already removed everything)
    if (!fontName || fontName === "default") {
      fontState.activeFont = "default";
      return;
    }
    
    // Set the active font
    fontState.activeFont = fontName;
    
    // Apply the appropriate font based on type
    switch (fontName) {
      case "opendyslexic":
        applyOpenDyslexicFont();
        break;
      case "arial":
        applyArialFont();
        break;
      case "comic-sans":
        applyComicSansFont();
        break;
      default:
        // For any other font, apply it generically
        applyGenericFont(fontName);
        break;
    }
  }
  
  // Function to completely remove font customization
  function removeFont() {
    console.log("Removing all font customizations");
    
    try {
      // Remove font style element if it exists
      if (fontState.fontStyleElement) {
        fontState.fontStyleElement.remove();
        fontState.fontStyleElement = null;
      }
      
      // Look for any other font style elements that might have been missed
      const fontStyles = document.querySelectorAll('style[id^="eyebrowse-font"]');
      fontStyles.forEach(style => style.remove());
      
      // Reset all elements with stored original fonts
      fontState.originalFonts.forEach((originalFont, element) => {
        if (element && document.contains(element)) {
          element.style.fontFamily = originalFont;
        }
      });
      
      // For added reliability, reset font-family on all text elements
      const textElements = document.querySelectorAll(
        'body, p, h1, h2, h3, h4, h5, h6, li, span, div, a, button, label'
      );
      
      textElements.forEach(element => {
        // Only remove if it appears to be set by our extension
        if (element.style.fontFamily &&
            (element.style.fontFamily.includes('OpenDyslexic') ||
             element.style.fontFamily.includes('Arial') ||
             element.style.fontFamily.includes('Comic Sans'))) {
          element.style.fontFamily = '';
        }
      });
      
      // Clear the stored fonts
      fontState.originalFonts.clear();
      
      // Also remove any inline styles added to the body
      document.body.style.fontFamily = '';
      document.body.style.letterSpacing = '';
      document.body.style.wordSpacing = '';
      document.body.style.lineHeight = '';
      
      // Set active font to default
      fontState.activeFont = "default";
      
      // Force a repaint to ensure changes take effect
      document.body.style.transform = 'translateZ(0)';
      setTimeout(() => {
        document.body.style.transform = '';
      }, 10);
      
      // Disconnect any font observer
      if (window.eyebrowseFontObserver) {
        window.eyebrowseFontObserver.disconnect();
        window.eyebrowseFontObserver = null;
      }
      
      console.log("Font reset completed");
      return true;
    } catch (error) {
      console.error("Error removing fonts:", error);
      return false;
    }
  }
  
  // Create or update the font style element
  function createFontStyle(css) {
    // Remove existing style if present
    if (fontState.fontStyleElement) {
      fontState.fontStyleElement.remove();
    }
    
    // Create new style element
    fontState.fontStyleElement = document.createElement('style');
    fontState.fontStyleElement.id = 'eyebrowse-font-style';
    fontState.fontStyleElement.textContent = css;
    document.head.appendChild(fontState.fontStyleElement);
    
    console.log("Font style element created");
  }
  
  // Apply a font to an element and track the change
  function applyFontToElement(element, fontFamily) {
    // Skip elements we want to preserve (like code blocks, inputs)
    if (element.tagName === 'PRE' || element.tagName === 'CODE' || 
        element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      return;
    }
    
    // Store original font if not already tracked
    if (!fontState.originalFonts.has(element)) {
      const computedStyle = window.getComputedStyle(element);
      fontState.originalFonts.set(element, computedStyle.fontFamily);
    }
    
    // Apply the new font
    element.style.fontFamily = fontFamily;
  }
  
  // Apply OpenDyslexic font
  function applyOpenDyslexicFont() {
    // Create font-face and base styles
    createFontStyle(`
      @font-face {
        font-family: 'OpenDyslexic';
        src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Regular.woff') format('woff');
        font-weight: normal;
        font-style: normal;
      }
      
      @font-face {
        font-family: 'OpenDyslexic';
        src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Bold.woff') format('woff');
        font-weight: bold;
        font-style: normal;
      }
      
      /* Base styles that affect all elements */
      body {
        font-family: 'OpenDyslexic', Arial, sans-serif !important;
        letter-spacing: 0.15em !important;
        word-spacing: 0.25em !important;
        line-height: 1.4 !important;
      }
    `);
    
    // Apply to specific elements for better coverage
    const textElements = document.querySelectorAll(
      'p, h1, h2, h3, h4, h5, h6, li, span, div, a, button, label'
    );
    
    textElements.forEach(element => {
      applyFontToElement(element, "'OpenDyslexic', Arial, sans-serif");
    });
    
    // Set up observer to catch new elements
    setupFontObserver("'OpenDyslexic', Arial, sans-serif");
  }
  
  // Apply Arial font
  function applyArialFont() {
    // Create base styles
    createFontStyle(`
      body {
        font-family: Arial, sans-serif !important;
        letter-spacing: 0.05em !important;
        word-spacing: 0.1em !important;
        line-height: 1.3 !important;
      }
    `);
    
    // Apply to specific elements
    const textElements = document.querySelectorAll(
      'p, h1, h2, h3, h4, h5, h6, li, span, div, a, button, label'
    );
    
    textElements.forEach(element => {
      applyFontToElement(element, "Arial, sans-serif");
    });
    
    // Set up observer to catch new elements
    setupFontObserver("Arial, sans-serif");
  }
  
  // Apply Comic Sans font
  function applyComicSansFont() {
    // Create base styles
    createFontStyle(`
      body {
        font-family: 'Comic Sans MS', cursive, sans-serif !important;
        letter-spacing: 0.05em !important;
        word-spacing: 0.1em !important;
        line-height: 1.3 !important;
      }
    `);
    
    // Apply to specific elements
    const textElements = document.querySelectorAll(
      'p, h1, h2, h3, h4, h5, h6, li, span, div, a, button, label'
    );
    
    textElements.forEach(element => {
      applyFontToElement(element, "'Comic Sans MS', cursive, sans-serif");
    });
    
    // Set up observer to catch new elements
    setupFontObserver("'Comic Sans MS', cursive, sans-serif");
  }
  
  // Apply a generic font
  function applyGenericFont(fontName) {
    // Create base styles
    createFontStyle(`
      body {
        font-family: ${fontName}, sans-serif !important;
      }
    `);
    
    // Apply to specific elements
    const textElements = document.querySelectorAll(
      'p, h1, h2, h3, h4, h5, h6, li, span, div, a, button, label'
    );
    
    textElements.forEach(element => {
      applyFontToElement(element, `${fontName}, sans-serif`);
    });
    
    // Set up observer for new elements
    setupFontObserver(`${fontName}, sans-serif`);
  }
  
  // Set up mutation observer to apply font to new elements
  function setupFontObserver(fontFamily) {
    // Remove existing font observer if there is one
    if (window.eyebrowseFontObserver) {
      window.eyebrowseFontObserver.disconnect();
    }
    
    // Create new observer
    window.eyebrowseFontObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes) {
          mutation.addedNodes.forEach(node => {
            // Check if this is a text element
            if (node.nodeType === 1 && // Element node
                !['PRE', 'CODE', 'TEXTAREA', 'INPUT'].includes(node.tagName)) {
              applyFontToElement(node, fontFamily);
            }
            // Check if it contains text elements
            else if (node.querySelectorAll) {
              const textElements = node.querySelectorAll(
                'p, h1, h2, h3, h4, h5, h6, li, span, div, a, button, label'
              );
              textElements.forEach(element => {
                applyFontToElement(element, fontFamily);
              });
            }
          });
        }
      });
    });
    
    // Start observing
    window.eyebrowseFontObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Get the active font
  function getActiveFont() {
    return fontState.activeFont;
  }
  
  // Export functions for use in extension
  if (typeof window !== 'undefined') {
    window.EyeBrowseFontManager = {
      applyFont,
      removeFont,
      getActiveFont
    };
  }
  
  // Ensure the font manager is global
  window.EyeBrowseFontManager = {
    applyFont,
    removeFont,
    getActiveFont
  };