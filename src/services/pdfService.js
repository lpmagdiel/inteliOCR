'use strict';

const { fromBuffer } = require('pdf2pic');
const { preprocessImage } = require('./imageService');

let convert;

async function getConverter() {
  if (convert) return convert;
  convert = fromBuffer;
  return convert;
}

async function pdfToImages(pdfBuffer) {
  const fromPdf = await getConverter();
  const handle = await fromPdf(pdfBuffer, {
    density: 200,
    saveFilename: 'page',
    savePath: '/tmp',
    format: 'png',
    width: 1600,
    height: 1600,
    preserveAspectRatio: true,
  });

  // Determine page count by rendering page 1 with status, then loop.
  // pdf2pic's bulk() returns page count for some pdfs but not all.
  const pages = [];
  let pageNumber = 1;
  let lastErr;
  // We rely on pdf2pic throwing when out of pages
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const result = await handle(pageNumber, { responseType: 'buffer' });
      const buf = result.buffer;
      const processed = await preprocessImage(buf);
      pages.push(processed);
      pageNumber += 1;
      if (pageNumber > 20) break; // hard cap to avoid runaway
    } catch (e) {
      lastErr = e;
      break;
    }
  }
  if (!pages.length) throw lastErr || new Error('No pages extracted from PDF');
  return pages;
}

module.exports = { pdfToImages };
