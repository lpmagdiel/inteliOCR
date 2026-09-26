'use strict';

const request = require('supertest');
const nock = require('nock');

jest.mock('../src/services/pdfService', () => ({
  pdfToImages: jest.fn(async () => [{ buffer: Buffer.from('img'), mime: 'image/jpeg' }]),
}));

const { buildApp } = require('../src/app');
const { getDb } = require('../src/db/client');
const { createKey } = require('../src/services/keyService');
const { makeJpegBuffer, makePngBuffer, makeFakePdfBuffer } = require('./helpers/fixtures');

let app;
let key;

beforeAll(() => {
  app = buildApp();
  getDb();
  key = createKey({ name: 'test', monthlyQuota: 1000 });
});

afterAll(() => {
  nock.cleanAll();
  nock.restore();
});

describe('GET /v1/health', () => {
  test('returns ok', async () => {
    const res = await request(app).get('/v1/health').set('User-Agent', 'jest');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });
});

describe('POST /v1/ocr', () => {
  test('rejects missing file', async () => {
    const res = await request(app)
      .post('/v1/ocr')
      .set('User-Agent', 'jest')
      .set('X-API-Key', key.key);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_FILE');
  });

  test('rejects missing API key', async () => {
    const buf = await makeJpegBuffer();
    const res = await request(app)
      .post('/v1/ocr')
      .set('User-Agent', 'jest')
      .attach('file', buf, { filename: 'r.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_API_KEY');
  });

  test('rejects invalid API key', async () => {
    const buf = await makeJpegBuffer();
    const res = await request(app)
      .post('/v1/ocr')
      .set('User-Agent', 'jest')
      .set('X-API-Key', 'ioc_bogus_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
      .attach('file', buf, { filename: 'r.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_API_KEY');
  });

  test('rejects unsupported format', async () => {
    const buf = Buffer.from('hello world');
    const res = await request(app)
      .post('/v1/ocr')
      .set('User-Agent', 'jest')
      .set('X-API-Key', key.key)
      .attach('file', buf, { filename: 'x.txt', contentType: 'text/plain' });
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_FORMAT');
  });

  test('blocks suspicious user agents', async () => {
    const buf = await makeJpegBuffer();
    const res = await request(app)
      .post('/v1/ocr')
      .set('User-Agent', 'python-requests/2.31')
      .set('X-API-Key', key.key)
      .attach('file', buf, { filename: 'r.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('BLOCKED_UA');
  });

  test('happy path: jpeg receipt', async () => {
    const buf = await makeJpegBuffer();
    nock('https://minimax.test')
      .post('/chat/completions')
      .reply(200, {
        model: 'MiniMax-VL',
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: JSON.stringify({
                document_type: 'receipt',
                merchant: 'TEST MART',
                date: '2025-09-26',
                total: 9.99,
                currency: 'USD',
                items: [{ description: 'Coffee', quantity: 1, unit_price: 9.99, total: 9.99 }],
              }),
            },
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      });

    const res = await request(app)
      .post('/v1/ocr')
      .set('User-Agent', 'jest')
      .set('X-API-Key', key.key)
      .field('type', 'receipt')
      .attach('file', buf, { filename: 'r.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.merchant).toBe('TEST MART');
    expect(res.body.data.total).toBe(9.99);
    expect(res.body.meta.model).toBe('MiniMax-VL');
    expect(res.body.meta.latency_ms).toBeGreaterThanOrEqual(0);
  });

  test('handles png', async () => {
    const buf = await makePngBuffer();
    nock('https://minimax.test')
      .post('/chat/completions')
      .reply(200, {
        model: 'MiniMax-VL',
        choices: [{ finish_reason: 'stop', message: { content: '{"document_type":"invoice","total":42}' } }],
      });

    const res = await request(app)
      .post('/v1/ocr')
      .set('User-Agent', 'jest')
      .set('X-API-Key', key.key)
      .attach('file', buf, { filename: 'r.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(42);
  });

  test('handles provider error', async () => {
    const buf = await makeJpegBuffer();
    nock('https://minimax.test').post('/chat/completions').reply(500, { error: 'boom' });

    const res = await request(app)
      .post('/v1/ocr')
      .set('User-Agent', 'jest')
      .set('X-API-Key', key.key)
      .attach('file', buf, { filename: 'r.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('OCR_PROVIDER_ERROR');
  });

  test('handles provider timeout', async () => {
    const buf = await makeJpegBuffer();
    nock('https://minimax.test')
      .post('/chat/completions')
      .replyWithError({ code: 'ECONNABORTED', message: 'timeout of 50ms exceeded' });

    const res = await request(app)
      .post('/v1/ocr')
      .set('User-Agent', 'jest')
      .set('X-API-Key', key.key)
      .attach('file', buf, { filename: 'r.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(504);
    expect(res.body.error.code).toBe('OCR_TIMEOUT');
  });

  test('accepts PDF and processes page 1 only (mock pdf2pic to avoid native dep)', async () => {
    nock('https://minimax.test')
      .post('/chat/completions')
      .reply(200, {
        choices: [{ finish_reason: 'stop', message: { content: '{"document_type":"invoice","total":1}' } }],
      });

    const pdf = makeFakePdfBuffer();
    const res = await request(app)
      .post('/v1/ocr')
      .set('User-Agent', 'jest')
      .set('X-API-Key', key.key)
      .attach('file', pdf, { filename: 'r.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
  });
});
