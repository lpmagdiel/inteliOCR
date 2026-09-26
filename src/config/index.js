'use strict';

require('dotenv').config();

function required(name) {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
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
  dataDir: optional('DATA_DIR', './data'),
  trustProxy: asInt('TRUST_PROXY', 1),
  logLevel: optional('LOG_LEVEL', env === 'production' ? 'info' : 'debug'),
  publicUrl: optional('PUBLIC_URL', ''),

  dashboard: {
    email: optional('DASHBOARD_EMAIL', 'lpzcode@yahoo.com'),
    passwordHash: optional('DASHBOARD_PASSWORD_HASH', ''),
    jwtSecret: optional('JWT_SECRET', ''),
    jwtExpiresIn: optional('JWT_EXPIRES_IN', '12h'),
  },

  minimax: {
    apiKey: optional('MINIMAX_API_KEY', ''),
    apiBase: optional('MINIMAX_API_BASE', 'https://api.minimaxi.chat/v1'),
    model: optional('MINIMAX_MODEL', 'MiniMax-VL'),
    timeoutMs: asInt('MINIMAX_TIMEOUT_MS', 30000),
  },

  limits: {
    maxUploadImageMb: asInt('MAX_UPLOAD_IMAGE_MB', 10),
    maxUploadPdfMb: asInt('MAX_UPLOAD_PDF_MB', 15),
    rateLimitWindowMs: asInt('RATE_LIMIT_WINDOW_MS', 60000),
    rateLimitIpPerMin: asInt('RATE_LIMIT_IP_PER_MIN', 30),
    rateLimitKeyPerMin: asInt('RATE_LIMIT_KEY_PER_MIN', 120),
  },

  image: {
    maxDimension: asInt('IMG_MAX_DIMENSION', 1600),
    quality: asInt('IMG_QUALITY', 82),
  },

  cors: {
    origins: optional('CORS_ORIGINS', '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },

  security: {
    blockedUaExtra: optional('BLOCKED_UA_EXTRA', '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    hashPepper: optional('HASH_PEPPER', 'dev-pepper-change-me'),
  },
};

function validate() {
  const errors = [];
  if (config.isProd && !config.dashboard.passwordHash) {
    errors.push('DASHBOARD_PASSWORD_HASH is required in production');
  }
  if (config.isProd && config.dashboard.jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters in production');
  }
  if (config.isProd && !config.minimax.apiKey) {
    errors.push('MINIMAX_API_KEY is required in production');
  }
  if (config.security.hashPepper === 'dev-pepper-change-me' && config.isProd) {
    errors.push('HASH_PEPPER must be set in production');
  }
  if (errors.length) {
    throw new Error('Invalid configuration:\n  - ' + errors.join('\n  - '));
  }
}

module.exports = { config, validate, required };
