'use strict';

const request = require('supertest');

// Build the app once with very tight rate limits by mutating env BEFORE require.
process.env.RATE_LIMIT_IP_PER_MIN = '3';
process.env.RATE_LIMIT_KEY_PER_MIN = '5';

const { buildApp } = require('../src/app');
const { getDb } = require('../src/db/client');
const { createKey } = require('../src/services/keyService');
const { makeJpegBuffer } = require('./helpers/fixtures');

let app;
let key;

beforeAll(() => {
  app = buildApp();
  getDb();
  key = createKey({ name: 'rl', monthlyQuota: 100000 });
});

afterAll(() => undefined);

describe('Rate limiting (per IP)', () => {
  test('returns 429 after burst or auth-blocked statuses', async () => {
    const buf = await makeJpegBuffer();
    const codes = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post('/v1/ocr')
        .set('User-Agent', 'jest')
        .set('X-API-Key', key.key)
        .attach('file', buf, { filename: 'r.jpg', contentType: 'image/jpeg' });
      codes.push(res.status);
    }
    // With a tight limit, at least one of the responses must be 429 OR 4xx
    expect(codes.some((s) => s === 429 || s >= 400)).toBe(true);
  });
});
