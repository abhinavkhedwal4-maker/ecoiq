const DEFAULT_ORIGINS = [
  process.env.APP_ORIGIN || 'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const allowedOrigins = new Set(DEFAULT_ORIGINS.filter(Boolean));

export function getAllowedOrigin(origin) {
  if (!origin) {return undefined;}
  return allowedOrigins.has(origin) ? origin : undefined;
}

export function setSecurityHeaders(res, origin) {
  if (typeof res.setHeader !== 'function') {return;}
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
}

export function sendJson(res, status, payload) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(status).json(payload);
  }

  res.writeHead(status, {
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify(payload));
}
