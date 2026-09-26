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
  });
}

function normalizeOrigin(o) {
  if (!o) return '';
  return String(o).trim().replace(/\/+$/, '');
}

function hostOf(urlOrHost) {
  if (!urlOrHost) return '';
  const s = String(urlOrHost).trim().replace(/\/+$/, '');
  // strip scheme
  const m = s.match(/^[a-z]+:\/\/([^/]+)/i);
  if (m) return m[1].toLowerCase();
  return s.toLowerCase();
}

function isOriginAllowed(origin, req, allowList, sameOrigin) {
  // Non-browser (no Origin header) → always allow
  if (!origin) return true;
  const norm = normalizeOrigin(origin);
  if (sameOrigin && norm === sameOrigin) return true;
  if (allowList.includes('*')) return true;
  if (allowList.includes(norm)) return true;
  // Same-origin: compare the host portion only. This is robust to the
  // scheme being `http` internally (behind Traefik) while the browser
  // sends `https://…` as Origin.
  const originHost = hostOf(norm);
  const reqHost = req.get('host');
  if (reqHost && originHost === reqHost.toLowerCase()) return true;
  return false;
}

function corsMiddleware() {
  const allowList = config.cors.origins.map(normalizeOrigin).filter(Boolean);
  const sameOrigin = config.publicUrl ? normalizeOrigin(config.publicUrl) : null;
  const allowMethods = 'GET,POST,DELETE,OPTIONS';
  const allowHeaders = 'Content-Type,X-API-Key,X-Request-Id';

  return (req, res, next) => {
    const origin = req.get('origin');

    // Always set Vary so caches don't mix responses by Origin
    res.setHeader('Vary', 'Origin');

    // Preflight
    if (req.method === 'OPTIONS') {
      if (!isOriginAllowed(origin, req, allowList, sameOrigin)) {
        return fail(res, 403, 'CORS_DENIED', 'CORS: origin not allowed');
      }
      if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', allowMethods);
      res.setHeader('Access-Control-Allow-Headers', allowHeaders);
      res.setHeader('Access-Control-Max-Age', '600');
      return res.status(204).end();
    }

    // Actual request
    if (origin && !isOriginAllowed(origin, req, allowList, sameOrigin)) {
      return fail(res, 403, 'CORS_DENIED', 'CORS: origin not allowed');
    }
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
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
