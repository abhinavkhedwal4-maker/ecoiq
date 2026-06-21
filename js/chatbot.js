/**
 * @fileoverview EcoIQ AI Chatbot
 * @description Secure chatbot interface using Groq LLaMA 3.3 70B via server proxy.
 *              Implements client-side rate limiting, input validation, and
 *              accessibility features for an inclusive chat experience.
 * @module chatbot
 * @version 1.1.0
 */

'use strict';

import { sanitizeString, formatMessage } from './shared.js';

// ─── Configuration Constants ─────────────────────────────────────────────────

/** API endpoint for chat requests (proxied through server) */
const ENDPOINT = '/api/chat';

/** Maximum message length in characters */
const MAX_MSG_LENGTH = 500;

/** Maximum messages allowed per rate limit window */
const RATE_LIMIT = 10;

/** Rate limit window duration in milliseconds (1 minute) */
const RATE_WINDOW_MS = 60_000;

/**
 * System prompt that defines EcoAI's personality and capabilities.
 * Instructs the AI on how to respond to user queries about sustainability.
 * @type {string}
 */
const SYSTEM_PROMPT = `You are EcoAI, an expert sustainability and carbon footprint assistant. Help users:
- Understand and reduce their personal carbon footprint
- Learn about sustainable living practices
- Understand climate change and environmental impact
- Get personalized actionable advice
- Learn about carbon calculations and data

Guidelines:
- Be encouraging, positive and practical
- Use simple language accessible to all
- Include data and numbers when helpful
- Focus on Indian context when appropriate
- Keep responses concise (3-4 paragraphs max)
- End with one concrete action the user can take today`;

// ─── State Management ────────────────────────────────────────────────────────

/**
 * Conversation history maintained for context in multi-turn conversations.
 * @type {Array<{role: string, content: string}>}
 */
let conversationHistory = [];

/**
 * Timestamps of recent messages for rate limiting.
 * @type {Array<number>}
 */
const messageTimes = [];

/**
 * Flag indicating if a message is currently being processed.
 * Prevents concurrent requests.
 * @type {boolean}
 */
let isProcessing = false;

// ─── Rate Limiting ───────────────────────────────────────────────────────────

/**
 * Checks if the user has exceeded the client-side rate limit.
 * Uses a sliding window approach to track message timestamps.
 *
 * @function checkClientRateLimit
 * @returns {boolean} True if within rate limit, false if exceeded
 *
 * @example
 * if (checkClientRateLimit()) {
 *   // Send message
 * } else {
 *   // Show rate limit error
 * }
 */
function checkClientRateLimit() {
  const now    = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  while (messageTimes.length > 0 && messageTimes[0] < cutoff) messageTimes.shift();
  if (messageTimes.length >= RATE_LIMIT) return false;
  messageTimes.push(now);
  return true;
}

/**
 * Validates a user message before sending to the API.
 * Checks for empty messages, type errors, and length limits.
 *
 * @function validateMessage
 * @param {string} message - User's message to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 *
 * @example
 * const result = validateMessage('Hello EcoAI');
 * if (result.valid) {
 *   // Send message
 * } else {
 *   // Show error: result.error
 * }
 */
function validateMessage(message) {
  if (!message || typeof message !== 'string') return { valid: false, error: 'Please enter a message.' };
  if (message.trim().length === 0)             return { valid: false, error: 'Message cannot be empty.' };
  if (message.length > MAX_MSG_LENGTH)         return { valid: false, error: `Maximum ${MAX_MSG_LENGTH} characters.` };
  return { valid: true };
}

/**
 * Appends a chat bubble to the messages container with proper ARIA attributes.
 * Handles both user and AI messages with different styling and formatting.
 *
 * @function appendMessage
 * @param {'user'|'ai'} role - Message sender role
 * @param {string} text - Message content
 * @returns {void}
 *
 * @example
 * appendMessage('user', 'How can I reduce my carbon footprint?');
 * appendMessage('ai', 'Here are 5 ways to reduce your footprint...');
 */
function appendMessage(role, text) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const bubble  = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.setAttribute('role', 'article');
  bubble.setAttribute('aria-label', `${role === 'ai' ? 'EcoAI' : 'You'}: ${text.slice(0, 50)}`);

  const avatar  = document.createElement('div');
  avatar.className = 'bubble-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = role === 'ai' ? '🌱' : 'YOU';

  const content = document.createElement('div');
  content.className = 'bubble-content';
  if (role === 'user') {
    const p = document.createElement('p');
    p.textContent = text;
    content.appendChild(p);
  } else {
    content.innerHTML = formatMessage(text);
  }

  bubble.appendChild(avatar);
  bubble.appendChild(content);
  container.appendChild(bubble);
  requestAnimationFrame(() => bubble.scrollIntoView({ behavior: 'smooth', block: 'end' }));
}

/**
 * Displays an animated typing indicator while AI is processing.
 * Returns the indicator's ID for later removal.
 *
 * @function showTyping
 * @returns {string|null} ID of the typing indicator element, or null if container not found
 *
 * @example
 * const typingId = showTyping();
 * // ... wait for AI response ...
 * removeTyping(typingId);
 */
function showTyping() {
  const container = document.getElementById('chatMessages');
  if (!container) return null;
  const id     = `typing-${Date.now()}`;
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble ai';
  bubble.id        = id;
  bubble.setAttribute('role',      'status');
  bubble.setAttribute('aria-label','EcoAI is thinking...');
  bubble.innerHTML = `
    <div class="bubble-avatar" aria-hidden="true">🌱</div>
    <div class="bubble-content" style="padding:0.8rem 1rem;">
      <div class="typing-indicator" aria-hidden="true">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>`;
  container.appendChild(bubble);
  requestAnimationFrame(() => bubble.scrollIntoView({ behavior: 'smooth', block: 'end' }));
  return id;
}

/**
 * Removes the typing indicator from the chat.
 *
 * @function removeTyping
 * @param {string|null} id - ID of the typing indicator to remove
 * @returns {void}
 *
 * @example
 * removeTyping('typing-1234567890');
 */
function removeTyping(id) {
  if (!id) return;
  document.getElementById(id)?.remove();
}

/**
 * Updates the send button's disabled state and ARIA attributes.
 * Provides visual and accessibility feedback during message processing.
 *
 * @function setSendButtonState
 * @param {boolean} disabled - Whether the button should be disabled
 * @returns {void}
 *
 * @example
 * setSendButtonState(true);  // Disable during processing
 * setSendButtonState(false); // Re-enable after response
 */
function setSendButtonState(disabled) {
  const btn = document.getElementById('sendBtn');
  if (!btn) return;
  btn.disabled = disabled;
  btn.setAttribute('aria-busy',  String(disabled));
  btn.setAttribute('aria-label', disabled ? 'Sending...' : 'Send message');
}

/**
 * Announces a message to screen readers using an ARIA live region.
 * Creates the announcer element if it doesn't exist.
 *
 * @function announceToScreenReader
 * @param {string} message - Message to announce
 * @returns {void}
 *
 * @example
 * announceToScreenReader('Message sent successfully');
 */
function announceToScreenReader(message) {
  let el = document.getElementById('sr-announcer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sr-announcer';
    el.setAttribute('aria-live',   'assertive');
    el.setAttribute('aria-atomic', 'true');
    el.className = 'sr-only';
    document.body.appendChild(el);
  }
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = message; });
}

/**
 * Sends a user message to the EcoAI chatbot via the server proxy.
 *
 * Workflow:
 * 1. Validates message and checks rate limits
 * 2. Sanitizes input and adds to conversation history
 * 3. Shows typing indicator
 * 4. Sends request to /api/chat endpoint
 * 5. Displays AI response
 * 6. Handles errors gracefully
 *
 * @async
 * @function sendMessage
 * @returns {Promise<void>}
 *
 * @example
 * // Called when user clicks send button or presses Enter
 * await sendMessage();
 */
async function sendMessage() {
  if (isProcessing) return;

  const input = document.getElementById('chatInput');
  if (!input) return;

  const rawText    = input.value;
  const validation = validateMessage(rawText);
  if (!validation.valid) { announceToScreenReader(validation.error); return; }

  if (!checkClientRateLimit()) {
    appendMessage('ai', '⚠️ You\'re sending messages too quickly. Please wait a moment.');
    return;
  }

  const message = sanitizeString(rawText.trim(), MAX_MSG_LENGTH);
  isProcessing  = true;

  appendMessage('user', rawText.trim());
  input.value = '';
  autoResize(input);
  setSendButtonState(true);

  conversationHistory.push({ role: 'user', content: message });
  const typingId = showTyping();

  try {
    const response = await fetch(ENDPOINT, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...conversationHistory,
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Server error ${response.status}`);
    }

    const data  = await response.json();
    const reply = data.reply;
    if (!reply || typeof reply !== 'string') throw new Error('Empty response from EcoAI.');

    conversationHistory.push({ role: 'assistant', content: reply });
    removeTyping(typingId);
    appendMessage('ai', reply);
    announceToScreenReader('EcoAI responded.');

  } catch (error) {
    removeTyping(typingId);
    appendMessage('ai', `⚠️ ${error.message} Make sure the server is running with npm start.`);
    conversationHistory.pop();
    console.error('[EcoAI Error]', error);
  } finally {
    isProcessing = false;
    setSendButtonState(false);
    input.focus();
  }
}

window.sendSuggestion = function(text) {
  const input = document.getElementById('chatInput');
  if (!input || isProcessing) return;
  input.value = text;
  autoResize(input);
  sendMessage();
};

window.sendMessage = sendMessage;

window.handleChatKey = function(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
};

window.autoResize = function(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
};

window.clearChat = function() {
  conversationHistory = [];
  const container = document.getElementById('chatMessages');
  if (!container) return;
  container.innerHTML = `
    <div class="chat-bubble ai" role="article">
      <div class="bubble-avatar" aria-hidden="true">🌱</div>
      <div class="bubble-content"><p>Chat cleared! How can I help you go green today?</p></div>
    </div>`;
  announceToScreenReader('Chat cleared.');
};

// Made with Bob
