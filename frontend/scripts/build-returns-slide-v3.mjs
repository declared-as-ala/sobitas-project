import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const [desktopSource, mobileSource, outputDirectory] = process.argv.slice(2);

if (![desktopSource, mobileSource, outputDirectory].every(Boolean)) {
  throw new Error(
    'Usage: node scripts/build-returns-slide-v3.mjs <desktop-background> <mobile-background> <output-directory>',
  );
}

const ORANGE = '#D53B04';
const WHITE = '#FFFFFF';
const MUTED = '#D8D6D4';
const logoPath = path.resolve('public/logo.png');

await fs.mkdir(outputDirectory, { recursive: true });

function desktopOverlay() {
  return Buffer.from(`
    <svg width="2400" height="1000" viewBox="0 0 2400 1000" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="copy-shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#020202" stop-opacity="0.70"/>
          <stop offset="0.50" stop-color="#020202" stop-opacity="0.34"/>
          <stop offset="0.67" stop-color="#020202" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="1470" height="1000" fill="url(#copy-shade)"/>

      <g fill="${ORANGE}">
        <rect x="330" y="248" width="76" height="7" rx="3.5"/>
        <circle cx="330" cy="760" r="5"/>
        <circle cx="352" cy="760" r="5" fill-opacity="0.70"/>
        <circle cx="374" cy="760" r="5" fill-opacity="0.40"/>
        <rect x="400" y="756" width="116" height="8" rx="4" fill-opacity="0.55"/>
      </g>

      <g text-anchor="middle" direction="rtl" unicode-bidi="bidi-override"
         font-family="Dubai, Tahoma, Arial, sans-serif">
        <text x="760" y="415" font-size="88" font-weight="700" fill="${WHITE}">البرودوي ما ناسبكش؟</text>
        <text x="760" y="535" font-size="78" font-weight="700" fill="${ORANGE}">بدّلو ولا رجّعو في 7 أيّام</text>
        <text x="760" y="625" font-size="34" font-weight="400" fill="${MUTED}">تبديل ولا ترجيع، بكل سهولة ومن غير تعقيد.</text>
      </g>
    </svg>
  `);
}

function mobileOverlay() {
  return Buffer.from(`
    <svg width="1200" height="1500" viewBox="0 0 1200 1500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="copy-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#020202" stop-opacity="0.82"/>
          <stop offset="0.42" stop-color="#020202" stop-opacity="0.48"/>
          <stop offset="0.52" stop-color="#020202" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="700" fill="url(#copy-shade)"/>

      <g fill="${ORANGE}">
        <rect x="558" y="174" width="84" height="7" rx="3.5"/>
        <circle cx="516" cy="476" r="4.5" fill-opacity="0.40"/>
        <circle cx="538" cy="476" r="4.5" fill-opacity="0.70"/>
        <circle cx="560" cy="476" r="4.5"/>
        <rect x="580" y="472" width="104" height="8" rx="4" fill-opacity="0.55"/>
      </g>

      <g text-anchor="middle" direction="rtl" unicode-bidi="bidi-override"
         font-family="Dubai, Tahoma, Arial, sans-serif">
        <text x="600" y="285" font-size="80" font-weight="700" fill="${WHITE}">البرودوي ما ناسبكش؟</text>
        <text x="600" y="382" font-size="62" font-weight="700" fill="${ORANGE}">بدّلو ولا رجّعو في 7 أيّام</text>
        <text x="600" y="447" font-size="30" font-weight="400" fill="${MUTED}">تبديل ولا ترجيع، بكل سهولة ومن غير تعقيد.</text>
      </g>
    </svg>
  `);
}

async function logo(width) {
  return sharp(logoPath)
    .trim({ background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .resize({ width, withoutEnlargement: true })
    .png()
    .toBuffer();
}

async function buildDesktop() {
  const mark = await logo(260);
  return sharp(desktopSource)
    .resize(2400, 1000, { fit: 'cover', position: 'centre' })
    .composite([
      { input: desktopOverlay(), left: 0, top: 0 },
      { input: mark, left: 330, top: 76 },
    ])
    .webp({ quality: 86, effort: 6, smartSubsample: true })
    .toFile(path.join(outputDirectory, 'returns-desktop-v3.webp'));
}

async function buildMobile() {
  const mark = await logo(235);
  return sharp(mobileSource)
    .resize(1200, 1500, { fit: 'cover', position: 'centre' })
    .composite([
      { input: mobileOverlay(), left: 0, top: 0 },
      { input: mark, left: 482, top: 54 },
    ])
    .webp({ quality: 86, effort: 6, smartSubsample: true })
    .toFile(path.join(outputDirectory, 'returns-mobile-v3.webp'));
}

await Promise.all([buildDesktop(), buildMobile()]);

for (const filename of ['returns-desktop-v3.webp', 'returns-mobile-v3.webp']) {
  const file = path.join(outputDirectory, filename);
  const metadata = await sharp(file).metadata();
  const stats = await fs.stat(file);
  console.log(`${filename}: ${metadata.width}x${metadata.height}, ${Math.round(stats.size / 1024)} KiB`);
}
