'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { preprocessImage } = require('../services/imageService');
const { pdfToImages } = require('../services/pdfService');
const { callMinimaxVision } = require('../services/minimaxService');
const { touchLastUsed } = require('../services/keyService');
const { ok, fail } = require('../utils/response');

async function runOcr(req, res) {
  const start = Date.now();
  const { buffer, kind } = { buffer: req.file.buffer, kind: req.fileMeta.kind };
  const type = req.body.type;

  let pages;
  try {
    if (kind === 'pdf') {
      pages = await pdfToImages(buffer);
    } else {
      const processed = await preprocessImage(buffer);
      pages = [processed];
    }
  } catch (e) {
    return fail(res, 400, 'INVALID_FILE', 'Failed to preprocess file.', { reason: e.message });
  }

  let result;
  try {
    result = await callMinimaxVision(pages, type);
  } catch (e) {
    res.locals.errorCode = e.code || 'OCR_PROVIDER_ERROR';
    return fail(res, e.status || 500, e.code || 'OCR_PROVIDER_ERROR', e.message, e.details || {});
  }

  touchLastUsed(req.apiKey.id);
  return ok(res, result.data, {
    latency_ms: Date.now() - start,
    model: result.meta.model,
    pages: pages.length,
    finish_reason: result.meta.finish_reason,
  });
}

module.exports = { runOcr: asyncHandler(runOcr) };
