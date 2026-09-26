'use strict';

const { preprocessImage } = require('../src/services/imageService');
const { config } = require('../src/config');
const sharp = require('sharp');

describe('imageService.preprocessImage', () => {
  test('produces a JPEG buffer under configured max dimension', async () => {
    const big = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: { r: 100, g: 100, b: 100 } },
    })
      .jpeg({ quality: 100 })
      .toBuffer();

    const out = await preprocessImage(big);
    expect(out.mime).toBe('image/jpeg');
    expect(out.buffer.length).toBeGreaterThan(0);

    const meta = await sharp(out.buffer).metadata();
    expect(Math.max(meta.width, meta.height)).toBeLessThanOrEqual(config.image.maxDimension);
  });

  test('does not enlarge small images', async () => {
    const small = await sharp({
      create: { width: 200, height: 200, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .jpeg()
      .toBuffer();
    const out = await preprocessImage(small);
    const meta = await sharp(out.buffer).metadata();
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(200);
  });
});
