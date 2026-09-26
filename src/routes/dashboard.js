'use strict';

const express = require('express');
const { dashboardAuth } = require('../middleware/dashboardAuth');
const { ipLimiter } = require('../middleware/rateLimiter');
const usageLogger = require('../middleware/usageLogger');
const { showLogin, doLogin, doLogout } = require('../controllers/authController');
const {
  overview,
  listKeysPage,
  createKeyPage,
  revokeKeyPage,
  usagePage,
} = require('../controllers/dashboardController');

const router = express.Router();

router.get('/login', showLogin);
router.post('/login', ipLimiter(), doLogin);
router.post('/logout', doLogout);

router.get('/', dashboardAuth, usageLogger(), overview);
router.get('/keys', dashboardAuth, listKeysPage);
router.post('/keys', dashboardAuth, createKeyPage);
router.post('/keys/:id/revoke', dashboardAuth, revokeKeyPage);
router.get('/usage', dashboardAuth, usageLogger(), usagePage);

module.exports = router;
