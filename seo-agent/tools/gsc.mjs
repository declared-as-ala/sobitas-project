/**
 * Google Search Console — the daily signal pull for the cloud SEO routine.
 *
 *   node seo-agent/tools/gsc.mjs                 # 28d vs prior 28d, queries + pages + striking distance
 *   node seo-agent/tools/gsc.mjs --days=7        # shorter window
 *   node seo-agent/tools/gsc.mjs --page=/creatine    # queries for one exact URL path
 *   node seo-agent/tools/gsc.mjs --query="creatine tunisie"   # pages ranking for one query (contains)
 *   node seo-agent/tools/gsc.mjs --inspect=/creatine/creatine-monohydrate-300g-ostrovit  # index status
 *
 * Credentials: a Google service-account JSON with Search Console access to `sc-domain:protein.tn`,
 * passed as the environment variable GSC_SERVICE_ACCOUNT_JSON (raw JSON) or
 * GSC_SERVICE_ACCOUNT_JSON_B64 (base64 of it). Without it the script exits 2 and prints how to set
 * it up — the routine then falls back to the CSV exports in `protein.tn/` and live SERP checks.
 * NEVER fabricate GSC numbers: no credential = no numbers.
 *
 * No dependencies: the JWT is signed with node:crypto (RS256), the token exchanged at
 * oauth2.googleapis.com, and the Search Analytics API called with fetch.
 *
 * Output: a markdown summary on stdout, and `seo-agent/data/gsc-latest.json` (compact, overwritten)
 * so the run can grep it again without re-calling the API.
 */
import { createSign } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = process.env.GSC_SITE || 'sc-domain:protein.tn';
const ORIGIN = 'https://protein.tn';
const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, '..', 'data');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  }),
);
const DAYS = Number(args.days || 28);

function loadCredential() {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON
    || (process.env.GSC_SERVICE_ACCOUNT_JSON_B64
      ? Buffer.from(process.env.GSC_SERVICE_ACCOUNT_JSON_B64, 'base64').toString('utf8')
      : '');
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw);
    if (!sa.client_email || !sa.private_key) return null;
    return sa;
  } catch {
    return null;
  }
}

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function accessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const signature = b64url(signer.sign(sa.private_key));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`,
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: HTTP ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

async function searchAnalytics(token, body) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`searchAnalytics failed: HTTP ${res.status} ${await res.text()}`);
  return (await res.json()).rows || [];
}

async function inspect(token, urlPath) {
  const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: ORIGIN + urlPath, siteUrl: SITE }),
  });
  if (!res.ok) throw new Error(`urlInspection failed: HTTP ${res.status} ${await res.text()}`);
  const r = (await res.json()).inspectionResult?.indexStatusResult || {};
  return {
    verdict: r.verdict,
    coverageState: r.coverageState,
    robotsTxtState: r.robotsTxtState,
    indexingState: r.indexingState,
    lastCrawlTime: r.lastCrawlTime,
    googleCanonical: r.googleCanonical,
    userCanonical: r.userCanonical,
  };
}

const fmt = (n, d = 1) => (typeof n === 'number' ? n.toFixed(d) : '-');
const pct = (n) => (typeof n === 'number' ? `${(n * 100).toFixed(1)}%` : '-');

function table(rows, cols) {
  const head = `| ${cols.map((c) => c.h).join(' | ')} |\n| ${cols.map(() => '---').join(' | ')} |`;
  return `${head}\n${rows.map((r) => `| ${cols.map((c) => c.f(r)).join(' | ')} |`).join('\n')}`;
}

async function main() {
  const sa = loadCredential();
  if (!sa) {
    console.log([
      'GSC: no credential (GSC_SERVICE_ACCOUNT_JSON / _B64 not set or invalid).',
      'Set-up (owner, once): Google Cloud → IAM → Service accounts → create → key (JSON);',
      'Search Console → Settings → Users and permissions → add the service-account email (Full);',
      'claude.ai → Code → environment settings → Environment variables → GSC_SERVICE_ACCOUNT_JSON_B64 = base64 of the JSON.',
      'Falling back: use the CSV exports in protein.tn/ and live SERP checks. Do NOT invent numbers.',
    ].join('\n'));
    process.exit(2);
  }

  const token = await accessToken(sa);

  if (args.inspect) {
    const r = await inspect(token, String(args.inspect));
    console.log(`## URL inspection ${args.inspect}\n`);
    for (const [k, v] of Object.entries(r)) console.log(`- ${k}: ${v ?? '-'}`);
    return;
  }

  // GSC data lags ~3 days: end the window 3 days ago so the last days are not artificially low.
  const end = new Date(Date.now() - 3 * 86400e3);
  const start = new Date(end.getTime() - (DAYS - 1) * 86400e3);
  const prevEnd = new Date(start.getTime() - 86400e3);
  const prevStart = new Date(prevEnd.getTime() - (DAYS - 1) * 86400e3);
  const win = { startDate: isoDate(start), endDate: isoDate(end) };
  const prev = { startDate: isoDate(prevStart), endDate: isoDate(prevEnd) };

  if (args.page || args.query) {
    const filters = [];
    if (args.page) filters.push({ dimension: 'page', operator: 'equals', expression: ORIGIN + String(args.page) });
    if (args.query) filters.push({ dimension: 'query', operator: 'contains', expression: String(args.query) });
    const dimension = args.page ? 'query' : 'page';
    const rows = await searchAnalytics(token, {
      ...win, dimensions: [dimension], dimensionFilterGroups: [{ filters }], rowLimit: 100,
    });
    console.log(`## ${dimension === 'query' ? `Queries for ${args.page}` : `Pages for "${args.query}"`} (${win.startDate} → ${win.endDate})\n`);
    console.log(table(rows, [
      { h: dimension, f: (r) => r.keys[0].replace(ORIGIN, '') },
      { h: 'clicks', f: (r) => r.clicks },
      { h: 'impr', f: (r) => r.impressions },
      { h: 'ctr', f: (r) => pct(r.ctr) },
      { h: 'pos', f: (r) => fmt(r.position) },
    ]));
    return;
  }

  const [totals, prevTotals, queries, prevQueries, pages, prevPages, queryPages] = await Promise.all([
    searchAnalytics(token, { ...win, dimensions: [], rowLimit: 1 }),
    searchAnalytics(token, { ...prev, dimensions: [], rowLimit: 1 }),
    searchAnalytics(token, { ...win, dimensions: ['query'], rowLimit: 500 }),
    searchAnalytics(token, { ...prev, dimensions: ['query'], rowLimit: 500 }),
    searchAnalytics(token, { ...win, dimensions: ['page'], rowLimit: 300 }),
    searchAnalytics(token, { ...prev, dimensions: ['page'], rowLimit: 300 }),
    searchAnalytics(token, { ...win, dimensions: ['query', 'page'], rowLimit: 2000 }),
  ]);

  const t = totals[0] || {};
  const p = prevTotals[0] || {};
  const prevQ = new Map(prevQueries.map((r) => [r.keys[0], r]));
  const prevP = new Map(prevPages.map((r) => [r.keys[0], r]));

  const striking = queries
    .filter((r) => r.position >= 4 && r.position <= 20 && r.impressions >= 20)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 40);
  const zeroClick = queries
    .filter((r) => r.position <= 10 && r.impressions >= 30 && r.ctr < 0.02)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 25);
  const rising = queries
    .map((r) => ({ ...r, prevImpr: prevQ.get(r.keys[0])?.impressions ?? 0 }))
    .filter((r) => r.impressions >= 15 && r.impressions >= r.prevImpr * 1.5)
    .sort((a, b) => (b.impressions - b.prevImpr) - (a.impressions - a.prevImpr))
    .slice(0, 25);
  const losing = pages
    .map((r) => ({ ...r, prevClicks: prevP.get(r.keys[0])?.clicks ?? 0 }))
    .filter((r) => r.prevClicks >= 5 && r.clicks < r.prevClicks * 0.6)
    .sort((a, b) => (b.prevClicks - b.clicks) - (a.prevClicks - a.clicks))
    .slice(0, 25);

  // Cannibalisation: one query, several pages each with real impressions.
  const byQuery = new Map();
  for (const r of queryPages) {
    if (!byQuery.has(r.keys[0])) byQuery.set(r.keys[0], []);
    byQuery.get(r.keys[0]).push(r);
  }
  const split = [...byQuery.entries()]
    .map(([q, rs]) => ({ q, rs: rs.filter((r) => r.impressions >= 10).sort((a, b) => b.impressions - a.impressions) }))
    .filter((x) => x.rs.length >= 2 && x.rs.reduce((s, r) => s + r.impressions, 0) >= 40)
    .sort((a, b) => b.rs.reduce((s, r) => s + r.impressions, 0) - a.rs.reduce((s, r) => s + r.impressions, 0))
    .slice(0, 20);

  const out = [];
  out.push(`# GSC ${SITE} — ${win.startDate} → ${win.endDate} (vs ${prev.startDate} → ${prev.endDate})\n`);
  out.push(`Totals: **${t.clicks ?? 0} clicks** (prev ${p.clicks ?? 0}) · **${t.impressions ?? 0} impr** (prev ${p.impressions ?? 0}) · CTR ${pct(t.ctr)} (prev ${pct(p.ctr)}) · pos ${fmt(t.position)} (prev ${fmt(p.position)})\n`);

  out.push('## Striking distance (pos 4–20, ≥20 impr) — the daily hunting ground\n');
  out.push(table(striking, [
    { h: 'query', f: (r) => r.keys[0] },
    { h: 'impr', f: (r) => r.impressions },
    { h: 'clicks', f: (r) => r.clicks },
    { h: 'ctr', f: (r) => pct(r.ctr) },
    { h: 'pos', f: (r) => fmt(r.position) },
    { h: 'prev pos', f: (r) => fmt(prevQ.get(r.keys[0])?.position) },
  ]));

  out.push('\n## Page-one, zero-click (pos ≤10, ≥30 impr, CTR <2%) — title/description work\n');
  out.push(table(zeroClick, [
    { h: 'query', f: (r) => r.keys[0] },
    { h: 'impr', f: (r) => r.impressions },
    { h: 'ctr', f: (r) => pct(r.ctr) },
    { h: 'pos', f: (r) => fmt(r.position) },
  ]));

  out.push('\n## Rising queries (≥1.5× impressions vs prior window)\n');
  out.push(table(rising, [
    { h: 'query', f: (r) => r.keys[0] },
    { h: 'impr', f: (r) => r.impressions },
    { h: 'prev', f: (r) => r.prevImpr },
    { h: 'pos', f: (r) => fmt(r.position) },
  ]));

  out.push('\n## Pages losing clicks (<60% of prior window)\n');
  out.push(table(losing, [
    { h: 'page', f: (r) => r.keys[0].replace(ORIGIN, '') },
    { h: 'clicks', f: (r) => r.clicks },
    { h: 'prev', f: (r) => r.prevClicks },
    { h: 'pos', f: (r) => fmt(r.position) },
  ]));

  out.push('\n## Split queries (one query, ≥2 pages) — cannibalisation candidates\n');
  for (const x of split) {
    out.push(`- **${x.q}** → ${x.rs.map((r) => `${r.keys[0].replace(ORIGIN, '')} (${r.impressions} impr, pos ${fmt(r.position)})`).join(' · ')}`);
  }

  out.push('\n## Top pages\n');
  out.push(table(pages.slice(0, 25), [
    { h: 'page', f: (r) => r.keys[0].replace(ORIGIN, '') },
    { h: 'clicks', f: (r) => r.clicks },
    { h: 'impr', f: (r) => r.impressions },
    { h: 'ctr', f: (r) => pct(r.ctr) },
    { h: 'pos', f: (r) => fmt(r.position) },
  ]));

  console.log(out.join('\n'));

  mkdirSync(dataDir, { recursive: true });
  const compact = (rows) => rows.map((r) => ({ k: r.keys, c: r.clicks, i: r.impressions, ctr: +r.ctr.toFixed(4), p: +r.position.toFixed(1) }));
  writeFileSync(path.join(dataDir, 'gsc-latest.json'), JSON.stringify({
    site: SITE, window: win, prev, totals: t, prevTotals: p,
    queries: compact(queries), pages: compact(pages), queryPages: compact(queryPages.filter((r) => r.impressions >= 5)),
  }));
  console.log(`\n(saved seo-agent/data/gsc-latest.json — ${queries.length} queries, ${pages.length} pages)`);
}

main().catch((e) => {
  console.error(`GSC error: ${e.message}`);
  process.exit(1);
});
