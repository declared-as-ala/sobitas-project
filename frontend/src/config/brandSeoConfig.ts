export interface BrandSeoEntry {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  introHtml: string;
  howToChooseTitle: string;
  howToChooseBody: string;
  faqs: Array<{ question: string; answer: string }>;
  relatedCategories: Array<{ slug: string; name: string; url: string }>;
  /** 2–4 keys of this file whose brands sell the same families on protein.tn; rendered as « Marques à comparer » chips in BOTH views. */
  relatedBrands?: string[];
  /** The brand's own website (https), emitted only as Brand.sameAs in JSON-LD. Set only when verified. */
  officialUrl?: string;
  /** Optional explicit display name; otherwise the metaTitle prefix before " Tunisie" is used. */
  displayName?: string;
  /**
   * The logo's alt when the admin file is NOT the brand's wordmark, so « Logo {Marque} » would
   * describe a picture that is not there. Read by the brand header and the /brands plates.
   */
  logoAlt?: string;
  /**
   * The brand sells bulky equipment whose transport is arranged per order (its own FAQ says so):
   * the lead and the « Sur commande » answer then state no parcel window or fee (« 24–72h, 10 DT »),
   * which would contradict that FAQ on the same page. Read by brandTemplate.ts.
   */
  bulkyDelivery?: boolean;
}

/**
 * Hand-written overlays are deliberately limited to brands with measured search demand.
 * Every statement must either describe the live catalogue or explain a product-family choice;
 * no invented awards, distributor status, or blanket medical claims belong here.
 *
 * ── WHERE THE NUMBERS IN THESE ENTRIES COME FROM ─────────────────────────────────────────────
 * Product families, formats and flavour counts were read off /api/productsByBrandId/{id} on
 * 08/09/2026; every per-portion figure quoted below comes from the `nutrition_values` block of
 * /api/product_details/{slug} for the exact reference named, which is itself the manufacturer's
 * label transcribed by the Protein.tn team. That is why each figure is attributed to a format AND
 * a flavour: the same product declares different values per flavour, so an unqualified "30 g de
 * protéines" would be wrong for four of the five Nitro-Tech SKUs we list.
 *
 * Four brands added on 08/09/2026 — gsn-great-sport-nutrition, real-pharm, ultimate-nutrition,
 * c4-cellucor — have a thinner data floor, and the copy says so instead of papering over it. Only
 * Real Pharm publishes a transcribed label on our own fiches: /product_details/real-isolate-1-8-kg
 * and /product_details/real-mass-6-8-kg-real-pharm carry a populated `nutrition_facts`, and those
 * are the ONLY two per-portion figures quoted in those four entries. GSN, Ultimate Nutrition and
 * C4 / Cellucor return `nutrition_values: null` and empty `nutrition_facts.rows` on all 36 of
 * their SKUs, so their entries quote no gram figure at all and say plainly that the pot's own
 * label is the reference. Everything else in them — family, format, net weight, arôme — is read
 * off /api/productsByBrandId/{53,21,24,342}, which is what the product grid on the same screen
 * renders. Two traps worth writing down: "Animal Pak" belongs to brand 25 (Universal Nutrition),
 * NOT to brand 168 (Animal), so it is absent from /animal; and "C4 / Cellucor" (342, 17 SKUs) and
 * "CELLUCOR" (11, 1 SKU) are two separate brand rows serving two separate 200 pages, so the C4
 * Original label figures that exist on /cellucor may not be reused on /c4-cellucor.
 *
 * No entry states a price, a discount, a stock level or an availability promise. Those change
 * daily and the product grid above the copy already renders the live values — a number frozen
 * into this file would be a contradiction on the same screen within a week.
 *
 * ── ONE ANCHOR, ONE DESTINATION ──────────────────────────────────────────────────────────────
 * `relatedCategories` is the only internal-link surface a brand page has, so the same anchor text
 * must always point at the same URL. "Mass gainers en Tunisie" pointed at /gainers-proteines in
 * two entries (dymatize, ostrovit) and at /mass-gainers in two others (muscletech, biotech-usa) —
 * four brand pages splitting the exact anchor Google reads for `mass gainer tunisie` across two
 * self-canonical 200s, which is the cannibalisation the audit found on that query (GSC 22/09:
 * /mass-gainers 0/12/51.4 AND /gainers-proteines 0/10/53.3 on the same query). All four now say
 * /mass-gainers. /gainers-proteines keeps its own distinct anchor, "Gainers protéinés en Tunisie".
 *
 * The rule is one-way, and /creatine is where the difference shows. One anchor may not serve two
 * URLs; one URL may perfectly well be reached by twelve different anchors, and where twelve pages
 * link to the same destination it SHOULD be. Until 22/09/2026 all twelve brand entries carrying a
 * creatine link wrote the identical string "Créatine en Tunisie" — twelve exact-match repetitions
 * of the head term, which is the pattern the owner named as the one to avoid. Each now says what
 * that brand's own reader is about to find: the flavoured-creatine brand offers "Créatines
 * aromatisées et neutres", the brand whose whey already contains 5 g of it offers "Créatines
 * vendues seules", the brand stocking three pot sizes offers "Comparer les formats de créatine".
 * Every one of the twelve still resolves to /creatine, and no other destination uses any of them.
 *
 * ── 23/09/2026: THE CREATINE SPLIT WAS ONLY EVER APPLIED TO CREATINE ─────────────────────────
 * That pass fixed the destination that was NOT the measured problem and left the one that was.
 * Counted across the whole file on 23/09/2026, before this change:
 *
 *     /creatine        12 links, 12 distinct anchors   (already split)
 *     /whey-proteine   15 links,  1 distinct anchor    "Whey protéine en Tunisie" x15
 *     /whey-isolate     8 links,  1 distinct anchor    "Whey isolate en Tunisie"  x8
 *     /pre-workout      6 links,  2 distinct anchors   "Pre-workout" x4 / "Pré-workout" x2
 *     /mass-gainers     4 links,  1 · /glutamine 3, 1 · /vitamines 3, 1 · /bcaa 2, 1
 *     /proteine-de-boeuf 2, 1 · /gainers-proteines 2, 1
 *
 * /whey-proteine is where it hurt: GSC 22/09, `whey protein tunisie` 13 clicks / 346 impressions,
 * of which /blog/whey-proteine-pas-cher-tunisie takes 5 at 13.9 and /blog/whey-protein-en-tunisie
 * 4 at 12.5, while the category itself sits at 34.4 with 1 click. Fifteen brand pages were handing
 * it the same exact-match string, which is the repetition pattern — not the destination — that the
 * creatine note above already identified as the thing to avoid.
 *
 * ── WHAT "ONE DISTINCT ANCHOR" MEANS, AND IN WHICH FILE (re-measured 23/09/2026) ─────────────
 * Counted across this file today: 128 `relatedCategories` links over 28 distinct destinations,
 * and not one destination receives the same anchor string twice. The inverse guard holds too —
 * no anchor string here resolves to two different URLs.
 *
 * That sentence was only half true until today, and the missing half lived in another file. Both
 * renders of a brand page read `relatedCategories[].name`: the human one,
 * app/(shop)/brand/BrandSeoLanding.tsx (since 05/10/2026 BrandPageBottom.tsx, now mounted by BOTH
 * renders), which has always printed `{link.name}` unchanged, and the
 * crawler one, app/components/crawler/CrawlerCategoryView.tsx, which used to pass every name
 * through `categoryAnchor()` first. That helper (src/util/categoryAnchor.ts) maps a slug to ONE
 * fixed label and declares 19 of them today; 13 of the 28 destinations linked from this file are
 * among those 19 — /whey-proteine, /creatine, /bcaa, /eaa, /glutamine, /vitamines, /mineraux,
 * /magnesium, /zinc, /zma, /collagene, /omega-3 and /sante-vitalite. On the render that ranks,
 * those 13 collapsed back to one string apiece whatever was written here, while the other 15 —
 * /whey-isolate, /mass-gainers, /brands, /pre-workout, /caseine, /bruleurs-de-graisse,
 * /proteines-multi-sources, /proteine-de-boeuf, /whey-hydrolysee, /gainers-proteines,
 * /articulations, /antioxydants, /citrulline, /boosters-hormonaux and /glucides — kept their
 * curated wording only because the helper has no entry for them.
 *
 * CrawlerCategoryView's related-category rail no longer calls `categoryAnchor()`: it renders
 * `{c.name}`, which is what BrandSeoLanding already did. So the distinct anchors written here are
 * the anchors both renders emit, for all 28 destinations and not just the 15 the helper ignores.
 * The sub-categories rail in that same component still calls the helper on purpose, and that is
 * not this file's concern: the brand branch of app/x-crawler/category/[slug]/page.tsx passes no
 * `subCategories`, so on a brand page that rail renders nothing.
 *
 * The /pre-workout pair was a spelling drift rather than a duplicate: four entries wrote
 * "Pre-workout" and two "Pré-workout" for the same shelf. `catalogTaxonomy.ts` declares the label
 * "Pré-workout", so all six now carry the accent.
 *
 * ── EVERY BRAND PAGE LINKS UP TO /brands ─────────────────────────────────────────────────────
 * Before 23/09/2026, none did — 0 of 16 entries, and the breadcrumb both routes build is
 * `Accueil > Boutique > {marque}`, so /shop was the only thing above a brand page and the brand
 * index was reachable from it only through the global header. /brands is a real indexed page that
 * already earns (GSC 22/09, 28 d: 3 clicks / 235 impressions / pos 26.9) and titles itself "570+
 * marques", so it is the natural parent of 570 brand URLs. Each entry now ends with a /brands
 * chip whose anchor names its own brand — "Comparer Dymatize aux autres marques" — which keeps
 * the 24 anchors distinct without inventing 24 synonyms for "toutes les marques".
 *
 * ── THE SUBJECT OF A BRAND PAGE IS THE BRAND ─────────────────────────────────────────────────
 * Checked on 23/09/2026 across every entry: none leads its metaTitle or its h1 with a category
 * head term — all 24 open with the brand name, then the brand's OWN product names.
 * The generic fallback in util/brandMeta.ts does the same ("{Marque} Tunisie | …"). Keep it that
 * way. A brand page titled "Créatine en Tunisie" would be a second self-canonical 200 bidding
 * against /creatine on the query /creatine is already losing (0 clicks / 8 impressions / pos 64.0
 * on `creatine tunisie`), which is the cannibalisation this whole file exists to avoid.
 *
 * ── A CREATINE LINK REQUIRES A CREATINE PRODUCT ──────────────────────────────────────────────
 * `relatedCategories` is editorial, not a taxonomy dump: a brand links to /creatine only when its
 * own entry above names the creatine reference it sells (Micronised Creatine, Gold Creatine,
 * COR-Performance Creatine, Cell-Tech…). Checked 22/09/2026 against both this file's transcribed
 * catalogues and the live /creatine grid: dymatize, weightworld, william-bonac and victor-martinez
 * list no creatine SKU anywhere, so they get no creatine link. ProActive is the one deliberate
 * exception and it is not a loophole — its entry states outright that it sells no standalone
 * creatine, and then tells the reader the 5 g inside Anabolic Whey 80 counts toward their daily
 * total. "Créatines vendues seules" is the answer to the question that copy provokes.
 *
 * ── ONLY BRANDS WHOSE PAGE ACTUALLY RESOLVES ─────────────────────────────────────────────────
 * A slug here only produces content if findBrandBySlug() resolves it, so entries exist only for
 * brands present in /all_brands. Checked on 08/09/2026 against all 582 rows: american-wolf,
 * impact-sport-nutrition, creapure, amino-complex and longevity(-plus) are not brands we carry —
 * their pages answer 404, and an entry for them would be dead config, not SEO.
 *
 * ── WHICH BRANDS GET AN ENTRY: THE MEASURED ONES, IN ORDER ───────────────────────────────────
 * /all_brands returned 582 rows on 23/09/2026 and the sitemap advertises a URL for each, so the
 * question is never "which brand deserves copy" in the abstract — it is "which brand URL is
 * already being shown to someone". Crossing the 28-day GSC Pages export (protein.tn/2026-09-22-28d
 * /Pages.csv, 23/08 → 19/09) against /all_brands gives 104 brand URLs with at least one
 * impression. Ranked by clicks, the top of that list was:
 *
 *     /optimum-nutrition 47/1614/13.5   /dymatize 44/200/4.5     /biotech-usa 19/214/7.9
 *     /weightworld 14/144/5.5           /muscletech 12/154/7.7   /ostrovit 12/146/7.1
 *     /now-foods 12/58/3.1              /vital-proteins 11/52/3.4  /william-bonac 10/108/6.1
 *     /doctor-s-best 9/19/3.3           /big-ramy-labs 8/164/6.7  /rule-one-proteins 8/50/6.7
 *     /proactive 7/164/25.6             /mr-x-v-shape-supps 7/69/7.7  /victor-martinez 5/30/9.0
 *     /gsn-great-sport-nutrition 4/381/8.5  /nutricost 4/25/3.6   /universal-nutrition 3/19/7.3
 *     /olimp-sport-nutrition 2/51/7.2   /kevin-levrone 2/54/11.9  /challenger-nutrition 1/71/9.2
 *     /ultimate-nutrition 3/54/7.9      /c4-cellucor 1/30/8.9     /real-pharm 0/19/21.2
 *
 * The eight added on 23/09/2026 — now-foods, vital-proteins, doctor-s-best, rule-one-proteins,
 * mr-x-v-shape-supps, nutricost, universal-nutrition, olimp-sport-nutrition — take the file from
 * 16 brands to 24. All eight answered 200 with `index, follow` under a Googlebot UA on 23/09/2026
 * before a line was written for them, and all eight were falling through to the generic default
 * title "{Marque} Tunisie | Compléments alimentaires — Protein.tn" — the same string on 566 of
 * the 582 brand URLs, 558 of them after this change. Two were also shouting the database value at
 * Google: "OLIMP SPORT NUTRITION Tunisie" and "MR.X  V-Shape Supps Tunisie", double space
 * included; the curated entry is what fixes the casing on the one view that ranks.
 *
 * Four earning brands in that band were deliberately NOT given an entry, and the reason is the
 * same for all four: their listing is one to four SKUs (neurogum 9 clicks / 1 product;
 * fond-bone-broth 7 / 2; true-sea-moss 5 / 4; bpi-sports 4 / 2). A "quel produit choisir ?"
 * section needs at least two products that differ on something; with one reference the honest
 * output is the product page, not a brand guide. They also already rank at 1.9 to 6.7 — there is
 * nothing here to win. If their catalogue grows, they are the next entries to write.
 *
 * Their product families, formats and net weights come from /api/productsByBrandId/{66,310,63,
 * 454,36,389,25,1} read on 23/09/2026 — the same listing the grid above the copy renders. They
 * quote NO per-portion figure at all: unlike the flagship entries there is no transcribed
 * `nutrition_facts` behind them, so each says plainly that the pot's own label is the reference.
 * That is also why none of them claims a benefit for a substance. Nothing here states a price, a
 * stock level, a founding year, an award or a distributor status, because nothing on protein.tn
 * sources any of those.
 *
 * ── A LINK REQUIRES A PRODUCT — RE-VERIFIED, ALL 24 ──────────────────────────────────────────
 * Re-checked 23/09/2026 by fetching every entry's own /api/productsByBrandId listing and
 * intersecting the `sous_categorie.slug` set with its `relatedCategories`. Every link in the file
 * resolves to a category the brand genuinely sells into, with exactly two deliberate exceptions,
 * both stated in the copy that surrounds them:
 *   · proactive → /creatine — the entry says outright it sells no standalone creatine (its
 *     listing holds only proteines-multi-sources and whey-proteine) and the anchor "Créatines
 *     vendues seules" answers the question its own copy provokes. See the section above.
 *   · vital-proteins → /sante-vitalite — a RAYON, not a leaf. Its five references are all
 *     `collagene`, and catalogTaxonomy.ts declares `collagene` a child of `sante-vitalite`, so
 *     this is the up-the-tree link, not a claim that the brand sells the whole rayon.
 * Every non-/brands destination in the file is a slug declared in catalogTaxonomy.ts, so the
 * names these anchors use and the parents they imply come from the one canonical tree.
 *
 * ── 05/10/2026: WHERE THIS COPY RENDERS NOW, AND WHAT THE CODE ADDS AROUND IT ───────────────
 * Pass of 05/10/2026 (reviewed 06/10/2026 against the live API): 19 entries rewritten in full
 * (optimum-nutrition, gsn-great-sport-nutrition, biotech-usa, dymatize, weightworld, muscletech,
 * ultimate-nutrition, ostrovit, proactive, big-ramy-labs, now-foods, bpi-sports,
 * olimp-sport-nutrition, william-bonac, eric-favre, universal-nutrition, kevin-levrone,
 * challenger-nutrition, rule-one-proteins); seven descriptions trimmed to ≤155 characters
 * (vital-proteins, mr-x-v-shape-supps, jx-fitness, kong-sport-nutrition, nutrex-research,
 * mnd-fitness, quamtrax); scenit-nutrition's frozen « 14 références » is now {nbProduits}.
 *
 * Display name. The metaTitle prefix before " Tunisie" is the page's display name everywhere —
 * breadcrumb, lead, headings, JSON-LD — unless `displayName` is set; the key must be the slug of
 * that name ("GSN Great Sport Nutrition" → gsn-great-sport-nutrition).
 *
 * Render order, identical in BOTH views (Googlebot's x-crawler page and the shopper page):
 *   1. breadcrumb Accueil › Marques › {Marque};  2. eyebrow « Marque » + h1;  3. logo;
 *   4. a CODE-GENERATED lead under the h1 and above the grid — product count, stock count,
 *      in-stock price range and top families, e.g. « 51 produits Optimum Nutrition au catalogue,
 *      dont 9 en stock (de 149 à 749 DT) livrés en 24–72h. Familles principales : … ». None of
 *      those numbers is restated in introHtml;
 *   5. the product grid;  6. when the brand has stock AND ≥3 back-order products, the table
 *      « {Marque} en stock : formats et prix »;  7. « La gamme {Marque} par famille »;
 *   8. H2 « À propos de {Marque} » then introHtml — BELOW the grid, no longer above it;
 *   9. H2 howToChooseTitle then howToChooseBody;
 *  10. chips: relatedCategories (anchors rendered exactly as written), then « Marques à
 *      comparer » chips from relatedBrands;
 *  11. H2 « Questions fréquentes »: faqs, plus the automatic Q&A below. The FAQPage JSON-LD is
 *      exactly the resolved visible list.
 *
 * The four tokens, and what happens when a fact is unknown:
 *   {prixMin}    lowest in-stock effective price, in DT;
 *   {prixMax}    highest in-stock price — dropped when equal to {prixMin};
 *   {nbEnStock}  count of in-stock products — dropped when 0 or unknown, and with stock at 0 the
 *                {prixMin}/{prixMax} sentences drop too;
 *   {nbProduits} total published products of the brand — always known on a brand page.
 * In metaDescription and in faq answers the whole SENTENCE holding a dropped token disappears,
 * so no answer puts a token in its only sentence and no question carries one. In introHtml and
 * howToChooseBody the whole <p> disappears, which is why {nbProduits} is the only token allowed
 * there. No entry writes a price or a stock level. A brand TOTAL should be written {nbProduits}
 * wherever a sentence states one: a literal total drifts with the catalogue (06/10/2026: Scenit 14 → 15,
 * C4 / Cellucor 17 → 18, Muscle Care 3 → 4, each contradicting the page's own lead). Entries that
 * still spell one out (« réunit 56 références », « Quatorze références : … ») are listed by
 * `node scripts/audit-brand-copy-live.mjs` whenever the number differs from live: run it before
 * touching an entry, and convert the total to {nbProduits} when it has drifted.
 *
 * Added by code, never written here:
 *   · « Que veut dire « Sur commande » ? » — appended to the FAQ when the brand has at least one
 *     back-order product (qte ≤ 0 or rupture) — shown, but left out of FAQPage (brandJsonLd);
 *   · the description tail « Paiement à la livraison. » — appended when the resolved description
 *     is ≤130 characters (rule D3), so an entry writes it only if it fits the 155 worst case;
 *   · delivery fees and thresholds, rendered from DELIVERY; an entry's delivery Q&A says only
 *     « livraison 24–72h partout en Tunisie » and « paiement à la livraison »;
 *   · the authenticity and « Sur commande » answers (no entry writes either).
 *
 * `relatedBrands` lists 2–4 keys of THIS file whose brands sell at least one of the same
 * families today (checked on each brand's own /api/productsByBrandId listing, preferring brands
 * with stock); they render as « Marques à comparer » chips in both views. `officialUrl` is the
 * brand's own https homepage, verified by a GET (2xx, or 3xx to the same brand; nowfoods.com
 * answers 403 to curl and 200 to a browser), and is emitted ONLY as Brand.sameAs in the JSON-LD —
 * never as a visible outbound link. It is omitted where no brand site could be verified
 * (gsn-great-sport-nutrition, proactive). Brand origin or founding facts — BioTech USA 1999,
 * Ultimate Nutrition 1979, WeightWorld 2006, OstroVit, Olimp, Eric Favre, Challenger — are one
 * sentence at most and each is stated on the brand's own site; this supersedes the 23/09 line
 * above that no founding year is sourced.
 *
 * Two title tests, the only titles this pass changes (dymatize, now-foods, floradix and
 * nutricost are frozen; every other title is byte-identical to before):
 *   · gsn-great-sport-nutrition — was « GSN Tunisie | Whey, Isolate, Créatine & Gainer —
 *     Protein.tn », now « GSN Great Sport Nutrition Tunisie : whey, créatine et gainer ».
 *     Baseline (GSC 28 d to 05/10): 5 clicks / 389 impressions, CTR 1.3 %, position 8.5.
 *   · challenger-nutrition — was « Challenger Nutrition Tunisie | 100% Whey & Thunder Gainer »,
 *     now « Challenger Nutrition Tunisie : Thunder Gainer, Pump Extreme ».
 *     Baseline: 1 click / 72 impressions, CTR 1.4 %, position 6.1.
 *   Both started 05/10/2026. On 02/11/2026, revert each to its old title if its CTR is still
 *   below 2.5 %.
 *
 * Two statements in the sections above are no longer true after this pass: proactive no longer
 * links to /creatine (its chips are /whey-proteine, /proteines-multi-sources and /brands), and
 * william-bonac now sells a creatine (Mono Lift 500 g, live in `creatine`), which its intro links
 * to /creatine. bpi-sports, listed above as deliberately without an entry, has had one since
 * 01/10/2026. Every in-copy <a> in introHtml points only to a taxonomy category the brand sells
 * into, and its anchor names the brand's own line, so the one-anchor-one-destination rule covers
 * the intro links as well as `relatedCategories`: re-counted 06/10/2026 across both surfaces,
 * 258 links over 46 destinations with 258 distinct anchors — no anchor serves two URLs and no
 * destination receives the same anchor twice.
 */
const BRAND_SEO_CONFIG: Readonly<Record<string, BrandSeoEntry>> = Object.freeze({
  dymatize: {
    metaTitle: 'Dymatize Tunisie | ISO100, Whey & Mass Gainer — Protein.tn',
    metaDescription:
      'Dymatize en Tunisie : ISO100 hydrolysée de 610 g à 2,3 kg, Elite 100% Whey 907 g et Super Mass Gainer 2,7 kg. Dès {prixMin} DT, {nbEnStock} produits en stock.',
    h1: 'Dymatize Tunisie : ISO100 Hydrolyzed, Elite 100% Whey et Super Mass Gainer',
    introHtml:
      '<p>Sur Protein.tn, la ligne Dymatize la plus fournie est <strong>ISO100 Hydrolyzed</strong>, une whey isolate hydrolysée. Le pot de 610 à 660 g, selon le parfum, offre le plus grand choix : Cinnamon Cereal, Pebbles Birthday Cake, Fudge Brownie, Dunkin’ Glazed Donut, Chocolate Peanut Butter, Dunkin’ Mocha Latte, Strawberry, Cookies &amp; Cream et Dunkin’ Cappuccino. Le 1,37 kg existe en Cocoa Pebbles, Post Fruity Pebbles, Gourmet Chocolate et Gourmet Vanilla, le 2,3 kg notamment en Cocoa Pebbles et Fruity Pebbles.</p><p>Les autres lignes tiennent en quelques références. <strong>Elite 100% Whey</strong>, rangée au rayon whey protéine, est proposée en 907 g, parfum Rich Chocolate. <strong>Super Mass Gainer</strong>, le gainer de la marque, associe protéines et glucides ; il est référencé en 2,7 kg, parfum Fruity Pebbles. <strong>Energyze Pre-Workout</strong> est un pré-workout caféiné à mélanger à de l’eau, en 370 g (Peach Mango) ou en 400 g (Lemon Lime et Strawberry Lemonade).</p>',
    howToChooseTitle: 'ISO100, Elite 100% Whey ou Super Mass Gainer : quel Dymatize choisir ?',
    howToChooseBody:
      '<p>Partez de ce qui manque à votre alimentation, puis choisissez le format.</p><ul><li><strong>Une whey isolate</strong> : ISO100 Hydrolyzed. Si vous ne connaissez pas encore le parfum, commencez par un pot de 610 à 660 g, puis passez au 1,37 kg ou au 2,3 kg lorsque ce parfum existe dans le grand format. Pour comparer deux tailles, divisez le prix affiché par le poids net.</li><li><strong>Une whey pour le quotidien et pour vos recettes</strong> : Elite 100% Whey en 907 g, que Dymatize recommande aussi en cuisine et en pâtisserie.</li><li><strong>Des calories en plus des protéines</strong> : Super Mass Gainer en 2,7 kg. Il se choisit lorsque vos repas ne couvrent pas votre apport calorique ; si seules les protéines manquent, une whey suffit.</li><li><strong>Un produit à prendre avant la séance</strong> : Energyze Pre-Workout. Il contient de la caféine, et l’avertissement repris sur nos fiches le déconseille aux enfants et aux personnes sensibles à la caféine.</li></ul><p>Les valeurs par portion ne sont pas reprises ici, car elles changent d’un parfum et d’un format à l’autre : c’est l’étiquette de l’emballage livré qui sert de référence. ISO100 et Elite 100% Whey sont des protéines de lait, et plusieurs fiches ISO100 citent aussi le soja (lécithine de soja) parmi les allergènes. Dymatize indique sur son site qu’ISO100, Elite 100% Whey et Super Mass Gainer sont testés pour les substances interdites.</p>',
    faqs: [
      {
        question: 'Quel est le prix de l’ISO100 et des autres produits Dymatize ?',
        answer:
          'Les {nbEnStock} références Dymatize en stock vont de {prixMin} à {prixMax} DT.',
      },
      {
        question: 'Quelle différence entre Dymatize ISO100 et Elite 100% Whey ?',
        answer:
          'ISO100 Hydrolyzed est une whey isolate hydrolysée : Dymatize indique que toutes ses protéines proviennent d’isolat de lactosérum. Elite 100% Whey est classée au rayon whey protéine ; la marque précise que ses protéines viennent toutes du lactosérum et la recommande aussi pour la cuisine et la pâtisserie. Sur Protein.tn, ISO100 se décline de 610 g à 2,3 kg, Elite 100% Whey en 907 g parfum Rich Chocolate.',
      },
      {
        question: 'Quel format d’ISO100 choisir : 610 g, 1,37 kg ou 2,3 kg ?',
        answer:
          'Le parfum décide souvent du format, car tous ne sont pas proposés dans chaque taille. Les pots de 610 à 660 g offrent le plus grand choix et permettent de tester un goût. Le 1,37 kg se décline en Cocoa Pebbles, Post Fruity Pebbles, Gourmet Chocolate et Gourmet Vanilla, le 2,3 kg notamment en Cocoa Pebbles et Fruity Pebbles. Pour comparer deux tailles, divisez le prix affiché par le poids net.',
      },
      {
        question: 'Super Mass Gainer ou ISO100 pour une prise de masse ?',
        answer:
          'Tout dépend de ce qui manque à vos repas. S’ils couvrent vos calories mais pas vos protéines, une whey comme ISO100 ou Elite 100% Whey suffit. Si c’est l’apport calorique total qui manque, Super Mass Gainer associe protéines et glucides, en 2,7 kg parfum Fruity Pebbles. Les quantités par portion figurent sur l’étiquette de l’emballage.',
      },
      {
        question: 'Le pré-workout Dymatize Energyze contient-il de la caféine ?',
        answer:
          'Oui. Dymatize présente Energyze comme un pré-workout caféiné, et l’avertissement transcrit sur nos fiches le déconseille aux enfants et aux personnes sensibles à la caféine. Les parfums référencés sont Peach Mango en 370 g, Lemon Lime et Strawberry Lemonade en 400 g. La dose de caféine par mesure est imprimée sur l’étiquette du pot.',
      },
      {
        question: 'Les protéines Dymatize contiennent-elles du lait ?',
        answer:
          'Oui pour les deux whey : ISO100 et Elite 100% Whey sont des protéines de lactosérum, donc issues du lait. Les étiquettes ISO100 transcrites sur plusieurs de nos fiches mentionnent le lait et le soja parmi les allergènes. Pour Super Mass Gainer et Energyze Pre-Workout, la mention des allergènes imprimée sur l’emballage fait foi.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-isolate', name: 'Comparer ISO100 aux autres whey isolate', url: '/whey-isolate' },
      { slug: 'whey-proteine', name: 'Comparer Elite 100% Whey aux autres whey protéines', url: '/whey-proteine' },
      { slug: 'mass-gainers', name: 'Comparer Super Mass Gainer aux autres gainers', url: '/mass-gainers' },
      { slug: 'pre-workout', name: 'Comparer Energyze aux autres pré-workouts', url: '/pre-workout' },
      { slug: 'brands', name: 'Comparer Dymatize aux autres marques', url: '/brands' },
    ],
    relatedBrands: ['optimum-nutrition', 'muscletech', 'ultimate-nutrition', 'biotech-usa'],
    officialUrl: 'https://dymatize.com/',
  },

  muscletech: {
    metaTitle: 'MuscleTech Tunisie | Nitro-Tech & Cell-Tech — Protein.tn',
    metaDescription:
      'MuscleTech en Tunisie : whey Nitro-Tech 1,81 kg, Platinum 100% Creatine 450 g et Cell-Tech 1,36 kg. Dès {prixMin} DT, {nbEnStock} produits en stock.',
    h1: 'MuscleTech Tunisie : whey Nitro-Tech et ISO Whey, créatines Platinum et Cell-Tech',
    introHtml:
      '<p>La gamme <strong>MuscleTech</strong> s’ouvre sur la whey. <strong>Nitro-Tech Whey Protein</strong> se décline en 1,81 kg (Milk Chocolate, Vanilla Cream, Strawberry, Cookies &amp; Cream) et en 907 g (Milk Chocolate, Vanilla Cream), à côté de deux variantes, <strong>Nitro-Tech Ripped</strong> 1,8 kg et <strong>Nitro-Tech Whey Gold</strong> 2,3 kg. <strong>100% Grass-Fed Whey Protein</strong> (816 g, Deluxe Vanilla ou Triple Chocolate) est fabriquée à partir de lactosérum d’animaux nourris à l’herbe, d’après sa fiche. Côté isolats, <strong>ISO Whey</strong> se vend en pot de 2,27 kg et <strong>ISO Whey Clear</strong> en 503 g, arôme Lemon Berry Blizzard.</p><p>Les créatines vont de la poudre au comprimé : <strong>Platinum 100% Creatine</strong> 450 g et <strong>Platinum Creatine</strong> 400 g, <strong>Cell-Tech</strong> 1,36 kg (Tropical Citrus Punch), puis les <strong>Creatine Chews</strong> par 90 comprimés à croquer, Citrus Burst ou Boogieman Punch en édition limitée. En poudre à diluer, la marque propose aussi <strong>Amino Build</strong> (593 g et 614 g), <strong>Platinum 100% EAA+</strong> (387 g et 393 g) et le pré-workout <strong>EuphoriQ</strong> V2 (414 g et 416 g). Le reste tient en capsules et comprimés : Hydroxycut Hardcore Elite (100 capsules) et Hydroxycut Hardcore Super Elite (120 capsules), Clear Muscle à l’HMB (84 capsules molles), Test HD Elite (120 capsules), Platinum MultiVitamin (90 comprimés) et Platinum Fish Oil (100 capsules).</p>',
    howToChooseTitle: 'Nitro-Tech, ISO Whey ou Grass-Fed : quelle whey MuscleTech choisir ?',
    howToChooseBody:
      '<p>Entre ces whey, le choix porte d’abord sur ce que la poudre contient en plus des protéines, puis sur la texture et la taille du pot.</p><ul><li><strong>Nitro-Tech Whey Protein</strong> : une whey qui apporte aussi de la créatine monohydrate, 3 g par portion de 45 g d’après l’étiquette du pot 1,81 kg Milk Chocolate. Si vous prenez déjà une créatine seule, ajoutez ces 3 g à votre total de la journée.</li><li><strong>ISO Whey</strong> et <strong>ISO Whey Clear</strong> : deux isolats de lactosérum. Le premier se mélange à l’eau ou au lait comme une whey classique, d’après sa fiche ; le second donne une boisson claire et légère, d’après la marque.</li><li><strong>100% Grass-Fed Whey Protein</strong> : un concentré de lactosérum, à retenir si l’origine du lait compte pour vous.</li><li><strong>Format</strong> : 503 g à 907 g pour essayer un arôme, 1,8 kg à 2,3 kg pour un usage régulier sur plusieurs semaines.</li></ul><p>Aucune de ces whey n’est un gainer : la portion de 45 g de Nitro-Tech 1,81 kg Milk Chocolate apporte 160 kcal, d’après son étiquette. Elles complètent les protéines d’une alimentation déjà suffisante en calories. Côté allergènes, toutes ces protéines sont issues du lait : l’étiquette Nitro-Tech Milk Chocolate mentionne le lait et le soja, la fiche Grass-Fed des ingrédients à base de lait. Les valeurs changent d’un arôme à l’autre : l’étiquette du pot commandé reste la référence.</p>',
    faqs: [
      {
        question: 'Combien de protéines dans une portion de Nitro-Tech Whey Protein ?',
        answer:
          'D’après l’étiquette du pot 1,81 kg, arôme Milk Chocolate, une portion de 45 g apporte 30 g de protéines, 4 g de glucides dont 2 g de sucres, 3 g de matières grasses, 3 g de créatine monohydrate et 160 kcal. Ces valeurs varient selon l’arôme et le format : l’étiquette du pot que vous commandez fait foi.',
      },
      {
        question: 'Quel est le prix des produits MuscleTech ?',
        answer:
          'Les {nbEnStock} références MuscleTech en stock vont de {prixMin} à {prixMax} DT.',
      },
      {
        question: 'Platinum Creatine, Cell-Tech ou Creatine Chews : quelle créatine MuscleTech ?',
        answer:
          'Platinum 100% Creatine (450 g) et Platinum Creatine (400 g) sont des poudres de créatine monohydrate. Cell-Tech (1,36 kg) associe la créatine à un mélange de glucides, d’après sa liste d’ingrédients, et se boit dilué dans l’eau. Les Creatine Chews se présentent en 90 comprimés à croquer, sans shaker. La dose de créatine figure sur l’étiquette de chaque produit.',
      },
      {
        question: 'Quelle différence entre Nitro-Tech et ISO Whey de MuscleTech ?',
        answer:
          'L’étiquette de Nitro-Tech Whey Protein, pot 1,81 kg Milk Chocolate, déclare de la créatine monohydrate en plus des protéines. ISO Whey (2,27 kg) et ISO Whey Clear (503 g) sont des isolats de lactosérum, la version Clear donnant une boisson claire et légère plutôt qu’un shake crémeux. Le choix tient donc à la créatine incluse dans Nitro-Tech, à la texture recherchée et à la taille du pot.',
      },
      {
        question: 'Quels produits MuscleTech trouve-t-on sur Protein.tn ?',
        answer:
          'Le catalogue compte {nbProduits} références MuscleTech. En plus des whey et des créatines, on y trouve Amino Build et Platinum 100% EAA+ en poudre, le pré-workout EuphoriQ V2, Hydroxycut Hardcore Elite et Hardcore Super Elite, Clear Muscle à l’HMB, Test HD Elite, Platinum MultiVitamin et Platinum Fish Oil. Chaque fiche précise le format de la référence.',
      },
      {
        question: 'Comment se faire livrer un produit MuscleTech ?',
        answer:
          'Ajoutez au panier le format et l’arôme voulus, puis indiquez votre adresse de livraison. Les références en stock sont livrées en 24–72h partout en Tunisie, avec paiement à la livraison.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-proteine', name: 'Le rayon whey protéine', url: '/whey-proteine' },
      { slug: 'creatine', name: 'Créatines en poudre et à croquer', url: '/creatine' },
      { slug: 'whey-isolate', name: 'Comparer ISO Whey Clear aux autres whey isolate', url: '/whey-isolate' },
      { slug: 'pre-workout', name: 'Comparer EuphoriQ aux autres pré-workouts', url: '/pre-workout' },
      { slug: 'brands', name: 'Comparer MuscleTech aux autres marques', url: '/brands' },
    ],
    relatedBrands: ['optimum-nutrition', 'biotech-usa', 'kevin-levrone'],
    officialUrl: 'https://www.muscletech.com/',
  },

  ostrovit: {
    metaTitle: 'OstroVit Tunisie | Créatine, Whey & Vitamines — Protein.tn',
    metaDescription:
      'OstroVit en Tunisie : Creatine Monohydrate 300 g et 500 g, 100% Whey Protein 2 kg et Vitamin C 110 comprimés. Dès {prixMin} DT, {nbEnStock} en stock.',
    h1: 'OstroVit Tunisie : Creatine Monohydrate, EAA, L-Carnitina 1250 et vitamines',
    introHtml:
      '<p>OstroVit se présente sur son site comme une entreprise familiale polonaise qui fabrique ses compléments dans sa propre unité de production. Sur Protein.tn, sa gamme repose surtout sur des poudres simples et des gélules ou comprimés à dose fixe. Côté poudres d’entraînement : <strong>Creatine Monohydrate</strong> en pot de 300 g ou de 500 g, <strong>Glutamine</strong> 300 g, <strong>Citrulline Malate</strong> 210 g, <strong>Arginine</strong> 210 g et les acides aminés essentiels <a href="/eaa">EAA 400 g et EAA Advanced 520 g</a>, le premier au goût Grape Fruit. Côté protéines et calories, la <strong>100% Whey Protein</strong> 2 kg existe en banane et en tiramisu, le <strong>Delicious Gainer</strong> 4,5 kg en banane et en fraise, et le <strong>Carbo</strong> 1000 g est une poudre de glucides.</p><p>Le reste du catalogue se prend en gélules ou en comprimés : <strong>Vitamin C</strong> 110 comprimés, <strong>Vitamin D3</strong> 4000 UI en 120 gélules, <strong>Vitamin Forte</strong> 120 gélules, <strong>Omega 3</strong> 90 gélules, <strong>ZMA Advanced</strong> 60 gélules, <a href="/l-carnitine">L-Carnitina 1250</a> en 60 gélules, <strong>Ashwagandha</strong> 90 comprimés et <strong>Tribulus Terrestris</strong>. Seule exception, <strong>Collagen + Vitamin C</strong> se présente en poudre : un pot de 400 g au goût ananas.</p>',
    howToChooseTitle: 'Créatine, EAA ou L-Carnitina 1250 : quel produit OstroVit choisir ?',
    howToChooseBody:
      '<p>Partez de ce que votre alimentation couvre déjà, puis choisissez la référence qui comble l’écart.</p><ul><li><strong>De la créatine seule</strong> : Creatine Monohydrate. L’étiquette du pot de 500 g, nature, déclare 3 g de créatine pour une portion de 3,4 g de créatine monohydrate. Le pot de 300 g porte le même nom ; son étiquette n’est pas encore reprise sur sa fiche, c’est donc le pot qui fait référence.</li><li><strong>Des acides aminés autour de la séance</strong> : EAA 400 g, goût Grape Fruit, ou EAA Advanced 520 g. Ils s’ajoutent à un apport en protéines suffisant et ne remplacent pas une whey ; comparez leurs étiquettes, car aucune des deux fiches ne détaille encore les acides aminés par portion.</li><li><strong>Des protéines ou des calories en plus</strong> : la 100% Whey Protein 2 kg si seules les protéines manquent, le Carbo 1000 g pour des glucides seuls, le Delicious Gainer 4,5 kg quand il faut ajouter les deux.</li><li><strong>Une prise quotidienne en gélule ou en comprimé</strong> : L-Carnitina 1250, une gélule par jour selon le fabricant, ou Vitamin C, un comprimé par portion.</li></ul><p>Allergènes : les étiquettes transcrites de la Creatine Monohydrate 500 g, de la Vitamin C et de la L-Carnitina 1250 signalent une fabrication dans un site qui traite notamment du lait, du soja et du poisson, et l’enveloppe des gélules de L-Carnitina 1250 contient de la gélatine. La 100% Whey Protein est une protéine de lactosérum, donc issue du lait. Pour les autres références, lisez l’étiquette du pot avant de commander.</p>',
    faqs: [
      {
        question: 'Combien de créatine dans une dose de Creatine Monohydrate OstroVit ?',
        answer:
          'D’après l’étiquette du pot de 500 g, nature, une portion de 3,4 g de créatine monohydrate apporte 3 g de créatine. La même étiquette indique une fabrication dans une usine qui utilise des ingrédients issus du lait, du soja et du poisson. Pour le pot de 300 g, dont l’étiquette n’est pas encore transcrite sur la fiche, référez-vous au pot.',
      },
      {
        question: 'Creatine Monohydrate OstroVit : faut-il prendre le pot de 300 g ou de 500 g ?',
        answer:
          'Les deux pots sont vendus sous le même nom, Creatine Monohydrate. À dose journalière égale, le pot de 500 g dure simplement plus longtemps. La grille affiche le prix de chaque format : rapportez-le au poids du pot pour comparer le coût au gramme. La portion de référence du pot de 300 g est celle inscrite sur son étiquette.',
      },
      {
        question: 'Quelle différence entre EAA 400 g et EAA Advanced 520 g d’OstroVit ?',
        answer:
          'Le format d’abord : 400 g pour l’EAA, 520 g pour l’EAA Advanced. La fiche de l’EAA 400 g indique l’arôme Grape Fruit, celle de l’EAA Advanced ne précise pas d’arôme. Aucune des deux fiches ne détaille encore la quantité de chaque acide aminé par portion : comparez les étiquettes des pots pour la dose et la liste d’ingrédients.',
      },
      {
        question: 'Combien de L-carnitine dans une gélule de L-Carnitina 1250 OstroVit ?',
        answer:
          'D’après l’étiquette de la boîte de 60 gélules, une gélule apporte 1250 mg de L-carnitine tartrate, dont 840 mg de L-carnitine, et le fabricant indique une gélule par jour, soit 60 portions par boîte. L’enveloppe de la gélule contient de la gélatine. L’étiquette précise que le produit ne convient pas aux enfants, ni aux femmes enceintes ou allaitantes.',
      },
      {
        question: 'Combien de vitamine C dans un comprimé de Vitamin C OstroVit ?',
        answer:
          'D’après l’étiquette de la boîte de 110 comprimés, chaque comprimé apporte 1000 mg de vitamine C. L’étiquette signale aussi une fabrication dans une usine qui utilise du lait, du soja, des arachides, des fruits à coque, du sésame, du gluten, des œufs, des crustacés et du poisson, un point à vérifier en cas d’allergie.',
      },
      {
        question: 'Quel est le prix des produits OstroVit en Tunisie ?',
        answer:
          'Les {nbEnStock} références OstroVit en stock vont de {prixMin} à {prixMax} DT.',
      },
    ],
    relatedCategories: [
      { slug: 'creatine', name: 'Découvrir les créatines monohydrate', url: '/creatine' },
      { slug: 'glutamine', name: 'Comparer la Glutamine 300 g aux autres glutamines', url: '/glutamine' },
      { slug: 'whey-proteine', name: 'Comparer les whey protéines', url: '/whey-proteine' },
      { slug: 'vitamines', name: 'Comparer Vitamin C et Vitamin D3 aux autres vitamines', url: '/vitamines' },
      { slug: 'brands', name: 'Comparer OstroVit aux autres marques', url: '/brands' },
    ],
    relatedBrands: ['biotech-usa', 'muscletech', 'scenit-nutrition', 'weightworld'],
    officialUrl: 'https://ostrovit.com/',
  },

  'kevin-levrone': {
    metaTitle: 'Kevin Levrone Tunisie | Levro Mass, Gold Whey — Protein.tn',
    metaDescription:
      'Kevin Levrone en Tunisie : Levro Legendary Mass 6,8 kg, Gold Whey 2 kg et Gold Creatine 300 g. Dès {prixMin} DT, {nbEnStock} produits en stock.',
    h1: 'Kevin Levrone Tunisie : Levro Legendary Mass, Gold Whey et Gold Creatine',
    introHtml:
      '<p>Chez Protein.tn, la gamme <strong>Kevin Levrone</strong> s’articule surtout autour de la prise de masse et de la série Gold. Pour la prise de masse, le gainer <strong>Levro Legendary Mass</strong> existe en sac de 6,8 kg (parfums Vanilla et Cookies) et en sac de 3 kg (Vanilla). Le <strong>Pack Prise de Masse Pro</strong> l’associe, d’après sa fiche, à la Gold Creatine et à un shaker de 700 ml. La série Gold réunit la <strong>Gold Whey</strong> 2 kg en parfum Snickers, la <strong>Gold ISO</strong> 2 kg en Chocolat, la <strong>Gold Creatine</strong> 300 g sans arôme, la <strong>Gold L-Arginine</strong> en 120 gélules et le <strong>Gold Power Core Multivitamin</strong> en 120 comprimés.</p><p>Deux <a href="/l-carnitine">L-carnitines liquides</a> en flacon de 500 ml complètent le catalogue : la <strong>Gold L-Carnitine 3000</strong>, rattachée à la série Gold, et l’<strong>Anabolic L-Carnitine 3000</strong>. Leurs noms se ressemblent, mais ce sont deux produits distincts, avec chacun sa propre fiche. Le pré-workout <strong>Shaaboom Pump</strong> 385 g, parfum Grape Fruit, ferme la liste.</p>',
    howToChooseTitle: 'Gainer, whey ou isolate : quel produit Kevin Levrone choisir ?',
    howToChooseBody:
      '<p>Partez de votre apport calorique. Si manger assez est votre point bloquant, regardez le <strong>Levro Legendary Mass</strong>. D’après l’étiquette du sac de 6,8 kg transcrite sur sa fiche, qui ne précise pas de parfum, une portion de 200 g (4 mesures) apporte 771 kcal, 138 g de glucides et 42 g de protéines, pour 34 portions par sac. Ses protéines viennent du lait : concentré de protéines de lait, whey concentrée, isolat et hydrolysat de whey, caséine hydrolysée. Il est fabriqué dans une usine qui traite aussi soja, œuf, arachides, fruits à coque et blé. Pour le sac de 3 kg, comme pour le parfum choisi, c’est l’étiquette du sac qui fait foi.</p><p>Si vos repas couvrent déjà les calories, une protéine en poudre suffit. D’après leurs fiches, la <strong>Gold Whey</strong> 2 kg est une whey concentrée et la <strong>Gold ISO</strong> 2 kg une whey isolate ; toutes deux sont des protéines de lactosérum, donc issues du lait, et l’étiquette du pot donne les grammes de protéines par dose. La <strong>Gold Creatine</strong> 300 g est une poudre sans arôme : elle s’ajoute au shaker quel que soit le parfum de votre protéine. Pour les deux <strong>L-Carnitine 3000</strong> liquides et le <strong>Shaaboom Pump</strong>, comparez la dose par prise et la liste d’ingrédients sur l’étiquette du flacon ou du pot avant la première utilisation.</p>',
    faqs: [
      {
        question: 'Quels produits Kevin Levrone sont proposés sur Protein.tn ?',
        answer:
          'Le catalogue réunit le gainer Levro Legendary Mass en 6,8 kg et 3 kg, le Pack Prise de Masse Pro, la Gold Whey 2 kg, la Gold ISO 2 kg, la Gold Creatine 300 g, la Gold L-Arginine 120 gélules, deux L-carnitines liquides de 500 ml (Gold L-Carnitine 3000 et Anabolic L-Carnitine 3000), le pré-workout Shaaboom Pump 385 g et le Gold Power Core Multivitamin 120 comprimés. La grille indique la disponibilité de chacun.',
      },
      {
        question: 'Combien de calories dans une portion de Levro Legendary Mass ?',
        answer:
          'D’après l’étiquette du sac de 6,8 kg transcrite sur sa fiche, qui ne précise pas de parfum, une portion de 200 g, soit 4 mesures, apporte 771 kcal, 138 g de glucides dont 20 g de sucres, 42 g de protéines, 5,2 g de lipides, 2 g de fibres et 0,2 g de sel. Le sac compte 34 portions. Pour le sac de 3 kg, c’est sa propre étiquette qui fait foi.',
      },
      {
        question: 'Quelle différence entre Gold Whey et Gold ISO ?',
        answer:
          'D’après leurs fiches, Gold Whey 2 kg est une whey concentrée, référencée en parfum Snickers, et Gold ISO 2 kg une whey isolate, référencée en Chocolat. Les deux sont des protéines de lactosérum, issues du lait. Pour comparer les protéines, les glucides et les lipides par dose, lisez l’étiquette du pot : c’est elle qui fait foi pour le parfum choisi.',
      },
      {
        question: 'Combien de doses contient la Gold Creatine 300 g ?',
        answer:
          'D’après l’étiquette du pot de 300 g, sans arôme, une dose de 5 g, soit environ une mesure, apporte 5 g de créatine monohydrate, dont 4,4 g de créatine, et 1,4 mg de vitamine B6, soit 100 % de l’apport de référence. Le pot contient 60 doses, et la liste d’ingrédients se limite à ces deux composants.',
      },
      {
        question: 'Que contient le Pack Prise de Masse Pro ?',
        answer:
          'D’après sa fiche, le pack réunit trois articles : le gainer Levro Legendary Mass, la Gold Creatine et un shaker de 700 ml. La fiche ne précise pas le format du gainer inclus : c’est l’étiquette du sac reçu qui fait foi. Celle du sac de 6,8 kg déclare des protéines de lait ; celle de la Gold Creatine 300 g ne liste que la créatine monohydrate et la vitamine B6.',
      },
      {
        question: 'Quel est le prix des produits Kevin Levrone ?',
        answer:
          'Les {nbEnStock} références en stock vont de {prixMin} à {prixMax} DT.',
      },
    ],
    relatedCategories: [
      { slug: 'mass-gainers', name: 'Comparer les mass gainers', url: '/mass-gainers' },
      { slug: 'whey-proteine', name: 'Whey protéines : tous les formats', url: '/whey-proteine' },
      { slug: 'creatine', name: 'Voir nos créatines en Tunisie', url: '/creatine' },
      { slug: 'pre-workout', name: 'Comparer les pré-workouts', url: '/pre-workout' },
      { slug: 'brands', name: 'Comparer Kevin Levrone aux autres marques', url: '/brands' },
    ],
    relatedBrands: ['optimum-nutrition', 'eric-favre', 'big-ramy-labs'],
    officialUrl: 'https://levrosupplements.com',
  },

  'optimum-nutrition': {
    metaTitle: 'Optimum Nutrition Tunisie | Whey Gold Standard — Protein.tn',
    metaDescription:
      'Optimum Nutrition en Tunisie : Gold Standard 100% Whey 2,27 kg, Serious Mass 5,45 kg et Micronised Creatine 317 g. Dès {prixMin} DT, {nbEnStock} produits en stock.',
    h1: 'Optimum Nutrition Tunisie : whey Gold Standard, Hydro Whey et Serious Mass',
    introHtml:
      '<p>La gamme repose d’abord sur la <strong>Gold Standard 100% Whey</strong>, en trois tailles : le petit pot de 899 g à 908 g selon le parfum (837 g en Cookies &amp; Cream), le pot de 2,1 kg à 2,29 kg et le 4,5 kg. Ses parfums : Double Rich Chocolate, Extreme Milk Chocolate, Chocolate Malt, Chocolate Mint, Rocky Road, Cookies &amp; Cream, Vanilla Ice Cream, French Vanilla Creme, Delicious Strawberry, Strawberry Banana et Banana Cream. La <strong>Platinum Hydro Whey</strong>, à base d’isolat de whey hydrolysé, existe de 820 g à 1,64 kg en Turbo Chocolate et en vanille, et la <strong>Gold Standard 100% Casein</strong>, une caséine micellaire, de 825 g à 1,8 kg en Creamy Vanilla, Chocolate Supreme et Chocolate Peanut Butter.</p><p>Côté gainer, <strong>Serious Mass</strong> existe en 2,7 kg et 5,45 kg. Suivent la <strong>Micronised Creatine</strong> 317 g et la Micronized Creatine Powder 300 g, la Glutamine Powder 630 g et 1 kg, les <a href="/bcaa">BCAA 1000 en gélules et l’Instantized BCAA 5000 en poudre</a>, le Superior Amino 2222 en 320 comprimés, l’Amino Energy 270 g, le HMB en 90 gélules, le Zinc Magnesium Aspartate en 180 gélules, les <a href="/vitamines">multivitamines Opti-Men et Opti-Women</a> et les packs Professionnel, Premium Elite et Gain musculaire rapide.</p>',
    howToChooseTitle: 'Gold Standard, Hydro Whey ou caséine : quelle protéine choisir ?',
    howToChooseBody:
      '<p>Partez de votre besoin : la source de protéines, le moment de prise, la taille du pot, puis l’apport calorique.</p><ul><li><strong>Gold Standard 100% Whey</strong> pour l’apport protéique quotidien. Le fabricant y associe isolat, concentré et isolat hydrolysé de whey. D’après l’étiquette du pot 2,27 kg Double Rich Chocolate, une portion de 31 g apporte 24 g de protéines, 1,6 g de glucides et 116 kcal.</li><li><strong>Platinum Hydro Whey</strong> si vous cherchez une whey hydrolysée : selon le fabricant, l’hydrolyse découpe les protéines en fragments plus petits. D’après la fiche du pot 1,59 kg vanille (valeurs Vanilla Bean), une portion de 40 g apporte 30 g de protéines, 1,8 g de glucides et 142 kcal.</li><li><strong>Gold Standard 100% Casein</strong> pour une prise le soir : le fabricant la présente comme une caséine micellaire à absorption lente et conseille de la prendre avant le coucher.</li><li><strong>Serious Mass</strong> lorsque l’alimentation ne couvre pas l’apport calorique visé. D’après l’étiquette du format 5,45 kg chocolat, une portion de 336 g apporte 1 262 kcal, 248 g de glucides et 50 g de protéines.</li></ul><p>Pour la taille, le petit pot (837 g à 908 g selon le parfum) permet d’essayer un parfum avant de passer au pot de 2,1 kg à 2,29 kg ou au 4,5 kg. Les fiches de la Gold Standard 100% Whey, de la Platinum Hydro Whey et de Serious Mass signalent du lait et du soja. Les valeurs nutritionnelles varient d’un parfum à l’autre : relisez l’étiquette du pot que vous recevez.</p>',
    faqs: [
      {
        question: 'Existe-t-il une whey Gold Standard de 1 kg en Tunisie ?',
        answer:
          'Aucune Gold Standard 100% Whey de 1 kg n’est référencée sur Protein.tn. Le format qui s’en approche est le petit pot, qui pèse 899 g, 907 g ou 908 g selon le parfum, et 837 g en Cookies & Cream. Viennent ensuite les pots de 2,1 kg à 2,29 kg, puis le 4,5 kg. La grille indique pour chaque pot s’il est en stock ou sur commande.',
      },
      {
        question: 'Quel est le prix de la whey Gold Standard en Tunisie ?',
        answer:
          'Le prix de la Gold Standard 100% Whey dépend du format, de 837 g à 4,5 kg, et du parfum.',
      },
      {
        question: 'Combien de protéines dans une dose de Gold Standard 100% Whey ?',
        answer:
          'D’après l’étiquette du pot 2,27 kg Double Rich Chocolate, une portion de 31 g apporte 24 g de protéines, 1,6 g de glucides dont 1 g de sucres, 1,4 g de matières grasses et 116 kcal. La fiche signale du lait et du soja, et les valeurs changent selon le parfum : relisez l’étiquette du pot reçu.',
      },
      {
        question: 'Quelle différence entre Gold Standard, Hydro Whey et caséine ?',
        answer:
          'La Gold Standard 100% Whey mélange isolat, concentré et isolat hydrolysé de whey. La Platinum Hydro Whey tire ses protéines d’un isolat de whey hydrolysé, et sa liste d’ingrédients y ajoute un mélange de BCAA ; d’après la fiche du pot 1,59 kg vanille (valeurs Vanilla Bean), 40 g apportent 30 g de protéines et 142 kcal. La Gold Standard 100% Casein est une caséine micellaire, que le fabricant décrit comme une protéine à absorption lente.',
      },
      {
        question: 'Serious Mass ou Gold Standard Whey : que choisir ?',
        answer:
          'Tout dépend de l’apport calorique visé. D’après l’étiquette du format 5,45 kg chocolat, une portion de 336 g de Serious Mass apporte 1 262 kcal, 248 g de glucides et 50 g de protéines, contre 116 kcal et 24 g de protéines pour 31 g de Gold Standard (pot 2,27 kg Double Rich Chocolate). La whey complète les protéines d’une alimentation suffisante ; le gainer ajoute surtout des glucides.',
      },
      {
        question: 'Quelle créatine Optimum Nutrition choisir ?',
        answer:
          'Deux créatines monohydrate sans arôme sont référencées : la Micronised Creatine en pot de 317 g et la Micronized Creatine Powder en 300 g. D’après l’étiquette du pot 317 g, une portion de 3,4 g de créatine monohydrate apporte 3 g de créatine. Les contenances étant proches, le choix se fait surtout sur la disponibilité, indiquée pour chaque pot dans la grille ; suivez la dose conseillée sur l’étiquette du pot reçu.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-proteine', name: 'Notre sélection de whey protéines', url: '/whey-proteine' },
      { slug: 'caseine', name: 'Comparer Gold Standard 100% Casein aux autres caséines', url: '/caseine' },
      { slug: 'mass-gainers', name: 'Le rayon mass gainer', url: '/mass-gainers' },
      { slug: 'creatine', name: 'Comparer nos créatines', url: '/creatine' },
      { slug: 'brands', name: 'Comparer Optimum Nutrition aux autres marques', url: '/brands' },
    ],
    relatedBrands: ['biotech-usa', 'muscletech', 'kevin-levrone', 'real-pharm'],
    officialUrl: 'https://www.optimumnutrition.com/',
  },

  'biotech-usa': {
    metaTitle: 'BioTech USA Tunisie | Pure Whey & Iso Whey Zero — Protein.tn',
    metaDescription:
      'BioTech USA en Tunisie : 100% Pure Whey et Iso Whey Zero 2,27 kg, créatine 300 g, BCAA Zero et vitamines. Dès {prixMin} DT, {nbEnStock} produits en stock.',
    h1: 'BioTech USA Tunisie : Mega Creatine, 100% Creatine Monohydrate et 100% Pure Whey',
    introHtml:
      '<p>La gamme <strong>BioTech USA en Tunisie</strong> se partage entre poudres d’un côté, gélules et comprimés de l’autre. Côté créatine, chaque référence est de la créatine monohydrate : <strong>Mega Creatine</strong> en pot de 306 g, à base de matière première Creapure®, et <strong>100% Creatine Monohydrate</strong>, déclinée en 300 g et en 500 g. Côté protéines, <strong>100% Pure Whey</strong> 2,27 kg associe whey concentrée et whey isolate, en arômes Caramel et Cookies, tandis qu’<strong>Iso Whey Zero</strong> 2,27 kg est une whey isolate référencée en arôme Banane. S’y ajoutent <strong>BCAA Zero</strong> 360 g, <strong>L-Arginine</strong> 300 g et <strong>Carbox</strong> 1 kg, une poudre de glucides en arôme Pêche.</p><p>Le reste de la gamme se prend en gélules, capsules ou comprimés. Minéraux : <strong>Zinc Duo</strong> 60 capsules, <strong>Zinc + Chelate</strong> en comprimés, dont la liste d’ingrédients réunit oxyde de zinc et bisglycinate de zinc, et <strong>ZMA</strong>, qui associe zinc, magnésium et vitamine B6. Vitamines : <strong>One-A-Day</strong>, le complexe multivitaminé de BioTech USA en flacon de 100 comprimés, et <strong>Multivitamin for Men</strong> 60 comprimés. Acides gras : <strong>Mega Omega 3</strong> 90 capsules. Extraits de plantes : <strong>Ashwagandha</strong> 60 gélules et <strong>Tribulus Maximus</strong> 90 comprimés. Enfin, <strong>L-Carnitine Chrome</strong> 60 capsules associe L-carnitine et chrome.</p>',
    howToChooseTitle: 'Quelle créatine et quelle whey BioTech USA choisir ?',
    howToChooseBody:
      '<p><strong>Pour la créatine</strong>, tous les pots contiennent de la créatine monohydrate : le choix porte sur la source et la contenance. Prenez <strong>Mega Creatine</strong> 306 g si vous tenez à la matière première Creapure®. Sinon, <strong>100% Creatine Monohydrate</strong> existe sous le même nom en 300 g et en 500 g, et la fiche du 300 g la décrit comme micronisée et non aromatisée. À dose égale, le grand pot dure plus longtemps : comparez le prix au gramme. La dose quotidienne à suivre est celle inscrite sur l’étiquette du pot. La créatine n’apporte pas de protéines et s’ajoute à une whey sans la remplacer.</p><p><strong>Pour la whey</strong>, les deux pots pèsent 2,27 kg mais les portions diffèrent. D’après l’étiquette de la version Natural reprise sur sa fiche, 28 g de <strong>100% Pure Whey</strong> apportent 22 g de protéines, 2,2 g de glucides dont 2,2 g de sucres, 1,7 g de matières grasses et 114 kcal ; pour Caramel et Cookies, lisez le pot. Pour <strong>Iso Whey Zero</strong> arôme Banane, l’étiquette déclare 21 g de protéines, 0,7 g de glucides dont 0,5 g de sucres, 0,5 g de matières grasses et 92 kcal pour 25 g, avec une teneur réduite en lactose. Pure Whey sert à compléter vos protéines au quotidien ; Iso Whey Zero convient si vous cherchez moins de glucides et de lipides par portion. Les deux contiennent du lait, et l’étiquette de Pure Whey précise une fabrication dans une usine qui utilise aussi œuf, soja et fruits à coque.</p>',
    faqs: [
      {
        question: 'Mega Creatine ou 100% Creatine Monohydrate : quelle créatine BioTech USA prendre ?',
        answer:
          'Les deux sont de la créatine monohydrate. Mega Creatine, vendue en pot de 306 g, est à base de matière première Creapure®. 100% Creatine Monohydrate existe en 300 g et en 500 g sous le même nom ; à dose égale, le 500 g dure simplement plus longtemps. Pour la dose quotidienne, suivez celle inscrite sur l’étiquette du pot reçu.',
      },
      {
        question: 'Combien de protéines dans une portion de 100% Pure Whey BioTech USA ?',
        answer:
          'Selon l’étiquette de la version Natural reprise sur la fiche du pot 2,27 kg, une portion de 28 g apporte 22 g de protéines pour 114 kcal, avec 2,2 g de glucides et 1,7 g de matières grasses. Pour les arômes référencés, Caramel et Cookies, les valeurs à suivre sont celles du pot reçu. La poudre contient du lait.',
      },
      {
        question: '100% Pure Whey ou Iso Whey Zero : quelle différence ?',
        answer:
          '100% Pure Whey mélange whey concentrée et whey isolate, alors qu’Iso Whey Zero est une whey isolate dont l’étiquette signale une teneur réduite en lactose. Par portion, l’étiquette d’Iso Whey Zero arôme Banane déclare 0,7 g de glucides et 0,5 g de matières grasses pour 25 g, contre 2,2 g et 1,7 g pour 28 g de Pure Whey version Natural. Les deux sont vendues en 2,27 kg et contiennent du lait.',
      },
      {
        question: 'Quels produits BioTech USA en gélules ou comprimés sont proposés ?',
        answer:
          'Zinc Duo 60 capsules, L-Carnitine Chrome 60 capsules, Ashwagandha 60 gélules, Mega Omega 3 90 capsules, Tribulus Maximus 90 comprimés, ZMA, Zinc + Chelate et deux complexes multivitaminés, One-A-Day en 100 comprimés et Multivitamin for Men en 60 comprimés. One-A-Day est ici un produit BioTech USA. Pour chacun, la dose quotidienne et les allergènes figurent sur l’étiquette.',
      },
      {
        question: 'Quel est le prix des produits BioTech USA ?',
        answer:
          'Les {nbEnStock} références en stock vont de {prixMin} à {prixMax} DT.',
      },
      {
        question: 'BioTech USA est-elle une marque américaine ?',
        answer:
          'D’après sa page de présentation, BioTech USA est une marque d’origine américaine, reprise en 1999 par une entreprise familiale hongroise. Sur Protein.tn, sa gamme va de la créatine et de la whey en poudre aux gélules et comprimés à usage quotidien.',
      },
    ],
    relatedCategories: [
      { slug: 'creatine', name: 'Comparer Mega Creatine aux autres créatines', url: '/creatine' },
      { slug: 'whey-proteine', name: 'Comparer 100% Pure Whey aux autres whey protéines', url: '/whey-proteine' },
      { slug: 'whey-isolate', name: 'Comparer Iso Whey Zero aux autres whey isolate', url: '/whey-isolate' },
      { slug: 'bcaa', name: 'Comparer BCAA Zero aux autres BCAA', url: '/bcaa' },
      { slug: 'brands', name: 'Comparer BioTech USA aux autres marques', url: '/brands' },
    ],
    relatedBrands: ['optimum-nutrition', 'muscletech', 'ostrovit', 'weightworld'],
    officialUrl: 'https://biotechusa.com/',
  },

  'gsn-great-sport-nutrition': {
    metaTitle: 'GSN Great Sport Nutrition Tunisie : whey, créatine et gainer',
    metaDescription:
      'GSN Great Sport Nutrition en Tunisie : Pure Whey et Nitro Whey 2 kg, Isolate Pro 2 kg, Creatine Monohydrate 200 g et 500 g, Big Mass Gainer 3 kg et 6 kg.',
    h1: 'GSN Great Sport Nutrition Tunisie : Pure Whey, Isolate Pro, créatine et Big Mass Gainer',
    introHtml:
      '<p>Sur Protein.tn, la gamme <strong>GSN Great Sport Nutrition</strong> s’organise autour de trois besoins : les protéines, la créatine et les calories. Les trois poudres protéinées sont référencées en 2 kg : <strong>Pure Whey</strong> et <strong>Nitro Whey</strong>, rangées en whey protéine, et <strong>Isolate Pro</strong>, rangée en whey isolate. La <strong>Creatine Monohydrate</strong> se présente en pot de 200 g et de 500 g. Le <strong>Big Mass Gainer</strong> se décline en 3 kg et en 6 kg ; seul le 6 kg est référencé avec un arôme, Banane.</p><p>Les lignes GSN ne se départagent pas sur le même critère. Entre les trois poudres protéinées, la contenance est identique : le choix porte sur la famille, whey protéine polyvalente pour Pure Whey et Nitro Whey, whey isolate plus filtrée pour Isolate Pro. Pour la créatine et le gainer, c’est l’inverse : un seul nom de produit, deux contenances. Nos fiches GSN ne transcrivent pas de tableau nutritionnel ; pour les grammes de protéines, de glucides ou les calories par portion, l’étiquette du pot reçu fait foi.</p>',
    howToChooseTitle: 'Pure Whey, Nitro Whey ou Isolate Pro : quelle protéine GSN choisir ?',
    howToChooseBody:
      '<p>Chaque ligne GSN répond à un besoin différent : identifiez d’abord ce que vos repas ne couvrent pas.</p><ul><li><strong>Compléter vos protéines au quotidien</strong> : Pure Whey ou Nitro Whey, les deux références GSN rangées en whey protéine, toutes deux en 2 kg. Comparez sur leurs étiquettes la taille de la portion et la liste des ingrédients.</li><li><strong>Limiter glucides et lipides par portion</strong> : Isolate Pro, rangée en whey isolate, la famille dont la poudre est filtrée davantage pour concentrer la part de protéines.</li><li><strong>Atteindre votre apport calorique</strong> : Big Mass Gainer, qui associe des glucides aux protéines. Le 3 kg permet d’essayer le produit, le 6 kg couvre un usage plus long.</li><li><strong>Ajouter de la créatine</strong> : Creatine Monohydrate en 200 g ou en 500 g. Elle ne contient pas de protéines et ne tient donc pas lieu de whey.</li></ul><p>Avant de commander, lisez l’étiquette : nos fiches GSN ne reprennent pas le tableau nutritionnel du pot, donc la dose, le nombre de portions et la liste des ingrédients se vérifient sur l’emballage. Pure Whey et Nitro Whey sont décrites sur leurs fiches comme des protéines de lactosérum, issu du lait ; contrôlez la mention des allergènes sur leur étiquette, comme sur celles d’Isolate Pro et du Big Mass Gainer.</p>',
    faqs: [
      {
        question: 'Quels produits GSN Great Sport Nutrition trouve-t-on sur Protein.tn ?',
        answer:
          'Le catalogue compte {nbProduits} références GSN. On y trouve Pure Whey, Nitro Whey et Isolate Pro en 2 kg, la Creatine Monohydrate en 200 g et en 500 g, et le Big Mass Gainer en 3 kg et en 6 kg. Chaque fiche affiche le prix et la disponibilité de son format.',
      },
      {
        question: 'Quelle différence entre GSN Pure Whey, Nitro Whey et Isolate Pro ?',
        answer:
          'Pure Whey et Nitro Whey sont rangées en whey protéine, Isolate Pro en whey isolate. Une whey isolate passe par une filtration supplémentaire qui vise plus de protéines par portion pour moins de glucides et de lipides. Les trois sont proposées en 2 kg. Pour départager deux références, comparez les valeurs par portion imprimées sur l’étiquette de chaque pot.',
      },
      {
        question: 'Créatine GSN 200 g ou 500 g : quel pot choisir ?',
        answer:
          'Les deux pots portent le même nom, Creatine Monohydrate, et nos fiches ne les distinguent que par la contenance et le prix. À dose journalière identique, le 500 g dure deux fois et demie plus longtemps que le 200 g. Comparez le prix des deux formats dans la grille et suivez la dose indiquée sur l’étiquette.',
      },
      {
        question: 'GSN Big Mass Gainer ou whey : que choisir selon vos apports ?',
        answer:
          'Tout dépend de ce qui vous manque. Si vos repas couvrent vos calories mais pas vos protéines, une whey GSN suffit. Si vous peinez à atteindre votre apport calorique quotidien, le Big Mass Gainer apporte des glucides en plus des protéines. Le nombre de calories par portion se lit sur l’étiquette du pot.',
      },
      {
        question: 'Big Mass Gainer GSN 3 kg ou 6 kg : quelle différence ?',
        answer:
          'Les deux formats portent le même nom, Big Mass Gainer. Seul le 6 kg est référencé avec un arôme, Banane ; le 3 kg n’en indique aucun : demandez-nous l’arôme disponible avant de commander. À portion égale, le 6 kg dure deux fois plus longtemps que le 3 kg ; la portion à utiliser figure sur l’étiquette.',
      },
      {
        question: 'Quel est le prix de la whey, de la créatine et du gainer GSN ?',
        answer:
          'Les {nbEnStock} références GSN en stock vont de {prixMin} à {prixMax} DT.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-proteine', name: 'Whey protéines en poudre', url: '/whey-proteine' },
      { slug: 'whey-isolate', name: 'Le rayon whey isolate', url: '/whey-isolate' },
      { slug: 'creatine', name: 'Créatines disponibles en Tunisie', url: '/creatine' },
      { slug: 'mass-gainers', name: 'Mass gainers : tous les formats', url: '/mass-gainers' },
      { slug: 'brands', name: 'Comparer GSN Great Sport Nutrition aux autres marques', url: '/brands' },
    ],
    relatedBrands: ['real-pharm', 'kevin-levrone', 'biotech-usa'],
  },

  'real-pharm': {
    metaTitle: 'Real Pharm Tunisie | Whey, Isolate, Créatine — Protein.tn',
    metaDescription:
      'Real Pharm en Tunisie : Real Whey 100, Real Isolate 1,8 kg, Real Casein et Real Mass 6,8 kg. Dès {prixMin} DT, {nbEnStock} produits en stock.',
    h1: 'Real Pharm Tunisie : Real Whey, Real Isolate et créatine',
    introHtml:
      '<p>La gamme <strong>Real Pharm en Tunisie</strong> est l’une des plus larges du catalogue et couvre quatre usages. Les protéines d’abord : <strong>Real Whey 100</strong> 2,250 kg (Chocolat), <strong>Real Isolate</strong> 1,8 kg (Vanille), <strong>Real Casein 100</strong> 700 g (Fraise) et <strong>Muscle On</strong> en 1 kg (Cookies) et 2,27 kg (Chocolat), une protéine multi-sources. Les calories ensuite : <strong>Real Mass</strong> 6,8 kg (Cookies) et <strong>Carbo One</strong> 1 kg (Watermelon), une poudre de glucides seule. Les poudres de performance : <strong>Creatine Monohydrate</strong> en 150 g, 300 g et 500 g, <strong>BCAA 8:1:1</strong> 400 g (Fraise), <strong>EAA</strong> 420 g (Ananas), <strong>Beta Alanine</strong> 300 g (Fruit Punch), <strong>Citrulline</strong> 200 g et <strong>CitruArgin</strong> 300 g (Fruit de la passion), plus deux pre-workouts, <strong>King Real</strong> 500 g (Watermelon) et <strong>Behemoth</strong> 500 g. Enfin les gélules et comprimés du quotidien : Collagen Marine 300 g, Vitamin D3 + K2, Vitamax Men, Zinc, ZMA, Biotyna, Tribulus, Ashwagandha et Omega 3-6-9.</p>',
    howToChooseTitle: 'Quel produit Real Pharm choisir ?',
    howToChooseBody:
      '<p>Sur la partie protéines, les trois références principales ne visent pas le même usage. <strong>Real Isolate</strong> est la plus concentrée : sur le format 1,8 kg en arôme Vanille, l’étiquette du fabricant transcrite sur notre fiche déclare une portion de 30 g apportant 25,8 g de protéines, 106 kcal, 0,3 g de glucides dont 0,3 g de sucres et 0,09 g de lipides, pour 60 portions par pot. Ces valeurs sont annoncées pour les arômes hors chocolat, et le produit contient du lait. <strong>Real Whey 100</strong> est la whey polyvalente, <strong>Real Casein 100</strong> une caséine à digestion plus lente que l’on place plutôt en dehors de l’entraînement, et <strong>Muscle On</strong> une protéine multi-sources, dont le format 1 kg est d’ailleurs classé en gainers protéinés sur le site.</p>' +
      '<p>Si le problème est calorique et non protéique, la logique change. <strong>Real Mass</strong> 6,8 kg en arôme Cookies déclare une portion de 75 g apportant 283 kcal, 51 g de glucides dont 7,5 g de sucres et 15 g de protéines, pour 90 portions par pot ; les ingrédients aromatiques varient selon la saveur du pot, donc vérifiez l’étiquette reçue. <strong>Carbo One</strong> 1 kg, à l’inverse, n’apporte que des glucides et sert à compléter un shake ou une séance, pas à remplacer une protéine. Côté performance, la <strong>créatine</strong> en 150 g, 300 g et 500 g est le même ingrédient dans trois contenances : c’est un arbitrage de durée et de budget. <strong>BCAA 8:1:1</strong> et <strong>EAA</strong> se prennent autour de l’entraînement en complément d’un apport protéique déjà couvert, et <strong>King Real</strong> comme <strong>Behemoth</strong> sont des pre-workouts en 500 g, à réserver aux séances où vous en avez réellement besoin. Reportez-vous à l’étiquette de chaque référence pour les doses, la caféine éventuelle et les allergènes.</p>',
    faqs: [
      {
        question: 'Combien de protéines dans une portion de Real Isolate 1,8 kg ?',
        answer:
          'Sur le format 1,8 kg en arôme Vanille, l’étiquette du fabricant transcrite sur notre fiche indique une portion de 30 g apportant 25,8 g de protéines, 106 kcal, 0,3 g de glucides dont 0,3 g de sucres et 0,09 g de lipides, soit 60 portions par pot. Ces valeurs sont données pour les arômes hors chocolat. Le produit contient du lait.',
      },
      {
        question: 'Quelle différence entre Real Whey 100, Real Isolate et Real Casein ?',
        answer:
          'Real Whey 100 est la whey polyvalente de la marque, proposée en 2,250 kg arôme Chocolat. Real Isolate est une whey isolate 1,8 kg, plus filtrée, qui vise plus de protéines par portion pour très peu de glucides et de lipides. Real Casein 100 est une caséine 700 g arôme Fraise, à digestion plus lente, que l’on place plutôt en dehors de la fenêtre d’entraînement.',
      },
      {
        question: 'Que contient une portion de Real Mass 6,8 kg ?',
        answer:
          'Sur le format 6,8 kg en arôme Cookies, l’étiquette indique une portion de 75 g apportant 283 kcal, 51 g de glucides dont 7,5 g de sucres et 15 g de protéines, soit 90 portions par pot. Les ingrédients aromatiques varient selon la saveur du pot, et le produit contient du lait.',
      },
      {
        question: 'Quels formats de créatine Real Pharm existent en Tunisie ?',
        answer:
          'Trois contenances de Creatine Monohydrate sont référencées : 150 g, 300 g et 500 g. Il s’agit du même ingrédient ; à dose journalière égale, seule la durée couverte par le pot change. Le choix se fait donc sur le prix affiché et sur la durée que vous voulez couvrir.',
      },
      {
        question: 'Real Pharm propose-t-il un pre-workout ?',
        answer:
          'Oui, deux références en 500 g : King Real Preworkout, référencé en arôme Watermelon, et Behemoth Preworkout. Ce sont des poudres à prendre avant la séance. Vérifiez la teneur en caféine sur l’étiquette et évitez de les cumuler avec d’autres sources de caféine dans la journée.',
      },
      {
        question: 'Comment commander Real Pharm en Tunisie ?',
        answer:
          'Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-isolate', name: 'Isolats de whey en Tunisie', url: '/whey-isolate' },
      { slug: 'whey-proteine', name: 'Découvrir le rayon whey', url: '/whey-proteine' },
      { slug: 'creatine', name: 'Comparer les formats de créatine', url: '/creatine' },
      { slug: 'pre-workout', name: 'Le rayon pré-workout', url: '/pre-workout' },
      { slug: 'bcaa', name: 'Le rayon BCAA', url: '/bcaa' },
      { slug: 'brands', name: 'Comparer Real Pharm aux autres marques', url: '/brands' },
    ],
  },

  'ultimate-nutrition': {
    metaTitle: 'Ultimate Nutrition Tunisie | Prostar & ISO Sensation 93',
    metaDescription:
      'Ultimate Nutrition en Tunisie : Prostar 100% Whey 907 g et 2,4 kg, ISO Sensation 93 en 910 g et 2,27 kg, Prostar Casein 907 g. Dès {prixMin} DT, {nbEnStock} en stock.',
    h1: 'Ultimate Nutrition Tunisie : Prostar 100% Whey, ISO Sensation 93 et Prostar Casein',
    introHtml:
      '<p>Selon son site, Ultimate Nutrition a été fondée en 1979 par Victor H. Rubino, alors powerlifter amateur aux États-Unis. Sur Protein.tn, sa gamme repose d’abord sur deux protéines de lactosérum, chacune en deux contenances. <strong>Prostar 100% Whey Protein</strong>, rangée en whey protéine, existe en 907 g (arôme Vanilla) et en 2,4 kg (Cookies ou Double chocolat). <strong>ISO Sensation 93</strong>, rangée en whey isolate, existe en 910 g (Cookies ou Chocolat) et en 2,27 kg (Chocolate Fudge). La troisième protéine, <strong>Prostar 100% Casein Protein</strong>, se présente en 907 g au chocolat. D’une contenance à l’autre, les arômes référencés ne sont pas les mêmes.</p><p>Le reste de la gamme se range par forme. En poudre : <strong>Creatine Monohydrate</strong> 300 g et <strong>L-Glutamine Gluta Pure</strong> 400 g. En gélules : <strong>Arginine &amp; Pyroglutamate &amp; Lysine</strong> en 100 gélules et <strong>Tribulus Bulgarian</strong> en 90 gélules. En capsules molles : <strong>Pure CLA 1000</strong> et <strong>Omega 3</strong>, 90 capsules chacune. En liquide : <strong>L-Carnitine 2000</strong>, en flacon de 355 ml.</p>',
    howToChooseTitle: 'Prostar Whey, ISO Sensation 93 ou Prostar Casein : laquelle choisir ?',
    howToChooseBody:
      '<p>Choisissez d’abord la famille (whey polyvalente, isolat ou caséine), puis la contenance, en vérifiant l’arôme proposé pour chacune.</p><ul><li><strong>Une whey polyvalente</strong> : Prostar 100% Whey. Le 907 g permet d’essayer l’arôme Vanilla ; le 2,4 kg, en Cookies ou Double chocolat, convient si vous en prenez déjà chaque jour.</li><li><strong>Une whey plus filtrée</strong> : ISO Sensation 93. Un isolat vise une part de protéines plus élevée qu’une whey classique, avec moins de glucides et de lipides, et coûte en général plus cher au kilo. Le 910 g existe en Cookies ou Chocolat, le 2,27 kg en Chocolate Fudge.</li><li><strong>Un apport en dehors de l’entraînement</strong> : Prostar 100% Casein, 907 g au chocolat. La caséine se digère plus lentement que la whey ; elle se place plutôt entre deux repas espacés ou en fin de journée, en plus d’une whey et non à sa place.</li><li><strong>À côté d’une protéine</strong> : Creatine Monohydrate 300 g et L-Glutamine Gluta Pure 400 g sont des poudres à doser à part, qui complètent une protéine.</li></ul><p>Aucune valeur par portion n’est avancée ici : nos fiches Ultimate Nutrition ne reprennent pas de tableau nutritionnel, et l’étiquette du produit reçu fait foi, d’autant que les valeurs peuvent varier d’un arôme à l’autre. Prostar 100% Whey, ISO Sensation 93 et Prostar 100% Casein sont des protéines de lait (lactosérum ou caséine) : vérifiez la liste des allergènes imprimée sur l’emballage.</p>',
    faqs: [
      {
        question: 'Quel est le prix des produits Ultimate Nutrition ?',
        answer:
          'Les {nbEnStock} références en stock vont de {prixMin} à {prixMax} DT.',
      },
      {
        question: 'Quelle différence entre Prostar 100% Whey et ISO Sensation 93 ?',
        answer:
          'Prostar 100% Whey est rangée en whey protéine et ISO Sensation 93 en whey isolate. Un isolat est plus filtré : il vise une part de protéines plus élevée et moins de glucides et de lipides par portion, en général pour un prix au kilo supérieur. Prostar existe en 907 g et 2,4 kg, ISO Sensation 93 en 910 g et 2,27 kg ; comparez les valeurs sur l’étiquette de chaque produit.',
      },
      {
        question: 'Quand prendre Prostar 100% Casein plutôt qu’une whey ?',
        answer:
          'La caséine se digère plus lentement que la whey. Prostar 100% Casein, en 907 g au chocolat, se prend donc plutôt quand plusieurs heures séparent deux apports, par exemple le soir, alors qu’une whey se prend en général autour de l’entraînement. Les deux se complètent ; la dose à suivre est celle de l’étiquette.',
      },
      {
        question: 'Quels arômes de Prostar et d’ISO Sensation 93 sont référencés ?',
        answer:
          'Prostar 100% Whey est référencée en Vanilla sur le 907 g, en Cookies et Double chocolat sur le 2,4 kg. ISO Sensation 93 l’est en Cookies et Chocolat sur le 910 g, en Chocolate Fudge sur le 2,27 kg. Prostar 100% Casein 907 g est proposée au chocolat. Chaque fiche liste les arômes de son format.',
      },
      {
        question: 'Y a-t-il de la créatine et de la glutamine Ultimate Nutrition ?',
        answer:
          'Oui, en poudre : Creatine Monohydrate en 300 g et L-Glutamine Gluta Pure en 400 g. La marque est aussi référencée en gélules (Arginine & Pyroglutamate & Lysine 100 gélules, Tribulus Bulgarian 90 gélules), en capsules molles (Pure CLA 1000 et Omega 3, 90 capsules) et en liquide avec L-Carnitine 2000 en flacon de 355 ml.',
      },
      {
        question: 'Comment commander un produit Ultimate Nutrition sur Protein.tn ?',
        answer:
          'Choisissez la contenance et l’arôme sur la fiche, ajoutez le produit au panier, puis renseignez vos coordonnées de livraison. Pour une référence en stock, comptez une livraison 24–72h partout en Tunisie, avec paiement à la livraison.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-proteine', name: 'Whey protéines, toutes marques', url: '/whey-proteine' },
      { slug: 'whey-isolate', name: 'Voir les whey isolate disponibles', url: '/whey-isolate' },
      { slug: 'caseine', name: 'Comparer Prostar Casein aux autres caséines', url: '/caseine' },
      { slug: 'creatine', name: 'Voir nos créatines disponibles', url: '/creatine' },
      { slug: 'brands', name: 'Comparer Ultimate Nutrition aux autres marques', url: '/brands' },
    ],
    relatedBrands: ['optimum-nutrition', 'real-pharm', 'big-ramy-labs'],
    officialUrl: 'https://ultimatenutrition.com/',
  },

  /**
   * WeightWorld — the brand page with the widest gap between what it ranks for and what its
   * title says, measured in Search Console (last 3 months, Web):
   *
   *     /weightworld                    432 impr,  43 clicks,  9.95%,  pos 6.3
   *     "weightworld tunisie"           346 impr,  39 clicks, 11.27%,  pos 6.5
   *     "omega 3 weightworld"           109 impr,   0 clicks,  0.00%,  pos 8.8
   *     "weightworld omega 3"           100 impr,   0 clicks,  0.00%,  pos 8.9
   *     "weightworld omega 3 tunisie"    94 impr,   6 clicks,  6.38%,  pos 7.1
   *     "zinc weightworld"               72 impr,   0 clicks,  0.00%,  pos 9.4
   *     "magnesium bisglycinate ww"      56 impr,   1 click,   1.79%,  pos 6.7
   *     "weightworld magnesium glycinate"52 impr,   0 clicks,  0.00%,  pos 9.5
   *
   * Fifteen WeightWorld-named queries carry ~1,127 impressions at positions 4.6–9.5 and return
   * 50 clicks between them. Without an entry here the page falls through to buildBrandMetaTitle's
   * generic string and served, verbatim, on 08/09/2026:
   *
   *     title  weightworld — Protéines & Compléments en Tunisie | Protéine Tunisie
   *     desc   Découvrez tous les produits weightworld en Tunisie : qualité premium,
   *            produits 100% authentiques, livraison rapide.
   *
   * Two things wrong with that at once. The brand name is lower-cased because it comes straight
   * from `brand.designation_fr`, and the title promises "Protéines" — which WeightWorld does not
   * sell here. The six references on /weightworld are a fish oil, a magnesium, a zinc, a
   * vitamin D3+K2, a multivitamin and an ashwagandha. The searcher typing "omega 3 weightworld"
   * is shown a line about protein powder, and 0 of 109 click.
   *
   * ── DATA FLOOR ───────────────────────────────────────────────────────────────────────────────
   * Like GSN, Ultimate Nutrition and C4 above, every WeightWorld SKU returns no transcribed
   * label: /product_details for the fish oil, the magnesium and the zinc all carry a Product
   * schema with price and availability and no `nutrition_values`. So NO per-portion figure — no
   * EPA/DHA split, no elemental magnesium — is quoted anywhere below. Family, format and unit
   * count are read off the product grid this page renders, and the copy says the pot's own label
   * is the reference.
   */
  weightworld: {
    metaTitle: 'WeightWorld Tunisie | Omega 3, Magnésium & Zinc — Protein.tn',
    metaDescription:
      'WeightWorld en Tunisie : oméga 3 en 240 capsules, magnésium bisglycinate + B6, zinc 400 comprimés et vitamine D3 + K2. Dès {prixMin} DT, {nbEnStock} produits en stock.',
    h1: 'WeightWorld Tunisie : oméga 3, magnésium, zinc, vitamines, ashwagandha et berbérine',
    introHtml:
      '<p>La gamme <strong>WeightWorld en Tunisie</strong> se compose de gélules, de capsules et de comprimés : ni protéine en poudre, ni arôme à choisir. L’huile de poisson <strong>Omega 3 Fish Oil</strong> est vendue en flacon de 240 capsules molles. Deux minéraux sont proposés sous forme bisglycinate : le <strong>Magnesium Bisglycinate + Vitamine B6</strong> 1422 mg et le <strong>Zinc Bisglycinate</strong> en 400 comprimés. Pour les vitamines, la <strong>Vegan Vitamin D3 + K2</strong> se présente en 365 comprimés et les <strong>Multivitamines et Minéraux</strong> en 400 comprimés. Trois références se choisissent chacune pour son actif : l’<strong>Ashwagandha KSM-66</strong> 1500 mg en 180 comprimés, la <strong>Curcumine 95%</strong> en 180 capsules et la <strong>Berbérine 500 mg</strong> en 120 gélules. <strong>Water Away</strong> complète la gamme, en 180 gélules.</p><p>Ce sont de grands conditionnements : d’après leurs étiquettes, l’Omega 3 Fish Oil compte 120 portions de 2 capsules molles et les Multivitamines et Minéraux 400 portions d’un comprimé. Selon son propre site, WeightWorld a été fondée au Royaume-Uni, a commencé comme une petite boutique de compléments et revendique une présence depuis 2006.</p>',
    howToChooseTitle: 'Oméga 3, magnésium, zinc ou multivitamine : quel produit WeightWorld ?',
    howToChooseBody:
      '<p>Partez du besoin, puis comparez l’actif, la dose par prise et le nombre d’unités de chaque conditionnement.</p><ul><li><strong>Omega 3 Fish Oil</strong> : d’après l’étiquette du flacon de 240 capsules molles, une portion de 2 capsules apporte 2000 mg d’huile de poisson, dont 1100 mg d’oméga 3 (660 mg d’EPA et 440 mg de DHA). La gélatine figure parmi les autres ingrédients déclarés.</li><li><strong>Magnesium Bisglycinate + Vitamine B6</strong> ou <strong>Zinc Bisglycinate</strong> : deux minéraux liés à la glycine. La quantité de magnésium ou de zinc par prise se lit sur l’étiquette de chaque produit.</li><li><strong>Multivitamines et Minéraux</strong> : d’après l’étiquette du format 400 comprimés, un comprimé apporte notamment 10 mg de zinc, 56 mg de magnésium, 5 µg de vitamine D3 et 5 µg de vitamine K2. Si vous y ajoutez le zinc, le magnésium ou la <strong>Vegan Vitamin D3 + K2</strong> (365 comprimés), additionnez les apports des deux étiquettes.</li><li><strong>Ashwagandha KSM-66</strong> (180 comprimés, 1500 mg), <strong>Curcumine 95%</strong> (180 capsules) et <strong>Berbérine 500 mg</strong> (120 gélules) : trois actifs distincts, à choisir chacun pour lui-même. La composition de <strong>Water Away</strong> (180 gélules) figure sur son étiquette.</li></ul><p>L’étiquette de l’Omega 3 Fish Oil précise que le produit ne s’adresse pas aux moins de 18 ans et demande l’avis d’un professionnel de santé en cas de grossesse, d’allaitement ou de traitement. Pour l’ashwagandha, la curcumine et la berbérine, lisez de même l’étiquette de chaque produit avant de commencer.</p>',
    faqs: [
      {
        question: 'Quels produits WeightWorld trouve-t-on en Tunisie ?',
        answer:
          'Le catalogue Protein.tn compte {nbProduits} références WeightWorld. On y trouve Omega 3 Fish Oil en 240 capsules molles, Magnesium Bisglycinate + Vitamine B6 1422 mg, Zinc Bisglycinate et Multivitamines et Minéraux en 400 comprimés, Vegan Vitamin D3 + K2 en 365 comprimés, Ashwagandha KSM-66 en 180 comprimés, Curcumine 95% en 180 capsules, Berbérine 500 mg en 120 gélules et Water Away en 180 gélules. Aucune protéine en poudre n’en fait partie.',
      },
      {
        question: 'Combien d’oméga 3 dans l’Omega 3 Fish Oil WeightWorld ?',
        answer:
          'D’après l’étiquette du flacon de 240 capsules molles, une portion de 2 capsules apporte 2000 mg d’huile de poisson, dont 1100 mg d’oméga 3 : 660 mg d’EPA et 440 mg de DHA. Le flacon contient 120 portions. Les autres ingrédients déclarés sont la vitamine E (tocophérol), la gélatine, le glycérol et l’eau purifiée.',
      },
      {
        question: 'Magnésium bisglycinate WeightWorld : quelle forme de magnésium ?',
        answer:
          'Le Magnesium Bisglycinate + Vitamine B6 associe du bisglycinate de magnésium, souvent appelé glycinate de magnésium, et de la vitamine B6. Le bisglycinate est du magnésium lié à deux molécules de glycine. Le nom du produit indique 1422 mg ; la quantité de magnésium par prise et la dose journalière se lisent sur l’étiquette.',
      },
      {
        question: 'Le zinc WeightWorld fait-il double emploi avec la multivitamine ?',
        answer:
          'Les deux apportent du zinc. D’après l’étiquette du format 400 comprimés, un comprimé de Multivitamines et Minéraux contient 10 mg de zinc, 56 mg de magnésium, 5 µg de vitamine D3 et 5 µg de vitamine K2. Si vous l’associez au Zinc Bisglycinate, au magnésium ou à la Vegan Vitamin D3 + K2, additionnez les apports de chaque étiquette et respectez la dose journalière indiquée sur chacune.',
      },
      {
        question: 'Berbérine, curcumine, Water Away : quels formats chez WeightWorld ?',
        answer:
          'La Berbérine 500 mg est vendue en 120 gélules, la Curcumine 95% en 180 capsules et Water Away en 180 gélules. L’Ashwagandha KSM-66 se présente en 180 comprimés, avec 1500 mg indiqués dans son nom. La posologie se lit sur l’étiquette de chaque produit ; si vous suivez un traitement, êtes enceinte ou allaitez, demandez l’avis de votre médecin avant de commencer.',
      },
      {
        question: 'Quel est le prix de l’Omega 3 Fish Oil et des autres produits WeightWorld ?',
        answer:
          'Les {nbEnStock} références en stock vont de {prixMin} à {prixMax} DT.',
      },
    ],
    relatedCategories: [
      { slug: 'omega-3', name: 'Comparer l’Omega 3 Fish Oil aux autres oméga 3', url: '/omega-3' },
      { slug: 'magnesium', name: 'Comparer le Magnesium Bisglycinate aux autres magnésiums', url: '/magnesium' },
      { slug: 'zinc', name: 'Comparer le Zinc Bisglycinate aux autres compléments de zinc', url: '/zinc' },
      { slug: 'vitamines', name: 'Comparer la Vegan Vitamin D3 + K2 aux autres vitamines', url: '/vitamines' },
      { slug: 'brands', name: 'Comparer WeightWorld aux autres marques', url: '/brands' },
    ],
    relatedBrands: ['biotech-usa', 'zumub', 'ostrovit', 'muscle-care'],
    officialUrl: 'https://www.weightworld.uk/',
  },

  'c4-cellucor': {
    metaTitle: 'C4 / Cellucor Tunisie | Pre-Workout, C4 Whey & Créatine',
    metaDescription:
      'C4 / Cellucor en Tunisie : C4 Original et C4 Ripped Sport, C4 Whey Protein en six versions. Dès {prixMin} DT, {nbEnStock} produits en stock.',
    h1: 'C4 / Cellucor Tunisie : pre-workout, whey et créatine',
    introHtml:
      '<p>La gamme <strong>C4 / Cellucor en Tunisie</strong> compte {nbProduits} références organisées en quatre familles. Les pre-workouts : <strong>C4 Original</strong>, sur deux fiches dont un pot de 246 g (Grape Popsicle), et <strong>C4 Ripped Sport</strong> en 213 g (Fruit Punch) et 210 g (Arctic Snow Cone). Les protéines : <strong>C4 Whey Protein</strong> en six versions — Vanilla Bean en 966 g et 2,28 kg, Hershey’s Milk Chocolate en 1,01 kg et 2,38 kg, Reese’s Peanut Butter &amp; Chocolate en 1,13 kg et 2,65 kg. La créatine : <strong>COR-Performance Creatine</strong> en cinq arômes, Jolly Rancher Green Apple 316 g, Jolly Rancher Cherry 321 g, Watermelon 315 g, Blue Raspberry 315 g et Fruit Punch 325 g. Enfin trois produits en gélules : <strong>Max Test</strong> 120 gélules, <strong>Super Shred</strong> et <strong>Super Thermo Stim-Free</strong> en 60 gélules chacun.</p>',
    howToChooseTitle: 'Quel produit C4 / Cellucor choisir ?',
    howToChooseBody:
      '<p>C’est le pre-workout qui fait connaître la marque, et le catalogue en propose deux. <strong>C4 Original</strong> est la version historique, sur deux fiches : un pot de 246 g en arôme Grape Popsicle, et une seconde fiche dont l’étiquette transcrite indique, pour une portion de 6,5 g, 150 mg de caféine, 1 600 mg de bêta-alanine CarnoSyn et 1 000 mg de créatine nitrate. <strong>C4 Ripped Sport</strong>, en 213 g et 210 g, est une formule distincte présentée sous un autre nom par le fabricant ; elle est proposée en Fruit Punch et Arctic Snow Cone. Ces poudres contiennent de la caféine : lisez l’étiquette du pot reçu pour la dose exacte, évitez de les cumuler avec d’autres sources de caféine dans la même journée, et ne les prenez pas trop tard si vous êtes sensible au sommeil. Seule la seconde fiche C4 Original publie des valeurs par portion ; pour les autres références C4 / Cellucor, aucun chiffre n’est avancé ici.</p>' +
      '<p>Le reste de la gamme couvre des besoins différents. <strong>C4 Whey Protein</strong> est une whey protéine classique : chacun de ses trois arômes existe en un petit et un grand format, ce qui permet de tester une saveur sur environ 1 kg avant de passer au pot de 2,28 à 2,65 kg. Le choix se fait donc sur l’arôme puis sur la contenance, et non sur la formule. <strong>COR-Performance Creatine</strong> est la créatine aromatisée de la marque, déclinée en cinq saveurs pour des pots de 315 à 325 g ; c’est le même produit d’un arôme à l’autre, le poids net variant simplement avec le système d’arôme. Les trois références en gélules — <strong>Max Test</strong>, classée en boosters hormonaux sur le site, <strong>Super Shred</strong> et <strong>Super Thermo Stim-Free</strong>, classées en brûleurs de graisse — relèvent d’un usage ponctuel et encadré : lisez la posologie du fabricant et demandez un avis médical en cas de traitement en cours.</p>',
    faqs: [
      {
        question: 'Quels pre-workouts C4 sont disponibles en Tunisie ?',
        answer:
          'Deux formules. C4 Original, sur deux fiches dont un pot de 246 g en arôme Grape Popsicle, et C4 Ripped Sport en 213 g arôme Fruit Punch et en 210 g arôme Arctic Snow Cone. Les deux sont des poudres à prendre avant la séance et contiennent de la caféine : la dose exacte figure sur l’étiquette du pot.',
      },
      {
        question: 'En quels formats et arômes existe C4 Whey Protein ?',
        answer:
          'En six versions : Vanilla Bean en 966 g et 2,28 kg, Hershey’s Milk Chocolate en 1,01 kg et 2,38 kg, Reese’s Peanut Butter & Chocolate en 1,13 kg et 2,65 kg. Chaque arôme existe donc en un petit et un grand format, ce qui permet d’essayer une saveur avant de prendre le grand pot.',
      },
      {
        question: 'Combien d’arômes pour la COR-Performance Creatine ?',
        answer:
          'Cinq : Jolly Rancher Green Apple 316 g, Jolly Rancher Cherry 321 g, Watermelon 315 g, Blue Raspberry 315 g et Fruit Punch 325 g. Il s’agit de la même créatine aromatisée ; le poids net varie légèrement d’un arôme à l’autre parce que le système d’arôme change, pas la dose de créatine par mesure.',
      },
      {
        question: 'Faut-il un pre-workout C4 ou une créatine COR-Performance ?',
        answer:
          'Les deux ne servent pas au même moment. Un pre-workout se prend avant la séance et contient notamment de la caféine ; la créatine se prend tous les jours, séance ou non, et ne dépend pas de l’horaire. Les deux peuvent se cumuler, mais la créatine est le complément le plus étudié des deux et ne pose pas de question de tolérance à la caféine.',
      },
      {
        question: 'Quel est le prix des produits C4 / Cellucor en Tunisie ?',
        answer:
          'Le prix dépend du produit, du format, de l’arôme et des promotions en cours. La grille de produits de cette page affiche le prix et la disponibilité actuels de chaque référence C4 / Cellucor vendue sur Protein.tn.',
      },
      {
        question: 'Comment commander C4 / Cellucor en Tunisie ?',
        answer:
          'Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison.',
      },
    ],
    relatedCategories: [
      { slug: 'pre-workout', name: 'Voir tous les pré-workouts', url: '/pre-workout' },
      { slug: 'whey-proteine', name: 'Autres whey protéines du catalogue', url: '/whey-proteine' },
      { slug: 'creatine', name: 'Créatines aromatisées et neutres', url: '/creatine' },
      { slug: 'bruleurs-de-graisse', name: 'Brûleurs de graisse en Tunisie', url: '/bruleurs-de-graisse' },
      { slug: 'brands', name: 'Comparer C4 / Cellucor aux autres marques', url: '/brands' },
    ],
  },

  /**
   * ── BATCH OF 09/09/2026: THE FIVE BARE BRAND PAGES THAT HAVE MEASURED DEMAND ────────────────
   *
   * Search Console (repo exports, Web, last 3 months) for the brand pages that still had no
   * entry, i.e. still served buildBrandMetaTitle's generic "<brand> — Protéines & Compléments en
   * Tunisie | Protéine Tunisie":
   *
   *     /proactive              121 impr,  4 clicks,  3.31%,  pos 13.4
   *     /big-ramy-labs          118 impr,  2 clicks,  1.69%,  pos 11.7
   *     /william-bonac           62 impr,  1 click,   1.61%,  pos  6.6
   *     /victor-martinez         54 impr,  0 clicks,     —,   pos 11.0
   *     /challenger-nutrition    49 impr,  0 clicks,  0.00%,  pos 10.0
   *
   * /challenger-nutrition (already at position 10 and converting nothing) and /william-bonac
   * (position 6.6) are the two where only the SERP line is failing — the rank is already there.
   *
   * ── DATA FLOOR, BRAND BY BRAND ───────────────────────────────────────────────────────────────
   * Family, format, net weight, arôme and unit count below are read off
   * /api/productsByBrandId/{29,54,59,55,12} on 09/09/2026 — the same rows the product grid on
   * each page renders. Per-portion figures are quoted ONLY where /api/product_details/{slug}
   * returns a populated `nutrition_facts.rows`, and each one is tied to the exact format AND
   * arôme it was transcribed for, because the same product declares different values per arôme:
   *
   *     /product_details/anabolic-whey-80-2-25kg-proactive     35 g → 25 g prot + 5 g créatine
   *     /product_details/big-whey-2kg-big-ramy-labs            34 g → 24 g prot (Cookies)
   *     /product_details/whey-iso-regime-2kg-william-bonac     30 g → 26 g prot (Vanilla)
   *     /product_details/whey-regime-2kg-william-bonac         30 g → 25 g prot (Vanilla)
   *     /product_details/whey-ultimate-2kg-william-bonac       30 g → 23 g prot (Chocolat)
   *     /product_details/100-whey-protein-2-27kg-challenger…   34 g → 24 g prot (Chocolat)
   *
   * Everything else returns `nutrition_facts: null` or `rows: []`, so no gram figure is stated
   * for it anywhere below and the copy says the pot's own label is the reference. That is true of
   * ALL FIVE Victor Martinez SKUs, so that entry quotes no per-portion number at all — as with
   * GSN, Ultimate Nutrition and C4 above, that is the honest outcome, not a gap to fill.
   *
   * The Challenger whey figures carry one extra caveat worth recording: its `serving_note` says
   * the row came from the packaging column of the product's Open Food Facts page, not from a
   * team transcription of a pot in the warehouse, and the same block's `claims` field holds three
   * paragraphs of reseller marketing. The numeric packaging column is quoted; not one word of
   * `claims` is, because it is exactly the kind of health claim this file forbids.
   *
   * ── SKIPPED, WITH REASONS (as of 09/09/2026 — two were reversed on 23/09) ───────────────────
   * Five of the ten bare pages got no entry that day. All five had no measured demand in the
   * exports, and each also failed on the catalogue. Two of the five — /olimp-sport-nutrition and
   * /mr-x-v-shape-supps — were written on 23/09/2026 all the same and have entries at the bottom
   * of this file; the reasons below are why they waited, not why they are still missing. Their
   * stock state is unchanged, re-read 23/09/2026: Olimp is still 5 SKUs with all 5 `rupture:
   * true`, MR.X still 8 SKUs with 6 `rupture: true`, so neither entry states availability.
   *
   *   /monster              NO BRAND ROW. All 582 rows of /all_brands were searched for the
   *                         substring "monster" on 09/09/2026: zero hits. The slug resolves to no
   *                         brand, so an entry here would be dead config — the same reason
   *                         american-wolf and impact-sport-nutrition are absent (see header).
   *   /myprotein            brand 28 exists, `products_meta.total` = 0. The page renders an empty
   *                         grid; copy describing a catalogue would describe nothing.
   *   /activlab             brand 32 returns exactly 1 SKU, and that SKU is
   *                         "VITAMIN C 1000 MG 90 TABS - GYMBEAM" — a GymBeam product filed under
   *                         ACTIVLAB, out of stock. The single product on the page is not even the
   *                         brand's. This is a catalogue defect to fix in the admin, not a page to
   *                         write copy for.
   *   /olimp-sport-nutrition  5 SKUs, all 5 `rupture: true`.
   *   /mr-x-v-shape-supps     8 SKUs, 6 of them `rupture: true`, and the brand row itself is
   *                         "MR.X  V-Shape Supps" (double space) while the SKUs split across two
   *                         names, "MR.X" and "V-Shape Supps" — the brand identity a title would
   *                         have to lead with is not settled in the data.
   *
   * /proactive is the borderline case that WAS written: only 2 SKUs, which is thinner than the
   * 3-SKU /applied-nutrition skipped on 08/09/2026. The difference is that honest copy here needs
   * no health claim — the catalogue is one whey and one pack — and that whey is the only SKU in
   * this whole batch with BOTH a transcribed label and a specific fact worth a title (25 g of
   * protéines and 5 g de créatine in the same 35 g portion). The entry says in its first sentence
   * that the range is two references, rather than implying a gamme that does not exist.
   */
  proactive: {
    metaTitle: 'ProActive Tunisie | Anabolic Whey 80 2,25 kg — Protein.tn',
    metaDescription:
      'ProActive en Tunisie : Anabolic Whey 80 2,25 kg (25 g de protéines et 5 g de créatine par portion de 35 g, Double chocolat) et Pack Sèche Extrême.',
    h1: 'ProActive Tunisie : Anabolic Whey 80 avec créatine et Pack Sèche Extrême',
    introHtml:
      '<p>Chez Protein.tn, la gamme <strong>ProActive</strong> s’articule autour d’une whey créatinée et d’un pack, qui associent protéines et créatine de deux manières opposées. <strong>Anabolic Whey 80</strong>, que sa fiche nomme en entier « Anabolic Whey 80 with creatine », se vend en pot de 2,25 kg et n’est référencée qu’en un arôme, Double chocolat. La protéine et la créatine monohydrate y sont mélangées dans la même poudre : une mesure, un shaker, rien à doser à part.</p><p>Le <strong>Pack Sèche Extrême</strong> fait l’inverse. Ce n’est pas une poudre mais un lot de trois articles commandés ensemble, tels que les liste sa fiche : la protéine 100 Isolate, la créatine Gold Creatine et un Shaker Kong de 750 ml. Protéine et créatine y restent deux produits distincts, chacun avec son étiquette, ce qui permet de prendre l’une sans l’autre.</p>',
    howToChooseTitle: 'Anabolic Whey 80 ou Pack Sèche Extrême : que choisir chez ProActive ?',
    howToChooseBody:
      '<p><strong>Si vous voulez un seul produit</strong> pour les protéines et la créatine, prenez Anabolic Whey 80. D’après l’étiquette du pot 2,25 kg Double chocolat transcrite sur notre fiche, une portion de 35 g apporte 25 g de protéines et 5 g de créatine monohydrate.</p><p><strong>Si vous préférez une protéine de lactosérum seule</strong>, le Pack Sèche Extrême la fournit sous forme d’isolat, selon sa fiche, avec la créatine dans un pot séparé. Sa fiche ne publie ni tableau nutritionnel ni taille de portion : la dose et la composition se lisent sur l’étiquette de chaque produit du lot.</p><ul><li><strong>Allergènes</strong> : la liste d’ingrédients d’Anabolic Whey 80 reprise sur sa fiche, relevée sur une version arôme cookies, décrit un mélange de protéines de lait, de blé et de soja, plus de la lécithine de soja. Elle signale donc lait, blé (gluten) et soja. Le 100 Isolate du pack est une protéine de lactosérum, donc issue du lait.</li><li><strong>Étiquette</strong> : les valeurs déclarées peuvent varier d’un arôme à l’autre ; pour le Double chocolat, le pot livré fait foi.</li></ul>',
    faqs: [
      {
        question: 'Quel est le prix des produits ProActive ?',
        answer:
          'Les {nbEnStock} références en stock vont de {prixMin} à {prixMax} DT.',
      },
      {
        question: 'Faut-il ajouter une créatine à Anabolic Whey 80 ?',
        answer:
          'Chaque portion de 35 g en contient déjà 5 g, sous forme de créatine monohydrate, d’après l’étiquette du pot 2,25 kg Double chocolat transcrite sur la fiche. Si vous prenez aussi une créatine vendue seule, additionnez les deux doses et respectez la dose journalière indiquée sur chaque étiquette.',
      },
      {
        question: 'Combien de portions dans un pot d’Anabolic Whey 80 de 2,25 kg ?',
        answer:
          'L’étiquette avant du pot porte la mention « 64 servings 2250 g », pour une portion déclarée de 35 g. À raison d’une portion par jour, un pot couvre donc environ deux mois.',
      },
      {
        question: 'Que contient le Pack Sèche Extrême ?',
        answer:
          'Le pack réunit trois articles, d’après sa fiche : la protéine 100 Isolate, un isolat de protéine de lactosérum ; la créatine Gold Creatine, une créatine monohydrate micronisée ; et un Shaker Kong de 750 ml à grille anti-grumeaux. Cette fiche n’indique aucune taille de portion : reportez-vous à l’étiquette de la protéine et à celle de la créatine.',
      },
      {
        question: 'Comment commander ProActive avec paiement à la livraison ?',
        answer:
          'Ajoutez la référence voulue au panier depuis la grille, puis renseignez votre adresse. Protein.tn assure la livraison 24–72h partout en Tunisie, avec paiement à la livraison : vous réglez la commande à sa réception.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-proteine', name: 'Comparer avec les autres whey', url: '/whey-proteine' },
      { slug: 'proteines-multi-sources', name: 'Pack Sèche Extrême et autres protéines multi-sources', url: '/proteines-multi-sources' },
      { slug: 'brands', name: 'Comparer ProActive aux autres marques', url: '/brands' },
    ],
    relatedBrands: ['optimum-nutrition', 'biotech-usa', 'william-bonac'],
  },

  'big-ramy-labs': {
    metaTitle: 'Big Ramy Labs Tunisie | Big Whey, Iso Big & Beef Mass',
    // The admin logo of brand 54 (brands/September2024/S5gcbEoftyQcSqDC5htA.webp) is the RED REX
    // artwork — a red T-rex reading « RED REX » — not a Big Ramy Labs wordmark; Red Rex Glutamine
    // is one of the brand's products (id 553). Until the owner uploads the real wordmark, the alt
    // says what the picture shows.
    logoAlt: 'Logo Red Rex, gamme Big Ramy Labs',
    metaDescription:
      'Big Ramy Labs en Tunisie : Big Whey 2 kg, Iso Big 2,1 kg, Beef Mass Plus 2,7 kg, ainsi que glutamine, BCAA, créatine et glucides. Dès {prixMin} DT, {nbEnStock} en stock.',
    h1: 'Big Ramy Labs Tunisie : Big Whey, Iso Big, Beef Mass Plus et Red Rex Glutamine',
    introHtml:
      '<p>Sur Protein.tn, la gamme <strong>Big Ramy Labs</strong> réunit {nbProduits} références. Côté whey, <strong>Big Whey</strong> 2 kg, proposée en arôme Cookies, est une whey concentrée selon la marque, tandis qu’<strong>Iso Big</strong> 2,1 kg, en arôme Chocolat, associe d’après elle whey isolée et whey hydrolysée. <strong>All In Isolate</strong> 2,04 kg complète le rayon whey isolate. Les deux Beef Mass forment une ligne à part : <strong>Beef Mass Plus</strong> 2,7 kg et <strong>Beef Mass Gainer</strong> 4,9 kg, le plus grand format de la gamme, sont présentés par Big Ramy Labs comme des gainers à base d’isolat de protéine de bœuf hydrolysé. Protein.tn les range en protéine de bœuf, mais ils se comparent sur les calories et les glucides autant que sur la source de protéines.</p><p>Autour de ces poudres protéinées, <strong>Red Rex Glutamine</strong>, <strong>BCAA</strong> et <strong>Creatine</strong> sont proposés chacun en 300 g, dans les rayons glutamine, BCAA et créatine. <strong>Carbo Big</strong> 1,5 kg, rangé en glucides, se compare aux autres sources de glucides du catalogue plutôt qu’aux protéines.</p>',
    howToChooseTitle: 'Big Whey, Iso Big ou Beef Mass : quel produit Big Ramy Labs choisir ?',
    howToChooseBody:
      '<p>Commencez par ce que votre shake doit apporter : surtout des protéines, ou des protéines accompagnées de beaucoup de calories. Le degré de filtration et la taille du format ne viennent qu’ensuite.</p><ul><li><strong>Une whey pour compléter vos repas</strong> : Big Whey 2 kg, au rayon whey protéine. D’après l’étiquette transcrite sur notre fiche Big Whey 2 kg arôme Cookies, une portion de 34 g apporte 24 g de protéines, 5 g de glucides, 1,5 g de matières grasses et 130 kcal.</li><li><strong>Une whey isolate</strong> : Iso Big 2,1 kg ou All In Isolate 2,04 kg. L’isolat est une whey filtrée plus finement, ce qui laisse en principe davantage de protéines et moins de glucides et de lipides par portion. Aucune de ces deux fiches ne publie de tableau de valeurs : l’étiquette de la référence livrée donne les chiffres.</li><li><strong>Un gainer à base de bœuf</strong> : Beef Mass Plus 2,7 kg ou, en plus grand format, Beef Mass Gainer 4,9 kg. Nos fiches n’affichent pas de valeurs par portion pour ces deux gainers : comparez calories, glucides et protéines sur leurs étiquettes.</li><li><strong>Un complément à un apport déjà couvert</strong> : Red Rex Glutamine, BCAA ou Creatine en 300 g, et Carbo Big 1,5 kg pour les glucides. Aucun d’eux ne remplace une source de protéines.</li></ul><p>Big Whey, Iso Big et All In Isolate sont des whey, donc issues du lait. Nos fiches Big Ramy Labs ne reprenant pas la liste des allergènes, lisez celle imprimée sur l’emballage ; les valeurs déclarées varient aussi selon l’arôme.</p>',
    faqs: [
      {
        question: 'Quel est le prix des produits Big Ramy Labs en Tunisie ?',
        answer:
          'Les {nbEnStock} références Big Ramy Labs en stock vont de {prixMin} à {prixMax} DT.',
      },
      {
        question: 'Quels produits Big Ramy Labs trouve-t-on sur Protein.tn ?',
        answer:
          'La gamme compte {nbProduits} références sur Protein.tn. En whey : Big Whey 2 kg, Iso Big 2,1 kg et All In Isolate 2,04 kg. En gainers à base de bœuf : Beef Mass Plus 2,7 kg et Beef Mass Gainer 4,9 kg. En 300 g : Red Rex Glutamine, BCAA et Creatine. Pour les glucides : Carbo Big 1,5 kg.',
      },
      {
        question: 'Combien de protéines dans une portion de Big Whey 2 kg ?',
        answer:
          'D’après l’étiquette de Big Whey 2 kg arôme Cookies transcrite sur notre fiche produit, une portion de 34 g apporte 24 g de protéines, 5 g de glucides, 1,5 g de matières grasses et 130 kcal. Un autre arôme peut déclarer d’autres valeurs : celles de la référence que vous recevez sont imprimées sur son emballage.',
      },
      {
        question: 'Quelle différence entre Big Whey, Iso Big et All In Isolate ?',
        answer:
          'Big Whey 2 kg est rangée en whey protéine, et la marque la décrit comme une whey concentrée. Iso Big 2,1 kg, présentée par Big Ramy Labs comme un mélange de whey isolée et hydrolysée, et All In Isolate 2,04 kg sont rangées en whey isolate, une whey plus filtrée. Nos fiches de ces deux isolats ne publient pas de valeurs par portion : l’étiquette de chaque produit fait référence.',
      },
      {
        question: 'Beef Mass Plus est-il un gainer ou une protéine de bœuf ?',
        answer:
          'Les deux. Big Ramy Labs présente Beef Mass Plus 2,7 kg et Beef Mass Gainer 4,9 kg comme des gainers dont la protéine est un isolat de bœuf hydrolysé, et Protein.tn les range en protéine de bœuf, un rayon distinct des whey. Leurs fiches ne publient pas de valeurs par portion : comparez calories, glucides et protéines sur chaque étiquette.',
      },
      {
        question: 'Qu’est-ce que Red Rex Glutamine 300 g ?',
        answer:
          'C’est la glutamine de Big Ramy Labs, vendue en 300 g et rangée dans le rayon glutamine de Protein.tn. Notre fiche ne publie ni tableau de valeurs ni arôme : la dose par prise et la liste des ingrédients à suivre sont celles de l’étiquette. Comme les BCAA et la Creatine de la marque, elle complète un apport en protéines sans le remplacer.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-proteine', name: 'Whey protéines de toutes les marques', url: '/whey-proteine' },
      { slug: 'whey-isolate', name: 'Whey isolate : tous les formats', url: '/whey-isolate' },
      { slug: 'proteine-de-boeuf', name: 'Comparer Beef Mass Plus aux autres protéines de bœuf', url: '/proteine-de-boeuf' },
      { slug: 'glutamine', name: 'Comparer les glutamines', url: '/glutamine' },
      { slug: 'brands', name: 'Comparer Big Ramy Labs aux autres marques', url: '/brands' },
    ],
    relatedBrands: ['william-bonac', 'optimum-nutrition', 'kevin-levrone'],
    officialUrl: 'https://bigramylabs.com/',
  },

  'william-bonac': {
    metaTitle: 'William Bonac Tunisie | Whey Regime & Iso Hydro Zero',
    metaDescription:
      'William Bonac en Tunisie : Whey Iso Regime 2 kg, Whey Ultimate 2 kg et la créatine Mono Lift 500 g. Dès {prixMin} DT, {nbEnStock} produits en stock.',
    h1: 'William Bonac Tunisie : Whey Iso Regime, Whey Regime, Iso Hydro Zero et Mono Lift',
    introHtml:
      '<p>Sur son site, William Bonac Signature range sa gamme par séries, et la plupart des {nbProduits} références de notre catalogue viennent de deux d’entre elles. La série <strong>Legacy</strong> regroupe <strong>Whey Regime</strong> 2 kg (arôme Vanilla), une whey protéine, <strong>Whey Iso Regime</strong> 2 kg (arôme Vanilla), un isolat de whey, et <strong>Mono Lift</strong> 500 g, que la marque décrit comme une créatine monohydrate micronisée : vous pouvez <a href="/creatine">comparer Mono Lift aux autres créatines</a> du catalogue. La série <strong>Ultimate</strong> regroupe <strong>Whey Ultimate</strong> 2 kg (arôme Chocolat), classée en whey protéine, <strong>Iso Hydro Zero</strong> 1,8 kg (arôme Chocolat), que la marque présente comme un mélange d’isolat et d’hydrolysat de whey et que nous rangeons en whey hydrolysée, et <strong>Clear Beef</strong> 1,8 kg (arôme Pina Colada), classée en protéine de bœuf.</p><p>S’y ajoute le <strong>Pack Ultimate Muscle</strong> (arôme Chocolat), classé chez nous en protéine de bœuf : sa fiche ne détaille pas encore le contenu exact du pack, demandez-nous confirmation avant de commander si un produit précis compte pour vous. Les poudres protéinées des deux séries sont toutes proposées ici en 2 kg ou en 1,8 kg : d’une ligne à l’autre, c’est la source et le type de protéine qui changent, pas la contenance.</p>',
    howToChooseTitle: 'Whey Regime, Whey Iso Regime ou Iso Hydro Zero : quelle whey choisir ?',
    howToChooseBody:
      '<p>Trois whey de la marque ont une étiquette transcrite sur nos fiches, toutes pour une portion de 30 g. Pot 2 kg Vanilla de <strong>Whey Iso Regime</strong> : 26 g de protéines, 1,5 g de glucides dont 0 g de sucres, 0,84 g de matières grasses et 140 kcal. Pot 2 kg Vanilla de <strong>Whey Regime</strong> : 25 g de protéines, 1,5 g de glucides dont 0,87 g de sucres, 0,86 g de matières grasses et 133,74 kcal. Pot 2 kg Chocolat de <strong>Whey Ultimate</strong> : 23 g de protéines, 1,44 g de glucides dont 1,44 g de sucres, 1,5 g de matières grasses et 111 kcal. L’arôme n’étant pas le même pour la troisième, la comparaison reste indicative.</p><ul><li>Davantage de protéines par portion : Whey Iso Regime, l’isolat, avec 26 g pour 30 g.</li><li>Une whey protéine en 2 kg : Whey Regime (Vanilla) ou Whey Ultimate (Chocolat), selon l’arôme.</li><li>Une whey en partie hydrolysée : Iso Hydro Zero 1,8 kg (Chocolat), un mélange d’isolat et d’hydrolysat selon la marque.</li><li>Une protéine de bœuf plutôt qu’une whey : Clear Beef 1,8 kg (Pina Colada).</li><li>Une créatine plutôt qu’une protéine : Mono Lift 500 g.</li></ul><p>Iso Hydro Zero, Clear Beef, Mono Lift et le Pack Ultimate Muscle n’ont pas encore de valeurs par portion sur nos fiches : l’étiquette de chaque produit fait foi. Aucune fiche William Bonac ne liste encore les allergènes ; la whey étant issue du lait, vérifiez cette mention sur l’étiquette avant de commander.</p>',
    faqs: [
      {
        question: 'Quel est le prix des produits William Bonac en Tunisie ?',
        answer:
          'Les {nbEnStock} références William Bonac en stock vont de {prixMin} à {prixMax} DT.',
      },
      {
        question: 'Whey Iso Regime William Bonac : combien de protéines par portion ?',
        answer:
          'D’après l’étiquette du pot 2 kg Vanilla transcrite sur notre fiche, une portion de 30 g de Whey Iso Regime apporte 26 g de protéines, 1,5 g de glucides dont 0 g de sucres, 0,84 g de matières grasses et 140 kcal. Ces valeurs valent pour ce format et cet arôme. La marque range cet isolat de whey dans sa série Legacy.',
      },
      {
        question: 'Quelle différence entre Whey Regime, Whey Iso Regime et Whey Ultimate ?',
        answer:
          'Whey Regime et Whey Ultimate sont classées en whey protéine, Whey Iso Regime en whey isolate. Pour une portion de 30 g, les étiquettes transcrites sur nos fiches donnent 26 g de protéines pour Whey Iso Regime 2 kg Vanilla, 25 g pour Whey Regime 2 kg Vanilla et 23 g pour Whey Ultimate 2 kg Chocolat. Les deux premières appartiennent à la série Legacy de la marque, la troisième à la série Ultimate.',
      },
      {
        question: 'Iso Hydro Zero : whey isolate ou whey hydrolysée ?',
        answer:
          'La marque présente Iso Hydro Zero comme un mélange d’isolat et d’hydrolysat de whey, et Protein.tn la classe en whey hydrolysée. Nous la proposons en 1,8 kg, arôme Chocolat ; la marque la range dans sa série Ultimate. Notre fiche ne publie pas encore de valeurs par portion : l’étiquette du pot fait foi pour les protéines comme pour les allergènes.',
      },
      {
        question: 'Qu’est-ce que la créatine Mono Lift de William Bonac ?',
        answer:
          'Mono Lift est la créatine de la série Legacy, proposée ici en pot de 500 g. La marque la décrit comme une créatine monohydrate micronisée. Notre fiche ne transcrit pas encore la dose par portion : c’est l’étiquette du pot qui indique la portion journalière à respecter.',
      },
      {
        question: 'Clear Beef William Bonac est-elle une whey ?',
        answer:
          'Non : Clear Beef 1,8 kg, référencée en arôme Pina Colada, est classée en protéine de bœuf, un rayon distinct des whey. La marque la range dans sa série Ultimate, comme Iso Hydro Zero. Notre fiche ne publie encore ni valeurs par portion ni allergènes : l’étiquette du pot fait foi.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-proteine', name: 'Comparer Whey Regime et Whey Ultimate aux autres whey', url: '/whey-proteine' },
      { slug: 'whey-isolate', name: 'Notre sélection de whey isolate', url: '/whey-isolate' },
      { slug: 'whey-hydrolysee', name: 'Comparer Iso Hydro Zero aux autres whey hydrolysées', url: '/whey-hydrolysee' },
      { slug: 'proteine-de-boeuf', name: 'Le rayon protéine de bœuf', url: '/proteine-de-boeuf' },
      { slug: 'brands', name: 'Comparer William Bonac aux autres marques', url: '/brands' },
    ],
    relatedBrands: ['big-ramy-labs', 'kevin-levrone', 'proactive'],
    officialUrl: 'https://williambonacsignature.com/',
  },

  'victor-martinez': {
    metaTitle: 'Victor Martinez Tunisie | V-Bulk, Whey Gold & Break-Out',
    metaDescription:
      'Victor Martinez en Tunisie : Premium V-Bulk 2,7 kg et 5,5 kg, Premium Whey Gold 2 kg, Premium Isolate Protein Matrix 2 kg et le pre-workout Break-Out.',
    h1: 'Victor Martinez Tunisie : Premium V-Bulk, Whey Gold et Break-Out',
    introHtml:
      '<p>La gamme <strong>Victor Martinez en Tunisie</strong> tient en cinq références réparties sur quatre rayons, toutes préfixées « Premium » sauf le pre-workout. Les calories d’abord, avec <strong>Premium V-Bulk</strong> en 2,7 kg et en 5,5 kg (arôme Chocolat sur le grand format), classé en gainers protéinés. Les protéines ensuite : <strong>Premium Whey Gold</strong> 2 kg (arôme Cookies) en whey protéine et <strong>Premium Isolate Protein Matrix</strong> 2 kg (arôme Cookies) en whey isolate. Enfin le pre-workout <strong>Break-Out</strong>, seule référence de la marque à ne pas être une poudre protéinée ou calorique. La grille ci-dessus affiche le prix et la disponibilité de chaque référence.</p>',
    howToChooseTitle: 'Quel produit Victor Martinez choisir ?',
    howToChooseBody:
      '<p>La question à trancher en premier n’est pas la marque mais le blocage. Si vous mangez assez de calories et manquez seulement de protéines, ce sont <strong>Premium Whey Gold</strong> 2 kg ou <strong>Premium Isolate Protein Matrix</strong> 2 kg qu’il faut regarder : la première est classée en whey protéine, la polyvalente ; la seconde en whey isolate, une famille davantage filtrée qui vise plus de protéines par portion pour moins de glucides et de lipides, en général à un prix au kilo supérieur. Les deux sont référencées en arôme Cookies et en 2 kg, donc ni la contenance ni la saveur ne départagent ici — seul le type de protéine le fait.</p>' +
      '<p>Si le point bloquant est au contraire d’atteindre l’apport calorique quotidien en mangeant, <strong>Premium V-Bulk</strong> est le produit correspondant : c’est un gainer, il ajoute des glucides et des calories, et il existe en 2,7 kg et en 5,5 kg. Ces deux contenances portent le même nom de produit ; à dose journalière égale, seule la durée couverte change, ce qui en fait un arbitrage de prix et non de formule. <strong>Break-Out</strong>, enfin, est un pre-workout : il se prend avant la séance et ne remplace ni une protéine ni un gainer. Aucune fiche Victor Martinez de notre catalogue ne publie de tableau de valeurs nutritionnelles — les cinq références renvoient un bloc vide — donc aucune valeur par portion n’est avancée ici, ni en protéines, ni en calories, ni en caféine. L’étiquette du pot que vous recevez est la seule référence, et c’est là qu’il faut lire la dose de caféine du Break-Out avant de le cumuler avec du café.</p>',
    faqs: [
      {
        question: 'Quels produits Victor Martinez sont vendus en Tunisie ?',
        answer:
          'Cinq références sur Protein.tn : Premium V-Bulk 2,7 kg et Premium V-Bulk 5,5 kg en gainers protéinés, Premium Whey Gold 2 kg en whey protéine, Premium Isolate Protein Matrix 2 kg en whey isolate, et le pre-workout Break-Out. La grille de produits de cette page affiche l’état réel de chacune.',
      },
      {
        question: 'Quelle différence entre Premium Whey Gold et Premium Isolate Protein Matrix ?',
        answer:
          'Premium Whey Gold 2 kg est classée en whey protéine sur Protein.tn, Premium Isolate Protein Matrix 2 kg en whey isolate. Une whey isolate est plus filtrée et vise davantage de protéines par portion pour moins de glucides et de lipides, généralement à un prix au kilo plus élevé. Les deux sont référencées en arôme Cookies et en 2 kg.',
      },
      {
        question: 'Faut-il prendre Premium V-Bulk en 2,7 kg ou en 5,5 kg ?',
        answer:
          'Les deux sacs portent le même nom de produit et le même rayon, gainers protéinés. À dose journalière égale, le 5,5 kg couvre simplement une période plus longue. Comparez le prix affiché des deux formats sur cette page : la décision est budgétaire, pas nutritionnelle.',
      },
      {
        question: 'Combien de protéines dans une portion de whey Victor Martinez ?',
        answer:
          'Aucune fiche produit Victor Martinez de notre catalogue ne publie de tableau de valeurs nutritionnelles : les cinq références renvoient un bloc vide. Nous ne citons donc aucun chiffre par portion sur cette page. Les valeurs déclarées figurent sur l’étiquette du pot que vous recevez, et elles varient selon l’arôme et le format.',
      },
      {
        question: 'À quoi sert le pre-workout Break-Out ?',
        answer:
          'C’est une poudre à prendre avant la séance, la seule référence Victor Martinez qui ne soit ni une protéine ni un gainer. Elle ne remplace aucun des deux. Lisez la composition et la teneur en stimulants sur l’étiquette du pot, et évitez de la cumuler avec d’autres sources de caféine dans la même journée.',
      },
      {
        question: 'Comment commander Victor Martinez en Tunisie ?',
        answer:
          'Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.',
      },
    ],
    relatedCategories: [
      { slug: 'gainers-proteines', name: 'Gainers protéinés en Tunisie', url: '/gainers-proteines' },
      { slug: 'whey-proteine', name: 'Parcourir les whey protéines', url: '/whey-proteine' },
      { slug: 'whey-isolate', name: 'Parcourir les whey isolate', url: '/whey-isolate' },
      { slug: 'pre-workout', name: 'Pré-workouts disponibles en Tunisie', url: '/pre-workout' },
      { slug: 'brands', name: 'Comparer Victor Martinez aux autres marques', url: '/brands' },
    ],
  },

  'challenger-nutrition': {
    metaTitle: 'Challenger Nutrition Tunisie : Thunder Gainer, Pump Extreme',
    metaDescription:
      'Challenger Nutrition en Tunisie : Thunder Gainer 5,4 kg, Pump Extreme Pre-Workout 30 portions et 100% Whey Protein 2,27 kg. Dès {prixMin} DT, {nbEnStock} en stock.',
    h1: 'Challenger Nutrition Tunisie : Thunder Gainer, Pump Extreme, 100% Whey Protein et créatine',
    introHtml:
      '<p>Sur Protein.tn, la gamme <strong>Challenger Nutrition</strong> va de la prise de masse à la créatine, en passant par la protéine en poudre, le pré-workout et les acides aminés. En prise de masse, <strong>Thunder Gainer</strong> se présente en sac de 5,4 kg ; sur son propre site, la marque l’appelle « Thunder Gain » et le décrit comme un mélange de protéines et de glucides. Côté protéine, la <strong>100% Whey Protein</strong> est proposée en pot de 2,27 kg, arôme Chocolat, et la marque la présente comme une association de whey concentrée et de whey hydrolysée.</p><p>Le reste de la gamme se prend autour de la séance : <strong>Pump Extreme Pre-Workout</strong>, un pré-workout en pot annoncé pour 30 portions, <strong>EAA + BCAA</strong> au format 390 g et <strong>Creatine</strong> en pot de 300 g, que la marque décrit comme une créatine monohydrate en poudre. Leurs fiches ne précisent pas d’arôme. D’après le site de la marque, ses produits sont fabriqués dans des installations certifiées GMP.</p>',
    howToChooseTitle: 'Thunder Gainer ou 100% Whey : quel produit Challenger choisir ?',
    howToChooseBody:
      '<p>Tout dépend de ce qui manque à vos repas. S’ils couvrent déjà vos calories et qu’il vous manque surtout des protéines, regardez la <strong>100% Whey Protein</strong> : d’après l’étiquette du pot 2,27 kg arôme Chocolat reprise sur notre fiche, une portion de 34 g apporte 24 g de protéines pour 135 kcal, avec 66 portions annoncées par pot. Si c’est l’apport calorique total qui ne suit pas, <strong>Thunder Gainer</strong> 5,4 kg ajoute des glucides aux protéines ; notre fiche ne transcrit pas son tableau de valeurs, la taille de la portion et les calories se lisent donc sur le sac.</p><ul><li><strong>Source de protéines</strong> : whey concentrée et whey hydrolysée pour la 100% Whey Protein, whey concentrée pour Thunder Gainer, d’après le site de la marque.</li><li><strong>Avant la séance</strong> : Pump Extreme Pre-Workout, annoncé pour 30 portions, ne remplace ni la whey ni le gainer. Sa teneur éventuelle en caféine se vérifie sur l’étiquette du pot.</li><li><strong>Créatine ou acides aminés</strong> : Creatine 300 g n’apporte pas de protéines, et EAA + BCAA 390 g est un mélange d’acides aminés qui ne tient pas lieu de whey.</li></ul><p>Hors 100% Whey Protein, aucune de nos fiches Challenger ne reprend de tableau de valeurs : la dose et le mode d’emploi imprimés sur l’étiquette font foi. La 100% Whey Protein et Thunder Gainer contiennent de la whey, une protéine issue du lait : vérifiez la mention des allergènes sur l’emballage.</p>',
    faqs: [
      {
        question: 'Quel est le prix des produits Challenger Nutrition ?',
        answer:
          'Les {nbEnStock} références Challenger Nutrition en stock vont de {prixMin} à {prixMax} DT.',
      },
      {
        question: 'Thunder Gain et Thunder Gainer, est-ce le même produit Challenger ?',
        answer:
          'Oui. La marque écrit « Thunder Gain » sur son site et sur le sac, et notre catalogue le liste sous le nom Thunder Gainer, dans le rayon des gainers protéinés. Notre sac de 5,4 kg correspond au format 12 lbs (5,44 kg) proposé sur le site de la marque. Notre fiche ne transcrit pas son tableau de valeurs : la portion, les calories et les protéines par dose se lisent sur l’étiquette du sac.',
      },
      {
        question: 'Combien de protéines dans la 100% Whey Protein Challenger Nutrition ?',
        answer:
          'D’après l’étiquette du pot 2,27 kg arôme Chocolat reprise sur notre fiche, une portion de 34 g apporte 24 g de protéines, 5 g de glucides dont 1,5 g de sucres, 2 g de lipides dont 1 g d’acides gras saturés, et 135 kcal. Le pot annonce 66 portions. Ces chiffres ne s’appliquent qu’à cet arôme et à ce format.',
      },
      {
        question: 'La Creatine Challenger Nutrition est-elle de la créatine monohydrate ?',
        answer:
          'C’est ainsi que la marque la présente sur son site : une créatine monohydrate en poudre. Sur Protein.tn, elle est vendue en pot de 300 g, sans arôme précisé, et sa fiche ne transcrit pas de tableau de valeurs : la dose par portion et le mode d’emploi se lisent sur l’étiquette du pot. Elle n’apporte pas de protéines et ne remplace ni la whey ni le gainer.',
      },
      {
        question: 'Le Pump Extreme Pre-Workout de Challenger contient-il de la caféine ?',
        answer:
          'Notre fiche ne transcrit pas la composition de ce pré-workout : aucune teneur en caféine n’est donc avancée ici. Le pot est annoncé pour 30 portions, à prendre avant la séance. La liste des ingrédients et la quantité d’éventuels stimulants figurent sur son étiquette ; lisez-les avant la première prise, surtout si vous buvez déjà du café ou des boissons énergisantes dans la journée.',
      },
      {
        question: 'Comment se faire livrer un produit Challenger Nutrition ?',
        answer:
          'Choisissez le produit dans la grille, ajoutez-le au panier puis renseignez votre adresse de livraison. Protein.tn assure la livraison 24–72h partout en Tunisie, et vous réglez votre commande par paiement à la livraison, au moment où le colis vous est remis.',
      },
    ],
    relatedCategories: [
      { slug: 'gainers-proteines', name: 'Le rayon gainers protéinés', url: '/gainers-proteines' },
      { slug: 'pre-workout', name: 'Notre sélection de pré-workouts', url: '/pre-workout' },
      { slug: 'whey-proteine', name: 'Whey protéines : comparer les marques', url: '/whey-proteine' },
      { slug: 'creatine', name: 'Notre sélection de créatines', url: '/creatine' },
      { slug: 'brands', name: 'Comparer Challenger Nutrition aux autres marques', url: '/brands' },
    ],
    relatedBrands: ['kevin-levrone', 'victor-martinez', 'william-bonac', 'eric-favre'],
    officialUrl: 'https://challengernutrition.com/',
  },

  'now-foods': {
    metaTitle: 'NOW Foods Tunisie | Vitamines, Oméga 3 & Articulations',
    metaDescription:
      'NOW Foods en Tunisie : vitamines, minéraux, antioxydants, articulations, oméga 3, et 60 références NOW Foods Sports (whey, créatine, BCAA, végétales).',
    h1: 'NOW Foods Tunisie : vitamines, articulations et gamme NOW Foods Sports',
    introHtml:
      '<p>La gamme <strong>NOW Foods en Tunisie</strong> se compose surtout de gélules, de capsules molles et de comprimés plutôt que de pots de poudre, et elle se parcourt par substance. Côté <strong>vitamines</strong> : les multivitamines <strong>ADAM</strong> et <strong>Eve</strong>, la Vitamin D-3 en capsules molles, en comprimés à croquer, en gommes ou en flacon liquide, la MK-7 Vitamin K-2 et les Vitamin C Crystals en 227 g ou 1,36 kg. Les <strong>oméga 3</strong> comptent Omega-3 Fish Oil, Ultra Omega-3, Super Omega EPA, DHA-500, Krill Oil et Cod Liver Oil. Le rayon <strong>articulations</strong> réunit Glucosamine &amp; Chondroitin, avec ou sans MSM, MSM Powder en 227 g et 454 g, et Turmeric Curcumin. Suivent le magnésium (citrate, glycinate, malate, Magtein), les minéraux, les antioxydants comme la CoQ10, la spiruline (Spirulina), des extraits de plantes comme Milk Thistle Extract et Ginkgo Biloba, les acides aminés, les enzymes et les probiotiques.</p><p>La ligne <strong>NOW Foods Sports</strong> regroupe les références pour l’entraînement : <strong>Whey Protein Isolate</strong> de 544 g à 4,54 kg, Organic Whey Protein 454 g, Pea Protein, Soy Protein Isolate et Organic Plant Protein côté végétal, Creatine Monohydrate en poudre ou en gélules végétales, Micronized Creatine Monohydrate et Kre-Alkalyn Creatine, mais aussi BCAA, L-Glutamine, Beta-Alanine, ZMA et L-Carnitine liquide.</p>',
    howToChooseTitle: 'Gélules, capsules molles ou poudre : quel format NOW Foods choisir ?',
    howToChooseBody:
      '<p>Chez NOW Foods, une même substance existe souvent sous plusieurs formes : choisissez d’abord la forme, puis la contenance et le dosage inscrits sur la référence.</p><ul><li><strong>Gélules végétales</strong> : la forme la plus fréquente de la gamme, du magnésium au ginkgo, souvent en deux contenances ou plus, comme Magnesium Glycinate With BioPerine en 60 ou 180 gélules.</li><li><strong>Capsules molles</strong> : la forme habituelle des huiles (Omega-3 Fish Oil, Krill Oil, Cod Liver Oil), mais aussi de Vitamin D-3 High Potency et de plusieurs CoQ10.</li><li><strong>Comprimés à croquer et gommes</strong> : pour ne pas avaler de gélule, avec Chewable Vitamin D-3, Vitamin C Gummies ou Omega-3 Fish Oil Gummy Chews.</li><li><strong>Poudres</strong> : MSM Powder, Vitamin C Crystals, Magnesium Citrate Pure Powder ou Creatine Monohydrate 1 kg se dosent selon la mesure indiquée sur l’étiquette et se mélangent à une boisson.</li><li><strong>Liquides</strong> : Liquid Vitamin D-3 en 30 ou 59 ml, Omega-3 Fish Oil arôme citron en 500 ml, L-Carnitine liquide en 473 ou 946 ml.</li></ul><p>Pour les protéines NOW Foods Sports, la source décide : lait pour Whey Protein Isolate et Organic Whey Protein, pois pour Pea Protein, soja pour Soy Protein Isolate, blanc d’œuf pour Egg White Protein. Pour chaque référence, la dose par prise, le nombre de prises par jour et les allergènes figurent sur l’étiquette : c’est elle qui fait foi. En cas de traitement en cours, de grossesse ou pour un enfant, demandez conseil à votre pharmacien ou à votre médecin.</p>',
    faqs: [
      {
        question: 'Quels produits NOW Foods trouve-t-on sur Protein.tn ?',
        answer:
          'Les {nbProduits} références NOW Foods de cette page sont surtout des compléments en gélules, capsules molles et comprimés : vitamines, minéraux, magnésium, oméga 3, CoQ10 et autres antioxydants, extraits de plantes, acides aminés, enzymes et probiotiques. La ligne NOW Foods Sports y ajoute whey isolate, protéines végétales, créatine, BCAA, L-glutamine et L-carnitine liquide. Chaque format proposé figure dans la grille de produits.',
      },
      {
        question: 'NOW Foods propose-t-il de la whey et de la créatine ?',
        answer:
          'Oui, sous le nom NOW Foods Sports. Whey Protein Isolate existe en 544 g, 816 g, 2,27 kg et 4,54 kg, sans arôme, Creamy Chocolate ou Creamy Vanilla selon le format, à côté de Whey Protein Powder 907 g et d’Organic Whey Protein 454 g. Côté créatine : Creatine Monohydrate en poudre de 227 g ou 1 kg ou en gélules végétales, Micronized Creatine Monohydrate en 500 g et 1 kg, et Kre-Alkalyn Creatine en 120 et 240 gélules végétales.',
      },
      {
        question: 'Quel est le prix des compléments NOW Foods en Tunisie ?',
        answer:
          'Les {nbEnStock} références NOW Foods en stock vont de {prixMin} à {prixMax} DT.',
      },
      {
        question: 'Quelle vitamine D-3 NOW Foods choisir : capsule, gomme ou liquide ?',
        answer:
          'La vitamine D-3 NOW Foods existe sous cinq formes : capsules molles (Vitamin D-3 High Potency et Max Potency, de 12 à 360 capsules par flacon), comprimés à croquer (Chewable Vitamin D-3), gommes (Vitamin D3 Gummies), liquide en flacon de 30 ou 59 ml (Liquid Vitamin D-3) et gélules (Vitamin D3 & K2). Vegetarian Dry Vitamin D, en gélules végétales, contient de la vitamine D2 selon sa fiche. Le dosage, en UI ou en µg, est imprimé sur l’étiquette de chaque référence.',
      },
      {
        question: 'Quel magnésium NOW Foods choisir : citrate, glycinate, malate ou Magtein ?',
        answer:
          'La forme de magnésium figure dans le nom de la référence : Magnesium Citrate en gélules végétales, capsules molles, comprimés ou poudre de 227 g ; Magnesium Glycinate With BioPerine en 60 ou 180 gélules végétales ; Magnesium Malate en gélules végétales ou en comprimés ; Magtein (Magnesium L-Threonate) en poudre de 91 g ou en 180 gélules végétales ; Magnesium Oxide Pure Powder en 227 g. La quantité de magnésium par prise est indiquée sur l’étiquette de chacune.',
      },
      {
        question: 'Quelle huile oméga 3 NOW Foods choisir ?',
        answer:
          'Le choix porte d’abord sur la source : huile de poisson (Omega-3 Fish Oil, Ultra Omega-3, Super Omega EPA, DHA-250, DHA-500 et DHA-1000), huile de foie de morue (Cod Liver Oil), huile de krill (Krill Oil) ou huile de lin (Flax Oil). Omega-3 Fish Oil existe aussi en liquide arôme citron de 500 ml et en Gummy Chews. La teneur en acides gras par prise est imprimée sur l’étiquette de chaque flacon.',
      },
    ],
    relatedCategories: [
      { slug: 'vitamines', name: 'Comparer ADAM et Eve aux autres multivitamines', url: '/vitamines' },
      { slug: 'omega-3', name: 'Comparer Ultra Omega-3 aux autres huiles de poisson', url: '/omega-3' },
      { slug: 'magnesium', name: 'Comparer Magnesium Glycinate aux autres magnésiums', url: '/magnesium' },
      { slug: 'articulations', name: 'Comparer Glucosamine & Chondroitin aux autres formules articulaires', url: '/articulations' },
      { slug: 'brands', name: 'Comparer NOW Foods aux autres marques', url: '/brands' },
    ],
    relatedBrands: ['weightworld', 'biotech-usa', 'doctor-s-best', 'nutricost'],
    officialUrl: 'https://www.nowfoods.com/',
  },

  'doctor-s-best': {
    metaTitle: 'Doctor’s Best Tunisie | Articulations, CoQ10 & Collagène',
    metaDescription:
      'Doctor’s Best en Tunisie : glucosamine-chondroïtine-MSM, High Absorption CoQ10 et Curcumin, magnésium, collagène types 1 et 3, vitamine D3 et biotine.',
    h1: 'Doctor’s Best Tunisie : articulations, CoQ10 et collagène',
    introHtml:
      '<p>Le catalogue <strong>Doctor’s Best en Tunisie</strong> est concentré sur trois familles, et cela se voit dans la grille ci-dessus. Les <strong>articulations</strong> d’abord, avec Glucosamine Chondroitin MSM + Hyaluronic Acid en 150 gélules végétales, Vegan Glucosamine Chondroitin MSM, Boswellia + UC-II et High Absorption Curcumin en 120 comprimés. Les <strong>antioxydants</strong> ensuite : High Absorption CoQ10 en capsules molles, CoQ10 + Nattokinase, Alpha-Lipoic Acid 300 et 600 en 180 gélules végétales. Les <strong>vitamines</strong> enfin, dont Vitamin D3 en 180 et 360 capsules molles et Vitamin D3 + K2 MK-7. S’y ajoutent le <strong>collagène</strong> (Types 1 &amp; 3 &amp; Vitamin C, Pure Collagen Peptides 417 g), le <strong>magnésium</strong> en poudre et en gélules, la digestion, le sommeil et la beauté des cheveux.</p>',
    howToChooseTitle: 'Quel produit Doctor’s Best choisir ?',
    howToChooseBody:
      '<p>La marque revient souvent sur la même substance en faisant varier un seul paramètre, et c’est là que se joue le choix. Le <strong>collagène</strong> existe en comprimés (Types 1 and 3 &amp; Vitamin C, 180 ou 540 comprimés), en gélules (240) et en poudre (Pure Collagen Types 1 and 3, 200 g ; Pure Collagen Peptides, 417 g) : la poudre se mélange à une boisson, le comprimé ne demande rien. Le <strong>magnésium</strong> suit la même logique, entre High Absorption Magnesium en 120 gélules végétales ou comprimés, la version 240 comprimés et une poudre aromatisée de 350 g.</p>' +
      '<p>Sur les <strong>articulations</strong>, les formules se distinguent par ce qu’elles associent : glucosamine et chondroïtine seules, avec MSM, avec acide hyaluronique, avec UC-II, ou en version végane. Lisez la composition plutôt que le nom. Même remarque pour la <strong>CoQ10</strong>, proposée seule, avec PQQ, avec nattokinase ou avec NMN. Les dosages exacts, la forme et les allergènes figurent sur l’étiquette de la référence choisie ; aucune valeur n’est reprise ici, et ces produits ne remplacent ni une alimentation équilibrée ni un avis médical.</p>',
    faqs: [
      {
        question: 'Quels produits Doctor’s Best sont vendus en Tunisie ?',
        answer:
          'Protein.tn référence surtout les formules articulations (Glucosamine Chondroitin MSM + Hyaluronic Acid, Vegan Glucosamine Chondroitin MSM, Boswellia + UC-II, High Absorption Curcumin), les antioxydants (High Absorption CoQ10, CoQ10 + Nattokinase, Alpha-Lipoic Acid 300 et 600), les vitamines (Vitamin C, Vitamin D3, Vitamin D3 + K2 MK-7, Fully Active Folate), le collagène, le magnésium, la digestion, le sommeil et la biotine.',
      },
      {
        question: 'Collagène en poudre ou en comprimés chez Doctor’s Best ?',
        answer:
          'Les deux existent. Pure Collagen Types 1 and 3 est proposé en poudre de 200 g et Pure Collagen Peptides en 417 g, tandis que Collagen Types 1 and 3 & Vitamin C existe en 180 ou 540 comprimés et en 240 gélules. La poudre se dose librement et se mélange à une boisson ; le comprimé se prend sans préparation. La composition annoncée diffère d’une référence à l’autre : comparez les étiquettes.',
      },
      {
        question: 'Quelle différence entre les formules articulations de la marque ?',
        answer:
          'Elles combinent des ingrédients différents autour du même besoin : glucosamine et chondroïtine seules, avec MSM, avec acide hyaluronique, avec UC-II, en version végane, ou sous forme de curcuma et de boswellia. Le nom commercial ne suffit pas à les distinguer ; la liste des ingrédients imprimée sur le flacon, elle, le fait.',
      },
      {
        question: 'Comment commander Doctor’s Best en Tunisie ?',
        answer:
          'Choisissez la référence et le format disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie et accepte le paiement à la livraison. Le délai et les frais dépendent de la destination et vous sont indiqués au moment de la commande ; le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.',
      },
    ],
    relatedCategories: [
      { slug: 'articulations', name: 'Articulations et mobilité', url: '/articulations' },
      { slug: 'antioxydants', name: 'Le rayon antioxydants', url: '/antioxydants' },
      { slug: 'vitamines', name: 'Vitamines en gélules et comprimés', url: '/vitamines' },
      { slug: 'collagene', name: 'Le rayon collagène', url: '/collagene' },
      { slug: 'magnesium', name: 'Magnésium : tous les formats', url: '/magnesium' },
      { slug: 'brands', name: 'Comparer Doctor’s Best aux autres marques', url: '/brands' },
    ],
  },

  nutricost: {
    metaTitle: 'Nutricost Tunisie | Créatine, BCAA, Whey & Vitamines',
    metaDescription:
      'Nutricost en Tunisie : créatine monohydrate et HCl, BCAA, EAA, citrulline, whey concentrate et isolate, caséine, pré-workout, vitamines et minéraux.',
    h1: 'Nutricost Tunisie : créatine, acides aminés, whey et vitamines',
    introHtml:
      '<p><strong>Nutricost en Tunisie</strong> couvre les deux moitiés du catalogue à la fois, ce qui est rare. Côté entraînement : <strong>créatine</strong> monohydrate en quatorze références — aromatisée en 207 g, 300 g, 500 g, 520 g et 570 g, sans arôme en 454 g, 500 g et 1 kg, plus une version en 180 gélules et un Variety Pack de 6,7 g — et <strong>Creatine HCl</strong> 225 g sans arôme, <strong>BCAA</strong> en poudre et en gélules, <strong>EAA</strong> 249 g et 330 g, <strong>L-Citrulline</strong> et Citrulline Malate 2:1 de 250 g à 1,2 kg, <strong>bêta-alanine</strong>, <strong>L-Glutamine</strong> jusqu’au format 1 kg, <strong>HMB</strong>, le pré-workout <strong>PRE-X</strong>, <strong>Whey Protein Concentrate</strong> et <strong>Grass-Fed Whey</strong>, <strong>Whey Protein Isolate</strong> en 907 g et 2 268 g, et <strong>Casein Protein</strong>. Côté quotidien : plantes et extraits, vitamines, minéraux, magnésium, zinc, immunité, sommeil et collagène. La plupart des poudres existent aussi en version sans arôme.</p>',
    howToChooseTitle: 'Quel produit Nutricost choisir ?',
    howToChooseBody:
      '<p>Deux décisions structurent le catalogue. La première est <strong>arôme ou sans arôme</strong> : la marque publie presque systématiquement les deux, et la version neutre se mélange à n’importe quelle boisson ou à un shake déjà parfumé, ce qui évite d’empiler deux goûts. La seconde est le <strong>format</strong> : la Citrulline Malate 2:1 va de 300 g à 1,2 kg, la L-Glutamine de 250 g à 1 kg, la Whey Protein Isolate de 907 g à 2 268 g. À dose journalière égale, seule la durée couverte par le pot change.</p>' +
      '<p>Sur la créatine, deux formes coexistent : la <strong>monohydrate</strong>, la plus courante, et la <strong>Creatine HCl</strong> en 225 g sans arôme. Sur les protéines, <strong>Whey Protein Concentrate</strong>, <strong>Grass-Fed Whey</strong>, <strong>Whey Protein Isolate</strong> et <strong>Casein Protein</strong> ne se substituent pas l’une à l’autre : l’isolat est plus filtré, la caséine est une protéine lente, la mention grass-fed porte sur l’origine du lait. Les acides aminés — BCAA, EAA, citrulline, bêta-alanine, glutamine — viennent après, une fois l’apport protéique total couvert par l’alimentation ou par une poudre. Les valeurs par portion sont imprimées sur l’étiquette de chaque référence et ne sont pas reprises ici.</p>',
    faqs: [
      {
        question: 'Quels produits Nutricost trouve-t-on en Tunisie ?',
        answer:
          'Protein.tn référence côté sport la créatine monohydrate et la Creatine HCl, les BCAA en poudre et en gélules, les EAA, la L-Citrulline et la Citrulline Malate 2:1, la bêta-alanine, la L-Glutamine, le HMB, le pré-workout PRE-X, la Whey Protein Concentrate, la Grass-Fed Whey, la Whey Protein Isolate et la Casein Protein ; côté quotidien, des plantes et extraits, des vitamines, des minéraux, du magnésium, du zinc, des produits immunité, sommeil et collagène.',
      },
      {
        question: 'Créatine monohydrate ou Creatine HCl chez Nutricost ?',
        answer:
          'Les deux formes sont référencées : la monohydrate en quatorze références — des poudres de 207 g à 1 kg, aromatisées comme sans arôme, une version en 180 gélules et un Variety Pack de 6,7 g — et la Creatine HCl en 225 g sans arôme. Ce sont deux formes différentes de la même molécule ; la dose indiquée et la solubilité annoncée diffèrent de l’une à l’autre, et ces informations figurent sur l’étiquette du pot que vous commandez.',
      },
      {
        question: 'Pourquoi autant de versions « sans arôme » ?',
        answer:
          'La marque décline la plupart de ses poudres en version neutre et en versions aromatisées. Le sans arôme se mélange à un jus, à un shake déjà parfumé ou à de l’eau sans superposer deux goûts, et c’est utile quand vous prenez plusieurs poudres dans la même journée. L’ingrédient actif est le même ; seul l’arôme change.',
      },
      {
        question: 'Quel format de Whey Protein Isolate choisir ?',
        answer:
          'La Whey Protein Isolate est proposée en 907 g et en 2 268 g, dans plusieurs parfums et en version sans arôme. À consommation égale, le grand format couvre simplement une période plus longue. Comparez le prix affiché des deux formats sur cette page : c’est une question de budget et de rotation, pas de qualité.',
      },
      {
        question: 'Comment commander Nutricost en Tunisie ?',
        answer:
          'Choisissez la référence, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie et accepte le paiement à la livraison. Le délai et les frais dépendent de la destination et vous sont indiqués au moment de la commande ; le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.',
      },
    ],
    relatedCategories: [
      { slug: 'creatine', name: 'Créatines : voir tout le rayon', url: '/creatine' },
      { slug: 'whey-proteine', name: 'Parcourir tout le rayon whey', url: '/whey-proteine' },
      { slug: 'bcaa', name: 'BCAA : tous les formats', url: '/bcaa' },
      { slug: 'citrulline', name: 'Citrulline en Tunisie', url: '/citrulline' },
      { slug: 'vitamines', name: 'Vitamines : comparer les marques', url: '/vitamines' },
      { slug: 'mineraux', name: 'Le rayon minéraux', url: '/mineraux' },
      { slug: 'brands', name: 'Comparer Nutricost aux autres marques', url: '/brands' },
    ],
  },

  'rule-one-proteins': {
    metaTitle: 'Rule One Proteins Tunisie | R1 Whey, BCAA & Créatine',
    metaDescription:
      'Rule One Proteins en Tunisie : Whey Protein de 888 g à 2,28 kg, Active BCAA 390 g et Creatine sans arôme 156 g. Dès {prixMin} DT, {nbEnStock} en stock.',
    h1: 'Rule One Proteins Tunisie : Whey Protein, Clear Whey Isolate, BCAA et créatine',
    introHtml:
      '<p>Les protéines Rule One se déclinent par source et par texture. <strong>Whey Protein</strong> existe en pots d’environ 900 g (Cafe Mocha, Chocolate Peanut Butter, Salted Caramel, Strawberries &amp; Creme) et en 2,24 kg ou 2,28 kg (Cookies &amp; Creme, Chocolate Fudge). <strong>R1 Protein Whey Isolate</strong>, en 763 g Pure Vanilla et 780 g Dark Chocolate, associe isolat et isolat partiellement hydrolysé, sans concentré. <strong>Clear Whey Isolate</strong> 689 g donne une boisson claire aux arômes de fruits. <strong>Casein Protein</strong> 910 g est une caséine micellaire, <strong>Plant Protein</strong> 620 g et 670 g une protéine sans produits laitiers, et <strong>Source7</strong> 897 g et 902 g réunit sept sources de protéines. Le <strong>Clean Gainer</strong> 2,18 kg, en Chocolate Peanut Butter, est le seul gainer Rule One du catalogue.</p><p>Pour l’entraînement, la marque propose <a href="/eaa">Essential Amino 9</a> en 330 g et 345 g, les <strong>BCAA</strong> de 174 g sans arôme à 255 g, <strong>Active BCAA</strong> de 375 g à 405 g, <a href="/acides-amines">Energized Amino</a> en 270 g, les créatines <strong>Creatine</strong> et <strong>Charged Creatine</strong>, et les pré-workouts <a href="/pre-workout">preLIFT et Roar</a>. S’y ajoutent <a href="/collagene">Collagen Peptides et Multi-Source Collagen</a>, avec vitamine C et acide hyaluronique, et les multivitamines Men’s Multi 90 comprimés et Women’s Multi 60 comprimés. Ces compositions sont celles que décrit la marque ; l’étiquette du pot reste la référence.</p>',
    howToChooseTitle: 'Whey Protein, isolat ou Clear Whey : quelle protéine Rule One ?',
    howToChooseBody:
      '<p>Partez de la source de protéine, puis du format.</p><ul><li><strong>Pour l’apport de tous les jours</strong> : Whey Protein est la poudre polyvalente de la marque, et la seule whey Rule One du catalogue proposée aussi en grand pot, 2,24 kg ou 2,28 kg selon l’arôme, un format pratique si vous en prenez chaque jour.</li><li><strong>Pour un shake à base d’isolat</strong> : R1 Protein Whey Isolate, sans concentré, se prépare comme un shake classique, en Dark Chocolate ou Pure Vanilla.</li><li><strong>Pour une boisson légère</strong> : Clear Whey Isolate donne une boisson claire et fruitée, plus proche d’une boisson de sport que d’un milk-shake ; la marque y ajoute des électrolytes.</li><li><strong>Pour une protéine lente</strong> : Casein Protein, une caséine micellaire que la marque conseille entre les repas ou avant le coucher.</li><li><strong>Sans produits laitiers</strong> : Plant Protein, qui associe quatre sources végétales d’après la marque.</li><li><strong>Pour varier les sources</strong> : Source7 en réunit sept, dont la liste figure sur l’étiquette.</li><li><strong>Pour ajouter des calories</strong> : le Clean Gainer combine protéines, glucides et lipides ; il complète les repas et ne remplace pas une whey.</li></ul><p>Whey Protein, les deux isolats et Casein Protein sont des protéines de lait. La dose par portion, la liste des ingrédients et les allergènes se lisent sur l’étiquette du pot et de l’arôme retenus : c’est elle qui fait foi.</p>',
    faqs: [
      {
        question: 'Quel est le prix des produits Rule One Proteins ?',
        answer:
          'Les {nbEnStock} références Rule One Proteins en stock vont de {prixMin} à {prixMax} DT.',
      },
      {
        question: 'Clear Whey Isolate ou R1 Protein Whey Isolate : quelle différence ?',
        answer:
          'Les deux reposent sur de l’isolat de lactosérum. Clear Whey Isolate, en 689 g, se prépare en boisson claire et fruitée, en Blue Raspberry, Peach Mango ou Strawberry Lemonade, avec des électrolytes ajoutés selon la marque. R1 Protein Whey Isolate, en 763 g Pure Vanilla et 780 g Dark Chocolate, associe isolat et isolat partiellement hydrolysé pour un shake lacté classique. Le choix se fait surtout sur la texture et le goût.',
      },
      {
        question: 'Quels formats et quels arômes pour la Whey Protein Rule One ?',
        answer:
          'Whey Protein existe en pots d’environ 900 g : 888 g Chocolate Peanut Butter, 905 g Salted Caramel ou Strawberries & Creme, 918 g Cafe Mocha. Le grand format va de 2,24 kg en Cookies & Creme à 2,28 kg en Chocolate Fudge. Le poids net varie légèrement d’un arôme à l’autre ; celui de chaque pot figure dans le nom de la référence.',
      },
      {
        question: 'Creatine ou Charged Creatine Rule One : laquelle choisir ?',
        answer:
          'Creatine est une créatine monohydrate, sans arôme en 156 g ou aromatisée en 210 g, Blue Raspberry ou Fruit Punch. Charged Creatine associe, d’après la marque, trois formes de créatine, des électrolytes et de la caféine, en 240 g (Mandarin Mango, Snow Cone) ou 270 g (Blue Razz Lemonade). Si vous limitez la caféine ou prenez déjà un pré-workout, notez que la marque n’en annonce que dans Charged Creatine.',
      },
      {
        question: 'Essential Amino 9, BCAA, Active BCAA ou Energized Amino : quelle différence ?',
        answer:
          'Essential Amino 9 réunit les neuf acides aminés essentiels, en 330 g et 345 g. Les BCAA n’en apportent que trois, leucine, isoleucine et valine, dans un rapport 2:1:1 selon la marque, de 174 g sans arôme à 255 g. Active BCAA y ajoute glutamine, citrulline, taurine et électrolytes, de 375 g à 405 g. Energized Amino, en 270 g, associe acides aminés et caféine d’après la marque, à prendre en compte si vous utilisez déjà un pré-workout.',
      },
      {
        question: 'preLIFT ou Roar : quel pré-workout Rule One choisir ?',
        answer:
          'Les deux sont des pré-workouts en poudre aromatisée. preLIFT est proposé de 420 g à 450 g, en Blue Raspberry, Orange Pineapple et Wild Grape ; Roar de 285 g à 315 g, en Fruit Punch, Peach Mango et Wild Grape. Ce sont deux formules distinctes : les stimulants éventuels et leur dose figurent sur l’étiquette, à comparer avant de les associer à Energized Amino ou à Charged Creatine.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-proteine', name: 'Whey protéines : voir le rayon', url: '/whey-proteine' },
      { slug: 'whey-isolate', name: 'Whey isolate : voir le rayon', url: '/whey-isolate' },
      { slug: 'bcaa', name: 'Comparer les BCAA', url: '/bcaa' },
      { slug: 'creatine', name: 'Créatines : comparer les marques', url: '/creatine' },
      { slug: 'brands', name: 'Comparer Rule One Proteins aux autres marques', url: '/brands' },
    ],
    relatedBrands: ['optimum-nutrition', 'muscletech', 'ostrovit'],
    officialUrl: 'https://www.ruleoneproteins.com/',
  },

  'vital-proteins': {
    metaTitle: 'Vital Proteins Tunisie | Collagen Peptides & Matcha',
    metaDescription:
      'Vital Proteins en Tunisie : Collagen Peptides 299 g, Matcha Collagen 299 g, Collagen Gummies 120 gommes et Cartilage Collagen 120 gélules.',
    h1: 'Vital Proteins Tunisie : Collagen Peptides et Matcha Collagen',
    introHtml:
      '<p><strong>Vital Proteins en Tunisie</strong> est une gamme mono-sujet : toutes les références proposées sur Protein.tn relèvent du <strong>collagène</strong>, et ce qui change d’une à l’autre, c’est la forme sous laquelle vous le prenez. En poudre : <strong>Collagen Peptides</strong> 299 g, en Pumpkin Spice et Salted Caramel, et <strong>Matcha Collagen</strong> 299 g, qui associe le collagène à du thé matcha. À croquer : <strong>Collagen Gummies</strong> en 120 gommes, parfum framboise. En gélules : <strong>Cartilage Collagen</strong> en 120 gélules.</p>',
    howToChooseTitle: 'Quelle forme de collagène Vital Proteins choisir ?',
    howToChooseBody:
      '<p>Le choix est entièrement une question d’usage. La <strong>poudre</strong> (Collagen Peptides 299 g) se mélange dans un café, un yaourt ou une boisson et permet d’ajuster la dose ; c’est la forme la plus souple, mais elle demande une préparation. <strong>Matcha Collagen</strong> part de la même idée en y ajoutant du matcha, donc une boisson déjà constituée plutôt qu’un ingrédient neutre. Les <strong>gommes</strong> se prennent sans eau et sans shaker, ce qui compte si la contrainte est d’y penser tous les jours plutôt que de doser. Les <strong>gélules</strong> de Cartilage Collagen, enfin, sont la forme la plus discrète à transporter.</p>' +
      '<p>Un point mérite d’être dit clairement : ces produits ne sont pas des protéines d’entraînement et ne remplacent pas une whey. Le collagène ne couvre pas le même profil d’acides aminés qu’une protéine de lactosérum ; si votre objectif est l’apport protéique quotidien, c’est vers le rayon protéines qu’il faut regarder. La dose par portion et la liste des ingrédients sont imprimées sur l’étiquette de chaque référence, et nous n’en reprenons aucune valeur ici.</p>',
    faqs: [
      {
        question: 'Quels produits Vital Proteins sont vendus en Tunisie ?',
        answer:
          'Protein.tn référence Collagen Peptides en 299 g (Pumpkin Spice et Salted Caramel), Matcha Collagen en 299 g, Collagen Gummies en 120 gommes parfum framboise et Cartilage Collagen en 120 gélules. La grille de produits de cette page indique les références et les formats effectivement proposés.',
      },
      {
        question: 'Poudre, gommes ou gélules : quelle différence ?',
        answer:
          'La poudre se mélange à une boisson chaude ou froide et laisse ajuster la dose. Les gommes se prennent telles quelles, sans eau ni shaker. Les gélules sont la forme la plus discrète à transporter. La différence est pratique : c’est la régularité de la prise qui compte, et elle dépend de la forme qui s’intègre le mieux à votre journée.',
      },
      {
        question: 'Le collagène remplace-t-il une whey protéine ?',
        answer:
          'Non. Le collagène n’apporte pas le même profil d’acides aminés qu’une protéine de lactosérum et n’est pas destiné à couvrir un apport protéique d’entraînement. Si votre objectif est le total protéique quotidien, regardez le rayon protéines ; le collagène répond à un autre besoin.',
      },
      {
        question: 'Comment commander Vital Proteins en Tunisie ?',
        answer:
          'Choisissez la référence, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie et accepte le paiement à la livraison. Le délai et les frais dépendent de la destination et vous sont indiqués au moment de la commande ; le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.',
      },
    ],
    relatedCategories: [
      { slug: 'collagene', name: 'Collagène en Tunisie', url: '/collagene' },
      { slug: 'sante-vitalite', name: 'Rayon santé et vitalité', url: '/sante-vitalite' },
      { slug: 'brands', name: 'Comparer Vital Proteins aux autres marques', url: '/brands' },
    ],
  },

  'universal-nutrition': {
    metaTitle: 'Universal Nutrition Tunisie | Animal Pak & Animal Cuts',
    metaDescription:
      'Universal Nutrition en Tunisie : Animal Pak en 30 ou 44 packs, Animal Cuts en 42 sachets et Carbo Plus 1 kg. Dès {prixMin} DT, {nbEnStock} en stock.',
    h1: 'Universal Nutrition Tunisie : Animal Pak, Animal Cuts et Carbo Plus',
    introHtml:
      '<p>Sur Protein.tn, la gamme <strong>Universal Nutrition</strong> s’organise autour de la ligne <strong>Animal</strong>, que le fabricant présente sur son site comme l’une de ses marques. <strong>Animal Pak</strong> se décline en packs individuels, vendus en boîte de 30 ou de 44, et en <strong>Animal Pak Powder</strong> de 44 doses à diluer, au goût fruit de la passion. <strong>Animal Cuts</strong> reprend le principe des packs, en boîtes de 42 sachets ou de 42 doses, avec une déclinaison <strong>Animal Cuts No-Stim Powder</strong> de 42 doses, elle aussi au fruit de la passion. <strong>Animal Stak</strong> se présente en 23 packs et <strong>Animal Omega</strong> en 30 packs.</p><p>Le reste de la gamme se compose de poudres, de capsules et de comprimés : <strong>Animal Whey Isolate Loaded</strong> en 2,27 kg au goût double chocolat, la poudre de glucides <strong>Carbo Plus</strong> en 1 kg, <strong>ZMA Pro</strong> en 90 capsules, <strong>Beef Aminos</strong> en 200 comprimés, <strong>Natural Sterol</strong> en 100 comprimés et <strong>GH Max</strong> en 180 comprimés, plus un shaker Universal Nutrition de 700 ml. À noter : Animal Pak et Animal Cuts figurent sur cette page, et non sous la marque « Animal » de notre catalogue, qui regroupe d’autres produits Animal.</p>',
    howToChooseTitle: 'Animal Pak, Animal Cuts ou Carbo Plus : lequel choisir ?',
    howToChooseBody:
      '<p>Le nom Animal couvre des produits très différents : partez de votre besoin plutôt que de la ligne.</p><ul><li><strong>Un complément de base pour chaque jour</strong> : Animal Pak. En boîte de 30 ou de 44 packs, chaque prise est un sachet de comprimés à avaler avec de l’eau ; Animal Pak Powder, en 44 doses, se prépare à la mesurette dans de l’eau. Le nombre de jours couverts dépend de la dose indiquée sur la boîte.</li><li><strong>Animal Cuts en packs ou en poudre</strong> : les boîtes de 42 sachets et de 42 doses se prennent en packs, Animal Cuts No-Stim Powder se dilue. Le suffixe No-Stim signale une version sans stimulants ; si vous limitez la caféine, comparez la liste d’ingrédients de chaque version avant de commander.</li><li><strong>Des glucides autour de l’entraînement</strong> : Carbo Plus 1 kg. Il est rangé dans les glucides, pas parmi les gainers ; pour réunir protéines et glucides dans un même shake, associez-le à une protéine.</li><li><strong>Des protéines</strong> : Animal Whey Isolate Loaded 2,27 kg, double chocolat. Comme toute whey, elle provient du lait : vérifiez la mention des allergènes sur l’emballage.</li><li><strong>Un apport ciblé</strong> : Animal Omega en 30 packs (acides gras oméga-3 et oméga-6), ZMA Pro en 90 capsules (zinc, magnésium et vitamine B6) ou Beef Aminos en 200 comprimés (acides aminés issus de protéines de bœuf).</li></ul><p>La fiche Animal Pak 30 packs mentionne du lait et du soja selon les versions. Pour la dose, la composition et les allergènes de chaque produit, l’étiquette de l’emballage sert de référence.</p>',
    faqs: [
      {
        question: 'Où trouver Animal Pak en Tunisie ?',
        answer:
          'Sur cette page : Animal Pak est un produit Universal Nutrition, référencé en boîte de 30 packs, en boîte de 44 packs et en Animal Pak Powder de 44 doses, au goût fruit de la passion. La marque « Animal » de notre catalogue regroupe d’autres produits et ne contient pas ces packs. Chaque fiche précise si le produit est en stock ou sur commande.',
      },
      {
        question: 'Animal Pak en packs ou en poudre : quelle différence ?',
        answer:
          'La différence tient d’abord au format. Les boîtes de 30 et de 44 packs contiennent des sachets individuels de comprimés, un par prise. Animal Pak Powder, en 44 doses au goût fruit de la passion, est une poudre à mélanger à de l’eau. Les deux versions n’ont pas forcément la même liste d’ingrédients : comparez les étiquettes avant de choisir.',
      },
      {
        question: 'Quelle différence entre Animal Cuts et Animal Cuts No-Stim Powder ?',
        answer:
          'Animal Cuts est proposé en packs, en boîtes de 42 sachets ou de 42 doses. Animal Cuts No-Stim Powder est une poudre à diluer de 42 doses, au goût fruit de la passion, que son nom présente comme une version sans stimulants. Si vous évitez la caféine, vérifiez la liste d’ingrédients sur l’étiquette de la version choisie avant de commander.',
      },
      {
        question: 'Carbo Plus est-il un gainer ?',
        answer:
          'Non. Carbo Plus 1 kg est rangé dans notre rayon glucides et non parmi les gainers. C’est une poudre de glucides à mélanger à de l’eau ou à un shake protéiné. Si vous cherchez protéines et glucides dans un même produit, comparez-le avec les gainers ; la composition de la portion figure sur l’étiquette.',
      },
      {
        question: 'Quel est le prix d’Animal Pak et des autres produits Universal Nutrition ?',
        answer:
          'Les {nbEnStock} références Universal Nutrition en stock vont de {prixMin} à {prixMax} DT.',
      },
      {
        question: 'Quels autres produits Universal Nutrition sont proposés ?',
        answer:
          'En plus d’Animal Pak et d’Animal Cuts, le catalogue compte Animal Stak en 23 packs, Animal Omega en 30 packs, Animal Whey Isolate Loaded en 2,27 kg au goût double chocolat, Carbo Plus 1 kg, ZMA Pro en 90 capsules, Beef Aminos en 200 comprimés, Natural Sterol en 100 comprimés, GH Max en 180 comprimés et un shaker de 700 ml.',
      },
    ],
    relatedCategories: [
      { slug: 'vitamines', name: 'Comparer Animal Pak aux autres multivitamines', url: '/vitamines' },
      { slug: 'bruleurs-de-graisse', name: 'Le rayon brûleurs de graisse', url: '/bruleurs-de-graisse' },
      { slug: 'boosters-hormonaux', name: 'Plantes et boosters', url: '/boosters-hormonaux' },
      { slug: 'glucides', name: 'Glucides et énergie', url: '/glucides' },
      { slug: 'brands', name: 'Comparer Universal Nutrition aux autres marques', url: '/brands' },
    ],
    relatedBrands: ['muscletech', 'nutrex-research', 'ostrovit'],
    officialUrl: 'https://www.universalnutrition.com/',
  },

  'olimp-sport-nutrition': {
    metaTitle: 'Olimp Sport Nutrition Tunisie | Gain Bolic 6000',
    metaDescription:
      'Olimp Sport Nutrition en Tunisie : Gain Bolic 6000 6,8 kg, Whey Protein Complex 100% 2,27 kg et Pure Whey Isolate 95 2,2 kg. Dès {prixMin} DT, {nbEnStock} en stock.',
    h1: 'Olimp Sport Nutrition Tunisie : Gain Bolic 6000, Max Mass 3XL et Pure Whey Isolate 95',
    introHtml:
      '<p><strong>Olimp Sport Nutrition</strong> est la marque sportive d’Olimp Laboratories, que son site décrit comme une entreprise pharmaceutique polonaise. La sélection Olimp Sport Nutrition en Tunisie repose sur deux gainers et deux whey, pour deux usages distincts : augmenter l’apport calorique, ou compléter uniquement l’apport en protéines.</p><p>Les gainers sont conditionnés en grands sacs : <strong>Gain Bolic 6000</strong> en 6,8 kg et <strong>Max Mass 3XL</strong> en 6 kg, chacun en arôme fraise ou chocolat. Les whey sont vendues en pots. <strong>Whey Protein Complex 100%</strong>, en 2,27 kg, se décline en double chocolat ou cookies ; elle figure parmi nos protéines multi-sources parce qu’elle associe un concentré et un isolat de whey. <strong>Pure Whey Isolate 95</strong>, en 2,2 kg, existe en chocolat ou vanille et rejoint les whey isolate, puisque l’isolat de lactosérum y est la seule source de protéines.</p>',
    howToChooseTitle: 'Gainer ou whey : quel produit Olimp Sport Nutrition choisir ?',
    howToChooseBody:
      '<p>Partez de votre alimentation plutôt que de l’emballage. Si vos repas ne suffisent pas à atteindre l’apport calorique que vous visez, un gainer ajoute des glucides en même temps que des protéines. Si vos calories sont déjà couvertes et que seules les protéines manquent, une whey les complète sans la charge en glucides d’un gainer. Selon les compositions publiées par Olimp :</p><ul><li><strong>Gain Bolic 6000</strong>, sac de 6,8 kg : des glucides et un mélange de concentré de whey, de caséine micellaire et de protéines d’œuf.</li><li><strong>Max Mass 3XL</strong>, sac de 6 kg : des glucides et de la whey sous trois formes, concentré, isolat et hydrolysat.</li><li><strong>Whey Protein Complex 100%</strong>, pot de 2,27 kg : un concentré de whey ultrafiltré associé à un isolat.</li><li><strong>Pure Whey Isolate 95</strong>, pot de 2,2 kg : de l’isolat de lactosérum pour seule protéine.</li></ul><p>Les deux gainers contiennent aussi de la créatine monohydrate et de la taurine, un point à vérifier si une créatine fait déjà partie de votre routine. Ces quatre références renferment des protéines de lait ; Gain Bolic 6000 contient en plus de l’œuf, et la lécithine de soja figure dans les deux gainers et dans Pure Whey Isolate 95. Nos fiches ne reprennent pas de tableau nutritionnel pour ces produits : pour la portion, les protéines et les sucres de chaque arôme, reportez-vous à l’étiquette du produit commandé.</p>',
    faqs: [
      {
        question: 'Quels gainers et quelles whey Olimp propose Protein.tn ?',
        answer:
          'Deux gainers et deux whey, chacun en deux arômes. Gain Bolic 6000 en sac de 6,8 kg et Max Mass 3XL en sac de 6 kg existent en fraise ou chocolat ; Whey Protein Complex 100% en pot de 2,27 kg, en double chocolat ou cookies, et Pure Whey Isolate 95 en pot de 2,2 kg, en chocolat ou vanille. La grille indique pour chaque référence si elle est en stock ou sur commande.',
      },
      {
        question: 'Gain Bolic 6000 ou Max Mass 3XL : quel gainer Olimp choisir ?',
        answer:
          'Les deux associent des glucides, un mélange de protéines, de la créatine monohydrate et de la taurine, d’après les compositions publiées par Olimp. La différence tient aux protéines : Gain Bolic 6000, en 6,8 kg, mélange concentré de whey, caséine micellaire et protéines d’œuf, quand Max Mass 3XL, en 6 kg, n’utilise que de la whey, en concentré, isolat et hydrolysat. Les deux existent en fraise et en chocolat.',
      },
      {
        question: 'Les gainers Olimp contiennent-ils de la créatine ?',
        answer:
          'Oui. D’après les listes d’ingrédients publiées par le fabricant, Gain Bolic 6000 et Max Mass 3XL contiennent de la créatine monohydrate et de la taurine. Si vous prenez déjà une créatine vendue seule, comptez celle du gainer dans votre total quotidien. La quantité apportée par portion figure sur l’étiquette du sac.',
      },
      {
        question: 'Whey Protein Complex 100% ou Pure Whey Isolate 95 : quelle différence ?',
        answer:
          'Elles diffèrent par la source de protéines. Whey Protein Complex 100%, en pot de 2,27 kg, associe un concentré de whey ultrafiltré et un isolat. Pure Whey Isolate 95, en 2,2 kg, n’utilise que de l’isolat de lactosérum, une forme de whey plus filtrée que le concentré. La première existe en double chocolat et cookies, la seconde en chocolat et vanille.',
      },
      {
        question: 'Quels allergènes contiennent les produits Olimp ?',
        answer:
          'Selon les compositions publiées par Olimp, Gain Bolic 6000, Max Mass 3XL et Pure Whey Isolate 95 contiennent des protéines de lait et de la lécithine de soja, et Gain Bolic 6000 aussi des protéines d’œuf. Whey Protein Complex 100% tire ses protéines du lait. Pour les trois premiers, le fabricant signale une usine qui manipule aussi d’autres allergènes, dont arachides, fruits à coque et céréales contenant du gluten. L’étiquette du produit reçu fait foi.',
      },
      {
        question: 'Quel est le prix du Gain Bolic 6000 et des autres produits Olimp ?',
        answer:
          'Les {nbEnStock} références en stock vont de {prixMin} à {prixMax} DT.',
      },
    ],
    relatedCategories: [
      { slug: 'mass-gainers', name: 'Gain Bolic 6000, Max Mass 3XL et les autres gainers', url: '/mass-gainers' },
      { slug: 'whey-isolate', name: 'Comparer Pure Whey Isolate 95 aux autres whey isolate', url: '/whey-isolate' },
      { slug: 'proteines-multi-sources', name: 'Whey Protein Complex 100% et les autres mélanges protéinés', url: '/proteines-multi-sources' },
      { slug: 'brands', name: 'Comparer Olimp Sport Nutrition aux autres marques', url: '/brands' },
    ],
    relatedBrands: ['eric-favre', 'real-pharm', 'kevin-levrone'],
    officialUrl: 'https://olimpsport.com/',
  },

  'mr-x-v-shape-supps': {
    metaTitle: 'MR.X V-Shape Supps Tunisie | Gold Whey & Gold Isolate',
    metaDescription:
      'MR.X V-Shape Supps en Tunisie : Gold Whey 2 kg, Gold Isolate 2 kg, V-Zero Isopro 1,8 kg, Whey Testo, Iso Testo 1,8 kg et Creatine Monohydrate 500 g.',
    h1: 'MR.X V-Shape Supps Tunisie : Gold Whey, Gold Isolate et Iso Testo',
    introHtml:
      '<p>La gamme <strong>MR.X V-Shape Supps en Tunisie</strong> tient en quelques références, toutes construites autour de la protéine. Côté isolats : <strong>Gold Isolate</strong> 2 kg, <strong>V-Zero Isopro</strong> 1,8 kg et <strong>Iso Testo</strong> 1,8 kg. Côté whey concentrée : <strong>Gold Whey</strong> 2 kg et <strong>Whey Testo</strong> 1,8 kg. Le reste du catalogue complète l’entraînement : <strong>MR X IGF-1 Anabolic Mass</strong> pour la prise de masse, <strong>Creatine Monohydrate</strong> en 500 g et <strong>MR X EAA</strong> en 360 g.</p>',
    howToChooseTitle: 'Quel produit MR.X V-Shape Supps choisir ?',
    howToChooseBody:
      '<p>Le premier tri se fait entre <strong>whey concentrée</strong> et <strong>isolat</strong>. Gold Whey 2 kg et Whey Testo 1,8 kg relèvent de la première famille : ce sont les poudres polyvalentes, pour l’apport protéique de tous les jours. Gold Isolate 2 kg, V-Zero Isopro 1,8 kg et Iso Testo 1,8 kg reposent sur un isolat, plus filtré, que l’on choisit généralement pour une teneur plus basse en glucides ou en lactose. Les formats sont proches, 1,8 kg ou 2 kg, donc la décision porte sur la formule et non sur la durée couverte.</p>' +
      '<p>Les trois autres références répondent à des besoins distincts et ne se cumulent pas par défaut. <strong>MR X IGF-1 Anabolic Mass</strong> est un gainer protéiné : il ajoute des calories quand manger davantage est le point bloquant. <strong>Creatine Monohydrate</strong> 500 g se prend indépendamment des protéines et n’a pas à être associée à un moment précis de la journée. <strong>MR X EAA</strong> 360 g se place autour de l’entraînement, une fois l’apport protéique total déjà couvert. Les valeurs par portion sont celles imprimées sur l’étiquette du format et de l’arôme commandés.</p>',
    faqs: [
      {
        question: 'Quels produits MR.X V-Shape Supps sont vendus en Tunisie ?',
        answer:
          'Protein.tn référence les isolats Gold Isolate 2 kg, V-Zero Isopro 1,8 kg et Iso Testo 1,8 kg, les whey Gold Whey 2 kg et Whey Testo 1,8 kg, le gainer MR X IGF-1 Anabolic Mass, la Creatine Monohydrate 500 g et les MR X EAA 360 g. La grille de produits de cette page indique les références et les formats effectivement proposés.',
      },
      {
        question: 'Gold Whey ou Gold Isolate : quelle différence ?',
        answer:
          'Gold Whey 2 kg est une whey polyvalente, destinée à compléter l’apport protéique quotidien. Gold Isolate 2 kg est construite sur un isolat, plus filtré, que l’on retient généralement pour une teneur plus basse en glucides ou en lactose. Les deux sont proposées au même format ; comparez les compositions imprimées sur les pots.',
      },
      {
        question: 'La créatine MR.X est-elle aromatisée ?',
        answer:
          'La référence proposée est une Creatine Monohydrate en 500 g. La présence ou non d’un arôme, la dose par portion et le nombre de portions par pot sont indiqués sur l’étiquette du produit ; nous n’avançons aucune valeur ici. Elle se prend indépendamment des protéines.',
      },
      {
        question: 'Comment commander MR.X V-Shape Supps en Tunisie ?',
        answer:
          'Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie et accepte le paiement à la livraison. Le délai et les frais dépendent de la destination et vous sont indiqués au moment de la commande ; le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.',
      },
    ],
    relatedCategories: [
      { slug: 'whey-isolate', name: 'Whey isolate : tout le rayon', url: '/whey-isolate' },
      { slug: 'whey-proteine', name: 'Whey protéines du catalogue', url: '/whey-proteine' },
      { slug: 'gainers-proteines', name: 'Gainers protéinés : voir le rayon', url: '/gainers-proteines' },
      { slug: 'creatine', name: 'Créatine monohydrate en Tunisie', url: '/creatine' },
      { slug: 'eaa', name: 'EAA : comparer les formats', url: '/eaa' },
      { slug: 'brands', name: 'Comparer MR.X V-Shape Supps aux autres marques', url: '/brands' },
    ],
  },
  /*
   * ── 28/09/2026: 14 BRANDS WITH IN-STOCK PRODUCTS AND NO CURATED PAGE ─────────────────────
   * Measured the same day: 56–284 words of prose and no FAQ on these brand pages (JX Fitness: 30
   * products in stock). Written from /api/productsByBrandId and our own fiches under the rules in
   * this file's header; per-portion figures only where a label is transcribed on our fiche.
   * Deliberately NOT curated: action-labs (only in-stock item is MK-677), invictus (its one product
   * is an Insane Labz item filed under the wrong brand), scitec-nutrition (its main product, Best ZMA,
   * is named Scenit Nutrition) — fix the brand assignment first.
   */
  'jx-fitness': {
    metaTitle: "JX Fitness Tunisie | Presse cuisse, hack squat & cardio",
    // Gym machines up to 35 000 DT (ring de boxe): the FAQ below says their transport is arranged
    // per order, so the lead and « Sur commande » answer print no « 24–72h, 10 DT » (06/10/2026).
    // OWNER: confirm which delivery terms apply to equipment — product pages still show the parcel line.
    bulkyDelivery: true,
    metaDescription:
      "JX Fitness en Tunisie : presse cuisse, hack squat, machines sélectives, bancs réglables, barre olympique 2,20 m, tapis roulant et vélo elliptique.",
    h1: "JX Fitness Tunisie : machines de musculation, bancs et cardio",
    introHtml:
      "<p>La marque <strong>JX Fitness</strong> réunit 56 références sur Protein.tn, dont 51 classées en <strong>matériel de musculation</strong> et 5 en <strong>cardio &amp; fitness</strong>. Les machines guidées forment le cœur de la gamme, rangées par zone travaillée. Pour les jambes : la <strong>presse cuisse</strong>, deux <strong>hack squats</strong>, la machine d’extension des jambes, la machine à mollets assis/debout et la poussée de hanche. Pour le haut du corps : la machine de traction latérale sélective, la station de traction et de trempage sélective, des machines à biceps, l’appareil de musculation des épaules, une poulie et l’abdominal machine. Viennent ensuite les <strong>bancs</strong> (utilitaire, multi-réglable, abdominal, latéral, épaule olympique, pupitre à biceps), les charges libres et le rangement (barre olympique 2,20 m, barre zigzag, supports de disques et d’haltères, accessoires de rack) et le <strong>cardio</strong> : tapis roulant, spin bike, vélo elliptique, vélo semi-allongé, plus un ring de boxe. Le catalogue liste aussi une smith machine, une leg press, un multi-gym 8 stations, des rameurs et même une barrière de tourniquet à contrôle d’accès pour l’entrée d’une salle. Sur chaque fiche, regardez d’abord deux choses : le mode de charge (pile de poids intégrée ou disques) et les dimensions, quand elles sont publiées.</p>",
    howToChooseTitle: "Quel équipement JX Fitness choisir ?",
    howToChooseBody:
      "<p>Partez de la zone à travailler, puis vérifiez la place. Pour les <strong>jambes</strong>, la presse cuisse (1453 × 1310 × 1440 mm, charge maximale de 150 kg selon sa fiche) fait pousser un plateau, tandis que le hack squat garde le dos calé contre un dossier sur une trajectoire proche du squat : les deux se complètent. L’extension des jambes isole les quadriceps ; la machine à mollets travaille assis ou debout.</p><p>Le deuxième critère est le <strong>mode de charge</strong>. Une machine <strong>sélective</strong> embarque sa pile de poids : la machine de curl biceps sélective annonce 60 kg réglables au sélecteur, et la station de traction et de trempage s’en sert pour assister tractions et dips. Une machine <strong>à chargement par plaques</strong>, comme la machine de flexion des biceps, se charge avec des disques achetés à part.</p><p>Côté <strong>encombrement</strong>, les écarts sont nets. Le banc multi-réglable (1380 × 540 × 500 mm, 47 kg, 7 positions : plat, incliné de 15 à 90° et décliné à -15°) se replie. La Hack Squat Machine Trainer occupe 2065 × 1526 × 1571 mm pour 235 kg net, et l’appareil de musculation des épaules pèse 232 kg : vérifiez l’accès et le sol avant de commander. La barre olympique de 2,20 m (30 kg, disques à alésage de 51 mm, 250 kg maximum) demande un dégagement plus large qu’elle.</p><p>En <strong>cardio</strong>, le tapis roulant va de la marche à la course, le vélo elliptique mobilise le haut et le bas du corps sans choc au sol, le spin bike se prête aux séances intenses et le vélo semi-allongé se pratique assis, dos calé contre un dossier. Leurs dimensions ne figurent pas sur nos fiches : demandez-les à l’équipe.</p>",
    faqs: [
      {
        question: "Quels équipements JX Fitness sont proposés sur Protein.tn ?",
        answer:
          "56 références : 51 en matériel de musculation — machines guidées pour les jambes, le dos, les bras, les épaules et les abdominaux, bancs, barre olympique 2,20 m, barre zigzag et supports de rangement — et 5 en cardio & fitness : tapis roulant, spin bike, vélo elliptique, vélo semi-allongé et ring de boxe. La grille de cette page indique la disponibilité de chaque référence.",
      },
      {
        question: "Machine sélective ou à chargement par plaques : quelle différence ?",
        answer:
          "Une machine sélective intègre sa pile de poids : la charge se règle au sélecteur entre deux séries, sans manipuler de disques. La machine de curl biceps sélective annonce ainsi une pile de 60 kg. Une machine à chargement par plaques, comme la machine de flexion des biceps, se charge avec des disques achetés à part : vérifiez leur compatibilité avec les supports avant de commander.",
      },
      {
        question: "Quel banc JX Fitness choisir ?",
        answer:
          "Le banc utilitaire est un banc plat fixe, pour le développé à plat, les curls et les extensions triceps. Le banc multi-réglable offre 7 positions, du décliné à -15° jusqu’à 90°, se replie et pèse 47 kg. Le banc d’épaule olympique a un angle fixe annoncé entre 75 et 90° et des supports pour barre olympique : il est dédié à la presse militaire. Le banc abdominal réglable et le banc latéral servent au travail des abdominaux et des obliques.",
      },
      {
        question: "Quel appareil cardio JX Fitness choisir ?",
        answer:
          "Le tapis roulant, à vitesses réglables et surface amortie, couvre la marche, le jogging et la course. Le vélo elliptique fait travailler le haut et le bas du corps sans choc au sol. Le spin bike, à résistance réglable, se prête aux séances intenses. Le vélo semi-allongé se pratique assis avec un dossier, et sa console affiche le temps, la vitesse, la distance et les calories. En cas de problème de santé, demandez d’abord l’avis d’un professionnel.",
      },
      {
        question: "Les dimensions des machines JX Fitness sont-elles publiées ?",
        answer:
          "Pour une partie d’entre elles, oui : presse cuisse 1453 × 1310 × 1440 mm, Hack Squat Machine Trainer 2065 × 1526 × 1571 mm, machine de curl biceps sélective 935 × 1372 × 1527 mm, banc multi-réglable 1380 × 540 × 500 mm, support d’haltères 2345 × 585 × 738 mm. Pour les autres, dont les appareils cardio, les mesures ne figurent pas sur la fiche : demandez-les à l’équipe Protein.tn avant de réserver l’emplacement.",
      },
      {
        question: "Comment commander un équipement JX Fitness ?",
        answer:
          "Choisissez la référence, ajoutez-la au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie et accepte le paiement à la livraison. Pour une machine volumineuse, l’équipe organise avec vous le transport et la mise en place ; le délai et les frais dépendent de la destination et vous sont indiqués au moment de la commande.",
      },
    ],
    relatedCategories: [
      { slug: "materiel-de-musculation", name: "Voir tout le matériel de musculation", url: "/materiel-de-musculation" },
      { slug: "cardio-fitness", name: "Le rayon cardio et fitness", url: "/cardio-fitness" },
      { slug: "equipement", name: "Équipement : voir tout le rayon", url: "/equipement" },
      { slug: "brands", name: "Comparer JX Fitness aux autres marques", url: "/brands" },
    ],
  },
  'kong-sport-nutrition': {
    metaTitle: "Kong Sport Nutrition Tunisie | Gants, straps & shaker",
    // The admin logo of brand 38 (brands/September2023/125YKjML6n4hSMN1yTCH.webp) reads « SPORTS
    // WEAR / Kong » under a red gorilla — no « Sport Nutrition ». The alt says what the picture shows.
    logoAlt: 'Logo Kong Sports Wear',
    metaDescription:
      "Kong Sport Nutrition en Tunisie : gants de musculation et de fitness, lifting straps, bandes de poignet et de genou, ceinture et shaker 450 ml.",
    h1: "Kong Sport Nutrition Tunisie : accessoires d’entraînement et shakers",
    introHtml:
      "<p>Malgré son nom, <strong>Kong Sport Nutrition</strong> ne référence aucun complément alimentaire sur Protein.tn : ses 13 références sont toutes classées en <strong>accessoires</strong>, et elles se répartissent en trois usages. La <strong>prise</strong> d’abord : des <strong>lifting straps</strong> à fermeture velcro, des <strong>bandes de tirage</strong> à enrouler autour du poignet et de la barre, des <strong>gants de musculation</strong> et un <strong>gant de fitness</strong> à bande de maintien ajustable. Le <strong>maintien</strong> ensuite : des <strong>bandes de poignet</strong>, une <strong>bande genoux</strong> élastique que l’on serre soi-même et une <strong>ceinture dos de musculation</strong> à boucle ajustable. L’<strong>hydratation</strong> enfin : le <strong>Protein Shaker 450 ml Sport Life</strong>, le Shaker Kong 700 ml et deux bouteilles d’eau, de 2,2 L et de 1,8 L. Le catalogue liste aussi une Dip Belt pour lester dips et tractions, et des sangles abdominales Gut Blaster Ab Slings. Aucune de ces fiches ne publie de grille de tailles : pour les gants et la ceinture, c’est la question à poser avant de commander. La grille ci-dessus affiche la disponibilité de chaque référence.</p>",
    howToChooseTitle: "Quel accessoire Kong Sport Nutrition choisir ?",
    howToChooseBody:
      "<p>Partez de ce qui vous limite pendant la séance, pas de l’accessoire. Si la <strong>prise lâche</strong> avant le dos sur un soulevé de terre, un rowing ou des tractions, ce sont les <strong>lifting straps</strong> ou les <strong>bandes de tirage</strong> : les premières se ferment au poignet par velcro et s’ouvrent d’un geste entre deux séries, les secondes s’enroulent autour du poignet puis de la barre. Si c’est la <strong>paume</strong> qui frotte, les <strong>gants</strong> protègent la peau et améliorent l’adhérence ; le gant de fitness se règle par une bande autour du poignet.</p><p>Pour le <strong>maintien</strong>, chaque produit vise une articulation. Les <strong>bandes de poignet</strong> servent quand le poignet se casse vers l’arrière au développé couché ou aux dips ; nos fiches rappellent qu’elles ne remplacent pas des sangles, qui aident la prise. La <strong>bande genoux</strong> s’enroule en partant de sous la rotule et se réserve aux séries lourdes de squat, de presse ou de fentes. La <strong>ceinture</strong> se porte sur les séries exigeantes de squat et de soulevé de terre, puis se desserre entre les séries. Aucun de ces accessoires ne corrige une technique approximative, et en cas de douleur, l’avis d’un professionnel de santé passe avant.</p><p>Côté <strong>shaker</strong>, les 450 ml du Sport Life sont une contenance totale, pas un volume de liquide : pour un gainer qui demande beaucoup d’eau, notre fiche conseille de préparer la portion en deux fois. La bouteille de 2,2 L, à goulot large, couvre une longue séance sans remplissage.</p>",
    faqs: [
      {
        question: "Kong Sport Nutrition vend-il des compléments alimentaires sur Protein.tn ?",
        answer:
          "Non. Les 13 références de la marque sur Protein.tn sont des accessoires : gants, sangles, bandes de maintien, ceinture, shakers et bouteilles d’eau. Pour les protéines, la créatine ou les acides aminés, ce sont les pages des autres marques qu’il faut consulter.",
      },
      {
        question: "Lifting straps ou bandes de tirage : que choisir ?",
        answer:
          "Les deux sécurisent la prise sur les tirages lourds — soulevé de terre, rowing, tractions — quand les avant-bras fatiguent avant le dos. Les lifting straps se ferment au poignet par velcro, ce qui les rend rapides à mettre et à retirer entre les séries ; les bandes de tirage s’enroulent autour du poignet puis de la barre. Gardez l’échauffement et les séries légères à mains nues pour continuer à travailler la poigne.",
      },
      {
        question: "Bandes de poignet ou sangles : quelle différence ?",
        answer:
          "Elles ne rendent pas le même service. Les bandes de poignet stabilisent l’articulation quand elle porte la charge, au développé couché ou aux dips. Les sangles aident la prise sur les tirages lourds, quand l’avant-bras lâche avant le dos. Les deux se complètent dans un même sac de sport.",
      },
      {
        question: "Quelle taille choisir pour les gants et la ceinture ?",
        answer:
          "Les fiches ne publient pas de grille de tailles. Un gant doit épouser la paume sans former de plis ; pour la ceinture, mesurez votre tour de taille à l’endroit où vous la porterez. Dans les deux cas, demandez la correspondance à l’équipe Protein.tn avant de commander.",
      },
      {
        question: "Le shaker 450 ml convient-il pour un gainer ?",
        answer:
          "Les 450 ml correspondent à la contenance totale du shaker. Si le volume de liquide conseillé sur l’étiquette de votre gainer en approche ou le dépasse, préparez la portion en deux fois. Pour une whey, une créatine ou des BCAA, la dose de poudre est plus petite et la contenance convient.",
      },
      {
        question: "Comment commander Kong Sport Nutrition en Tunisie ?",
        answer:
          "Choisissez l’accessoire, ajoutez-le au panier avec le reste de votre commande puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "accessoires", name: "Gants, sangles et shakers", url: "/accessoires" },
      { slug: "equipement", name: "Le rayon équipement sportif", url: "/equipement" },
      { slug: "brands", name: "Comparer Kong Sport Nutrition aux autres marques", url: "/brands" },
    ],
  },
  'nutrex-research': {
    metaTitle: "Nutrex Research Tunisie | Lipo 6 Black, Lipo 6 Intense",
    metaDescription:
      "Nutrex Research en Tunisie : Lipo 6 Black Ultra Concentrate 60 capsules, Lipo 6 Intense, CLA 1000, L-Carnitine 3000 465 ml et EAA+ Hydration 390 g.",
    h1: "Nutrex Research Tunisie : la gamme Lipo 6, acides aminés et créatine",
    introHtml:
      "<p>Le catalogue <strong>Nutrex Research</strong> compte 40 références, et près d’un tiers d’entre elles porte le nom <strong>Lipo 6</strong> : 13 produits classés en brûleurs de graisse, dont <strong>Lipo 6 Black Ultra Concentrate</strong> en 60 capsules et en 60 Liqui-Caps, <strong>Lipo 6 Intense Ultra Concentrate</strong>, Lipo 6 Black en 120 Liqui-Caps, Lipo 6 Hers, Lipo-6 Hardcore, Lipo 6 Nighttime et Lipo-6 Diuretic, plus un gel Lipo-6 Defining de 120 ml et une ceinture Lipo 6 Waist Trimmer. Autour de cette famille : le <strong>CLA 1000</strong> en 90 et 180 capsules molles et la <strong>L-Carnitine 3000</strong> en flacon de 465 ml, en trois arômes. La partie performance réunit <strong>EAA+ Hydration</strong> 390 g en six arômes, <strong>BCAA 6000 Recovery</strong>, la <strong>Creatine Monohydrate</strong> en 390 g aromatisée et en 300 g sans arôme, la <strong>Creatine For Women</strong>, le pré-workout <strong>Outrage</strong>, L-Arginine 1000, HMB 1000 et Tribulus 1400. Restent les protéines : <strong>100% Whey Protein</strong> en 913 g, 923 g et 2265 g, <strong>100% Premium Whey Protein</strong> 2272 g et l’isolat <strong>IsoFit</strong> 1050 g. La grille ci-dessus affiche la disponibilité de chaque référence.</p>",
    howToChooseTitle: "Quel produit Nutrex Research choisir ?",
    howToChooseBody:
      "<p>Dans la famille <strong>Lipo 6</strong>, nos deux fiches les plus détaillées permettent de comparer la composition, pas les doses. <strong>Lipo 6 Black Ultra Concentrate</strong> (60 capsules) cite de la caféine anhydre, de la N-acétyl L-tyrosine, du guarana, des extraits de citrus aurantium et de capsicum, et de la BioPerine. <strong>Lipo 6 Intense Ultra Concentrate</strong> associe caféine, théobromine, N-acétyl-L-tyrosine et Paradoxine®, et y ajoute de la Rauwolfia vomitoria et de la yohimbine HCl, que sa fiche signale comme pouvant avoir des effets indésirables cardiovasculaires. Les deux fiches les destinent à des adultes déjà habitués aux brûleurs à base de stimulants. Posologie indiquée : une capsule le matin et une l’après-midi, aucune prise dans les six heures avant le coucher, sans cumuler café, boissons énergisantes ou pré-workout. Un avis médical s’impose en cas de tension, de problème cardiaque ou de traitement en cours, et nos fiches le rappellent : ces produits ne garantissent pas une perte de graisse, qui dépend d’abord de l’alimentation et de l’activité physique.</p><p>Hors Lipo 6, le choix est plus classique. La <strong>Creatine Monohydrate</strong> se prend aromatisée en 390 g (Strawberry Watermelon, Fruit Punch) ou sans arôme en 300 g, selon que vous la buvez seule ou dans un shake. <strong>EAA+ Hydration</strong> apporte les neuf acides aminés essentiels, quand <strong>BCAA 6000 Recovery</strong> n’en apporte que trois. <strong>IsoFit</strong> est l’isolat de la marque, face aux 100% Whey Protein. Aucune fiche Nutrex Research ne publie de tableau de valeurs transcrit par notre équipe : l’étiquette du produit reçu fait foi.</p>",
    faqs: [
      {
        question: "Quels produits Nutrex Research sont référencés sur Protein.tn ?",
        answer:
          "40 références : 13 brûleurs de graisse de la gamme Lipo 6 (Black Ultra Concentrate, Intense Ultra Concentrate, Black, Hers, Hardcore, Nighttime, Diuretic, un gel et une ceinture), le CLA 1000, la L-Carnitine 3000 465 ml, les EAA+ Hydration 390 g, les BCAA 6000 Recovery, la Creatine Monohydrate, la Creatine For Women, le pré-workout Outrage, L-Arginine 1000, HMB 1000, Tribulus 1400, les 100% Whey Protein et 100% Premium Whey Protein, et l’isolat IsoFit. La grille de cette page indique la disponibilité de chacune.",
      },
      {
        question: "Lipo 6 Black Ultra Concentrate ou Lipo 6 Intense : quelle différence ?",
        answer:
          "Leur composition. Notre fiche Lipo 6 Black Ultra Concentrate cite caféine anhydre, N-acétyl L-tyrosine, guarana, citrus aurantium, capsicum et BioPerine. Lipo 6 Intense Ultra Concentrate cite caféine, théobromine, N-acétyl-L-tyrosine, Paradoxine®, Rauwolfia vomitoria et yohimbine HCl. Les quantités exactes figurent sur l’étiquette du flacon. Les deux s’adressent à des adultes déjà habitués aux brûleurs à base de stimulants.",
      },
      {
        question: "Comment prendre un Lipo 6 ?",
        answer:
          "Nos fiches indiquent une capsule le matin et une l’après-midi, sans dépasser deux capsules sur 24 heures pour Lipo 6 Intense, et aucune prise dans les six heures qui précèdent le coucher. Limitez les autres sources de caféine : café, boissons énergisantes, pré-workout. En cas de palpitations ou de vertiges, arrêtez la prise et consultez. L’étiquette de votre flacon reste la référence.",
      },
      {
        question: "Nutrex Research propose-t-il de la créatine et des acides aminés ?",
        answer:
          "Oui. La Creatine Monohydrate est référencée en 390 g, en Strawberry Watermelon et Fruit Punch, et en 300 g sans arôme ; la Creatine For Women existe en Pink Lemonade et Peach Mango. Côté acides aminés : EAA+ Hydration 390 g en six arômes, BCAA 6000 Recovery en Fruit Punch et Green Apple, L-Arginine 1000 et HMB 1000 en 120 gélules.",
      },
      {
        question: "Comment commander Nutrex Research en Tunisie ?",
        answer:
          "Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "bruleurs-de-graisse", name: "Comparer les brûleurs de graisse", url: "/bruleurs-de-graisse" },
      { slug: "l-carnitine", name: "L-carnitine : le rayon", url: "/l-carnitine" },
      { slug: "cla", name: "Le rayon CLA", url: "/cla" },
      { slug: "eaa", name: "Acides aminés essentiels (EAA)", url: "/eaa" },
      { slug: "creatine", name: "Voir les créatines des autres marques", url: "/creatine" },
      { slug: "brands", name: "Comparer Nutrex Research aux autres marques", url: "/brands" },
    ],
  },
  'redcon1': {
    metaTitle: "Redcon1 Tunisie | Total War, C-Burn & Isotope",
    metaDescription:
      "Redcon1 en Tunisie : pré-workout Total War en 465 g et en dix arômes de 441 à 453 g, C-Burn, Double Tap, créatine 300 g, MRE Lite 945 g et Isotope 2,2 kg.",
    h1: "Redcon1 Tunisie : le pré-workout Total War et ses déclinaisons",
    introHtml:
      "<p>La gamme <strong>Redcon1</strong> sur Protein.tn compte 16 références, et 11 d’entre elles sont le même produit : le pré-workout <strong>Total War</strong>. Il est proposé en pot de <strong>465 g</strong> et en dix déclinaisons aromatisées de 441 g à 453 g — Strawberry Kiwi, Blue Raspberry, Green Apple, Orange Crush, Sour Gummy Bear, Rainbow Candy, Blue Lemonade, Strawberry Mango, Tiger’s Blood Cherry &amp; Coconut et Vice City Strawberry Pina Colada. Les cinq autres références couvrent chacune un autre usage : deux brûleurs de graisse en gélules, <strong>C-Burn</strong> (90 gélules) et <strong>Double Tap</strong> (120 gélules), une <strong>Creatine Monohydrate</strong> sans arôme de 300 g, <strong>MRE Lite</strong>, une protéine multi-sources de 945 g en Peanut Butter Cookie, et <strong>Isotope 100% Whey Isolate</strong> en 2,2 kg arôme Chocolat. Sur cette page, la question porte donc surtout sur le format et l’arôme de Total War, puis sur ce qui peut l’accompagner. La grille ci-dessus affiche la disponibilité de chaque référence.</p>",
    howToChooseTitle: "Quel produit Redcon1 choisir ?",
    howToChooseBody:
      "<p><strong>Total War</strong> est un pré-workout, et notre fiche du pot de 465 g en décrit la formule : citrulline malate, bêta-alanine, caféine, taurine et sulfate d’agmatine. Elle précise aussi ce qu’il ne contient pas — ni créatine, ni whey — : il ne remplace donc ni l’une ni l’autre. La fiche conseille de mélanger une portion dans 120 à 180 ml d’eau environ 30 minutes avant la séance, et de commencer par une demi-portion si vous êtes sensible à la caféine. Sa teneur en caféine est le premier critère : faites le compte du café, des boissons énergisantes et des autres compléments de la journée, et évitez-le trop près du coucher. La bêta-alanine peut provoquer chez certaines personnes des picotements passagers, appelés paresthésie.</p><p>Entre le pot de 465 g et les versions de 441 à 453 g, la différence tient à l’arôme et à la contenance ; les fiches des versions aromatisées ne transcrivent pas encore leur étiquette, qui reste la référence pour la formule et le nombre de portions. <strong>C-Burn</strong> et <strong>Double Tap</strong> relèvent d’un autre rayon, les brûleurs de graisse : lisez leur étiquette avant de les associer à Total War le même jour. La <strong>Creatine Monohydrate</strong> 300 g sans arôme se prend à part, puisque Total War n’en contient pas. Pour les protéines, <strong>Isotope</strong> est classé en whey isolate et <strong>MRE Lite</strong> en protéines multi-sources.</p>",
    faqs: [
      {
        question: "Quels produits Redcon1 sont référencés sur Protein.tn ?",
        answer:
          "16 références : le pré-workout Total War en 465 g et en dix arômes de 441 g à 453 g, les brûleurs de graisse C-Burn (90 gélules) et Double Tap (120 gélules), la Creatine Monohydrate sans arôme 300 g, la protéine multi-sources MRE Lite 945 g et Isotope 100% Whey Isolate 2,2 kg. La grille de cette page indique la disponibilité de chacune.",
      },
      {
        question: "Total War 465 g ou une version aromatisée ?",
        answer:
          "Le pot de 465 g est la référence dont notre fiche détaille la formule. Les dix autres, de 441 g à 453 g, se distinguent par leur arôme, de Blue Raspberry à Tiger’s Blood Cherry & Coconut. Leur étiquette n’est pas encore transcrite sur nos fiches : le nombre de portions et la composition exacte figurent sur le pot reçu, et peuvent varier selon l’arôme et la version de la formule.",
      },
      {
        question: "Total War contient-il de la créatine ou des protéines ?",
        answer:
          "Non. D’après notre fiche, Total War est un pré-workout construit autour de la citrulline malate, de la bêta-alanine, de la caféine, de la taurine et du sulfate d’agmatine ; il ne contient ni créatine ni whey. Si vous prenez de la créatine, la Creatine Monohydrate 300 g sans arôme de la marque se prend séparément.",
      },
      {
        question: "Pourquoi Total War peut-il provoquer des picotements ?",
        answer:
          "La bêta-alanine de la formule peut provoquer chez certaines personnes une sensation passagère de picotement ou de fourmillement, appelée paresthésie. Son intensité varie d’une personne à l’autre. Commencer par une demi-portion permet aussi d’évaluer votre tolérance à la caféine.",
      },
      {
        question: "Comment commander Redcon1 en Tunisie ?",
        answer:
          "Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "pre-workout", name: "Pré-workout : les autres formules", url: "/pre-workout" },
      { slug: "bruleurs-de-graisse", name: "Brûleurs de graisse en gélules", url: "/bruleurs-de-graisse" },
      { slug: "creatine", name: "Créatines à prendre à part", url: "/creatine" },
      { slug: "whey-isolate", name: "Whey isolate : autres marques", url: "/whey-isolate" },
      { slug: "proteines-multi-sources", name: "Le rayon protéines multi-sources", url: "/proteines-multi-sources" },
      { slug: "brands", name: "Comparer Redcon1 aux autres marques", url: "/brands" },
    ],
  },
  'hx-nutrition': {
    metaTitle: "HX Nutrition Tunisie | Big Monster 7 kg, whey & isolate",
    metaDescription:
      "HX Nutrition en Tunisie : gainers Big Monster et Massive Gainer 7 kg, Real Whey, Zero Isolate et Iso Whey 2 kg, créatine 500 g, ZMA 60 capsules et Vita X.",
    h1: "HX Nutrition Tunisie : gainers 7 kg, whey et isolats 2 kg",
    introHtml:
      "<p>La gamme <strong>HX Nutrition</strong> compte neuf références, organisées autour de la prise de masse et des protéines. Deux gainers en sac de <strong>7 kg</strong> d’abord : <strong>Big Monster</strong>, référencé en arôme Fraise, et <strong>Massive Gainer</strong>. Trois protéines en <strong>2 kg</strong> ensuite : <strong>Real Whey</strong> (arôme Biscuit), classée en whey protéine, puis <strong>Zero Isolate</strong> (Biscuit) et <strong>Iso Whey</strong> (Cookies), toutes deux classées en whey isolate. Le reste du catalogue complète l’entraînement et le quotidien : <strong>Creatine Monohydrate</strong> en 500 g, <strong>ZMA</strong> en 60 capsules, les multivitamines <strong>Vita X</strong> en 90 comprimés et <strong>TXT10</strong>, classé au rayon plantes et boosters. Les formats sont peu nombreux — 7 kg pour les gainers, 2 kg pour les protéines — si bien que le choix porte sur la formule et non sur la contenance. Aucune de ces fiches ne publie de tableau de valeurs transcrit par notre équipe : calories, protéines et créatine par portion se lisent sur l’étiquette du sac ou du pot. La grille ci-dessus affiche la disponibilité de chaque référence.</p>",
    howToChooseTitle: "Quel produit HX Nutrition choisir ?",
    howToChooseBody:
      "<p>La première question est celle du blocage. Si vous n’arrivez pas à manger assez pour prendre du poids, un gainer de 7 kg répond à ce besoin. <strong>Big Monster</strong> associe glucides, protéines et créatine selon sa fiche, et la quantité de créatine par portion est imprimée sur le sac : si vous prenez déjà une créatine à part, comptez celle du gainer. Sa fiche conseille de commencer par une demi-portion pour tester la tolérance digestive, puis de répartir l’apport en plusieurs shakers dans la journée. <strong>Massive Gainer</strong>, également en 7 kg, décrit un mélange de protéines de lactosérum, de caséine et d’isolat de soja, un point à vérifier en cas d’allergie.</p><p>Si vous mangez assez mais manquez de protéines, un gainer apporte des calories dont vous n’avez pas besoin : regardez plutôt les pots de 2 kg. <strong>Real Whey</strong> est la whey polyvalente de la marque ; <strong>Zero Isolate</strong> et <strong>Iso Whey</strong> sont classées en whey isolate, plus filtrée, et se distinguent surtout par leur arôme, Biscuit ou Cookies. La <strong>Creatine Monohydrate</strong> 500 g se prend indépendamment des protéines. <strong>ZMA</strong> en 60 capsules et <strong>Vita X</strong> en 90 comprimés relèvent d’un usage quotidien et ne remplacent aucun des produits ci-dessus. Pour <strong>TXT10</strong>, la fiche ne détaille pas la composition : l’étiquette est la seule référence. Dans tous les cas, les valeurs par portion sont celles du sac ou du pot reçu.</p>",
    faqs: [
      {
        question: "Quels produits HX Nutrition sont référencés sur Protein.tn ?",
        answer:
          "Neuf références : les gainers Big Monster et Massive Gainer en 7 kg, Real Whey, Zero Isolate et Iso Whey en 2 kg, la Creatine Monohydrate 500 g, le ZMA 60 capsules, les multivitamines Vita X 90 comprimés et TXT10. La grille de cette page indique la disponibilité de chacune.",
      },
      {
        question: "Big Monster ou Massive Gainer ?",
        answer:
          "Les deux sont des gainers en sac de 7 kg, destinés à augmenter l’apport calorique quand l’alimentation ne suffit pas. Big Monster, référencé en arôme Fraise, associe glucides, protéines et créatine. La fiche de Massive Gainer décrit un mélange de protéines de lactosérum, de caséine et d’isolat de soja. Comparez les étiquettes pour les calories et les protéines par portion.",
      },
      {
        question: "Big Monster contient-il de la créatine ?",
        answer:
          "Oui, sa formule associe glucides, protéines et créatine. La quantité de créatine par portion n’est pas transcrite sur notre fiche : elle figure sur l’étiquette du sac. Si vous prenez déjà une créatine seule, tenez-en compte dans votre total de la journée.",
      },
      {
        question: "Real Whey, Zero Isolate ou Iso Whey ?",
        answer:
          "Les trois sont proposées en 2 kg. Real Whey, en arôme Biscuit, est classée en whey protéine : c’est la poudre polyvalente. Zero Isolate (Biscuit) et Iso Whey (Cookies) sont classées en whey isolate, une protéine plus filtrée que l’on choisit généralement pour une teneur plus basse en glucides ou en lactose. Les valeurs exactes figurent sur l’étiquette du pot.",
      },
      {
        question: "Comment commander HX Nutrition en Tunisie ?",
        answer:
          "Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "mass-gainers", name: "Autres mass gainers du catalogue", url: "/mass-gainers" },
      { slug: "whey-isolate", name: "Whey isolate : le rayon complet", url: "/whey-isolate" },
      { slug: "whey-proteine", name: "Whey protéine : autres marques", url: "/whey-proteine" },
      { slug: "creatine", name: "Créatine monohydrate : autres marques", url: "/creatine" },
      { slug: "zma", name: "ZMA : comparer les formules", url: "/zma" },
      { slug: "brands", name: "Comparer HX Nutrition aux autres marques", url: "/brands" },
    ],
  },
  'mnd-fitness': {
    metaTitle: "MND Fitness Tunisie | Bancs, machines guidées et cardio",
    metaDescription:
      "MND Fitness en Tunisie : Flat Bench, bancs réglables et olympique, machines de tirage à pile de poids, rack à haltères, tapis roulant, rameur et vélo.",
    h1: "MND Fitness Tunisie : bancs, machines de tirage et appareils cardio",
    introHtml:
      "<p>La marque <strong>MND Fitness en Tunisie</strong>, c’est uniquement du matériel : 14 références sur Protein.tn, dont 11 au rayon <strong>matériel de musculation</strong> et 3 au rayon <strong>cardio &amp; fitness</strong>. Cinq bancs d’abord, qui se distinguent par leurs réglages : le <strong>Flat Bench</strong>, un banc plat fixe ; trois bancs multi-positions, le <strong>Banc réglable</strong>, le <strong>Multi Réglable Bench</strong> et le <strong>Multi Degree Olympic Bench</strong> ; et un <strong>banc de développé incliné</strong>. Viennent ensuite les machines guidées : <strong>Traction longue machine</strong> et <strong>Pulldown machine</strong>, deux postes de tirage à pile de poids intégrée, la <strong>Chest presse inclinée machine</strong>, la <strong>Multi-Functional Smith Machine</strong> et le <strong>Seated Preacher Curl</strong> pour les biceps, auxquels s’ajoute le <strong>Layers Dumbbell Rack</strong>, un rack à haltères sur 3 niveaux. Côté cardio : un <strong>tapis roulant professionnel</strong>, un <strong>rameur professionnel</strong> et un <strong>vélo à résistance magnétique</strong>. Certaines fiches publient dimensions et poids, d’autres non : c’est le premier point à vérifier avant de réserver un emplacement. La grille ci-dessus affiche la disponibilité de chaque référence.</p>",
    howToChooseTitle: "Quel équipement MND Fitness choisir ?",
    howToChooseBody:
      "<p><strong>Pour les pectoraux et le travail aux haltères</strong>, tout part du banc. Le <strong>Flat Bench</strong> ne s’incline pas, et c’est son intérêt : aucun mécanisme de réglage sous le dos quand la charge monte. Sa fiche annonce 1280 × 736 × 380 mm, 40 kg, une capacité de plus de 200 kg et une poignée avec roues pour le ranger. Si vous voulez aussi l’incliné et le décliné, un banc multi-positions évite d’empiler les postes : le <strong>Multi Degree Olympic Bench</strong> (1121 × 749 × 757 mm, 58 kg net selon sa fiche) se règle sans outils complexes, et le <strong>Banc réglable</strong> ajoute la position assise pour les épaules. Pour les bancs multi-positions, nos fiches ne publient pas de charge maximale certifiée : demandez-la avant l’achat si vous travaillez lourd.</p><p><strong>Pour le dos</strong>, les deux postes de tirage n’ont ni le même encombrement ni la même pile. La <strong>Traction longue machine</strong> mesure 1610 × 1280 × 2145 mm pour une pile réglable de 20 à 120 kg ; la <strong>Pulldown machine</strong>, un tirage vertical avec rouleaux de maintien des cuisses, annonce une pile d’environ 10 à 100 kg et plus. Dans les deux cas, comparez la hauteur de la machine à celle de votre plafond. Le <strong>Layers Dumbbell Rack</strong> (modèle F72, 1420 × 700 × 1010 mm, 71 kg) range jusqu’à 15 paires d’haltères.</p><p><strong>Pour le cardio</strong>, le choix dépend du geste : le <strong>tapis roulant</strong> pour la marche et la course, le <strong>rameur</strong> qui sollicite bras, dos, jambes et abdominaux dans un seul mouvement, le <strong>vélo à résistance magnétique</strong> pour un pédalage discret et sans impact. Leurs fiches ne publient ni dimensions ni poids maximal de l’utilisateur : demandez-les à l’équipe avant de commander.</p>",
    faqs: [
      {
        question: "Quels équipements MND Fitness sont vendus sur Protein.tn ?",
        answer:
          "Quatorze références. En musculation : Flat Bench, Banc réglable, Multi Réglable Bench, Multi Degree Olympic Bench, banc de développé incliné, Traction longue machine, Pulldown machine, Chest presse inclinée machine, Multi-Functional Smith Machine, Seated Preacher Curl et Layers Dumbbell Rack. En cardio : tapis roulant professionnel, rameur professionnel et vélo à résistance magnétique. La grille de cette page indique la disponibilité de chacune.",
      },
      {
        question: "Banc plat ou banc réglable MND Fitness : lequel choisir ?",
        answer:
          "Le Flat Bench est un banc plat fixe : seuls ses repose-pieds se règlent, et cette assise sans mécanisme convient au développé couché lourd, au rowing et au travail aux haltères. Si vous voulez aussi travailler en incliné et en décliné, le Banc réglable, le Multi Réglable Bench et le Multi Degree Olympic Bench passent d’une position à l’autre ; le Banc réglable propose en plus une position assise.",
      },
      {
        question: "Quelle différence entre la Traction longue machine et la Pulldown machine ?",
        answer:
          "Ce sont deux postes de tirage pour le dos avec une pile de poids intégrée, donc sans disques à acheter. La Pulldown machine est un tirage vertical : rouleaux qui bloquent les cuisses, barre multi-prises (large, neutre ou étroite) et pile d’environ 10 à 100 kg et plus. La Traction longue machine associe siège réglable, appui poitrine et barre longue en prise large ou neutre, avec une pile de 20 à 120 kg et un encombrement annoncé de 1610 × 1280 × 2145 mm.",
      },
      {
        question: "Quelles dimensions prévoir pour le matériel MND Fitness ?",
        answer:
          "Nos fiches en publient cinq : Flat Bench 1280 × 736 × 380 mm (40 kg), Multi Degree Olympic Bench 1121 × 749 × 757 mm (58 kg net), Seated Preacher Curl 924 × 934 × 900 mm (49 kg), Layers Dumbbell Rack F72 1420 × 700 × 1010 mm (71 kg) et Traction longue machine 1610 × 1280 × 2145 mm. Pour les autres références, les dimensions ne figurent pas sur la fiche : demandez-les à l’équipe Protein.tn avant de commander.",
      },
      {
        question: "Tapis roulant, rameur ou vélo MND Fitness ?",
        answer:
          "Le tapis roulant sert à la marche, au jogging et à la course, avec des vitesses réglables et une surface amortie. Le rameur fait travailler bras, dos, jambes et abdominaux dans un seul geste, avec une résistance modulable. Le vélo à résistance magnétique offre un pédalage discret et sans impact, adapté à une chambre ou un salon. Le tapis et le vélo affichent vitesse, distance, temps et calories estimées.",
      },
      {
        question: "Comment commander MND Fitness en Tunisie ?",
        answer:
          "Choisissez l’équipement disponible, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles. Pour une machine encombrante, vérifiez avant la commande l’accès à la pièce où elle sera installée.",
      },
    ],
    relatedCategories: [
      { slug: "materiel-de-musculation", name: "Bancs et machines de musculation", url: "/materiel-de-musculation" },
      { slug: "cardio-fitness", name: "Tapis roulants, rameurs et vélos", url: "/cardio-fitness" },
      { slug: "equipement", name: "Tout le rayon équipement", url: "/equipement" },
      { slug: "brands", name: "Comparer MND Fitness aux autres marques", url: "/brands" },
    ],
  },
  'eric-favre': {
    metaTitle: "Eric Favre Tunisie | Mass Gainer, Protein Vegan, Born Rage",
    metaDescription:
      "Eric Favre en Tunisie : Mass Gainer Créatine 7 kg, Mass Gainer Zero 7 kg et Protein Vegan 1,5 kg. Dès {prixMin} DT, {nbEnStock} produits en stock.",
    h1: "Eric Favre Tunisie : Mass Gainer 7 kg, Protein Vegan et pré-workout Born Rage",
    introHtml:
      "<p>Eric Favre se présente sur son site comme une marque française, avec un centre de recherche et développement dans les Monts du Lyonnais. Sur Protein.tn, la marque compte {nbProduits} références : des gainers, des protéines en poudre et un pré-workout. Deux gainers de 7 kg ouvrent la gamme : <strong>Mass Gainer Créatine</strong>, en arôme Cookies, qui associe babeurre, maltodextrine, glucose, whey et créatine monohydrate selon son étiquette, et <strong>Mass Gainer Zero</strong>, en Vanilla ou Pistache, décrit sur sa fiche comme un mélange de glucides et de protéines laitières. Le <strong>Pack Prise de Masse</strong> réunit un Hard Mass Gainer 7 kg, une créatine monohydrate micronisée (Gold Creatine) et un shaker de 700 ml.</p><p>Les deux poudres protéinées ne partent pas de la même matière première. <strong>Protein Vegan</strong> 1,5 kg, en Vanilla, est présentée comme un mélange de pois, de riz et de spiruline, sans protéines de lait. <strong>Iso Fusion</strong> 2 kg, en Cookies ou Vanilla, est rangée chez nous au rayon whey isolate ; la marque la décrit sur son site comme un complexe associant whey, protéines de pois et protéines d’œuf. Enfin, <strong>Born Rage Original</strong> est le pré-workout de la gamme, à prendre avant la séance.</p>",
    howToChooseTitle: "Mass Gainer, Protein Vegan ou Iso Fusion : quel produit Eric Favre ?",
    howToChooseBody:
      "<p><strong>Vous cherchez d’abord des calories</strong> : partez sur un gainer de 7 kg. D’après l’étiquette du Mass Gainer Créatine 7 kg, arôme Cookie, transcrite sur notre fiche, une portion de 140 g apporte 549 kcal, 98 g de glucides dont 64 g de sucres, 31 g de protéines, 3,8 g de lipides et 2,5 g de créatine, pour 50 portions. Si vous prenez déjà une créatine seule, comptez ces 2,5 g. Mass Gainer Zero, en Vanilla ou Pistache, répond au même usage ; ses valeurs se lisent sur l’emballage. Le Pack Prise de Masse ajoute une créatine à un gainer que sa fiche dit déjà enrichi en créatine, sans en donner la dose : comparez les deux étiquettes avant de cumuler.</p><p><strong>Vous voulez surtout des protéines</strong>, sans le surplus de glucides d’un gainer : Protein Vegan 1,5 kg est l’option sans protéines de lait, annoncée sans lactose ni gluten sur sa fiche ; Iso Fusion 2 kg contient de la whey. Leur dose de protéines se lit sur l’étiquette. <strong>Pour la séance</strong>, Born Rage Original se prend 20 à 30 minutes avant l’entraînement selon sa fiche, qui ne détaille pas sa formule : vérifiez sur l’étiquette s’il contient de la caféine, et en quelle quantité.</p><ul><li>Lait : dans les deux gainers, Iso Fusion et le gainer du pack.</li><li>Œuf : dans le gainer du pack selon sa fiche, et dans Iso Fusion selon le site de la marque.</li><li>Traces possibles selon l’étiquette du Mass Gainer Créatine : gluten, œufs, sésame, fruits à coque, céleri, sulfites.</li></ul>",
    faqs: [
      {
        question: "Quels produits Eric Favre trouve-t-on sur Protein.tn ?",
        answer:
          "La sélection réunit les gainers Mass Gainer Créatine 7 kg (Cookies) et Mass Gainer Zero 7 kg (Vanilla, Pistache), le Pack Prise de Masse, la protéine végétale Protein Vegan 1,5 kg (Vanilla), Iso Fusion 2 kg (Cookies, Vanilla), rangée au rayon whey isolate, et le pré-workout Born Rage Original. La disponibilité de chacune, en stock ou sur commande, s’affiche dans la grille de cette page.",
      },
      {
        question: "Que contient une dose de Mass Gainer Créatine Eric Favre ?",
        answer:
          "D’après l’étiquette du format 7 kg en arôme Cookie, transcrite sur notre fiche, une portion de 140 g apporte 549 kcal, 98 g de glucides dont 64 g de sucres, 31 g de protéines, 3,8 g de lipides dont 2,2 g d’acides gras saturés, 0,3 g de sel et 2,5 g de créatine, soit 50 portions pour 7 kg. Le produit contient du lait.",
      },
      {
        question: "Mass Gainer Créatine ou Mass Gainer Zero : quelle différence ?",
        answer:
          "Les deux sont vendus en 7 kg. Le Mass Gainer Créatine, en arôme Cookies, déclare 2,5 g de créatine par portion de 140 g sur son étiquette, dont le tableau complet figure sur notre fiche. Le Mass Gainer Zero est proposé en Vanilla et Pistache ; sa fiche le décrit comme un mélange de glucides et de protéines laitières, sans mentionner de créatine ni publier de tableau : son étiquette fait foi.",
      },
      {
        question: "Protein Vegan Eric Favre : quelles sources de protéines ?",
        answer:
          "Sa fiche présente Protein Vegan 1,5 kg, en Vanilla, comme un mélange de protéines de pois, de riz et de spiruline, annoncé sans lactose ni gluten. C’est la seule protéine Eric Favre de notre catalogue sans protéines de lait, Iso Fusion contenant de la whey. Le nombre de grammes de protéines par dose figure sur l’étiquette.",
      },
      {
        question: "Comment prendre le pré-workout Born Rage Original ?",
        answer:
          "Sa fiche indique une dose environ 20 à 30 minutes avant l’entraînement, en respectant les indications de l’emballage. La formule n’y est pas détaillée : lisez sur l’étiquette la liste des ingrédients et la teneur éventuelle en caféine avant la première prise, et tenez compte du café ou des autres boissons caféinées de la journée.",
      },
      {
        question: "Quel est le prix des produits Eric Favre ?",
        answer:
          "Les {nbEnStock} références Eric Favre en stock vont de {prixMin} à {prixMax} DT.",
      },
    ],
    relatedCategories: [
      { slug: "mass-gainers", name: "Mass gainers : comparer les marques", url: "/mass-gainers" },
      { slug: "glucides", name: "Le rayon glucides", url: "/glucides" },
      { slug: "proteines-vegetales", name: "Protéines végétales : voir le rayon", url: "/proteines-vegetales" },
      { slug: "pre-workout", name: "Autres pré-workouts du catalogue", url: "/pre-workout" },
      { slug: "brands", name: "Comparer Eric Favre aux autres marques", url: "/brands" },
    ],
    relatedBrands: ["kevin-levrone", "real-pharm", "hx-nutrition", "challenger-nutrition"],
    officialUrl: "https://www.ericfavre.com/",
  },
  'zumub': {
    metaTitle: "Zumub Tunisie | Zinc 100 comprimés et Omega 3 90 caps",
    metaDescription:
      "Zumub sur Protein.tn : Zinc en boîte de 100 comprimés, à 17,5 mg de zinc (citrate) par comprimé selon l’étiquette, et Omega 3 en boîte de 90 capsules.",
    h1: "Zumub Tunisie : zinc en comprimés et oméga 3 en capsules",
    introHtml:
      "<p>La sélection <strong>Zumub</strong> de Protein.tn tient en deux références, toutes deux rangées dans le rayon santé et vitalité et toutes deux à prise quotidienne. Le <strong>Zinc</strong> est vendu en boîte de <strong>100 comprimés</strong> et classé au rayon zinc. C’est la référence la mieux documentée, puisque l’étiquette du fabricant est transcrite sur notre fiche : une portion d’un comprimé par jour, de préférence au cours d’un repas, et 100 portions par boîte. L’<strong>Omega 3</strong> est proposé en boîte de <strong>90 capsules</strong> et classé au rayon oméga 3 ; sa fiche met en avant l’EPA et le DHA, mais n’en publie pas encore les quantités. La marque ne propose chez nous ni protéine, ni créatine, ni produit d’entraînement : cette page sert donc surtout à situer ces deux compléments du quotidien, puis à les comparer avec les références d’autres marques dans les rayons zinc et oméga 3. La grille ci-dessus affiche le prix et la disponibilité de chacune.</p>",
    howToChooseTitle: "Quel complément Zumub choisir ?",
    howToChooseBody:
      "<p>Les deux références ne répondent pas au même besoin, et ne s’opposent donc pas. Le <strong>Zinc 100 comprimés</strong> apporte, selon l’étiquette transcrite sur notre fiche, 17,5 mg de zinc sous forme de citrate par comprimé, soit 175 % des apports de référence pour un adulte, à raison d’un comprimé par jour. Ce chiffre compte si vous prenez déjà un multivitaminé ou un ZMA : additionnez le zinc des deux étiquettes avant de cumuler, et ne dépassez pas la dose journalière recommandée. L’étiquette signale des traces possibles de fruits à coque, gluten, lait, poisson, crustacés et soja, et le produit est déconseillé aux femmes enceintes ou allaitantes sauf avis d’un professionnel de santé.</p><p>L’<strong>Omega 3 90 caps</strong> relève d’une autre logique : ce sont des acides gras, pas un minéral. Sa fiche ne publie ni la quantité d’EPA et de DHA par capsule, ni le nombre de capsules par jour : c’est l’étiquette de la boîte qui fait foi. C’est aussi elle qui permet de comparer avec les autres oméga 3 du rayon, en ramenant l’EPA et le DHA à la dose journalière plutôt qu’à la capsule. La durée couverte par une boîte de 90 dépend de ce nombre de capsules par jour. En cas de traitement en cours, demandez l’avis d’un professionnel de santé avant de commencer.</p>",
    faqs: [
      {
        question: "Quels produits Zumub sont vendus sur Protein.tn ?",
        answer:
          "Deux références : le Zinc en boîte de 100 comprimés, au rayon zinc, et l’Omega 3 en boîte de 90 capsules, au rayon oméga 3. La grille de cette page indique la disponibilité de chacune.",
      },
      {
        question: "Combien de zinc contient un comprimé Zumub ?",
        answer:
          "Selon l’étiquette transcrite sur notre fiche, un comprimé apporte 17,5 mg de zinc sous forme de citrate, soit 175 % des apports de référence pour un adulte. La dose indiquée est d’un comprimé par jour, de préférence au cours d’un repas ; la boîte contient 100 portions.",
      },
      {
        question: "Le zinc Zumub se cumule-t-il avec un multivitaminé ?",
        answer:
          "Vérifiez d’abord si votre multivitaminé ou votre ZMA contient déjà du zinc : un seul comprimé Zumub couvre 175 % des apports de référence. Additionnez les deux étiquettes et ne dépassez pas la dose journalière recommandée.",
      },
      {
        question: "Combien d’EPA et de DHA dans l’Omega 3 Zumub ?",
        answer:
          "Notre fiche met en avant l’EPA et le DHA sans en publier les quantités. Le tableau nutritionnel imprimé sur la boîte donne l’apport par capsule et par dose journalière : c’est lui qui fait foi, et c’est sur cette base qu’il faut le comparer à d’autres oméga 3.",
      },
      {
        question: "Comment commander Zumub en Tunisie ?",
        answer:
          "Choisissez la référence disponible, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "zinc", name: "Comparer les compléments de zinc", url: "/zinc" },
      { slug: "omega-3", name: "Oméga 3 : comparer les marques", url: "/omega-3" },
      { slug: "vitamines", name: "Vitamines et minéraux : tout le rayon", url: "/vitamines" },
      { slug: "brands", name: "Comparer Zumub aux autres marques", url: "/brands" },
    ],
  },
  'quamtrax': {
    metaTitle: "Quamtrax Tunisie | Creatine Monohydrate & Pure Creatine",
    metaDescription:
      "Quamtrax en Tunisie : Creatine Monohydrate en pot de 500 g et Pure Creatine en 300 g, deux créatines monohydrate sans additif selon leurs fiches.",
    h1: "Quamtrax Tunisie : créatine monohydrate en 500 g et 300 g",
    introHtml:
      "<p>La marque <strong>Quamtrax</strong> est présente sur Protein.tn avec deux références, toutes deux au rayon créatine. <strong>Creatine Monohydrate</strong> en pot de <strong>500 g</strong> est présentée sur sa fiche comme une créatine 100 % monohydrate, sans additifs ni conservateurs. <strong>Pure Creatine</strong> en <strong>300 g</strong> est décrite, elle aussi, comme une créatine monohydrate pure, sans additifs. Aucune protéine, aucun gainer, aucun pré-workout : la page se résume à un seul ingrédient en deux contenances, sans arôme mentionné sur l’une ou l’autre fiche. Aucune des deux ne publie encore de tableau transcrit de l’étiquette — ni la portion, ni le nombre de doses par pot — et c’est donc l’étiquette Quamtrax qui fait foi pour la dose journalière. La grille ci-dessus affiche le prix et la disponibilité de chacune des deux références ; pour comparer avec d’autres marques de créatine, en poudre neutre ou aromatisée, en pot plus petit ou plus grand, le rayon créatine reste le bon point de départ.</p>",
    howToChooseTitle: "Quelle créatine Quamtrax choisir ?",
    howToChooseBody:
      "<p>Les deux références contiennent le même ingrédient selon leurs fiches : de la créatine monohydrate, présentée sans additifs. Le choix entre <strong>500 g</strong> et <strong>300 g</strong> n’est donc pas une question de formule mais de durée : à dose journalière égale, le grand pot couvre simplement une période plus longue. Pour connaître cette durée, divisez le poids net par la portion indiquée sur l’étiquette ; nos fiches ne transcrivent pas encore cette portion, et nous n’avançons aucun chiffre à sa place. Comparez ensuite le prix affiché des deux pots sur cette page.</p><p>Côté usage, la fiche du pot de 500 g renvoie au mode d’emploi de l’étiquette et rappelle de ne pas dépasser la dose journalière ; la prendre chaque jour au même moment aide surtout à ne pas l’oublier. La créatine se prend indépendamment des protéines : si vous utilisez déjà un gainer ou un pré-workout qui en contient, additionnez les quantités des deux étiquettes. En cas de grossesse, de problème de santé ou de prise de médicaments, demandez l’avis d’un professionnel de santé avant de commencer.</p>",
    faqs: [
      {
        question: "Quels produits Quamtrax sont vendus sur Protein.tn ?",
        answer:
          "Deux créatines : Creatine Monohydrate en pot de 500 g et Pure Creatine en 300 g, toutes deux au rayon créatine. La grille de cette page indique la disponibilité de chacune.",
      },
      {
        question: "Que contient la créatine Quamtrax ?",
        answer:
          "Selon sa fiche, la Creatine Monohydrate 500 g est une créatine 100 % monohydrate, présentée sans additifs ni conservateurs. La Pure Creatine 300 g est décrite comme une créatine monohydrate pure, sans additifs. La liste d’ingrédients exacte est imprimée sur l’étiquette de chaque pot.",
      },
      {
        question: "Pot de 500 g ou de 300 g : quelle différence ?",
        answer:
          "Sur le plan de la composition annoncée, aucune : les deux fiches décrivent une créatine monohydrate sans additifs. À dose journalière égale, le pot de 500 g couvre une période plus longue. Comparez le prix affiché des deux formats sur cette page pour décider.",
      },
      {
        question: "Quelle dose de créatine Quamtrax prendre chaque jour ?",
        answer:
          "La portion n’est pas transcrite sur notre fiche : suivez la dose journalière indiquée sur l’étiquette Quamtrax et ne la dépassez pas. Pour savoir combien de temps dure le pot, divisez son poids net par cette portion.",
      },
      {
        question: "Comment commander Quamtrax en Tunisie ?",
        answer:
          "Choisissez le format disponible, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "creatine", name: "Autres créatines monohydrate du catalogue", url: "/creatine" },
      { slug: "performance", name: "Compléments performance : tout le rayon", url: "/performance" },
      { slug: "brands", name: "Comparer Quamtrax aux autres marques", url: "/brands" },
    ],
  },
  'scenit-nutrition': {
    metaTitle: "Scenit Nutrition Tunisie | Tantor Whey, Instant Mass, EAA",
    metaDescription:
      "Scenit Nutrition en Tunisie : Tantor Whey 908 g et 2,267 kg, gainers Instant Real Mass 2,72 kg et Instant Mass 7 kg. Dès {prixMin} DT, {nbEnStock} produits en stock.",
    h1: "Scenit Nutrition Tunisie : whey Tantor, gainers Instant Mass et EAA",
    introHtml:
      "<p>La gamme <strong>Scenit Nutrition en Tunisie</strong> compte {nbProduits} références sur Protein.tn, réparties sur treize rayons : c’est l’une des plus dispersées du catalogue, et elle se lit mieux par usage. Les protéines : <strong>Tantor Whey Protein</strong> en 908 g (arôme Fraise) et en 2,267 kg. La prise de masse : deux gainers, <strong>Instant Real Mass</strong> 2,72 kg (arôme Chocolat), classé en mass gainers, et <strong>Instant Mass</strong> 7 kg, classé en gainers protéinés. Les acides aminés : <strong>EAA Master Amino</strong> 390 g (arôme Fruit Punch), <strong>Elite Arginine</strong> en 120 capsules, deux BCAA — <strong>BCAA Gluta</strong> 500 g et <strong>BCAA 12.000</strong> 457 g — et une <strong>Beta Alanine</strong> 300 g (arôme Fraise). S’y ajoutent <strong>Best Creatine</strong> 500 g, <strong>Best Collagen Premium</strong> 350 g, le ZMA <strong>Best ZMA</strong> en 120 capsules, la multivitamine <strong>Multi Vita+</strong> en 120 capsules, un <strong>Omega 3</strong> et le <strong>T9 Testo Booster</strong> en 120 gélules. Chaque format est une fiche distincte : la grille ci-dessus affiche le prix et la disponibilité de chacune.</p>",
    howToChooseTitle: "Quel produit Scenit Nutrition choisir ?",
    howToChooseBody:
      "<p>Aucune des fiches Scenit Nutrition de notre catalogue ne publie de tableau de valeurs transcrit. Aucun chiffre par portion n’est donc avancé ici : pour la dose, les protéines et les calories, l’étiquette du pot reçu est la seule référence. Le choix se fait par besoin.</p><ul><li><strong>Il vous manque des protéines, pas des calories</strong> : <strong>Tantor Whey Protein</strong>, une protéine de lactosérum, donc issue du lait. Le 908 g et le 2,267 kg portent le même nom ; à dose égale, seule la durée couverte change, et la décision est budgétaire.</li><li><strong>Vous n’arrivez pas à manger assez</strong> : un gainer. <strong>Instant Real Mass</strong> 2,72 kg se prête à un premier essai, <strong>Instant Mass</strong> 7 kg couvre une longue période. Nos fiches décrivent les deux comme enrichis en créatine : tenez-en compte avant d’y ajouter <strong>Best Creatine</strong> 500 g. Celle du 7 kg mentionne aussi des protéines d’œuf et de la gelée royale, à vérifier en cas d’allergie.</li><li><strong>Autour de la séance</strong> : <strong>EAA Master Amino</strong> 390 g réunit les neuf acides aminés essentiels, quand les BCAA n’en contiennent que trois. Ni l’un ni l’autre ne remplace une whey, et la fiche des EAA ne mentionne pas de caféine : ce n’est pas un pré-workout.</li><li><strong>Au quotidien</strong> : <strong>Multi Vita+</strong>, <strong>Best ZMA</strong>, <strong>Best Collagen Premium</strong> et <strong>Omega 3</strong> relèvent d’un usage régulier, sans lien avec l’objectif de la séance. Le <strong>T9 Testo Booster</strong> associe notamment acide D-aspartique, tribulus, maca et ginseng ; sa fiche précise qu’il n’est destiné ni aux femmes ni aux enfants.</li></ul>",
    faqs: [
      {
        question: "Quels produits Scenit Nutrition sont vendus sur Protein.tn ?",
        answer:
          "Le catalogue en compte {nbProduits} : Tantor Whey Protein en 908 g et 2,267 kg, les gainers Instant Real Mass 2,72 kg et Instant Mass 7 kg, EAA Master Amino 390 g, Elite Arginine 120 capsules, BCAA Gluta 500 g, BCAA 12.000 457 g, Beta Alanine 300 g, Best Creatine 500 g, Best Collagen Premium 350 g, Best ZMA 120 capsules, Multi Vita+ 120 capsules, Omega 3 et T9 Testo Booster 120 gélules. La grille de produits de cette page affiche l’état réel de chacune.",
      },
      {
        question: "Quelle différence entre Instant Real Mass et Instant Mass ?",
        answer:
          "Ce sont deux gainers, rangés dans deux rayons différents du site : Instant Real Mass 2,72 kg, référencé en arôme Chocolat, est classé en mass gainers ; Instant Mass 7 kg est classé en gainers protéinés. Nos fiches décrivent l’un et l’autre comme enrichis en créatine, et celle du 7 kg mentionne en plus des protéines d’œuf et de la gelée royale. Aucune des deux ne publie de tableau de valeurs transcrit : comparez les étiquettes des sacs pour les calories et les protéines par portion.",
      },
      {
        question: "Tantor Whey Protein : 908 g ou 2,267 kg ?",
        answer:
          "Les deux formats portent le même nom de produit et sont classés en whey protéine ; le 908 g est référencé en arôme Fraise. À dose journalière égale, le 2,267 kg couvre simplement une période plus longue. Comparez le prix affiché des deux formats sur cette page : la décision est budgétaire. Il s’agit d’une protéine de lactosérum, donc issue du lait.",
      },
      {
        question: "Combien de protéines dans une dose de Tantor Whey Protein ?",
        answer:
          "Notre fiche ne publie pas encore de tableau de valeurs transcrit pour cette référence, et nous n’avançons donc aucun chiffre ici. La taille de la dose et sa teneur en protéines figurent sur l’étiquette du pot que vous recevez, et elles peuvent varier d’un arôme à l’autre.",
      },
      {
        question: "EAA Master Amino ou BCAA Scenit : que choisir ?",
        answer:
          "Les EAA réunissent les neuf acides aminés essentiels, les BCAA trois d’entre eux seulement : leucine, isoleucine et valine. EAA Master Amino est proposé en 390 g, arôme Fruit Punch ; côté BCAA, la marque est référencée avec BCAA Gluta 500 g, qui associe BCAA et glutamine, et BCAA 12.000 457 g. Tous se boivent autour de l’entraînement et complètent un apport protéique déjà couvert ; aucun ne remplace une whey.",
      },
      {
        question: "Comment commander Scenit Nutrition en Tunisie ?",
        answer:
          "Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "whey-proteine", name: "Whey protéines, autres formats et arômes", url: "/whey-proteine" },
      { slug: "mass-gainers", name: "Mass gainers d’autres marques", url: "/mass-gainers" },
      { slug: "gainers-proteines", name: "Gainers protéinés d’autres marques", url: "/gainers-proteines" },
      { slug: "eaa", name: "Le rayon EAA et ses formats", url: "/eaa" },
      { slug: "collagene", name: "Collagène et bien-être", url: "/collagene" },
      { slug: "brands", name: "Comparer Scenit Nutrition aux autres marques", url: "/brands" },
    ],
  },
  'muscle-care': {
    metaTitle: "Muscle Care Tunisie | Pro Vitamin, NAC & Magnésium",
    metaDescription:
      "Muscle Care en Tunisie : Pro Vitamin (vitamines et minéraux), NAC à la N-acétyl-cystéine et deux magnésiums avec vitamine B6, en boîtes de 90 comprimés.",
    h1: "Muscle Care Tunisie : multivitamines, NAC et magnésium-calcium",
    introHtml:
      "<p>La gamme <strong>Muscle Care en Tunisie</strong> tient en {nbProduits} références, toutes en boîte de 90 comprimés et toutes tournées vers le quotidien plutôt que vers la séance : ni protéine, ni créatine, ni pré-workout. <strong>Pro Vitamin</strong> est un complexe de vitamines et de minéraux, classé en vitamines ; c’est la seule dont l’étiquette est transcrite sur notre fiche. <strong>NAC</strong> apporte de la N-acétyl-cystéine, une forme dérivée de la cystéine, et se range en antioxydants. <strong>Magnesium + Calcium + Vitamin B6</strong> associe les trois nutriments de son nom, <strong>Magnesium + Vitamin B6</strong> les deux du sien ; tous deux se trouvent au rayon magnésium. Comme toutes les boîtes contiennent le même nombre de comprimés, le choix ne porte pas sur le format mais sur la composition — et, si vous en combinez plusieurs, sur ce qu’elles apportent en double. La grille ci-dessus affiche le prix et la disponibilité de chacune.</p>",
    howToChooseTitle: "Quel complément Muscle Care choisir ?",
    howToChooseBody:
      "<p><strong>Pro Vitamin</strong> est la base la plus large. Sur la boîte de 90 comprimés, l’étiquette transcrite sur notre fiche déclare une portion de 2 comprimés, soit 45 portions par boîte, apportant notamment 80 mg de vitamine C, 10 µg de vitamine D, 2,5 µg de vitamine B12, 240 mg de calcium, 140 mg de magnésium, 14 mg de fer, 10 mg de zinc, 150 µg d’iode et 55 µg de sélénium, aux côtés des vitamines A, E et du groupe B. La présence d’iode est à signaler à votre médecin si vous suivez un traitement pour la thyroïde.</p><p>C’est ce tableau qui doit guider une association. <strong>Magnesium + Calcium + Vitamin B6</strong> et <strong>Magnesium + Vitamin B6</strong> apportent des nutriments que Pro Vitamin contient déjà : si vous les associez, additionnez les étiquettes avant de fixer la dose. Nos fiches ne transcrivent pas les teneurs par comprimé de ces deux produits, ni celles de la <strong>NAC</strong> : l’étiquette de la boîte est la référence pour ces trois-là. La NAC répond à une autre logique — c’est une source de cystéine, que l’organisme utilise pour fabriquer le glutathion — et elle ne se compare ni à une créatine ni à un pré-workout. En cas de grossesse, d’allaitement ou de traitement en cours, demandez l’avis d’un professionnel de santé avant de commencer.</p>",
    faqs: [
      {
        question: "Quels produits Muscle Care sont vendus sur Protein.tn ?",
        answer:
          "Le catalogue en compte {nbProduits}, toutes en boîte de 90 comprimés : Pro Vitamin, un complexe de vitamines et minéraux ; NAC, à base de N-acétyl-cystéine ; Magnesium + Calcium + Vitamin B6 et Magnesium + Vitamin B6. La marque n’est référencée ni en protéines, ni en créatine, ni en pré-workout. La grille de produits de cette page affiche l’état réel de chacune.",
      },
      {
        question: "Que contient une portion de Pro Vitamin ?",
        answer:
          "L’étiquette transcrite sur notre fiche indique une portion de 2 comprimés, soit 45 portions par boîte de 90. Elle apporte notamment 800 µg de vitamine A, 10 µg de vitamine D, 12 mg de vitamine E, 80 mg de vitamine C, 2,5 µg de vitamine B12, 240 mg de calcium, 140 mg de magnésium, 14 mg de fer, 10 mg de zinc, 150 µg d’iode et 55 µg de sélénium. En cas de différence, l’étiquette de votre boîte fait foi.",
      },
      {
        question: "Peut-on prendre Pro Vitamin avec Magnesium + Calcium + Vitamin B6 ?",
        answer:
          "Oui, mais en additionnant les apports. D’après l’étiquette transcrite sur notre fiche, la portion de 2 comprimés de Pro Vitamin contient déjà 140 mg de magnésium, 240 mg de calcium et 1,4 mg de vitamine B6. Les teneurs du second produit ne sont pas transcrites : lisez sa boîte avant de décider, et demandez conseil à un professionnel de santé en cas de doute.",
      },
      {
        question: "À quoi correspond la NAC Muscle Care ?",
        answer:
          "C’est de la N-acétyl-cystéine en boîte de 90 comprimés, classée en antioxydants sur Protein.tn. La NAC n’est pas du glutathion : elle fournit de la cystéine, que l’organisme peut utiliser pour le fabriquer. Notre fiche ne transcrit pas la teneur par comprimé ; la dose journalière, et donc la durée d’une boîte, se lisent sur l’étiquette.",
      },
      {
        question: "Comment commander Muscle Care en Tunisie ?",
        answer:
          "Choisissez la ou les références disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "vitamines", name: "Multivitamines et minéraux du quotidien", url: "/vitamines" },
      { slug: "magnesium", name: "Magnésium seul ou associé", url: "/magnesium" },
      { slug: "antioxydants", name: "NAC et autres antioxydants", url: "/antioxydants" },
      { slug: "brands", name: "Comparer Muscle Care aux autres marques", url: "/brands" },
    ],
  },
  'applied-nutrition': {
    metaTitle: "Applied Nutrition Tunisie | Amino Fuel EAA & Fat Burner",
    metaDescription:
      "Applied Nutrition sur Protein.tn : Amino Fuel EAA 390 g, Green Tea Fat Burner 90 capsules molles, Triple Fat Burner 30 capsules et Weekend Colon Flush.",
    h1: "Applied Nutrition Tunisie : Amino Fuel EAA et brûleurs au thé vert",
    introHtml:
      "<p>La gamme <strong>Applied Nutrition</strong> vendue en Tunisie par Protein.tn réunit quatre références qui ne répondent pas au même besoin. Une seule relève de l’entraînement : <strong>Amino Fuel EAA</strong>, une poudre d’acides aminés essentiels en pot de 390 g, classée en acides aminés. Les trois autres sont des capsules et des comprimés : <strong>Green Tea Fat Burner</strong> en 90 capsules molles et <strong>Maximum Strength Green Tea Triple Fat Burner</strong> en 30 capsules molles, tous deux classés en brûleurs de graisse, puis <strong>Weekend Colon Flush</strong> en 16 comprimés, classé en digestion et transit. La marque n’est référencée ni en whey, ni en créatine, ni en gainer : si vous cherchez une protéine, c’est dans un autre rayon qu’il faut regarder. Les deux brûleurs contiennent de la caféine selon leurs fiches, ce qui compte si vous prenez déjà du café ou un pré-workout. La grille ci-dessus affiche le prix et la disponibilité de chaque référence.</p>",
    howToChooseTitle: "Quel produit Applied Nutrition choisir ?",
    howToChooseBody:
      "<p>Chaque référence occupe un rayon différent : le choix se fait donc d’abord par besoin. <strong>Amino Fuel EAA</strong> 390 g se boit autour de la séance ; les EAA réunissent les neuf acides aminés essentiels, là où des BCAA n’en apportent que trois. Il complète un apport protéique déjà couvert par l’alimentation ou par une whey, il ne le remplace pas. Notre fiche publie un tableau de valeurs, mais il ne contient à ce jour qu’une ligne « Acides aminés » sans quantité : la dose et le nombre de portions sont à lire sur l’étiquette du pot.</p><p>Les deux brûleurs se distinguent par leur formule et leur contenance. D’après nos fiches, <strong>Green Tea Fat Burner</strong> (90 capsules molles) associe un extrait de thé vert concentré à de la caféine, tandis que <strong>Maximum Strength Green Tea Triple Fat Burner</strong> (30 capsules molles) combine trois extraits de thé — vert, blanc et noir — avec de la caféine également. Leurs fiches les présentent en complément d’un régime hypocalorique et d’une activité physique, pas à leur place ; elles déconseillent la prise du soir si la caféine gêne le sommeil et indiquent la présence de soja dans les ingrédients. <strong>Weekend Colon Flush</strong> (16 comprimés) est une formule de plantes classée en digestion et transit, dont le mode d’emploi s’étale sur trois jours : suivez strictement l’étiquette. Aucune valeur par portion n’est reprise ici pour ces trois références. En cas de traitement, de grossesse ou de problème de santé, demandez l’avis d’un professionnel avant de commencer.</p>",
    faqs: [
      {
        question: "Quels produits Applied Nutrition sont vendus sur Protein.tn ?",
        answer:
          "Quatre références : Amino Fuel EAA en pot de 390 g, Green Tea Fat Burner en 90 capsules molles, Maximum Strength Green Tea Triple Fat Burner en 30 capsules molles et Weekend Colon Flush en 16 comprimés. La marque n’est référencée ni en protéines, ni en créatine, ni en gainer. La grille de produits de cette page affiche l’état réel de chacune.",
      },
      {
        question: "Amino Fuel EAA remplace-t-il une whey ?",
        answer:
          "Non. Les EAA apportent les neuf acides aminés essentiels et se boivent autour de l’entraînement ; une whey sert à compléter les protéines de la journée. Les deux peuvent s’utiliser ensemble, chacun à son moment. Notre fiche ne mentionne pas de caféine pour Amino Fuel EAA : ce n’est pas un pré-workout.",
      },
      {
        question: "Combien de portions contient le pot d’Amino Fuel EAA 390 g ?",
        answer:
          "Notre fiche ne le précise pas encore : son tableau de valeurs ne comporte qu’une ligne « Acides aminés » sans quantité. Le nombre de portions et la dose par prise sont imprimés sur l’emballage Applied Nutrition, qui fait foi.",
      },
      {
        question: "Quelle différence entre Green Tea Fat Burner et Green Tea Triple Fat Burner ?",
        answer:
          "Green Tea Fat Burner, en 90 capsules molles, repose sur un extrait de thé vert associé à de la caféine. Maximum Strength Green Tea Triple Fat Burner, en 30 capsules molles, combine trois extraits de thé — vert, blanc et noir — avec de la caféine, et sa fiche précise qu’il n’est pas destiné aux moins de 18 ans. Les deux se prennent pendant les repas selon leur mode d’emploi, en complément d’une alimentation adaptée et d’une activité physique.",
      },
      {
        question: "Ces brûleurs de graisse contiennent-ils de la caféine ?",
        answer:
          "Oui, d’après leurs fiches. Leur mode d’emploi recommande de ne pas les prendre le soir si la caféine vous empêche de dormir, et de limiter les autres sources de caféine pendant leur utilisation — café, thé, pré-workout. Lisez l’étiquette pour la teneur exacte avant la première prise.",
      },
      {
        question: "Comment commander Applied Nutrition en Tunisie ?",
        answer:
          "Choisissez la ou les références disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "acides-amines", name: "Acides aminés : EAA, BCAA et glutamine", url: "/acides-amines" },
      { slug: "bruleurs-de-graisse", name: "Brûleurs de graisse : comparer les formules", url: "/bruleurs-de-graisse" },
      { slug: "perte-de-poids", name: "Le rayon perte de poids", url: "/perte-de-poids" },
      { slug: "brands", name: "Comparer Applied Nutrition aux autres marques", url: "/brands" },
    ],
  },
  'musclepharm': {
    metaTitle: "MusclePharm Tunisie | Combat Whey, Assault & Wreckage",
    metaDescription:
      "MusclePharm en Tunisie : Combat 100% Whey 2,24 et 2,27 kg, Combat Protein 1,84 et 1,9 kg, Clear-ISO, pré-workouts Assault 344 g et Wreckage 440 g.",
    h1: "MusclePharm Tunisie : protéines Combat, Clear-ISO et pré-workouts",
    introHtml:
      "<p>Dix-sept références portent le nom <strong>MusclePharm</strong> sur Protein.tn, et elles se répartissent en quatre blocs. Les protéines d’abord, en trois gammes distinctes : <strong>Combat 100% Whey</strong> en Strawberry 2,24 kg, Chocolate Milk 2,27 kg et Vanilla Ice Cream 2,24 kg, classée en whey protéine ; <strong>Combat Protein</strong> en Chocolate Milk 1,9 kg, Vanilla Ice Cream 1,84 kg et Horchata 1,84 kg ; et <strong>Pro Series Clear-ISO</strong> en Sour Peach Rings et Cherry Slush, 1,14 lb chacun — ces deux dernières gammes étant classées en protéines multi-sources. Les pré-workouts ensuite : <strong>Assault</strong> en 344 g (Blue Raspberry, Watermelon) et <strong>Pro Series Wreckage</strong> en 440 g (Sour Berry, Sour Peach Rings, Cherry Slush). Puis <strong>Select L-Carnitine 3000</strong> en flacon de 480 ml (Blue Raspberry) et la barre <strong>Combat Ready Protein Bar</strong> de 54 g (Chocolate Peanut Butter Cup). Enfin deux compléments du quotidien, <strong>Essentials Multi-V+</strong> en 90 comprimés et <strong>Essentials Fish Oil</strong> en 60 capsules molles. Chaque arôme est une fiche à part : la grille ci-dessus affiche le prix et la disponibilité de chacune.</p>",
    howToChooseTitle: "Quel produit MusclePharm choisir ?",
    howToChooseBody:
      "<p>Sur la partie protéines, les trois gammes ne sont pas interchangeables. D’après nos fiches, <strong>Combat 100% Whey</strong> associe isolat et concentré de lactosérum : c’est la whey polyvalente de la marque. <strong>Combat Protein</strong> est un mélange de cinq protéines — hydrolysat, isolat et concentré de lactosérum, albumine d’œuf et concentré de protéines de lait —, d’où son classement en protéines multi-sources ; la présence d’œuf compte en cas d’allergie. <strong>Pro Series Clear-ISO</strong> est décrite comme un isolat de lactosérum à préparer en boisson, et son nom annonce une boisson claire plutôt qu’un shake lacté : le choix se joue sur la texture et sur des arômes fruités. Aucune de ces fiches ne publie de tableau de valeurs transcrit : les teneurs par portion sont à lire sur l’étiquette du pot, et elles changent d’un arôme à l’autre.</p><p>Côté séance, <strong>Assault</strong> (344 g) et <strong>Pro Series Wreckage</strong> (440 g) sont deux pré-workouts ; nos fiches ne reprennent aucun chiffre de composition pour eux et renvoient à l’emballage d’origine, où figurent les ingrédients et la teneur en stimulants. Ils se prennent avant l’entraînement et ne se cumulent pas avec d’autres sources de caféine sans avoir lu cette étiquette. <strong>Select L-Carnitine 3000</strong> est un format liquide de 480 ml, <strong>Combat Ready Protein Bar</strong> une barre de 54 g à emporter, et les deux <strong>Essentials</strong> — multivitamines et huile de poisson — relèvent de l’usage quotidien, sans lien avec l’objectif de la séance.</p>",
    faqs: [
      {
        question: "Quels produits MusclePharm sont référencés sur Protein.tn ?",
        answer:
          "Dix-sept références portent le nom MusclePharm : Combat 100% Whey en trois arômes (2,24 et 2,27 kg), Combat Protein en trois arômes (1,84 et 1,9 kg), Pro Series Clear-ISO en deux arômes (1,14 lb), les pré-workouts Assault 344 g en deux arômes et Pro Series Wreckage 440 g en trois arômes, Select L-Carnitine 3000 en 480 ml, la Combat Ready Protein Bar de 54 g, Essentials Multi-V+ en 90 comprimés et Essentials Fish Oil en 60 capsules molles. La grille de produits de cette page affiche l’état réel de chacune.",
      },
      {
        question: "Quelle différence entre Combat 100% Whey et Combat Protein ?",
        answer:
          "D’après nos fiches, Combat 100% Whey associe isolat et concentré de lactosérum et se trouve en whey protéine. Combat Protein mélange cinq protéines — hydrolysat, isolat et concentré de lactosérum, albumine d’œuf et concentré de protéines de lait — et se trouve en protéines multi-sources ; elle contient donc de l’œuf, ce qui compte en cas d’allergie. Les formats diffèrent aussi : 2,24 et 2,27 kg pour la première, 1,84 et 1,9 kg pour la seconde.",
      },
      {
        question: "Qu’est-ce que Pro Series Clear-ISO ?",
        answer:
          "Une protéine à préparer en boisson (« Drink Mix »), décrite sur sa fiche comme un isolat de protéines de lactosérum et référencée en Sour Peach Rings et Cherry Slush, en 1,14 lb chacun. Son nom annonce une boisson claire plutôt qu’un shake lacté. Sur Protein.tn, elle est classée en protéines multi-sources.",
      },
      {
        question: "Assault ou Wreckage : quel pré-workout MusclePharm ?",
        answer:
          "Assault est référencé en 344 g (Blue Raspberry, Watermelon), Pro Series Wreckage en 440 g (Sour Berry, Sour Peach Rings, Cherry Slush). Nos fiches ne reprennent aucun chiffre de composition pour ces deux produits et renvoient à l’emballage d’origine. Comparez-y la liste des ingrédients et la teneur en stimulants, et évitez de les cumuler avec d’autres sources de caféine dans la journée.",
      },
      {
        question: "Combien de protéines dans une dose de Combat 100% Whey ?",
        answer:
          "Aucune fiche MusclePharm de notre catalogue ne publie de tableau de valeurs transcrit : nous ne citons donc aucun chiffre par portion ici. Les valeurs déclarées figurent sur l’étiquette du pot que vous recevez, et elles varient selon l’arôme et le format.",
      },
      {
        question: "Comment commander MusclePharm en Tunisie ?",
        answer:
          "Choisissez le produit, le format et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "whey-proteine", name: "Voir d’autres whey protéines", url: "/whey-proteine" },
      { slug: "proteines-multi-sources", name: "Mélanges de protéines multi-sources", url: "/proteines-multi-sources" },
      { slug: "pre-workout", name: "Pré-workouts : comparer les formules", url: "/pre-workout" },
      { slug: "barres-proteinees", name: "Barres protéinées à emporter", url: "/barres-proteinees" },
      { slug: "brands", name: "Comparer MusclePharm aux autres marques", url: "/brands" },
    ],
  },
  // Was 'scivation' until 28/09/2026: XTEND BCAA 420G (the only in-stock product of the line) moved from the
  // Scivation brand to XTEND, the name people search ("bcaa xtend tunisie"; House Nutrition ranks /brand/xtend
  // at #5 on "bcaa tunisie"). Scivation is XTEND's maker; the emptied Scivation page goes noindex on its own.
  'xtend': {
    metaTitle: "XTEND Tunisie | BCAA Xtend 420 g — Protein.tn",
    metaDescription:
      "XTEND (Scivation) sur Protein.tn : Xtend BCAA en pot de 420 g, arôme fruit de la passion, une poudre de BCAA au ratio 2:1:1 à boire pendant l’entraînement.",
    h1: "XTEND Tunisie : Xtend BCAA 420 g, une boisson de séance",
    introHtml:
      "<p>La marque <strong>XTEND</strong>, conçue par Scivation, compte une référence en stock sur Protein.tn : <strong>Xtend BCAA</strong>, en pot de 420 g, référencé en arôme fruit de la passion et classé au rayon BCAA. Il n’y a donc pas de gamme à départager ici — ni protéine, ni créatine, ni pré-workout de la marque au catalogue —, et cette page sert surtout à situer ce produit par rapport aux autres acides aminés du site. Notre fiche décrit Xtend comme une poudre de BCAA au ratio 2:1:1, c’est-à-dire deux parts de leucine pour une part d’isoleucine et une de valine, pensée comme une boisson à siroter pendant l’entraînement plutôt qu’à avaler en une fois. C’est ce qui le distingue d’une whey ou d’un gainer : il n’a pas vocation à couvrir les protéines de la journée. La grille ci-dessus affiche le prix et la disponibilité actuels de la référence ; les autres BCAA du catalogue se trouvent dans les rayons liés en bas de page.</p>",
    howToChooseTitle: "Xtend BCAA, EAA ou whey : que choisir ?",
    howToChooseBody:
      "<p>Avec une seule référence, la vraie question n’est pas « quel produit XTEND » mais « des BCAA répondent-ils à mon besoin ». Les <strong>BCAA</strong> regroupent trois acides aminés essentiels seulement — leucine, isoleucine et valine —, là où une <strong>whey</strong> ou des <strong>EAA</strong> apportent l’ensemble des acides aminés essentiels. <strong>Xtend BCAA</strong> se place donc en complément d’un apport protéique déjà couvert par l’alimentation ou par une whey, pas à sa place.</p><ul><li><strong>Vous manquez de protéines dans la journée</strong> : une whey est le choix cohérent ; Xtend ne la remplace pas.</li><li><strong>Vous cherchez une boisson de séance</strong> : c’est l’usage décrit sur notre fiche — une dose mélangée à de l’eau, bue par petites gorgées du début à la fin de l’entraînement.</li><li><strong>Vous hésitez avec des EAA</strong> : ils se boivent au même moment mais couvrent tous les acides aminés essentiels, pas seulement les trois ramifiés.</li></ul><p>Notre fiche ne publie pas de tableau de valeurs transcrit pour Xtend BCAA 420 g. La dose, la teneur en BCAA par portion, les édulcorants et les allergènes sont donc à lire sur l’étiquette du pot, qui fait foi ; les chiffres de gamme parfois cités pour Xtend varient selon les versions et les marchés, et nous n’en reprenons aucun ici.</p>",
    faqs: [
      {
        question: "Quels produits XTEND sont vendus sur Protein.tn ?",
        answer:
          "Xtend BCAA en pot de 420 g, référencé en arôme fruit de la passion et classé au rayon BCAA, est la référence en stock ; deux parfums de la gamme XTEND 7G sont disponibles sur commande. La grille de produits de cette page affiche son état réel.",
      },
      {
        question: "Que signifie le ratio 2:1:1 de Xtend BCAA ?",
        answer:
          "Il décrit la proportion des trois acides aminés ramifiés dans la poudre : deux parts de leucine pour une part d’isoleucine et une part de valine. C’est le ratio que notre fiche indique pour Xtend BCAA 420 g. D’autres BCAA du catalogue utilisent des ratios différents, que le rayon BCAA permet de comparer.",
      },
      {
        question: "Combien de BCAA dans une portion de Xtend ?",
        answer:
          "Notre fiche ne publie pas de tableau de valeurs transcrit pour ce pot, et nous n’avançons donc aucun chiffre ici. La taille de la dose et sa teneur en BCAA figurent sur l’étiquette du pot que vous recevez, qui fait foi.",
      },
      {
        question: "Xtend BCAA remplace-t-il une whey ?",
        answer:
          "Non. Les BCAA ne regroupent que la leucine, l’isoleucine et la valine, alors qu’une whey ou des EAA apportent l’ensemble des acides aminés essentiels. Xtend sert de boisson de séance et complète un apport protéique déjà couvert ; il ne le constitue pas.",
      },
      {
        question: "Comment commander XTEND en Tunisie ?",
        answer:
          "Ajoutez la référence au panier si elle est disponible, puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "bcaa", name: "BCAA : comparer les ratios", url: "/bcaa" },
      { slug: "acides-amines", name: "Tous les acides aminés", url: "/acides-amines" },
      { slug: "performance", name: "Le rayon performance", url: "/performance" },
      { slug: "brands", name: "Comparer XTEND aux autres marques", url: "/brands" },
    ],
  },
  /* ── 30/09/2026: template brands with search demand ────────────────────────────────────────
   * Written by agents from /api/productsByBrandId + /api/product_details, then fact-checked against
   * the same API by a second agent; only entries that passed are here. Same rules as above. */
  "abe": {
    metaTitle: "ABE Tunisie | Pre-Workout, Non-Stim Pump & Shred-X",
    metaDescription:
      "ABE sur Protein.tn : Pre-Workout 390 g en neuf arômes, Non-Stim Pump 500 g, Shred-X en poudre ou 90 gélules et créatine micronisée 300 g.",
    h1: "ABE Tunisie : pré-workouts, Shred-X et créatine micronisée",
    introHtml:
      "<p>La marque <strong>ABE</strong> compte 17 références sur Protein.tn, et douze d’entre elles sont des pré-workouts : c’est avant tout une gamme d’avant-séance. Les neuf pots de 390 g, listés sous les noms <strong>Pre-Workout</strong>, <strong>Preworkout</strong> ou <strong>Ultimate Pre-Workout</strong>, se distinguent par l’arôme : Baddy Berry, Blue Raspberry, Tropical Vibes, Sour Gummy Bear, Sour Apple, Red Hawaiian, Cherry Cola, Candy Ice Blast et Bubble Gum Crush. À côté, <strong>Non-Stim Pump Pre Workout</strong> se présente en pot de 500 g, en Tiger’s Blood, Sour Gummy Bear et Blue Raspberry. Le reste se répartit en deux familles : <strong>Creatine Monohydrate</strong> micronisée en 300 g, aromatisée Blue Raspberry ou sans arôme, et <strong>Shred-X, Extreme Thermogenic</strong>, classé au rayon brûleurs de graisse, en poudre de 300 g (Sour Gummy Bear, Lemon Iced Tea) ou en format de 90 gélules végétales. La grille ci-dessus affiche le prix et la disponibilité de chaque référence.</p>",
    howToChooseTitle: "Quel produit ABE choisir ?",
    howToChooseBody:
      "<p>Chez ABE, la première question n’est pas l’arôme mais le rôle du produit. Les deux familles de pré-workout se prennent avant la séance, la créatine se prend tous les jours, séance ou non, et Shred-X relève d’un autre rayon, celui des brûleurs de graisse.</p><ul><li><strong>Pre-Workout, Preworkout et Ultimate Pre-Workout 390 g</strong> : neuf pots qui se départagent au goût ; leur nom ne porte pas la mention « non-stim ».</li><li><strong>Non-Stim Pump Pre Workout 500 g</strong> : la version dont le nom annonce une formule sans stimulants, orientée « pump », à regarder si vous limitez la caféine — l’étiquette confirme la composition.</li><li><strong>Creatine Monohydrate 300 g</strong> : même pot de 300 g dans les deux cas, seul l’arôme change. Choisissez la Micronized Powder Blue Raspberry si vous voulez un goût fruité, ou la Pure Micronized Powder sans arôme. Elle n’apporte pas de protéines.</li><li><strong>Shred-X, Extreme Thermogenic</strong> : poudre aromatisée de 300 g, ou 90 gélules végétales si vous préférez les gélules à une poudre.</li></ul><p>Nos fiches ne publient encore aucun tableau de valeurs pour ces 17 références : nous n’avançons donc ni dose ni teneur en caféine. ABE imprime la composition et les conseils d’utilisation sur l’emballage, qui fait foi ; lisez-le avant de combiner un pré-workout et Shred-X dans la même journée, et demandez conseil à votre médecin en cas de doute.</p>",
    faqs: [
      {
        question: "Quels produits ABE sont vendus sur Protein.tn ?",
        answer:
          "Dix-sept références en trois rayons. En pré-workout : neuf pots de 390 g (Pre-Workout, Preworkout ou Ultimate Pre-Workout, un arôme par pot) et Non-Stim Pump Pre Workout 500 g en trois arômes. En créatine : Creatine Monohydrate micronisée 300 g, Blue Raspberry ou sans arôme. En brûleurs de graisse : Shred-X en poudre 300 g ou en 90 gélules végétales.",
      },
      {
        question: "Quelle différence entre le Pre-Workout 390 g et Non-Stim Pump Pre Workout ?",
        answer:
          "Le format et la mention portée par le nom. Les pots de 390 g sont vendus comme Pre-Workout, Preworkout ou Ultimate Pre-Workout, sans mention « non-stim » ; Non-Stim Pump Pre Workout, en 500 g, annonce dans son nom une formule sans stimulants. Nos fiches ne transcrivent pas encore leur composition : la liste d’ingrédients imprimée sur le pot est la référence.",
      },
      {
        question: "Combien de caféine contient le pré-workout ABE ?",
        answer:
          "Nous ne donnons aucun chiffre, car aucune fiche ABE ne publie encore de tableau de valeurs relevé sur l’étiquette. La teneur en caféine et en autres stimulants, la dose et les précautions figurent sur le pot que vous recevez. Évitez de cumuler un pré-workout avec d’autres sources de caféine dans la même journée, et lisez aussi l’étiquette de Shred-X si vous l’utilisez.",
      },
      {
        question: "Shred-X ABE : poudre ou gélules ?",
        answer:
          "Shred-X, Extreme Thermogenic existe en poudre de 300 g, en Sour Gummy Bear ou Lemon Iced Tea, et en format de 90 gélules végétales : poudre aromatisée ou gélules, selon votre préférence. Sa composition n’est pas transcrite sur nos fiches ; ABE imprime les conseils d’utilisation sur l’emballage, qui fait foi. Demandez conseil à votre médecin en cas de traitement ou de sensibilité aux stimulants.",
      },
      {
        question: "Comment commander ABE en Tunisie ?",
        answer:
          "Choisissez la référence, le format et l’arôme, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles de chaque produit ABE.",
      },
    ],
    relatedCategories: [
      { slug: "pre-workout", name: "Pré-workouts avec ou sans stimulants", url: "/pre-workout" },
      { slug: "creatine", name: "Le rayon créatine, toutes marques", url: "/creatine" },
      { slug: "bruleurs-de-graisse", name: "Brûleurs de graisse en poudre ou en gélules", url: "/bruleurs-de-graisse" },
      { slug: "brands", name: "Comparer ABE aux autres marques", url: "/brands" },
    ],
  },
  "alani-nu": {
    metaTitle: "Alani Nu Tunisie | Protein Bar, Whey Protein, Fat Burner",
    metaDescription:
      "Alani Nu sur Protein.tn : quatre Protein Bar de 48 à 52 g, Whey Protein Fruity Cereal 927 g et Self, Fat Burner en 60 gélules végétales.",
    h1: "Alani Nu Tunisie : Protein Bar, Whey Protein et Self, Fat Burner",
    introHtml:
      "<p><strong>Alani Nu en Tunisie</strong>, ce sont six références sur Protein.tn, réparties sur trois rayons. Les barres en forment l’essentiel : quatre <strong>Protein Bar</strong> classées en barres et snacks protéinés — <strong>Caramel Crunch</strong> 48 g, <strong>Rocky Road</strong> 48 g, <strong>Peanut Butter &amp; Jelly</strong> 52 g et la version <strong>Munchies</strong> 50 g. Viennent ensuite une poudre, <strong>Whey Protein</strong> de 927 g, référencée en arôme <strong>Fruity Cereal</strong> et rangée au rayon whey protéine, puis <strong>Self, Fat Burner</strong>, en 60 gélules végétales, classé au rayon brûleurs de graisse. Chaque fiche correspond à une seule version et à un seul format : il n’y a pas de variante à départager sur un même produit. Les fiches Whey Protein Fruity Cereal, Protein Bar Rocky Road et Protein Bar Peanut Butter &amp; Jelly affichent un tableau « Valeurs nutritionnelles » ; celles de Caramel Crunch, de Munchies et de Self, Fat Burner n’en ont pas encore, et l’étiquette de l’emballage reçu reste la référence. La grille ci-dessus affiche le prix et la disponibilité actuels de chaque produit.</p>",
    howToChooseTitle: "Barre, whey ou gélules : quel produit Alani Nu choisir ?",
    howToChooseBody:
      "<p>Les six références Alani Nu ne répondent pas au même besoin, et leur format annonce déjà leur usage : une barre se mange telle quelle, une poudre se prépare au shaker, une gélule s’avale avec de l’eau.</p><ul><li><strong>Un en-cas à emporter</strong> : les quatre <strong>Protein Bar</strong> — Caramel Crunch 48 g, Rocky Road 48 g, Peanut Butter &amp; Jelly 52 g et Munchies 50 g — se départagent d’abord par leur version et leur poids. Les fiches Rocky Road et Peanut Butter &amp; Jelly affichent un tableau de valeurs pour une barre, utile pour les comparer ; pour Caramel Crunch et Munchies, lisez l’étiquette.</li><li><strong>Compléter les protéines de la journée</strong> : <strong>Whey Protein</strong> 927 g, arôme Fruity Cereal. Sa fiche affiche un tableau de valeurs par mesure et en liste les ingrédients — isolat et hydrolysat de protéines de lactosérum, un mélange d’enzymes, sucralose et acésulfame K —, avec la mention « contient : lait ». Elle indique une mesure dans 175 à 225 ml d’eau ou d’une autre boisson.</li><li><strong>Le rayon brûleurs de graisse</strong> : <strong>Self, Fat Burner</strong> en 60 gélules végétales. Nos fiches n’en publient pas la composition : lisez sur l’emballage la liste des ingrédients et une éventuelle teneur en caféine avant de le cumuler avec du café ou un pré-workout, et demandez conseil à votre médecin ou à votre pharmacien si vous suivez un traitement, êtes enceinte ou allaitez.</li></ul><p>Aucune valeur par portion n’est recopiée sur cette page : les tableaux des fiches servent de repère, et l’étiquette de l’emballage reçu fait foi.</p>",
    faqs: [
      {
        question: "Quels produits Alani Nu sont référencés sur Protein.tn ?",
        answer:
          "Six références : quatre Protein Bar (Caramel Crunch 48 g, Rocky Road 48 g, Peanut Butter & Jelly 52 g et Munchies 50 g), la Whey Protein Fruity Cereal de 927 g, et Self, Fat Burner en 60 gélules végétales. La grille de produits de cette page affiche l’état réel de chacune.",
      },
      {
        question: "Quelle Protein Bar Alani Nu choisir ?",
        answer:
          "Elles se distinguent par leur version et leur poids : Caramel Crunch et Rocky Road pèsent 48 g, Munchies 50 g et Peanut Butter & Jelly 52 g. Les fiches Rocky Road et Peanut Butter & Jelly affichent un tableau de valeurs nutritionnelles pour une barre ; celles de Caramel Crunch et Munchies pas encore. L’étiquette de la barre reçue fait foi.",
      },
      {
        question: "Combien de protéines dans la Whey Protein Alani Nu ?",
        answer:
          "La teneur par mesure figure dans le tableau « Valeurs nutritionnelles » de la fiche Whey Protein Fruity Cereal 927 g ; nous ne la recopions pas ici, et l’étiquette de l’emballage reçu reste la référence. La fiche en liste aussi les ingrédients — isolat et hydrolysat de protéines de lactosérum, sucralose, acésulfame K — et précise qu’elle contient du lait.",
      },
      {
        question: "Que contient Self, Fat Burner d’Alani Nu ?",
        answer:
          "Nos fiches ne publient pas la composition de cette référence de 60 gélules végétales. Lisez la liste des ingrédients et une éventuelle teneur en caféine sur l’étiquette avant de l’associer à d’autres sources de caféine. Demandez conseil à votre médecin ou à votre pharmacien si vous suivez un traitement, êtes enceinte ou allaitez.",
      },
      {
        question: "Comment commander Alani Nu en Tunisie ?",
        answer:
          "Choisissez la référence, ajoutez-la au panier si la grille l’indique disponible, puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "barres-proteinees", name: "Barres protéinées : toutes les marques", url: "/barres-proteinees" },
      { slug: "whey-proteine", name: "Trouver une autre whey protéine", url: "/whey-proteine" },
      { slug: "bruleurs-de-graisse", name: "Brûleurs de graisse : autres marques", url: "/bruleurs-de-graisse" },
      { slug: "brands", name: "Comparer Alani Nu aux autres marques", url: "/brands" },
    ],
  },
  "boiron": {
    metaTitle: "Boiron Tunisie | SleepCalm & Acidil On The Go — Protein.tn",
    metaDescription:
      "Boiron en Tunisie : SleepCalm en boîte de 60 comprimés Meltaway ou en 2 tubes de 80 granules, Acidil On The Go en 2 tubes. Homéopathie, conseil pharmacien.",
    h1: "Boiron Tunisie : SleepCalm et Acidil, comprimés ou granules",
    introHtml:
      "<p><strong>Boiron</strong> est une marque d’homéopathie, et sa gamme sur Protein.tn tient en trois références réparties sous deux noms. <strong>SleepCalm</strong> existe en deux présentations : une boîte de <strong>60 comprimés Meltaway</strong>, sans arôme, à laisser fondre, et <strong>SleepCalm On The Go</strong>, deux tubes de poche de 80 granules chacun, soit 160 au total. <strong>Acidil On The Go</strong> reprend ce même format nomade à deux tubes de 80 granules. Les deux SleepCalm sont rangés au rayon Sommeil &amp; stress, Acidil dans la catégorie Santé &amp; vitalité. Les noms sont ceux de l’emballage d’origine, en anglais, et seule la fiche de SleepCalm On The Go reprend à ce jour la notice du fabricant : pour les deux autres, c’est l’étiquette de la boîte qui fait foi. Ce ne sont pas des compléments sportifs, et leur usage se discute avec votre pharmacien ou votre médecin. La grille ci-dessus affiche le prix et la disponibilité de chaque référence.</p>",
    howToChooseTitle: "SleepCalm ou Acidil, comprimés ou granules : que choisir ?",
    howToChooseBody:
      "<p>Avec trois références, le choix se fait en deux temps : le nom d’abord, qui renvoie à un usage distinct indiqué par Boiron sur chaque emballage, puis la forme. Cette page ne dit pas lequel vous convient : indications, mode d’emploi et précautions figurent sur la notice, et votre pharmacien ou votre médecin reste la personne à consulter avant de commencer.</p><ul><li><strong>SleepCalm, 60 comprimés Meltaway</strong> : des comprimés sans arôme à laisser fondre, en boîte. Notre fiche ne reprend pas encore sa notice, et rien ne permet d’affirmer qu’il a exactement la même composition que la version en granules.</li><li><strong>SleepCalm On The Go</strong> : 160 granules en deux tubes de poche. Sa fiche, transcrite de la notice du fabricant, le présente comme un médicament homéopathique sans mélatonine, associant quatre souches diluées (Passiflora incarnata, Nux moschata, Hyoscyamus niger, Stramonium), avec lactose et saccharose comme excipients. Le mode d’emploi vise les adultes et les enfants à partir de 12 ans ; en dessous, la notice renvoie à un médecin.</li><li><strong>Acidil On The Go</strong> : le même format à deux tubes de 80 granules, pour un autre usage, précisé sur l’emballage d’origine. Sa notice n’est pas encore transcrite sur notre fiche.</li></ul><p>Entre boîte et tubes, la différence de forme est pratique : le tube se glisse dans une poche, la boîte de 60 comprimés se garde plutôt à la maison. En cas de grossesse, d’allaitement ou de traitement en cours, demandez conseil à votre pharmacien ou à votre médecin.</p>",
    faqs: [
      {
        question: "Quels produits Boiron sont vendus sur Protein.tn ?",
        answer:
          "Trois références : SleepCalm en boîte de 60 comprimés Meltaway sans arôme, SleepCalm On The Go en deux tubes de 80 granules, et Acidil On The Go, lui aussi en deux tubes de 80 granules. Les deux SleepCalm sont au rayon Sommeil & stress, Acidil dans la catégorie Santé & vitalité. La grille de cette page affiche l’état réel de chacune.",
      },
      {
        question: "Quelle différence entre SleepCalm Meltaway et SleepCalm On The Go ?",
        answer:
          "La forme d’abord : 60 comprimés à laisser fondre dans une boîte, contre 160 granules répartis en deux tubes de poche. Quant à la composition, elle n’est transcrite sur nos fiches que pour la version On The Go ; celle des comprimés Meltaway est imprimée sur leur boîte, qui fait foi. Demandez conseil à votre pharmacien pour choisir entre les deux.",
      },
      {
        question: "SleepCalm contient-il de la mélatonine ?",
        answer:
          "La notice de SleepCalm On The Go, transcrite sur notre fiche, le présente comme sans mélatonine : il associe quatre souches homéopathiques diluées, avec du lactose et du saccharose comme excipients. Pour la version en comprimés Meltaway, reportez-vous à l’étiquette de la boîte. En cas d’intolérance au lactose, lisez la liste des excipients avant l’achat.",
      },
      {
        question: "Boiron convient-il aux enfants ou pendant la grossesse ?",
        answer:
          "La notice de SleepCalm On The Go prévoit un usage à partir de 12 ans et renvoie à un médecin en dessous de cet âge. Elle demande aussi l’avis d’un professionnel de santé en cas de grossesse ou d’allaitement, et de consulter un médecin si les troubles persistent plus de deux semaines. Pour les autres références, demandez conseil à votre pharmacien ou à votre médecin.",
      },
      {
        question: "Comment commander Boiron en Tunisie ?",
        answer:
          "Ajoutez la référence au panier si elle est disponible, puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "sommeil-stress", name: "Le rayon sommeil et stress", url: "/sommeil-stress" },
      { slug: "sante-vitalite", name: "Santé et vitalité : toutes les catégories", url: "/sante-vitalite" },
      { slug: "vitamines", name: "Vitamines et minéraux au quotidien", url: "/vitamines" },
      { slug: "brands", name: "Comparer Boiron aux autres marques", url: "/brands" },
    ],
  },
  "california-gold-nutrition": {
    metaTitle: "California Gold Nutrition Tunisie | Collagène & Oméga 3",
    metaDescription:
      "California Gold Nutrition en Tunisie : CollagenUP 1 kg, Omega-3 Fish Oil, Premium Krill Oil, CoQ10, LactoBif, magnésium bisglycinate et Pure Creatine 1 kg.",
    h1: "California Gold Nutrition Tunisie : collagène, oméga 3, CoQ10 et vitamines",
    introHtml:
      "<p><strong>California Gold Nutrition en Tunisie</strong>, c’est d’abord une marque de santé quotidienne : sur Protein.tn, plus de 180 références se répartissent sur plus de vingt rayons, et le sport n’en occupe qu’une petite partie. Les familles les plus fournies sont les <strong>antioxydants</strong> (une quinzaine de CoQ10 et d’ubiquinol, acide alpha-lipoïque, quercétine, astaxanthine, resvératrol), les <strong>vitamines</strong> (multivitamines Two-A-Day et SimplyOne, vitamine D3 liquide ou associée à la K2, complexes B, vitamine C en poudre), les plantes et extraits (spiruline, chardon-Marie, berbérine, gamme EuroHerbs), l’<strong>immunité</strong> (propolis, champignons Fungiology, colostrum) et les <strong>articulations</strong> (glucosamine, chondroïtine, MSM, curcuma). Viennent ensuite le <strong>collagène</strong> en poudre, les <strong>oméga 3</strong>, le magnésium, les probiotiques LactoBif, le sommeil et la digestion. Les gélules végétales, capsules molles et comprimés dominent ; les poudres couvrent le collagène, les boissons HydrationUP, la vitamine C, le magnésium, les champignons et les fibres prébiotiques. La ligne <strong>Sport</strong> tient en trois produits : Pure Creatine Monohydrate, Zinc Magnesium et Tribulus.</p>",
    howToChooseTitle: "Quel produit California Gold Nutrition choisir ?",
    howToChooseBody:
      "<p>Le choix se fait d’abord par besoin, puis par forme : la marque décline souvent la même substance en plusieurs versions, que seule l’étiquette départage.</p><ul><li><strong>Collagène</strong> : <strong>CollagenUP</strong> 1 kg associe des peptides de collagène marin à de l’acide hyaluronique et à de la vitamine C ; Hydrolyzed Collagen Peptides types I et III (200 g ou 460 g) et Hydrolyzed Marine Collagen Peptides (200 g ou 500 g) sont proposés seuls, sans arôme.</li><li><strong>Oméga 3</strong> : Omega-3 Fish Oil est une huile de poisson en capsules de gélatine de poisson, par 30 ou 120 ; Premium Krill Oil with Superba2 (60 capsules molles) est une huile de krill : le choix porte sur la source.</li><li><strong>CoQ10</strong> : ubiquinone seule, avec BioPerine, avec PQQ ou en Phytosome, ou bien ubiquinol, sa forme réduite, de 30 à 360 unités par flacon.</li><li><strong>Magnésium</strong> : Magnesium Glycinate et Magnesium Bisglycinate Chelate Albion TRAACS en gélules végétales, ou Magnesium Powder Beverage en poudre, orange 380 g ou sans arôme 283 g.</li><li><strong>Créatine</strong> : Sport Pure Creatine Monohydrate en poudre sans arôme de 1 kg, qui se dose librement, ou en 240 gélules végétales, plus pratiques à emporter.</li></ul><p>Nos fiches ne publient pas de tableau de valeurs transcrit pour ces références : la dose et les allergènes sont à lire sur l’étiquette du produit reçu, qui fait foi. Pour la mélatonine, le 5-HTP, les extraits de plantes ou en cas de traitement en cours, demandez conseil à votre pharmacien ou médecin.</p>",
    faqs: [
      {
        question: "Que vend California Gold Nutrition sur Protein.tn ?",
        answer:
          "Surtout des compléments de santé quotidienne : antioxydants dont la CoQ10, vitamines, plantes et extraits, immunité, articulations, collagène, oméga 3, magnésium, probiotiques LactoBif, sommeil et digestion. La partie entraînement est plus courte : Sport Pure Creatine Monohydrate, Sport Zinc Magnesium, Sport Tribulus, Instantized BCAA Powder 907 g et L-Glutamine AjiPure. La grille de cette page affiche l’état réel de chaque référence.",
      },
      {
        question: "CollagenUP ou Hydrolyzed Collagen Peptides : quelle différence ?",
        answer:
          "CollagenUP, en 1 kg, associe des peptides de collagène marin à de l’acide hyaluronique et à de la vitamine C. Hydrolyzed Collagen Peptides types I et III (200 g ou 460 g) et Hydrolyzed Marine Collagen Peptides (200 g ou 500 g) sont des peptides seuls, sans arôme. Toutes ces références sont des poudres ; la dose et la préparation sont indiquées sur l’emballage.",
      },
      {
        question: "Huile de poisson ou huile de krill chez California Gold Nutrition ?",
        answer:
          "Les deux existent. Omega-3 Fish Oil est une huile de poisson en capsules de gélatine de poisson, en flacon de 30 ou de 120. Premium Krill Oil with Superba2, en 60 capsules molles, est une huile de krill. Nous ne reprenons ici aucune teneur en EPA ou DHA : l’étiquette du flacon reçu est la référence.",
      },
      {
        question: "California Gold Nutrition propose-t-il de la whey ?",
        answer:
          "Non : notre catalogue ne compte ni whey ni gainer de la marque. La gamme Sport compte Pure Creatine Monohydrate en 1 kg ou en 240 gélules végétales, Zinc Magnesium en 90 gélules et Tribulus en 60 comprimés, auxquels s’ajoutent Instantized BCAA Powder 907 g sans arôme et L-Glutamine AjiPure en 120 gélules. Pour une whey, passez par le rayon protéines.",
      },
      {
        question: "Comment commander California Gold Nutrition en Tunisie ?",
        answer:
          "Choisissez la référence et le format, ajoutez-les au panier si le produit est disponible, puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "collagene", name: "Peptides de collagène : comparer les poudres", url: "/collagene" },
      { slug: "omega-3", name: "Huile de poisson et huile de krill", url: "/omega-3" },
      { slug: "antioxydants", name: "CoQ10, ubiquinol et autres antioxydants", url: "/antioxydants" },
      { slug: "brands", name: "Comparer California Gold Nutrition aux autres marques", url: "/brands" },
    ],
  },
  "floradix": {
    metaTitle: "Floradix Tunisie | Iron + Herbs, Floravital, Magnesium",
    metaDescription:
      "Floradix en Tunisie : Iron + Herbs et Floravital en 250, 500 et 700 ml, Magnesium, Calcium Magnesium, Epresat multivitamines et Gallexier, en flacon.",
    h1: "Floradix Tunisie : Iron + Herbs, Floravital et magnésium en flacon",
    introHtml:
      "<p>Sur Protein.tn, <strong>Floradix en Tunisie</strong> tient en une gamme courte et entièrement liquide : onze références, toutes vendues en flacon et mesurées en millilitres, réparties sur trois rayons de la catégorie santé et vitalité. Le cœur de la page est le fer, avec <strong>Iron + Herbs</strong> et <strong>Floravital Iron + Herbs</strong> : deux formules qui portent le même intitulé Iron + Herbs et les trois mêmes contenances, 250, 500 et 700 ml, classées au rayon plantes et herbes. Viennent ensuite deux produits au magnésium, <strong>Magnesium</strong> en 250 et 500 ml et <strong>Calcium Magnesium</strong> en 500 ml, puis <strong>Epresat, Liquid Multivitamin Formula</strong> en 500 ml au rayon vitamines, et <strong>Gallexier Herbal Bitters</strong>, une préparation aux plantes amères en 250 ml. Rien n’existe ici en gélules, en comprimés ou en poudre, et aucune référence ne se décline en arôme : on choisit d’abord le produit, puis la taille du flacon quand il y en a plusieurs. La grille ci-dessus affiche le prix et la disponibilité de chacune.</p>",
    howToChooseTitle: "Quel flacon Floradix choisir ?",
    howToChooseBody:
      "<p>Les onze références Floradix de notre catalogue sont toutes liquides : c’est le produit recherché, pas le format, qui oriente le choix. Nos fiches ne transcrivent aucun tableau de composition pour ces flacons ; la dose, la teneur par prise et les ingrédients se lisent sur l’étiquette du flacon reçu, qui fait foi.</p><ul><li><strong>Iron + Herbs</strong> : Iron + Herbs ou Floravital Iron + Herbs, en 250, 500 ou 700 ml. Leur différence tient à la formule : comparez les ingrédients et les allergènes des deux étiquettes.</li><li><strong>Le magnésium</strong> : Magnesium (250 ou 500 ml) ou Calcium Magnesium (500 ml), qui ajoute le calcium dès son intitulé.</li><li><strong>Une formule multivitaminée</strong> : Epresat, Liquid Multivitamin Formula, 500 ml, est la seule référence Floradix du rayon vitamines.</li><li><strong>Gallexier Herbal Bitters</strong>, 250 ml, est une préparation aux plantes amères que nous décrivons sans lui prêter d’effet : demandez conseil à votre pharmacien ou à votre médecin avant de l’utiliser.</li><li><strong>La contenance</strong> : elle ne se choisit que sur trois produits. Iron + Herbs et Floravital Iron + Herbs existent en 250, 500 et 700 ml, Magnesium en 250 et 500 ml : le petit flacon pour découvrir, le grand pour poursuivre. Calcium Magnesium et Epresat n’existent qu’en 500 ml, Gallexier qu’en 250 ml.</li></ul><p>Avant de prendre un complément de fer ou de magnésium, demandez conseil à votre pharmacien ou à votre médecin, surtout en cas de grossesse, de traitement en cours ou pour un enfant.</p>",
    faqs: [
      {
        question: "Quels produits Floradix sont vendus sur Protein.tn ?",
        answer:
          "Onze références, toutes en flacon : Iron + Herbs et Floravital Iron + Herbs en 250, 500 et 700 ml, Magnesium en 250 et 500 ml, Calcium Magnesium en 500 ml, Epresat, Liquid Multivitamin Formula en 500 ml et Gallexier Herbal Bitters en 250 ml. La grille de produits de cette page affiche l’état réel de chacune.",
      },
      {
        question: "Quelle différence entre Iron + Herbs et Floravital Iron + Herbs ?",
        answer:
          "Les deux sont classés au rayon plantes et herbes et proposés dans les trois mêmes contenances, 250, 500 et 700 ml. Ce qui les distingue tient à la formule, que nos fiches ne transcrivent pas encore : comparez la liste d’ingrédients et les allergènes imprimés sur chaque étiquette, et demandez conseil à votre pharmacien si vous hésitez entre les deux.",
      },
      {
        question: "Combien de fer ou de magnésium par prise ?",
        answer:
          "Nous n’avançons aucun chiffre ici : nos fiches ne publient pas de tableau de valeurs relevé sur l’étiquette pour ces flacons. La dose conseillée et la composition sont imprimées sur l’emballage de la référence reçue, qui fait foi. En cas de grossesse ou de traitement en cours, demandez conseil à votre pharmacien ou à votre médecin avant de commencer.",
      },
      {
        question: "Qu’est-ce que Floradix Gallexier Herbal Bitters ?",
        answer:
          "Une préparation liquide Floradix en flacon de 250 ml, dont le nom anglais signifie « amers aux plantes », classée au rayon plantes et herbes. Notre fiche n’en transcrit pas la composition et nous ne lui attribuons aucun effet. Lisez la liste des plantes et le mode d’emploi sur l’étiquette, et demandez conseil à votre pharmacien ou à votre médecin avant de l’utiliser.",
      },
      {
        question: "Comment commander Floradix en Tunisie ?",
        answer:
          "Choisissez la référence et la contenance disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "plantes-et-herbes", name: "Le rayon plantes et herbes", url: "/plantes-et-herbes" },
      { slug: "magnesium", name: "Magnésium : comparer les formes", url: "/magnesium" },
      { slug: "vitamines", name: "Le rayon vitamines et multivitamines", url: "/vitamines" },
      { slug: "brands", name: "Comparer Floradix aux autres marques", url: "/brands" },
    ],
  },
  "fond-bone-broth": {
    metaTitle: "FOND Bone Broth Tunisie | Chicken Bone Broth en bocal",
    metaDescription:
      "FOND Bone Broth sur Protein.tn : Chicken Bone Broth en bocal, bouillon d’os de poulet citron et ail 414 ml ou curcuma et poivre noir 400 ml.",
    h1: "FOND Bone Broth Tunisie : bouillon d’os de poulet citron ou curcuma",
    introHtml:
      "<p>La marque <strong>FOND Bone Broth</strong> compte deux références sur Protein.tn, et ce sont deux versions du même produit : un <strong>Chicken Bone Broth</strong>, bouillon d’os de poulet prêt à boire, vendu en bocal. La première, <strong>Lemon &amp; Garlic</strong> en 414 ml, est parfumée au citron, à l’ail, au radis rouge et à l’oignon, et classée au rayon plantes et herbes. La seconde, <strong>Turmeric &amp; Black Pepper</strong> en 400 ml, associe curcuma, poivre noir concassé et thym, et figure au rayon articulations. Les deux reposent sur la même base — eau, os de poulet et sel de mer — complétée de légumes et d’aromates, la plupart marqués biologiques sur la liste d’ingrédients ; le fabricant indique des os de poulets élevés en pâturage et sans antibiotiques. Ce n’est ni une poudre ni une gélule mais un aliment liquide, à garder au réfrigérateur une fois ouvert. La grille ci-dessus affiche le prix et la disponibilité actuels des deux bocaux.</p>",
    howToChooseTitle: "Chicken Bone Broth citron-ail ou curcuma : lequel choisir ?",
    howToChooseBody:
      "<p>Les deux bocaux <strong>FOND Bone Broth</strong> partagent la même base de bouillon d’os de poulet et des contenances presque identiques, 414 ml contre 400 ml. Le choix se fait donc sur la recette et sur l’usage que vous en prévoyez, pas sur le format.</p><ul><li><strong>Pour cuisiner</strong> : le <strong>Lemon &amp; Garlic</strong> se boit tel quel, mais le fabricant le présente aussi pour cuire du riz ou du quinoa, ou comme base de soupes et de plats mijotés — partout où une recette demande du bouillon de poulet.</li><li><strong>Pour une tasse chaude</strong> : le <strong>Turmeric &amp; Black Pepper</strong> se réchauffe doucement dans une casserole et se sirote seul ; le fabricant suggère d’y ajouter du lait de coco, de l’ail, de l’origan, du curry ou du gingembre.</li><li><strong>Selon vos goûts</strong> : citron, ail, radis rouge et oignons verts d’un côté ; curcuma, poivre noir concassé et thym de l’autre.</li><li><strong>Si vous surveillez votre sel</strong> : le sel de mer figure à la fois dans le bouillon de base et parmi les ingrédients ajoutés des deux recettes ; lisez la teneur en sodium sur l’étiquette avant d’en faire une habitude quotidienne.</li></ul><p>Protéines, sodium, calories : chaque recette a ses propres valeurs, reprises sur sa fiche produit, et l’étiquette du bocal que vous recevez fait foi. Comparez-les avec soin, car les deux étiquettes ne comptent pas la portion de la même façon.</p>",
    faqs: [
      {
        question: "Quels produits FOND Bone Broth sont vendus sur Protein.tn ?",
        answer:
          "Deux bouillons d’os de poulet en bocal : Chicken Bone Broth Lemon & Garlic en 414 ml, classé au rayon plantes et herbes, et Chicken Bone Broth Turmeric & Black Pepper en 400 ml, classé au rayon articulations. Ils partagent la même base d’eau, d’os de poulet et de sel de mer. La grille de cette page affiche l’état réel de chacun.",
      },
      {
        question: "Le bouillon d’os FOND est-il un complément alimentaire ?",
        answer:
          "Il se présente comme un aliment : un bouillon d’os de poulet prêt à boire, vendu en bocal, avec un tableau de valeurs nutritionnelles sur l’étiquette. Son classement aux rayons Plantes & Herbes et Articulations sert à le retrouver dans le catalogue, pas à lui prêter un effet. Pour une question de santé, demandez conseil à votre médecin ou à votre pharmacien.",
      },
      {
        question: "Combien de protéines dans un bocal FOND Bone Broth ?",
        answer:
          "Cela dépend de la recette et de la portion retenue : l’étiquette du Lemon & Garlic compte une tasse par portion, celle du Turmeric & Black Pepper le bocal entier. Nous ne reprenons donc pas de chiffre sur cette page. Les protéines, le sodium et les calories de chaque recette figurent sur sa fiche produit, et l’étiquette du bocal que vous recevez fait foi.",
      },
      {
        question: "Comment conserver et réchauffer le bouillon FOND ?",
        answer:
          "Une fois ouvert, le bocal se garde au réfrigérateur et se consomme dans les 7 jours. Réchauffez le bouillon doucement dans une casserole : le fabricant déconseille de mettre le bocal au micro-ondes, où il peut provoquer des étincelles. Ne consommez pas le produit si l’opercule est rompu.",
      },
      {
        question: "Comment commander FOND Bone Broth en Tunisie ?",
        answer:
          "Ajoutez le bocal choisi au panier s’il est disponible, puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "plantes-et-herbes", name: "Plantes et herbes : tout le rayon", url: "/plantes-et-herbes" },
      { slug: "articulations", name: "Le rayon articulations", url: "/articulations" },
      { slug: "sante-vitalite", name: "Toute la catégorie santé et vitalité", url: "/sante-vitalite" },
      { slug: "brands", name: "Comparer FOND Bone Broth aux autres marques", url: "/brands" },
    ],
  },
  "maryruth-s": {
    metaTitle: "MaryRuth’s Tunisie | Multivitamines liquides & gommes",
    metaDescription:
      "MaryRuth’s en Tunisie : Liquid Morning Multivitamin, Liquid Nighttime Multimineral, liposomaux 225 ml, extraits de plantes 30 ml et gommes.",
    h1: "MaryRuth’s Tunisie : multivitamines liquides, liposomaux et gommes",
    introHtml:
      "<p>Sur Protein.tn, <strong>MaryRuth’s en Tunisie</strong> compte 49 références, et elles se rangent moins par objectif que par format. Les grands flacons liquides d’abord : <strong>Liquid Morning Multivitamin</strong> en 450 ml (Raspberry, et deux versions + Hair Growth) ou en Essentials+ 946 ml, et <strong>Liquid Nighttime Multimineral</strong> en 450, 887 et 946 ml, décliné aussi en + Skin Renew. Viennent ensuite sept <strong>liposomaux</strong> de 225 ml — Lion’s Mane, Reishi, Cordyceps, Turkey Tail, Sea Moss, CoQ10 et Lysine —, puis neuf <strong>extraits liquides</strong> de 30 ml (Milk Thistle, Dandelion Root, Ginseng, Valerian Root, Maca Root, Turmeric…), presque tous marqués Alcohol Free. Le reste tient surtout en <strong>gommes</strong> : Creatine Gummies, Immunity, Spirulina, Biotin, Fiber, Sleep Gummies et Women’s Multivitamin. Le site les répartit notamment entre vitamines, minéraux, immunité, sommeil, plantes et antioxydants ; la grille ci-dessus affiche le prix et la disponibilité de chacune.</p>",
    howToChooseTitle: "Liquide, liposomal ou gommes : quel produit MaryRuth’s choisir ?",
    howToChooseBody:
      "<p>Chez MaryRuth’s, une même famille existe souvent sous plusieurs formes : partez du rayon, puis du format qui vous convient.</p><ul><li><strong>Vitamines ou minéraux en liquide</strong> : Liquid Morning Multivitamin pour les vitamines, Liquid Nighttime Multimineral pour les minéraux. Le flacon de 887 ou 946 ml contient environ le double du 450 ml.</li><li><strong>Un minéral isolé</strong> : Liquid Magnesium Blend 887 ml, Vegan Liquid Iron 450 ml ou Organic Iodine Liquid Drops 30 ml. Pour le fer et l’iode, demandez conseil à votre médecin ou à votre pharmacien.</li><li><strong>Liposomal ou extrait</strong> : certaines substances existent dans les deux formats, comme le Lion’s Mane (liposomal 225 ml ou Liquid Extract 30 ml) et le curcuma (Turmeric &amp; DHA Liposomal 450 ml, Organic Turmeric et Turmeric Gold en 30 ml).</li><li><strong>Gommes</strong>, pour qui préfère ne rien mesurer : Creatine Gummies, Immunity, Spirulina, Biotin, Fiber ou Women’s Multivitamin Gummies.</li><li><strong>Rayon Sommeil &amp; Stress</strong> : le site y classe deux Sleep Gummies de 60 gommes, Passion Fruit Jasmine Tea et une version Melatonin Free à la fraise (Strawberry), les Sleep Dissolving Strips (30 bandelettes), L-Theanine Liquid Drops 60 ml et Organic Valerian Root 30 ml.</li></ul><p>Nos fiches ne transcrivent aucun tableau de valeurs : aucun dosage n’est repris ici, l’étiquette de l’emballage reçu fait foi. Hair Growth, Skin Renew ou Immune &amp; Energy sont des noms de gamme. Pour les extraits de plantes et de champignons, demandez conseil à votre pharmacien ou à votre médecin, surtout en cas de grossesse ou de traitement.</p>",
    faqs: [
      {
        question: "Quels produits MaryRuth’s sont vendus sur Protein.tn ?",
        answer:
          "Quarante-neuf références : multivitamines, multiminéraux et minéraux liquides de 450 à 946 ml, liposomaux de 225 et 450 ml, extraits et gouttes de 30 à 120 ml, une série de gommes, deux références en gélules (3-in-1 Daily Women’s Health, Ultra Digestive Food Enzymes) et des Sleep Dissolving Strips. La grille de produits de cette page affiche l’état réel de chacune.",
      },
      {
        question: "Liquid Morning Multivitamin ou Liquid Nighttime Multimineral ?",
        answer:
          "Le premier regroupe des vitamines, le second des minéraux ; Morning et Nighttime font partie du nom choisi par la marque. Morning existe en Raspberry 450 ml, en deux versions + Hair Growth 450 ml et en Essentials+ 946 ml ; Nighttime en Coconut Dream, Pineapple Dream et + Skin Renew Berry Dream, de 450 à 946 ml. Les conseils d’utilisation figurent sur l’étiquette.",
      },
      {
        question: "Que signifie « liposomal » sur un produit MaryRuth’s ?",
        answer:
          "Le terme désigne une préparation liquide dans laquelle l’ingrédient est enveloppé dans de petites vésicules lipidiques, les liposomes. Chez MaryRuth’s, il s’applique à sept flacons de 225 ml — Lion’s Mane, Reishi, Cordyceps, Turkey Tail, Sea Moss, CoQ10, Lysine — et à deux de 450 ml, Turmeric & DHA et Women’s 40+ Multivitamin.",
      },
      {
        question: "Quelle dose prendre avec les produits MaryRuth’s ?",
        answer:
          "Nous n’avançons aucune valeur ici : nos fiches ne publient pas de tableau de valeurs transcrit pour la marque. La composition et les conseils d’utilisation sont imprimés sur l’emballage de chaque produit et font foi. Pour Organic Kids Elderberry Liquid Drops, un traitement en cours ou une grossesse, demandez conseil à votre pharmacien ou à votre médecin.",
      },
      {
        question: "Comment commander MaryRuth’s en Tunisie ?",
        answer:
          "Choisissez la référence et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "vitamines", name: "Multivitamines : toutes les marques", url: "/vitamines" },
      { slug: "mineraux", name: "Minéraux : fer, iode et multiminéraux", url: "/mineraux" },
      { slug: "immunite", name: "Le rayon immunité et digestion", url: "/immunite" },
      { slug: "brands", name: "Comparer MaryRuth’s aux autres marques", url: "/brands" },
    ],
  },
  "neurogum": {
    metaTitle: "NeuroGum Tunisie | NeuroMints Sleep & Recharge, Mixed Berry",
    metaDescription:
      "NeuroGum en Tunisie : NeuroMints Sleep & Recharge, parfum Mixed Berry, 6 packs de 12 pastilles « Meltaway Mints » (72 au total), rayon Sommeil & Stress.",
    h1: "NeuroGum Tunisie : NeuroMints Sleep & Recharge, 72 pastilles Mixed Berry",
    introHtml:
      "<p>Sur Protein.tn, la marque <strong>NeuroGum</strong> tient en une seule référence : <strong>NeuroMints Sleep &amp; Recharge</strong>, parfum Mixed Berry, en 6 packs de 12 pastilles, soit 72 au total. Son nom les présente comme des « Meltaway Mints », des pastilles fondantes : malgré le « Gum » de la marque, la référence n’est pas décrite comme un chewing-gum. Elle est classée au rayon <strong>Sommeil &amp; Stress</strong>, dans la catégorie Santé &amp; Vitalité. Ce rayon réunit plusieurs centaines de références en gélules, comprimés, gommes, liquides, pastilles, comprimés à croquer ou à dissolution rapide, bandelettes, sprays et patchs ; les pastilles et les comprimés à dissolution rapide y sont à eux seuls plusieurs dizaines. Il n’y a ni autre parfum, ni autre format, ni autre gamme NeuroGum à départager : la fiche produit reste la page de référence. Notre fiche ne transcrit pas encore l’étiquette : composition, dose, mode de prise et précautions sont ceux de l’emballage d’origine. La grille ci-dessus affiche le prix et la disponibilité actuels.</p>",
    howToChooseTitle: "NeuroMints Sleep & Recharge : ce qu’il faut vérifier avant de choisir",
    howToChooseBody:
      "<p>Avec une seule référence NeuroGum au catalogue, il n’y a pas de gamme à départager : la question est de savoir si <strong>NeuroMints Sleep &amp; Recharge</strong> correspond à ce que vous cherchez. Le format ne suffit pas à trancher, puisque le rayon Sommeil &amp; Stress propose aussi plusieurs dizaines de pastilles, de comprimés à croquer ou à dissolution rapide et quelques bandelettes. Ce qui départage ces références, c’est ce qui est imprimé sur leur emballage.</p><ul><li><strong>La composition</strong> : notre fiche ne transcrit pas encore celle de NeuroMints, et nous ne citons ici aucun ingrédient ; lisez la liste de l’emballage et comparez-la à celle des autres références du rayon.</li><li><strong>Le mode de prise et la dose</strong> : le nom parle de pastilles « meltaway », mais la façon de les prendre et le nombre de pastilles par jour sont ceux indiqués sur l’emballage.</li><li><strong>La quantité</strong> : la référence réunit 6 packs de 12 pastilles, soit 72 ; rapportez ce total à la dose journalière de l’étiquette pour savoir combien de jours elle couvre.</li><li><strong>Le parfum</strong> : Mixed Berry est le seul proposé au catalogue pour cette référence.</li></ul><p>Un complément alimentaire ne remplace pas une alimentation variée et un mode de vie sain. En cas de traitement en cours, de grossesse, d’allaitement ou de doute, demandez conseil à votre pharmacien ou à votre médecin avant d’en prendre, et respectez la dose indiquée sur l’emballage.</p>",
    faqs: [
      {
        question: "Quels produits NeuroGum sont vendus sur Protein.tn ?",
        answer:
          "Une seule référence : NeuroMints Sleep & Recharge, parfum Mixed Berry, en 6 packs de 12 pastilles, soit 72 pastilles. Elle est classée au rayon Sommeil & Stress. Aucun autre parfum, aucun autre format ni aucun autre produit NeuroGum ne figure au catalogue ; la grille de cette page affiche l’état réel de la référence.",
      },
      {
        question: "Les NeuroMints sont-elles des chewing-gums ?",
        answer:
          "Le nom de la référence ne les présente pas ainsi : il parle de « Meltaway Mints », c’est-à-dire de pastilles fondantes, réparties en 6 packs de 12. Notre fiche ne détaille pas le mode de prise ; la façon de les consommer et le nombre de pastilles par jour sont ceux indiqués sur l’emballage, qui fait foi.",
      },
      {
        question: "Que contiennent les NeuroMints Sleep & Recharge ?",
        answer:
          "Notre fiche produit ne transcrit pas encore l’étiquette : les valeurs n’y sont ajoutées qu’après lecture de l’emballage imprimé par NeuroGum. Nous ne citons donc ni ingrédient ni dosage ici. La composition, la dose journalière et les précautions d’emploi figurent sur l’emballage d’origine, qui fait foi.",
      },
      {
        question: "Peut-on prendre NeuroMints avec un traitement ou pendant une grossesse ?",
        answer:
          "Nous ne pouvons pas répondre à la place d’un professionnel de santé, d’autant que la composition n’est pas encore transcrite sur notre fiche. En cas de traitement médicamenteux, de grossesse, d’allaitement, pour un enfant ou au moindre doute, demandez conseil à votre pharmacien ou à votre médecin, emballage en main, et ne dépassez pas la dose indiquée.",
      },
      {
        question: "Comment commander NeuroGum en Tunisie ?",
        answer:
          "Ajoutez NeuroMints Sleep & Recharge au panier lorsque la grille l’indique disponible, puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "sommeil-stress", name: "Sommeil & stress : comparer les formats", url: "/sommeil-stress" },
      { slug: "immunite", name: "Le thème Immunité & digestion", url: "/immunite" },
      { slug: "sante-vitalite", name: "Tout le rayon Santé & vitalité", url: "/sante-vitalite" },
      { slug: "brands", name: "Comparer NeuroGum aux autres marques", url: "/brands" },
    ],
  },
  "peach-perfect": {
    metaTitle: "Peach Perfect Tunisie | Creatine, Inositol & Hormone Hero",
    metaDescription:
      "Peach Perfect sur Protein.tn : Creatine 272 g, 270 g ou 7,4 oz sans arôme, Inositol Multivitamin en poudre 135 g ou 136 g et Hormone Hero en 120 gélules.",
    h1: "Peach Perfect Tunisie : Creatine, Inositol Multivitamin et Hormone Hero",
    introHtml:
      "<p>Sur Protein.tn, <strong>Peach Perfect</strong> compte six références réparties entre deux rayons qui ne se recoupent pas. Au rayon créatine, <strong>Peach Perfect Creatine</strong> existe en trois pots : Pink Lemonade 272 g, Strawberry Acai 270 g et une version sans arôme de 7,4 oz. Notre fiche la décrit comme une créatine monohydrate associée à du collagène hydrolysé et à des BCAA, à diluer dans de l’eau une fois par jour : c’est un mélange, pas une créatine seule. Au rayon vitamines, la marque propose deux formules pensées pour les femmes : <strong>Inositol Multivitamin</strong>, une poudre à boire en Pink Lemonade 135 g ou Strawberry Acai 136 g, et <strong>Hormone Hero, Women’s Daily Multivitamin</strong>, en 120 gélules. Toutes deux associent myo-inositol, D-chiro-inositol, magnésium, zinc et vitamine D3 ; la poudre y ajoute du DIM, les gélules des oméga-3. La grille ci-dessus affiche le prix et la disponibilité actuels de chaque référence.</p>",
    howToChooseTitle: "Quel produit Peach Perfect choisir ?",
    howToChooseBody:
      "<p>Les deux familles Peach Perfect ne répondent pas à la même question et ne se remplacent pas : la <strong>Creatine</strong> accompagne l’entraînement, tandis qu’<strong>Inositol Multivitamin</strong> et <strong>Hormone Hero</strong> sont des compléments du quotidien destinés aux femmes.</p><ul><li><strong>Creatine aromatisée ou sans arôme</strong> : Pink Lemonade 272 g et Strawberry Acai 270 g se diluent simplement dans de l’eau, avec arômes naturels et stévia ; le pot sans arôme de 7,4 oz ne liste aucun autre ingrédient sur notre fiche et se prend de la même façon, dans de l’eau, une fois par jour.</li><li><strong>Vous voulez uniquement de la créatine monohydrate</strong> : la Creatine Peach Perfect contient aussi du collagène hydrolysé et des BCAA ; une créatine vendue seule, au rayon créatine, sera plus directe.</li><li><strong>Poudre ou gélules</strong> : Inositol Multivitamin se dilue dans un verre d’eau (Pink Lemonade 135 g ou Strawberry Acai 136 g), Hormone Hero se présente en 120 gélules. Leurs compositions se recoupent sans être identiques : DIM dans la poudre, oméga-3 dans les gélules.</li><li><strong>Ne les cumulez pas sans vérifier</strong> : les deux formules apportent du zinc et de la vitamine D3, dont les quantités s’additionnent.</li></ul><p>Les valeurs par portion reprises sur nos fiches sont traduites automatiquement de la fiche du fabricant : en cas de différence, l’étiquette du produit reçu fait foi. En cas de grossesse, d’allaitement, de traitement ou de suivi médical, demandez conseil à votre médecin ou à votre pharmacien avant de commencer.</p>",
    faqs: [
      {
        question: "Quels produits Peach Perfect sont vendus sur Protein.tn ?",
        answer:
          "Six références : Peach Perfect Creatine en Pink Lemonade 272 g, Strawberry Acai 270 g et sans arôme 7,4 oz ; Inositol Multivitamin en poudre, Pink Lemonade 135 g ou Strawberry Acai 136 g ; et Hormone Hero, Women’s Daily Multivitamin en 120 gélules. La grille de cette page affiche l’état réel de chacune.",
      },
      {
        question: "La Creatine Peach Perfect est-elle une créatine seule ?",
        answer:
          "Non. Notre fiche la décrit comme une créatine monohydrate associée à du collagène hydrolysé et à des BCAA, à prendre une fois par jour dans de l’eau. Les versions aromatisées ajoutent des arômes naturels et de la stévia, le pot sans arôme aucun autre ingrédient. Les quantités par mesure de nos fiches sont traduites de la fiche du fabricant : l’étiquette du pot reçu fait foi.",
      },
      {
        question: "Inositol Multivitamin ou Hormone Hero : quelle différence ?",
        answer:
          "La forme d’abord : une poudre à diluer dans l’eau (135 g ou 136 g selon l’arôme) contre 120 gélules. Les deux associent myo-inositol, D-chiro-inositol, magnésium, zinc et vitamine D3 ; la poudre ajoute du DIM, les gélules des oméga-3. Les doses diffèrent d’une formule à l’autre : comparez les deux fiches avant de choisir, et ne cumulez pas les deux sans vérifier.",
      },
      {
        question: "Ces compléments Peach Perfect conviennent-ils à toutes les femmes ?",
        answer:
          "Les avertissements d’Inositol Multivitamin demandent de consulter un médecin en cas de grossesse, d’allaitement, de prise de médicaments ou de problème de santé ; pour Hormone Hero aussi, demandez conseil à votre pharmacien ou à votre médecin. Nous n’attribuons aucun effet à l’inositol ni au DIM ; le zinc contribue au maintien d’une peau et de cheveux normaux, la vitamine D au fonctionnement normal du système immunitaire.",
      },
      {
        question: "Comment commander Peach Perfect en Tunisie ?",
        answer:
          "Choisissez la référence et l’arôme disponibles, ajoutez-les au panier puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "creatine", name: "Comparer avec une créatine seule", url: "/creatine" },
      { slug: "vitamines", name: "Autres multivitamines du rayon", url: "/vitamines" },
      { slug: "sante-vitalite", name: "Tout le rayon santé et vitalité", url: "/sante-vitalite" },
      { slug: "brands", name: "Comparer Peach Perfect aux autres marques", url: "/brands" },
    ],
  },
  "bpi-sports": {
    metaTitle: "BPI Sports Tunisie | ISO HD 2,2 kg et Whey Protein HD",
    metaDescription:
      "BPI Sports en Tunisie : whey isolate ISO HD en pot de 2,2 kg et Whey Protein HD en pot de 1,9 kg, toutes deux en arôme Chocolat. Dès {prixMin} DT, {nbEnStock} en stock.",
    h1: "BPI Sports Tunisie : ISO HD 2,2 kg et Whey Protein HD 1,9 kg",
    introHtml:
      "<p>La gamme <strong>BPI Sports</strong> référencée sur Protein.tn se compose de protéines en poudre, classées au rayon Protéines et proposées en arôme Chocolat. <strong>ISO HD</strong>, en pot de 2,2 kg, se range au rayon whey isolate : sa fiche la décrit comme une formule à base de whey isolate, à mélanger à l’eau au shaker. <strong>Whey Protein HD</strong>, que sa fiche appelle aussi Whey HD, se présente en pot de 1,9 kg et se range au rayon whey protéine. Chacune n’existe ici qu’en un seul format et un seul arôme : le choix se fait donc entre ces deux lignes, et le catalogue ne compte ni gainer, ni créatine, ni pré-workout de la marque.</p><p>Aucune des deux fiches ne publie de tableau de valeurs nutritionnelles transcrit : la dose, la teneur en protéines par portion et la liste des ingrédients se lisent sur l’étiquette du pot reçu.</p>",
    howToChooseTitle: "ISO HD ou Whey Protein HD : laquelle choisir ?",
    howToChooseBody:
      "<p>ISO HD et Whey Protein HD complètent toutes deux l’apport en protéines de la journée et se préparent en mélangeant une dose à de l’eau. Elles se distinguent par le rayon où chacune est classée et par la taille du pot.</p><ul><li><strong>Vous suivez de près glucides et lipides</strong> : ISO HD est classée au rayon whey isolate. Un isolat subit une filtration plus poussée qu’une whey concentrée, ce qui abaisse en général sa part de lactose, de glucides et de matières grasses.</li><li><strong>Un isolat ne vous est pas indispensable</strong> : Whey Protein HD est classée au rayon whey protéine et se mélange à l’eau ou à une autre boisson. Sa fiche ne précise pas s’il s’agit d’un concentré, d’un isolat ou d’un mélange des deux : l’étiquette du pot l’indique.</li><li><strong>Vous comparez les formats</strong> : 2,2 kg pour ISO HD, 1,9 kg pour Whey Protein HD. Le nombre de portions dépend de la dose imprimée sur chaque pot.</li><li><strong>Vous êtes sensible au lait ou au soja</strong> : la fiche ISO HD signale du lait et du soja (lécithines) parmi les allergènes, et les deux poudres sont des whey, donc des dérivés du lait.</li></ul><p>Pour comparer les teneurs en protéines, en glucides ou en calories par portion, posez les deux étiquettes côte à côte : ce guide n’en cite aucune, faute de valeurs transcrites sur nos fiches.</p>",
    faqs: [
      {
        question: "Quels produits BPI Sports sont vendus sur Protein.tn ?",
        answer:
          "Protein.tn référence ISO HD en pot de 2,2 kg, au rayon whey isolate, et Whey Protein HD en pot de 1,9 kg, au rayon whey protéine. Toutes deux sont des protéines en poudre en arôme Chocolat. La grille de cette page indique pour chacune le prix et la disponibilité du moment.",
      },
      {
        question: "Quel est le prix d’ISO HD et de Whey Protein HD en Tunisie ?",
        answer:
          "Les {nbEnStock} références BPI Sports en stock vont de {prixMin} à {prixMax} DT.",
      },
      {
        question: "Quelle différence entre ISO HD et Whey Protein HD ?",
        answer:
          "ISO HD est classée au rayon whey isolate : un isolat est filtré plus finement qu’une whey concentrée et contient en général moins de lactose, de glucides et de matières grasses. Whey Protein HD est rangée au rayon whey protéine, et sa fiche ne précise pas sa composition, indiquée sur l’étiquette du pot. Les formats diffèrent aussi : 2,2 kg contre 1,9 kg.",
      },
      {
        question: "ISO HD contient-elle du lait ou du soja ?",
        answer:
          "Oui, selon sa fiche, qui signale des allergènes liés au lait et au soja (lécithines). Le lait n’a rien de surprenant : une whey en est un dérivé, et c’est aussi le cas de Whey Protein HD. En cas d’allergie ou d’intolérance, vérifiez la liste des ingrédients et les mentions d’allergènes sur l’étiquette du pot reçu.",
      },
      {
        question: "Comment prendre une protéine BPI Sports ?",
        answer:
          "La fiche ISO HD indique une dose mélangée à de l’eau, après l’entraînement ou en collation entre les repas, selon votre besoin en protéines. Pour Whey Protein HD, la fiche précise seulement qu’elle se mélange à l’eau ou à une autre boisson ; la dose est imprimée sur le pot. Une whey complète l’alimentation sans remplacer les repas.",
      },
      {
        question: "Comment commander BPI Sports en Tunisie ?",
        answer:
          "Depuis la grille de cette page, ajoutez au panier une référence « En stock », puis indiquez votre adresse et validez la commande : livraison 24–72h partout en Tunisie, paiement à la livraison.",
      },
    ],
    relatedCategories: [
      { slug: "whey-isolate", name: "Autres isolats de whey", url: "/whey-isolate" },
      { slug: "whey-proteine", name: "D’autres whey à comparer", url: "/whey-proteine" },
      { slug: "proteines", name: "Toutes les protéines en poudre", url: "/proteines" },
      { slug: "brands", name: "Comparer BPI Sports aux autres marques", url: "/brands" },
    ],
    relatedBrands: ["ultimate-nutrition", "optimum-nutrition", "muscletech"],
    officialUrl: "https://bpisports.com/",
  },
  "bsn": {
    metaTitle: "BSN Tunisie | Syntha-6 et Syntha-6 Isolate — Protein.tn",
    metaDescription:
      "BSN en Tunisie : Syntha-6 en 1,32 kg et 2,27 kg (trois arômes gourmands en 1,32 kg) et Syntha-6 Isolate en 912 g et 1,82 kg. Comparez formats et arômes.",
    h1: "BSN Tunisie : Syntha-6 et Syntha-6 Isolate, formats et arômes",
    introHtml:
      "<p>La marque <strong>BSN</strong> est représentée sur Protein.tn par une seule gamme, <strong>Syntha-6</strong>, déclinée en quinze références réparties sur deux rayons. Au rayon protéines multi-sources, <strong>Syntha-6</strong> existe en 1,32 kg et en 2,27 kg sous l’intitulé Ultra Premium Protein Matrix : Chocolate Milkshake, Strawberry Milkshake et Cookies &amp; Cream en 1,32 kg, Chocolate Milkshake, Strawberry Milkshake et Vanilla Ice Cream en 2,27 kg. Trois arômes gourmands — Cinnamon Toaster Pastry, Blueberry Pancake et Fruity Cereal — y sont référencés en 1,32 kg sous l’intitulé Protein Powder Drink Mix. Au rayon whey isolate, <strong>Syntha-6 Isolate</strong> se décline en 912 g et en 1,82 kg, avec les trois mêmes arômes dans les deux formats : Chocolate Milkshake, Strawberry Milkshake et Vanilla Ice Cream. Chez nous, BSN se résume donc à de la protéine en poudre : ni créatine, ni gainer, ni pré-workout de la marque au catalogue. La grille ci-dessus affiche le prix et la disponibilité actuels de chaque référence.</p>",
    howToChooseTitle: "Syntha-6 ou Syntha-6 Isolate : quelle protéine BSN choisir ?",
    howToChooseBody:
      "<p>Chez BSN, le choix se fait en trois temps : la base de la poudre, le format, puis l’arôme. <strong>Syntha-6</strong> est classée chez nous au rayon protéines multi-sources, c’est-à-dire une matrice qui associe plusieurs protéines plutôt qu’une whey seule ; le descriptif du fabricant repris sur les fiches Ultra Premium y cite aussi des triglycérides à chaîne moyenne. <strong>Syntha-6 Isolate</strong> est, elle, classée au rayon whey isolate.</p><ul><li><strong>Vous voulez une protéine polyvalente</strong> : Syntha-6, que ce même descriptif présente comme utilisable à tout moment, de jour comme de nuit.</li><li><strong>Vous cherchez une référence du rayon whey isolate</strong> : Syntha-6 Isolate, en 912 g ou en 1,82 kg.</li><li><strong>Vous voulez lire l’étiquette avant de choisir</strong> : les six fiches Syntha-6 Ultra Premium reprennent le tableau de valeurs nutritionnelles et les ingrédients transcrits du fabricant ; les autres fiches BSN n’en publient pas.</li><li><strong>Vous cherchez un arôme précis</strong> : Cookies &amp; Cream et les trois arômes gourmands ne sont référencés chez nous qu’en 1,32 kg, et la Syntha-6 Vanilla Ice Cream qu’en 2,27 kg.</li></ul><p>Côté allergènes, les fiches Ultra Premium déclarent lait et soja en 1,32 kg ; œufs, lait, soja et blé sur Chocolate et Strawberry Milkshake 2,27 kg ; œufs, lait et soja sur Vanilla Ice Cream 2,27 kg, dont la ligne est ambiguë pour le blé. Dans tous les cas, l’étiquette du pot reçu fait foi : lisez-la avant la première prise en cas d’allergie.</p>",
    faqs: [
      {
        question: "Quels produits BSN sont vendus sur Protein.tn ?",
        answer:
          "Quinze références Syntha-6 : Syntha-6 en 1,32 kg et 2,27 kg au rayon protéines multi-sources, dont trois arômes gourmands sous l’intitulé Protein Powder Drink Mix, et Syntha-6 Isolate en 912 g et 1,82 kg au rayon whey isolate. Le catalogue ne compte ni créatine, ni gainer, ni pré-workout de la marque. La grille affiche le prix et la disponibilité actuels de chaque référence.",
      },
      {
        question: "Quelle différence entre Syntha-6 et Syntha-6 Isolate ?",
        answer:
          "Le rayon d’abord : Syntha-6 est classée en protéines multi-sources, un mélange de plusieurs protéines, alors que Syntha-6 Isolate est classée en whey isolate. Les formats ensuite : 1,32 kg et 2,27 kg pour Syntha-6, 912 g et 1,82 kg pour l’Isolate. Seules les fiches Syntha-6 Ultra Premium reprennent un tableau de valeurs transcrit ; pour l’Isolate, les teneurs se lisent sur l’étiquette du pot.",
      },
      {
        question: "Où lire les valeurs nutritionnelles de Syntha-6 ?",
        answer:
          "Sur les six fiches Syntha-6 Ultra Premium, qui reprennent le tableau nutritionnel transcrit du fabricant. La taille de portion et la teneur en protéines y sont identiques ; les calories varient selon l’arôme, et plusieurs autres valeurs d’une fiche à l’autre. Les fiches Protein Powder Drink Mix et Syntha-6 Isolate n’ont pas de tableau transcrit. Dans tous les cas, l’étiquette du pot reçu fait foi.",
      },
      {
        question: "Syntha-6 contient-elle des allergènes ?",
        answer:
          "Les fiches Ultra Premium en déclarent plusieurs : lait et soja en 1,32 kg ; œufs, lait, soja et blé sur Chocolate et Strawberry Milkshake 2,27 kg ; œufs, lait et soja sur Vanilla Ice Cream 2,27 kg, dont la ligne est ambiguë pour le blé. Les autres fiches BSN ne listent pas d’ingrédients : en cas d’allergie, lisez l’étiquette du pot avant la première prise.",
      },
      {
        question: "Comment commander BSN en Tunisie ?",
        answer:
          "Choisissez la référence, le format et l’arôme, ajoutez-la au panier si elle est disponible, puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles de chaque référence BSN.",
      },
    ],
    relatedCategories: [
      { slug: "proteines-multi-sources", name: "Comparer les protéines multi-sources", url: "/proteines-multi-sources" },
      { slug: "whey-isolate", name: "Autres whey isolate du catalogue", url: "/whey-isolate" },
      { slug: "proteines", name: "Tout le rayon protéines", url: "/proteines" },
      { slug: "brands", name: "Comparer BSN aux autres marques", url: "/brands" },
    ],
  },
  "centrum": {
    metaTitle: "Centrum Tunisie | Men, Women & Menopause Support",
    metaDescription:
      "Centrum en Tunisie : Men Multivitamin et Women Multivitamin en 65 comprimés, Menopause Support, Restful Sleep en 28 comprimés. Livraison 24–72h.",
    h1: "Centrum Tunisie : Men, Women Multivitamin et Menopause Support",
    introHtml:
      "<p><strong>Centrum en Tunisie</strong> tient en trois références sur Protein.tn, toutes en comprimés, aucune en poudre, et toutes classées dans la catégorie Santé &amp; vitalité. Deux sont des multivitamines qui portent dans leur nom le public visé : <strong>Centrum Men Multivitamin</strong> et <strong>Centrum Women Multivitamin</strong>, chacune en 65 comprimés, au rayon Vitamines. Le troisième produit, <strong>Centrum Menopause Support, Restful Sleep</strong>, en 28 comprimés, porte un nom qui le destine aux femmes en période de ménopause ; il figure au rayon Sommeil &amp; stress. Aucune déclinaison d’arôme n’est proposée et chaque référence n’existe ici qu’en un seul conditionnement ; la gamme se lit donc par personne : homme, femme ou femme en ménopause. Nos fiches ne transcrivent pas encore la composition de ces trois références : la composition et les conseils d’utilisation imprimés sur l’emballage d’origine font foi. La grille ci-dessus affiche le prix et la disponibilité actuels de chaque référence.</p>",
    howToChooseTitle: "Centrum Men, Women ou Menopause Support : lequel choisir ?",
    howToChooseBody:
      "<p>Aucune référence Centrum n’est déclinée en plusieurs arômes et chacune n’est proposée ici qu’en un seul conditionnement : le choix se fait d’abord sur la personne qui la prendra, puis sur ce qu’elle prend déjà à côté.</p><ul><li><strong>Pour un homme</strong> : <strong>Centrum Men Multivitamin</strong>, en 65 comprimés, rangé au rayon Vitamines.</li><li><strong>Pour une femme</strong> : <strong>Centrum Women Multivitamin</strong>, également en 65 comprimés et au même rayon. Men et Women sont deux références distinctes, chacune sous son propre nom et avec sa propre étiquette : lisez celle de la version que vous choisissez.</li><li><strong>Pendant la ménopause</strong> : <strong>Centrum Menopause Support, Restful Sleep</strong>, en 28 comprimés, classé au rayon Sommeil &amp; stress. Son nom annonce un usage ciblé, et nous ne lui attribuons aucun effet. Lisez la composition et les conseils d’utilisation imprimés sur l’emballage, et demandez conseil à votre pharmacien ou à votre médecin, surtout si vous suivez un traitement.</li><li><strong>Si vous prenez déjà un autre complément de vitamines ou de minéraux</strong> : comparez les étiquettes avant de les associer, pour savoir ce que vous cumulez.</li></ul><p>Nos fiches ne publient pas de tableau de valeurs pour ces trois références : aucun dosage n’est cité ici, et la composition comme les conseils d’utilisation sont ceux imprimés sur l’emballage d’origine. Un complément alimentaire ne remplace pas une alimentation variée et équilibrée.</p>",
    faqs: [
      {
        question: "Quels produits Centrum sont vendus sur Protein.tn ?",
        answer:
          "Trois références, toutes en comprimés : Centrum Men Multivitamin et Centrum Women Multivitamin, chacune en 65 comprimés au rayon Vitamines, puis Centrum Menopause Support, Restful Sleep en 28 comprimés au rayon Sommeil & stress. Aucune n’est proposée en poudre, ni en plusieurs arômes. La grille de produits de cette page affiche l’état réel de chacune.",
      },
      {
        question: "Quelle différence entre Centrum Men et Centrum Women ?",
        answer:
          "Ce sont deux références distinctes, vendues sous deux noms différents : Men pour les hommes, Women pour les femmes, toutes deux en 65 comprimés au rayon Vitamines. Nos fiches ne transcrivent pas encore leur composition : lisez l’étiquette de chacune, avec la composition et les conseils d’utilisation imprimés sur l’emballage d’origine. Choisissez la version qui correspond à la personne qui la prendra.",
      },
      {
        question: "Que contient un comprimé Centrum ?",
        answer:
          "Nous n’avançons aucun chiffre ici : aucune des trois fiches Centrum ne publie de tableau de valeurs relevé sur l’emballage. La composition et les conseils d’utilisation imprimés sur l’emballage d’origine font foi, y compris pour le nombre de comprimés à prendre. Respectez la dose indiquée et tenez compte des autres compléments que vous prenez déjà.",
      },
      {
        question: "À qui s’adresse Centrum Menopause Support, Restful Sleep ?",
        answer:
          "Son nom indique qu’il vise les femmes en période de ménopause, et Protein.tn le classe au rayon Sommeil & stress ; l’emballage contient 28 comprimés. Nous ne lui attribuons aucun effet. Lisez la composition et les conseils d’utilisation imprimés sur l’emballage, et demandez conseil à votre pharmacien ou à votre médecin, en particulier si vous suivez un traitement ou prenez d’autres compléments.",
      },
      {
        question: "Comment commander Centrum en Tunisie ?",
        answer:
          "Ajoutez la référence choisie au panier si elle est disponible, puis renseignez votre adresse de livraison. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "vitamines", name: "Comparer les multivitamines homme et femme", url: "/vitamines" },
      { slug: "sommeil-stress", name: "Compléments du rayon sommeil et stress", url: "/sommeil-stress" },
      { slug: "sante-vitalite", name: "Santé et vitalité : tous les rayons", url: "/sante-vitalite" },
      { slug: "brands", name: "Comparer Centrum aux autres marques", url: "/brands" },
    ],
  },
  "goli-nutrition": {
    metaTitle: "Goli Nutrition Tunisie | Ashwagandha & Sleep Gummies",
    metaDescription:
      "Goli Nutrition en Tunisie : Ashwagandha Gummies, Dreamy Sleep et Sleep Gummies, Pre+Post+Probiotics et Women’s Complete Multi, en gommes à mâcher.",
    h1: "Goli Nutrition Tunisie : ashwagandha, sommeil et probiotiques en gommes",
    introHtml:
      "<p>Sur Protein.tn, toute la gamme <strong>Goli Nutrition</strong> se prend en gomme à mâcher : les cinq références de cette page sont des gummies, vendus en pots de 60 gommes, à l’exception de <strong>Sleep Gummies</strong> en 50 gommes. Notre catalogue ne compte ni poudre, ni gélule, ni protéine de la marque ; la gamme est rangée par besoin, dans quatre rayons de la catégorie Santé &amp; vitalité. <strong>Ashwagandha Gummies</strong> est classé au rayon Ashwagandha et repose, d’après notre fiche, sur un extrait de racine KSM-66. Le rayon Sommeil &amp; stress réunit deux références, <strong>Dreamy Sleep Gummies</strong> et <strong>Sleep Gummies</strong>. <strong>Pre+Post+Probiotics Gummies</strong> associe prébiotiques, probiotiques et postbiotiques dans une même gomme, au rayon Probiotiques. Enfin, <strong>Women’s Complete Multi Gummies</strong> est une multivitamine pensée pour les femmes, classée au rayon Vitamines. Aucun arôme n’est à choisir : une seule version par référence. La grille ci-dessus affiche le prix et la disponibilité actuels de chaque pot.</p>",
    howToChooseTitle: "Quelles gommes Goli Nutrition choisir ?",
    howToChooseBody:
      "<p>Les cinq références sont des gommes à mâcher : le choix se fait donc par besoin, puis par composition. Aucune teneur par portion n’est avancée ici ; l’étiquette du pot reçu fait foi.</p><ul><li><strong>Ashwagandha Gummies</strong> (60 gommes) : un extrait de racine d’ashwagandha KSM-66. La fiche indique 2 gommes deux fois par jour, soit quinze jours par pot.</li><li><strong>Dreamy Sleep Gummies</strong> (60) ou <strong>Sleep Gummies</strong> (50) : deux références distinctes du même rayon. Les données relevées pour Dreamy Sleep citent de la mélatonine et des extraits de mélisse, de camomille et de passiflore ; la composition de Sleep Gummies n’est pas encore relevée sur notre fiche.</li><li><strong>Pre+Post+Probiotics Gummies</strong> (60 gommes) : fibres XOS, souche Bacillus subtilis DE111 et postbiotiques (Lactobacillus paracasei MCC1849 résistant à la chaleur), à raison de 3 gommes par jour selon la fiche.</li><li><strong>Women’s Complete Multi Gummies</strong> (60 gommes) : 13 vitamines et 5 minéraux, dont la biotine, qui contribue au maintien de cheveux et d’une peau normaux ; 2 gommes par jour, trente jours par pot.</li></ul><p>Ashwagandha, Dreamy Sleep et Women’s Complete Multi contiennent tous trois de la vitamine D2 : si vous en associez deux, additionnez les apports indiqués sur les étiquettes. Avant de prendre une plante ou de la mélatonine, en cas de traitement, de grossesse ou d’allaitement, demandez conseil à votre pharmacien ou à votre médecin.</p>",
    faqs: [
      {
        question: "Quels produits Goli Nutrition sont vendus sur Protein.tn ?",
        answer:
          "Cinq références, toutes en gommes à mâcher : Ashwagandha Gummies, Dreamy Sleep Gummies, Pre+Post+Probiotics Gummies et Women’s Complete Multi Gummies en pots de 60 gommes, et Sleep Gummies en 50 gommes. Elles se répartissent entre les rayons Ashwagandha, Sommeil & stress, Probiotiques et Vitamines. La grille de cette page affiche l’état réel de chacune.",
      },
      {
        question: "Quelle différence entre Dreamy Sleep Gummies et Sleep Gummies ?",
        answer:
          "Le format d’abord : 60 gommes pour Dreamy Sleep, 50 pour Sleep Gummies. Les données relevées pour Dreamy Sleep citent de la mélatonine et des extraits de mélisse, de camomille et de passiflore, alors que la composition de Sleep Gummies n’est pas encore relevée sur notre fiche. Comparez les deux étiquettes, et demandez conseil à votre pharmacien ou médecin en cas de traitement.",
      },
      {
        question: "Que contiennent les Pre+Post+Probiotics Gummies ?",
        answer:
          "Trois éléments dans la même gomme, d’après les données relevées : des fibres prébiotiques (xylooligosaccharides, ou XOS), une souche probiotique, Bacillus subtilis DE111, et des postbiotiques (Lactobacillus paracasei MCC1849 résistant à la chaleur). La fiche indique 3 gommes une fois par jour, soit vingt jours pour un pot de 60. Les quantités par portion figurent sur l’étiquette.",
      },
      {
        question: "Les gommes Goli Nutrition contiennent-elles de la gélatine ou du sucre ?",
        answer:
          "Les listes d’ingrédients relevées pour Ashwagandha, Pre+Post+Probiotics et Women’s Complete Multi utilisent de la pectine, pas de gélatine, et leurs deux premiers ingrédients sont le sirop de tapioca et le sucre de canne : ce sont des gommes sucrées. Pour Dreamy Sleep et Sleep Gummies, vérifiez la liste sur le pot. Rangez-les hors de portée des enfants.",
      },
      {
        question: "Comment commander Goli Nutrition en Tunisie ?",
        answer:
          "Ajoutez la référence au panier si elle est disponible, puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "sommeil-stress", name: "Sommeil & stress : autres formules", url: "/sommeil-stress" },
      { slug: "ashwagandha", name: "Le rayon ashwagandha", url: "/ashwagandha" },
      { slug: "probiotiques", name: "Le rayon probiotiques", url: "/probiotiques" },
      { slug: "brands", name: "Comparer Goli Nutrition aux autres marques", url: "/brands" },
    ],
  },
  "iberogast": {
    metaTitle: "Iberogast Tunisie | Dual Action Digestive Relief",
    metaDescription:
      "Iberogast en Tunisie : Dual Action Digestive Relief, 20 ml ou 30 capsules molles, rayon Digestion & transit. Livraison 24–72h, paiement à la livraison.",
    h1: "Iberogast Tunisie : Dual Action Digestive Relief en 20 ml ou en capsules",
    introHtml:
      "<p>Sur Protein.tn, la marque <strong>Iberogast</strong> tient en un seul nom de produit, <strong>Dual Action Digestive Relief</strong>, proposé en deux références : un <strong>format de 20 ml</strong> et un conditionnement de <strong>30 capsules molles</strong>. Les deux sont rangées au rayon Digestion &amp; transit, qui dépend du thème Immunité &amp; digestion dans la catégorie Santé &amp; vitalité. Ce n’est ni une protéine ni un produit d’entraînement, et aucun arôme n’est proposé pour l’une ou l’autre référence : le seul choix à faire porte sur le format. Iberogast imprime la composition et les conseils d’utilisation sur l’emballage d’origine ; nos fiches ne les reprennent pas encore, car les valeurs nutritionnelles n’y sont ajoutées qu’après lecture de l’étiquette imprimée par la marque. Avant une première prise, demandez conseil à votre pharmacien ou à votre médecin. La grille ci-dessus affiche le prix et la disponibilité actuels de chaque format.</p>",
    howToChooseTitle: "Iberogast 20 ml ou 30 capsules molles : que choisir ?",
    howToChooseBody:
      "<p>Les deux références portent le même nom, <strong>Dual Action Digestive Relief</strong>, sont classées au même rayon et ne sont déclinées en aucun arôme : sur notre catalogue, seul le format les distingue. Voici ce que nos fiches permettent d’affirmer, et ce qu’elles ne permettent pas.</p><ul><li><strong>Format 20 ml</strong> : sa contenance est exprimée en millilitres, pas en nombre d’unités. Le nombre de prises qu’il représente dépend des conseils d’utilisation imprimés par Iberogast, que nos fiches ne transcrivent pas.</li><li><strong>30 capsules molles</strong> : la quantité est comptée en unités, ce qui donne un repère immédiat sur le contenu ; la dose par prise reste celle qu’indique Iberogast, à lire sur l’emballage.</li><li><strong>Aucune équivalence de dose</strong> : ni composition ni valeur nutritionnelle n’est publiée pour l’un ou l’autre format, et nous ne présentons donc pas 20 ml et 30 capsules comme interchangeables.</li></ul><p>Le choix tient d’abord à la forme que vous préférez, et le reste se lit sur la référence reçue. Pour une question sur l’une de ces deux références, l’équipe de Protein.tn, installée à Sousse, vous répond.</p>",
    faqs: [
      {
        question: "Quels produits Iberogast sont vendus sur Protein.tn ?",
        answer:
          "Deux références vendues sous le même nom, Iberogast Dual Action Digestive Relief : un format de 20 ml et un conditionnement de 30 capsules molles, toutes deux au rayon Digestion & transit. Ce sont les deux seules présentations d’Iberogast au catalogue, sans déclinaison d’arôme ; la grille de cette page affiche le prix et la disponibilité actuels de chacune.",
      },
      {
        question: "Le format 20 ml et les capsules ont-ils la même composition ?",
        answer:
          "Ils portent le même nom, mais nos fiches ne transcrivent la composition d’aucun des deux : les valeurs nutritionnelles n’y sont ajoutées qu’après lecture de l’étiquette imprimée par Iberogast, ce qui n’est pas encore fait. Nous n’avançons donc ni équivalence ni dosage ; la composition qui fait foi est celle imprimée sur l’emballage du format que vous recevez.",
      },
      {
        question: "Iberogast est-il un complément pour sportifs ?",
        answer:
          "Non. Les deux références sont classées au rayon Digestion & transit, rattaché au thème Immunité & digestion de la catégorie Santé & vitalité, et non dans les rayons protéines ou performance. Nous ne leur attribuons aucun effet sur l’entraînement, la récupération ou la composition corporelle, et cette page ne les présente pas comme une aide à la pratique sportive.",
      },
      {
        question: "Peut-on prendre Iberogast pendant la grossesse ou avec un traitement ?",
        answer:
          "Nos fiches ne tranchent pas cette question, et cette page non plus. En cas de grossesse, d’allaitement, pour un enfant ou si vous suivez un traitement, demandez conseil à votre pharmacien ou à votre médecin avant toute prise, en lui présentant la composition imprimée par Iberogast sur la référence que vous envisagez.",
      },
      {
        question: "Comment commander Iberogast en Tunisie ?",
        answer:
          "Choisissez le format, 20 ml ou 30 capsules molles, ajoutez-le au panier s’il est disponible, puis renseignez votre adresse de livraison. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "digestion", name: "Tout le rayon Digestion & transit", url: "/digestion" },
      { slug: "immunite", name: "Tout le thème Immunité & digestion", url: "/immunite" },
      { slug: "sante-vitalite", name: "La catégorie Santé & vitalité au complet", url: "/sante-vitalite" },
      { slug: "brands", name: "Comparer Iberogast aux autres marques", url: "/brands" },
    ],
  },
  "one-a-day": {
    metaTitle: "One-A-Day Tunisie | Men’s Multi, Women’s Multi et 50+",
    metaDescription:
      "One-A-Day en Tunisie : Men’s Multi, Women’s Multi, formules 50+ et Proactive 65+ en comprimés, VitaCraves et Multi Gummy en gommes à mâcher.",
    h1: "One-A-Day Tunisie : Men’s Multi, Women’s Multi et formules 50+",
    introHtml:
      "<p>Sur Protein.tn, <strong>One-A-Day</strong> est une marque consacrée uniquement aux <strong>multivitamines</strong> : ses 15 références sont toutes classées au rayon Vitamines, dans la catégorie Santé &amp; vitalité. La gamme se lit selon deux axes. D’abord le public : <strong>Men’s Multi</strong> (100 et 200 comprimés) et <strong>Women’s Multi</strong> (60 et 200 comprimés), leurs versions <strong>Men’s 50+ Multi</strong> (100 et 200 comprimés) et <strong>Women’s 50+ Multi</strong> (65 et 100 comprimés), <strong>Women’s Petites Complete Multivitamin</strong> en 160 comprimés, et <strong>Proactive 65+ For Men &amp; Women</strong> en 150 comprimés, qui s’adresse aux hommes comme aux femmes. Ensuite le format : cinq références se présentent en <strong>gommes à mâcher</strong> — <strong>Adult Multi Gummy</strong> (150 gommes), elle aussi sans distinction homme/femme, <strong>Men’s 50+ Multi Gummy</strong> et <strong>Women’s 50+ Multi Gummy</strong> (110 gommes), <strong>VitaCraves</strong> Men’s et Women’s (170 gommes). La grille ci-dessus affiche le prix et la disponibilité de chacune.</p>" +
      "<p>Le <strong>One-A-Day de BioTech USA</strong> (100 comprimés) est une multivitamine d’une autre marque : elle a sa propre fiche, au rayon Vitamines.</p>",
    howToChooseTitle: "Quelle multivitamine One-A-Day choisir ?",
    howToChooseBody:
      "<p>Les quinze références One-A-Day se distinguent selon quatre critères, à vérifier sur l’emballage.</p><ul><li><strong>Le public</strong> : Men’s, Women’s ou mixte. Les compositions transcrites diffèrent : l’étiquette de Men’s Multi 200 comprimés précise qu’il ne contient pas de fer, alors que Women’s Petites Complete Multivitamin liste du fumarate ferreux.</li><li><strong>L’âge</strong> : parmi les formules ciblées par âge, les versions 50+ existent séparément pour hommes et pour femmes ; Proactive 65+ est la seule commune aux deux, en mini-comprimés et formulée sans vitamine K.</li><li><strong>Le format</strong> : selon les conseils d’utilisation repris sur les fiches de Men’s Multi 200, Men’s 50+ Multi 100 et Women’s 50+ Multi 100 (un par jour), de Petites et de Proactive 65+ (deux par jour), ces comprimés se prennent avec un repas et sont réservés aux adultes. Les gommes VitaCraves se mâchent à deux par jour dès 12 ans et contiennent sucre et blé. La gélatine figure dans les VitaCraves mais aussi dans quatre de ces cinq comprimés : si vous l’évitez, lisez l’étiquette.</li><li><strong>La durée</strong> : à deux comprimés par jour, 160 comprimés couvrent 80 jours ; à un comprimé par jour, un flacon de 100 couvre 100 jours.</li></ul><p>Une partie des fiches produits reprend l’étiquette transcrite du fabricant, d’autres pas encore. Cette page ne cite aucune teneur chiffrée : pour chaque référence, l’étiquette du flacon fait foi. Un complément ne remplace pas une alimentation variée. En cas de grossesse, d’allaitement ou de traitement, demandez conseil à votre médecin ou à votre pharmacien.</p>",
    faqs: [
      {
        question: "Quelles références One-A-Day figurent au catalogue de Protein.tn ?",
        answer:
          "Quinze références, toutes au rayon Vitamines : Men’s Multi, Women’s Multi, Men’s 50+ Multi, Women’s 50+ Multi, Women’s Petites Complete Multivitamin et Proactive 65+ en comprimés, puis Adult Multi Gummy, Men’s 50+ et Women’s 50+ Multi Gummy et VitaCraves Men’s et Women’s en gommes à mâcher. La grille de cette page indique la disponibilité réelle de chacune.",
      },
      {
        question: "Quelle différence entre One-A-Day Men’s Multi et Women’s Multi ?",
        answer:
          "Ce sont deux références distinctes : Men’s Multi en 100 et 200 comprimés, Women’s Multi en 60 et 200 comprimés. L’étiquette transcrite sur la fiche de Men’s Multi 200 comprimés indique un comprimé par jour avec un repas et aucun fer. Aucune des deux fiches de Women’s Multi ne reprend encore son étiquette : sa composition se lit sur le flacon, qui fait foi.",
      },
      {
        question: "Comprimés ou gommes One-A-Day : que choisir ?",
        answer:
          "Les cinq comprimés dont nos fiches reprennent les conseils d’utilisation — Men’s Multi 200, Men’s 50+ Multi 100, Women’s 50+ Multi 100, Petites et Proactive 65+ — se prennent avec un repas et sont réservés aux adultes. Les VitaCraves se mâchent à deux par jour dès 12 ans et contiennent sucre et blé. La gélatine figure dans les VitaCraves et dans quatre de ces comprimés : lisez l’étiquette.",
      },
      {
        question: "One-A-Day 50+ ou Proactive 65+ : quelle différence ?",
        answer:
          "Les versions 50+ existent séparément pour hommes et pour femmes, en comprimés comme en gommes. Parmi ces formules ciblées par âge, Proactive 65+ For Men & Women est la seule commune aux deux : des mini-comprimés, deux par jour avec un repas, formulés sans vitamine K. Si vous suivez un traitement, demandez conseil à votre médecin ou à votre pharmacien avant de choisir.",
      },
      {
        question: "Comment commander One-A-Day en Tunisie ?",
        answer:
          "Ajoutez la formule et la contenance voulues au panier si elles sont disponibles, puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "vitamines", name: "Multivitamines en comprimés et en gommes", url: "/vitamines" },
      { slug: "mineraux", name: "Minéraux vendus seuls", url: "/mineraux" },
      { slug: "sante-vitalite", name: "Le rayon santé et vitalité au complet", url: "/sante-vitalite" },
      { slug: "brands", name: "Comparer One-A-Day aux autres marques", url: "/brands" },
    ],
  },
  "perfect-sports": {
    metaTitle: "PERFECT Sports Tunisie | Diesel, Vegan Diesel, Ultra Fuel",
    metaDescription:
      "PERFECT Sports sur Protein.tn : Diesel Whey Isolate en 908 g et 2,27 kg, Vegan Diesel 700 g, Ultra Fuel 1,82 kg, iPrep, BCAA Hyper Clear et Creatine.",
    h1: "PERFECT Sports Tunisie : Diesel Whey Isolate, Vegan Diesel et Ultra Fuel",
    introHtml:
      "<p>Sur Protein.tn, <strong>PERFECT Sports</strong> compte 27 références, dont 18 pour une seule famille : <strong>Diesel, New Zealand Whey Isolate</strong>, classée au rayon whey isolate. Ces 18 références couvrent 13 arômes répartis entre un pot de 908 g et un grand pot de 2,27 kg, dont Mocha Cappuccino et deux saveurs bubble tea. Le reste de la gamme se range par usage : <strong>Vegan Diesel</strong> 700 g en trois arômes au rayon protéines végétales, <strong>Ultra Fuel, Grass-Fed Whey Protein</strong> 1,82 kg en Vanilla Ice Cream et Triple Chocolate au rayon whey protéine, puis trois produits d’entraînement : <strong>iPrep, Advanced Pre-Workout</strong> 300 g (Fruit Punch, Orange Gummy Bears), <strong>BCAA Hyper Clear</strong> 310 g (Peach Rings Candy) et <strong>Creatine</strong> 400 g sans arôme. Le choix se joue donc surtout entre trois protéines et, pour Diesel, entre deux tailles de pot ; la grille ci-dessus affiche le prix et la disponibilité actuels de chaque référence.</p>",
    howToChooseTitle: "Diesel, Ultra Fuel ou Vegan Diesel : quelle protéine PERFECT Sports ?",
    howToChooseBody:
      "<p>Les trois protéines de la marque se distinguent d’abord par leur source. Certaines de nos fiches reprennent le tableau nutritionnel de l’étiquette, mais les valeurs changent d’un arôme et d’un produit à l’autre : nous ne citons donc aucun chiffre par portion ici, et l’étiquette du pot reçu fait foi.</p><ul><li><strong>Diesel, New Zealand Whey Isolate</strong> : une whey isolate. Les ingrédients repris sur plusieurs de nos fiches 2,27 kg mentionnent un isolat de lactosérum de Nouvelle-Zélande édulcoré à l’extrait de stévia. Le pot de 908 g permet d’essayer un arôme, le grand pot offre le plus d’arômes.</li><li><strong>Ultra Fuel, Grass-Fed Whey Protein</strong> 1,82 kg : une whey à base de concentré de protéines de lactosérum, édulcorée au sucralose d’après les ingrédients repris sur nos deux fiches.</li><li><strong>Vegan Diesel</strong> 700 g : d’après nos fiches Vanilla Ice Cream et Chocolate Ice Dream, un mélange de cinq protéines végétales sans ingrédient laitier. La seconde signale toutefois un établissement qui traite aussi des produits laitiers.</li><li><strong>Creatine, iPrep et BCAA Hyper Clear</strong> : ils accompagnent une protéine sans la remplacer. Les fiches Creatine et iPrep renvoient à l’emballage d’origine pour la composition et le mode d’emploi.</li></ul><p>Diesel et Ultra Fuel contiennent du lait. Vérifiez toujours les allergènes sur l’étiquette et, pour l’iPrep, lisez la composition avant la première prise.</p>",
    faqs: [
      {
        question: "Quels produits PERFECT Sports sont vendus sur Protein.tn ?",
        answer:
          "Six familles, 27 références : Diesel, New Zealand Whey Isolate en 908 g et 2,27 kg, Vegan Diesel 700 g, Ultra Fuel, Grass-Fed Whey Protein 1,82 kg, iPrep, Advanced Pre-Workout 300 g, BCAA Hyper Clear 310 g et Creatine 400 g sans arôme. La grille de cette page affiche l’état réel de chaque référence.",
      },
      {
        question: "Diesel 908 g ou 2,27 kg : qu’est-ce qui change ?",
        answer:
          "Outre la taille du pot, l’éventail d’arômes. French Vanilla, Banana, Cookies 'n Cream, Chocolate Peanut Butter et Triple Rich Chocolate ont deux références chacun ; Salted Caramel et Milk Chocolate ne sont listés qu’en 908 g ; Chocolate, Strawberry, Pineapple Mango, Mocha Cappuccino et les deux bubble tea qu’en 2,27 kg. Nos fiches 908 g ne reprennent aucun tableau nutritionnel.",
      },
      {
        question: "Vegan Diesel contient-il du lait ?",
        answer:
          "Nos fiches Vanilla Ice Cream et Chocolate Ice Dream listent des protéines de fève, de pois, de riz complet germé, de graine de courge et de pomme de terre, sans ingrédient laitier ; leur lait de coco est végétal. La seconde signale toutefois un établissement qui traite aussi des produits laitiers (lactosérum), du sésame et du soja. En cas d’allergie au lait, lisez l’étiquette.",
      },
      {
        question: "Combien de protéines dans une portion de Diesel ou d’Ultra Fuel ?",
        answer:
          "Certaines fiches reprennent le tableau de l’étiquette, mais les valeurs changent d’un arôme à l’autre et la mesure n’est pas la même pour Diesel et pour Ultra Fuel. Nous n’avançons donc aucun chiffre général ici : la taille de la mesure, la teneur en protéines et le nombre de portions imprimés sur le pot que vous recevez font foi.",
      },
      {
        question: "Comment commander PERFECT Sports en Tunisie ?",
        answer:
          "Choisissez la référence, le format et l’arôme, ajoutez-les au panier s’ils sont disponibles, puis renseignez votre adresse. Protein.tn livre partout en Tunisie sous 24–72h selon la destination, avec paiement à la livraison. Le prix et la disponibilité affichés dans la grille de cette page sont les valeurs actuelles.",
      },
    ],
    relatedCategories: [
      { slug: "whey-isolate", name: "Comparer Diesel aux autres whey isolate", url: "/whey-isolate" },
      { slug: "proteines-vegetales", name: "Protéines végétales : comparer les mélanges", url: "/proteines-vegetales" },
      { slug: "whey-proteine", name: "Whey protéines : élargir la comparaison", url: "/whey-proteine" },
      { slug: "brands", name: "Comparer PERFECT Sports aux autres marques", url: "/brands" },
    ],
  },
});

export function getBrandSeoEntry(slug: string | undefined): BrandSeoEntry | null {
  if (!slug?.trim()) return null;
  return BRAND_SEO_CONFIG[slug.trim().toLowerCase()] ?? null;
}
