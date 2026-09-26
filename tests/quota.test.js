'use strict';

const request = require('supertest');
const nock = require('nock');
const { buildApp } = require('../src/app');
const { getDb } = require('../src/db/client');
const { createKey } = require('../src/services/keyService');
const { makeJpegBuffer } = require('./helpers/fixtures');
const { logRequest } = require('../src/services/usageService');

let app;
let key;

beforeAll(() => {
  app = buildApp();
  getDb();
  key = createKey({ name: 'quota-test', monthlyQuota: 2 });
});

afterAll(() => undefined);

describe('Monthly quota', () => {
  test('returns QUOTA_EXCEEDED when used >= quota', async () => {
    // Simulate two requests in the current month for this key
    for (let i = 0; i < 2; i++) {
      logRequest({
        apiKeyId: key.id,
        ipHash: null,
        endpoint: '/v1/ocr',
        status: 200,
        latencyMs: 100,
        inBytes: 1000,
        outBytes: 200,
        errorCode: null,
      });
    }

    nock('https://minimax.test')
      .post('/chat/completions')
      .reply(200, {
        choices: [{ finish_reason: 'stop', message: { content: '{"total":1}' } }],
      });

    const buf = await makeJpegBuffer();
    const res = await request(app)
      .post('/v1/ocr')
      .set('User-Agent', 'jest')
      .set('X-API-Key', key.key)
      .attach('file', buf, { filename: 'r.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('QUOTA_EXCEEDED');
    expect(res.body.error.details.limit).toBe(2);
  });
});
