#!/usr/bin/env node

/**
 * Generate the Protein.tn favicon set from the original brand mark.
 *
 * The orange disc keeps the mark readable against both light and dark browser chrome, while the
 * white Protein.tn “P” remains recognisable down to 16 px. Transparent corners are intentional.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const root = path.resolve(import.meta.dirname, '..');
const publicDir = path.join(root, 'public');
const markSource = path.join(root, 'scripts', 'favicon-p-mark.png');
const brandOrange = '#e63b05';

async function loadCleanMark() {
  const { data, info } = await sharp(markSource).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixelCount = info.width * info.height;

  // The archived brand mark was exported on a flat neutral preview background. Recover its
  // transparency from the orange colour contrast before isolating the connected “P” glyph.
  let hasTransparency = false;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (data[pixel * 4 + 3] < 250) {
      hasTransparency = true;
      break;
    }
  }
  if (!hasTransparency) {
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const offset = pixel * 4;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const orangeChroma = Math.max(0, ((red - green) / 161 + (red - blue) / 224) / 2);
      data[offset + 3] = Math.max(0, Math.min(255, Math.round((orangeChroma - 0.015) * 280)));
    }
  }

  const visited = new Uint8Array(pixelCount);
  let largest = [];

  for (let seed = 0; seed < pixelCount; seed += 1) {
    if (visited[seed] || data[seed * 4 + 3] <= 24) continue;
    const component = [];
    const stack = [seed];
    visited[seed] = 1;
    while (stack.length) {
      const current = stack.pop();
      component.push(current);
      const x = current % info.width;
      const y = Math.floor(current / info.width);
      const neighbours = [
        x > 0 ? current - 1 : -1,
        x + 1 < info.width ? current + 1 : -1,
        y > 0 ? current - info.width : -1,
        y + 1 < info.height ? current + info.width : -1,
      ];
      for (const next of neighbours) {
        if (next < 0 || visited[next] || data[next * 4 + 3] <= 24) continue;
        visited[next] = 1;
        stack.push(next);
      }
    }
    if (component.length > largest.length) largest = component;
  }

  const keep = new Uint8Array(pixelCount);
  for (const pixel of largest) keep[pixel] = 1;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (!keep[pixel]) data[pixel * 4 + 3] = 0;
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

async function buildMaster() {
  const cleanMark = await loadCleanMark();
  const { data, info } = await sharp(cleanMark)
    .ensureAlpha()
    .trim()
    .resize(276, 276, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = 255;
    data[offset + 1] = 255;
    data[offset + 2] = 255;
  }
  const whiteMark = await sharp(data, { raw: info }).png().toBuffer();
  const circle = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><circle cx="256" cy="256" r="240" fill="${brandOrange}"/></svg>`);
  return sharp(circle).composite([{ input: whiteMark, left: 118, top: 118 }]).png().toBuffer();
}

const master = await buildMaster();

async function render(size, filename) {
  const buffer = await sharp(master)
    .resize(size, size)
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
  await fs.writeFile(path.join(publicDir, filename), buffer);
  return buffer;
}

function pngsToIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let payloadOffset = 6 + images.length * 16;
  const directories = images.map(({ png, size }) => {
    const directory = Buffer.alloc(16);
    directory.writeUInt8(size === 256 ? 0 : size, 0);
    directory.writeUInt8(size === 256 ? 0 : size, 1);
    directory.writeUInt8(0, 2);
    directory.writeUInt8(0, 3);
    directory.writeUInt16LE(1, 4);
    directory.writeUInt16LE(32, 6);
    directory.writeUInt32LE(png.length, 8);
    directory.writeUInt32LE(payloadOffset, 12);
    payloadOffset += png.length;
    return directory;
  });
  return Buffer.concat([header, ...directories, ...images.map(({ png }) => png)]);
}

const favicon16 = await render(16, 'favicon-16x16.png');
const favicon32 = await render(32, 'favicon-32x32.png');
await render(180, 'apple-touch-icon.png');
await render(180, 'apple-icon.png');
await render(192, 'favicon-192x192.png');
const favicon512 = await render(512, 'favicon-512x512.png');
await fs.writeFile(
  path.join(publicDir, 'favicon.ico'),
  pngsToIco([
    { png: favicon16, size: 16 },
    { png: favicon32, size: 32 },
  ]),
);
await fs.writeFile(path.join(publicDir, 'icon.png'), favicon512);
await fs.writeFile(path.join(root, 'favicon.png'), favicon512);

console.log('Generated orange-circle / white-P Protein.tn favicon set');
