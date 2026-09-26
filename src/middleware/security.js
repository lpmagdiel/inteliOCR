'use strict';

const helmet = require('helmet');
const hpp = require('hpp');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { config } = require('../config');
const { fail } = require('../utils/response');

const BUILTIN_BLOCKED_UA = [
  'python-requests',
  'python-urllib',
  'scrapy',
  'wget/',
  'httpclient/',
  'libwww-perl',
  'go-http-client',
  'java/',
  'okhttp',
];

function uaFilter() {
  return (req, res, next) => {
    const ua = (req.get('user-agent') || '').toLowerCase();
    if (!ua) {
      return fail(res, 403, 'BLOCKED_UA', 'Missing User-Agent header');
    }
    const blocked = [...BUILTIN_BLOCKED_UA, ...config.security.blockedUaExtra];
    if (blocked.some((b) => ua.includes(b))) {
      return fail(res, 403, 'BLOCKED_UA', 'Requests from this client are not allowed');
    }
    next();
  };
}

function requestId() {
  return (req, res, next) => {
    const id = req.get('x-request-id') || uuidv4();
    res.locals.requestId = id;
    res.setHeader('x-request-id', id);
    next();
  };
}

function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });
}

function corsMiddleware() {
  const allow = config.cors.origins;
  if (!allow.length) {
    return (req, res, next) => {
      const origin = req.get('origin');
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', 'null');
      }
      next();
    };
  }
  return cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allow.includes(origin) || allow.includes('*')) return cb(null, true);
      return cb(new Error('CORS: origin not allowed'));
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key', 'X-Request-Id'],
    credentials: false,
    maxAge: 600,
  });
}

function noParamPollution() {
  return hpp();
}

module.exports = {
  requestId,
  uaFilter,
  securityHeaders,
  corsMiddleware,
  noParamPollution,
};
