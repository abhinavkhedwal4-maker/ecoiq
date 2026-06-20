/**
 * @fileoverview EcoIQ AI Chatbot
 * @description Secure chatbot using Groq API via server proxy
 * @module chatbot
 */

'use strict';

import { sanitizeString, formatMessage } from './shared.js';

const ENDPOINT       = '/api/chat';
const MAX_MSG_LENGTH = 500;
const RATE_LIMIT     = 10;
const RATE_WINDOW_MS = 60_000;

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

/** @type {Array<{role:string, content:string}>} */
let conversationHistory = [];

/** @type {Array<number>} */
const messageTimes = [];

/** @type {boolean} */
let isProcessing = false;

/**
 * Checks client-side rate limit
 * @returns {boolean}
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
 * Validates message before sending
 * @param {string} message
 * @returns {{valid:boolean, error?:string}}
 */
function validateMessage(message) {
  if (!message || typeof message !== 'string') return { valid: false, error: 'Please enter a message.' };
  if (message.trim().length === 0)             return { valid: false, error: 'Message cannot be empty.' };
  if (message.length > MAX_MSG_LENGTH)         return { valid: false, error: `Maximum ${MAX_MSG_LENGTH} characters.` };
  return { valid: true };
}

/**
 * Appends a chat bubble to the messages container
 * @param {'user'|'ai'} role
 * @param {string} text
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
 * Shows typing indicator
 * @returns {string|null}
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
 * Removes typing indicator
 * @param {string|null} id
 */
function removeTyping(id) {
  if (!id) return;
  document.getElementById(id)?.remove();
}

/**
 * Updates send button state
 * @param {boolean} disabled
 */
function setSendButtonState(disabled) {
  const btn = document.getElementById('sendBtn');
  if (!btn) return;
  btn.disabled = disabled;
  btn.setAttribute('aria-busy',  String(disabled));
  btn.setAttribute('aria-label', disabled ? 'Sending...' : 'Send message');
}

/**
 * Announces to screen readers
 * @param {string} message
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
 * Sends user message to EcoAI
 * @returns {Promise<void>}
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
