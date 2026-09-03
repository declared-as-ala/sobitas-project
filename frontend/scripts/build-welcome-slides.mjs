// Lossless masters: Next's existing image optimizer performs the only lossy encode.
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const destination = path.resolve('../filament/resources/slide-assets/2026-09-03');
await fs.mkdir(destination, { recursive: true });
const sources = process.argv.slice(2);
if (sources.length !== 2) throw new Error('Provide the desktop and mobile generated PNG paths.');
for (const [index, source] of sources.entries()) {
  const target = path.join(destination, `welcome-bonus-${index === 0 ? 'desktop' : 'mobile'}-v1.webp`);
  await sharp(source).webp({ lossless: true, effort: 6 }).toFile(target);
  const metadata = await sharp(target).metadata();
  console.log(target, metadata.width, metadata.height, (await fs.stat(target)).size);
}
