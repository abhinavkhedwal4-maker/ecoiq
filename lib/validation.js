/**
 * @fileoverview Shared validation and sanitization utilities
 * @description Common validation logic used by both server.js and api/chat.js
 *              to ensure consistent security and input handling across
 *              development and production environments.
 * @module lib/validation
 * @version 1.1.0
 */

'use strict';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Maximum number of messages allowed in a single request */
const MAX_MESSAGES = 50;

/** Maximum length of message content in characters */
const MAX_CONTENT_LENGTH = 2000;

/** Set of valid message roles for chat API */
const VALID_ROLES = Object.freeze(new Set(['user', 'assistant', 'system']));

// ─── Sanitization ───────────────────────────────────────────────────────────

/**
 * Sanitizes a string to prevent XSS attacks by escaping HTML entities.
 * 
 * @param {string} str - The input string to sanitize
 * @returns {string} Sanitized string with HTML entities escaped
 * 
 * @example
 * sanitizeString('<script>alert("xss")</script>')
 * // Returns: '<script>alert("xss")</script>'
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;')
    .slice(0, MAX_CONTENT_LENGTH);
}

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Validates and sanitizes an array of chat messages.
 * 
 * Checks that:
 * - Input is an array
 * - Array is not empty and not too long
 * - Each message has valid structure (role and content)
 * - Roles are from the allowed set
 * - Content is non-empty string
 * 
 * @param {Array<{role: string, content: string}>} messages - Array of message objects
 * @returns {{valid: boolean, sanitized?: Array, error?: string}} Validation result
 * 
 * @example
 * validateMessages([{ role: 'user', content: 'Hello' }])
 * // Returns: { valid: true, sanitized: [{ role: 'user', content: 'Hello' }] }
 * 
 * @example
 * validateMessages([{ role: 'invalid', content: 'Test' }])
 * // Returns: { valid: false, error: 'Invalid role: invalid' }
 */
function validateMessages(messages) {
  if (!Array.isArray(messages)) {
    return { valid: false, error: 'Messages must be an array' };
  }
  
  if (messages.length === 0) {
    return { valid: false, error: 'Messages array is empty' };
  }
  
  if (messages.length > MAX_MESSAGES) {
    return { valid: false, error: 'Too many messages' };
  }

  const sanitized = [];

  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') {
      return { valid: false, error: 'Invalid message object' };
    }
    
    if (!VALID_ROLES.has(msg.role)) {
      return { valid: false, error: `Invalid role: ${msg.role}` };
    }
    
    if (typeof msg.content !== 'string') {
      return { valid: false, error: 'Content must be string' };
    }
    
    if (!msg.content.trim()) {
      return { valid: false, error: 'Content cannot be empty' };
    }
    
    sanitized.push({
      role: msg.role,
      content: sanitizeString(msg.content),
    });
  }

  return { valid: true, sanitized };
}

// ─── Exports ────────────────────────────────────────────────────────────────

// CommonJS export for Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sanitizeString,
    validateMessages,
    MAX_MESSAGES,
    MAX_CONTENT_LENGTH,
    VALID_ROLES,
  };
}

// ES module export for modern environments
export { sanitizeString, validateMessages, MAX_MESSAGES, MAX_CONTENT_LENGTH, VALID_ROLES };

// Made with Bob
