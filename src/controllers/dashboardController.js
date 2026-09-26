'use strict';

const {
  overallSummary,
  requestsPerDay,
  statusDistribution,
  perKeyUsage,
  listLogs,
} = require('../services/usageService');
const { listKeys, createKey, revokeKey } = require('../services/keyService');
const { flash, readFlash } = require('../utils/flash');

function overview(req, res) {
  const summary = overallSummary(30) || {};
  const successRate = summary.total ? Math.round((summary.ok / summary.total) * 100) : 100;
  const avgInKb = summary.avg_in ? (summary.avg_in / 1024).toFixed(1) : '0.0';
  return res.render('dashboard', {
    layout: false,
    title: 'Dashboard — inteliOCR',
    summary,
    successRate,
    avgInKb,
    perDay: requestsPerDay(30),
    statusDist: statusDistribution(30),
    perKey: perKeyUsage(30),
  });
}

function listKeysPage(req, res) {
  const f = readFlash(req, res);
  return res.render('keys', {
    layout: false,
    title: 'API Keys — inteliOCR',
    keys: listKeys(),
    newKey: f && f.newKey,
    flash: f && f.message,
  });
}

function createKeyPage(req, res) {
  const name = (req.body.name || '').trim();
  const quota = parseInt(req.body.monthly_quota, 10) || 1000;
  if (!name) return res.redirect('/dashboard/keys');
  const created = createKey({ name, monthlyQuota: quota });
  flash(res, { newKey: created.key });
  return res.redirect('/dashboard/keys');
}

function revokeKeyPage(req, res) {
  revokeKey(parseInt(req.params.id, 10));
  return res.redirect('/dashboard/keys');
}

function usagePage(req, res) {
  return res.render('usage', {
    layout: false,
    title: 'Usage — inteliOCR',
    logs: listLogs({ limit: 100, offset: 0 }),
  });
}

module.exports = { overview, listKeysPage, createKeyPage, revokeKeyPage, usagePage };
