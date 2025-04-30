// screen-reader-support.js - Improves the screen reader experience
// Load this as a content script

// Screen reader improvements
(function() {
    // Track if improvements are active
    let screenReaderImprovementsActive = false;
    
    // Load settings
    chrome.storage.local.get("screenReaderImprovements", (result) => {
      screenReaderImprovementsActive = result.screenReaderImprovements === true;
      if (screenReaderImprovementsActive) {
        applyScreenReaderImprovements();
      }
    });
    
    // Listen for setting changes
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.screenReaderImprovements) {
        screenReaderImprovementsActive = changes.screenReaderImprovements.newValue === true;
        
        if (screenReaderImprovementsActive) {
          applyScreenReaderImprovements();
        } else {
          removeScreenReaderImprovements();
        }
      }
    });
    
    // Listen for messages from extension
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.command === "toggleScreenReaderImprovements") {
        if (message.enable) {
          applyScreenReaderImprovements();
        } else {
          removeScreenReaderImprovements();
        }
        sendResponse({ success: true });
        return true;
      }
    });
    
    // Apply screen reader improvements
    function applyScreenReaderImprovements() {
      // Set aria attributes for better screen reader navigation
      improveHeadings();
      improveImages();
      improveForms();
      improveLinks();
      improveNavigation();
      improveArticles();
      improveTablesAndLists();
      
      // Add skip links
      addSkipLinks();
      
      // Add keyboard navigation
      enhanceKeyboardNavigation();
      
      // Mark as active
      screenReaderImprovementsActive = true;
      document.documentElement.classList.add('eyebrowse-screen-reader-active');
    }
    
    // Remove screen reader improvements
    function removeScreenReaderImprovements() {
      // Remove skip links
      const skipLinks = document.querySelectorAll('.eyebrowse-skip-link');
      skipLinks.forEach(link => link.remove());
      
      // Remove keyboard navigation enhancements
      document.removeEventListener('keydown', handleKeyboardNavigation);
      
      // Remove focus indicators
      removeFocusIndicators();
      
      // Mark as inactive
      screenReaderImprovementsActive = false;
      document.documentElement.classList.remove('eyebrowse-screen-reader-active');
    }
    
    // Improve headings
    function improveHeadings() {
      // Find elements that visually look like headings but aren't
      const potentialHeadings = document.querySelectorAll('div[class*="title"], div[class*="header"], div[class*="heading"], div[class*="head"], div[id*="title"], div[id*="header"], div[id*="heading"], div[id*="head"]');
      
      potentialHeadings.forEach(element => {
        // Skip if it's already a heading
        if (element.tagName === 'H1' || element.tagName === 'H2' || 
            element.tagName === 'H3' || element.tagName === 'H4' || 
            element.tagName === 'H5' || element.tagName === 'H6') {
          return;
        }
        
        // Skip if it already has a role
        if (element.hasAttribute('role')) return;
        
        // Check if it's visually styled like a heading
        const style = window.getComputedStyle(element);
        const fontSize = parseInt(style.fontSize);
        const fontWeight = style.fontWeight;
        
        // If it looks like a heading, add appropriate role
        if ((fontSize >= 18 || parseInt(fontWeight) >= 600) && element.textContent.trim()) {
          element.setAttribute('role', 'heading');
          element.setAttribute('aria-level', fontSize >= 24 ? '1' : fontSize >= 20 ? '2' : '3');
        }
      });
    }
    
    // Improve images
    function improveImages() {
      // Find images without alt text
      const images = document.querySelectorAll('img:not([alt]), img[alt=""]');
      
      images.forEach(img => {
        // Try to extract alt text from various sources
        let altText = '';
        
        // Check for aria-label
        if (img.getAttribute('aria-label')) {
          altText = img.getAttribute('aria-label');
        }
        // Check for title
        else if (img.title) {
          altText = img.title;
        }
        // Check for filename as last resort
        else if (img.src) {
          const filename = img.src.split('/').pop().split('?')[0];
          const name = filename.split('.')[0].replace(/[-_]/g, ' ');
          altText = name.charAt(0).toUpperCase() + name.slice(1); // Capitalize first letter
        }
        
        // If we found something, add it as alt text
        if (altText) {
          img.setAttribute('alt', altText);
        } else {
          // If no alt text could be derived, mark as decorative
          img.setAttribute('role', 'presentation');
          img.setAttribute('alt', '');
        }
      });
      
      // Find SVGs without accessibility
      const svgs = document.querySelectorAll('svg');
      svgs.forEach(svg => {
        if (!svg.getAttribute('role') && !svg.getAttribute('aria-label')) {
          // Try to determine if it's an icon or meaningful image
          const hasText = svg.querySelector('text');
          const hasTitle = svg.querySelector('title');
          
          if (hasText || hasTitle) {
            // It likely has meaning
            svg.setAttribute('role', 'img');
            
            // Use title content as label if available
            if (hasTitle && hasTitle.textContent) {
              svg.setAttribute('aria-label', hasTitle.textContent);
            }
          } else {
            // Likely decorative
            svg.setAttribute('role', 'presentation');
            svg.setAttribute('aria-hidden', 'true');
          }
        }
      });
    }
    
    // Improve forms
    function improveForms() {
      // Find inputs without labels
      const inputs = document.querySelectorAll('input, select, textarea');
      
      inputs.forEach(input => {
        // Skip hidden inputs
        if (input.type === 'hidden') return;
        
        // Skip if it already has good accessibility
        if (input.id && document.querySelector(`label[for="${input.id}"]`)) return;
        if (input.getAttribute('aria-label')) return;
        if (input.getAttribute('aria-labelledby')) return;
        
        // Try to find a label
        let labelText = '';
        
        // Check if it's inside a label
        const parentLabel = input.closest('label');
        if (parentLabel && parentLabel.textContent.trim()) {
          labelText = parentLabel.textContent.trim();
        }
        // Check for placeholder
        else if (input.placeholder) {
          labelText = input.placeholder;
        }
        // Check for nearby text
        else {
          // Look for text nodes that might be labels
          const previousSibling = input.previousSibling;
          if (previousSibling && previousSibling.nodeType === Node.TEXT_NODE && previousSibling.textContent.trim()) {
            labelText = previousSibling.textContent.trim();
          }
          // Look for nearby elements that might be labels
          else {
            const previousElement = input.previousElementSibling;
            if (previousElement && previousElement.textContent.trim() && 
                !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(previousElement.tagName)) {
              labelText = previousElement.textContent.trim();
            }
          }
        }
        
        // If we found a label, add it
        if (labelText) {
          input.setAttribute('aria-label', labelText);
        }
      });
      
      // Improve error messaging
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        // Add an error summary area if not present
        if (!form.querySelector('[role="alert"]')) {
          const errorContainer = document.createElement('div');
          errorContainer.className = 'eyebrowse-error-summary';
          errorContainer.setAttribute('role', 'alert');
          errorContainer.setAttribute('aria-live', 'assertive');
          errorContainer.style.display = 'none';
          
          // Insert at top of form
          form.insertBefore(errorContainer, form.firstChild);
          
          // Listen for invalid inputs
          form.addEventListener('invalid', function(e) {
            const input = e.target;
            
            // Show error summary
            errorContainer.style.display = 'block';
            
            // Add error message
            const errorItem = document.createElement('p');
            errorItem.className = 'eyebrowse-error-item';
            
            let fieldName = input.name || input.id || 'Field';
            // Try to get a better field name
            if (input.id && document.querySelector(`label[for="${input.id}"]`)) {
              fieldName = document.querySelector(`label[for="${input.id}"]`).textContent;
            } else if (input.getAttribute('aria-label')) {
              fieldName = input.getAttribute('aria-label');
            }
            
            errorItem.textContent = `Error in ${fieldName}: ${input.validationMessage}`;
            errorContainer.appendChild(errorItem);
            
            // Link the error to the field
            const errorId = `error-${input.id || Math.random().toString(36).substr(2, 9)}`;
            errorItem.id = errorId;
            input.setAttribute('aria-errormessage', errorId);
            input.setAttribute('aria-invalid', 'true');
          }, true);
          
          // Clear errors when form is reset
          form.addEventListener('reset', function() {
            errorContainer.style.display = 'none';
            errorContainer.innerHTML = '';
            
            // Reset aria-invalid on all inputs
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
              input.removeAttribute('aria-invalid');
              input.removeAttribute('aria-errormessage');
            });
          });
        }
      });
    }
    
    // Improve links
    function improveLinks() {
      // Find links with non-descriptive text
      const links = document.querySelectorAll('a');
      
      links.forEach(link => {
        const linkText = link.textContent.trim();
        
        // Skip links with good text
        if (linkText.length > 4 && 
            !['click here', 'read more', 'learn more', 'more', 'link', 'here'].includes(linkText.toLowerCase())) {
          return;
        }
        
        // Try to find better description
        let betterDescription = '';
        
        // Check for title
        if (link.title) {
          betterDescription = link.title;
        }
        // Check for aria-label
        else if (link.getAttribute('aria-label')) {
          betterDescription = link.getAttribute('aria-label');
        }
        // Check nearby headings
        else {
          const closestHeading = link.closest('section, article, div')?.querySelector('h1, h2, h3, h4, h5, h6');
          if (closestHeading && closestHeading.textContent.trim()) {
            betterDescription = `${linkText} about ${closestHeading.textContent.trim()}`;
          }
        }
        
        // If we found a better description, add it
        if (betterDescription && betterDescription !== linkText) {
          link.setAttribute('aria-label', betterDescription);
        }
      });
      
      // Add indication for external links
      links.forEach(link => {
        if (link.hostname && link.hostname !== window.location.hostname && 
            !link.getAttribute('aria-label')?.includes('external')) {
          
          // Add external link indicator
          const currentLabel = link.getAttribute('aria-label') || link.textContent.trim();
          link.setAttribute('aria-label', `${currentLabel} (external link)`);
        }
      });
    }
    
    // Improve navigation
    function improveNavigation() {
      // Identify main navigation if not marked
      const potentialNavs = document.querySelectorAll('ul, div, nav');
      
      // Look for elements that are likely navigation
      potentialNavs.forEach(element => {
        // Skip if already has role
        if (element.getAttribute('role')) return;
        
        // Skip if it's actual nav element
        if (element.tagName === 'NAV') return;
        
        // Check if it has multiple links and looks like navigation
        const links = element.querySelectorAll('a');
        if (links.length >= 3) {
          // Check if it's in the header or has nav-like classes
          const isInHeader = element.closest('header') !== null;
          const hasNavClasses = element.className.toLowerCase().includes('nav') || 
                               element.className.toLowerCase().includes('menu');
          
          if (isInHeader || hasNavClasses) {
            element.setAttribute('role', 'navigation');
            
            // Add a label if none exists
            if (!element.getAttribute('aria-label')) {
              element.setAttribute('aria-label', isInHeader ? 'Main navigation' : 'Navigation');
            }
          }
        }
      });
    }
    
    // Improve articles and content
    function improveArticles() {
      // Find main content if not marked
      if (!document.querySelector('main, [role="main"]')) {
        // Look for the largest content area
        const contentAreas = document.querySelectorAll('article, section, div');
        let bestCandidate = null;
        let maxTextLength = 0;
        
        contentAreas.forEach(area => {
          // Skip small elements or elements likely to be headers/footers
          if (area.textContent.length < 1000) return;
          if (area.closest('header, footer, aside, nav')) return;
          
          // Calculate the text content length
          const textLength = area.textContent.length;
          
          if (textLength > maxTextLength) {
            maxTextLength = textLength;
            bestCandidate = area;
          }
        });
        
        if (bestCandidate) {
          bestCandidate.setAttribute('role', 'main');
        }
      }
      
      // Find and mark articles/blog posts if not already marked
      const articles = document.querySelectorAll('div[class*="post"], div[class*="article"], div[class*="content"]');
      
      articles.forEach(article => {
        // Skip if already has role
        if (article.getAttribute('role')) return;
        
        // Skip small elements
        if (article.textContent.length < 500) return;
        
        // Check if it has a heading and substantial text
        const hasHeading = article.querySelector('h1, h2, h3');
        const hasParagraphs = article.querySelectorAll('p').length >= 3;
        
        if (hasHeading && hasParagraphs) {
          article.setAttribute('role', 'article');
        }
      });
    }
    
    // Improve tables and lists
    function improveTablesAndLists() {
      // Improve tables
      const tables = document.querySelectorAll('table');
      
      tables.forEach(table => {
        // Skip if it already has good accessibility
        if (table.querySelector('caption') || table.getAttribute('aria-label')) return;
        
        // Look for a heading that might describe the table
        const previousHeading = findPrecedingHeading(table);
        
        if (previousHeading) {
          // Add the heading text as a table summary
          table.setAttribute('aria-label', previousHeading.textContent.trim());
        }
        
        // Ensure table has headers
        if (!table.querySelector('th')) {
          // Attempt to identify header rows/columns
          const firstRow = table.querySelector('tr');
          
          if (firstRow) {
            // Make first row headers if they look like headers
            const cells = firstRow.querySelectorAll('td');
            let mightBeHeaders = true;
            
            cells.forEach(cell => {
              // Headers are usually short and emphasized
              if (cell.textContent.length > 30 || cell.querySelector('a, img, input')) {
                mightBeHeaders = false;
              }
            });
            
            if (mightBeHeaders) {
              cells.forEach(cell => {
                // Change to th
                const style = window.getComputedStyle(cell);
                const clone = document.createElement('th');
                clone.innerHTML = cell.innerHTML;
                cell.parentNode.replaceChild(clone, cell);
              });
            }
          }
        }
      });
      
      // Improve lists
      const lists = document.querySelectorAll('div[class*="list"], ul, ol');
      
      lists.forEach(list => {
        // Skip if already has good accessibility or isn't really a list
        if (list.getAttribute('role') || 
            (list.tagName !== 'UL' && list.tagName !== 'OL' && !list.querySelector('li'))) return;
        
        // Make sure list has a label
        if (!list.getAttribute('aria-label')) {
          // Look for a heading that might describe the list
          const previousHeading = findPrecedingHeading(list);
          
          if (previousHeading) {
            list.setAttribute('aria-label', previousHeading.textContent.trim());
          }
        }
      });
    }
    
    // Helper function to find preceding heading
    function findPrecedingHeading(element) {
      // Look for headings above the element
      let currentElement = element.previousElementSibling;
      
      while (currentElement) {
        if (currentElement.tagName.match(/^H[1-6]$/)) {
          return currentElement;
        }
        currentElement = currentElement.previousElementSibling;
      }
      
      // If no sibling heading, look for parent's heading
      const parent = element.parentElement;
      if (parent) {
        const parentHeading = parent.querySelector('h1, h2, h3, h4, h5, h6');
        if (parentHeading && parentHeading.compareDocumentPosition(element) === Node.DOCUMENT_POSITION_FOLLOWING) {
          return parentHeading;
        }
      }
      
      return null;
    }
    
    // Add skip links
    function addSkipLinks() {
      // Remove any existing skip links
      const existingSkipLinks = document.querySelectorAll('.eyebrowse-skip-link');
      existingSkipLinks.forEach(link => link.remove());
      
      // Create skip links container
      const skipLinksContainer = document.createElement('div');
      skipLinksContainer.className = 'eyebrowse-skip-links';
      skipLinksContainer.style.cssText = `
        position: absolute;
        top: -1000px;
        left: -1000px;
        height: 1px;
        width: 1px;
        overflow: hidden;
        z-index: 10000;
      `;
      
      // Add skip to main content
      const mainContent = document.querySelector('main, [role="main"]');
      if (mainContent) {
        // Ensure it has an ID
        if (!mainContent.id) {
          mainContent.id = 'eyebrowse-main-content';
        }
        
        const skipToMain = document.createElement('a');
        skipToMain.href = `#${mainContent.id}`;
        skipToMain.className = 'eyebrowse-skip-link';
        skipToMain.textContent = 'Skip to main content';
        skipToMain.style.cssText = `
          background: #2673e8;
          color: white;
          padding: 10px 20px;
          display: inline-block;
          position: absolute;
          top: 0;
          left: 0;
          z-index: 10000;
          text-decoration: none;
          font-weight: bold;
          font-family: Arial, sans-serif;
        `;
        
        // Show link on focus
        skipToMain.addEventListener('focus', () => {
          skipToMain.style.top = '5px';
          skipToMain.style.left = '5px';
          skipToMain.style.height = 'auto';
          skipToMain.style.width = 'auto';
        });
        
        // Hide link when blurred
        skipToMain.addEventListener('blur', () => {
          skipToMain.style.top = '-1000px';
          skipToMain.style.left = '-1000px';
        });
        
        skipLinksContainer.appendChild(skipToMain);
      }
      
      // Add skip to navigation
      const navigation = document.querySelector('nav, [role="navigation"]');
      if (navigation) {
        // Ensure it has an ID
        if (!navigation.id) {
          navigation.id = 'eyebrowse-navigation';
        }
        
        const skipToNav = document.createElement('a');
        skipToNav.href = `#${navigation.id}`;
        skipToNav.className = 'eyebrowse-skip-link';
        skipToNav.textContent = 'Skip to navigation';
        skipToNav.style.cssText = `
          background: #2673e8;
          color: white;
          padding: 10px 20px;
          display: inline-block;
          position: absolute;
          top: 0;
          left: 0;
          z-index: 10000;
          text-decoration: none;
          font-weight: bold;
          font-family: Arial, sans-serif;
          margin-top: 40px;
        `;
        
        // Show link on focus
        skipToNav.addEventListener('focus', () => {
          skipToNav.style.top = '5px';
          skipToNav.style.left = '5px';
          skipToNav.style.height = 'auto';
          skipToNav.style.width = 'auto';
        });
        
        // Hide link when blurred
        skipToNav.addEventListener('blur', () => {
          skipToNav.style.top = '-1000px';
          skipToNav.style.left = '-1000px';
        });
        
        skipLinksContainer.appendChild(skipToNav);
      }
      
      // Add container to the page
      if (skipLinksContainer.children.length > 0) {
        document.body.insertBefore(skipLinksContainer, document.body.firstChild);
      }
    }
    
    // Enhance keyboard navigation
    function enhanceKeyboardNavigation() {
      // Add focus indicators
      addFocusIndicators();
      
      // Listen for keyboard events
      document.addEventListener('keydown', handleKeyboardNavigation);
    }
    
    // Add focus indicators
    function addFocusIndicators() {
      // Add a style element for focus indicators
      const styleElement = document.createElement('style');
      styleElement.id = 'eyebrowse-focus-indicators';
      styleElement.textContent = `
        .eyebrowse-screen-reader-active *:focus {
          outline: 3px solid #2673e8 !important;
          outline-offset: 2px !important;
        }
        .eyebrowse-screen-reader-active a:focus,
        .eyebrowse-screen-reader-active button:focus,
        .eyebrowse-screen-reader-active input:focus,
        .eyebrowse-screen-reader-active select:focus,
        .eyebrowse-screen-reader-active textarea:focus {
          box-shadow: 0 0 0 3px #2673e8 !important;
        }
      `;
      
      document.head.appendChild(styleElement);
    }
    
    // Remove focus indicators
    function removeFocusIndicators() {
      const styleElement = document.getElementById('eyebrowse-focus-indicators');
      if (styleElement) {
        styleElement.remove();
      }
    }
    
    // Handle keyboard navigation
    function handleKeyboardNavigation(event) {
      // Skip if modifiers are pressed
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      
      // H to navigate between headings
      if (event.key === 'h') {
        navigateByElement('heading');
        event.preventDefault();
      }
      
      // L to navigate between links
      if (event.key === 'l') {
        navigateByElement('link');
        event.preventDefault();
      }
      
      // F to navigate between form controls
      if (event.key === 'f') {
        navigateByElement('form');
        event.preventDefault();
      }
      
      // M to go to main content
      if (event.key === 'm') {
        const mainContent = document.querySelector('main, [role="main"]');
        if (mainContent) {
          mainContent.focus();
          mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        event.preventDefault();
      }
    }
    
    // Navigate between elements of a specific type
    function navigateByElement(type) {
      let elements = [];
      
      switch (type) {
        case 'heading':
          elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
          break;
        case 'link':
          elements = document.querySelectorAll('a[href]:not([tabindex="-1"])');
          break;
        case 'form':
          elements = document.querySelectorAll('input:not([type="hidden"]), select, textarea, button');
          break;
      }
      
      // Convert to array
      elements = Array.from(elements);
      
      // Filter out hidden elements
      elements = elements.filter(el => !isElementHidden(el));
      
      if (elements.length === 0) return;
      
      // Find the currently focused element
      const focusedElement = document.activeElement;
      let nextIndex = 0;
      
      // Find the index of the currently focused element
      const currentIndex = elements.indexOf(focusedElement);
      
      // If found, move to the next element
      if (currentIndex !== -1) {
        nextIndex = (currentIndex + 1) % elements.length;
      }
      
      // Focus the next element
      elements[nextIndex].focus();
      elements[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Check if element is hidden
    function isElementHidden(element) {
      const style = window.getComputedStyle(element);
      return style.display === 'none' || 
             style.visibility === 'hidden' || 
             style.opacity === '0' ||
             element.offsetWidth === 0 ||
             element.offsetHeight === 0;
    }
  })();