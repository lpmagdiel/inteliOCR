'use strict';

const { getDb } = require('../db/client');

function logRequest({ apiKeyId, ipHash, endpoint, status, latencyMs, inBytes, outBytes, errorCode }) {
  const db = getDb();
  db.prepare(
    `INSERT INTO usage_logs (api_key_id, ts, ip_hash, endpoint, status, latency_ms, in_bytes, out_bytes, error_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    apiKeyId,
    new Date().toISOString(),
    ipHash,
    endpoint,
    status,
    latencyMs,
    inBytes,
    outBytes,
    errorCode
  );
}

function currentMonthBounds() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  return { start: start.toISOString(), end: end.toISOString() };
}

function countCurrentMonthUsage(apiKeyId) {
  const db = getDb();
  const { start, end } = currentMonthBounds();
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM usage_logs WHERE api_key_id = ? AND ts >= ? AND ts < ?`)
    .get(apiKeyId, start, end);
  return row.n;
}

function requestsPerDay(days = 30) {
  const db = getDb();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  return db
    .prepare(
      `SELECT substr(ts, 1, 10) AS day, COUNT(*) AS n,
              SUM(CASE WHEN status < 400 THEN 1 ELSE 0 END) AS ok,
              ROUND(AVG(latency_ms), 1) AS avg_latency
       FROM usage_logs WHERE ts >= ?
       GROUP BY day ORDER BY day ASC`
    )
    .all(since);
}

function statusDistribution(days = 30) {
  const db = getDb();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  return db
    .prepare(
      `SELECT status, COUNT(*) AS n FROM usage_logs WHERE ts >= ? GROUP BY status ORDER BY status`
    )
    .all(since);
}

function perKeyUsage(days = 30) {
  const db = getDb();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  return db
    .prepare(
      `SELECT k.id, k.name, k.key_prefix,
              COUNT(u.id) AS requests,
              ROUND(AVG(u.latency_ms), 1) AS avg_latency,
              SUM(CASE WHEN u.status < 400 THEN 1 ELSE 0 END) AS ok
       FROM api_keys k LEFT JOIN usage_logs u
         ON u.api_key_id = k.id AND u.ts >= ?
       GROUP BY k.id ORDER BY requests DESC`
    )
    .all(since);
}

function overallSummary(days = 30) {
  const db = getDb();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const row = db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status < 400 THEN 1 ELSE 0 END) AS ok,
              ROUND(AVG(latency_ms), 1) AS avg_latency,
              ROUND(AVG(in_bytes), 0) AS avg_in,
              ROUND(AVG(out_bytes), 0) AS avg_out
       FROM usage_logs WHERE ts >= ?`
    )
    .get(since);
  return row;
}

function listLogs({ limit = 50, offset = 0 }) {
  const db = getDb();
  return db
    .prepare(
      `SELECT u.id, u.ts, u.endpoint, u.status, u.latency_ms, u.in_bytes, u.out_bytes, u.error_code,
              k.name AS key_name, k.key_prefix
       FROM usage_logs u LEFT JOIN api_keys k ON k.id = u.api_key_id
       ORDER BY u.id DESC LIMIT ? OFFSET ?`
    )
    .all(limit, offset);
}

module.exports = {
  logRequest,
  countCurrentMonthUsage,
  currentMonthBounds,
  requestsPerDay,
  statusDistribution,
  perKeyUsage,
  overallSummary,
  listLogs,
};
