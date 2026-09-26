'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'inteliocr-test-'));
}

function resetDb() {
  const { closeDb } = require('../../src/db/client');
  closeDb();
  delete require.cache[require.resolve('../../src/db/client')];
}

module.exports = { makeTempDir, resetDb };
