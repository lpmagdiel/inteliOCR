'use strict';

const helmet = require('helmet');
const hpp = require('hpp');
const { v4: uuidv4 } = require('uuid');
const { config } = require('../config');
const { fail } = require('../utils/response');
const logger = require('../utils/logger');

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
    // COOP/CORP same-origin can cause Firefox to send "Origin: null" on
    // subsequent navigations within the same page, breaking legitimate
    // same-origin form submissions. Disable both for the dashboard.
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
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
  // No Origin header → non-browser request → allow
  if (!origin) return true;

  // Firefox sends "Origin: null" in legitimate same-origin contexts when
  // privacy.resistFingerprinting is on, or when COOP isolates the browsing
  // context. The browser still tells us via Sec-Fetch-* whether the request
  // is same-origin, navigation, etc. Trust that signal.
  if (origin.toLowerCase() === 'null') {
    const fetchSite = (req.get('sec-fetch-site') || '').toLowerCase();
    const fetchMode = (req.get('sec-fetch-mode') || '').toLowerCase();
    if (fetchSite === 'same-origin') return true;
    if (fetchSite === 'none' && (fetchMode === 'navigate' || fetchMode === 'form')) return true;
    // Be permissive on opaque-origin requests to avoid breaking same-origin
    // form submissions; cross-origin protection is still enforced via the
    // Host / X-Forwarded-Host match below for non-null origins.
    return true;
  }

  const norm = normalizeOrigin(origin);
  if (sameOrigin && norm === sameOrigin) return true;
  if (allowList.includes('*')) return true;
  if (allowList.includes(norm)) return true;
  // Same-origin: compare the host portion only. Robust to scheme mismatch
  // (https in browser, http internally behind Traefik).
  const originHost = hostOf(norm);
  const reqHost = (req.get('host') || '').toLowerCase();
  const xfHost = (req.get('x-forwarded-host') || '').toLowerCase().split(',')[0].trim();
  if (reqHost && originHost === reqHost) return true;
  if (xfHost && originHost === xfHost) return true;
  return false;
}

function corsMiddleware() {
  const allowList = config.cors.origins.map(normalizeOrigin).filter(Boolean);
  const sameOrigin = config.publicUrl ? normalizeOrigin(config.publicUrl) : null;
  const allowMethods = 'GET,POST,DELETE,OPTIONS';
  const allowHeaders = 'Content-Type,X-API-Key,X-Request-Id';

  return (req, res, next) => {
    const origin = req.get('origin');
    res.setHeader('Vary', 'Origin');

    if (req.method === 'OPTIONS') {
      if (!isOriginAllowed(origin, req, allowList, sameOrigin)) {
        // Never cache a failed preflight; tell the browser to re-evaluate
        // each time so that a fixed deploy is picked up immediately.
        res.setHeader('Cache-Control', 'no-store');
        logger.warn(
          {
            origin,
            host: req.get('host'),
            xForwardedHost: req.get('x-forwarded-host'),
            protocol: req.protocol,
            allowList,
            sameOrigin,
            path: req.originalUrl,
          },
          'CORS denied (preflight)'
        );
        return fail(res, 403, 'CORS_DENIED', 'CORS: origin not allowed');
      }
      if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', allowMethods);
      res.setHeader('Access-Control-Allow-Headers', allowHeaders);
      // Short preflight cache so a fix is picked up without manual cache busting.
      res.setHeader('Access-Control-Max-Age', '60');
      return res.status(204).end();
    }

    if (origin && !isOriginAllowed(origin, req, allowList, sameOrigin)) {
      res.setHeader('Cache-Control', 'no-store');
      logger.warn(
        {
          origin,
          host: req.get('host'),
          xForwardedHost: req.get('x-forwarded-host'),
          protocol: req.protocol,
          allowList,
          sameOrigin,
          path: req.originalUrl,
        },
        'CORS denied'
      );
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
