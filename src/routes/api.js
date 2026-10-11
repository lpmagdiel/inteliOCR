'use strict';

const express = require('express');
const { upload, validateUploadedFile } = require('../middleware/upload');
const { ipLimiter, ipSlowDown } = require('../middleware/rateLimiter');
const { runOcr } = require('../controllers/ocrController');
const { runBasic } = require('../controllers/basicController');
const { ok } = require('../utils/response');

const router = express.Router();

router.get('/health', (req, res) => {
  return ok(res, {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.post(
  '/ocr',
  upload.single('file'),
  validateUploadedFile,
  ipLimiter(),
  ipSlowDown(),
  runOcr
);

router.post(
  '/basic',
  upload.single('file'),
  validateUploadedFile,
  ipLimiter(),
  ipSlowDown(),
  runBasic
);

module.exports = router;