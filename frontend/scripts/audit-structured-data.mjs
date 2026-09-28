#!/usr/bin/env node
// Live Googlebot audit. Google feature rules:
// https://developers.google.com/search/docs/appearance/structured-data/product-snippet
// https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
// https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
// https://developers.google.com/search/docs/appearance/structured-data/article
// https://developers.google.com/search/docs/appearance/structured-data/organization
// https://developers.google.com/search/docs/appearance/structured-data/faqpage
const USER_AGENT = 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const SAMPLE = [
  '/', '/creatine', '/whey-proteine', '/proteines', '/optimum-nutrition', '/now-foods',
  '/blog', '/blog/whey-protein-en-tunisie', '/blog/omega-3-tunisie',
  '/mass-gainers/serious-mass-5-45-kg-optimum-nutrition',
  '/whey-proteine/100-whey-gold-standard-2-27kg',
  '/acides-amines/now-foods-l-lysine-100-comprimes',
  '/bcaa/bcaa-8-1-1-400g-real-pharm', '/qui-sommes-nous',
];
const AVAILABILITY = new Set('BackOrder Discontinued InStock InStoreOnly LimitedAvailability OnlineOnly OutOfStock PreOrder PreSale SoldOut'.split(' ').map((x) => `https://schema.org/${x}`));
const CURRENCIES = new Set(Intl.supportedValuesOf('currency'));
const asArray = (value) => value == null ? [] : Array.isArray(value) ? value : [value];
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const typeNames = (node) => asArray(node?.['@type']).filter(nonempty).map((type) => type.split(/[/#:]/).pop());
const hasType = (node, type) => typeNames(node).includes(type);
const number = (value) => (typeof value === 'number' || typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value.trim())) && Number.isFinite(Number(value)) ? Number(value) : NaN;

function absoluteUrl(value) {
  if (!nonempty(value) || /\s/.test(value)) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname && !url.username && !url.password ? url : null;
  } catch { return null; }
}

function urlOf(value) {
  if (typeof value === 'string') return value;
  return isObject(value) ? value.url ?? value.contentUrl ?? value['@id'] : undefined;
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isoDateTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value)) return false;
  if (!validDate(value.slice(0, 10))) return false;
  return Number.isFinite(Date.parse(value));
}

// GS1 check digit: alternating weights 3/1 from the right, excluding the check digit.
function validGtin(value, length) {
  if (typeof value !== 'string' || !/^\d+$/.test(value) || !(length ? [length] : [8, 12, 13, 14]).includes(value.length)) return false;
  const digits = [...value].map(Number);
  const check = digits.pop();
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 ? 1 : 3), 0);
  return (10 - sum % 10) % 10 === check;
}

function decodeEntities(value) {
  return String(value ?? '').replace(/&(#(?:x[\da-f]+|\d+)|amp|lt|gt|quot|apos|nbsp|rsquo|lsquo|eacute|egrave|agrave|ccedil);/gi, (_, entity) => {
    const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç' };
    if (!entity.startsWith('#')) return named[entity.toLowerCase()] ?? `&${entity};`;
    const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : `&${entity};`;
  });
}

function visibleText(html) {
  return decodeEntities(html.replace(/<(head|script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[^]*?-->/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function normalText(value) {
  return decodeEntities(value).normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? decodeEntities(match[1] ?? match[2] ?? match[3]) : undefined;
}

function pageMetadata(html) {
  const canonicalTag = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0])
    .find((tag) => attribute(tag, 'rel')?.toLowerCase().split(/\s+/).includes('canonical'));
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/i);
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
  return {
    canonical: canonicalTag ? attribute(canonicalTag, 'href') : undefined,
    h1: h1 ? visibleText(h1[1]) : '',
    title: title ? visibleText(title[1]) : '',
    text: normalText(visibleText(html)),
  };
}

function jsonLdBlocks(html, finding) {
  const roots = [];
  let blocks = 0;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (!/^application\/ld\+json(?:\s*;|$)/i.test(attribute(match[1], 'type')?.trim() ?? '')) continue;
    blocks += 1;
    try {
      const parsed = JSON.parse(match[2].trim());
      if (parsed === null || typeof parsed !== 'object') finding('ERROR', 'JSON-LD', `block[${blocks}]`, 'top-level JSON-LD must be an object or array');
      else roots.push(parsed);
    } catch (error) {
      finding('ERROR', 'JSON-LD', `block[${blocks}]`, `unparseable JSON: ${error.message}`);
    }
  }
  if (!blocks) finding('ERROR', 'JSON-LD', 'scripts', 'no application/ld+json scripts in the fetched HTML');
  return roots;
}

function collectNodes(roots) {
  const nodes = [];
  const objects = [];
  function visit(value) {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!isObject(value)) return;
    objects.push(value);
    if (value['@type']) nodes.push(value);
    for (const child of Object.values(value)) visit(child);
  }
  visit(roots);
  return { nodes, objects };
}

function auditPage(html, pageUrl, finding) {
  const meta = pageMetadata(html);
  const roots = jsonLdBlocks(html, finding);
  const { nodes, objects } = collectNodes(roots);
  const host = new URL(pageUrl).hostname;
  const canonical = absoluteUrl(meta.canonical);
  if (!canonical) finding('ERROR', 'Page', 'canonical', 'missing or non-absolute rel=canonical URL');
  const definitions = new Map();
  for (const node of objects) {
    if (nonempty(node['@id']) && Object.keys(node).some((key) => key !== '@id' && key !== '@context')) {
      const prior = definitions.get(node['@id']);
      if (prior && typeNames(prior).slice().sort().join('|') !== typeNames(node).slice().sort().join('|')) {
        finding('ERROR', 'Global', '@id', `${node['@id']} has conflicting @type sets (${typeNames(prior).join(', ')} vs ${typeNames(node).join(', ')})`);
      }
      definitions.set(node['@id'], node);
    }
  }
  const dereference = (value) => isObject(value) && Object.keys(value).every((key) => key === '@id' || key === '@context')
    ? definitions.get(value['@id']) ?? value : value;
  const entries = (value) => asArray(value).map(dereference);
  const imageUrls = (value) => asArray(value).flatMap((item) => {
    const image = dereference(item);
    if (typeof image === 'string') return [image];
    if (!isObject(image)) return [undefined];
    return [image.url, image.contentUrl].filter((url) => url != null).length
      ? [image.url, image.contentUrl].filter((url) => url != null)
      : [image['@id']];
  });
  const checkImage = (value, type, field) => {
    const urls = imageUrls(value);
    if (!urls.length || urls.some((url) => !absoluteUrl(url))) finding('ERROR', type, field, 'provide absolute image URL(s)');
  };

  // Google merchant listings require an Offer price/currency and Product image; shipping and returns
  // enrich merchant listings. Product snippets use the same Product entity.
  const products = nodes.filter((node) => hasType(node, 'Product'));
  const productClaims = new Map();
  for (const [index, product] of products.entries()) {
    const label = `Product[${index + 1}]`;
    if (!nonempty(product.name)) finding('ERROR', label, 'name', 'missing non-empty product name');
    checkImage(product.image, label, 'image');
    if (!nonempty(dereference(product.brand)?.name)) finding('ERROR', label, 'brand.name', 'missing brand name');
    const identifiers = ['gtin', 'gtin8', 'gtin12', 'gtin13', 'gtin14'];
    for (const key of identifiers) if (product[key] != null && !validGtin(product[key], key === 'gtin' ? null : Number(key.slice(4)))) {
      finding('ERROR', label, key, 'invalid GTIN digits, length, or GS1 check digit');
    }
    if (![...identifiers, 'mpn', 'sku'].some((key) => nonempty(product[key]))) finding('WARN', label, 'identifier', 'add a valid GTIN, mpn, or sku when known');
    if (product.url != null && (!absoluteUrl(urlOf(product.url)) || canonical && urlOf(product.url) !== canonical.href)) {
      finding('ERROR', label, 'url', `Product URL ${JSON.stringify(urlOf(product.url))} differs from rel=canonical ${JSON.stringify(meta.canonical)}`);
    }
    const offers = entries(product.offers);
    if (!offers.length) finding('ERROR', label, 'offers', 'missing Offer with a price');
    for (const [offerIndex, offer] of offers.entries()) {
      const field = `offers[${offerIndex + 1}]`;
      if (!isObject(offer)) { finding('ERROR', label, field, 'Offer must be an object'); continue; }
      if (!hasType(offer, 'Offer')) finding('ERROR', label, `${field}.@type`, 'expected an Offer node');
      if (!(number(offer.price) > 0)) finding('ERROR', label, `${field}.price`, 'price must be a number or numeric string greater than zero');
      if (!nonempty(offer.priceCurrency) || !CURRENCIES.has(offer.priceCurrency)) finding('ERROR', label, `${field}.priceCurrency`, 'use an ISO 4217 currency code');
      else if (offer.priceCurrency !== 'TND') finding('WARN', label, `${field}.priceCurrency`, `expected TND for protein.tn, found ${offer.priceCurrency}`);
      if (!AVAILABILITY.has(offer.availability)) finding('ERROR', label, `${field}.availability`, 'use a valid https://schema.org availability URL');
      if (offer.url != null && (!absoluteUrl(urlOf(offer.url)) || canonical && urlOf(offer.url) !== canonical.href)) {
        finding('ERROR', label, `${field}.url`, `Offer URL ${JSON.stringify(urlOf(offer.url))} differs from rel=canonical ${JSON.stringify(meta.canonical)}`);
      }
      if (!validDate(offer.priceValidUntil) || offer.priceValidUntil <= new Date().toISOString().slice(0, 10)) {
        finding('WARN', label, `${field}.priceValidUntil`, 'add an ISO calendar date after today');
      }
      if (offer.availability === 'https://schema.org/InStock') {
        if (!entries(offer.shippingDetails).length) finding('WARN', label, `${field}.shippingDetails`, 'add shipping details for an in-stock offer');
        if (!entries(offer.hasMerchantReturnPolicy).length) finding('WARN', label, `${field}.hasMerchantReturnPolicy`, 'add a merchant return policy for an in-stock offer');
      }
    }
    for (const rating of entries(product.aggregateRating)) {
      const value = number(rating?.ratingValue);
      const best = rating?.bestRating == null ? 5 : number(rating.bestRating);
      const worst = rating?.worstRating == null ? 1 : number(rating.worstRating);
      if (!(worst < best && value >= worst && value <= best)) finding('ERROR', label, 'aggregateRating.ratingValue', 'ratingValue must lie between worstRating and bestRating (defaults 1 and 5)');
      if (!(number(rating?.reviewCount) > 0 || number(rating?.ratingCount) > 0)) finding('ERROR', label, 'aggregateRating.reviewCount', 'reviewCount or ratingCount must be greater than zero');
    }
    for (const [reviewIndex, review] of entries(product.review).entries()) {
      if (!nonempty(dereference(review?.author)?.name)) finding('ERROR', label, `review[${reviewIndex + 1}].author.name`, 'missing reviewer name');
      if (!Number.isFinite(number(dereference(review?.reviewRating)?.ratingValue))) finding('ERROR', label, `review[${reviewIndex + 1}].reviewRating.ratingValue`, 'missing numeric review rating');
    }
    const productUrl = urlOf(product.url) ?? urlOf(product['@id'])?.split('#')[0];
    if (absoluteUrl(productUrl)) {
      const claim = JSON.stringify([product.name?.trim(), offers.map((offer) => number(offer?.price)).sort((a, b) => a - b)]);
      if (productClaims.has(productUrl) && productClaims.get(productUrl) !== claim) finding('ERROR', label, 'url', `another Product for ${productUrl} has a different name or price`);
      productClaims.set(productUrl, claim);
    }
  }

  // Breadcrumb last item may omit item; all earlier items need a URL and positions start at 1.
  for (const [index, breadcrumb] of nodes.filter((node) => hasType(node, 'BreadcrumbList')).entries()) {
    const label = `BreadcrumbList[${index + 1}]`;
    const items = entries(breadcrumb.itemListElement);
    if (!items.length) finding('ERROR', label, 'itemListElement', 'empty breadcrumb trail');
    items.forEach((item, position) => {
      if (!hasType(item, 'ListItem')) finding('ERROR', label, `itemListElement[${position + 1}].@type`, 'expected a ListItem');
      if (number(item?.position) !== position + 1) finding('ERROR', label, `itemListElement[${position + 1}].position`, `expected ${position + 1}`);
      if (position < items.length - 1) {
        const url = absoluteUrl(urlOf(item?.item));
        if (!url || url.hostname !== host) finding('ERROR', label, `itemListElement[${position + 1}].item`, `use an absolute URL on ${host}`);
      }
    });
    const last = items.at(-1);
    if (last && ![meta.h1, meta.title].some((value) => nonempty(value) && value.trim().toLowerCase() === String(last.name ?? '').trim().toLowerCase())) {
      finding('WARN', label, 'itemListElement[last].name', `"${last.name ?? ''}" differs from H1 "${meta.h1}" and title "${meta.title}"`);
    }
  }

  // Article properties: https://developers.google.com/search/docs/appearance/structured-data/article
  for (const [index, article] of nodes.filter((node) => hasType(node, 'Article') || hasType(node, 'BlogPosting')).entries()) {
    const label = `Article[${index + 1}]`;
    if (!nonempty(article.headline) || [...article.headline].length > 110) finding('ERROR', label, 'headline', 'provide a non-empty headline of at most 110 characters');
    checkImage(article.image, label, 'image');
    if (!isoDateTime(article.datePublished)) finding('ERROR', label, 'datePublished', 'provide a valid ISO 8601 date or datetime');
    if (!isoDateTime(article.dateModified) || isoDateTime(article.datePublished) && Date.parse(article.dateModified) < Date.parse(article.datePublished)) {
      finding('ERROR', label, 'dateModified', 'provide a valid ISO 8601 date on or after datePublished');
    }
    const authors = entries(article.author);
    if (!authors.length || authors.some((author) => !nonempty(author?.name))) finding('ERROR', label, 'author.name', 'provide an author name');
    authors.forEach((author, authorIndex) => { if (!absoluteUrl(author?.url)) finding('WARN', label, `author[${authorIndex + 1}].url`, 'add an absolute author profile URL'); });
    checkImage(dereference(article.publisher)?.logo, label, 'publisher.logo');
  }

  // Organization and LocalBusiness identity: https://developers.google.com/search/docs/appearance/structured-data/organization
  for (const [index, organization] of nodes.filter((node) => ['Organization', 'OnlineStore', 'LocalBusiness'].some((type) => hasType(node, type))).entries()) {
    const label = `${typeNames(organization).filter((type) => ['Organization', 'OnlineStore', 'LocalBusiness'].includes(type)).join('+')}[${index + 1}]`;
    if (!nonempty(organization.name)) finding('ERROR', label, 'name', 'missing organization name');
    // url + logo are Organization-structured-data requirements for an ENTITY (a node with an @id,
    // i.e. the site's own organization). A bare credit such as a VideoObject's channel publisher
    // ({ "@type": "Organization", "name": "Optimum Nutrition" }) is not one, and Google's video
    // guidelines do not ask it for a logo.
    if (organization['@id'] || hasType(organization, 'LocalBusiness')) {
      if (!absoluteUrl(organization.url)) finding('ERROR', label, 'url', 'provide an absolute organization URL');
      checkImage(organization.logo, label, 'logo');
    }
    if (hasType(organization, 'LocalBusiness') && !nonempty(dereference(organization.address)?.addressCountry)) finding('ERROR', label, 'address.addressCountry', 'provide an address with country');
  }

  // Lists can be top-level or nested in CollectionPage.mainEntity. No link fetching is needed.
  const lists = nodes.filter((node) => hasType(node, 'ItemList'));
  for (const [index, list] of lists.entries()) {
    const label = `ItemList[${index + 1}]`;
    const seen = new Set();
    for (const [itemIndex, item] of entries(list.itemListElement).entries()) {
      if (!hasType(item, 'ListItem')) finding('ERROR', label, `itemListElement[${itemIndex + 1}].@type`, 'expected a ListItem');
      const value = urlOf(item?.url);
      const url = absoluteUrl(value);
      if (!url || url.hostname !== host) finding('ERROR', label, `itemListElement[${itemIndex + 1}].url`, `use an absolute URL on ${host}`);
      else if (seen.has(url.href)) finding('ERROR', label, `itemListElement[${itemIndex + 1}].url`, `duplicate URL ${url.href}`);
      else seen.add(url.href);
    }
  }
  for (const [index, collection] of nodes.filter((node) => hasType(node, 'CollectionPage')).entries()) {
    const list = dereference(collection.mainEntity);
    if (hasType(list, 'ItemList') && !lists.includes(list)) finding('WARN', `CollectionPage[${index + 1}]`, 'mainEntity', 'ItemList reference is not defined on this page');
  }

  // FAQ content must match visible page content: https://developers.google.com/search/docs/appearance/structured-data/faqpage
  const faqs = nodes.filter((node) => hasType(node, 'FAQPage'));
  if (faqs.length > 1) finding('ERROR', 'FAQPage', '@type', `found ${faqs.length} FAQPage nodes; keep at most one`);
  for (const [index, faq] of faqs.entries()) {
    const label = `FAQPage[${index + 1}]`;
    for (const [questionIndex, question] of entries(faq.mainEntity).entries()) {
      if (!hasType(question, 'Question')) { finding('ERROR', label, `mainEntity[${questionIndex + 1}]`, 'expected a Question'); continue; }
      const answer = dereference(question.acceptedAnswer);
      if (!nonempty(answer?.text) || !normalText(visibleText(answer.text))) finding('ERROR', label, `mainEntity[${questionIndex + 1}].acceptedAnswer.text`, 'missing non-empty answer text');
      const text = normalText(question.name ?? question.text);
      if (!text || !meta.text.includes(text)) finding('WARN', label, `mainEntity[${questionIndex + 1}].name`, 'question text is absent from visible HTML');
    }
  }

  // Global graph and URL hygiene. Absolute @id references may identify entities on other pages.
  for (const object of objects) {
    if (nonempty(object['@id']) && Object.keys(object).every((key) => key === '@id' || key === '@context') && !definitions.has(object['@id']) && !absoluteUrl(object['@id'])) {
      finding('WARN', 'Global', '@id', `dangling relative reference ${object['@id']}`);
    }
    for (const [key, value] of Object.entries(object)) {
      for (const entry of asArray(value)) if (typeof entry === 'string' && /^http:\/\//i.test(entry)) {
        finding('ERROR', 'Global', key, `insecure HTTP URL ${entry}`);
      }
      if (key !== 'image' && key !== 'logo') continue;
      for (const image of imageUrls(value)) {
        const url = absoluteUrl(image);
        if (url && url.hostname !== 'protein.tn') finding('WARN', 'Global', key, `image host ${url.hostname} is outside protein.tn/media (${image})`);
      }
    }
  }
  return nodes;
}

function usage(message) {
  if (message) console.error(`ERROR CLI arguments: ${message}`);
  console.error('Usage: node scripts/audit-structured-data.mjs [--base https://protein.tn] [--urls a,b,c] [--sample]');
  process.exitCode = message ? 1 : 0;
}

function argumentsFrom(argv) {
  let base = 'https://protein.tn';
  let urls;
  let sample = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--base' || arg === '--urls') {
      const value = argv[++index];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
      if (arg === '--base') base = value;
      else urls = value.split(',').map((entry) => entry.trim()).filter(Boolean);
    } else if (arg === '--sample') sample = true;
    else if (arg === '--help' || arg === '-h') return null;
    else throw new Error(`unknown option ${arg}`);
  }
  if (!absoluteUrl(base)) throw new Error('--base must be an absolute HTTP(S) URL');
  if (urls && !urls.length) throw new Error('--urls needs at least one URL or path');
  const selected = sample ? [...SAMPLE, ...(urls ?? [])] : urls ?? SAMPLE;
  return { base, urls: [...new Set(selected.map((entry) => {
    if (!entry.startsWith('/') && !absoluteUrl(entry)) throw new Error(`invalid URL or path ${entry}`);
    return new URL(entry, base).href;
  }))] };
}

async function main() {
  let options;
  try { options = argumentsFrom(process.argv.slice(2)); }
  catch (error) { usage(error.message); return; }
  if (!options) { usage(); return; }
  const counts = { ERROR: 0, WARN: 0 };
  const checks = new Map();
  for (const url of options.urls) {
    const path = new URL(url).pathname + new URL(url).search;
    const findings = [];
    const finding = (severity, type, field, why) => {
      findings.push({ severity, type, field, why });
      counts[severity] += 1;
      const check = `${type.replace(/\[\d+\]/g, '')}.${field.replace(/\[\d+\]/g, '[]')}`;
      const tally = checks.get(check) ?? { ERROR: 0, WARN: 0 };
      tally[severity] += 1;
      checks.set(check, tally);
    };
    let nodes = [];
    try {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' }, signal: AbortSignal.timeout(20000) });
      if (!response.ok) finding('ERROR', 'Page', 'fetch', `HTTP ${response.status} ${response.statusText}`);
      else if (!response.headers.get('content-type')?.toLowerCase().includes('text/html')) finding('ERROR', 'Page', 'content-type', `expected text/html, got ${response.headers.get('content-type') ?? 'missing'}`);
      else nodes = auditPage(await response.text(), response.url || url, finding);
    } catch (error) { finding('ERROR', 'Page', 'fetch', error.message); }
    console.log(`PAGE ${path} — ${nodes.length} nodes (${[...new Set(nodes.flatMap(typeNames))].join(', ') || 'none'})`);
    for (const { severity, type, field, why } of findings) console.log(`${severity} ${type} ${field}: ${why}`);
  }
  console.log(`SUMMARY ERROR ${counts.ERROR} WARN ${counts.WARN}`);
  for (const [check, tally] of [...checks].sort(([a], [b]) => a.localeCompare(b))) console.log(`CHECK ${check}: ERROR ${tally.ERROR} WARN ${tally.WARN}`);
  if (counts.ERROR) process.exitCode = 1;
}

await main();
