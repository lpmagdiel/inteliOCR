'use strict';

const sharp = require('sharp');
const { config } = require('../config');

async function preprocessImage(inputBuffer) {
  const pipeline = sharp(inputBuffer, { failOnError: false })
    .rotate()
    .resize({
      width: config.image.maxDimension,
      height: config.image.maxDimension,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({
      quality: config.image.quality,
      mozjpeg: true,
      progressive: true,
    });

  const out = await pipeline.toBuffer();
  return { buffer: out, mime: 'image/jpeg' };
}

module.exports = { preprocessImage };
