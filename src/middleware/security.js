'use strict';

const helmet = require('helmet');
const hpp = require('hpp');
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
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
  });
}

function corsMiddleware() {
  const allowList = config.cors.origins;
  const allowAll = allowList.length === 1 && allowList[0] === '*';
  const allowHeaders = 'Content-Type,X-Request-Id';

  return (req, res, next) => {
    const origin = req.get('origin');
    res.setHeader('Vary', 'Origin');

    if (allowAll || (origin && allowList.includes(origin))) {
      if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', allowHeaders);
    }

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    return next();
  };
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