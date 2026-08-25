/*
 * ── A TRAILING-SLASH RULE IN THIS FILE CAN NEVER FIRE. MEASURED, NOT ASSUMED. ─────────────
 *
 * It is tempting to give every rule a `/x/` twin so `/x/` reaches its target in one hop instead
 * of two. It does not work, and this note exists so nobody spends the afternoon on it twice.
 *
 * With `trailingSlash: false` (the default) Next strips the trailing slash with its OWN 308
 * BEFORE consulting the redirects declared here. `/x/` is therefore answered by that
 * normalisation, and a `/x/` rule in this array is unreachable.
 *
 * Verified against the LIVE site on 11/08/2026 using twins hand-written here long before:
 * /shop/pack-3/, /shop/the-shadow-270g/ and /shop/xtend-bcaa-420g/ all answer
 * `308 -> <the same path without the slash>` — Next’s normalisation — never their own
 * destination. Twenty-four such twins were in this file and not one had ever fired.
 *
 * A generated version was added and reverted in the same session for exactly this reason: 186
 * rules that read as though they did something and provably did not. The claim that they removed
 * 44 redirect chains was wrong, and is corrected here rather than left standing.
 *
 * The extra hop is accepted. It is standard Next behaviour, Google follows it without complaint,
 * and the alternative — `skipTrailingSlashRedirect: true` — means owning slash normalisation for
 * every route on the site, a large risk to buy back one hop.
 *
 * The hand-written twins are left where they are: inert either way, and deleting them is churn in
 * a file where every line is a URL somebody may still link to.
 */

/** @type {() => import('next').Redirect[]} */
function buildRedirects() {
  const p = (source, destination) => ({ source, destination, permanent: true });

  return [
    // ── www → non-www (host-conditional, must stay first) ─────────────────
    {
      source: '/:path*',
      has: [{ type: 'host', value: 'www.protein.tn' }],
      destination: 'https://protein.tn/:path*',
      permanent: true,
    },

    /**
     * ── Partner vanity subdomains → apex + ?ref= ─────────────────────────
     *
     * `coach-ali.protein.tn/whey` → `protein.tn/whey?ref=coach-ali`
     *
     * Owner: "we can make it subdomain but point to same website, and the only thing change is
     * the sub is unique so from the sub I know the ref — it looks more pro." This delivers exactly
     * that: a partner hands out a subdomain, and the referral is carried without them ever seeing
     * a query string.
     *
     * IT REDIRECTS RATHER THAN SERVING THE SITE ON THE SUBDOMAIN, and that is not a shortcut —
     * serving would put a full, indexable copy of the entire catalogue on every partner hostname.
     * `robots.ts`, `sitemap` and `canonical.ts` all bake `https://protein.tn` at build time, so N
     * partners would mean N duplicate storefronts all pointing their canonicals at the apex while
     * Google crawled them anyway. For a site whose central problem is indexation, that is the last
     * thing to introduce. It would also fragment the Cloudflare cache once per partner, since the
     * cache key includes the hostname.
     *
     * 307, NOT 308. A permanent redirect is cached by the browser forever against that hostname,
     * so if a partner is ever renamed or removed, every device that visited keeps redirecting to
     * a dead code. Attribution links must stay revocable.
     *
     * The `:sub` pattern excludes `www` and `admin` by construction — `www` is matched by the rule
     * above and never reaches here, and `admin.protein.tn` resolves to the Laravel origin, not to
     * this app. The character class also refuses dots, so it cannot match a deeper label.
     *
     * NOTE: this rule is inert until wildcard DNS exists. See docs/PARTNER-SUBDOMAINS.md.
     */
    {
      source: '/:path*',
      has: [{ type: 'host', value: '(?<sub>[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?)\\.protein\\.tn' }],
      destination: 'https://protein.tn/:path*?ref=:sub',
      permanent: false,
    },

    // ── Locale prefix ─────────────────────────────────────────────────────
    p('/en', '/'),
    p('/en/', '/'),

    // ── Legacy alias ──────────────────────────────────────────────────────
    p('/about', '/qui-sommes-nous'),
    /*
     * /xmlrpc.php USED TO 308 HERE TO "/". That is the anti-pattern this whole file warns about
     * further down: Google documents a redirect to an irrelevant page as a SOFT 404, so the hop
     * was spent, the URL was never retired, and it simply moved from "Not found" to "Page with
     * redirect". The homepage is the most irrelevant possible destination for a WordPress XML-RPC
     * endpoint.
     *
     * It is now answered 410 by the `.php` rule in middleware.ts, alongside every other *.php path
     * on this origin — all of which were returning HTTP 500. Removing the rule here is what lets
     * middleware see it at all: next.config redirects run BEFORE middleware.
     */

    // ── Blog ──────────────────────────────────────────────────────────────
    p('/blogs', '/blog'),
    // Preserve the slug so each old /blogs/{slug} lands on its real article
    // /blog/{slug} instead of dumping everything on the blog index.
    p('/blogs/:slug*', '/blog/:slug*'),
    /*
     * ── RETIRED ARTICLES GO TO THE ARTICLE THAT REPLACED THEM, NOT TO THE INDEX ──────────────
     *
     * Each of these named a subject and was answered with the blog homepage. Google reads a
     * redirect to an unrelated page as a soft 404, so the hop was spent and nothing was earned —
     * and a reader who searched "what is whey protein" got a list of ninety posts to sift.
     *
     * Every destination below was verified 200 on 15/08/2026 and chosen for TOPIC, not for slug
     * similarity. /blog/whey-protein-en-tunisie is also the site's own striking-distance page —
     * 1,269 impressions at position 11.2 — so the equity from the retired URL lands where it can
     * still move something.
     */
    p('/blog/qu-est-ce-que-la-proteine-whey', '/blog/whey-protein-en-tunisie'),
    p('/nutrition-guide', '/blog/nutrition-guide-complet-pour-une-sante-optimale'),
    p('/programme-dentrainement-musculation', '/blog/equipez-vous-pour-la-performance-le-guide-complet-du-materiel-de-musculation-protein-tn'),
    p('/programme-dentrainement-musculation/', '/blog/equipez-vous-pour-la-performance-le-guide-complet-du-materiel-de-musculation-protein-tn'),

    // ── Static info pages ─────────────────────────────────────────────────
    //
    // /page/{slug} -> /{slug}. Same defect as the /category/* catch-all below: EVERY /page/ URL
    // was being sent to "Qui sommes-nous".
    //
    // Verified live before this change — /page/creatine-monohydrate-tunisie (698 impressions,
    // position 9.58 in Search Console), /page/proteine-tunisie (205), /page/politique-de-
    // remboursement and /page/politique-des-cookies ALL 308'd to the About Us page. Someone
    // searching for a refund policy was shown the company bio; someone searching creatine
    // monohydrate, from position 9, likewise.
    //
    // The identity mapping is right because the CMS page route IS /{slug} — app/(shop)/[slug]
    // resolves category, then brand, then CMS page. Confirmed: /creatine-monohydrate-tunisie and
    // /proteine-tunisie both return 200.
    //
    // A dead slug now 404s instead of landing on About Us. That is the correct outcome: Google
    // reads a redirect to an unrelated page as a soft 404 anyway, and a real 404 at least stops
    // the URL diluting a page it has nothing to do with.
    //
    // ── NUMERIC /page/N IS WORDPRESS PAGINATION, NOT A CMS PAGE ───────────────────────────
    // This rule has to come FIRST, because `/page/:slug` below would otherwise map `/page/24/?s=/`
    // to `/24?s=/` — a bare number at the root, which resolves to no category, no brand and no CMS
    // page, so it 404s. Measured over the Search Console exports on 11/08/2026, that accounted for
    // a large share of the redirects that landed on a dead page: every one looked handled and none
    // was.
    //
    // The real URLs are paginated PRODUCT SEARCH listings —
    // `/page/19/?s=Proteine&post_type=product&product_cat=0&product-page=4` — so /shop is the
    // honest destination: it is the same kind of page, and it exists.
    { source: '/page/:n(\\d+)', destination: '/shop', permanent: true },
    //
    // ── THE LEGAL PAGES HAVE A REAL HOME, AND `/page/:slug` WAS NOT SENDING THEM TO IT ────
    // Checked live on 11/08/2026: /page/a-propos 308s to /a-propos, which is 404, and
    // /page/cookies 308s to /cookies, which is 404. A redirect into a 404 is worse than a plain
    // 404 — Google follows the hop, still finds nothing, and the redirect is cacheable.
    //
    // Both destinations below were verified 200 before being written here.
    //
    // ── AND A BIGGER FINDING THIS ONLY PATCHES ────────────────────────────────────────────
    // src/app/(shop)/page/[slug]/page.tsx IS a real route for exactly these URLs, and it carries
    // its own slugMapping — cookies → politique-des-cookies, conditions-generales →
    // conditions-generale-de-ventes-protein.tn, mentions-legales, politique-de-remboursement — plus
    // a canonical that already points at the non-/page/ URL. next.config redirects run BEFORE the
    // filesystem, so `/page/:slug` below shadows that route entirely and it has never served a
    // request. Deleting the catch-all would let it work, and would also fix
    // /page/conditions-generales and /page/mentions-legales, whose CMS slugs this file cannot see.
    // That is left for a change that can be tested against the CMS rather than guessed at from
    // outside, because the same catch-all is what currently makes /page/creatine-monohydrate-tunisie
    // and /page/proteine-tunisie resolve (both 200, both real traffic in Search Console).
    p('/page/a-propos', '/qui-sommes-nous'),
    p('/page/cookies', '/politique-des-cookies'),
    { source: '/page/:slug', destination: '/:slug', permanent: true },
    // Anything deeper than one segment has no /{slug} equivalent — keep the old behaviour.
    p('/page/:path*', '/qui-sommes-nous'),
    p('/connexion', '/contact'),
    p('/connexion/', '/contact'),
    p('/contact-us', '/contact'),
    p('/contact-us/', '/contact'),

    // ── Products / shop (generic) ─────────────────────────────────────────
    // IMPORTANT: Do NOT add catch-alls for `/product/:path*` or `/products/:path*`
    // here. next.config redirects run BEFORE middleware and the filesystem routes,
    // so a catch-all would shadow the single-hop resolver pages
    // (app/product/[slug]/page.tsx and app/products/[id]/page.tsx) that 301 each
    // legacy product URL straight to its canonical /{sousCategorySlug}/{slug}.
    // A blanket redirect to /shop destroys every legacy product URL's link equity
    // and is the primary source of GSC's "page with redirect" + soft-404 buckets.
    // The bare `/product` and `/products` index paths (no slug) are safe to fold to /shop.
    p('/products', '/shop'),
    p('/produit', '/shop'),
    p('/product', '/shop'),
    p('/musculation-products', '/shop'),
    /*
     * ── THE CATCH-ALLS THAT USED TO LIVE HERE ARE GONE, AND THE COMMENT ABOVE SAYS WHY ─────
     *
     * The warning fourteen lines up — "a blanket redirect to /shop destroys every legacy product
     * URL's link equity and is the primary source of GSC's 'page with redirect' + soft-404
     * buckets" — was exactly right, and it was written above a block that then did it eleven more
     * times under other prefixes.
     *
     * `/produit/:path*`, `/produits/:path*`, `/musculation-products/:path*`, `/collections/:path*`
     * and `/produits-search/:path*` all pointed at a bare /shop. Middleware now resolves the last
     * segment of each to the real product or listing, and answers 410 when there is genuinely
     * nothing — see `retireLegacyPath` in src/middleware.ts.
     *
     * They had to be deleted rather than merely out-ranked: next.config redirects run BEFORE
     * middleware, so any rule left here wins and the resolver never runs. Measured by status code
     * on production 15/08/2026 — `p()` emits 308, middleware emits 301 — every legacy prefix
     * answered 308, i.e. every handler in middleware.ts for these paths was unreachable code.
     */

    // ── Flat product slugs (old URLs without category prefix) ─────────────
    p('/accessoires-rack-jx-fitness', '/musculation/accessoires-rack-jx-fitness'),
    /*
     * `/acides-amines` IS A REAL RAYON NOW — the rule that used to send it to /bcaa is gone.
     *
     * It was correct when written: `acides-amines` was a dead slug inherited from the old site, and
     * /bcaa was the nearest live page. It stopped being correct when the catalogue import added
     * `acides-amines` to config/catalog.php's classification rules, which made it a subcategory the
     * classifier assigns products to and which sous_categories therefore carries.
     *
     * The result was a page that could never be seen and a sitemap that contradicted itself: the
     * live sitemap advertises https://protein.tn/acides-amines while this file answered it with a
     * 308 to /bcaa. Submitting a URL for indexing and redirecting it away are opposite instructions,
     * and it is the one defect a full crawl of all 699 advertised URLs turned up.
     *
     * Not a duplicate of /bcaa: the classifier treats `acides-amines` and `bcaa` as separate rayons
     * (amino acids generally versus BCAA specifically), and both are in its slug list.
     *
     * Cross-checked at the time of this change: of the 45 subcategory slugs the classifier can
     * assign, this was the ONLY one shadowed by a root-level redirect. Worth re-running that check
     * whenever a rayon is added, because publication is now automatic and a shadowed rayon is
     * invisible rather than noisy.
     */
    p('/banc-de-musculation-developpe-incline', '/materiel-de-musculation'),
    p('/banc-reglable-mnd-fitness', '/materiel-de-musculation'),
    p('/bcaa-gluta-500g-scenit-nutrition', '/bcaa'),
    p('/beef-mass-plus-27kg-big-ramy-labs', '/proteine-de-boeuf/beef-mass-plus-27kg-big-ramy-labs'),
    p('/big-ramy-labs-beef-mass-gainer-4-9kg', '/big-ramy-labs'),
    p('/carbo-plus-1kg-universal', '/glucides/carbo-plus-1kg-universal'),
    p('/complements-alimentaires', '/proteines'),
    p('/creatine-300gr-challenger-nutrition', '/creatine/creatine-300gr-challenger-nutrition'),
    p('/deficit-calorique', '/perte-de-poids'),
    p('/eaa-bcaa-390gr-challenger-nutrition', '/bcaa'),
    p('/fat-burner', '/bruleurs-de-graisse'),
    p('/glutamine/', '/glutamine'),
    p('/gold-creatine-kevin-levrone-300-g', '/whey-isolate/gold-iso-2-kg-kevin-levrone'),
    p('/gold-l-carnitine-3000-500ml', '/bruleurs-de-graisse'),
    /* The brand exists and is served at /gold-s-gym (verified 200); the missing apostrophe in
       the old slug was sending it to the brand index instead. */
    p('/golds-gym', '/gold-s-gym'),
    p('/hack-squat-jx-fitness', '/musculation/hack-squat-jx-fitness'),
    p('/hydroxycut-hardcore-elite-100-caps-muscletech', '/bruleurs-de-graisse'),
    p('/isolat-de-whey', '/whey-isolate'),
    p('/king-real-preworkout-500gr-real-pharm-tunisie', '/pre-workout'),
    p('/les-complements-alimentaires', '/proteines'),
    p('/les-complements-alimentaires/', '/proteines'),
    p('/magnesium-bisglycinate-vitamine-b6-1422mg-weightworld', '/magnesium/magnesium-bisglycinate-vitamine-b6-1422mg-weightworld'),
    p('/mass-gainer', '/gainers-proteines'),
    p('/mass-gainer-zero-7kg-eric-favre', '/gainers-proteines'),
    p('/micronised-creatine-317g-tunisie-purete-99-meilleur-prix', '/creatine'),
    p('/omega-3-fish-oil-240-softgel-weightworld', '/omega-3'),
    p('/opti-men-150-tabs-optimum-nutrition', '/vitamines'),
    p('/opti-men-90-tabs-optimum-nutrition', '/vitamines'),
    p('/opti-women-120-caps-optimum-nutrition', '/vitamines/opti-women-120caps'),
    p('/opti-women-60-caps-optimum-nutrition', '/vitamines/opti-women-60caps'),
    p('/pack-gain-musculaire-rapide', '/gainers-proteines/pack-gain-musculaire-rapide'),
    p('/pack-premium-elite', '/whey-hydrolysee/pack-premium-elite'),
    p('/pack-ultimate-muscle', '/proteine-de-boeuf/pack-ultimate-muscle'),
    p('/pre-intra-post-workout', '/pre-workout'),
    p('/pre-intra-post-workout/', '/pre-workout'),
    p('/premium-v-bulk-27kg-victor-martinez', '/gainers-proteines/premium-v-bulk-5-5kg-victor-martinez'),
    p('/protein-vegan-1-5kg-eric-favre', '/proteines'),
    p('/proteine', '/proteines'),
    p('/proteine-de-caseine', '/proteines'),
    p('/proteine-whey', '/whey-proteine'),
    p('/serious-mass-5-45-kg-optimum-nutrition', '/gainers-proteines'),
    p('/serious-mass-5-45kg', '/gainers-proteines'),
    p('/squat-rack-jx-fitness', '/musculation/squat-rack-jx-fitness'),
    p('/support-pour-disques-de-musculation', '/musculation/support-pour-disques-de-musculation'),
    p('/vegan-vitamin-d3-k2-240-tablets-weightworld', '/proteines-vegetales'),
    p('/vitamin-c-1000-mg-90-tabs-gymbeam', '/vitamines'),
    p('/zinc-bisglycinate-400-comprimes-weightworld', '/zinc'),
    p('/zumub-omega-3-90-caps', '/omega-3'),
    // Old blog slug with encoded accent (é = %C3%A9)
    p('/quand-prendre-de-la-cr%C3%A9atine-le-guide-complet-pour-optimiser-vos-resultats-2025', '/blog/creatine-guide-complet-pour-ameliorer-vos-performances-sportives'),

    // ── Legacy category roots (from the GSC "Not found (404)" export) ─────
    // Old WooCommerce category slugs that changed name → current category. Destinations
    // verified against the live taxonomy. (Genuinely-removed products are left to 404.)
    // Broad whey aliases belong on the full commercial category, not the isolate-only subset.
    p('/whey', '/whey-proteine'),
    p('/whey-protein', '/whey-proteine'),
    p('/proteines-en-poudre', '/proteines'),
    p('/proteine-en-poudre', '/proteines'),
    p('/proteines-completes', '/proteines'),
    p('/proteines-pour-cheveux', '/beaute-cheveux'),
    p('/barre-de-proteinees', '/proteines'),
    p('/gainers-riches-en-proteines', '/gainers-proteines'),
    p('/gainers-haute-energie', '/gainers-proteines'),
    p('/carbohydrates', '/glucides'),
    // NOTE: 'materiel-de-musculation' is NOT a legacy alias — it is the real, current live
    // subcategory slug (Équipement → Matériel de musculation). A rule redirecting it to
    // /musculation used to live here; combined with the admin-managed /musculation →
    // /materiel-de-musculation redirect (Filament → Redirections), it formed an infinite
    // 301/308 loop on the real page. Never re-add a rule that redirects this slug away.
    p('/ceinture-de-musculation', '/materiel-de-musculation'),
    p('/gants-de-musculation-et-fitness', '/materiel-de-musculation'),
    p('/bandes-de-soutien-musculaire', '/materiel-de-musculation'),
    p('/shakers-et-bouteilles-sportives', '/accessoires'),
    p('/equipement-cardio-fitness', '/cardio-fitness'),
    p('/t-shirts-de-sport', '/vetements'),

    // ── /brand/:slug  (specific first → catch-all to /brands) ────────────
    p('/brand/BIOTECH-USA', '/biotech-usa'),
    p('/brand/BPI-SPORTS', '/bpi-sports'),
    p('/brand/CHALLENGER-NUTRITION', '/challenger-nutrition'),
    p('/brand/HX-NUTRITION', '/hx-nutrition'),
    p('/brand/MUSCLETECH', '/muscletech'),
    p('/brand/NUTREX-RESEARCH', '/nutrex-research'),
    p('/brand/OPTIMUM-NUTRITION', '/optimum-nutrition'),
    p('/brand/OSTROVIT', '/ostrovit'),
    p('/brand/REAL-PHARM', '/real-pharm'),
    p('/brand/ULTIMATE-NUTRITION', '/ultimate-nutrition'),
    p('/brand/UNIVERSAL-NUTRITION', '/universal-nutrition'),
    p('/brand/VICTOR-MARTINEZ', '/victor-martinez'),
    p('/brand/WILLIAM-BONAC', '/william-bonac'),
    p('/brand/YAVA-LABS', '/yava-labs'),
    /* `/brand/:path+` -> `/brands` sent all 105 legacy brand URLs to the brand INDEX, including
       the ones whose brand is still on the site: /brand/JX FITNESS/52, /brand/BIOTECH USA/6,
       /brand/OSTROVIT/9. Middleware slugifies the name, CHECKS it against the live brand list
       (util/taxonomySlugs.ts `isBrandSlug`) and 301s to the real brand page. */

    // ── /brands/:slug  (specific first → catch-all to /brands) ───────────
    p('/brands/big-ramy-labs', '/big-ramy-labs'),
    p('/brands/eric-favre', '/eric-favre'),
    p('/brands/hx-nutrition', '/hx-nutrition'),
    p('/brands/jx-fitness', '/jx-fitness'),
    p('/brands/mnd-fitness', '/mnd-fitness'),
    p('/brands/olimp-sport-nutrition', '/olimp-sport-nutrition'),
    p('/brands/ostrovit', '/ostrovit'),
    p('/brands/real-pharm', '/real-pharm'),
    p('/brands/scenit-nutrition', '/scenit-nutrition'),
    p('/brands/scivation', '/scivation'),

    // ── /categorie/:path* ─────────────────────────────────────────────────
    p('/categorie/acides-amines', '/acides-amines'),
    p('/categorie/complements-alimentaires', '/proteines'),
    p('/categorie/complements-d-entrainement', '/performance'),
    // Two paths that were landing on /shop now name the rayon they were actually about. A generic
    // catalogue page answers no query the visitor typed, and /shop already ranks poorly (position
    // 25.34) precisely because it is what everything gets dumped onto.
    p('/categorie/perte-de-poids', '/bruleurs-de-graisse'),
    p('/categorie/prise-de-masse', '/prise-de-masse'),
    p('/categorie/equipements-et-accessoires-sportifs', '/materiel-de-musculation'),
    p('/categorie/proteines', '/proteines'),
    p('/categorie/vetements-et-accessoires', '/vetements'),
    /* The catch-all here sent every unlisted /categorie/{x} to /proteines — not a hub but a
       SPECIFIC and usually wrong category, which is worse: a visitor asking for pre-workout got a
       page about protein powder, and Google got a redirect it reads as a soft 404. Resolved in
       middleware now; `pre-intra-and-post-workout` finds /pre-workout on a real token overlap
       instead of being hand-listed onto /shop. */

    // ── /categories/:path* ────────────────────────────────────────────────
    p('/categories/complements-d-entrainement', '/performance'),
    /* /categories/equipements-et-accessoires-sportifs went to /shop while the IDENTICAL slug two
       blocks up (/categorie/equipements-et-accessoires-sportifs) went to /materiel-de-musculation.
       One of the two was wrong on its face. Both resolve through middleware now. */

    // ── /category/:slug ───────────────────────────────────────────────────
    //
    // These legacy URLs ARE STILL RANKING and the catch-all was throwing them away.
    //
    // Search Console, last 3 months: /category/zma sits at position 2.97 with 21 clicks and landed
    // the visitor on the generic /shop catalogue. /category/creatine, position 14.32, 34 clicks —
    // same. Measured across every /category/* URL with impressions: 24 of 38 redirected to the
    // WRONG page, together carrying 1,643 impressions and 104 clicks a quarter. Google treats a
    // redirect to an irrelevant page as a soft 404, so the ranking those URLs still hold was being
    // spent on nothing.
    //
    // Almost all of them are simply /category/{slug} -> /{slug}: the slug is a real listing. Every
    // destination below was verified live (200, no further hop) before being written here. Where
    // the modern slug differs, the rule points at the FINAL target rather than chaining — several
    // old rules pointed at /musculation, which itself 301s to /materiel-de-musculation, so they
    // cost two hops to reach the right page.
    //
    // The catch-all stays last for genuinely unknown slugs. Keep this list in slug order.
    p('/category/749-packs', '/packs'),
    /* `/pack/packs` is a hard 404 and appears three times in the "Not found" export. There is no
       `/pack/*` route on this app — only `/packs` (the listing, verified 200) and `/pack-builder`
       — so the singular prefix is old-site vocabulary with nothing behind it. `:path*` rather than
       an exact rule because the export shows the same prefix with other tails, and every one of
       them means the packs listing. */
    p('/pack', '/packs'),
    p('/pack/:path*', '/packs'),
    p('/category/acides-amines', '/acides-amines'),
    p('/category/ashwagandha', '/ashwagandha'),
    p('/category/bandes-de-soutien-musculaire', '/materiel-de-musculation'),
    p('/category/bcaa', '/bcaa'),
    p('/category/beta-alanine', '/beta-alanine'),
    p('/category/boosters-hormonaux', '/boosters-hormonaux'),
    p('/category/carbohydrates', '/glucides'),
    p('/category/ceinture-de-musculation', '/materiel-de-musculation'),
    p('/category/citrulline', '/citrulline'),
    p('/category/cla', '/cla'),
    p('/category/collagene', '/collagene'),
    p('/category/complements-alimentaires', '/proteines'),
    p('/category/complements-d-entrainement', '/performance'),
    p('/category/creatine', '/creatine'),
    p('/category/eaa', '/eaa'),
    p('/category/equipement-cardio-fitness', '/cardio-fitness'),
    p('/category/equipements-et-accessoires-sportifs', '/equipement'),
    p('/category/fat-burner', '/bruleurs-de-graisse'),
    p('/category/gainer', '/gainers-proteines'),
    p('/category/gainers-haute-energie', '/gainers-proteines'),
    p('/category/gainers-riches-en-proteines', '/gainers-proteines'),
    p('/category/gants-de-musculation-et-fitness', '/materiel-de-musculation'),
    p('/category/glutamine', '/glutamine'),
    p('/category/hmb', '/hmb'),
    p('/category/isolat-de-whey', '/whey-isolate'),
    p('/category/l-arginine', '/l-arginine'),
    p('/category/l-carnitine', '/l-carnitine'),
    p('/category/materiel-de-musculation', '/materiel-de-musculation'),
    p('/category/omega-3', '/omega-3'),
    p('/category/pre-workout', '/pre-workout'),
    p('/category/prise-de-masse', '/prise-de-masse'),
    p('/category/proteine', '/proteines'),
    p('/category/proteine-de-boeuf', '/proteine-de-boeuf'),
    p('/category/proteine-whey', '/whey-isolate'),
    p('/category/proteines', '/proteines'),
    p('/category/proteines-pour-cheveux', '/beaute-cheveux'),
    p('/category/t-shirts-de-sport', '/vetements'),
    p('/category/tribulus', '/tribulus'),
    p('/category/vitamines', '/vitamines'),
    p('/category/whey-hydrolysee', '/whey-hydrolysee'),
    p('/category/zinc', '/zinc'),
    p('/category/zma', '/zma'),

    // ── /subcategories/:slug ──────────────────────────────────────────────
    p('/subcategories/acides-amines', '/acides-amines'),
    p('/subcategories/boosters-hormonaux', '/boosters-hormonaux'),
    p('/subcategories/bruleurs-de-graisse', '/bruleurs-de-graisse'),
    p('/subcategories/ceinture-de-musculation', '/materiel-de-musculation'),
    p('/subcategories/equipement-cardio-fitness', '/cardio-fitness'),
    p('/subcategories/fat-burner', '/bruleurs-de-graisse'),
    p('/subcategories/materiel-de-musculation', '/materiel-de-musculation'),
    p('/subcategories/proteine-whey', '/whey-isolate'),

    // ── /product-category/  (WordPress legacy) ────────────────────────────
    //
    // THE SINGLE-SEGMENT ONES, NAMED. Without these they fall to the
    // `/product-category/:path*` catch-all at the end of this block and land on /shop — the same
    // defect that was fixed for `/category/*`, where a URL ranking at position 2.97 was dropping
    // its visitor on a generic catalogue. Every path below is one Search Console has actually
    // reported, and every destination was verified 200 before being written here.
    p('/product-category/acides-amines', '/acides-amines'),
    p('/product-category/perte-de-poids', '/bruleurs-de-graisse'),
    p('/product-category/prise-de-masse', '/prise-de-masse'),
    p('/product-category/proteines', '/proteines'),
    p('/product-category/perte-de-poids/cla', '/cla'),
    p('/product-category/vetements-et-accessoires-de-musculation/ceinture-de-musculation-abdominal', '/materiel-de-musculation'),
    p('/product-category/acides-amines/vitamines', '/vitamines'),
    p('/product-category/acides-amines/vitamines/', '/vitamines'),
    p('/product-category/perte-de-poids/fat-burner', '/bruleurs-de-graisse'),
    p('/product-category/perte-de-poids/fat-burner/', '/bruleurs-de-graisse'),
    p('/product-category/perte-de-poids/l-carnitine', '/bruleurs-de-graisse'),
    p('/product-category/perte-de-poids/l-carnitine/', '/bruleurs-de-graisse'),
    p('/product-category/prise-de-masse/mass-gainer', '/gainers-proteines'),
    p('/product-category/prise-de-masse/mass-gainer/', '/gainers-proteines'),
    p('/product-category/proteines/proteine-de-boeuf', '/proteine-de-boeuf'),
    p('/product-category/proteines/proteine-de-boeuf/', '/proteine-de-boeuf'),
    p('/product-category/proteines/whey-isolate', '/whey-isolate'),
    p('/product-category/proteines/whey-isolate/', '/whey-isolate'),

    // ── /shop/:path  specific broken sub-paths (no catch-all — /shop is valid) ──
    /*
     * The two-segment `/shop/{slug}` -> `/shop` rules that were here are gone.
     *
     * middleware.ts already owns this exact shape: `resolveShopSlug` tries the full slug, retries
     * without a legacy `-N` suffix, checks the live taxonomy, and ends at `goneOrCategory` — a 301
     * to a category that shares a real token, or 410 Gone. Every rule here pre-empted that with a
     * redirect to the catalogue index, which is the soft-404 shape, and did it for products that
     * `bestCategoryForSlug` can place: `fish-oil-100-softgels` belongs on /omega-3, not on /shop.
     */
    p('/shop/citruargin-300-g', '/citrulline/citruargin-300-g-real-pharm'),
    p('/shop/citruargin-300-g/', '/citrulline/citruargin-300-g-real-pharm'),
    p('/shop/complements-alimentaires/acides-amines', '/acides-amines'),
    /* Both name a real rayon and both were answered with the catalogue index. Verified 200 on
       15/08/2026: /intra-workout is what "pendant l'entraînement" means, and /post-workout is
       what "récupération après entraînement" means. /recuperation-apres-entrainement itself is
       a 404, which is why the slug could not simply be stripped. */
    p('/shop/complements-d-entrainement/pendant-l-entrainement', '/intra-workout'),
    p('/shop/complements-d-entrainement/recuperation-apres-entrainement', '/post-workout'),
    p('/shop/equipements-et-accessoires-sportifs/bandes-de-soutien-musculaire', '/materiel-de-musculation'),
    p('/shop/equipements-et-accessoires-sportifs/ceinture-de-musculation', '/materiel-de-musculation'),
    p('/shop/equipements-et-accessoires-sportifs/equipement-cardio-fitness', '/cardio-fitness'),
    p('/shop/equipements-et-accessoires-sportifs/gants-de-musculation-et-fitness', '/materiel-de-musculation'),
    p('/shop/equipements-et-accessoires-sportifs/materiel-de-musculation', '/materiel-de-musculation'),
    p('/shop/perte-de-poids/fat-burner', '/bruleurs-de-graisse'),
    p('/shop/proteines/isolat-de-whey', '/whey-isolate'),
    p('/shop/proteines/proteine-whey', '/whey-isolate'),
    // NOTE: /shop/{cat}/{subcat}/{product} is handled by the nested-shop resolver in
    // src/middleware.ts, which resolves the LAST segment to the real product (one 301) or
    // returns 410. Do NOT re-add 4-segment /shop rules here — next.config redirects run BEFORE
    // middleware, so they shadow the resolver and dump the URL on /shop instead.
    p('/shop/xtend-bcaa-420g', '/bcaa/xtend-bcaa-420g'),
    p('/shop/xtend-bcaa-420g/', '/bcaa/xtend-bcaa-420g'),
    p('/shop/zma-pro-90-caps', '/zma/zma-pro-90-caps'),
    p('/shop/zma-pro-90-caps/', '/zma/zma-pro-90-caps'),

    /*
     * ── THE PRODUCT IS STILL SOLD; ONLY ITS SLUG MOVED ──────────────────────────────────────
     *
     * Every path below answered 410 on 17/08/2026 while the product it names was live, because
     * `bestCategoryForSlug` scores SHARED TOKENS and these slugs share none with any category
     * name: "opti-men-90-caps-optimum-nutrition" has no token in common with "Vitamines", so the
     * honest-gone branch fired for a product on the shelf.
     *
     * That relevance rule is right and is deliberately not being loosened — it is what stops
     * "monster-energy-drink" being dumped on a rayon it has nothing to do with. The cases it
     * cannot see are the ones where the SLUG was rewritten (caps→tabs, a missing hyphen, a
     * "-tunisie" suffix, a brand name dropped), and those are a finite hand-checked list rather
     * than a pattern. Each destination below was searched in the catalogue and verified 200 as
     * Googlebot before being written here.
     *
     * 410 is still the right answer for a product that is genuinely gone, and the ones that are
     * (monster-energy-drink, c4-energy-drink, show-time-v3-0-360g) are deliberately NOT listed.
     */
    p('/shop/king-real-preworkout-500gr-real-pharm', '/pre-workout/king-real-preworkout-500gr-real-pharm-tunisie'),
    p('/shop/opti-men-90-caps-optimum-nutrition', '/vitamines/opti-men-90tabs'),
    p('/shop/platinum-multivitamin-90-caps-muscletech', '/vitamines/platinum-multivitamin-90-tabs'),
    // "zam" is a typo for ZMA that the old site published and Google still crawls.
    p('/shop/zam-120-caps', '/zma/zma-120-caps'),
    // The hyphen went missing in the old slug: collagenvitamin-c → collagen-vitamin-c-400g.
    p('/shop/collagenvitamin-c', '/collagene/collagen-vitamin-c-400g'),
    p('/shop/animal-pak-30-packs-universal-nutrition', '/vitamines/animal-pak-30-packs'),
    p('/shop/animal-pak-44-packs-universal-nutrition', '/vitamines/animal-pak-44-packs'),
    p('/product/animal-pak/reviews', '/vitamines/animal-pak-30-packs'),
    p('/category/big-ramy-labs-iso-big-2kg', '/whey-isolate/iso-big-2-1kg-big-ramy-labs'),

    /*
     * ── THE PRODUCT IS GONE, BUT ITS RAYON IS A REAL ANSWER ─────────────────────────────────
     *
     * Not a hub dump: each destination is the specific rayon the dead product belonged to, which
     * is Google's documented guidance for a discontinued item. They are listed by hand for the
     * same reason as the block above — the token overlap that would find them automatically does
     * not exist ("ceinture-abdominale" shares nothing with "Matériel de Musculation"), and the
     * alternative is leaving a 410 on a URL that has an obvious home.
     *
     * "The Shadow" and "The Pump" are pre-workouts; "smart-shaker" is a shaker and shakers are in
     * Accessoires; "crea-core" is creatine; "tst-gh" is a testosterone booster; "iso-gro" is an
     * isolate. All six destinations verified 200 as Googlebot.
     */
    p('/shop/ceinture-abdominale', '/materiel-de-musculation'),
    p('/shop/the-pump-261gr-challenger-nutrition', '/pre-workout'),
    p('/products/the-shadow-270g/reviews', '/pre-workout'),
    p('/product/smart-shaker/reviews', '/accessoires'),
    p('/category/crea-core-250g-procell', '/creatine'),
    p('/category/vita-core-60-caps', '/vitamines'),
    p('/category/tst-gh-300-g-biotech-usa', '/boosters-hormonaux'),
    p('/category/iso-gro-usn-2kg', '/whey-isolate'),
    /* "Galvanize Aqua" is a discontinued line; the BRAND is live at /galvanize-chrome (verified
       200), which is the nearest page that still means something. The trailing hyphen is in the
       crawled URL itself — the old site truncated the slug — so both spellings are listed. */
    p('/shop/galvanize-aqua-', '/galvanize-chrome'),
    p('/product/galvanize-aqua-', '/galvanize-chrome'),
  ];
}

module.exports = buildRedirects;
