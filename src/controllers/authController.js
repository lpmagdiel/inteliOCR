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
  if (!email || !password) {
    return res.status(400).render('login', { error: 'Email and password are required.', layout: false });
  }
  if (email !== config.dashboard.email || !config.dashboard.passwordHash) {
    return res.status(401).render('login', { error: 'Invalid credentials.', layout: false });
  }
  let okPwd = false;
  try {
    okPwd = await bcrypt.compare(password, config.dashboard.passwordHash);
  } catch (_e) {
    return res.status(500).render('login', { error: 'Auth misconfigured.', layout: false });
  }
  if (!okPwd) {
    return res.status(401).render('login', { error: 'Invalid credentials.', layout: false });
  }
  const token = signToken(email);
  setSessionCookie(res, token);
  return res.redirect('/dashboard');
}

function doLogout(req, res) {
  clearSessionCookie(res);
  return res.redirect('/dashboard/login');
}

module.exports = { showLogin, doLogin, doLogout };
