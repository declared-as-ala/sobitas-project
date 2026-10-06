/**
 * EVERY brand page (/optimum-nutrition, /dymatize, … ~580 of them) renders from ONE object built
 * here: the human route `(shop)/[slug]` and the crawler route `x-crawler/category/[slug]` both
 * call buildBrandPageCopy() and print its fields, so the two views of one URL cannot drift.
 *
 * ── WHAT THIS REPLACED (measured 05/10/2026) ─────────────────────────────────────────────────
 *   - raw database names in headings (« BIOTECH USA en Tunisie », « weightworld en Tunisie »);
 *   - API family labels (« Mineraux », « Eaa ») instead of the taxonomy's (« Minéraux », « EAA »);
 *   - curated FAQs printed with their {tokens} unresolved in the FAQPage markup, while the page
 *     resolved them — two different texts for one Q&A;
 *   - a generic two-paragraph intro that restated the grid and a « Comment choisir entre les
 *     produits X ? » answer that said nothing a shopper could act on.
 *
 * ── THE RULES ────────────────────────────────────────────────────────────────────────────────
 * Pure and synchronous: the caller fetches the listing and the stock facts; nothing here calls an
 * API. Every number is read off that listing or those facts — a count, a price range, a family
 * size — and a sentence whose fact is unknown is not written. Curated copy comes from
 * config/brandSeoConfig.ts, resolved here; the FAQ list returned is the one the page shows AND the
 * one brandJsonLd.ts turns into FAQPage markup (minus SUR_COMMANDE_QA, the one Q&A shared
 * word for word by every brand page — see brandJsonLd).
 */
import type { Brand, Product } from '@/types';
import { getBrandSeoEntry } from '@/config/brandSeoConfig';
import { getBrandFamilies, type BrandFamily } from '@/util/brandCategoryNames';
import { brandDisplayName, brandLogoAlt, brandSeoExtras } from '@/util/brandDisplayName';
import { orderBrandListing } from '@/util/brandListingOrder';
import { pickBrandShareImage } from '@/util/brandMeta';
import { resolveCategoryFaqs, resolveCategoryIntroHtml, type CategoryStockFacts } from '@/util/resolveCategorySeo';
import { getProductStockStatus, isInStock } from '@/util/cartStock';
import { getEffectivePrice } from '@/util/productPrice';
import { getStorageUrl } from '@/services/api';
import { DELIVERY } from '@/util/company';

export type BrandTemplateFacts = { inStockCount: number | null; priceMin: number | null; priceMax: number | null };
export type BrandFaq = { question: string; answer: string };
type PageLink = { slug: string; name: string; url: string };

export type BrandPageCopy = {
  slug: string;
  displayName: string;
  heading: string;
  leadHtml: string;
  introTitle: string;
  introHtml: string | null;
  howToChooseTitle: string;
  howToChooseBody: string;
  faqs: BrandFaq[];
  relatedCategories: PageLink[];
  relatedBrands: PageLink[];
  families: BrandFamily[];
  familyIndexTitle: string;
  showFamilyIndex: boolean;
  inStockTitle: string;
  inStockProducts: Product[];
  showInStockTable: boolean;
  gridHeading: string;
  logo: { src: string; alt: string; width: number; height: number } | null;
  shareImage: { url: string; alt: string; isLogo?: boolean } | null;
  officialUrl: string | null;
  counts: { total: number; inStock: number; backOrder: number };
};

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function frenchList(items: string[]): string {
  if (items.length < 2) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count === 1 ? singular : pluralForm;
}

const WINDOW = DELIVERY.windowLabel;
const COD_CLAUSE = DELIVERY.cashOnDelivery ? ', avec paiement à la livraison' : '';

/**
 * What « Sur commande » means, in the words the request dialog itself uses
 * (app/components/ProductRequestDialog.tsx: « Nous vous confirmons le prix et le délai avant toute
 * commande », « Sans paiement ni engagement »). Shown wherever a brand lists back-order references.
 * Visible only: brandJsonLd leaves it out of FAQPage, because the same Q&A on ~570 URLs would be
 * marked up ~570 times. Push THIS object (never a copy) so that reference filter keeps working.
 */
export const SUR_COMMANDE_QA: BrandFaq = {
  question: 'Que veut dire « Sur commande » ?',
  answer:
    `« Sur commande » signifie que la référence n’est pas en stock aujourd’hui : vous la demandez depuis sa fiche produit, sans paiement ni engagement, et nous vous confirmons son prix et son délai avant toute commande. Les références « En stock » sont livrées en ${WINDOW} ; la livraison coûte ${DELIVERY.feeDt} DT et elle est offerte dès ${DELIVERY.freeFromDt} DT${COD_CLAUSE}.`,
};

/**
 * The same Q&A without the parcel delivery terms, for a brand whose curated entry sets
 * `bulkyDelivery` (gym machines: /jx-fitness lists a 35 000 DT boxing ring). Its own FAQ says the
 * transport of a bulky machine is arranged per order, and the shared answer's « 24–72h, 10 DT,
 * offerte dès 300 DT » contradicted it on the same page (06/10/2026). Also left out of FAQPage.
 */
export const SUR_COMMANDE_QA_BULKY: BrandFaq = {
  question: SUR_COMMANDE_QA.question,
  answer:
    '« Sur commande » signifie que la référence n’est pas en stock aujourd’hui : vous la demandez depuis sa fiche produit, sans paiement ni engagement, et nous vous confirmons son prix et son délai avant toute commande.',
};

/** Both shared « Sur commande » answers: shown on the page, never marked up (brandJsonLd). */
export const SHARED_SUR_COMMANDE_QAS: readonly BrandFaq[] = [SUR_COMMANDE_QA, SUR_COMMANDE_QA_BULKY];

/** Appended to a curated price answer when the brand lists back-order references. */
const BACK_ORDER_PRICE_NOTE = 'Les références sur commande affichent leur prix sur leur fiche.';

/** The H1 of a brand without curated copy: « {Marque} Tunisie : A, B et C ». */
export function brandHeading(name: string, families: string[]): string {
  const top = families.slice(0, 3);
  return top.length ? `${name} Tunisie : ${frenchList(top)}` : `${name} Tunisie`;
}

/** The in-stock price range, from the facts when they were measured, else from the listing. */
function priceRange(products: Product[], facts: BrandTemplateFacts): { min: number | null; max: number | null } {
  if (facts.inStockCount != null) {
    const min = facts.priceMin && facts.priceMin > 0 ? facts.priceMin : null;
    const max = facts.priceMax && facts.priceMax > 0 ? facts.priceMax : null;
    return { min, max: min != null ? max ?? min : null };
  }
  const prices = products
    .filter((product) => isInStock(product))
    .map((product) => Number(getEffectivePrice(product)))
    .filter((price) => Number.isFinite(price) && price > 0);
  return prices.length
    ? { min: Math.round(Math.min(...prices)), max: Math.round(Math.max(...prices)) }
    : { min: null, max: null };
}

/**
 * The lead: ONE paragraph of live facts under the H1, identical in both views.
 *
 *   « 51 produits Optimum Nutrition au catalogue, dont 9 en stock (de 149 à 749 DT) livrés en
 *     24–72h. Familles principales : Whey protéine, Caséine et Vitamines. »
 *
 * Sentence 1 states the count and the stock state (mixed / all in stock / all on request / none);
 * when the stock facts could not be measured it states the count only. `deliveryTerms: false`
 * (a curated `bulkyDelivery` brand) drops « livrés en 24–72h »: its delivery is set per order.
 *
 * Sentence 2 links the families. « Familles principales » is a ranking claim, so only a family of
 * at least 2 products can be one: with every family a singleton, the alphabetical tie-break made
 * a misfiled row « principale » (/weightworld: « Acides aminés » for one berberine;
 * /olimp-sport-nutrition: « Vitamines » for one multivitamin filed under the wrong brand,
 * 06/10/2026). All-singleton brands with ≤ 3 families list them all (« Familles : … »); with more,
 * the lead names none and leaves them to the family index below it.
 * Names are HTML-escaped; family links point at canonical category paths.
 */
export function buildBrandLead({
  displayName,
  products,
  facts,
  families,
  deliveryTerms = true,
}: {
  displayName: string;
  products: Product[];
  facts: BrandTemplateFacts;
  families: BrandFamily[];
  deliveryTerms?: boolean;
}): string {
  const name = escapeHtml(displayName);
  const total = Array.isArray(products) ? products.length : 0;
  if (total === 0) {
    return `<p>Aucun produit ${name} n’est publié pour le moment. <a href="/brands">Voir toutes les marques</a>.</p>`;
  }

  const head = `${total} ${plural(total, 'produit')} ${name} au catalogue`;
  const k = facts.inStockCount;
  const backOrder = products.filter((product) => getProductStockStatus(product).isBackOrder).length;
  const { min, max } = priceRange(products, facts);
  const priceClause = k && k > 0 && min != null
    ? (max != null && max > min ? `(de ${min} à ${max} DT)` : `(${min} DT)`)
    : '';
  const withPrice = (text: string) => (priceClause ? `${text} ${priceClause}` : text);

  let first: string;
  if (k == null) {
    first = `${head}.`;
  } else if (k > 0 && k < total) {
    first = deliveryTerms
      ? `${head}, dont ${withPrice(`${k} en stock`)} ${plural(k, 'livré', 'livrés')} en ${WINDOW}.`
      : `${head}, dont ${withPrice(`${k} en stock`)}.`;
  } else if (k > 0) {
    const state = withPrice(total === 1 ? 'en stock' : 'tous en stock');
    first = !deliveryTerms
      ? `${head}, ${state}.`
      : `${head}, ${state} et ${total === 1 ? 'livré' : 'livrés'} en ${WINDOW}.`;
  } else if (backOrder > 0) {
    first = `${head}, ${total === 1 ? 'sur commande' : 'tous sur commande'} : prix et délai confirmés avant la commande.`;
  } else {
    first = `${head}, ${total === 1 ? 'pas en stock' : 'aucun en stock'} pour le moment.`;
  }

  const main = families.filter((family) => family.count >= 2).slice(0, 3);
  const named = main.length ? main : families.length <= 3 ? families : [];
  const links = named.map((family) => `<a href="${escapeHtml(family.url)}">${escapeHtml(family.name)}</a>`);
  const second = links.length === 0
    ? ''
    : families.length === 1
      ? ` Famille : ${links[0]}.`
      : main.length === 0
        ? ` Familles : ${frenchList(links)}.`
        : links.length === 1
          ? ` Famille principale : ${links[0]}.`
          : ` Familles principales : ${frenchList(links)}.`;

  return `<p>${first}${second}</p>`;
}

type GenericContext = {
  displayName: string;
  ordered: Product[];
  facts: BrandTemplateFacts;
  allFamilies: BrandFamily[];
  counts: BrandPageCopy['counts'];
};

function genericHowToChooseBody({ displayName, allFamilies, counts }: GenericContext): string {
  const name = escapeHtml(displayName);
  const { total, inStock, backOrder } = counts;
  if (total === 0) {
    return `<p>Aucun produit ${name} n’est publié pour le moment ; il n’y a pas encore de famille, de format ou d’arôme à comparer.</p>`;
  }
  const compare = 'le format (poids net, nombre de gélules ou de portions) et l’arôme';
  const labelRule = 'l’étiquette du produit reçu fait foi pour la composition.';
  const top = allFamilies.slice(0, 3);
  let first: string;
  if (total === 1) {
    const family = top[0] ? ` appartient à la famille ${escapeHtml(top[0].name)}` : ' est présenté sur sa fiche';
    first = `Le produit ${name} au catalogue${family}. Vérifiez ${compare} indiqués sur sa fiche : ${labelRule}`;
  } else if (top.length >= 2) {
    const spread = frenchList(top.map((family) => `${escapeHtml(family.name)} (${family.count})`));
    first = `Les ${total} produits ${name} se répartissent ${allFamilies.length > 3 ? 'notamment ' : ''}entre ${spread}. Choisissez d’abord la famille qui correspond à votre objectif, puis comparez ${compare} indiqués sur chaque fiche : ${labelRule}`;
  } else if (top.length === 1) {
    first = `Les ${total} produits ${name} appartiennent à la famille ${escapeHtml(top[0].name)}. Comparez ${compare} indiqués sur chaque fiche : ${labelRule}`;
  } else {
    first = `Comparez ${compare} indiqués sur la fiche de chacun des ${total} produits ${name} : ${labelRule}`;
  }
  const order = inStock > 0 && backOrder > 0
    ? `<p>Les références en stock apparaissent en premier dans la liste ; les autres sont sur commande.</p>`
    : '';
  return `<p>${first}</p>${order}`;
}

function genericFaqs({ displayName, ordered, facts, allFamilies, counts }: GenericContext): BrandFaq[] {
  const { total, inStock, backOrder } = counts;
  const faqs: BrandFaq[] = [];

  // a) What the catalogue holds.
  const top = allFamilies.slice(0, 3).map((family) => family.name);
  const familyClause = top.length
    ? `, ${allFamilies.length > 3 ? 'notamment ' : ''}dans ${top.length === 1 ? 'la famille' : 'les familles'} ${frenchList(top)}`
    : '';
  faqs.push({
    question: `Quels produits ${displayName} trouve-t-on sur Protein.tn ?`,
    answer: total > 0
      ? `${total} ${plural(total, 'produit')} ${displayName} ${plural(total, 'figure', 'figurent')} au catalogue${familyClause}.${inStock > 0 ? ` ${inStock} ${plural(inStock, 'est', 'sont')} en stock.` : ''}`
      : `Aucun produit ${displayName} n’est publié dans le catalogue pour le moment.`,
  });

  // b) Prices of what is in stock.
  const { min, max } = priceRange(ordered, facts);
  if (inStock > 0 && min != null) {
    const answer = inStock === 1
      ? `La référence ${displayName} en stock coûte ${min} DT.`
      : max == null || max === min
        ? `Les ${inStock} références ${displayName} en stock sont à ${min} DT.`
        : `Les ${inStock} références ${displayName} en stock vont de ${min} à ${max} DT.`;
    faqs.push({
      question: inStock === 1
        ? `Quel est le prix de la référence ${displayName} en stock ?`
        : `Quels sont les prix des produits ${displayName} en stock ?`,
      answer: `${answer}${backOrder > 0 ? ` ${BACK_ORDER_PRICE_NOTE}` : ''}`,
    });
  }

  // c) What « Sur commande » means.
  if (backOrder > 0) faqs.push(SUR_COMMANDE_QA);

  // d) Ordering and delivery.
  const fees = `${DELIVERY.feeDt} DT, offerte dès ${DELIVERY.freeFromDt} DT${COD_CLAUSE}`;
  faqs.push({
    question: `Comment commander et recevoir un produit ${displayName} ?`,
    answer: inStock > 0
      ? `Ajoutez une référence en stock au panier et passez commande. Livraison ${WINDOW} en Tunisie, ${fees}.`
      : backOrder > 0
        ? `Demandez la référence depuis sa fiche produit : nous vous confirmons son prix et son délai avant toute commande. La livraison coûte ${fees}.`
        : `Ajoutez le produit au panier dès qu’il est en stock, puis passez commande. Livraison ${WINDOW} en Tunisie, ${fees}.`,
  });

  return faqs;
}

function genericSections(ctx: GenericContext) {
  const { displayName } = ctx;
  return {
    heading: brandHeading(displayName, ctx.allFamilies.slice(0, 6).map((family) => family.name)),
    introHtml: null as string | null,
    howToChooseTitle: `Comment choisir un produit ${displayName} ?`,
    howToChooseBody: genericHowToChooseBody(ctx),
    faqs: genericFaqs(ctx),
    relatedCategories: [{ slug: 'brands', name: `Comparer ${displayName} aux autres marques`, url: '/brands' }] as PageLink[],
    relatedBrands: [] as PageLink[],
    officialUrl: null as string | null,
  };
}

function countsOf(ordered: Product[], facts: BrandTemplateFacts): BrandPageCopy['counts'] {
  return {
    total: ordered.length,
    inStock: facts.inStockCount ?? ordered.filter((product) => isInStock(product)).length,
    backOrder: ordered.filter((product) => getProductStockStatus(product).isBackOrder).length,
  };
}

export function buildBrandPageCopy({
  slug,
  brand,
  products,
  facts,
}: {
  slug: string;
  brand: Brand;
  products: Product[];
  facts: BrandTemplateFacts;
}): BrandPageCopy {
  const ordered = orderBrandListing(products, brand);
  const displayName = brandDisplayName(brand.designation_fr, slug);
  const counts = countsOf(ordered, facts);
  const allFamilies = getBrandFamilies(ordered);
  const families = allFamilies.slice(0, 6);
  const factsForTokens: CategoryStockFacts = {
    priceMin: facts.priceMin,
    priceMax: facts.priceMax,
    inStockCount: facts.inStockCount,
    productCount: counts.total,
  };

  const entry = getBrandSeoEntry(slug);
  let sections: ReturnType<typeof genericSections>;
  if (entry) {
    const extras = brandSeoExtras(entry);
    const faqs = resolveCategoryFaqs(entry.faqs, factsForTokens);
    // The curated price answer is its token sentence only (« Les {nbEnStock} références … vont de
    // {prixMin} à {prixMax} DT. »), so it disappears with its fact. It no longer ends with a fixed
    // « Le prix de chaque format et de chaque arôme est affiché dans la grille, y compris pour les
    // références sur commande. »: false on /weightworld and /proactive (nothing on back order, no
    // arôme), and the WHOLE answer — identical on 7 pages and in their FAQPage — wherever the token
    // sentence dropped (06/10/2026). The back-order pointer is added only when it is true.
    const priceIndex = faqs.findIndex((faq) => /^Quel(?:s)? (?:est|sont) (?:le|les) prix\b/i.test(faq.question));
    if (counts.backOrder > 0 && priceIndex >= 0 && !/sur commande/i.test(faqs[priceIndex].answer)) {
      faqs[priceIndex] = { ...faqs[priceIndex], answer: `${faqs[priceIndex].answer} ${BACK_ORDER_PRICE_NOTE}` };
    }
    if (counts.backOrder > 0 && !faqs.some((faq) => /sur commande/i.test(faq.question))) {
      faqs.push(entry.bulkyDelivery ? SUR_COMMANDE_QA_BULKY : SUR_COMMANDE_QA);
    }
    sections = {
      heading: entry.h1,
      introHtml: resolveCategoryIntroHtml(entry.introHtml, factsForTokens) || null,
      howToChooseTitle: entry.howToChooseTitle,
      howToChooseBody: resolveCategoryIntroHtml(entry.howToChooseBody, factsForTokens),
      faqs,
      relatedCategories: entry.relatedCategories,
      relatedBrands: extras.relatedBrands
        .filter((related) => related !== slug && getBrandSeoEntry(related))
        .map((related) => ({ slug: related, name: brandDisplayName(related, related), url: `/${related}` })),
      officialUrl: extras.officialUrl,
    };
  } else {
    sections = genericSections({ displayName, ordered, facts, allFamilies, counts });
  }

  // EVERY in-stock row, no cap: the heading « {Marque} en stock : formats et prix » reads as the
  // complete list, and the lead and family index above it count every in-stock product. A cap of
  // 12 printed 12 of 14 on /real-pharm and 12 of 26 on /jx-fitness, without the 35000 DT item that
  // sets the lead's price range (06/10/2026). 26 rows is ~3 KB of <table>.
  const inStockProducts = ordered.filter((product) => isInStock(product));
  const gridHeading = counts.total > 1
    ? `Tous les produits ${displayName} : ${counts.total} au catalogue`
    : counts.total === 1
      ? `${displayName} : 1 produit au catalogue`
      : `${displayName} : aucun produit publié pour le moment`;
  const logoSrc = brand.logo ? getStorageUrl(brand.logo) : '';

  return {
    slug,
    displayName,
    ...sections,
    leadHtml: buildBrandLead({ displayName, products: ordered, facts, families, deliveryTerms: !entry?.bulkyDelivery }),
    // « d’ » before a vowel: « À propos d’Optimum Nutrition », « À propos de Dymatize ». Not before
    // an English « One », said /w/: « À propos de One-A-Day », as in « le week-end ».
    introTitle: /^(?!one(?![a-z]))[aeiouàâäéèêëîïôöùûü]/i.test(displayName) ? `À propos d’${displayName}` : `À propos de ${displayName}`,
    families,
    familyIndexTitle: `La gamme ${displayName} par famille`,
    showFamilyIndex: families.length >= 2,
    inStockTitle: `${displayName} en stock : formats et prix`,
    inStockProducts,
    showInStockTable: inStockProducts.length >= 1 && counts.backOrder >= 3,
    gridHeading,
    logo: logoSrc ? { src: logoSrc, alt: brandLogoAlt(brand.designation_fr, slug), width: 112, height: 112 } : null,
    shareImage: pickBrandShareImage(brand, ordered),
    counts,
  };
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<\/p>\s*<p>/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The generic sections for a brand WITHOUT a curated entry, in the older shape a few consumers
 * still type against (ShopPageClient's `genericBrand` prop; GenericBrandDetails was removed 05/10/2026). Same builders as
 * buildBrandPageCopy, so the two cannot say different things: `introHtml` is the lead paragraph,
 * and `howToChooseBody` is plain text because GenericBrandDetails prints it inside a <p>.
 */
export function buildGenericBrandTemplate(name: string, products: Product[], facts: BrandTemplateFacts) {
  const ordered = orderBrandListing(products);
  const displayName = brandDisplayName(name);
  const allFamilies = getBrandFamilies(ordered);
  const sections = genericSections({ displayName, ordered, facts, allFamilies, counts: countsOf(ordered, facts) });
  return {
    heading: sections.heading,
    introHtml: buildBrandLead({ displayName, products: ordered, facts, families: allFamilies.slice(0, 6) }),
    howToChooseTitle: sections.howToChooseTitle,
    howToChooseBody: htmlToPlainText(sections.howToChooseBody),
    faqs: sections.faqs,
  };
}
