#!/usr/bin/env node
/**
 * Composes merchandise-oriented logo variants that include the website URL
 * beneath the existing wordmark and tagline. Reads the transparent full logo
 * PNGs and writes new *-url.png files without touching the originals.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = join(import.meta.dirname, '..');
const LOGO_DIR = join(ROOT, 'public', 'brand', 'logo', 'full');

// Brand blue (--palette-blue). Matches the "nidhi" wordmark. Chosen over the
// teal tagline color because on merchandise, higher contrast (10.1:1 vs 7.5:1
// on white) and the hyperlink-convention read of blue-as-URL matter more than
// keeping the URL visually grouped with the tagline.
const BRAND_BLUE = '#0A3D8F';
const URL_TEXT = 'https://nidhi.today/';

// Measured against logo-full-400-transparent.png (400x163):
//   icon:    x = 0..131
//   text:    x = 151..373
//   nidhi:   y = 37..88
//   tagline: y = 114..137
// All numbers below are in the 400-wide coordinate space and scale linearly.
const BASE_WIDTH = 400;
const URL_FONT_SIZE = 22;      // sits between the tagline weight and body text
// Source image already has ~26px of empty padding below the tagline, matching
// the nidhi -> tagline gap. Zero top margin keeps the URL at the same cadence.
const URL_TOP_MARGIN = 0;
const URL_BOTTOM_MARGIN = 16;  // gap below URL to canvas edge

function urlSvg(canvasWidth, canvasHeight, scale) {
  const fontSize = URL_FONT_SIZE * scale;
  const centerX = canvasWidth / 2;
  const baselineY = canvasHeight - URL_BOTTOM_MARGIN * scale - fontSize * 0.15;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">
  <style>
    .u {
      font-family: 'Inter', 'InterVariable', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-weight: 600;
      font-size: ${fontSize}px;
      letter-spacing: 0.01em;
      fill: ${BRAND_BLUE};
    }
  </style>
  <text class="u" x="${centerX}" y="${baselineY}" text-anchor="middle">${URL_TEXT}</text>
</svg>`;
}

async function renderVariant({ srcName, outName, targetWidth }) {
  const srcPath = join(LOGO_DIR, srcName);
  const outPath = join(LOGO_DIR, outName);

  const src = sharp(srcPath);
  const meta = await src.metadata();
  if (!meta.width || !meta.height) throw new Error(`No dims for ${srcName}`);

  const scale = targetWidth / BASE_WIDTH;
  const extraBelow = Math.round((URL_TOP_MARGIN + URL_FONT_SIZE + URL_BOTTOM_MARGIN) * scale);
  const canvasHeight = meta.height + extraBelow;

  const svg = urlSvg(meta.width, canvasHeight, scale);

  const extended = await src
    .extend({
      top: 0,
      bottom: extraBelow,
      left: 0,
      right: 0,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  await sharp(extended)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(outPath);

  console.log(`wrote ${outName} (${meta.width}x${canvasHeight})`);
}

async function main() {
  await renderVariant({
    srcName: 'logo-full-400-transparent.png',
    outName: 'logo-full-400-transparent-url.png',
    targetWidth: 400,
  });
  await renderVariant({
    srcName: 'logo-full-800-transparent.png',
    outName: 'logo-full-800-transparent-url.png',
    targetWidth: 800,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});