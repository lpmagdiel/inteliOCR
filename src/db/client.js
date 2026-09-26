'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { config } = require('../config');
const { runMigrations } = require('./migrations');
const logger = require('../utils/logger');

let db;

function getDb() {
  if (db) return db;

  const dbDir = config.dataDir;
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'usage.db');
  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  runMigrations(db);
  logger.info({ dbPath }, 'SQLite database initialized');

  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = undefined;
  }
}

module.exports = { getDb, closeDb };
