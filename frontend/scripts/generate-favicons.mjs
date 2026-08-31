#!/usr/bin/env node

/**
 * Generate the favicon set from public/icon.png using the project's installed Sharp runtime.
 * The output stays RGBA: transparent corners are intentional and must not be flattened.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const publicDir = path.join(root, 'public');
const source = path.join(publicDir, 'icon.png');

async function loadCleanSource() {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixelCount = info.width * info.height;
  const visited = new Uint8Array(pixelCount);
  let largest = [];

  // Image-generation output occasionally contains one or two detached coloured pixels. Keep the
  // dominant connected mark and discard tiny islands so those pixels do not become dark specks at
  // favicon sizes. Alpha > 24 includes the antialiased edge while excluding transparent noise.
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
    if (keep[pixel]) continue;
    data[pixel * 4] = 0;
    data[pixel * 4 + 1] = 0;
    data[pixel * 4 + 2] = 0;
    data[pixel * 4 + 3] = 0;
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

const cleanSource = await loadCleanSource();

async function render(size, filename) {
  const buffer = await sharp(cleanSource)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
  await fs.writeFile(path.join(publicDir, filename), buffer);
  return buffer;
}

// ICO files may embed a PNG payload. A single crisp 32 px entry is sufficient because the HTML
// explicitly advertises 16/32 px PNG variants first; ICO remains the legacy fallback.
function pngToIco(png, size = 32) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const directory = Buffer.alloc(16);
  directory.writeUInt8(size === 256 ? 0 : size, 0);
  directory.writeUInt8(size === 256 ? 0 : size, 1);
  directory.writeUInt8(0, 2);
  directory.writeUInt8(0, 3);
  directory.writeUInt16LE(1, 4);
  directory.writeUInt16LE(32, 6);
  directory.writeUInt32LE(png.length, 8);
  directory.writeUInt32LE(22, 12);
  return Buffer.concat([header, directory, png]);
}

await render(16, 'favicon-16x16.png');
const favicon32 = await render(32, 'favicon-32x32.png');
await render(180, 'apple-touch-icon.png');
await render(192, 'favicon-192x192.png');
const favicon512 = await render(512, 'favicon-512x512.png');
await fs.writeFile(path.join(publicDir, 'favicon.ico'), pngToIco(favicon32));
await fs.writeFile(source, favicon512);
await fs.writeFile(path.join(root, 'favicon.png'), favicon512);

console.log('Generated transparent Protein.tn favicon set from public/icon.png');
