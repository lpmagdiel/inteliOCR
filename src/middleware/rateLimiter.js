'use strict';

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { config } = require('../config');
const { fail } = require('../utils/response');

function ipLimiter() {
  return rateLimit({
    windowMs: config.limits.rateLimitWindowMs,
    max: config.limits.rateLimitIpPerMin,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip,
    handler: (req, res) =>
      fail(res, 429, 'RATE_LIMITED', 'Too many requests from this IP, slow down.', {
        retry_after_seconds: Math.ceil(config.limits.rateLimitWindowMs / 1000),
      }),
  });
}

function ipSlowDown() {
  return slowDown({
    windowMs: config.limits.rateLimitWindowMs,
    delayAfter: Math.floor(config.limits.rateLimitIpPerMin * 1.5),
    delayMs: (hits) => hits * 250,
  });
}

function keyLimiter() {
  return rateLimit({
    windowMs: config.limits.rateLimitWindowMs,
    max: config.limits.rateLimitKeyPerMin,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.apiKey ? `key:${req.apiKey.id}` : `ip:${req.ip}`,
    skip: (req) => !req.apiKey,
    handler: (req, res) =>
      fail(res, 429, 'RATE_LIMITED', 'API key rate limit exceeded.', {
        retry_after_seconds: Math.ceil(config.limits.rateLimitWindowMs / 1000),
      }),
  });
}

module.exports = { ipLimiter, ipSlowDown, keyLimiter };
