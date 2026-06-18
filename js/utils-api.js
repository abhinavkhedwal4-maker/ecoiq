/**
 * @fileoverview Data and API utility helpers
 * @module utils/api
 */

'use strict';

import { PERFORMANCE, API, SECURITY } from './constants.js';

/**
 * Rate limiter for API calls
 */
class RateLimiter {
  constructor(maxRequests = SECURITY.RATE_LIMIT_MAX_REQUESTS, windowMs = SECURITY.RATE_LIMIT_WINDOW) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  canMakeRequest() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }

  reset() {
    this.requests = [];
  }
}

const chatLimiter = new RateLimiter();

/**
 * Fetch with timeout
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeout - Timeout in ms
 * @returns {Promise}
 */
export async function fetchWithTimeout(url, options = {}, timeout = PERFORMANCE.AI_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Call AI chat API with rate limiting
 * @param {Array} messages - Chat messages
 * @returns {Promise<string>}
 */
export async function callAIChat(messages) {
  if (!chatLimiter.canMakeRequest()) {
    throw new Error('Too many requests. Please wait a moment.');
  }

  // Sanitize messages to prevent injection
  const sanitized = messages.map(msg => ({
    role: msg.role,
    content: String(msg.content ?? '').slice(0, 1000), // Max 1000 chars per message
  }));

  const response = await fetchWithTimeout(API.CHAT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', // CSRF protection
    },
    body: JSON.stringify({ messages: sanitized }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.reply) throw new Error('Empty response');
  
  return data.reply;
}

/**
 * Format markdown to HTML safely
 * @param {string} text - Markdown text
 * @returns {string}
 */
export function formatMarkdown(text) {
  if (!text) return '';
  return String(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

/**
 * Validate data integrity
 * @param {object} data - Data to validate
 * @returns {boolean}
 */
export function validateData(data) {
  if (!data || typeof data !== 'object') return false;
  
  const { stats, history } = data;
  
  if (!stats || typeof stats !== 'object') return false;
  if (!Array.isArray(history)) return false;
  
  return true;
}

/**
 * Deep clone data for safety
 * @param {object} obj - Object to clone
 * @returns {object}
 */
export function deepClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}

/**
 * Get today's date key
 * @returns {string}
 */
export function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Format time
 * @param {Date} date - Date to format
 * @returns {string}
 */
export function formatTime(date = new Date()) {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format date
 * @param {string} dateStr - Date string YYYY-MM-DD
 * @returns {string}
 */
export function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Calculate active days from history
 * @param {Array} history - History array
 * @returns {number}
 */
export function getActiveDays(history) {
  if (!Array.isArray(history)) return 0;
  return new Set(history.map(h => h.date)).size;
}

/**
 * Reset rate limiter (for testing)
 */
export function resetRateLimiter() {
  chatLimiter.reset();
}
