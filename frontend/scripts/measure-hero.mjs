/**
 * How much of the hero image is actually being cut off, on a real phone profile.
 *
 * The hero frame has a fixed CSS height and the image is `object-fit: cover`, so whenever the
 * source's aspect ratio differs from the frame's, cover scales to the LARGER ratio and the
 * overflow is cropped — split evenly top and bottom by `object-position: center`. Owner report:
 * "on my iPhone 13 the slider image is cropped from the top."
 *
 * Guessing at `svh` is how you get this wrong: `svh` is the SMALL viewport (browser chrome at its
 * largest), it differs between Safari and Chrome, and the frame also subtracts the tab bar and the
 * safe-area inset. So measure the rendered box instead of computing it.
 *
 *   node scripts/measure-hero.mjs --url https://protein.tn/
 */
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const one = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : argv[i + 1];
};
const URL_UNDER_TEST = one('url', 'http://localhost:3111/');

const CHROME = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
].find(Boolean);

/**
 * `height` here is the SMALL VIEWPORT — what `100svh` actually resolves to on the real device,
 * i.e. screen height minus the browser chrome at its LARGEST. It is NOT the screen height.
 *
 * This distinction is the whole reason the first run of this script reported "0px cropped" while
 * the owner was looking at a visibly cropped hero on an iPhone 13. Headless Chrome has no
 * retractable toolbars, so `svh` === the viewport you set === the full screen height, and the
 * `clamp()` landed ~100px taller than it ever does in Safari. Passing the screen height here
 * measures a phone that does not exist.
 *
 * Real devices also subtract `env(safe-area-inset-bottom)` (34px on a notched iPhone), which
 * headless reports as 0. That is called out in the output rather than faked, because once the
 * clamp's floor is the binding value — which is the point of the fix — the inset stops mattering.
 */
const DEVICES = [
  { name: 'iPhone 13 / 14', width: 390, height: 746, screen: 844, dpr: 3, safeBottom: 34 },
  { name: 'iPhone 15 Pro Max', width: 430, height: 834, screen: 932, dpr: 3, safeBottom: 34 },
  { name: 'Galaxy S / Pixel', width: 412, height: 823, screen: 915, dpr: 2.6, safeBottom: 0 },
  { name: 'small Android', width: 360, height: 708, screen: 800, dpr: 2, safeBottom: 0 },
];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });

console.log(`\n══ hero crop · ${URL_UNDER_TEST} ══`);

for (const d of DEVICES) {
  const page = await browser.newPage();
  await page.setViewport({ width: d.width, height: d.height, deviceScaleFactor: d.dpr, isMobile: true, hasTouch: true });
  await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle0', timeout: 60000 });

  const m = await page.evaluate(() => {
    const frame = document.querySelector('.pt-hero');
    const img = frame?.querySelector('img');
    if (!frame || !img) return null;
    const fr = frame.getBoundingClientRect();
    return {
      frameW: Math.round(fr.width),
      frameH: Math.round(fr.height),
      natW: img.naturalWidth,
      natH: img.naturalHeight,
      currentSrc: img.currentSrc,
      objectFit: getComputedStyle(img).objectFit,
      objectPosition: getComputedStyle(img).objectPosition,
    };
  });

  if (!m) {
    console.log(`\n  ${d.name}: no .pt-hero found`);
    await page.close();
    continue;
  }

  // `cover` picks the LARGER scale so the box is filled; the other axis then overflows.
  const scale = Math.max(m.frameW / m.natW, m.frameH / m.natH);
  const shownW = m.natW * scale;
  const shownH = m.natH * scale;
  const cropY = Math.max(0, shownH - m.frameH);
  const cropX = Math.max(0, shownW - m.frameW);
  const visible = ((m.frameH * m.frameW) / (shownH * shownW)) * 100;

  console.log(`\n  ${d.name}  (${d.width}x${d.height} @${d.dpr}x)`);
  console.log(`    frame            ${m.frameW} x ${m.frameH}   (aspect ${(m.frameW / m.frameH).toFixed(3)})`);
  console.log(`    source           ${m.natW} x ${m.natH}   (aspect ${(m.natW / m.natH).toFixed(3)})`);
  console.log(`    object-fit       ${m.objectFit} / ${m.objectPosition}`);
  console.log(`    cropped off      ${Math.round(cropY)}px vertical  (${Math.round(cropY / 2)}px off the TOP), ${Math.round(cropX)}px horizontal`);
  console.log(`    image visible    ${visible.toFixed(1)}%`);
  if (d.safeBottom) console.log(`    note             a real device also subtracts ${d.safeBottom}px safe-area inset, which headless reports as 0`);
  await page.close();
}

await browser.close();
console.log('');
