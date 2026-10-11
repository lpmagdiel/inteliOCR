'use strict';

const Tesseract = require('tesseract.js');
const asyncHandler = require('../utils/asyncHandler');
const { preprocessImage } = require('../services/imageService');
const { pdfToImages } = require('../services/pdfService');
const { touchLastUsed } = require('../services/keyService');
const { ok, fail } = require('../utils/response');

const DEFAULT_LANG = process.env.BASIC_OCR_LANG || 'eng';

function shapePage(result, pageNumber) {
  const data = result && result.data ? result.data : {};
  const lines = Array.isArray(data.lines) ? data.lines.length : null;
  const words = Array.isArray(data.words) ? data.words.length : null;
  return {
    page: pageNumber,
    text: data.text || '',
    confidence: typeof data.confidence === 'number' ? data.confidence : null,
    lines,
    words,
  };
}

async function runBasic(req, res) {
  const start = Date.now();
  const { buffer, kind } = { buffer: req.file.buffer, kind: req.fileMeta.kind };
  const lang = (req.body?.lang || DEFAULT_LANG).toString();
  const pagesInput = (req.body?.pages || '').toString().trim();

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

  const selected = pagesInput
    ? pagesInput
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= pages.length)
    : null;

  const out = [];
  let overallError = null;
  for (let i = 0; i < pages.length; i += 1) {
    const pageNo = i + 1;
    if (selected && !selected.includes(pageNo)) continue;
    try {
      const result = await Tesseract.recognize(pages[i].buffer, lang);
      out.push(shapePage(result, pageNo));
    } catch (e) {
      overallError = e.message || String(e);
      out.push({ page: pageNo, text: '', confidence: null, lines: 0, words: 0, error: overallError });
    }
  }

  touchLastUsed(req.apiKey.id);
  return ok(
    res,
    {
      engine: 'tesseract.js',
      language: lang,
      pages: out.length,
      text: out.map((p) => p.text).join('\n\n'),
      results: out,
    },
    {
      latency_ms: Date.now() - start,
      model: `tesseract:${lang}`,
      pages_total: pages.length,
      pages_processed: out.length,
      pages: out.length,
      finish_reason: overallError ? 'partial' : 'stop',
    }
  );
}

module.exports = { runBasic: asyncHandler(runBasic) };