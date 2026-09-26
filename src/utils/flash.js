'use strict';

const COOKIE = 'ioc_flash';

function flash(res, data) {
  res.cookie(COOKIE, JSON.stringify(data), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 1000,
    path: '/dashboard',
  });
}

function readFlash(req, res) {
  if (!req.cookies || !req.cookies[COOKIE]) return null;
  const raw = req.cookies[COOKIE];
  res.clearCookie(COOKIE, { path: '/dashboard' });
  try {
    return JSON.parse(raw);
  } catch (_e) {
    return null;
  }
}

module.exports = { flash, readFlash };
