'use strict';

const http = require('http');
const request = require('supertest');
const { buildApp } = require('../src/app');

describe('CORS middleware (default permissive)', () => {
  let server;

  beforeAll((done) => {
    const app = buildApp();
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', done);
  });

  afterAll((done) => {
    server.close(done);
  });

  test('GET /health without Origin (non-browser) → 200', async () => {
    const res = await request(server).get('/health').set('User-Agent', 'jest');
    expect(res.status).toBe(200);
  });

  test('OPTIONS preflight → 204', async () => {
    const res = await request(server).options('/ocr').set('User-Agent', 'jest');
    expect(res.status).toBe(204);
  });

  test('OPTIONS preflight from any origin → 204 (CORS_ORIGINS=*)', async () => {
    const res = await request(server)
      .options('/ocr')
      .set('User-Agent', 'jest')
      .set('Origin', 'https://anywhere.example.com')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('https://anywhere.example.com');
  });

  test('Cross-origin GET → 200 (CORS headers echoed)', async () => {
    const res = await request(server)
      .get('/health')
      .set('User-Agent', 'jest')
      .set('Origin', 'https://anywhere.example.com');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://anywhere.example.com');
  });

  test('Restricted CORS (specific allowlist) blocks other origins', async () => {
    process.env.CORS_ORIGINS = 'https://allowed.example.com';
    jest.resetModules();
    const { buildApp: rebuild } = require('../src/app');
    const app = rebuild();
    const local = http.createServer(app);
    await new Promise((resolve) => local.listen(0, '127.0.0.1', resolve));

    const denied = await request(local)
      .get('/health')
      .set('User-Agent', 'jest')
      .set('Origin', 'https://evil.example.com');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();

    const allowed = await request(local)
      .get('/health')
      .set('User-Agent', 'jest')
      .set('Origin', 'https://allowed.example.com');
    expect(allowed.headers['access-control-allow-origin']).toBe('https://allowed.example.com');

    await new Promise((resolve) => local.close(resolve));
    delete process.env.CORS_ORIGINS;
  });
});