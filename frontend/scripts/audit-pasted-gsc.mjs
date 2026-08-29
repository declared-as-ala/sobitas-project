/**
 * Probe the exact example URLs copied from Google Search Console's Page Indexing drill-down.
 *
 * Usage:
 *   node scripts/audit-pasted-gsc.mjs <404-paste.txt> <redirect-paste.txt>
 *
 * The pasted reports are snapshots: their labels describe what Google saw on the report's crawl
 * date, not necessarily what production returns today. This utility follows each URL manually and
 * classifies the current chain so a later deployment is not "fixed" from stale evidence.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const inputs = process.argv.slice(2);
if (inputs.length === 0) {
  console.error('usage: node scripts/audit-pasted-gsc.mjs <gsc-paste.txt> [...]');
  process.exit(2);
}

const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY || 2));
const LIMIT = Math.max(0, Number(process.env.LIMIT || 0));
const OUTPUT = process.env.OUTPUT || 'gsc-pasted-live-report.json';
const UA =
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const HUBS = new Set(['/', '/shop', '/blog', '/brands', '/marques', '/categories']);

function normalizePath(value) {
  try {
    const url = new URL(value);
    const pathname = url.pathname !== '/' ? url.pathname.replace(/\/+$/, '') : '/';
    return `${pathname}${url.search}`;
  } catch {
    return value;
  }
}

function readTargets(filename) {
  const text = readFileSync(filename, 'utf8');
  const issue = /Not found \(404\)/i.test(text)
    ? 'Not found (404)'
    : /Page with redirect/i.test(text)
      ? 'Page with redirect'
      : filename;
  const urls = [...text.matchAll(/https:\/\/[^\s]+/g)].map((match) => match[0]);
  return urls.map((url) => ({ url, issue }));
}

async function probe(url) {
  let current = url;
  const chain = [];
  const seen = new Set([url]);

  for (let hop = 0; hop <= 6; hop += 1) {
    let response;
    try {
      response = await fetch(current, {
        headers: { 'user-agent': UA },
        redirect: 'manual',
        signal: AbortSignal.timeout(45_000),
      });
    } catch (error) {
      return { status: 0, verdict: 'ERROR', chain, note: String(error?.message || error) };
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')?.split(', ')[0];
      if (!location) return { status: response.status, verdict: 'DEAD', chain, note: 'redirect without location' };
      const next = new URL(location, current).toString();
      chain.push(next);
      if (seen.has(next)) return { status: response.status, verdict: 'LOOP', chain };
      seen.add(next);
      current = next;
      continue;
    }

    const finalPath = normalizePath(current);
    if (response.status === 404) return { status: 404, verdict: 'DEAD', chain, final: finalPath };
    if (response.status === 410) return { status: 410, verdict: 'GONE', chain, final: finalPath };
    if (response.status >= 500 || response.status === 0) {
      return { status: response.status, verdict: 'ERROR', chain, final: finalPath };
    }

    if (response.status === 200 && chain.length > 0) {
      const source = new URL(url);
      const sourcePath = source.pathname !== '/' ? source.pathname.replace(/\/+$/, '') : '/';
      const final = new URL(current);
      const finalPlainPath = final.pathname !== '/' ? final.pathname.replace(/\/+$/, '') : '/';
      const carriedPayload = sourcePath.split('/').filter(Boolean).length >= 2;
      const keptPayload = Boolean(final.search);
      if (HUBS.has(finalPlainPath) && sourcePath !== finalPlainPath && carriedPayload && !keptPayload) {
        return { status: 200, verdict: 'SOFT', chain, final: finalPath };
      }
    }

    if (chain.length >= 3) return { status: response.status, verdict: 'CHAIN', chain, final: finalPath };
    return { status: response.status, verdict: 'OK', chain, final: finalPath };
  }

  return { status: 0, verdict: 'LOOP', chain, note: 'redirect hop cap exceeded' };
}

async function mapLimit(items, width, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  let completed = 0;
  const workers = Array.from({ length: Math.min(width, items.length) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index]);
      completed += 1;
      if (completed % 50 === 0) process.stderr.write(`  ${completed}/${items.length}\n`);
    }
  });
  await Promise.all(workers);
  return results;
}

const deduped = new Map();
for (const input of inputs) {
  for (const target of readTargets(input)) {
    if (!deduped.has(target.url)) deduped.set(target.url, target);
  }
}
let targets = [...deduped.values()];
if (LIMIT) targets = targets.slice(0, LIMIT);

console.log(`Probing ${targets.length} Search Console sample URL(s), concurrency ${CONCURRENCY}`);
const rows = await mapLimit(targets, CONCURRENCY, async (target) => ({
  ...target,
  path: normalizePath(target.url),
  ...(await probe(target.url)),
}));

const verdicts = Object.groupBy(rows, (row) => row.verdict);
console.log('\nCurrent production verdicts');
for (const [verdict, list] of Object.entries(verdicts).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${verdict.padEnd(6)} ${String(list.length).padStart(4)}`);
}

const broken = rows.filter((row) => ['DEAD', 'SOFT', 'CHAIN', 'LOOP', 'ERROR'].includes(row.verdict));
const groups = Object.groupBy(broken, (row) => `/${row.path.split('?')[0].split('/').filter(Boolean)[0] || ''} ${row.verdict}`);
console.log('\nNeeds work by URL family');
for (const [group, list] of Object.entries(groups).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${String(list.length).padStart(4)}  ${group}`);
  for (const row of list.slice(0, 4)) console.log(`        ${row.path} -> ${row.final || '—'} (${row.status})`);
}

writeFileSync(OUTPUT, `${JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2)}\n`);
console.log(`\nWrote ${OUTPUT}`);

