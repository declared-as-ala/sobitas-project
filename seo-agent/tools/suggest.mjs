/**
 * Keyword discovery — what Tunisians actually type, from Google's own autocomplete (hl=fr, gl=tn).
 *
 *   node seo-agent/tools/suggest.mjs                       # seeds = the head terms in KEYWORDS.md
 *   node seo-agent/tools/suggest.mjs creatine "whey protein" gainer
 *   node seo-agent/tools/suggest.mjs --deep creatine       # + a–z / 0–9 expansions (≈40 requests)
 *
 * For each seed it asks for: "<seed>", "<seed> tunisie", "<seed> prix", "prix <seed>", "<seed> tunis",
 * "acheter <seed>", "meilleur <seed>" and (with --deep) "<seed> a" … "<seed> z" / "0-9". Suggestions
 * are deduped, tagged by intent (commercial: prix / acheter / tunisie / livraison / promo /
 * pharmacie · informational: comment / bienfaits / danger / effet / c'est quoi / avis …) and mapped
 * to the category slug whose name they contain, so the run can see which page should own them.
 *
 * Autocomplete is not volume — it is popularity-ranked, which is exactly the signal a keyword map
 * needs on a market with no reliable volume tool. Never write a position from this file; it tells
 * you WHAT people search, GSC / a SERP look tells you WHERE we are.
 *
 * Output: markdown on stdout + seo-agent/data/suggest-latest.json (overwritten).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, '..', 'data');
const argv = process.argv.slice(2);
const deep = argv.includes('--deep');
let seeds = argv.filter((a) => !a.startsWith('--'));

if (seeds.length === 0) {
  // Head terms of KEYWORDS.md, stripped of "tunisie" so the expansions add it themselves.
  const km = existsSync(path.resolve(here, '..', 'KEYWORDS.md')) ? readFileSync(path.resolve(here, '..', 'KEYWORDS.md'), 'utf8') : '';
  const rows = km.split('\n').filter((l) => /^\| [a-z0-9]/i.test(l) && !/^\| query/i.test(l));
  seeds = [...new Set(rows.map((l) => l.split('|')[1].trim().replace(/\btunisie\b/gi, '').replace(/\s+/g, ' ').trim()).filter(Boolean))].slice(0, 12);
  if (seeds.length === 0) seeds = ['creatine', 'whey protein', 'proteine', 'mass gainer', 'pre workout', 'bruleur de graisse', 'bcaa', 'omega 3'];
}

const CATEGORY_HINTS = [
  ['whey isolate', '/whey-isolate'], ['isolate', '/whey-isolate'], ['whey', '/whey-proteine'],
  ['creatine', '/creatine'], ['créatine', '/creatine'], ['gainer', '/mass-gainers'], ['prise de masse', '/prise-de-masse'],
  ['pre workout', '/pre-workout'], ['pré workout', '/pre-workout'], ['preworkout', '/pre-workout'],
  ['bruleur', '/bruleurs-de-graisse'], ['brûleur', '/bruleurs-de-graisse'], ['fat burner', '/bruleurs-de-graisse'],
  ['bcaa', '/bcaa'], ['omega', '/omega-3'], ['barre', '/barres-proteinees'], ['protein bar', '/barres-proteinees'],
  ['vitamine', '/vitamines'], ['multivitamine', '/vitamines'], ['collagene', '/collagene'], ['collagène', '/collagene'],
  ['caseine', '/caseine'], ['caséine', '/caseine'], ['glutamine', '/glutamine'], ['proteine', '/proteines'], ['protéine', '/proteines'],
];
const COMMERCIAL = /\b(prix|acheter|achat|tunisie|tunis|sousse|sfax|livraison|promo|pas cher|meilleur|pharmacie|magasin|boutique|vente|en ligne|kg|g\b|500g|300g|1kg|2kg)\b/i;
const INFO = /\b(comment|bienfaits|danger|effet|effets|c'est quoi|quoi|avis|dosage|quand|pourquoi|utilis|prendre|combien|avant|apres|après|musculation)\b/i;

async function suggest(q) {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=fr&gl=tn&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0', 'accept-language': 'fr-TN,fr;q=0.9' } });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.[1]) ? json[1].map(String) : [];
  } catch {
    return [];
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const found = new Map(); // suggestion -> { seeds:Set, firstRank }
  const queries = [];
  for (const s of seeds) {
    queries.push(s, `${s} tunisie`, `${s} prix`, `prix ${s}`, `${s} tunis`, `acheter ${s}`, `meilleur ${s}`);
    if (deep) for (const c of 'abcdefghijklmnopqrstuvwxyz0123456789') queries.push(`${s} ${c}`);
  }
  let n = 0;
  for (const q of queries) {
    const list = await suggest(q);
    list.forEach((sug, i) => {
      const key = sug.toLowerCase().trim();
      if (!found.has(key)) found.set(key, { seeds: new Set(), rank: i + 1, hits: 0 });
      const e = found.get(key);
      e.seeds.add(q);
      e.hits += 1;
      e.rank = Math.min(e.rank, i + 1);
    });
    n += 1;
    await sleep(180);
  }

  const rows = [...found.entries()].map(([kw, e]) => ({
    keyword: kw,
    hits: e.hits,
    bestRank: e.rank,
    intent: COMMERCIAL.test(kw) ? 'commercial' : INFO.test(kw) ? 'informational' : 'navigational/other',
    page: (CATEGORY_HINTS.find(([h]) => kw.includes(h)) || [null, '?'])[1],
    seeds: [...e.seeds].slice(0, 3),
  })).sort((a, b) => b.hits - a.hits || a.bestRank - b.bestRank);

  console.log(`# Google autocomplete (fr, gl=tn) — ${seeds.length} seed(s), ${n} requests, ${rows.length} unique suggestions\n`);
  console.log('| keyword | hits | best rank | intent | page |');
  console.log('| --- | --- | --- | --- | --- |');
  for (const r of rows.slice(0, 120)) console.log(`| ${r.keyword} | ${r.hits} | ${r.bestRank} | ${r.intent} | ${r.page} |`);

  const commercial = rows.filter((r) => r.intent === 'commercial');
  console.log(`\n## Commercial candidates not yet in KEYWORDS.md\n`);
  const km = existsSync(path.resolve(here, '..', 'KEYWORDS.md')) ? readFileSync(path.resolve(here, '..', 'KEYWORDS.md'), 'utf8').toLowerCase() : '';
  for (const r of commercial.filter((r) => !km.includes(`| ${r.keyword} |`)).slice(0, 40)) console.log(`- ${r.keyword} → ${r.page} (${r.hits} hits)`);

  mkdirSync(dataDir, { recursive: true });
  writeFileSync(path.join(dataDir, 'suggest-latest.json'), JSON.stringify({ date: new Date().toISOString().slice(0, 10), seeds, rows }, null, 0));
  console.log(`\n(saved seo-agent/data/suggest-latest.json)`);
}

main();
