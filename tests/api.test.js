import assert from 'assert';
import { getAllowedOrigin } from '../lib/security.js';
import { handleChatRequest } from '../lib/chat-proxy.js';

function createResponse() {
  let status = 200;
  const headers = {};
  let body = null;

  return {
    headers,
    setHeader(name, value) {
      headers[name] = value;
    },
    writeHead(code, headerMap) {
      status = code;
      Object.assign(headers, headerMap);
    },
    end(data) {
      if (data !== undefined) {
        body = data;
      }
      return this;
    },
    status(code) {
      status = code;
      return this;
    },
    json(payload) {
      body = JSON.stringify(payload);
      return this;
    },
    get result() {
      return { status, headers, body };
    }
  };
}

async function runTests() {
  console.log('\n🌱 EcoIQ API Validation Tests\n');

  // Security validation
  assert.strictEqual(
    getAllowedOrigin('http://localhost:3000'),
    'http://localhost:3000',
    'Allowed origin should pass validation'
  );

  assert.strictEqual(
    getAllowedOrigin('http://malicious.example.com'),
    undefined,
    'Blocked origin should be rejected'
  );

  // Request validation
  const response = createResponse();
  const request = {
    method: 'POST',
    headers: { origin: 'http://localhost:3000' },
    body: { messages: [{ role: 'user', content: 'Hello' }] },
  };

  process.env.GROQ_API_KEY = '';
  await handleChatRequest(request, response);

  const result = response.result;
  assert.strictEqual(result.status, 500, 'Missing API key should return a 500 validation status');
  assert.ok(result.body.includes('Groq API key'), 'Response should mention missing API key');

  const invalidResponse = createResponse();
  await handleChatRequest({
    method: 'POST',
    headers: { origin: 'http://localhost:3000' },
    body: { messages: [{ role: 'unknown', content: 'x' }] },
  }, invalidResponse);

  assert.strictEqual(invalidResponse.result.status, 400, 'Invalid message payload should return 400');

  console.log('  ✅ PASS: API validation tests complete');
}

runTests().catch(error => {
  console.error('  ❌ FAIL:', error.message);
  process.exit(1);
});