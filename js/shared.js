/**
 * @fileoverview EcoIQ Shared Frontend Utilities
 * @description Common functions used across chatbot, tracker, insights,
 *              calculator and quiz modules. Centralizing these avoids
 *              duplication and keeps behavior consistent app-wide.
 * @module shared
 */

'use strict';

/** @type {number} Maximum eco level point thresholds */
export const ECO_LEVELS = Object.freeze([
  { min: 1000, name: 'Guardian', icon: '🌍' },
  { min: 600,  name: 'Tree',     icon: '🌲' },
  { min: 300,  name: 'Sapling',  icon: '🌳' },
  { min: 100,  name: 'Sprout',   icon: '🌿' },
  { min: 0,    name: 'Seedling', icon: '🌱' },
]);

/**
 * Sanitizes a string to prevent XSS injection
 * @param {string} str - Raw input string
 * @param {number} [maxLength=2000] - Maximum allowed length
 * @returns {string} Sanitized string
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
 * Formats message text with markdown-lite rendering (bold, italic, code, paragraphs)
 * @param {string} text - Raw message text
 * @returns {string} HTML-formatted string
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
 * Returns today's date as a YYYY-MM-DD key
 * @returns {string}
 */
export function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Determines the user's eco level based on total points
 * @param {number} points - Total accumulated eco points
 * @returns {{name: string, icon: string}}
 */
export function getLevel(points) {
  const level = ECO_LEVELS.find(l => points >= l.min);
  return { name: level.name, icon: level.icon };
}

/**
 * Toggles the AI chatbot panel open/closed and manages ARIA state
 * Shared across all pages that include the chat panel markup.
 */
export function toggleChat() {
  const panel   = document.getElementById('chatPanel');
  const overlay = document.getElementById('chatOverlay');
  const btn     = document.getElementById('chatToggleBtn');
  if (!panel) return;

  const isOpen = panel.classList.toggle('open');
  overlay?.classList.toggle('active', isOpen);
  btn?.setAttribute('aria-expanded', String(isOpen));
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

// Expose toggleChat globally since it's invoked from inline onclick="" in HTML
// Only in browser environment (not Node.js for tests)
if (typeof window !== 'undefined') {
  window.toggleChat = toggleChat;
}

// Made with Bob
