import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const [returnsDesktop, returnsMobile, packDesktop, packMobile, outputDirectory] = process.argv.slice(2);

if (![returnsDesktop, returnsMobile, packDesktop, packMobile, outputDirectory].every(Boolean)) {
  throw new Error(
    'Usage: node scripts/build-slide-campaign.mjs <returns-desktop> <returns-mobile> <pack-desktop> <pack-mobile> <output-directory>',
  );
}

const ORANGE = '#D53B04';
const WHITE = '#FFFFFF';
const MUTED = '#D8D6D4';
const logoPath = path.resolve('public/logo.png');

await fs.mkdir(outputDirectory, { recursive: true });

const escapeXml = (value) =>
  value.replace(/[<>&'\"]/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  })[character]);

function desktopOverlay({ headline, headlineSize = 100, promise, support }) {
  return Buffer.from(`
    <svg width="2400" height="1000" viewBox="0 0 2400 1000" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="readability" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#050505" stop-opacity="0.92"/>
          <stop offset="0.43" stop-color="#050505" stop-opacity="0.58"/>
          <stop offset="0.60" stop-color="#050505" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="1500" height="1000" fill="url(#readability)"/>
      <rect x="340" y="278" width="88" height="8" rx="4" fill="${ORANGE}"/>
      <text x="780" y="425" text-anchor="middle" direction="rtl" unicode-bidi="bidi-override"
        font-family="Tahoma, Arial, sans-serif" font-size="${headlineSize}" font-weight="800" fill="${WHITE}">${escapeXml(headline)}</text>
      <text x="780" y="555" text-anchor="middle" direction="rtl" unicode-bidi="bidi-override"
        font-family="Tahoma, Arial, sans-serif" font-size="72" font-weight="800" fill="${ORANGE}">${escapeXml(promise)}</text>
      <text x="780" y="650" text-anchor="middle" direction="rtl" unicode-bidi="bidi-override"
        font-family="Tahoma, Arial, sans-serif" font-size="31" font-weight="400" fill="${MUTED}">${escapeXml(support)}</text>
      <circle cx="346" cy="772" r="5" fill="${ORANGE}"/>
      <rect x="366" y="768" width="150" height="8" rx="4" fill="${ORANGE}" fill-opacity="0.55"/>
    </svg>
  `);
}

function mobileOverlay({ headline, promise, supportLines }) {
  return Buffer.from(`
    <svg width="1200" height="1500" viewBox="0 0 1200 1500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="readability" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#050505" stop-opacity="0.90"/>
          <stop offset="0.47" stop-color="#050505" stop-opacity="0.48"/>
          <stop offset="0.65" stop-color="#050505" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="940" fill="url(#readability)"/>
      <rect x="556" y="202" width="88" height="8" rx="4" fill="${ORANGE}"/>
      <text x="600" y="350" text-anchor="middle" direction="rtl" unicode-bidi="bidi-override"
        font-family="Tahoma, Arial, sans-serif" font-size="96" font-weight="800" fill="${WHITE}">${escapeXml(headline)}</text>
      <text x="600" y="465" text-anchor="middle" direction="rtl" unicode-bidi="bidi-override"
        font-family="Tahoma, Arial, sans-serif" font-size="68" font-weight="800" fill="${ORANGE}">${escapeXml(promise)}</text>
      <text x="600" y="530" text-anchor="middle" direction="rtl" unicode-bidi="bidi-override"
        font-family="Tahoma, Arial, sans-serif" font-size="33" font-weight="400" fill="${MUTED}">${escapeXml(supportLines[0])}</text>
      <text x="600" y="575" text-anchor="middle" direction="rtl" unicode-bidi="bidi-override"
        font-family="Tahoma, Arial, sans-serif" font-size="33" font-weight="400" fill="${MUTED}">${escapeXml(supportLines[1])}</text>
    </svg>
  `);
}

async function prepareLogo(width) {
  return sharp(logoPath)
    .trim({ background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .resize({ width, withoutEnlargement: true })
    .png()
    .toBuffer();
}

async function buildDesktop(input, filename, copy) {
  const logo = await prepareLogo(290);
  await sharp(input)
    .resize(2400, 1000, { fit: 'cover', position: 'centre' })
    .composite([
      { input: desktopOverlay(copy), left: 0, top: 0 },
      { input: logo, left: 340, top: 90 },
    ])
    .webp({ quality: 84, effort: 6, smartSubsample: true })
    .toFile(path.join(outputDirectory, filename));
}

async function buildMobile(input, filename, copy) {
  const logo = await prepareLogo(270);
  await sharp(input)
    .resize(1200, 1500, { fit: 'cover', position: 'centre' })
    .composite([
      { input: mobileOverlay(copy), left: 0, top: 0 },
      { input: logo, left: 465, top: 70 },
    ])
    .webp({ quality: 84, effort: 6, smartSubsample: true })
    .toFile(path.join(outputDirectory, filename));
}

const returnCopy = {
  headline: 'ما عجبكش البرودوي؟',
  headlineSize: 78,
  promise: 'بدّلو ولا رجّعو في 7 أيّام',
  support: 'كان ما ناسبكش، نبدّلوهولك ولا ترجّعو بكل سهولة.',
  supportLines: ['كان ما ناسبكش، نبدّلوهولك', 'ولا ترجّعو بكل سهولة.'],
};

const packCopy = {
  headline: 'كوّن الباك متاعك',
  promise: 'كل ما تزيد، الريميز تكبر',
  support: 'اختار البرودويات اللي تناسب هدفك والريميز تتحسب وحدها.',
  supportLines: ['اختار البرودويات اللي تناسب هدفك', 'والريميز تتحسب وحدها.'],
};

await Promise.all([
  buildDesktop(returnsDesktop, 'returns-desktop.webp', returnCopy),
  buildMobile(returnsMobile, 'returns-mobile.webp', returnCopy),
  buildDesktop(packDesktop, 'pack-builder-desktop.webp', packCopy),
  buildMobile(packMobile, 'pack-builder-mobile.webp', packCopy),
]);

for (const filename of [
  'returns-desktop.webp',
  'returns-mobile.webp',
  'pack-builder-desktop.webp',
  'pack-builder-mobile.webp',
]) {
  const file = path.join(outputDirectory, filename);
  const metadata = await sharp(file).metadata();
  const stats = await fs.stat(file);
  console.log(`${filename}: ${metadata.width}x${metadata.height}, ${Math.round(stats.size / 1024)} KiB`);
}
