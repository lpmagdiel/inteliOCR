'use strict';

const { getDb } = require('../db/client');
const { generateApiKey, hashApiKey } = require('../utils/crypto');

function createKey({ name, monthlyQuota = 1000 }) {
  const { raw, prefix } = generateApiKey();
  const hash = hashApiKey(raw);
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO api_keys (name, key_prefix, key_hash, monthly_quota, is_active, created_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `);
  const info = stmt.run(name, prefix, hash, monthlyQuota, new Date().toISOString());
  return {
    id: info.lastInsertRowid,
    name,
    prefix,
    key: raw,
    monthly_quota: monthlyQuota,
    created_at: new Date().toISOString(),
  };
}

function listKeys() {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, name, key_prefix, monthly_quota, is_active, created_at, last_used_at
       FROM api_keys ORDER BY id DESC`
    )
    .all();
}

function findActiveByHash(hash) {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1`)
    .get(hash);
}

function revokeKey(id) {
  const db = getDb();
  return db.prepare(`UPDATE api_keys SET is_active = 0 WHERE id = ?`).run(id);
}

function touchLastUsed(id) {
  const db = getDb();
  db.prepare(`UPDATE api_keys SET last_used_at = ? WHERE id = ?`).run(
    new Date().toISOString(),
    id
  );
}

module.exports = { createKey, listKeys, findActiveByHash, revokeKey, touchLastUsed };
