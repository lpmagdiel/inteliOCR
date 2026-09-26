'use strict';

const crypto = require('crypto');
const { config } = require('../config');

function hashValue(value) {
  return crypto
    .createHash('sha256')
    .update(String(value) + config.security.hashPepper)
    .digest('hex');
}

function hashIp(ip) {
  if (!ip) return null;
  return hashValue(ip);
}

function hashApiKey(key) {
  return hashValue(key);
}

function generateApiKey() {
  const raw = crypto.randomBytes(32).toString('hex');
  const prefix = raw.slice(0, 8);
  return { raw: `ioc_${prefix}_${raw.slice(8)}`, prefix };
}

module.exports = { hashValue, hashIp, hashApiKey, generateApiKey };
