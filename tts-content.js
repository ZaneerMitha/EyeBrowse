// Initialize variables
let ttsEnabled = false;
let ttsRate = 1.0;
let ttsPitch = 1.0;
let ttsVoice = ""; 
let ttsSpeaking = false;
let ttsUtterance = null;
let ttsHighlightedElements = [];
let ttsHighlightStyle = null;
let hoverEnabled = false;
let hoverDelay = 500; // milliseconds to wait before reading after hover
let hoverTimeout = null;
let lastHoveredElement = null;

// Load TTS settings from storage
chrome.storage.local.get(
  ["ttsEnabled", "ttsRate", "ttsPitch", "ttsVoice", "ttsHoverEnabled"],
  (result) => {
    ttsEnabled = result.ttsEnabled === true;
    ttsRate = result.ttsRate || 1.0;
    ttsPitch = result.ttsPitch || 1.0;
    ttsVoice = result.ttsVoice || "";
    hoverEnabled = result.ttsHoverEnabled === true;
    
    // Add highlight style
    addHighlightStyle();
    
    // Setup hover listeners if enabled
    if (ttsEnabled && hoverEnabled) {
      setupHoverListeners();
    }
  }
);

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    if (changes.ttsEnabled) {
      ttsEnabled = changes.ttsEnabled.newValue === true;
      // Setup or remove hover listeners when enabled state changes
      if (ttsEnabled && hoverEnabled) {
        setupHoverListeners();
      } else {
        removeHoverListeners();
      }
    }
    if (changes.ttsRate) {
      ttsRate = changes.ttsRate.newValue || 1.0;
    }
    if (changes.ttsPitch) {
      ttsPitch = changes.ttsPitch.newValue || 1.0;
    }
    if (changes.ttsVoice) {
      ttsVoice = changes.ttsVoice.newValue || "";
    }
    if (changes.ttsHoverEnabled) {
      hoverEnabled = changes.ttsHoverEnabled.newValue === true;
      // Setup or remove hover listeners when hover enabled state changes
      if (ttsEnabled && hoverEnabled) {
        setupHoverListeners();
      } else {
        removeHoverListeners();
      }
    }
  }
});

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "startTTS") {
    if (ttsEnabled) {
      startReading();
    }
    sendResponse({ success: true });
    return true;
  } else if (message.command === "stopTTS") {
    stopReading();
    sendResponse({ success: true });
    return true;
  } else if (message.command === "toggleHoverTTS") {
    hoverEnabled = message.enable === true;
    if (ttsEnabled && hoverEnabled) {
      setupHoverListeners();
    } else {
      removeHoverListeners();
    }
    sendResponse({ success: true });
    return true;
  }
});

// Function to set up hover listeners
function setupHoverListeners() {
  console.log("Setting up hover listeners for TTS");
  
  // Remove any existing listeners to avoid duplicates
  removeHoverListeners();
  
  // Add mouseover event to document
  document.addEventListener('mouseover', handleElementHover);
  
  // Add mouseout event to document
  document.addEventListener('mouseout', handleElementLeave);
}

// Function to remove hover listeners
function removeHoverListeners() {
  console.log("Removing hover listeners for TTS");
  
  // Remove existing event listeners
  document.removeEventListener('mouseover', handleElementHover);
  document.removeEventListener('mouseout', handleElementLeave);
  
  // Clear any pending hover timeout
  if (hoverTimeout) {
    clearTimeout(hoverTimeout);
    hoverTimeout = null;
  }
}

// Handle element hover
function handleElementHover(event) {
  // Skip if not enabled
  if (!ttsEnabled || !hoverEnabled) return;
  
  // Get the target element
  const element = event.target;
  
  // Skip if it's the same element already being processed
  if (element === lastHoveredElement) return;
  
  // Only read text from meaningful elements
  if (isReadableElement(element) && element.textContent.trim().length > 0) {
    // Clear any previous hover timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    
    // Set the last hovered element
    lastHoveredElement = element;
    
    // Set a timeout to start reading after delay
    hoverTimeout = setTimeout(() => {
      // Stop any previous reading
      stopReading();
      
      // Get text to read
      let textToRead = element.textContent.trim();
      
      // If it's a header, announce it as such for context
      if (isHeading(element)) {
        const headingLevel = getHeadingLevel(element);
        textToRead = `Heading level ${headingLevel}: ${textToRead}`;
      }
      
      // For images, read alt text if available
      if (element.tagName === 'IMG' && element.alt) {
        textToRead = `Image: ${element.alt}`;
      }
      
      // For links, add context
      if (element.tagName === 'A') {
        if (element.getAttribute('href')) {
          textToRead = `Link: ${textToRead}`;
        }
      }
      
      // For buttons
      if (element.tagName === 'BUTTON' || 
          (element.tagName === 'INPUT' && element.getAttribute('type') === 'button')) {
        textToRead = `Button: ${textToRead}`;
      }
      
      // For input fields
      if (element.tagName === 'INPUT' && element.getAttribute('type') !== 'button') {
        const inputType = element.getAttribute('type') || 'text';
        let inputLabel = getInputLabel(element);
        
        if (inputLabel) {
          textToRead = `${inputType} field, ${inputLabel}`;
        } else {
          textToRead = `${inputType} field`;
        }
        
        // Add current value for text inputs
        if (element.value && ['text', 'email', 'number', 'search'].includes(inputType)) {
          textToRead += `, current value: ${element.value}`;
        }
      }
      
      // Limit text length to avoid reading entire paragraphs on hover
      if (textToRead.length > 150) {
        textToRead = textToRead.substring(0, 150) + '...';
      }
      
      // Speak the text
      speak(textToRead, [element]);
      
    }, hoverDelay);
  }
}

// Handle element leave
function handleElementLeave(event) {
  // Clear timeout if mouse leaves before reading starts
  if (hoverTimeout) {
    clearTimeout(hoverTimeout);
    hoverTimeout = null;
  }
  
  // Reset last hovered element
  if (event.target === lastHoveredElement) {
    lastHoveredElement = null;
  }
}

// Check if element is a readable element of interest
function isReadableElement(element) {
  // Skip elements without text content
  if (!element.textContent || element.textContent.trim().length === 0) {
    return false;
  }
  
  // Skip if element is tiny or hidden
  if (isElementHidden(element)) {
    return false;
  }
  
  // Elements we want to read
  const readableTags = [
    'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'LI', 'TD', 'TH', 'A', 'BUTTON', 'LABEL',
    'SPAN', 'DIV', 'ARTICLE', 'SECTION',
    'INPUT', 'TEXTAREA', 'SELECT', 'IMG'
  ];
  
  if (readableTags.includes(element.tagName)) {
    return true;
  }
  
  // Check for ARIA roles that indicate meaningful content
  const ariaRole = element.getAttribute('role');
  if (ariaRole) {
    const readableRoles = [
      'heading', 'button', 'link', 'checkbox',
      'menuitem', 'option', 'radio', 'tab',
      'treeitem', 'alert', 'alertdialog', 'dialog'
    ];
    
    if (readableRoles.includes(ariaRole)) {
      return true;
    }
  }
  
  return false;
}

// Check if element is a heading
function isHeading(element) {
  if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.tagName)) {
    return true;
  }
  
  if (element.getAttribute('role') === 'heading') {
    return true;
  }
  
  return false;
}

// Get heading level
function getHeadingLevel(element) {
  if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.tagName)) {
    return element.tagName.charAt(1);
  }
  
  if (element.getAttribute('role') === 'heading') {
    const ariaLevel = element.getAttribute('aria-level');
    if (ariaLevel) {
      return ariaLevel;
    }
  }
  
  return 1; // Default level
}

// Get input field label
function getInputLabel(input) {
  // Check for associated label
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) {
      return label.textContent.trim();
    }
  }
  
  // Check for aria-label
  const ariaLabel = input.getAttribute('aria-label');
  if (ariaLabel) {
    return ariaLabel;
  }
  
  // Check for placeholder
  const placeholder = input.getAttribute('placeholder');
  if (placeholder) {
    return placeholder;
  }
  
  return null;
}

// Function to start reading the page
function startReading() {
  // Stop any previous reading
  stopReading();
  
  // Get all readable elements
  const readableElements = getReadableElements();
  
  if (readableElements.length === 0) {
    speak("No readable content found on this page.");
    return;
  }
  
  // Create a combined text from readable elements
  let allText = "";
  readableElements.forEach(element => {
    allText += element.textContent + " ";
  });
  
  // Start speaking
  speak(allText, readableElements);
}

// Function to stop reading
function stopReading() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    ttsSpeaking = false;
    
    // Remove any highlights
    removeHighlights();
  }
}

// Function to speak text
function speak(text, elements = null) {
  if (!window.speechSynthesis) {
    console.error("Speech synthesis not supported");
    return;
  }
  
  // Create utterance
  ttsUtterance = new SpeechSynthesisUtterance(text);
  
  // Set properties
  ttsUtterance.rate = ttsRate;
  ttsUtterance.pitch = ttsPitch;
  
  // Set voice if specified
  if (ttsVoice !== "") {
    const voices = window.speechSynthesis.getVoices();
    const voiceIndex = parseInt(ttsVoice);
    if (!isNaN(voiceIndex) && voiceIndex >= 0 && voiceIndex < voices.length) {
      ttsUtterance.voice = voices[voiceIndex];
    }
  }
  
  // Set event handlers
  ttsUtterance.onstart = () => {
    ttsSpeaking = true;
    if (elements && elements.length > 0) {
      highlightElement(elements[0]);
    }
  };
  
  ttsUtterance.onend = () => {
    ttsSpeaking = false;
    removeHighlights();
  };
  
  // Element progress tracking for long content
  if (elements && elements.length > 1) {
    let currentIndex = 0;
    
    ttsUtterance.onboundary = (event) => {
      // Every few words, check if we should move to next element
      if (event.charIndex > 0 && event.charIndex % 50 === 0) {
        const textUpToNow = text.substring(0, event.charIndex);
        const wordsUpToNow = textUpToNow.split(/\s+/).length;
        
        // Check if we've passed the current element's content
        let wordsSoFar = 0;
        for (let i = 0; i <= currentIndex; i++) {
          const elementWords = elements[i].textContent.split(/\s+/).length;
          wordsSoFar += elementWords;
          
          // If we've passed this element, move to the next
          if (wordsUpToNow > wordsSoFar && i === currentIndex && currentIndex < elements.length - 1) {
            currentIndex++;
            removeHighlights();
            highlightElement(elements[currentIndex]);
            break;
          }
        }
      }
    };
  }
  
  // Start speaking
  window.speechSynthesis.speak(ttsUtterance);
}

// Function to get readable elements
function getReadableElements() {
  // Select elements with meaningful text content
  const selectors = [
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'article', 'section', 'main',
    'li', 'td', 'th',
    '[role="article"]', '[role="main"]', '[role="contentinfo"]'
  ];
  
  const elements = document.querySelectorAll(selectors.join(','));
  
  // Filter out elements with no meaningful content
  return Array.from(elements).filter(element => {
    // Skip if hidden
    if (isElementHidden(element)) return false;
    
    // Skip if empty or only whitespace
    const text = element.textContent.trim();
    if (!text || text.length < 5) return false;
    
    // Skip if it's a container that only contains other selected elements
    if (element.querySelector(selectors.join(','))) {
      // Check if it has direct text nodes with content
      let hasDirectText = false;
      for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          hasDirectText = true;
          break;
        }
      }
      if (!hasDirectText) return false;
    }
    
    return true;
  });
}

// Function to check if element is hidden
function isElementHidden(element) {
  const style = window.getComputedStyle(element);
  return style.display === 'none' || 
         style.visibility === 'hidden' || 
         style.opacity === '0' ||
         element.offsetWidth === 0 ||
         element.offsetHeight === 0;
}

// Function to add highlight style
function addHighlightStyle() {
  if (ttsHighlightStyle) return;
  
  ttsHighlightStyle = document.createElement('style');
  ttsHighlightStyle.id = 'eyebrowse-tts-highlight-style';
  ttsHighlightStyle.textContent = `
    .eyebrowse-tts-highlight {
      background-color: rgba(77, 144, 254, 0.25) !important;
      border: 2px solid rgba(77, 144, 254, 0.5) !important;
      border-radius: 3px !important;
    }
  `;
  document.head.appendChild(ttsHighlightStyle);
}

// Function to highlight an element
function highlightElement(element) {
  // Skip if already highlighted
  if (element.classList.contains('eyebrowse-tts-highlight')) return;
  
  // Add highlight class
  element.classList.add('eyebrowse-tts-highlight');
  
  // Scroll into view if needed
  if (!isElementInViewport(element)) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  
  // Add to tracked highlights
  ttsHighlightedElements.push(element);
}

// Function to remove all highlights
function removeHighlights() {
  ttsHighlightedElements.forEach(element => {
    element.classList.remove('eyebrowse-tts-highlight');
  });
  ttsHighlightedElements = [];
}

// Function to check if element is in viewport
function isElementInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}