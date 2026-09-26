'use strict';

const request = require('supertest');
const { buildApp } = require('../src/app');
const { getDb } = require('../src/db/client');
const { createKey, revokeKey, listKeys, findActiveByHash } = require('../src/services/keyService');
const { hashApiKey } = require('../src/utils/crypto');

let app;
let agent;

beforeAll(async () => {
  app = buildApp();
  getDb();
  agent = request.agent(app);
  await agent
    .post('/dashboard/login')
    .set('User-Agent', 'jest')
    .type('form')
    .send({ email: 'lpzcode@yahoo.com', password: 'admin123' });
});

afterAll(() => undefined);

describe('API keys', () => {
  test('createKey returns raw key only once', () => {
    const k = createKey({ name: 'svc-1', monthlyQuota: 50 });
    expect(k.key).toMatch(/^ioc_[a-f0-9]{8}_[a-f0-9]+$/);
    expect(k.prefix).toHaveLength(8);
    const hash = hashApiKey(k.key);
    const found = findActiveByHash(hash);
    expect(found.id).toBe(k.id);
    expect(found.is_active).toBe(1);
  });

  test('listKeys returns created keys', () => {
    const keys = listKeys();
    expect(keys.length).toBeGreaterThan(0);
    expect(keys[0].key_prefix).toBeDefined();
    expect(keys[0].key_hash).toBeUndefined(); // never exposed
  });

  test('revokeKey disables the key', () => {
    const k = createKey({ name: 'to-revoke' });
    revokeKey(k.id);
    const found = findActiveByHash(hashApiKey(k.key));
    expect(found).toBeUndefined();
  });

  test('dashboard POST /dashboard/keys creates a key and flash shows it', async () => {
    const res = await agent
      .post('/dashboard/keys')
      .set('User-Agent', 'jest')
      .type('form')
      .send({ name: 'dashboard-created', monthly_quota: '200' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard/keys');

    const flashRes = await agent.get('/dashboard/keys').set('User-Agent', 'jest');
    expect(flashRes.status).toBe(200);
    expect(flashRes.text).toMatch(/ioc_[a-f0-9]{8}_/);
  });

  test('dashboard POST /dashboard/keys/:id/revoke revokes', async () => {
    const k = createKey({ name: 'via-dashboard' });
    const res = await agent
      .post(`/dashboard/keys/${k.id}/revoke`)
      .set('User-Agent', 'jest')
      .type('form')
      .send({});
    expect(res.status).toBe(302);
  });
});
