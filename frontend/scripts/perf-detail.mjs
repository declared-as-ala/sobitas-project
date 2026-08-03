/** Pull the specifics out of a saved Lighthouse report: what blocks, what is oversized, what runs. */
import fs from 'node:fs';
const lhr = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const A = (id) => lhr.audits[id];
const kb = (n) => `${Math.round((n ?? 0) / 1024)} kB`;

const show = (title, id, cols) => {
  const items = A(id)?.details?.items ?? [];
  if (!items.length) return;
  console.log(`\n── ${title} (${A(id).displayValue ?? ''})`);
  for (const it of items.slice(0, 12)) console.log('   ' + cols(it));
};

console.log('LCP element:', A('largest-contentful-paint-element')?.details?.items?.[0]?.items?.[0]?.node?.snippet?.slice(0, 200));

const net = A('network-requests')?.details?.items ?? [];
const img = net.filter((r) => r.resourceType === 'Image').sort((a, b) => (b.transferSize ?? 0) - (a.transferSize ?? 0));
console.log(`\n── images (${img.length}, ${kb(img.reduce((s, r) => s + (r.transferSize ?? 0), 0))})`);
for (const r of img.slice(0, 8)) {
  console.log(`   ${kb(r.transferSize).padStart(8)}  start ${Math.round(r.networkRequestTime)}ms  end ${Math.round(r.networkEndTime)}ms  ${r.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 90)}`);
}

show('render-blocking', 'render-blocking-resources', (i) => `${kb(i.totalBytes).padStart(8)}  ${Math.round(i.wastedMs)}ms  ${i.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 80)}`);
show('oversized images', 'uses-responsive-images', (i) => `${kb(i.wastedBytes).padStart(8)} wasted  ${i.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 80)}`);
show('unused JS', 'unused-javascript', (i) => `${kb(i.wastedBytes).padStart(8)} of ${kb(i.totalBytes).padEnd(8)} ${i.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 78)}`);
show('unused CSS', 'unused-css-rules', (i) => `${kb(i.wastedBytes).padStart(8)} of ${kb(i.totalBytes).padEnd(8)} ${i.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 78)}`);
show('third parties', 'third-party-summary', (i) => `${String(Math.round(i.blockingTime)).padStart(5)}ms block  ${kb(i.transferSize).padStart(8)}  ${i.entity}`);
show('main-thread', 'mainthread-work-breakdown', (i) => `${String(Math.round(i.duration)).padStart(6)}ms  ${i.group}`);
show('long tasks', 'long-tasks', (i) => `${String(Math.round(i.duration)).padStart(6)}ms  ${(i.url ?? '').replace(/^https?:\/\/[^/]+/, '').slice(0, 80)}`);
show('legacy JS', 'legacy-javascript', (i) => `${kb(i.wastedBytes).padStart(8)}  ${i.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 80)}`);
show('preconnect', 'uses-rel-preconnect', (i) => `${Math.round(i.wastedMs)}ms  ${i.url}`);

const fonts = net.filter((r) => r.resourceType === 'Font');
console.log(`\n── fonts (${fonts.length}, ${kb(fonts.reduce((s, r) => s + (r.transferSize ?? 0), 0))})`);
for (const r of fonts) console.log(`   ${kb(r.transferSize).padStart(8)}  end ${Math.round(r.networkEndTime)}ms  ${r.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 80)}`);

const doc = net.find((r) => r.resourceType === 'Document');
if (doc) console.log(`\n── document  ${kb(doc.transferSize)}  ttfb-ish ${Math.round(doc.networkEndTime - doc.networkRequestTime)}ms`);
console.log('\ntotal transfer:', kb(net.reduce((s, r) => s + (r.transferSize ?? 0), 0)), `across ${net.length} requests`);
