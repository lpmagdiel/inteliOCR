'use strict';

const request = require('supertest');
const { buildApp } = require('../src/app');
const { getDb } = require('../src/db/client');

let app;
let cookie;

beforeAll(() => {
  app = buildApp();
  getDb();
});

afterAll(() => undefined);

async function login(email, password) {
  const res = await request(app)
    .post('/dashboard/login')
    .set('User-Agent', 'jest')
    .type('form')
    .send({ email, password });
  return res;
}

describe('Dashboard auth', () => {
  test('GET /dashboard redirects to login', async () => {
    const res = await request(app).get('/dashboard').set('User-Agent', 'jest');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard/login');
  });

  test('login fails with wrong credentials', async () => {
    const res = await login('lpzcode@yahoo.com', 'wrong');
    expect(res.status).toBe(401);
  });

  test('login fails with wrong email', async () => {
    const res = await login('other@example.com', 'admin123');
    expect(res.status).toBe(401);
  });

  test('login succeeds and sets cookie', async () => {
    const res = await login('lpzcode@yahoo.com', 'admin123');
    expect(res.status).toBe(302);
    expect(res.headers['set-cookie']).toBeDefined();
    cookie = res.headers['set-cookie'][0].split(';')[0];
    expect(cookie).toMatch(/^ioc_session=/);
  });

  test('authenticated dashboard loads', async () => {
    const res = await request(app).get('/dashboard').set('User-Agent', 'jest').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.text).toContain('Overview');
  });

  test('logout clears cookie', async () => {
    const res = await request(app).post('/dashboard/logout').set('User-Agent', 'jest').set('Cookie', cookie);
    expect(res.status).toBe(302);
  });

  test('invalid JWT redirects to login', async () => {
    const res = await request(app)
      .get('/dashboard')
      .set('User-Agent', 'jest')
      .set('Cookie', 'ioc_session=garbage.garbage.garbage');
    expect(res.status).toBe(302);
  });
});
