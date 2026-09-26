'use strict';

const bcrypt = require('bcrypt');
const { config } = require('../config');
const { signToken, setSessionCookie, clearSessionCookie } = require('../middleware/dashboardAuth');

function showLogin(req, res) {
  if (req.cookies && req.cookies.ioc_session) {
    return res.redirect('/dashboard');
  }
  return res.render('login', { error: req.query.error, email: config.dashboard.email, layout: false });
}

async function doLogin(req, res) {
  const { email, password } = req.body || {};
  const renderError = (msg, code) =>
    res.status(code).render('login', { error: msg, email: config.dashboard.email, layout: false });
  if (!email || !password) return renderError('Email and password are required.', 400);
  if (email !== config.dashboard.email || !config.dashboard.passwordHash) {
    return renderError('Invalid credentials.', 401);
  }
  let okPwd = false;
  try {
    okPwd = await bcrypt.compare(password, config.dashboard.passwordHash);
  } catch (_e) {
    return renderError('Auth misconfigured.', 500);
  }
  if (!okPwd) return renderError('Invalid credentials.', 401);
  const token = signToken(email);
  setSessionCookie(res, token);
  return res.redirect('/dashboard');
}

function doLogout(req, res) {
  clearSessionCookie(res);
  return res.redirect('/dashboard/login');
}

module.exports = { showLogin, doLogin, doLogout };
