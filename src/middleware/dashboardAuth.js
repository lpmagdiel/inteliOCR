'use strict';

const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { fail } = require('../utils/response');

const COOKIE_NAME = 'ioc_session';

function signToken(email) {
  if (!config.dashboard.jwtSecret || config.dashboard.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET is not configured securely');
  }
  return jwt.sign({ sub: email, role: 'admin' }, config.dashboard.jwtSecret, {
    expiresIn: config.dashboard.jwtExpiresIn,
  });
}

function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProd,
    maxAge: 12 * 60 * 60 * 1000,
    path: '/dashboard',
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/dashboard' });
}

function dashboardAuth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) {
    return res.redirect('/dashboard/login');
  }
  try {
    const payload = jwt.verify(token, config.dashboard.jwtSecret);
    req.user = payload;
    next();
  } catch (_e) {
    clearSessionCookie(res);
    return res.redirect('/dashboard/login');
  }
}

function dashboardJsonAuth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return fail(res, 401, 'UNAUTHORIZED', 'Login required');
  try {
    req.user = jwt.verify(token, config.dashboard.jwtSecret);
    next();
  } catch (_e) {
    return fail(res, 401, 'UNAUTHORIZED', 'Session expired');
  }
}

module.exports = {
  COOKIE_NAME,
  signToken,
  setSessionCookie,
  clearSessionCookie,
  dashboardAuth,
  dashboardJsonAuth,
};
