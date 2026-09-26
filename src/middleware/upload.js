'use strict';

const multer = require('multer');
const { fromBuffer } = require('file-type');
const { config } = require('../config');
const { fail } = require('../utils/response');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Math.max(config.limits.maxUploadImageMb, config.limits.maxUploadPdfMb) * 1024 * 1024,
    files: 1,
  },
});

function detectMime(buf) {
  return fromBuffer(buf);
}

async function validateUploadedFile(req, res, next) {
  if (!req.file) {
    return fail(res, 400, 'MISSING_FILE', 'Field "file" is required (multipart/form-data).');
  }
  const buf = req.file.buffer;
  const detected = await detectMime(buf);
  const allowedImages = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedMimes = [...allowedImages, 'application/pdf'];

  if (!detected || !allowedMimes.includes(detected.mime)) {
    return fail(
      res,
      415,
      'UNSUPPORTED_FORMAT',
      detected
        ? `Unsupported file type: ${detected.mime}.`
        : 'Unsupported or unknown file type.',
      { allowed: allowedMimes, detected: detected ? detected.mime : null }
    );
  }

  const isPdf = detected.mime === 'application/pdf';

  const sizeMb = req.file.size / 1024 / 1024;
  const maxMb = isPdf ? config.limits.maxUploadPdfMb : config.limits.maxUploadImageMb;
  if (sizeMb > maxMb) {
    return fail(res, 413, 'FILE_TOO_LARGE', `File exceeds ${maxMb} MB limit.`, {
      size_mb: Number(sizeMb.toFixed(2)),
      max_mb: maxMb,
    });
  }

  req.fileMeta = {
    detectedMime: detected.mime,
    kind: isPdf ? 'pdf' : 'image',
    size: req.file.size,
  };
  next();
}

module.exports = { upload, validateUploadedFile };
