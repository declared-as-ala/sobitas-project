/**
 * Live SEO surface audit — what Googlebot sees on the pages that matter, every morning.
 *
 *   node seo-agent/tools/audit-live.mjs                      # every URL in seo-agent/watchlist.txt
 *   node seo-agent/tools/audit-live.mjs /creatine /whey-proteine   # ad hoc
 *   node seo-agent/tools/audit-live.mjs --json               # machine-readable
 *   node seo-agent/tools/audit-live.mjs --sample=40          # + 40 random product URLs from the sitemaps
 *                                                            #   (bug-finding beyond the watchlist; the seed
 *                                                            #   rotates daily so a month covers ~1,200 pages)
 *
 * Fetches with a Googlebot UA (the storefront serves crawlers a dedicated view), concurrency 2
 * (an earlier probe at 6 produced 502s whose error page is noindex — a checker that changes what it
 * measures is worse than none), and reports per URL: status + final URL, robots meta, canonical,
 * title (+ length), meta description (+ length), H1, JSON-LD types, Product offer price /
 * availability / aggregateRating, FAQPage presence, hreflang count, rough word count.
 *
 * Exit code 1 when any P0 problem is found, so the routine cannot miss a regression:
 *   P0  non-200 for a watchlist URL · noindex on a product/category · missing canonical ·
 *       canonical pointing elsewhere · missing title/description · Product page without Product JSON-LD
 *   P1  title > 65 chars · description > 165 or < 70 chars · missing H1 · no FAQ on a product ·
 *       word count < 250 on a product · price missing in offers
 *   P2  a CATEGORY serving `noindex, follow` where the page rendered cards and not one is buyable
 *       — the deliberate dead-listing gate (commit 9c9dc83), self-reversing on restock. Any other
 *       noindex, and any noindex with a single in-stock card under it, stays a P0. ALSO: a 200
 *       whose body rendered but whose head carried none of title/canonical/description/robots,
 *       where a confirming re-fetch came back clean (see the comment in `probe`).
 * No dependencies. Regex parsing on purpose: the run needs answers, not a DOM.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = process.env.BASE_URL || 'https://protein.tn';
const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const here = path.dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const json = argv.includes('--json');
const sampleArg = argv.find((a) => a.startsWith('--sample='));
const sampleN = sampleArg ? Math.max(0, Math.min(200, Number(sampleArg.split('=')[1]) || 0)) : 0;
let urls = argv.filter((a) => a.startsWith('/'));
if (urls.length === 0 || sampleN > 0) {
  const file = path.resolve(here, '..', 'watchlist.txt');
  if (!existsSync(file)) {
    console.error('no watchlist.txt and no URLs given');
    process.exit(2);
  }
  if (urls.length === 0) urls = readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}

// Deterministic daily sample: same seed all day (re-runs compare like with like), new pages tomorrow.
async function sampleProducts(n) {
  const locs = [];
  for (let i = 0; i < 12; i += 1) {
    let res;
    try { res = await fetch(`${ORIGIN}/sitemaps/products-${i}.xml`, { headers: { 'user-agent': UA } }); } catch { break; }
    if (!res.ok) break;
    const xml = await res.text();
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) locs.push(m[1].replace(ORIGIN, ''));
  }
  if (locs.length === 0) return [];
  let seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, '')) % 2147483647;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  const picked = new Set();
  while (picked.size < Math.min(n, locs.length)) picked.add(locs[Math.floor(rnd() * locs.length)]);
  return [...picked];
}
if (sampleN > 0) {
  const extra = (await sampleProducts(sampleN)).filter((u) => !urls.includes(u));
  urls = [...urls, ...extra];
  console.error(`(sample: +${extra.length} product URLs from the sitemaps)`);
}

const decode = (s) => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  return m ? decode(m[2] ?? m[3] ?? '') : null;
};
const metaContent = (html, selector) => {
  const re = /<meta\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    if (selector(tag)) return attr(tag, 'content');
  }
  return null;
};

function classify(pathname) {
  if (pathname === '/' || pathname === '') return 'home';
  if (pathname.startsWith('/blog')) return 'blog';
  if (pathname.startsWith('/shop') || pathname.startsWith('/brands') || pathname.startsWith('/marques')) return 'hub';
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length >= 2) return 'product';
  return 'category';
}

async function probe(pathname) {
  const url = ORIGIN + pathname;
  const out = { path: pathname, kind: classify(pathname), problems: [] };
  let res;
  try {
    res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html' }, redirect: 'follow' });
  } catch (e) {
    out.status = 'ERR';
    out.problems.push(['P0', `fetch failed: ${e.message}`]);
    return out;
  }
  out.status = res.status;
  out.finalAbsolute = res.url;
  out.finalUrl = res.url.replace(ORIGIN, '') || '/';
  if (res.status !== 200) {
    out.problems.push(['P0', `HTTP ${res.status}`]);
    return out;
  }
  if (out.finalUrl !== pathname) out.problems.push(['P1', `redirected to ${out.finalUrl}`]);

  let html = await res.text();
  const readMeta = (doc) => ({
    title: decode((doc.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim()),
    description: metaContent(doc, (t) => /name\s*=\s*["']description["']/i.test(t)),
    robots: metaContent(doc, (t) => /name\s*=\s*["']robots["']/i.test(t)),
    canonical: (() => {
      const tag = (doc.match(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/i) || [null])[0];
      return tag ? attr(tag, 'href') : null;
    })(),
  });
  let meta = readMeta(html);

  /*
   * ── A 200 WITH NO HEAD METADATA AT ALL IS CONFIRMED BEFORE IT IS BELIEVED ───────────────────
   * On 25/09/2026 the --sample=120 sweep reported `/sante-vitalite` as three simultaneous P0s —
   * no <title>, no canonical, no meta description, no robots — while the body rendered 1,012
   * words and the full JSON-LD graph. The same URL had audited `ok` 45 minutes earlier in the
   * --sample=40 run, and 14 consecutive Googlebot fetches immediately afterwards all carried
   * title, canonical, robots and description. One render lost its whole head; nothing in the
   * repository had changed.
   *
   * Missing ONE of the four is a real defect and stays a P0 on the first look. Missing ALL FOUR
   * on a page that still streamed its body is the signature of metadata that never reached the
   * stream, and that shape gets one confirming re-fetch: this checker's whole value is that
   * exit 1 means "drop everything", so a single flaky render must not be able to spend a
   * routine's entire morning. If the second render is healthy the page is measured from it and
   * the anomaly is recorded P2 — visible, still counted, not a false alarm. If the second
   * render is missing them too, it is a P0 exactly as before.
   */
  if (!meta.title && !meta.canonical && !meta.description && !meta.robots) {
    try {
      const again = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html' }, redirect: 'follow' });
      if (again.status === 200) {
        const doc = await again.text();
        const retry = readMeta(doc);
        if (retry.title && retry.canonical) {
          html = doc;
          meta = retry;
          out.problems.push(['P2', 'transient: head metadata absent on 1 of 2 renders (body rendered) — re-fetch was clean']);
        }
      }
    } catch { /* leave the first render's verdict alone; the rules below will call it a P0 */ }
  }

  out.title = meta.title;
  out.description = meta.description;
  out.robots = meta.robots;
  out.canonical = meta.canonical;
  out.h1 = decode((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  out.hreflang = (html.match(/hreflang\s*=/gi) || []).length;

  const ld = [];
  const ldRe = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = ldRe.exec(html))) {
    try {
      const parsed = JSON.parse(m[1]);
      const list = Array.isArray(parsed) ? parsed : parsed['@graph'] ? parsed['@graph'] : [parsed];
      ld.push(...list);
    } catch { out.problems.push(['P1', 'unparseable JSON-LD block']); }
  }
  out.ldTypes = [...new Set(ld.map((n) => n['@type']).flat().filter(Boolean))];
  const product = ld.find((n) => n['@type'] === 'Product' || (Array.isArray(n['@type']) && n['@type'].includes('Product')));
  if (product) {
    const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
    out.price = offer?.price ?? offer?.lowPrice ?? null;
    out.availability = (offer?.availability || '').replace('https://schema.org/', '') || null;
    out.rating = product.aggregateRating ? `${product.aggregateRating.ratingValue} (${product.aggregateRating.reviewCount ?? product.aggregateRating.ratingCount})` : null;
  }
  out.faq = out.ldTypes.includes('FAQPage');

  const body = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ').replace(/<footer[\s\S]*?<\/footer>/gi, ' ').replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  out.words = decode(body).split(/\s+/).filter((w) => /[A-Za-zÀ-ÿ]{2,}/.test(w)).length;

  /*
   * Stock census of the cards this listing actually rendered. The four labels come from
   * `getProductStockStatus` in `frontend/src/util/cartStock.ts` — the single definition the card,
   * the PDP, the cart and the JSON-LD availability all read — so counting them here is a direct
   * read of the same predicate the indexability gate uses, not a second guess at it.
   * `isInStock` is `!isOutOfStock`, and `isBackOrder` implies `isOutOfStock`, so "Sur commande"
   * and "Rupture de stock" are both NOT buyable; only "En stock" and "Stock faible" are.
   * Counted on the script-stripped body so the Next.js flight payload cannot double-count a card.
   * Validated 23/09/2026 against the owner's own production census in commit 9c9dc83:
   * /creatine 8 in stock / 16 sur commande — identical.
   */
  const labelCount = (re) => (decode(body).match(re) || []).length;
  out.inStockCards = labelCount(/En stock/g) + labelCount(/Stock faible/g);
  out.deadCards = labelCount(/Sur commande/g) + labelCount(/Rupture de stock/g);

  // Rules
  const isPage = out.kind === 'product' || out.kind === 'category';
  if (out.robots && /noindex/i.test(out.robots) && isPage) {
    /*
     * ── THE DEAD-LISTING GATE IS NOT A REGRESSION ────────────────────────────────────────────
     *
     * Commit 9c9dc83 (owner, 22/09/2026) made a listing whose page 1 holds nothing purchasable
     * emit `noindex, follow` — deliberately, with a production census and a GSC read behind it
     * (nine such rayons took ~1 click a month between them). It is self-reversing: the day one
     * product is back in stock the next render is `index, follow` again, with no deploy.
     *
     * Flagging that as P0 would put two permanently-red lines at the top of every morning's
     * audit, and a P0 that is always red is a P0 nobody reads — the same failure mode the
     * canonical rule had until 22/09. So the gate firing AS SPECIFIED is recorded as P2.
     *
     * The rule stays narrow on purpose, because a wrong `noindex` on a healthy listing is
     * exactly the bug that cost the best sellers six weeks of ranking (Filament NULL->OFF,
     * ~11/08–21/09). ALL of these must hold, or it is still a P0:
     *   - it is a category, never a product (every published product is `index` — owner, 21/09);
     *   - the directive is `noindex, follow`, never `nofollow` — `follow` is what keeps the
     *     crawl path to the PDPs alive and is the whole reason the gate is allowed to exist;
     *   - the page rendered at least one card, so an API outage (0 cards) cannot silence this;
     *   - not ONE of those cards is buyable. A single "En stock" card under a `noindex` means
     *     the gate is firing on a live rayon, and that is a P0 of the worst kind.
     */
    const gateFiredAsSpecified =
      out.kind === 'category' &&
      /\bfollow\b/i.test(out.robots) && !/nofollow/i.test(out.robots) &&
      out.deadCards > 0 && out.inStockCards === 0;
    if (gateFiredAsSpecified)
      out.problems.push(['P2', `dead-listing gate: noindex, follow with 0/${out.deadCards} buyable (expected — restock reverses it)`]);
    else
      out.problems.push(['P0', `robots "${out.robots}"`]);
  }
  if (!out.canonical) out.problems.push(['P0', 'no canonical']);
  // Compare against the URL actually served, not the one asked for. A watch URL may be a
  // deliberate redirect SOURCE — `/Intra-Workout/<p>` is in watchlist.txt precisely to prove it
  // 301s once and stops — and there the correct canonical is the redirect TARGET. Comparing to
  // `pathname` made that correct page a P0 every single day, and a P0 that is always red is a P0
  // nobody reads. Where nothing redirects, finalAbsolute === ORIGIN + pathname and this is the
  // same check it always was.
  else if (out.canonical.replace(/\/$/, '') !== (out.finalAbsolute || ORIGIN + pathname).replace(/\/$/, ''))
    out.problems.push(['P0', `canonical → ${out.canonical} (served ${out.finalUrl})`]);
  if (!out.title) out.problems.push(['P0', 'no <title>']);
  else if (out.title.length > 65) out.problems.push(['P1', `title ${out.title.length} chars`]);
  if (!out.description) out.problems.push(['P0', 'no meta description']);
  else if (out.description.length > 165) out.problems.push(['P1', `description ${out.description.length} chars`]);
  else if (out.description.length < 70) out.problems.push(['P1', `description only ${out.description.length} chars`]);
  if (!out.h1) out.problems.push(['P1', 'no H1']);
  if (out.kind === 'product') {
    if (!product) out.problems.push(['P0', 'no Product JSON-LD']);
    else if (out.price == null) out.problems.push(['P1', 'offer without price']);
    if (!out.faq) out.problems.push(['P1', 'no FAQPage']);
    if (out.words < 250) out.problems.push(['P1', `thin: ${out.words} words`]);
  }
  return out;
}

async function run() {
  const results = [];
  const queue = [...urls];
  const workers = Array.from({ length: 2 }, async () => {
    while (queue.length) {
      const u = queue.shift();
      results.push(await probe(u));
    }
  });
  await Promise.all(workers);
  results.sort((a, b) => urls.indexOf(a.path) - urls.indexOf(b.path));

  if (json) {
    console.log(JSON.stringify(results, null, 1));
  } else {
    console.log(`# Live audit ${ORIGIN} — ${results.length} URL(s), Googlebot UA\n`);
    console.log('| path | st | robots | T | D | words | LD | price | avail | rating | FAQ | problems |');
    console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const r of results) {
      console.log(`| ${r.path} | ${r.status} | ${r.robots ?? '-'} | ${r.title?.length ?? '-'} | ${r.description?.length ?? '-'} | ${r.words ?? '-'} | ${(r.ldTypes || []).join(',') || '-'} | ${r.price ?? '-'} | ${r.availability ?? '-'} | ${r.rating ?? '-'} | ${r.faq ? 'y' : '-'} | ${r.problems.map(([s, p]) => `${s}: ${p}`).join('; ') || 'ok'} |`);
    }
    console.log('\n## Titles / descriptions\n');
    for (const r of results) {
      if (r.title != null) console.log(`- ${r.path}\n  T: ${r.title}\n  D: ${r.description ?? '(none)'}\n  H1: ${r.h1 || '(none)'}`);
    }
  }
  const p0 = results.flatMap((r) => r.problems.filter(([s]) => s === 'P0').map(([, p]) => `${r.path}: ${p}`));
  if (p0.length) {
    console.error(`\n${p0.length} P0 problem(s):\n${p0.map((x) => `  - ${x}`).join('\n')}`);
    process.exit(1);
  }
}

run();
