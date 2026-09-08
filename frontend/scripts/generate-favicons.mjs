#!/usr/bin/env node

/**
 * Generate the Protein.tn favicon set from one vector master.
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
const brandOrange = '#e63b05';

const faviconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Protein.tn">
  <circle cx="256" cy="256" r="240" fill="${brandOrange}"/>
  <path fill="#fff" fill-rule="evenodd" d="M139 404 221 116h171c31 0 49 25 40 56l-28 99c-9 31-34 50-65 50H228l-17 59-72 24Zm116-220-21 73h93c9 0 16-6 19-15l11-39c3-11-2-19-14-19h-88Z"/>
</svg>`.trim();

await fs.writeFile(path.join(publicDir, 'favicon.svg'), `${faviconSvg}\n`, 'utf8');

async function render(size, filename) {
  const buffer = await sharp(Buffer.from(faviconSvg))
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
