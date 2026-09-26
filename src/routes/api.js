'use strict';

const express = require('express');
const { upload, validateUploadedFile } = require('../middleware/upload');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const { ipLimiter, ipSlowDown, keyLimiter } = require('../middleware/rateLimiter');
const quotaGuard = require('../middleware/quota');
const usageLogger = require('../middleware/usageLogger');
const { runOcr } = require('../controllers/ocrController');
const { ok } = require('../utils/response');

const router = express.Router();

router.get('/health', (req, res) => {
  return ok(res, { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

router.post(
  '/ocr',
  upload.single('file'),
  validateUploadedFile,
  apiKeyAuth,
  ipLimiter(),
  ipSlowDown(),
  keyLimiter(),
  quotaGuard(),
  usageLogger(),
  runOcr
);

module.exports = router;
