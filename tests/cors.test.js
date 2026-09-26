'use strict';

const http = require('http');
const request = require('supertest');
const { buildApp } = require('../src/app');
const { getDb } = require('../src/db/client');

describe('CORS middleware (against a real listening server)', () => {
  let server;
  let port;

  beforeAll((done) => {
    const app = buildApp();
    getDb();
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  test('GET /v1/health without Origin (non-browser) → 200', async () => {
    const res = await request(server).get('/v1/health').set('User-Agent', 'jest');
    expect(res.status).toBe(200);
  });

  test('OPTIONS preflight without Origin → 204', async () => {
    const res = await request(server).options('/v1/ocr').set('User-Agent', 'jest');
    expect(res.status).toBe(204);
  });

  test('Same-origin (Origin matches server host) → 200', async () => {
    const res = await request(server)
      .get('/v1/health')
      .set('User-Agent', 'jest')
      .set('Origin', `http://127.0.0.1:${port}`);
    expect(res.status).toBe(200);
  });

  test('Cross-origin (different host) → 403', async () => {
    const res = await request(server)
      .get('/v1/health')
      .set('User-Agent', 'jest')
      .set('Origin', 'https://evil.example.com');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CORS_DENIED');
  });

  test('Cross-origin preflight → 403', async () => {
    const res = await request(server)
      .options('/v1/ocr')
      .set('User-Agent', 'jest')
      .set('Origin', 'https://evil.example.com')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.status).toBe(403);
  });
});
