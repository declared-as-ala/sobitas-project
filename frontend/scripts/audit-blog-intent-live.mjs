import { BLOG_SEO_CONFIG } from '../src/config/blogSeoConfig.ts';
import { commercialSeoMap } from '../src/config/commercialSeoMap.ts';
import { sanitizeArticleHtml } from '../src/util/sanitizeArticleHtml.ts';

const API_ORIGIN = (process.env.API_BACKEND_URL || 'https://admin.protein.tn/api').replace(/\/$/, '');
const STRICT = process.argv.includes('--strict');
const JSON_OUTPUT = process.argv.includes('--json');
const DISCOVER = process.argv.includes('--discover');

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlToText(value) {
  return String(value ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|#160|#x0*a0);/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesCount(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let offset = 0;
  while ((offset = haystack.indexOf(needle, offset)) !== -1) {
    count += 1;
    offset += needle.length;
  }
  return count;
}

function extractHeadings(html) {
  return [...String(html ?? '').matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((match) => ({
    level: Number(match[1]),
    text: htmlToText(match[2]),
  }));
}

function analyseBody(html, ownedKeywords) {
  const text = htmlToText(html);
  const normalizedText = normalizeText(text);
  const headings = extractHeadings(html);
  const normalizedHeadings = headings.map((heading) => normalizeText(heading.text));
  const keywordHits = ownedKeywords
    .map((keyword) => ({ keyword, count: matchesCount(normalizedText, normalizeText(keyword)) }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
  const headingHits = ownedKeywords
    .flatMap((keyword) => normalizedHeadings
      .map((heading, index) => ({ keyword, heading: headings[index]?.text ?? '' }))
      .filter(({ heading }) => normalizeText(heading).includes(normalizeText(keyword))))
    .filter((entry, index, values) =>
      values.findIndex((candidate) => candidate.keyword === entry.keyword && candidate.heading === entry.heading) === index
    );
  const priceClaims = [...text.matchAll(/\b\d+(?:[.,]\d+)?\s*(?:dt|tnd|dinars?)\b/gi)].map((match) => match[0]);
  const transactionalPhrases = [
    /\bacheter\b/gi,
    /\bcommandez?\b/gi,
    /\bmeilleur(?:e)?s? prix\b/gi,
    /\bprix imbattables?\b/gi,
    /\boffres?\b/gi,
    /\blivraison gratuite\b/gi,
    /\ben stock\b/gi,
    /\bpromotion(?:s)?\b/gi,
  ].flatMap((pattern) => [...text.matchAll(pattern)].map((match) => match[0].toLowerCase()));
  const obsoleteLinks = [...String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((href) => /^https?:\/\/(?:www\.)?protein\.tn/i.test(href) || /^\/(?:shop|product)(?:\/|$)/i.test(href));
  const h1Count = headings.filter((heading) => heading.level === 1).length;
  const totalOwnedKeywordHits = keywordHits.reduce((sum, entry) => sum + entry.count, 0);
  const score =
    Math.min(totalOwnedKeywordHits, 8) +
    headingHits.length * 4 +
    Math.min(priceClaims.length, 4) * 2 +
    Math.min(transactionalPhrases.length, 6) +
    obsoleteLinks.length * 2 +
    h1Count * 3;

  return {
    score,
    wordCount: text ? text.split(/\s+/).length : 0,
    keywordHits,
    headingHits,
    priceClaims: [...new Set(priceClaims)],
    transactionalPhrases: [...new Set(transactionalPhrases)],
    obsoleteLinks: [...new Set(obsoleteLinks)],
    h1Count,
  };
}

async function fetchArticle(slug) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${API_ORIGIN}/article_details/${encodeURIComponent(slug)}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'ProteinTN-SEO-Audit/1.0' },
    });
    if (response.ok) return response.json();
    if (![429, 502, 503, 504].includes(response.status) || attempt === 3) {
      throw new Error(`HTTP ${response.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
  }
  throw new Error('unreachable');
}

async function fetchAllArticles() {
  const articles = [];
  for (let page = 1; page <= 10; page += 1) {
    const response = await fetch(`${API_ORIGIN}/all_articles?per_page=100&page=${page}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'ProteinTN-SEO-Audit/1.0' },
    });
    if (!response.ok) throw new Error(`all_articles page ${page}: HTTP ${response.status}`);
    const payload = await response.json();
    const rows = Array.isArray(payload)
      ? payload
      : (Array.isArray(payload?.data) ? payload.data : (payload?.articles || []));
    articles.push(...rows);
    if (Array.isArray(payload) || rows.length < 100) break;
    const lastPage = Number(payload?.meta?.last_page ?? 0);
    if (!Number.isFinite(lastPage) || page >= lastPage) break;
  }
  return articles;
}

const assignments = new Map();
for (const [clusterKey, cluster] of Object.entries(commercialSeoMap)) {
  const articleUrls = new Set([
    ...cluster.supporting.filter((url) => url.startsWith('/blog/')),
    ...cluster.conflicts.map((conflict) => conflict.url).filter((url) => url.startsWith('/blog/')),
  ]);
  for (const url of articleUrls) {
    assignments.set(url, { clusterKey, owner: cluster.owner, ownedKeywords: cluster.owns });
  }
}

const results = [];
for (const [url, assignment] of assignments) {
  const slug = decodeURIComponent(url.slice('/blog/'.length));
  const overlay = BLOG_SEO_CONFIG[slug] ?? BLOG_SEO_CONFIG[slug.normalize('NFC').toLowerCase()];
  try {
    const article = await fetchArticle(slug);
    const sourceHtml = article.description_fr || article.description || '';
    const effectiveHtml = sanitizeArticleHtml(overlay?.bodyOverrideHtml?.trim() || sourceHtml);
    results.push({
      url,
      cluster: assignment.clusterKey,
      owner: assignment.owner,
      hasOverride: Boolean(overlay?.bodyOverrideHtml?.trim()),
      source: analyseBody(sourceHtml, assignment.ownedKeywords),
      effective: analyseBody(effectiveHtml, assignment.ownedKeywords),
    });
  } catch (error) {
    results.push({ url, cluster: assignment.clusterKey, owner: assignment.owner, error: error.message });
  }
}

results.sort((a, b) => (b.effective?.score ?? -1) - (a.effective?.score ?? -1));

if (JSON_OUTPUT) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log(`Live blog intent audit: ${results.length} mapped article(s) against ${API_ORIGIN}`);
  console.log('Score weights commercial-keyword headings, repeated owner terms, stale prices, transactional phrases, obsolete links and body H1s.');
  for (const result of results) {
    if (result.error) {
      console.log(`ERROR  ${result.url} (${result.error})`);
      continue;
    }
    const detail = result.effective;
    const sourceSuffix = result.hasOverride ? ` source=${result.source.score}` : '';
    console.log(
      `${String(detail.score).padStart(2, ' ')}  ${result.url} -> ${result.owner}${sourceSuffix}`
    );
    if (detail.score >= 8) {
      const flags = [];
      if (detail.headingHits.length) flags.push(`headings=${detail.headingHits.map((item) => item.heading).join(' | ')}`);
      if (detail.keywordHits.length) flags.push(`keywords=${detail.keywordHits.map((item) => `${item.keyword}:${item.count}`).join(', ')}`);
      if (detail.priceClaims.length) flags.push(`prices=${detail.priceClaims.join(', ')}`);
      if (detail.transactionalPhrases.length) flags.push(`sales=${detail.transactionalPhrases.join(', ')}`);
      if (detail.obsoleteLinks.length) flags.push(`links=${detail.obsoleteLinks.join(', ')}`);
      if (detail.h1Count) flags.push(`bodyH1=${detail.h1Count}`);
      console.log(`    ${flags.join(' ; ')}`);
    }
  }
}

const fetchErrors = results.filter((result) => result.error);
const highRisk = results.filter((result) => (result.effective?.score ?? 0) >= 12);
console.log(`Summary: ${fetchErrors.length} fetch error(s), ${highRisk.length} high-risk effective body/bodies (score >= 12).`);

let discoveries = [];
if (DISCOVER) {
  const allArticles = await fetchAllArticles();
  const clusters = Object.entries(commercialSeoMap);
  discoveries = allArticles
    .filter((article) => article?.slug && !assignments.has(`/blog/${article.slug}`))
    .map((article) => {
      const slug = String(article.slug).normalize('NFC').toLowerCase();
      const overlay = BLOG_SEO_CONFIG[slug];
      const body = sanitizeArticleHtml(
        overlay?.bodyOverrideHtml?.trim() || article.description_fr || article.description || ''
      );
      const title = overlay?.headline || article.designation_fr || '';
      const normalizedTitle = normalizeText(title);
      const candidates = clusters.map(([clusterKey, cluster]) => {
        const analysis = analyseBody(body, cluster.owns);
        const titleHits = cluster.owns.filter((keyword) => normalizedTitle.includes(normalizeText(keyword)));
        return {
          cluster: clusterKey,
          owner: cluster.owner,
          title,
          titleHits,
          analysis,
          score: analysis.score + titleHits.length * 8,
        };
      });
      candidates.sort((a, b) => b.score - a.score);
      return { url: `/blog/${article.slug}`, ...candidates[0] };
    })
    .filter((candidate) => candidate.score >= 8)
    .sort((a, b) => b.score - a.score);

  console.log(`Discovery: scanned ${allArticles.length} live article(s); ${discoveries.length} unmapped commercial-intent candidate(s).`);
  for (const item of discoveries) {
    console.log(`${String(item.score).padStart(2, ' ')}  ${item.url} -> ${item.owner}`);
    console.log(`    title=${item.title}`);
    if (item.titleHits.length) console.log(`    title keywords=${item.titleHits.join(', ')}`);
    if (item.analysis.headingHits.length) {
      console.log(`    headings=${item.analysis.headingHits.map((entry) => entry.heading).join(' | ')}`);
    }
    if (item.analysis.priceClaims.length) console.log(`    prices=${item.analysis.priceClaims.join(', ')}`);
    if (item.analysis.transactionalPhrases.length) {
      console.log(`    sales=${item.analysis.transactionalPhrases.join(', ')}`);
    }
  }
}

if (STRICT && (fetchErrors.length || highRisk.length || discoveries.length)) process.exit(1);
