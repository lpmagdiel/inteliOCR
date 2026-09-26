'use strict';

const { findActiveByHash } = require('../services/keyService');
const { hashApiKey } = require('../utils/crypto');
const { fail } = require('../utils/response');

async function apiKeyAuth(req, res, next) {
  const headerKey = req.get('x-api-key');
  if (!headerKey) {
    return fail(res, 401, 'MISSING_API_KEY', 'X-API-Key header is required.');
  }
  if (typeof headerKey !== 'string' || headerKey.length < 16) {
    return fail(res, 401, 'INVALID_API_KEY', 'Invalid API key.');
  }

  try {
    const hash = hashApiKey(headerKey);
    const key = findActiveByHash(hash);
    if (!key) {
      return fail(res, 401, 'INVALID_API_KEY', 'Invalid or revoked API key.');
    }
    req.apiKey = key;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = apiKeyAuth;
