/**
 * @fileoverview EcoIQ Local Development Server
 * @description Secure Node.js server with rate limiting, CSP headers,
 *              input validation and Groq API proxy
 * @version 2.0.0
 */

'use strict';

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

require('dotenv').config();

const PORT        = parseInt(process.env.PORT, 10) || 3000;
const MAX_BODY    = 1024 * 50;
const RATE_WINDOW = 60 * 1000;
const RATE_LIMIT  = 30;

/** @type {Map<string, {count:number, reset:number}>} */
const rateLimitStore = new Map();

const MIME_TYPES = Object.freeze({
  '.html' : 'text/html; charset=utf-8',
  '.css'  : 'text/css; charset=utf-8',
  '.js'   : 'application/javascript; charset=utf-8',
  '.json' : 'application/json; charset=utf-8',
  '.png'  : 'image/png',
  '.jpg'  : 'image/jpeg',
  '.jpeg' : 'image/jpeg',
  '.svg'  : 'image/svg+xml',
  '.ico'  : 'image/x-icon',
  '.webp' : 'image/webp',
});

/**
 * Applies security headers to every response
 * @param {http.ServerResponse} res
 */
function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Checks rate limit per IP
 * @param {string} ip
 * @returns {boolean}
 */
function checkRateLimit(ip) {
  const now    = Date.now();
  const record = rateLimitStore.get(ip);
  if (!record || now > record.reset) {
    rateLimitStore.set(ip, { count: 1, reset: now + RATE_WINDOW });
    return true;
  }
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.reset) rateLimitStore.delete(ip);
  }
}, 5 * 60 * 1000);

/**
 * Sanitizes string to prevent XSS
 * @param {string} str
 * @returns {string}
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .slice(0, 2000);
}

/**
 * Validates messages array
 * @param {Array} messages
 * @returns {{valid:boolean, sanitized?:Array, error?:string}}
 */
function validateMessages(messages) {
  if (!Array.isArray(messages))       return { valid: false, error: 'messages must be an array' };
  if (messages.length === 0)          return { valid: false, error: 'messages array is empty' };
  if (messages.length > 50)          return { valid: false, error: 'too many messages' };

  const validRoles = new Set(['user', 'assistant', 'system']);
  const sanitized  = [];

  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') return { valid: false, error: 'invalid message object' };
    if (!validRoles.has(msg.role))       return { valid: false, error: `invalid role: ${msg.role}` };
    if (typeof msg.content !== 'string') return { valid: false, error: 'content must be string' };
    if (!msg.content.trim())             return { valid: false, error: 'content cannot be empty' };
    sanitized.push({ role: msg.role, content: sanitizeString(msg.content) });
  }

  return { valid: true, sanitized };
}

/**
 * Handles /api/chat POST — proxies to Groq
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function handleChatAPI(req, res) {
  const body = await new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) { reject(new Error('Request body too large')); return; }
      data += chunk.toString();
    });
    req.on('end',   () => resolve(data));
    req.on('error', (err) => reject(err));
  });

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON in request body' }));
    return;
  }

  const validation = validateMessages(parsed.messages);
  if (!validation.valid) {
    console.error('[Validation Error]', validation.error);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: validation.error }));
    return;
  }

  if (!process.env.GROQ_API_KEY) {
    console.error('[Config Error] GROQ_API_KEY not set');
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'AI service not configured' }));
    return;
  }

  try {
    console.log('[Groq] Sending', validation.sanitized.length, 'messages...');

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method : 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type' : 'application/json',
      },
      body: JSON.stringify({
        model      : process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages   : validation.sanitized,
        temperature: 0.7,
        max_tokens : 800,
        stream     : false,
      }),
    });

    const data = await groqRes.json();
    console.log('[Groq] Status:', groqRes.status);

    if (!groqRes.ok) {
      console.error('[Groq Error]', data.error?.message);
      res.writeHead(groqRes.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: data.error?.message || 'Groq API error' }));
      return;
    }

    const reply = data.choices?.[0]?.message?.content;
    console.log('[Groq] Reply length:', reply?.length || 0);

    if (!reply) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Empty AI response' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ reply }));

  } catch (err) {
    console.error('[Groq Fetch Error]', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to reach AI service' }));
  }
}

/** @type {Map<string, Buffer>} */
const fileCache = new Map();

/**
 * Serves static files with caching
 * @param {string} filePath
 * @param {http.ServerResponse} res
 */
function serveStaticFile(filePath, res) {
  const resolved = path.resolve(filePath);
  const cwd      = path.resolve('.');
  if (!resolved.startsWith(cwd)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext         = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  if (fileCache.has(filePath)) {
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' });
    res.end(fileCache.get(filePath));
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain' });
      res.end(err.code === 'ENOENT' ? '404 Not Found' : 'Internal Server Error');
      return;
    }
    fileCache.set(filePath, content);
    res.writeHead(200, {
      'Content-Type' : contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  applySecurityHeaders(res);

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const ip = req.socket.remoteAddress || 'unknown';
  if (req.url.startsWith('/api/')) {
    if (!checkRateLimit(ip)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Too many requests. Please slow down.' }));
      return;
    }
  }

  if (req.url === '/api/chat' && req.method === 'POST') {
    try {
      await handleChatAPI(req, res);
    } catch (err) {
      console.error('[Server Error]', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    }
    return;
  }

  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = '.' + path.normalize('/' + urlPath);
  serveStaticFile(filePath, res);
});

server.listen(PORT, () => {
  const groq  = process.env.GROQ_API_KEY ? '✅ Loaded' : '❌ Missing — check .env';
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  const lines = [
    '🌱 EcoIQ Server v2.0',
    `URL:   http://localhost:${PORT}`,
    `Groq:  ${groq}`,
    `Model: ${model}`,
  ];

  const width = Math.max(...lines.map(l => [...l].length)) + 4;
  const pad   = str => '║  ' + str + ' '.repeat(width - [...str].length - 2) + '║';
  const bar   = '═'.repeat(width);

  console.log(`\n╔${bar}╗`);
  lines.forEach((l, i) => {
    console.log(pad(l));
    if (i === 0) console.log(`╠${bar}╣`);
  });
  console.log(`╚${bar}╝\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} in use. Run: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

module.exports = { validateMessages, sanitizeString, checkRateLimit };