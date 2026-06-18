import https from 'https';
import { getAllowedOrigin, setSecurityHeaders, sendJson } from './security.js';

const GROQ_URL = 'https://api.groq.com/v1/insights';
const VALID_ROLES = new Set(['user', 'assistant', 'system']);
const httpsAgent = new https.Agent({ keepAlive: true });

function buildFallbackReply(errorMessage) {
  if (/quota|limit|rate limit|billing|quota exceeded/i.test(errorMessage)) {
    return 'EcoAI is temporarily unavailable due to quota or billing restrictions. Please check your plan and try again later.';
  }
  return 'EcoAI is currently unavailable due to a service connection issue. Please try again later.';
}

function buildPrompt(messages) {
  const systemPrompt = messages.find(message => message.role === 'system')?.content || '';
  const lines = [];

  if (systemPrompt) {
    lines.push(`SYSTEM: ${systemPrompt}`);
    lines.push('');
  }

  messages
    .filter(message => message.role !== 'system')
    .forEach(message => {
      const speaker = message.role === 'assistant' ? 'ASSISTANT' : 'USER';
      lines.push(`${speaker}: ${message.content}`);
    });

  lines.push('');
  lines.push('ASSISTANT:');
  return lines.join('\n');
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function hasValidMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {return false;}
  return messages.every(message => (
    message &&
    typeof message === 'object' &&
    VALID_ROLES.has(message.role) &&
    typeof message.content === 'string'
  ));
}

export async function handleChatRequest(req, res) {
  const origin = req.headers?.origin;
  const allowedOrigin = getAllowedOrigin(origin);

  if (origin && !allowedOrigin) {
    setSecurityHeaders(res, allowedOrigin);
    return sendJson(res, 403, { error: 'Origin not allowed' });
  }

  setSecurityHeaders(res, allowedOrigin);

  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {});
  }

  const requestBody = req.body || await parseJsonBody(req);
  const { messages } = requestBody;

  if (!hasValidMessages(messages)) {
    return sendJson(res, 400, {
      error: 'Messages must be an array of objects with role and content strings.',
    });
  }

  if (!process.env.GROQ_API_KEY) {
    return sendJson(res, 500, { error: 'Groq API key is missing.' });
  }

  const prompt = buildPrompt(messages);

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      agent: httpsAgent,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        query: prompt,
      }),
    });

    const data = await response.json();
    const reply = data.output_text || data.output?.[0]?.content || data.results?.[0]?.text || data.text || data.choices?.[0]?.text || '';

    if (!response.ok) {
      const errorMessage = data.error?.message || data.message || 'Groq API error';
      return sendJson(res, 200, { reply: buildFallbackReply(errorMessage) });
    }

    if (!reply) {
      return sendJson(res, 200, {
        reply: buildFallbackReply('Groq returned an empty response.'),
      });
    }

    return sendJson(res, 200, { reply });
  } catch (err) {
    console.error('Groq proxy error:', err);
    return sendJson(res, 200, {
      reply: buildFallbackReply(err.message || 'Unable to reach Groq API'),
    });
  }
}


export function isSameOrigin(origin) {
  return getAllowedOrigin(origin) === origin;
}
