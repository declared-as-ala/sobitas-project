// Format conversion only: generated typography and artwork are never composited here.
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const names = ['returns-desktop', 'pack-builder-desktop', 'welcome-bonus-desktop', 'returns-mobile', 'pack-builder-mobile', 'welcome-bonus-mobile'];
const inputs = process.argv.slice(2);
if (inputs.length !== names.length) throw new Error('Supply six generated PNG paths in the documented campaign order.');
const output = path.resolve('../filament/resources/slide-assets/2026-09-03-natural');
await fs.mkdir(output, { recursive: true });
for (let index = 0; index < names.length; index++) {
  const destination = path.join(output, `${names[index]}.webp`);
  const result = await sharp(inputs[index]).webp({ lossless: true, effort: 6 }).toFile(destination);
  console.log(`${names[index]}: ${result.width}x${result.height}, ${result.size} bytes, lossless master`);
}
