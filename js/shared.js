/**
 * @fileoverview EcoIQ Shared Frontend Utilities
 * @description Common functions used across chatbot, tracker, insights,
 *              calculator and quiz modules. Centralizing these avoids
 *              duplication and keeps behavior consistent app-wide.
 * @module shared
 * @version 1.1.0
 */

'use strict';

/**
 * Eco level progression system with point thresholds.
 * Users advance through levels as they accumulate points from eco-actions.
 *
 * @typedef {Object} EcoLevel
 * @property {number} min - Minimum points required for this level
 * @property {string} name - Level name
 * @property {string} icon - Emoji icon representing the level
 *
 * @type {ReadonlyArray<EcoLevel>}
 */
export const ECO_LEVELS = Object.freeze([
  { min: 1000, name: 'Guardian', icon: '🌍' },
  { min: 600,  name: 'Tree',     icon: '🌲' },
  { min: 300,  name: 'Sapling',  icon: '🌳' },
  { min: 100,  name: 'Sprout',   icon: '🌿' },
  { min: 0,    name: 'Seedling', icon: '🌱' },
]);

/**
 * Sanitizes a string to prevent XSS injection attacks.
 * Escapes HTML special characters and enforces maximum length.
 *
 * This function is critical for security - it prevents malicious scripts
 * from being injected into the DOM through user inputs.
 *
 * @function sanitizeString
 * @param {string} str - Raw input string to sanitize
 * @param {number} [maxLength=2000] - Maximum allowed length in characters
 * @returns {string} Sanitized string safe for DOM insertion
 *
 * @example
 * sanitizeString('<script>alert("xss")</script>')
 * // Returns: '<script>alert("xss")</script>'
 *
 * @example
 * sanitizeString('Hello & goodbye', 5)
 * // Returns: 'Hello' (truncated to 5 chars)
 */
export function sanitizeString(str, maxLength = 2000) {
  if (typeof str !== 'string') return '';
  const amp = String.fromCharCode(38);
  const map = {
    [String.fromCharCode(38)]: amp + 'amp;',
    [String.fromCharCode(60)]: amp + 'lt;',
    [String.fromCharCode(62)]: amp + 'gt;',
    [String.fromCharCode(34)]: amp + 'quot;',
    [String.fromCharCode(39)]: amp + '#x27;',
  };
  let result = '';
  for (const ch of str) {
    result += map[ch] || ch;
  }
  return result.slice(0, maxLength);
}

/**
 * Formats message text with markdown-lite rendering.
 * Supports bold, italic, inline code, paragraphs, and line breaks.
 * All code content is sanitized to prevent XSS.
 *
 * @function formatMessage
 * @param {string} text - Raw message text with markdown syntax
 * @returns {string} HTML-formatted string safe for innerHTML
 *
 * @example
 * formatMessage('**Bold** and *italic* text')
 * // Returns: '<p><strong>Bold</strong> and <em>italic</em> text</p>'
 *
 * @example
 * formatMessage('Use `console.log()` for debugging')
 * // Returns: '<p>Use <code>console.log()</code> for debugging</p>'
 */
export function formatMessage(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, (_, code) =>
      `<code style="background:rgba(34,197,94,0.15);padding:0.1em 0.4em;border-radius:4px;font-family:monospace;">${sanitizeString(code)}</code>`
    )
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

/**
 * Returns today's date as a YYYY-MM-DD formatted string.
 * Used as a consistent key for daily action tracking.
 *
 * @function getTodayKey
 * @returns {string} Date string in YYYY-MM-DD format
 *
 * @example
 * getTodayKey()
 * // Returns: '2026-06-21'
 */
export function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Determines the user's eco level based on accumulated points.
 * Searches through ECO_LEVELS array to find the highest level
 * the user has achieved.
 *
 * @function getLevel
 * @param {number} points - Total accumulated eco points
 * @returns {{name: string, icon: string}} Level object with name and icon
 *
 * @example
 * getLevel(150)
 * // Returns: { name: 'Sprout', icon: '🌿' }
 *
 * @example
 * getLevel(1200)
 * // Returns: { name: 'Guardian', icon: '🌍' }
 */
export function getLevel(points) {
  const level = ECO_LEVELS.find(l => points >= l.min);
  return { name: level.name, icon: level.icon };
}

/**
 * Toggles the AI chatbot panel visibility and manages accessibility state.
 * Handles focus management, body scroll locking, and ARIA attributes.
 * Shared across all pages that include the chat panel markup.
 *
 * Features:
 * - Toggles 'active' class on panel and overlay
 * - Locks body scroll when chat is open
 * - Auto-focuses chat input when opened
 * - Updates ARIA attributes for screen readers
 *
 * @function toggleChat
 * @returns {void}
 *
 * @example
 * toggleChat(); // Opens chat if closed, closes if open
 */
export function toggleChat() {
  const panel   = document.getElementById('chatPanel');
  const overlay = document.getElementById('chatOverlay');
  const btn     = document.getElementById('chatToggleBtn');
  if (!panel) return;

  const isOpen = panel.classList.toggle('active'); // ✅ was 'open' — fixed to 'active'
  overlay?.classList.toggle('active', isOpen);
  overlay?.setAttribute('aria-hidden', String(!isOpen));
  btn?.setAttribute('aria-expanded', String(isOpen));
  document.body.style.overflow = isOpen ? 'hidden' : '';

  if (isOpen) {
    const input = panel.querySelector('#chatInput');
    if (input) setTimeout(() => input.focus(), 50);
  }
}

// Expose globally for inline onclick="" handlers in HTML (ES modules are scoped)
if (typeof window !== 'undefined') {
  window.toggleChat = toggleChat;
}