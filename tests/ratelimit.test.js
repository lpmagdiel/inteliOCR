'use strict';

const request = require('supertest');

process.env.RATE_LIMIT_IP_PER_MIN = '3';

const { buildApp } = require('../src/app');
const { makeJpegBuffer } = require('./helpers/fixtures');

let app;

beforeAll(() => {
  app = buildApp();
});

describe('Rate limiting (per IP)', () => {
  test('returns 429 after burst', async () => {
    const buf = await makeJpegBuffer();
    const codes = [];
    for (let i = 0; i < 6; i += 1) {
      const res = await request(app)
        .post('/ocr')
        .set('User-Agent', 'jest')
        .attach('file', buf, { filename: 'r.jpg', contentType: 'image/jpeg' });
      codes.push(res.status);
    }
    expect(codes.some((s) => s === 429)).toBe(true);
  });
});