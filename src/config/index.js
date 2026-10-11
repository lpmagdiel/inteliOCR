'use strict';

if (process.env.NODE_ENV !== 'test') {
  require('dotenv').config();
}

function optional(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function asInt(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) throw new Error(`Env ${name} must be an integer`);
  return n;
}

const env = process.env.NODE_ENV || 'development';

const config = {
  env,
  isProd: env === 'production',
  isTest: env === 'test',
  port: asInt('PORT', 3000),
  trustProxy: asInt('TRUST_PROXY', 1),
  logLevel: optional('LOG_LEVEL', env === 'production' ? 'info' : 'debug'),
  publicUrl: optional('PUBLIC_URL', ''),

  minimax: {
    apiKey: optional('MINIMAX_API_KEY', ''),
    apiBase: optional('MINIMAX_API_BASE', 'https://api.minimaxi.chat/v1'),
    model: optional('MINIMAX_MODEL', 'MiniMax-M3'),
    timeoutMs: asInt('MINIMAX_TIMEOUT_MS', 30000),
  },

  limits: {
    maxUploadImageMb: asInt('MAX_UPLOAD_IMAGE_MB', 10),
    maxUploadPdfMb: asInt('MAX_UPLOAD_PDF_MB', 15),
    rateLimitWindowMs: asInt('RATE_LIMIT_WINDOW_MS', 60000),
    rateLimitIpPerMin: asInt('RATE_LIMIT_IP_PER_MIN', 30),
  },

  image: {
    maxDimension: asInt('IMG_MAX_DIMENSION', 1600),
    quality: asInt('IMG_QUALITY', 82),
  },

  cors: {
    origins: optional('CORS_ORIGINS', '*')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },

  security: {
    blockedUaExtra: optional('BLOCKED_UA_EXTRA', '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  },
};

function validate() {
  const errors = [];
  if (config.isProd && !config.minimax.apiKey) {
    errors.push('MINIMAX_API_KEY is required in production');
  }
  if (errors.length) {
    throw new Error('Invalid configuration:\n  - ' + errors.join('\n  - '));
  }
}

module.exports = { config, validate };