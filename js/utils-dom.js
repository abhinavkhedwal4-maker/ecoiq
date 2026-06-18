/**
 * @fileoverview DOM and UI utility helpers
 * @module utils/dom
 */

'use strict';

/**
 * Safely query an element by ID with optional validation
 * @param {string} id - Element ID
 * @returns {HTMLElement|null}
 */
export function getElementById(id) {
  if (!id || typeof id !== 'string') return null;
  return document.getElementById(id);
}

/**
 * Sets text content safely with HTML escaping
 * @param {HTMLElement} el - Target element
 * @param {string} text - Text to set
 */
export function setTextContent(el, text) {
  if (!el) return;
  el.textContent = String(text ?? '');
}

/**
 * Shows toast notification with auto-hide
 * @param {string} message - Toast message
 * @param {number} duration - Duration in ms
 * @param {string} id - Optional toast ID
 */
export function showToast(message, duration = 3000, id = 'ecoToast') {
  let toast = getElementById(id);
  if (!toast) {
    toast = document.createElement('div');
    toast.id = id;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.cssText = `
    position:fixed;bottom:2rem;left:50%;
    transform:translateX(-50%) translateY(0);
    background:var(--green);color:var(--dark);
    padding:0.6rem 1.4rem;border-radius:50px;
    font-weight:600;font-size:0.85rem;
    z-index:3000;transition:transform 0.3s ease;
    pointer-events:none;
  `;
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(80px)';
  }, duration - 300);
}

/**
 * Creates a document fragment from an array of items
 * @param {Array} items - Items to render
 * @param {Function} renderFn - Render function for each item
 * @returns {DocumentFragment}
 */
export function createFragment(items, renderFn) {
  const fragment = document.createDocumentFragment();
  items.forEach(item => {
    const el = renderFn(item);
    if (el) fragment.appendChild(el);
  });
  return fragment;
}

/**
 * Debounce function execution
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in ms
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Request animation frame wrapper for throttling
 * @param {Function} fn - Function to throttle
 * @returns {Function}
 */
export function throttleRaf(fn) {
  let frameId;
  return function(...args) {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(() => {
      fn(...args);
      frameId = null;
    });
  };
}

/**
 * Sanitize user input to prevent XSS
 * @param {string} text - Text to sanitize
 * @returns {string}
 */
export function sanitize(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format number with 1 decimal place
 * @param {number} num - Number to format
 * @returns {string}
 */
export function formatNumber(num) {
  return Number(num ?? 0).toFixed(1);
}

/**
 * Get element or throw error in development
 * @param {string} id - Element ID
 * @param {string} context - Context for error message
 * @returns {HTMLElement}
 */
export function getElementOrThrow(id, context = '') {
  const el = getElementById(id);
  if (!el && typeof console !== 'undefined') {
    console.warn(`Missing DOM element: #${id}${context ? ` (${context})` : ''}`);
  }
  return el;
}

/**
 * Add event listener with cleanup function
 * @param {HTMLElement} el - Target element
 * @param {string} event - Event type
 * @param {Function} handler - Event handler
 * @returns {Function} Cleanup function
 */
export function addEventListener(el, event, handler) {
  if (!el) return () => {};
  el.addEventListener(event, handler);
  return () => el.removeEventListener(event, handler);
}

/**
 * Check if page is visible to user
 * @returns {boolean}
 */
export function isPageVisible() {
  return !document.hidden;
}

/**
 * Trap focus within an element
 * @param {HTMLElement} el - Container element
 * @param {Function} onEscape - Callback when Escape is pressed
 */
export function manageFocus(el, onEscape) {
  if (!el) return;

  const focusableElements = el.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  if (!focusableElements.length) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onEscape?.();
    } else if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  el.addEventListener('keydown', handleKeyDown);
  firstElement.focus();

  return () => el.removeEventListener('keydown', handleKeyDown);
}

/**
 * Toggle the EcoAI chat panel open/closed.
 * Targets #chatPanel and #chatOverlay (matching your HTML),
 * and updates the #chatToggleBtn aria-expanded attribute.
 *
 * IMPORTANT: Exposed on window.toggleChat so inline onclick=""
 * handlers in HTML work correctly with ES module scripts.
 *
 * @returns {boolean} true if panel is now open, false if closed
 */
export function toggleChat() {
  const panel   = document.getElementById('chatPanel');
  const overlay = document.getElementById('chatOverlay');
  const btn     = document.getElementById('chatToggleBtn');

  if (!panel) {
    console.warn('toggleChat: #chatPanel not found in DOM');
    return false;
  }

  const isOpen = panel.classList.toggle('active');

  // Show/hide the translucent overlay behind the panel
  if (overlay) {
    overlay.classList.toggle('active', isOpen);
    overlay.setAttribute('aria-hidden', String(!isOpen));
  }

  // Keep the toggle button's aria-expanded in sync
  if (btn) {
    btn.setAttribute('aria-expanded', String(isOpen));
  }

  // Trap / release focus
  if (isOpen) {
    // Focus the textarea so the user can type immediately
    const input = panel.querySelector('#chatInput');
    if (input) setTimeout(() => input.focus(), 50);
  }

  return isOpen;
}

// ─── CRITICAL: expose to window so inline onclick="toggleChat()" works ────────
// ES modules are scoped; functions are NOT global unless explicitly attached.
window.toggleChat = toggleChat;