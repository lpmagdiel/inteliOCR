'use strict';

const SCHEMA_VERSION = 1;

const MIGRATIONS = {
  1: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        key_prefix TEXT NOT NULL,
        key_hash TEXT NOT NULL UNIQUE,
        monthly_quota INTEGER NOT NULL DEFAULT 1000,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        last_used_at TEXT
      );

      CREATE TABLE IF NOT EXISTS usage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        api_key_id INTEGER,
        ts TEXT NOT NULL,
        ip_hash TEXT,
        endpoint TEXT NOT NULL,
        status INTEGER NOT NULL,
        latency_ms INTEGER NOT NULL,
        in_bytes INTEGER,
        out_bytes INTEGER,
        error_code TEXT,
        FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_usage_ts ON usage_logs(ts);
      CREATE INDEX IF NOT EXISTS idx_usage_key_ts ON usage_logs(api_key_id, ts);
    `);
  },
};

function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );
  `);

  const current = db.prepare('SELECT version FROM schema_version LIMIT 1').get();
  const startFrom = current ? current.version : 0;

  for (let v = startFrom + 1; v <= SCHEMA_VERSION; v++) {
    const migration = MIGRATIONS[v];
    if (!migration) throw new Error(`Missing migration ${v}`);
    db.transaction(() => {
      migration(db);
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(v);
    })();
  }
}

module.exports = { runMigrations, SCHEMA_VERSION };
