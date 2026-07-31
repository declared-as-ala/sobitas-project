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

    // ── Locale prefix ─────────────────────────────────────────────────────
    p('/en', '/'),
    p('/en/', '/'),

    // ── Legacy alias ──────────────────────────────────────────────────────
    p('/about', '/qui-sommes-nous'),
    p('/xmlrpc.php', '/'),

    // ── Blog ──────────────────────────────────────────────────────────────
    p('/blogs', '/blog'),
    // Preserve the slug so each old /blogs/{slug} lands on its real article
    // /blog/{slug} instead of dumping everything on the blog index.
    p('/blogs/:slug*', '/blog/:slug*'),
    p('/blog/qu-est-ce-que-la-proteine-whey', '/blog'),
    p('/nutrition-guide', '/blog'),
    p('/programme-dentrainement-musculation', '/blog'),
    p('/programme-dentrainement-musculation/', '/blog'),

    // ── Static info pages ─────────────────────────────────────────────────
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
    p('/produit/:path*', '/shop'),
    p('/product', '/shop'),
    p('/product-tag/:path*', '/shop'),
    p('/produits-search/:path*', '/shop'),
    p('/musculation-products', '/shop'),
    p('/musculation-products/:path*', '/shop'),
    p('/produits/:path*', '/shop'),
    p('/collections/:path*', '/shop'),

    // ── Flat product slugs (old URLs without category prefix) ─────────────
    p('/accessoires-rack-jx-fitness', '/musculation/accessoires-rack-jx-fitness'),
    p('/acides-amines', '/bcaa'),
    p('/banc-de-musculation-developpe-incline', '/musculation'),
    p('/banc-reglable-mnd-fitness', '/musculation'),
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
    p('/golds-gym', '/brands'),
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
    p('/proteine-whey', '/whey-isolate'),
    p('/serious-mass-5-45-kg-optimum-nutrition', '/gainers-proteines'),
    p('/serious-mass-5-45kg', '/gainers-proteines'),
    p('/squat-rack-jx-fitness', '/musculation/squat-rack-jx-fitness'),
    p('/support-pour-disques-de-musculation', '/musculation/support-pour-disques-de-musculation'),
    p('/vegan-vitamin-d3-k2-240-tablets-weightworld', '/proteines-vegetales'),
    p('/vitamin-c-1000-mg-90-tabs-gymbeam', '/vitamines'),
    p('/zinc-bisglycinate-400-comprimes-weightworld', '/zinc'),
    p('/zumub-omega-3-90-caps', '/omega-3'),
    // Old blog slug with encoded accent (é = %C3%A9)
    p('/quand-prendre-de-la-cr%C3%A9atine-le-guide-complet-pour-optimiser-vos-resultats-2025', '/blog'),

    // ── Legacy category roots (from the GSC "Not found (404)" export) ─────
    // Old WooCommerce category slugs that changed name → current category. Destinations
    // verified against the live taxonomy. (Genuinely-removed products are left to 404.)
    p('/whey-protein', '/whey-isolate'),
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
    p('/ceinture-de-musculation', '/musculation'),
    p('/gants-de-musculation-et-fitness', '/musculation'),
    p('/bandes-de-soutien-musculaire', '/musculation'),
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
    { source: '/brand/:path+', destination: '/brands', permanent: true },

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
    { source: '/brands/:path+', destination: '/brands', permanent: true },

    // ── /categorie/:path* ─────────────────────────────────────────────────
    p('/categorie/acides-amines', '/bcaa'),
    p('/categorie/complements-alimentaires', '/proteines'),
    p('/categorie/complements-d-entrainement', '/performance'),
    p('/categorie/equipements-et-accessoires-sportifs', '/shop'),
    p('/categorie/pre-intra-and-post-workout', '/shop'),
    p('/categorie/proteines', '/proteines'),
    p('/categorie/vetements-et-accessoires', '/vetements'),
    p('/categorie/:path*', '/proteines'),

    // ── /categories/:path* ────────────────────────────────────────────────
    p('/categories/complements-d-entrainement', '/performance'),
    p('/categories/equipements-et-accessoires-sportifs', '/shop'),
    p('/categories/:path*', '/shop'),

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
    p('/category/acides-amines', '/bcaa'),
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
    p('/category/:path*', '/shop'),

    // ── /subcategories/:slug ──────────────────────────────────────────────
    p('/subcategories/acides-amines', '/bcaa'),
    p('/subcategories/boosters-hormonaux', '/boosters-hormonaux'),
    p('/subcategories/bruleurs-de-graisse', '/bruleurs-de-graisse'),
    p('/subcategories/ceinture-de-musculation', '/musculation'),
    p('/subcategories/equipement-cardio-fitness', '/cardio-fitness'),
    p('/subcategories/fat-burner', '/bruleurs-de-graisse'),
    p('/subcategories/materiel-de-musculation', '/musculation'),
    p('/subcategories/proteine-whey', '/whey-isolate'),
    p('/subcategories/recuperation-apres-entrainement', '/shop'),
    p('/subcategories/:path*', '/shop'),

    // ── /product-category/  (WordPress legacy) ────────────────────────────
    p('/product-category/acides-amines/stimulants-hormonaux', '/shop'),
    p('/product-category/acides-amines/stimulants-hormonaux/', '/shop'),
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
    p('/product-category/:path*', '/shop'),

    // ── /shop/:path  specific broken sub-paths (no catch-all — /shop is valid) ──
    p('/shop/aakg-plus-120caps', '/shop'),
    p('/shop/boogieman-300-g-trec-nutrition', '/shop'),
    p('/shop/bulk-muscle-xl-68-kg', '/shop'),
    p('/shop/bulk-muscle-xl-68-kg/', '/shop'),
    p('/shop/cell-tech-creactor-120-servings-muscletech', '/shop'),
    p('/shop/citruargin-300-g', '/citrulline/citruargin-300-g-real-pharm'),
    p('/shop/citruargin-300-g/', '/citrulline/citruargin-300-g-real-pharm'),
    p('/shop/complements-alimentaires/acides-amines', '/bcaa'),
    p('/shop/complements-d-entrainement/pendant-l-entrainement', '/shop'),
    p('/shop/complements-d-entrainement/recuperation-apres-entrainement', '/shop'),
    p('/shop/crea-core-250g-procell', '/shop'),
    p('/shop/equipements-et-accessoires-sportifs/bandes-de-soutien-musculaire', '/musculation'),
    p('/shop/equipements-et-accessoires-sportifs/ceinture-de-musculation', '/musculation'),
    p('/shop/equipements-et-accessoires-sportifs/equipement-cardio-fitness', '/cardio-fitness'),
    p('/shop/equipements-et-accessoires-sportifs/gants-de-musculation-et-fitness', '/musculation'),
    p('/shop/equipements-et-accessoires-sportifs/materiel-de-musculation', '/musculation'),
    p('/shop/fish-oil-100-softgels', '/shop'),
    p('/shop/fish-oil-100-softgels/', '/shop'),
    p('/shop/hard', '/shop'),
    p('/shop/mutant-amino-300-tab-mutant', '/shop'),
    p('/shop/mutant-amino-300-tab-mutant/', '/shop'),
    p('/shop/pack-3', '/shop'),
    p('/shop/pack-3/', '/shop'),
    p('/shop/pack-4', '/shop'),
    p('/shop/pack-4/', '/shop'),
    p('/shop/perte-de-poids/fat-burner', '/bruleurs-de-graisse'),
    p('/shop/platinum-fish-oil-100-caps', '/shop'),
    p('/shop/platinum-fish-oil-100-caps/', '/shop'),
    p('/shop/proteines/isolat-de-whey', '/whey-isolate'),
    p('/shop/proteines/proteine-whey', '/whey-isolate'),
    // NOTE: /shop/{cat}/{subcat}/{product} is handled by the nested-shop resolver in
    // src/middleware.ts, which resolves the LAST segment to the real product (one 301) or
    // returns 410. Do NOT re-add 4-segment /shop rules here — next.config redirects run BEFORE
    // middleware, so they shadow the resolver and dump the URL on /shop instead.
    p('/shop/the-shadow-270g', '/shop'),
    p('/shop/the-shadow-270g/', '/shop'),
    p('/shop/xtend-bcaa-420g', '/bcaa/xtend-bcaa-420g'),
    p('/shop/xtend-bcaa-420g/', '/bcaa/xtend-bcaa-420g'),
    p('/shop/zma-pro-90-caps', '/zma/zma-pro-90-caps'),
    p('/shop/zma-pro-90-caps/', '/zma/zma-pro-90-caps'),
  ];
}

module.exports = buildRedirects;
