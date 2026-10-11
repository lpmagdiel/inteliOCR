'use strict';

const express = require('express');
const { upload, validateUploadedFile } = require('../middleware/upload');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const { ipLimiter, ipSlowDown, keyLimiter } = require('../middleware/rateLimiter');
const quotaGuard = require('../middleware/quota');
const usageLogger = require('../middleware/usageLogger');
const { runIa } = require('../controllers/iaController');
const { runBasic } = require('../controllers/basicController');

const router = express.Router();

router.post(
  '/ia',
  upload.single('file'),
  validateUploadedFile,
  apiKeyAuth,
  ipLimiter(),
  ipSlowDown(),
  keyLimiter(),
  quotaGuard(),
  usageLogger(),
  runIa
);

router.post(
  '/basic',
  upload.single('file'),
  validateUploadedFile,
  apiKeyAuth,
  ipLimiter(),
  ipSlowDown(),
  keyLimiter(),
  quotaGuard(),
  usageLogger(),
  runBasic
);

module.exports = router;