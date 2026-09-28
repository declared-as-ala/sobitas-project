import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BLOG_SEO_CONFIG } from '../src/config/blogSeoConfig.ts';
import { commercialSeoMap, protectedByTraffic } from '../src/config/commercialSeoMap.ts';
import { getCmsPageSeoEntry } from '../src/config/cmsPageSeoConfig.ts';
import { sanitizeArticleHtml } from '../src/util/sanitizeArticleHtml.ts';

const require = createRequire(import.meta.url);
const buildRedirects = require('../redirects.js');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const redirects = buildRedirects();
const bySource = new Map(redirects.map((rule) => [rule.source, rule.destination]));

function normalisePath(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const pathname = raw.replace(/^https?:\/\/(?:www\.)?protein\.tn/i, '').split(/[?#]/, 1)[0];
  return pathname.replace(/\/$/, '') || '/';
}

function normaliseKeyword(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function openingLink(entry) {
  const html = entry?.openingLinkHtml?.trim();
  if (!html) return null;
  const match = html.match(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
  if (!match) return null;
  const anchor = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return { href: normalisePath(match[1]), anchor };
}

function htmlLinks(html) {
  if (!html?.trim()) return [];
  const links = [];
  for (const match of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const anchor = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    links.push({ href: normalisePath(match[1]), anchor });
  }
  return links;
}

const expectedRedirects = new Map([
  ['/mass-gainer', '/mass-gainers'],
  ['/mass-gainer-zero-7kg-eric-favre', '/mass-gainers/mass-gainer-zero-7kg-eric-favre'],
  ['/serious-mass-5-45-kg-optimum-nutrition', '/mass-gainers/serious-mass-5-45-kg-optimum-nutrition'],
  ['/serious-mass-5-45kg', '/mass-gainers/serious-mass-5-45-kg-optimum-nutrition'],
  ['/product-category/prise-de-masse/mass-gainer', '/mass-gainers'],
]);

const failures = [];

const sanitizerFixture = sanitizeArticleHtml(
  '<h1>Legacy title</h1><p><a href="https://protein.tn/shop/creatine">old shelf</a> and <a href="/product/example">old product</a>.</p>'
);
if (/<\/?h1\b/i.test(sanitizerFixture)) {
  failures.push('article sanitizer must demote CMS-authored H1 elements');
}
if (/<a\b[^>]*href=["'](?:https?:\/\/(?:www\.)?protein\.tn)?\/(?:shop|product|category)(?:[/?#]|$)/i.test(sanitizerFixture)) {
  failures.push('article sanitizer must remove legacy commerce routes from CMS bodies');
}
for (const [source, destination] of expectedRedirects) {
  const actual = bySource.get(source);
  if (actual !== destination) {
    failures.push(`${source} must resolve to ${destination}, received ${actual ?? 'no redirect'}`);
  }
}

for (const file of ['whey-protein.json', 'proteines.json', 'pre-workout.json']) {
  const content = JSON.parse(readFileSync(join(root, 'content', 'categories', file), 'utf8'));
  const related = Array.isArray(content.relatedCategorySlugs) ? content.relatedCategorySlugs : [];
  if (related.includes('mass-gainer')) {
    failures.push(`${file} links to redirecting /mass-gainer instead of canonical /mass-gainers`);
  }
}

const owners = new Map();
const ownedKeywords = new Map();
const linkSignatures = new Map();
const editorialLinkSignatures = new Map();
const mappedArticleOwners = new Map();
const destructiveActions = new Set(['merge-301', 'noindex', 'canonicalize']);
const priceClaim = /\b\d+(?:[.,]\d+)?\s*(?:dt|tnd|dinars?)\b/i;

for (const [clusterKey, cluster] of Object.entries(commercialSeoMap)) {
  const owner = normalisePath(cluster.owner);
  const priorOwner = owners.get(owner);
  if (priorOwner) {
    failures.push(`${owner} is the owner of both ${priorOwner} and ${clusterKey}`);
  } else {
    owners.set(owner, clusterKey);
  }

  if (cluster.supporting.map(normalisePath).includes(owner)) {
    failures.push(`${clusterKey} lists its owner ${owner} as a supporting URL`);
  }
  for (const keyword of cluster.owns) {
    const normalized = normaliseKeyword(keyword);
    if (!normalized) continue;
    const prior = ownedKeywords.get(normalized);
    if (prior && prior.clusterKey !== clusterKey) {
      failures.push(`normalized keyword "${normalized}" is owned by ${prior.clusterKey} (${prior.owner}) and ${clusterKey} (${owner})`);
    } else {
      ownedKeywords.set(normalized, { clusterKey, owner });
    }
  }

  for (const conflict of cluster.conflicts) {
    const conflictPath = normalisePath(conflict.url);
    if (destructiveActions.has(conflict.action) && protectedByTraffic[conflictPath]) {
      failures.push(`${conflictPath} has measured traffic but ${clusterKey} assigns destructive action ${conflict.action}`);
    }
  }

  const articleUrls = new Set([
    ...cluster.supporting.filter((url) => normalisePath(url).startsWith('/blog/')),
    ...cluster.conflicts.map((conflict) => conflict.url).filter((url) => normalisePath(url).startsWith('/blog/')),
  ]);

  for (const articleUrl of articleUrls) {
    const path = normalisePath(articleUrl);
    const slug = path.slice('/blog/'.length);
    const priorMappedOwner = mappedArticleOwners.get(path);
    if (priorMappedOwner && priorMappedOwner !== owner) {
      failures.push(`${path} is assigned to both ${priorMappedOwner} and ${owner}; choose one commercial owner`);
    } else {
      mappedArticleOwners.set(path, owner);
    }
    const entry = BLOG_SEO_CONFIG[slug];
    if (!entry) {
      failures.push(`${clusterKey} references ${path}, but that article has no BLOG_SEO_CONFIG entry`);
      continue;
    }

    const link = openingLink(entry);
    if (!link) {
      failures.push(`${path} supports ${owner} but has no parseable openingLinkHtml commerce bridge`);
      continue;
    }
    if (link.href !== owner) {
      failures.push(`${path} supports ${owner} but its commerce bridge points to ${link.href}`);
    }
    if (bySource.has(link.href)) {
      failures.push(`${path} commerce bridge points to redirect source ${link.href}; use ${bySource.get(link.href)}`);
    }

    const signature = `${link.href}\u0000${normaliseKeyword(link.anchor)}`;
    const priorSignature = linkSignatures.get(signature);
    if (priorSignature && priorSignature !== path) {
      failures.push(`${path} repeats the same commerce anchor and destination as ${priorSignature}: "${link.anchor}" -> ${link.href}`);
    } else {
      linkSignatures.set(signature, path);
    }
  }

  for (const conflict of cluster.conflicts) {
    const path = normalisePath(conflict.url);
    if (path.startsWith('/blog/') || conflict.action !== 'retarget') continue;
    const cmsEntry = getCmsPageSeoEntry(path);
    if (!cmsEntry) continue;
    if (!cmsEntry.titleOverride || !cmsEntry.headingOverride) {
      failures.push(`${path} is retargeted in ${clusterKey} but lacks a distinct CMS title and H1 override`);
    }
    if (!cmsEntry.commercialLinks.some((link) => normalisePath(link.href) === owner)) {
      failures.push(`${path} is retargeted in ${clusterKey} but does not link to owner ${owner}`);
    }
  }
}

for (const [slug, entry] of Object.entries(BLOG_SEO_CONFIG)) {
  if (entry.openingLinkHtml && entry.bodyLinkHtml) {
    failures.push(`/blog/${slug} defines both openingLinkHtml and bodyLinkHtml; keep one commercial route`);
  }

  const structuredCopy = [
    ['headline', entry.headline],
    ['metaDescription', entry.metaDescription],
    ['bodyOverrideHtml', entry.bodyOverrideHtml?.replace(/<[^>]+>/g, ' ')],
    ...(entry.faqs ?? []).map((faq, index) => [`faq answer ${index + 1}`, faq.answer]),
  ];
  for (const [field, value] of structuredCopy) {
    if (!value) continue;
    if (priceClaim.test(value)) {
      failures.push(`/blog/${slug} ${field} contains a volatile price claim: ${value}`);
    }
    if (/sobitas\.tn/i.test(value)) {
      failures.push(`/blog/${slug} ${field} contains the retired sobitas.tn brand`);
    }
  }

  const links = [
    ...htmlLinks(entry.openingLinkHtml),
    ...htmlLinks(entry.bodyLinkHtml),
    ...(entry.internalLinks ?? []).map((link) => ({
      href: normalisePath(link.href),
      anchor: link.anchor,
    })),
  ];

  const bridge = openingLink(entry);
  if (bridge && owners.has(bridge.href)) {
    const articlePath = `/blog/${slug}`;
    const mappedOwner = mappedArticleOwners.get(articlePath);
    if (!mappedOwner) {
      failures.push(`${articlePath} links to commercial owner ${bridge.href} but is absent from that cluster's supporting/conflict list`);
    } else if (mappedOwner !== bridge.href) {
      failures.push(`${articlePath} links to ${bridge.href} but the ownership map assigns it to ${mappedOwner}`);
    }
  }

  for (const link of links) {
    if (bySource.has(link.href)) {
      failures.push(`/blog/${slug} links to redirect source ${link.href}; use ${bySource.get(link.href)}`);
    }
    const signature = `${link.href}\u0000${normaliseKeyword(link.anchor)}`;
    const prior = editorialLinkSignatures.get(signature);
    if (prior && prior !== `/blog/${slug}`) {
      failures.push(`/blog/${slug} repeats the same editorial anchor and destination as ${prior}: "${link.anchor}" -> ${link.href}`);
    } else {
      editorialLinkSignatures.set(signature, `/blog/${slug}`);
    }
  }
}

if (failures.length) {
  console.error(`check-commercial-intent-map: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `check-commercial-intent-map: ${owners.size} commercial owners, ${ownedKeywords.size} normalized keyword families, ${linkSignatures.size} mapped commerce bridges and ${editorialLinkSignatures.size} editorial links are unambiguous.`
);
