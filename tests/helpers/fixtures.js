'use strict';

const sharp = require('sharp');

async function makeJpegBuffer() {
  return sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 200, g: 200, b: 200 },
    },
  })
    .jpeg()
    .toBuffer();
}

async function makePngBuffer() {
  return sharp({
    create: {
      width: 80,
      height: 80,
      channels: 4,
      background: { r: 10, g: 50, b: 200, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

function makeFakePdfBuffer() {
  // Minimal valid PDF (1 page). Sufficient for detection; pdf2pic won't be called
  // when our tests bypass preprocessing by mocking the service.
  return Buffer.from(
    '%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 100 100]>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000099 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF\n',
    'latin1'
  );
}

module.exports = { makeJpegBuffer, makePngBuffer, makeFakePdfBuffer };
