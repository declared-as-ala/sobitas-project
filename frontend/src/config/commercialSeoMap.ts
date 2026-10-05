/**
 * ONE KEYWORD FAMILY = ONE COMMERCIAL OWNER URL.
 *
 * This file is the single source of truth for *which page owns which commercial intent*. It is the
 * answer to the only question that matters when two of our own pages appear for the same query:
 * which one is supposed to win, and what is every other page's job.
 *
 * ── WHY IT EXISTS ────────────────────────────────────────────────────────────────────────────────
 * Measured on 22/09/2026 from Search Console (protein.tn/GSC-2026-09-22.md), page level, 28 days:
 *
 *   creatine tunisie        9 clicks — /blog/prix-de-la-creatine-en-tunisie 6 @27.3,
 *                                      /blog/creatine-tunisie 2 @18.5,  /creatine 0 @64
 *   whey protein tunisie   13 clicks — /blog/whey-proteine-pas-cher-tunisie 5 @13.9,
 *                                      /blog/whey-protein-en-tunisie 4 @12.5, /whey-proteine 1 @34.4
 *   protein tunisie       127 clicks — the HOMEPAGE takes 125 of them @5.5
 *   mass gainer tunisie     0 clicks — /mass-gainers @51, /prise-de-masse @54, /gainers-proteines @53
 *
 * The category pages are not losing to House Nutrition or NutriBeast. They are losing to our own
 * blog, and the gainer family is losing to itself three ways. That is what this map fixes.
 *
 * ── HOW IT IS USED ───────────────────────────────────────────────────────────────────────────────
 * `categoryAnchor()` reads `anchors` so every navigation surface names a destination the way people
 * search for it. The blog link injector and `blogSeoConfig` read `owner` so an in-body mention of
 * "mass gainer" always points at the family owner and never at a sibling.
 *
 * WHAT IS ENFORCED:
 * `scripts/check-commercial-intent-map.mjs` imports this map during every build. It fails when two
 * clusters claim one normalized keyword, two clusters declare the same owner, a supporting blog
 * does not link to its owner, a protected traffic winner is assigned a destructive action, or an
 * editorial link points at a redirect source. The map is therefore an executable contract, not
 * only a decision record.
 *
 * ── THE RULES THIS FILE ENCODES ──────────────────────────────────────────────────────────────────
 * 1. Exactly one `owner` per cluster. A keyword appears in exactly one cluster's `owns`.
 * 2. `supporting` pages answer a DIFFERENT (informational) question and link up to the owner.
 * 3. `conflicts` are pages that currently compete and must be retargeted — each carries the reason
 *    and the action, so the next person does not have to re-derive it.
 * 4. A page that EARNS CLICKS is never 301'd or noindexed to resolve a conflict. It gets retargeted.
 *    Consolidation is for pages with nothing to lose. See `protectedByTraffic`.
 * 5. Anchors vary. Twenty identical exact-match anchors is a footprint, not a strategy.
 */

export interface CommercialCluster {
  /** The one URL that must rank for `owns`. Everything else in the cluster serves it. */
  owner: string;
  /** Head terms this owner must win. Used by the guard to detect two owners claiming one term. */
  owns: string[];
  /** Long-tail the owner should also cover, naturally, in copy or in a real UI label. */
  secondary: string[];
  /** Informational URLs that support the owner. They link UP; the owner may link down. */
  supporting: string[];
  /** Pages that compete today, with the decided action. */
  conflicts: Array<{
    url: string;
    reason: string;
    action: 'retarget' | 'merge-301' | 'noindex' | 'canonicalize' | 'leave-earns-clicks';
  }>;
  /** Natural anchor variants. Rotate them; never ship one exact-match anchor everywhere. */
  anchors: string[];
}

/**
 * URLs with measured clicks in the 22/09/2026 export. These are never 301'd, noindexed or stripped
 * to resolve a cannibalisation conflict — they get retargeted instead. Checked by the guard script.
 */
export const protectedByTraffic: Record<string, string> = {
  '/': 'homepage — 125 of 127 clicks on "protein tunisie" @5.5, 22 of 28 on "proteine tunisie"',
  '/blog/prix-de-la-creatine-en-tunisie': '6 clicks @27.3 on "creatine tunisie" (28 d)',
  '/blog/creatine-tunisie': '2 clicks @18.5 on "creatine tunisie" (28 d)',
  '/blog/whey-proteine-pas-cher-tunisie': '5 clicks @13.9 on "whey protein tunisie" (28 d)',
  '/blog/whey-protein-en-tunisie': '4 clicks @12.5 on "whey protein tunisie" (28 d)',
  '/blog/mass-gainer-prix-tunisie-guide-complet-pour-2025': '23 clicks (28 d), @4.6 on "serious mass tunisie"',
  '/optimum-nutrition': '47 clicks / 1,614 impressions (28 d) — the 3rd best page on the site',
  '/mass-gainers': 'pos 32.2 and every click-earning gainer PDP lives under /mass-gainers/',
  // Added 22/09/2026 from the same export, for the amino, health and gear families resolved below.
  '/acides-amines': '4 clicks / 42 impressions @10.67 (28 d) — the amino hub already converts',
  '/eaa': '3 clicks @7.94 (28 d), 10 clicks @12.89 (3 m) — best CTR of the amino family',
  '/collagene': '10 clicks / 146 impressions @19.55 (28 d), 18 clicks (3 m) — best health page',
  '/vitamines': '10 clicks / 95 impressions @19.29 (28 d)',
  '/omega-3': '4 clicks / 196 impressions @27.15 (28 d)',
  '/mineraux': '2 clicks @22.93 (28 d)',
  '/magnesium': '1 click / 130 impressions @20.71 (28 d), 6 clicks (3 m)',
  '/zinc': '1 click @30.86 (28 d)',
  '/materiel-de-musculation': '5 clicks / 77 impressions @10.13 (28 d), 11 clicks @9.87 (3 m) — the gear family’s best page',
  '/accessoires': '1 click @12.15 (28 d), 3 clicks (3 m) — and it holds the earning gear PDPs (dip-belt 42 clicks / 3 m, bandes-de-poignet 18, gant-de-fitness 9)',
  /*
   * ── ADDED 23/09/2026: SIX URLs THIS LIST WAS ALREADY MEANT TO COVER, AND DID NOT ─────────────
   * Measured with a Googlebot UA against production: all six answered 200 and `noindex, follow`
   * while earning search traffic. The cause was `nothingBuyableHere` in the category route, which
   * noindexes any listing whose first page is entirely out of stock and never consulted this map —
   * /mineraux was ALREADY a key here and was noindexed anyway, which is what proved the list was
   * decorative at that call site rather than enforced.
   *
   * Out-of-stock PRODUCTS stay indexable, per Google's own guidance, because they hold long-tail
   * and stock returns. A CATEGORY of them with measured demand is the same case: /barres-proteinees
   * sits on page one at 10.3 with 157 impressions, and noindexing it trades a page-one listing for
   * nothing. Demand outranks stock here; `publishedTotal === 0` — nothing published at all — is a
   * different rule and still noindexes, correctly.
   */
  '/caseine': '5 clicks / 30 impressions @13.4 (28 d) — was noindexed by the out-of-stock rule',
  '/barres-proteinees': '157 impressions @10.3 (28 d) — page one, zero clicks only because it was noindex',
  '/hmb': '1 click / 23 impressions @7.5 (28 d) — best position in the amino family after /eaa',
  '/articulations': '1 click (28 d)',
  '/cla': '1 click / 2 impressions @22.0 (28 d)',
  '/glucides': '4 clicks / 126 impressions @55.1 (28 d) — the surviving half of the duplicate carbohydrate shelf',
  // Added 05/10/2026 from GSC 28 d to 05/10/2026 (page level): the three head-term owners, now climbing. Insurance against the zero-stock noindex rule in the category route.
  '/proteines': '11 clicks / 124 impressions @13.7 on "proteine tunisie" (28 d to 05/10/2026, prev 28 d @47.6); live #7 on google.com gl=tn the same day',
  '/whey-proteine': '9 clicks / 162 impressions @13.8 on "whey protein tunisie" (28 d to 05/10/2026; @34.4 on 22/09)',
  '/creatine': '7 clicks / 18 impressions @28.6 on "creatine tunisie" (28 d to 05/10/2026; @64 on 22/09)',
};

export const commercialSeoMap: Record<string, CommercialCluster> = {
  creatine: {
    owner: '/creatine',
    owns: ['creatine tunisie', 'créatine tunisie', 'creatine monohydrate tunisie', 'créatine monohydrate tunisie', 'creatine prix tunisie', 'créatine prix tunisie'],
    secondary: ['creatine monohydrate', 'créatine micronisée', 'creapure tunisie', 'creatine 300g tunisie', 'creatine 500g tunisie', 'creatine 1kg tunisie', 'creatine optimum nutrition tunisie', 'acheter creatine tunisie'],
    supporting: [
      '/blog/creatine-a-quoi-ca-sert-et-pourquoi-en-prendre',
      '/blog/creatine-monohydrate-tunisie-guide-d-achat-bienfaits-et-meilleures-marques',
      '/blog/prix-de-la-creatine-en-tunisie',
      '/blog/ou-acheter-de-la-creatine-en-tunisie',
      '/blog/creatine-tunisie',
      '/blog/creatine-tunisie-tout-ce-que-vous-devez-savoir',
      '/blog/creatine-tunisie-guide-complet-bienfaits-et-meilleures-marques-disponibles',
      '/blog/creatine-tunisie-le-guide-complet-pour-choisir-le-meilleur-complement-et-optimiser-vos-resultats',
      '/blog/creatine-tunisie-tout-savoir-sur-ce-complement-indispensable',
      '/blog/la-creatine-fait-elle-gonfler-ou-prendre-du-poids-chez-la-femme',
      '/blog/creatine-prix-en-tunisie-et-comment-choisir-le-meilleur-produit',
      '/blog/meilleur-creatine-pour-prise-de-masse',
      '/blog/ou-acheter-de-la-creatine-originale-en-tunisie-le-guide-complet',
      '/blog/quelle-est-la-meilleure-creatine-monohydrate-en-tunisie',
      '/blog/les-meilleures-marques-de-creatine-en-tunisie-comparatif-et-avis',
      '/blog/meilleure-creatine-2026-notre-guide-pour-bien-choisir',
      '/blog/meilleures-marques-de-creatine-en-tunisie',
      '/blog/creatine-prix-tunisie-guide-complet-des-meilleurs-produits-en-2025',
      '/blog/creatine-prix-tunisie-trouvez-la-meilleure-offre-pour-maximiser-vos-gains',
      '/blog/creatine-tunisie-la-meilleure-qualite-a-prix-imbattable-livraison-rapide-and-gratuite-sur-protein-tn',
      '/blog/ما هي الأطعمة التي تحتوي على الكرياتين؟',
      '/blog/ما هي فوائد وأضرار الكرياتين؟',
      '/blog/ما هو أفضل كرياتين في تونس؟',
      '/blog/كرياتين مونوهيدرات',
      '/blog/ما هو الكرياتين؟',
      '/blog/acheter-de-la-creatine-en-tunisie-conseils-pour-les-meilleurs-prix-et-offres',
      '/blog/creatine-et-musculation-en-tunisie-temoignages-et-avis-d-athletes',
      '/blog/comment-utiliser-la-creatine-en-tunisie-pour-maximiser-vos-performances',
      '/blog/guide-complet-sur-la-creatine-en-tunisie-tout-ce-que-vous-devez-savoir',
      '/blog/creatine-en-tunisie-guide-complet-pour-booster-vos-performances-protein-tn',
      '/blog/creatine-monohydrate-en-tunisie-avantages-effets-secondaires-dosages-protein-tn',
      '/blog/quamtrax-creatine-en-tunisie-comment-distinguer-le-faux-du-vrai-protein-tn',
    ],
    conflicts: [
      // 30/09/2026: the 28/09 retarget changed the title but not the URL or the « Prix … 2026 »
      // section; with 2 clicks in 3 months there was nothing to protect, so it is folded in.
      { url: '/creatine-monohydrate-tunisie', reason: 'Product-less CMS guide whose URL and price section duplicated the category intent — 301 to /creatine since 30/09/2026 (CMS row INACTIVE)', action: 'merge-301' },
      { url: '/blog/prix-de-la-creatine-en-tunisie', reason: 'holds the top slot for "creatine tunisie" with 6 clicks — retarget to price *comparison methodology*, keep the ranking, link down', action: 'leave-earns-clicks' },
      { url: '/blog/creatine-tunisie', reason: '2 clicks @18.5 — informational retarget only, never 301', action: 'leave-earns-clicks' },
    ],
    anchors: ['créatine en Tunisie', 'créatine monohydrate', 'notre sélection de créatine', 'acheter de la créatine en Tunisie', 'voir les créatines disponibles'],
  },

  whey: {
    owner: '/whey-proteine',
    owns: ['whey tunisie', 'whey protein tunisie', 'whey proteine tunisie', 'whey protéine tunisie', 'whey prix tunisie', 'whey protein prix tunisie'],
    secondary: ['whey concentrée', 'whey isolate tunisie', 'whey 2kg tunisie', 'whey protein 1kg prix tunisie', 'gold standard whey tunisie'],
    supporting: [
      '/blog/whey-proteine-pas-cher-tunisie',
      '/blog/les-avantages-de-la-whey-proteine-pour-les-athletes-tunisiens-guide-complet',
      '/blog/proteines-tunisiennes-tout-ce-que-vous-devez-savoir',
      '/blog/protein-the-essential-guide-to-its-benefits-sources-and-role-in-health',
      '/blog/whey-protein-et-entrainement-strategies-pour-des-gains-musculaires-optimaux-protein-tn',
      '/blog/whey-protein-gold-standard-la-reference-ultime-pour-les-sportifs-en-tunisie',
      // Arabic whey guides (28/09/2026, Google Tunisia hl=ar): 176 is #1 on "افضل بروتين في تونس" and #4 on
      // "بروتين تونس" and is cited by the AI Overview; none of the three linked a product or the category.
      '/blog/أفضل مكملات البروتين في تونس: كيف تختار المنتج المناسب لهدفك الرياضي؟',
      '/blog/أفضل وقت لتناول البروتين: قبل التمرين أم بعده؟',
      '/blog/كيف تختار بروتين مصل اللبن في تونس؟ الدليل الشامل من protein.tn',
    ],
    conflicts: [
      { url: '/blog/whey-protein-en-tunisie', reason: 'live title "PROTÉINE en Tunisie : Guide Achat 2026" fights the HOMEPAGE\'s head term, not just the category; it earns 4 clicks so retarget the title, keep the URL', action: 'leave-earns-clicks' },
      /*
       * ── ADDED 23/09/2026, AFTER THE FACT, ON PURPOSE ─────────────────────────────────────────
       * This URL is in `supporting` above AND in `protectedByTraffic`, and a pass on 23/09/2026
       * changed what it targets without recording anything here. A supporting page whose subject
       * moves silently is worse than one that was never listed: the next reader trusts the
       * `supporting` line and does not check the title. Hence this entry — the decision, the
       * baseline, and the action, so nobody re-derives it.
       *
       * WHAT MOVED. Live <title> and H1 read with a Googlebot UA on 23/09/2026 were both the bare
       * head term, "Whey Protéine Pas Cher Tunisie | Protéine Tunisie". blogSeoConfig now overlays
       * the headline "Whey pas chère : quel format choisir sans perdre en qualité", which keeps
       * "whey" for topicAlignedArticleHeadline and drops "Tunisie", so the page stops claiming
       * `whey protein tunisie` and `whey tunisie` — both of which belong to /whey-proteine, the
       * only URL in this cluster that can sell a pot. The URL, the body, the canonical and the
       * robots directives are untouched; this is a retarget, never a consolidation, because the
       * page earns clicks (rule 4).
       *
       * BASELINE TO JUDGE IT AGAINST IN FOUR WEEKS. Read 23/09/2026 from
       * protein.tn/2026-09-22-28d/Pages.csv (28 days, 2026-08-23 → 2026-09-19):
       *   /blog/whey-proteine-pas-cher-tunisie   13 clicks / 495 impressions / 2.63% / pos 14.09
       * and from the Queries.csv of the same export, site-wide:
       *   whey protein tunisie                   13 clicks / 346 impressions / 3.76% / pos 15.66
       *   whey tunisie                            0 clicks / 107 impressions /    0% / pos 15.82
       * The page↔query split for this URL (5 clicks @13.9 on `whey protein tunisie`) is the figure
       * already recorded in `protectedByTraffic` above; it comes from a filtered GSC view, not
       * from these two CSVs, so it is cited here as recorded rather than as re-measured.
       */
      { url: '/blog/whey-proteine-pas-cher-tunisie', reason: 'retargeted 23/09/2026 — title/H1 overlay only, URL and body kept. Its live title WAS the bare head term "Whey Protéine Pas Cher Tunisie" while /whey-proteine sat fourth on its own term; it now reads as a format guide and claims neither "whey protein tunisie" nor "whey tunisie". Baseline in the comment above: 13 clicks / 495 impressions @14.09 (28 d). Protected by traffic, so never 301d or noindexed', action: 'leave-earns-clicks' },
      { url: '/proteines', reason: 'the parent taxonomy hub — must cover the protein family without claiming "whey"', action: 'retarget' },
      { url: '/whey-isolate', reason: 'legitimate sub-type (3 clicks, pos 51) — keep, but it must not claim the generic "whey tunisie" head term', action: 'retarget' },
    ],
    anchors: ['whey protein en Tunisie', 'nos whey disponibles', 'comparer les whey protein', 'whey protéine au meilleur prix'],
  },

  /**
   * GAINER — decided by the owner on 22/09/2026 after the conflict was put to them explicitly.
   *
   * The written architecture first named /prise-de-masse. Three independent signals said otherwise
   * and the owner chose /mass-gainers:
   *   1. Search Console — /mass-gainers pos 32.2 vs /prise-de-masse pos 58.4 (26 positions).
   *   2. Every gainer PDP that earns clicks lives under /mass-gainers/ (serious-mass-2-7-kg 14
   *      clicks @9.5; hard-mass-gainer-7kg; levro-legendary; gain-bolic-6000).
   *   3. This repo already encodes the decision and GUARDS it: scripts/check-commercial-intent-map.mjs
   *      fails the build unless /mass-gainer, /serious-mass-* and /product-category/prise-de-masse/
   *      mass-gainer all redirect to /mass-gainers. Legacy equity was deliberately consolidated
   *      there, and naming a different owner would have meant unwinding those redirects — the exact
   *      "do not destroy existing SEO" rule the brief itself sets out.
   *
   * /prise-de-masse is therefore the parent GOAL hub (the objective: gainers + whey + creatine) and
   * owns "prise de masse tunisie"; /mass-gainers is the product-type page and owns the gainer head
   * terms. Nothing is redirected between them; the hub links down.
   */
  gainer: {
    owner: '/mass-gainers',
    owns: ['mass gainer tunisie', 'gainer tunisie', 'mass gainer prix tunisie', 'gainer prix tunisie'],
    secondary: ['gainer 5kg tunisie', 'gainer 7kg tunisie', 'serious mass tunisie', 'lean gainer tunisie', 'mass gainer musculation tunisie'],
    supporting: [
      '/prise-de-masse',
      '/gainers-proteines',
      '/blog/mass-gainer-prix-tunisie-guide-complet-pour-2025',
      '/blog/mass-gainer-prix-tunisie',
      '/blog/proteine-pour-prise-de-poids-tunisie-le-guide-ultime-pour-gagner-en-masse-musculaire',
    ],
    conflicts: [
      { url: '/prise-de-masse', reason: 'the parent GOAL hub. Keeps "prise de masse tunisie" (see the priseDeMasse cluster) and must not claim the gainer head terms; it links down to /mass-gainers', action: 'retarget' },
      { url: '/gainers-proteines', reason: '0 category clicks BUT its PDPs earn (thunder-gainer 12 clicks @5.1, premium-v-bulk 9 @6.5 over 3 m) — a 301 would orphan them; retarget to lean-gainer intent instead', action: 'retarget' },
      { url: '/blog/mass-gainer-prix-tunisie-guide-complet-pour-2025', reason: '23 clicks and pos 4.6 on "serious mass tunisie" — the single most valuable gainer URL we own', action: 'leave-earns-clicks' },
    ],
    anchors: ['mass gainer en Tunisie', 'nos mass gainers', 'comparer les gainers', 'gainers prise de masse'],
  },

  /** The goal hub above the gainer product type. Distinct intent: the objective, not the product. */
  priseDeMasse: {
    owner: '/prise-de-masse',
    owns: ['prise de masse tunisie', 'supplement prise de masse tunisie', 'complement prise de masse tunisie'],
    secondary: ['programme prise de masse', 'prise de masse rapide'],
    supporting: ['/mass-gainers', '/gainers-proteines', '/whey-proteine', '/creatine', '/blog/les-meilleurs-complements-alimentaires-pour-la-prise-de-masse-en-tunisie-2025'],
    conflicts: [],
    anchors: ['prise de masse en Tunisie', 'tout pour la prise de masse', 'compléments de prise de masse'],
  },

  preWorkout: {
    owner: '/pre-workout',
    // 05/10/2026: GSC 28 d "pre workout" 274 impr / 0 clicks @8.4, answered by one PDP (Born Rage @5.3, image/product block) while /pre-workout sits @57.7; the sitewide anchor now names the owner (categoryAnchor.ts).
    owns: ['pre workout tunisie', 'pre workout prix tunisie', 'booster tunisie', 'pre workout', 'preworkout'],
    secondary: ['c4 tunisie', 'pre workout sans caféine'],
    supporting: [],
    conflicts: [
      { url: '/performance', reason: 'parent hub — must not claim the pre-workout head term', action: 'retarget' },
    ],
    anchors: ['pre-workout en Tunisie', 'nos boosters pre-workout', 'voir les pre-workout disponibles'],
  },

  bcaa: {
    owner: '/bcaa',
    owns: ['bcaa tunisie', 'bcaa prix tunisie'],
    secondary: ['bcaa 2:1:1', 'bcaa poudre tunisie'],
    supporting: ['/blog/bcaa-ou-proteines-quel-complement-choisir-pour-vos-objectifs'],
    conflicts: [
      { url: '/acides-amines', reason: 'parent hub for the amino family — must not render the same title/H1/intro as /bcaa (it did until 22/09/2026)', action: 'retarget' },
      { url: '/eaa', reason: 'distinct product type — owns "eaa tunisie", must not claim BCAA terms', action: 'retarget' },
    ],
    anchors: ['BCAA en Tunisie', 'nos BCAA disponibles', 'acides aminés BCAA'],
  },

  /*
   * ── 05/10/2026: "PROTEINE TUNISIE" MOVES TO /proteines; /proteine-tunisie FOLDS INTO IT ──
   * GSC 28 d to 05/10/2026: /proteines 11 clicks / 124 impr @13.7 on "proteine tunisie" (prev @47.6),
   * live #7 on google.com gl=tn hl=fr; the homepage fell to @12.6 (prev @7.4) and is not in the live
   * top 20. The homepage keeps "protein tunisie" (128 clicks / 597 impr @5.9) and its brand title;
   * neither page is retitled. Both spellings move together (the guard folds accents).
   */
  protein: {
    owner: '/',
    owns: ['protein tunisie', 'complément sportif tunisie', 'nutrition sportive tunisie', 'supplement sportif tunisie'],
    secondary: ['compléments alimentaires tunisie', 'protein tn'],
    supporting: ['/qui-sommes-nous', '/proteine-sousse'],
    conflicts: [
      { url: '/proteines', reason: 'Owner of "proteine tunisie" since 05/10/2026 (proteinPowder cluster): live #7 on google.com gl=tn and 11 clicks / 124 impr @13.7 (28 d to 05/10, prev @47.6) while the homepage fell to @12.6 there. The homepage keeps "protein tunisie" and its brand title; neither page is retitled', action: 'leave-earns-clicks' },
      { url: '/proteine-tunisie', reason: 'Product-less CMS guide whose URL is the head term (0 clicks, @80–85 on protein(e) tunisie, 28 d to 05/10/2026); its « comment choisir » intent is answered by /proteines — 301 to /proteines since 05/10/2026 (CMS row INACTIVE)', action: 'merge-301' },
    ],
    anchors: ['protéines en Tunisie', 'tout le catalogue protéines', 'nos protéines'],
  },

  proteinPowder: {
    owner: '/proteines',
    owns: ['proteine tunisie', 'protéine tunisie', 'proteines en poudre tunisie', 'protéines en poudre tunisie', 'prix proteine tunisie', 'prix protéine tunisie', 'proteine musculation tunisie', 'protéine musculation tunisie'],
    secondary: ['protein powder tunisie', 'poudre protéinée tunisie', 'complément protéiné tunisie'],
    supporting: [
      '/blog/prix-proteine-tunisie-guide-complet-pour-trouver-les-meilleures-offres-en-2025',
      '/blog/quel-est-le-prix-de-la-proteine-en-tunisie',
      '/blog/proteines-tunisie',
      '/blog/acheter-proteine-en-ligne-tunisie-guide-pour-les-meilleurs-prix-et-complements',
      '/blog/les-meilleurs-complements-proteines-en-tunisie-pour-2025-guide-complet',
    ],
    conflicts: [],
    anchors: ['protéines en poudre en Tunisie', 'comparer les protéines du catalogue', 'notre rayon protéines'],
  },

  /* ══ AMINO FAMILY ════════════════════════════════════════════════════════════════════════════
   * Added 22/09/2026. Live titles measured the same day:
   *   /acides-amines  "Acides Aminés Tunisie : EAA, BCAA, Glutamine"   4 clicks / 42 impr @10.67
   *   /eaa            "EAA Tunisie : Acides Aminés Essentiels"         3 clicks @7.94
   *   /bcaa           "BCAA Tunisie : Acides Aminés dès 70 DT"         0 clicks @12.69
   *   /glutamine      —                                               0 clicks @17.77
   * The hub names all three children in its own <title>, and /bcaa names the hub back. Both
   * directions of the same fight. The hub keeps the family phrase; each child keeps its own.
   */
  amino: {
    owner: '/acides-amines',
    owns: ['acides amines tunisie', 'acides aminés tunisie', 'acide amine tunisie', 'acide aminé tunisie', 'acides amines musculation tunisie', 'acides aminés musculation tunisie'],
    secondary: ['quel acide aminé choisir', 'acides aminés en poudre', 'acides aminés gélules'],
    supporting: ['/bcaa', '/eaa', '/glutamine', '/citrulline', '/l-arginine', '/beta-alanine', '/blog/eaa-vs-bcaa-le-match-nul'],
    conflicts: [
      { url: '/acides-amines', reason: 'the hub\'s own title lists "EAA, BCAA, Glutamine" — three child head terms it must not claim. It describes the CHOICE between the families instead and links down', action: 'retarget' },
      { url: '/bcaa', reason: 'live title "BCAA Tunisie : Acides Aminés dès 70 DT" claims the hub term "acides aminés" AND carries an unverified price. It keeps "bcaa tunisie" only', action: 'retarget' },
      { url: '/eaa', reason: 'earns 3 clicks @7.94 — keep the URL and the ranking, but the phrase it owns is "acides aminés ESSENTIELS", never the bare hub term', action: 'leave-earns-clicks' },
    ],
    anchors: ['acides aminés en Tunisie', 'la famille des acides aminés', 'quel acide aminé choisir'],
  },

  eaa: {
    owner: '/eaa',
    owns: ['eaa tunisie', 'acides amines essentiels tunisie', 'acides aminés essentiels tunisie', 'eaa prix tunisie'],
    secondary: ['eaa poudre tunisie', 'eaa ou bcaa', 'neuf acides aminés essentiels'],
    supporting: ['/acides-amines'],
    conflicts: [
      { url: '/bcaa', reason: 'BCAA are three of the nine essentials, so the two pages genuinely overlap — /eaa owns "essentiels", /bcaa owns the acronym, and neither claims the other in a title', action: 'retarget' },
    ],
    anchors: ['EAA en Tunisie', 'les neuf acides aminés essentiels', 'nos EAA disponibles'],
  },

  glutamine: {
    owner: '/glutamine',
    owns: ['glutamine tunisie', 'l-glutamine tunisie', 'glutamine prix tunisie'],
    secondary: ['glutamine poudre', 'glutamine récupération'],
    supporting: ['/acides-amines'],
    conflicts: [
      { url: '/acides-amines', reason: 'the hub names "Glutamine" in its <title>; the word belongs to this page', action: 'retarget' },
    ],
    anchors: ['glutamine en Tunisie', 'notre glutamine', 'L-glutamine'],
  },

  /* ══ HEALTH / WELLNESS FAMILY ════════════════════════════════════════════════════════════════
   * /sante-vitalite is a taxonomy hub with NO head term of its own: 1 click on 405 impressions
   * @8.36 (28 d) means it surfaces constantly for queries its children answer and converts on
   * almost none of them. "Santé vitalité" is a shelf name, not something anyone types, so `owns`
   * is deliberately empty rather than filled with an invented phrase. Its job is to route down.
   */
  health: {
    owner: '/sante-vitalite',
    owns: [],
    secondary: ['compléments santé tunisie', 'bien-être et vitalité'],
    supporting: ['/vitamines', '/mineraux', '/collagene', '/omega-3', '/magnesium', '/zinc', '/zma', '/articulations', '/antioxydants', '/beaute-cheveux', '/probiotiques', '/immunite', '/digestion', '/sommeil-stress'],
    conflicts: [],
    anchors: ['santé et vitalité', 'compléments santé', 'le rayon santé'],
  },

  vitamins: {
    owner: '/vitamines',
    owns: ['vitamines tunisie', 'vitamine tunisie', 'multivitamines tunisie', 'multivitamine tunisie', 'vitamines prix tunisie'],
    secondary: ['vitamine c tunisie', 'vitamine d tunisie', 'vitamine b12 tunisie', 'complexe vitamine b'],
    supporting: ['/sante-vitalite', '/mineraux'],
    conflicts: [
      { url: '/mineraux', reason: 'the shelf next door — both pages drifted toward a generic "vitamines et minéraux" title; each keeps its own noun', action: 'retarget' },
    ],
    anchors: ['vitamines en Tunisie', 'nos vitamines', 'multivitamines'],
  },

  minerals: {
    owner: '/mineraux',
    owns: ['mineraux tunisie', 'minéraux tunisie', 'complement mineraux tunisie', 'compléments minéraux tunisie'],
    secondary: ['calcium tunisie', 'fer tunisie', 'potassium tunisie'],
    supporting: ['/magnesium', '/zinc', '/zma', '/sante-vitalite'],
    conflicts: [
      { url: '/zma', reason: 'live title "ZMA Tunisie : Zinc Magnésium B6" reaches past this hub and straight onto two of its children', action: 'retarget' },
    ],
    anchors: ['minéraux en Tunisie', 'le rayon minéraux', 'nos compléments minéraux'],
  },

  magnesium: {
    owner: '/magnesium',
    owns: ['magnesium tunisie', 'magnésium tunisie', 'magnesium prix tunisie', 'magnésium prix tunisie'],
    secondary: ['bisglycinate de magnésium', 'magnésium marin', 'magnésium crampes'],
    supporting: ['/mineraux', '/sante-vitalite'],
    conflicts: [
      { url: '/zma', reason: '1 click on 130 impressions @20.71 here vs 1 click @8.00 there — /magnesium is the page with the audience to lose, so ZMA drops "Magnésium" from its title, not the reverse', action: 'retarget' },
    ],
    anchors: ['magnésium en Tunisie', 'notre magnésium', 'compléments de magnésium'],
  },

  zinc: {
    owner: '/zinc',
    owns: ['zinc tunisie', 'zinc prix tunisie', 'complement zinc tunisie', 'complément zinc tunisie'],
    secondary: ['zinc picolinate', 'zinc immunité', 'zinc testostérone'],
    supporting: ['/mineraux', '/sante-vitalite'],
    conflicts: [
      { url: '/zma', reason: 'same fight as /magnesium — the element page owns the element name', action: 'retarget' },
    ],
    anchors: ['zinc en Tunisie', 'notre zinc', 'compléments de zinc'],
  },

  zma: {
    owner: '/zma',
    owns: ['zma tunisie', 'zma prix tunisie'],
    // NOT owns: "zinc", "magnésium", "vitamine b6". ZMA is a named formula and it ranks on the
    // acronym (@8.00, the best position of the mineral family). Spelling out its three ingredients
    // in the title bought nothing and put it in front of two pages that earn on those exact words.
    secondary: ['zma musculation', 'zma sommeil', 'zma testostérone'],
    supporting: ['/mineraux', '/magnesium', '/zinc'],
    conflicts: [],
    anchors: ['ZMA en Tunisie', 'notre ZMA', 'ZMA musculation'],
  },

  collagen: {
    owner: '/collagene',
    owns: ['collagene tunisie', 'collagène tunisie', 'collagene prix tunisie', 'collagène prix tunisie'],
    secondary: ['collagène marin', 'peptides de collagène', 'collagène type 2', 'collagène peau'],
    supporting: ['/sante-vitalite', '/articulations', '/beaute-cheveux'],
    conflicts: [
      { url: '/articulations', reason: 'sells collagen too, but its intent is the JOINT problem, not the ingredient — it links to /collagene instead of naming it in its title', action: 'retarget' },
      { url: '/beaute-cheveux', reason: 'same ingredient, different promise (peau et cheveux). It stays on the benefit and links across', action: 'retarget' },
    ],
    anchors: ['collagène en Tunisie', 'notre collagène', 'peptides de collagène'],
  },

  omega3: {
    owner: '/omega-3',
    owns: ['omega 3 tunisie', 'oméga 3 tunisie', 'omega-3 tunisie', 'huile de poisson tunisie', 'omega 3 prix tunisie'],
    secondary: ['epa dha', 'oméga 3 gélules', 'omega 3 musculation'],
    supporting: [
      '/sante-vitalite',
      '/articulations',
      '/blog/omega-3-tunisie',
      '/blog/omega-3-tunisie-bienfaits-sources-et-ou-les-acheter-au-meilleur-prix',
      '/blog/omega-3-en-tunisie-bienfaits-sources-et-ou-les-acheter-protein-tn',
      '/blog/omega-3-prix-trouvez-les-meilleurs-omega-3-au-meilleur-prix-en-tunisie',
    ],
    conflicts: [],
    anchors: ['oméga 3 en Tunisie', 'nos oméga 3', 'huile de poisson EPA/DHA'],
  },

  /* ══ GEAR FAMILY ═════════════════════════════════════════════════════════════════════════════
   * Resolved 22/09/2026. FOUR listing routes exist and no more — /equipement, /accessoires,
   * /materiel-de-musculation, /cardio-fitness (sitemaps/listings.xml, fetched the same day). The
   * six other gear slugs that still have a content file (ceinture-de-musculation,
   * gants-de-musculation-et-fitness, bandes-de-soutien-musculaire, shakers-et-bouteilles-sportives,
   * t-shirts-de-sport, equipements-et-accessoires-sportifs, equipement-cardio-fitness) all 308 into
   * one of the four, so their files render nowhere. They are NOT in this map: a URL that cannot be
   * served cannot own a keyword.
   *
   * The three live children all promised "general fitness equipment" in their titles. The split
   * below follows where the products — and the clicks — actually are.
   */

  /**
   * The gear hub. 0 clicks on 51 impressions @11.39 (3 m): the phrase has almost no demand in TN,
   * so this page is a router, not a destination, and it owns only the bare parent phrase. Its live
   * title, "Équipement Sport Tunisie | Accessoires Musculation & Fitness", reaches down onto both
   * /accessoires and /materiel-de-musculation — the exact violation this round exists to remove.
   */
  gearHub: {
    owner: '/equipement',
    owns: ['equipement sport tunisie', 'équipement sport tunisie', 'equipement de sport tunisie', 'équipement de sport tunisie'],
    secondary: ['matériel de sport tunisie', 'équiper sa salle de sport'],
    supporting: ['/materiel-de-musculation', '/accessoires', '/cardio-fitness'],
    conflicts: [
      { url: '/equipement', reason: 'its own CMS title names "Accessoires" and "Musculation" — both child head terms. The hub must describe the choice between the three rayons and link down', action: 'retarget' },
    ],
    anchors: ['équipement de sport en Tunisie', 'tout l’équipement sportif', 'le rayon équipement'],
  },

  /** The family's best page: 5 clicks @10.13 (28 d), 11 clicks @9.87 (3 m). Protected by traffic. */
  gymEquipment: {
    owner: '/materiel-de-musculation',
    owns: ['materiel de musculation tunisie', 'matériel de musculation tunisie', 'machine de musculation tunisie', 'banc de musculation tunisie', 'home gym tunisie', 'materiel musculation prix tunisie'],
    secondary: ['barre olympique tunisie', 'disques de musculation tunisie', 'rack musculation tunisie', 'presse à cuisses tunisie', 'station multifonction tunisie', 'haltères tunisie'],
    supporting: [
      '/equipement',
      '/blog/materiel-de-musculation-maison-le-guide-ultime-pour-equiper-votre-espace-d-entrainement-a-domicile',
      '/blog/materiel-salle-de-sport-decouvrez-les-meilleurs-equipements-et-leurs-prix-en-tunisie',
      '/blog/materiel-de-musculation-tunisie-guide-d-achat-et-les-meilleurs-produits-pour-un-entrainement-efficace',
      '/blog/materiel-musculation-tunisie',
      '/blog/materiel-de-musculation-en-tunisie-ou-acheter-sur-tayara-et-pourquoi-choisir-protein-tn',
      '/blog/materiel-de-salle-de-sport-professionnel-en-tunisie-equipez-votre-salle-de-sport-avec-les-meilleurs-produits',
      '/blog/materiel-de-musculation-en-tunisie-quel-prix-pour-equiper-votre-espace-d-entrainement',
    ],
    conflicts: [
      { url: '/materiel-de-musculation', reason: 'its own H1 read "Matériel de Musculation Tunisie – Équipement Fitness", claiming the parent\'s term and /cardio-fitness\'s. Rewritten 22/09/2026 onto machines, bancs, barres et racks', action: 'retarget' },
      { url: '/accessoires', reason: 'gants, ceintures, sangles and bandes live THERE (every earning accessory PDP is /accessoires/*), so this page names them only to send the reader across', action: 'leave-earns-clicks' },
    ],
    anchors: ['matériel de musculation', 'équiper son home gym', 'machines et bancs de musculation'],
  },

  /**
   * Small gear. The category itself is modest (1 click @12.15, 28 d) but it holds the best-earning
   * gear PDPs on the site — /accessoires/dip-belt 42 clicks @7.97 (3 m), bandes-de-poignet 18,
   * bande-genoux 12, gant-de-fitness 9, protein-shaker-450ml 8, lifting-straps 7. That is where
   * every accessory head term belongs.
   */
  trainingAccessories: {
    owner: '/accessoires',
    owns: ['accessoires musculation tunisie', 'accessoires de musculation tunisie', 'accessoires sport tunisie', 'accessoires fitness tunisie'],
    secondary: ['shaker tunisie', 'gants de musculation tunisie', 'ceinture de musculation tunisie', 'straps tunisie', 'bandes de poignet tunisie', 'dip belt tunisie', 'bande genoux tunisie'],
    supporting: ['/equipement', '/materiel-de-musculation'],
    conflicts: [
      { url: '/materiel-de-musculation', reason: 'the old "Équipement Fitness" H1 overlapped the accessory intent; settled 22/09/2026 — heavy equipment here, small gear there', action: 'retarget' },
      // Route defect, reported not acted on this round: /ceinture-de-musculation,
      // /gants-de-musculation-et-fitness and /bandes-de-soutien-musculaire 308 to
      // /materiel-de-musculation, while every product behind those terms sits under /accessoires/.
      // The redirects point at the wrong parent. Changing them is a route change — out of scope.
    ],
    anchors: ['accessoires de musculation', 'shakers, gants et ceintures', 'le rayon accessoires'],
  },

  /**
   * 0 clicks and no row at all in the 28-day or 3-month page export — the category has no measured
   * demand. Its PDPs do: /cardio-fitness/tapis-roulant-professionnel-mnd-fitness 7 clicks @3.53
   * (3 m), ring-de-boxe 5, rameur-professionnel 1. So the demand is on the MACHINE names, which is
   * what this page should say, rather than on the generic "cardio fitness" its title carries today.
   */
  cardio: {
    owner: '/cardio-fitness',
    owns: ['tapis roulant tunisie', 'velo d appartement tunisie', 'vélo d\'appartement tunisie', 'rameur tunisie', 'velo elliptique tunisie', 'vélo elliptique tunisie'],
    secondary: ['tapis de course tunisie', 'cardio training tunisie', 'stepper tunisie', 'corde à sauter tunisie'],
    supporting: ['/equipement', '/blog/equipements-cardio-tunisie'],
    conflicts: [
      { url: '/cardio-fitness', reason: 'live title "Équipement Cardio & Fitness en Tunisie" leads on the parent\'s word ("équipement") for a page that ranks on machine names. Lead with tapis roulant / vélo / rameur instead', action: 'retarget' },
    ],
    anchors: ['cardio et fitness', 'tapis roulants et vélos', 'le rayon cardio'],
  },
};

/** Every owner URL, for the guard script and for sitemap/priority decisions. */
/* ── 29/09/2026 BLOG REFRESH: the blog side of every cluster is re-derived from the audit ──────────
 * Each rewritten post supports exactly the owner its opening link points to (BLOG_OWNERSHIP_2909);
 * a rewritten post with no commercial owner leaves every cluster; merged/retired posts leave too
 * (they now redirect or answer 410). Category and CMS URLs in `supporting` are untouched. */
/* BEGIN GENERATED BLOG REFRESH 2909 — written by the refresh assembler; do not hand-edit. */
const BLOG_OWNERSHIP_2909: Record<string, string> = {
 "/blog/whey-proteine-pure-concentre-de-lactoserum-pour-performance-musculaire-et-recuperation-optimale-protein-tn": "/whey-proteine",
 "/blog/quamtrax-creatine-en-tunisie-comment-distinguer-le-faux-du-vrai-protein-tn": "/creatine",
 "/blog/whey-protein-et-entrainement-strategies-pour-des-gains-musculaires-optimaux-protein-tn": "/whey-proteine",
 "/blog/proteine-whey-tunisie-le-guide-ultime-pour-choisir-la-proteine-qui-vous-convient-protein-tn": "/whey-proteine",
 "/blog/les-10-meilleurs-complements-alimentaires-pour-sportifs-en-tunisie": "/",
 "/blog/bcaa-ou-proteines-quel-complement-choisir-pour-vos-objectifs": "/bcaa",
 "/blog/proteine-de-mass-quelle-est-la-meilleure-proteine-pour-prendre-de-la-masse": "/prise-de-masse",
 "/blog/impact-whey-protein-de-myprotein-avis-avantages-et-mode-d-emploi": "/whey-proteine",
 "/blog/gold-standard-whey-d-optimum-nutrition-la-proteine-de-reference-pour-les-sportifs": "/whey-proteine",
 "/blog/serious-mass-d-optimum-nutrition-le-gainer-ideal-pour-une-prise-de-masse-rapide": "/mass-gainers",
 "/blog/regime-alimentaire-pour-la-prise-de-masse-le-guide-complet-pour-developper-votre-muscle-efficacement": "/prise-de-masse",
 "/blog/nutrition-sportive-le-guide-ultime-pour-ameliorer-vos-performances-sportives": "/",
 "/blog/effets-secondaires-de-la-creatine-risques-et-precautions-essentielles": "/creatine",
 "/blog/creatine-roles-bienfaits-et-utilisation-dans-le-sport": "/creatine",
 "/blog/creatine-vs-proteine-quel-complement-choisir-pour-la-musculation": "/creatine",
 "/blog/multivitamines-pour-sportifs-pourquoi-et-comment-les-choisir": "/vitamines",
 "/blog/bcaa-avantages-pourquoi-les-acides-amines-branches-sont-essentiels-pour-votre-entrainement": "/bcaa",
 "/blog/les-complements-alimentaires-proteines-mode-d-emploi": "/proteines",
 "/blog/acides-amines-tout-ce-que-vous-devez-savoir-pour-optimiser-votre-sante-et-vos-performances": "/acides-amines",
 "/blog/meilleure-parapharmacie-en-ligne-en-tunisie-ou-acheter-vos-produits-de-sante-et-bien-etre": "/sante-vitalite",
 "/blog/parapharmacie-moins-cher-en-tunisie-ou-trouver-les-meilleurs-prix": "/sante-vitalite",
 "/blog/creatine-tunisie-guide-complet-bienfaits-et-meilleures-marques-disponibles": "/creatine",
 "/blog/creatine-monohydrate-tunisie-guide-d-achat-bienfaits-et-meilleures-marques": "/creatine",
 "/blog/whey-proteine-danger-mythe-ou-realite-tout-ce-que-vous-devez-savoir": "/whey-proteine",
 "/blog/whey-protein-gold-standard-la-reference-ultime-pour-les-sportifs-en-tunisie": "/whey-proteine",
 "/blog/whey-proteine-c-est-quoi-tout-savoir-sur-cette-proteine-incontournable": "/whey-proteine",
 "/blog/whey-proteine-tunisie-guide-ultime-pour-choisir-la-meilleure-proteine": "/whey-proteine",
 "/blog/whey-proteine-prix-en-tunisie-comparatif-et-meilleurs-offres": "/whey-proteine",
 "/blog/omega-3-aliments-quels-sont-les-meilleurs-sources-pour-votre-sante": "/omega-3",
 "/blog/omega-3-c-est-quoi-et-pourquoi-sont-ils-essentiels-pour-votre-sante": "/omega-3",
 "/blog/omega-3-prix-trouvez-les-meilleurs-omega-3-au-meilleur-prix-en-tunisie": "/omega-3",
 "/blog/materiel-de-musculation-maison-le-guide-ultime-pour-equiper-votre-espace-d-entrainement-a-domicile": "/materiel-de-musculation",
 "/blog/materiel-de-musculation-en-tunisie-quel-prix-pour-equiper-votre-espace-d-entrainement": "/materiel-de-musculation",
 "/blog/materiel-de-musculation-en-tunisie-ou-acheter-sur-tayara-et-pourquoi-choisir-protein-tn": "/materiel-de-musculation",
 "/blog/materiel-salle-de-sport-decouvrez-les-meilleurs-equipements-et-leurs-prix-en-tunisie": "/materiel-de-musculation",
 "/blog/salle-de-sport-a-sousse-les-meilleures-options-pour-atteindre-vos-objectifs-fitness": "/accessoires",
 "/blog/salle-de-sport-en-tunisie-les-meilleurs-centres-de-fitness-pour-atteindre-vos-objectifs": "/accessoires",
 "/blog/creatine-prix-en-tunisie-et-comment-choisir-le-meilleur-produit": "/creatine",
 "/blog/creatine-effet-comment-la-creatine-ameliore-t-elle-vos-performances-et-votre-croissance-musculaire": "/creatine",
 "/blog/complement-alimentaire-en-tunisie-guide-complet-pour-une-meilleure-sante": "/",
 "/blog/complement-alimentaire-definition-bienfaits-et-guide-d-achat": "/sante-vitalite",
 "/blog/proteine-definition-bienfaits-et-guide-complet": "/proteines",
 "/blog/mass-gainer-tout-savoir-sur-ce-complement-pour-la-prise-de-masse": "/mass-gainers",
 "/blog/serious-mass-le-gainer-ultime-pour-une-prise-de-masse-rapide": "/mass-gainers",
 "/blog/guide-complet-des-machines-de-musculation-votre-allie-pour-une-transformation-physique": "/materiel-de-musculation",
 "/blog/creatine-en-tunisie-guide-complet-pour-booster-vos-performances-protein-tn": "/creatine",
 "/blog/omega-3-en-tunisie-bienfaits-sources-et-ou-les-acheter-protein-tn": "/omega-3",
 "/blog/collagene-en-poudre-recuperation-articulaire-et-performance-le-guide-complet": "/collagene",
 "/blog/creatine-tunisie-la-meilleure-qualite-a-prix-imbattable-livraison-rapide-and-gratuite-sur-protein-tn": "/creatine",
 "/blog/les-meilleures-marques-de-creatine-en-tunisie-comparatif-et-avis": "/creatine",
 "/blog/comment-utiliser-la-creatine-en-tunisie-pour-maximiser-vos-performances": "/creatine",
 "/blog/creatine-et-musculation-en-tunisie-temoignages-et-avis-d-athletes": "/creatine",
 "/blog/proteine-whey-tunisie-tout-ce-que-vous-devez-savoir-avant-d-acheter": "/whey-proteine",
 "/blog/les-meilleurs-complements-proteines-en-tunisie-pour-2025-guide-complet": "/proteines",
 "/blog/proteine-pour-prise-de-poids-tunisie-le-guide-ultime-pour-gagner-en-masse-musculaire": "/mass-gainers",
 "/blog/mass-gainer-prix-tunisie-guide-complet-pour-2025": "/mass-gainers",
 "/blog/whey-proteine-pas-cher-tunisie": "/whey-proteine",
 "/blog/materiel-musculation-tunisie": "/materiel-de-musculation",
 "/blog/proteines-tunisie": "/proteines",
 "/blog/creatine-tunisie": "/creatine",
 "/blog/omega-3-tunisie": "/omega-3",
 "/blog/equipements-cardio-tunisie": "/cardio-fitness",
 "/blog/prix-de-la-creatine-en-tunisie": "/creatine",
 "/blog/ou-acheter-de-la-creatine-en-tunisie": "/creatine",
 "/blog/proteine-whey-tunisie-guide-complet-2025": "/whey-proteine",
 "/blog/complements-alimentaires-tunisie": "/",
 "/blog/les-meilleurs-complements-alimentaires-pour-la-prise-de-masse-en-tunisie-2025": "/prise-de-masse",
 "/blog/proteine-en-poudre-guide-complet-pour-les-debutants": "/proteines",
 "/blog/meilleur-site-pour-acheter-des-proteines-en-tunisie-pourquoi-protein-tn-est-n-1": "/",
 "/blog/ou-acheter-de-la-creatine-originale-en-tunisie-le-guide-complet": "/creatine",
 "/blog/meilleurs-complements-pour-sportifs-protein-tn": "/",
 "/blog/tout-savoir-sur-les-complements-alimentaires-et-proteines-en-tunisie-protein-tn": "/",
 "/blog/proteines-tunisiennes-tout-ce-que-vous-devez-savoir": "/whey-proteine",
 "/blog/creatine-tunisie-tout-ce-que-vous-devez-savoir": "/creatine",
 "/blog/ما هو أفضل نوع من بروتين مصل اللبن؟": "/whey-proteine",
 "/blog/كيف تختار أفضل مكمل بروتين ليناسب أهدافك الرياضية؟": "/whey-proteine",
 "/blog/بناء العضلات للمبتدئين: برنامج تدريب وتغذية خطوة بخطوة": "/prise-de-masse",
 "/blog/أخطاء شائعة يرتكبها رواد قاعات الرياضة وتمنعهم من تحقيق نتائج حقيقية": "/accessoires",
 "/blog/نظام غذائي عالي البروتين لزيادة الكتلة العضلية بدون دهون": "/prise-de-masse",
 "/blog/ما هي المكملات الغذائية؟ الشرح الكامل للمبتدئين": "/",
 "/blog/فوائد المكملات الغذائية وأضرارها وكيف تستخدمها بحكمة": "/sante-vitalite",
 "/blog/كيف تختار المكمل الغذائي المناسب لهدفك الرياضي": "/",
 "/blog/أفضل وقت لتناول البروتين: قبل التمرين أم بعده؟": "/whey-proteine",
 "/blog/كيف تختار مكمل غذائي آمن وفعال؟ دليل للمستهلك العربي": "/proteines",
 "/blog/المكملات الغذائية والنساء: ما تحتاج معرفته كل امرأة": "/vitamines",
 "/blog/أفضل المكملات للوقاية من نقص الفيتامينات في الشتاء": "/vitamines",
 "/blog/ما هو أفضل بروتين طبيعي للجسم؟": "/whey-proteine",
 "/blog/هل تُغني المكملات الغذائية عن الطعام؟": "/vitamines",
 "/blog/أفضل 10 مصادر للبروتين تعزز بناء العضلات و صحة": "/proteines",
 "/blog/أفضل أنواع البروتين للعضلات": "/proteines",
 "/blog/le magnésium : la condition cachée de l’efficacité de la créatine": "/magnesium",
 "/blog/la-creatine-reglementee-securite-performance-et-utilisation-legale": "/creatine",
 "/blog/creatine-a-quoi-ca-sert-et-pourquoi-en-prendre": "/creatine",
 "/blog/meilleure-creatine-2026-notre-guide-pour-bien-choisir": "/creatine",
 "/blog/eaa-vs-bcaa-le-match-nul": "/acides-amines",
 "/blog/protein-pancakes": "/whey-proteine",
 "/blog/كرياتين مونوهيدرات": "/creatine",
 "/blog/ما هي فوائد وأضرار الكرياتين؟": "/creatine",
 "/blog/ما هو الكرياتين؟": "/creatine",
 "/blog/ما هو أفضل كرياتين في تونس؟": "/creatine",
 "/blog/ما هي الأطعمة التي تحتوي على الكرياتين؟": "/creatine",
 "/blog/quelle-proteine-pour-diabetique": "/proteines",
 "/blog/quel-est-le-prix-de-la-proteine-en-tunisie": "/proteines",
 "/blog/quels-sont-les-aliments-riches-en-proteines": "/proteines",
 "/blog/quelles-sont-les-meilleures-proteines": "/proteines",
 "/blog/quelles-proteines-pour-les-reins": "/proteines",
 "/blog/meilleure-proteine-whey-2026": "/whey-proteine",
 "/blog/meilleur-proteine-pour-maigrir": "/proteines",
 "/blog/meilleur-creatine-pour-prise-de-masse": "/creatine",
 "/blog/protein-whey-arabic-guide": "/whey-proteine",
 "/blog/la-creatine-peut-elle-vraiment-booster-vos-capacites-cerebrales": "/creatine",
 "/blog/meilleures-marques-de-creatine-en-tunisie": "/creatine",
 "/blog/quelle-est-la-meilleure-creatine-monohydrate-en-tunisie": "/creatine",
 "/blog/la-creatine-fait-elle-gonfler-ou-prendre-du-poids-chez-la-femme": "/creatine",
 "/blog/whey-protein-en-tunisie": "/whey-proteine"
};
const BLOG_REFRESHED_2909: string[] = [
 "acides-amines-tout-ce-que-vous-devez-savoir-pour-optimiser-votre-sante-et-vos-performances",
 "bcaa-avantages-pourquoi-les-acides-amines-branches-sont-essentiels-pour-votre-entrainement",
 "bcaa-ou-proteines-quel-complement-choisir-pour-vos-objectifs",
 "collagene-en-poudre-recuperation-articulaire-et-performance-le-guide-complet",
 "comment-maigrir-4-conseils-efficaces-pour-perdre-du-poids-rapidement-protein-tn",
 "comment-utiliser-la-creatine-en-tunisie-pour-maximiser-vos-performances",
 "complement-alimentaire-definition-bienfaits-et-guide-d-achat",
 "complement-alimentaire-en-tunisie-guide-complet-pour-une-meilleure-sante",
 "complement-alimentaire-pour-cheveux-comment-stimuler-la-croissance-et-preserver-la-sante-de-vos-cheveux",
 "complements-alimentaires-pour-la-perte-de-poids-ce-que-vous-devez-savoir",
 "complements-alimentaires-tunisie",
 "creatine-a-quoi-ca-sert-et-pourquoi-en-prendre",
 "creatine-effet-comment-la-creatine-ameliore-t-elle-vos-performances-et-votre-croissance-musculaire",
 "creatine-en-tunisie-guide-complet-pour-booster-vos-performances-protein-tn",
 "creatine-et-musculation-en-tunisie-temoignages-et-avis-d-athletes",
 "creatine-monohydrate-tunisie-guide-d-achat-bienfaits-et-meilleures-marques",
 "creatine-prix-en-tunisie-et-comment-choisir-le-meilleur-produit",
 "creatine-roles-bienfaits-et-utilisation-dans-le-sport",
 "creatine-tunisie",
 "creatine-tunisie-guide-complet-bienfaits-et-meilleures-marques-disponibles",
 "creatine-tunisie-la-meilleure-qualite-a-prix-imbattable-livraison-rapide-and-gratuite-sur-protein-tn",
 "creatine-tunisie-tout-ce-que-vous-devez-savoir",
 "creatine-vs-proteine-quel-complement-choisir-pour-la-musculation",
 "deficit-calorique-le-guide-ultime-pour-perdre-du-poids",
 "eaa-vs-bcaa-le-match-nul",
 "effets-secondaires-de-la-creatine-risques-et-precautions-essentielles",
 "energie-et-focus-les-meilleurs-nootropiques-naturels-pour-optimiser-la-performance-sportive",
 "equipements-cardio-tunisie",
 "gold-standard-whey-d-optimum-nutrition-la-proteine-de-reference-pour-les-sportifs",
 "guide-complet-des-machines-de-musculation-votre-allie-pour-une-transformation-physique",
 "impact-whey-protein-de-myprotein-avis-avantages-et-mode-d-emploi",
 "iso-100-de-dymatize-la-whey-isolate-ultime-pour-les-sportifs",
 "la-caseine-une-proteine-pro-inflammatoire",
 "la-creatine-fait-elle-gonfler-ou-prendre-du-poids-chez-la-femme",
 "la-creatine-peut-elle-vraiment-booster-vos-capacites-cerebrales",
 "la-creatine-reglementee-securite-performance-et-utilisation-legale",
 "le magnésium : la condition cachée de l’efficacité de la créatine",
 "les-10-meilleurs-complements-alimentaires-pour-sportifs-en-tunisie",
 "les-complements-alimentaires-proteines-mode-d-emploi",
 "les-meilleures-marques-de-creatine-en-tunisie-comparatif-et-avis",
 "les-meilleurs-bruleurs-de-graisse-disponibles-en-tunisie-comparatif-et-avis",
 "les-meilleurs-complements-alimentaires-pour-la-prise-de-masse-en-tunisie-2025",
 "les-meilleurs-complements-proteines-en-tunisie-pour-2025-guide-complet",
 "les-regimes-hyperproteines-pour-la-perte-de-poids-guide-complet-pour-bruler-les-graisses-efficacement",
 "mass-gainer-prix-tunisie-guide-complet-pour-2025",
 "mass-gainer-tout-savoir-sur-ce-complement-pour-la-prise-de-masse",
 "materiel-de-musculation-en-tunisie-ou-acheter-sur-tayara-et-pourquoi-choisir-protein-tn",
 "materiel-de-musculation-en-tunisie-quel-prix-pour-equiper-votre-espace-d-entrainement",
 "materiel-de-musculation-maison-le-guide-ultime-pour-equiper-votre-espace-d-entrainement-a-domicile",
 "materiel-musculation-tunisie",
 "materiel-salle-de-sport-decouvrez-les-meilleurs-equipements-et-leurs-prix-en-tunisie",
 "meilleur-creatine-pour-prise-de-masse",
 "meilleur-proteine-pour-maigrir",
 "meilleur-site-pour-acheter-des-proteines-en-tunisie-pourquoi-protein-tn-est-n-1",
 "meilleure-creatine-2026-notre-guide-pour-bien-choisir",
 "meilleure-parapharmacie-en-ligne-en-tunisie-ou-acheter-vos-produits-de-sante-et-bien-etre",
 "meilleure-proteine-whey-2026",
 "meilleures-marques-de-creatine-en-tunisie",
 "meilleurs-complements-pour-sportifs-protein-tn",
 "multivitamines-pour-sportifs-pourquoi-et-comment-les-choisir",
 "nutrition-sportive-le-guide-ultime-pour-ameliorer-vos-performances-sportives",
 "omega-3-aliments-quels-sont-les-meilleurs-sources-pour-votre-sante",
 "omega-3-c-est-quoi-et-pourquoi-sont-ils-essentiels-pour-votre-sante",
 "omega-3-en-tunisie-bienfaits-sources-et-ou-les-acheter-protein-tn",
 "omega-3-prix-trouvez-les-meilleurs-omega-3-au-meilleur-prix-en-tunisie",
 "omega-3-tunisie",
 "ou-acheter-de-la-creatine-en-tunisie",
 "ou-acheter-de-la-creatine-originale-en-tunisie-le-guide-complet",
 "parapharmacie-moins-cher-en-tunisie-ou-trouver-les-meilleurs-prix",
 "parapharmacie-naturelle-les-meilleurs-produits-de-sante-et-bien-etre-naturels-sur-protein-tn",
 "postbiotiques-et-sante-intestinale-pour-athletes-le-secret-d-une-performance-optimale",
 "prix-de-la-creatine-en-tunisie",
 "protein-pancakes",
 "protein-whey-arabic-guide",
 "proteine-de-cheveux-un-allie-essentiel-pour-des-cheveux-forts-et-sains",
 "proteine-de-mass-quelle-est-la-meilleure-proteine-pour-prendre-de-la-masse",
 "proteine-definition-bienfaits-et-guide-complet",
 "proteine-en-poudre-guide-complet-pour-les-debutants",
 "proteine-pour-cheveux-le-secret-d-une-chevelure-forte-et-brillante",
 "proteine-pour-prise-de-poids-tunisie-le-guide-ultime-pour-gagner-en-masse-musculaire",
 "proteine-vegetale-pourquoi-choisir-des-proteines-vegetales-pour-votre-sante-et-vos-performances",
 "proteine-whey-tunisie-guide-complet-2025",
 "proteine-whey-tunisie-le-guide-ultime-pour-choisir-la-proteine-qui-vous-convient-protein-tn",
 "proteine-whey-tunisie-tout-ce-que-vous-devez-savoir-avant-d-acheter",
 "proteines-tunisie",
 "proteines-tunisiennes-tout-ce-que-vous-devez-savoir",
 "proteines-vegetales-et-musculation-sont-elles-efficaces-pour-la-prise-de-masse",
 "proteines-vegetales-pour-sportifs-top-10-des-alternatives-en-2025-pour-performance-et-recuperation",
 "quamtrax-creatine-en-tunisie-comment-distinguer-le-faux-du-vrai-protein-tn",
 "quel-est-le-prix-de-la-proteine-en-tunisie",
 "quelle-est-la-meilleure-creatine-monohydrate-en-tunisie",
 "quelle-proteine-pour-diabetique",
 "quelles-proteines-pour-les-reins",
 "quelles-sont-les-meilleures-proteines",
 "quels-sont-les-aliments-riches-en-proteines",
 "regime-alimentaire-pour-la-prise-de-masse-le-guide-complet-pour-developper-votre-muscle-efficacement",
 "regime-keto-tout-savoir-sur-le-regime-cetogene-dit-keto-protein-tn",
 "salle-de-sport-a-sousse-les-meilleures-options-pour-atteindre-vos-objectifs-fitness",
 "salle-de-sport-en-tunisie-les-meilleurs-centres-de-fitness-pour-atteindre-vos-objectifs",
 "serious-mass-d-optimum-nutrition-le-gainer-ideal-pour-une-prise-de-masse-rapide",
 "serious-mass-le-gainer-ultime-pour-une-prise-de-masse-rapide",
 "soins-du-visage-guide-complet-pour-prendre-soin-de-votre-peau",
 "tout-savoir-sur-les-complements-alimentaires-et-proteines-en-tunisie-protein-tn",
 "whey-protein-en-tunisie",
 "whey-protein-et-entrainement-strategies-pour-des-gains-musculaires-optimaux-protein-tn",
 "whey-protein-gold-standard-la-reference-ultime-pour-les-sportifs-en-tunisie",
 "whey-protein-isolate-la-meilleure-proteine-pour-la-prise-de-muscle-et-la-definition",
 "whey-proteine-c-est-quoi-tout-savoir-sur-cette-proteine-incontournable",
 "whey-proteine-danger-mythe-ou-realite-tout-ce-que-vous-devez-savoir",
 "whey-proteine-pas-cher-tunisie",
 "whey-proteine-prix-en-tunisie-comparatif-et-meilleurs-offres",
 "whey-proteine-pure-concentre-de-lactoserum-pour-performance-musculaire-et-recuperation-optimale-protein-tn",
 "whey-proteine-tunisie-guide-ultime-pour-choisir-la-meilleure-proteine",
 "أخطاء شائعة يرتكبها رواد قاعات الرياضة وتمنعهم من تحقيق نتائج حقيقية",
 "أفضل 10 مصادر للبروتين تعزز بناء العضلات و صحة",
 "أفضل أنواع البروتين للعضلات",
 "أفضل المكملات للوقاية من نقص الفيتامينات في الشتاء",
 "أفضل مصادر البروتين النباتي وما أهميته",
 "أفضل وقت لتناول البروتين: قبل التمرين أم بعده؟",
 "الفرق بين بروتين whey و isolate و casein: أيهم الأفضل لك؟",
 "المكملات الغذائية والنساء: ما تحتاج معرفته كل امرأة",
 "بناء العضلات للمبتدئين: برنامج تدريب وتغذية خطوة بخطوة",
 "فوائد المكملات الغذائية وأضرارها وكيف تستخدمها بحكمة",
 "كرياتين مونوهيدرات",
 "كيف تختار أفضل مكمل بروتين ليناسب أهدافك الرياضية؟",
 "كيف تختار المكمل الغذائي المناسب لهدفك الرياضي",
 "كيف تختار مكمل غذائي آمن وفعال؟ دليل للمستهلك العربي",
 "ما هو أفضل بروتين طبيعي للجسم؟",
 "ما هو أفضل كرياتين في تونس؟",
 "ما هو أفضل نوع من بروتين مصل اللبن؟",
 "ما هو الكرياتين؟",
 "ما هي الأطعمة التي تحتوي على الكرياتين؟",
 "ما هي المكملات الغذائية؟ الشرح الكامل للمبتدئين",
 "ما هي فوائد وأضرار الكرياتين؟",
 "نظام غذائي عالي البروتين لزيادة الكتلة العضلية بدون دهون",
 "هل تُغني المكملات الغذائية عن الطعام؟"
];
const BLOG_RETIRED_2909: string[] = [
 "acheter-de-la-creatine-en-tunisie-conseils-pour-les-meilleurs-prix-et-offres",
 "acheter-proteine-en-ligne-tunisie-guide-pour-les-meilleurs-prix-et-complements",
 "comment-choisir-la-meilleure-proteine-pour-une-prise-de-masse-efficace",
 "complements-alimentaires-guide-complet-pour-ameliorer-votre-sante",
 "complements-alimentaires-le-guide-ultime-pour-une-utilisation-eclairee-protein-tn",
 "complements-alimentaires-parapharmacie-tout-savoir",
 "cosmetiques-bio-decouvrez-les-meilleurs-produits-naturels-pour-votre-peau",
 "creatine-boostez-vos-performances-et-votre-masse-musculaire-protein-tn",
 "creatine-danger-est-ce-que-la-creatine-est-risquee-pour-la-sante",
 "creatine-guide-complet-pour-ameliorer-vos-performances-sportives",
 "creatine-monohydrate-en-tunisie-avantages-effets-secondaires-dosages-protein-tn",
 "creatine-monohydrate-le-guide-complet-pour-une-performance-maximale",
 "creatine-prix-tunisie-guide-complet-des-meilleurs-produits-en-2025",
 "creatine-prix-tunisie-trouvez-la-meilleure-offre-pour-maximiser-vos-gains",
 "creatine-roles-et-bienfaits",
 "creatine-tout-ce-que-vous-devez-savoir-sur-ses-bienfaits-dosage-et-performance-sportive-protein-tn",
 "creatine-tunisie-le-guide-complet-pour-choisir-le-meilleur-complement-et-optimiser-vos-resultats",
 "creatine-tunisie-tout-savoir-sur-ce-complement-indispensable",
 "equipez-vous-au-top-le-guide-ultime-du-materiel-de-musculation-pour-atteindre-vos-objectifs-protein-tn",
 "equipez-vous-pour-la-performance-le-guide-complet-du-materiel-de-musculation-protein-tn",
 "guide-complet-des-complements-alimentaires-et-nutrition-sportive-protein-tn",
 "guide-complet-du-materiel-de-musculation-choisir-les-meilleurs-equipements-pour-vos-entrainements",
 "guide-complet-sur-la-creatine-en-tunisie-tout-ce-que-vous-devez-savoir",
 "guide-ultime-pour-une-salle-de-musculation-au-top-conseils-equipements-et-ambiance",
 "le-guide-ultime-pour-choisir-le-meilleur-materiel-de-musculation-en-2025",
 "les-avantages-de-la-creatine-pour-la-performance-et-la-musculation",
 "les-avantages-de-la-whey-proteine-pour-les-athletes-tunisiens-guide-complet",
 "les-bienfaits-de-la-creatine-monohydrate-pour-les-sportifs-tunisiens",
 "les-bienfaits-de-la-creatine-pour-la-musculation",
 "les-bienfaits-de-la-creatine-pour-la-musculation-et-la-performance",
 "les-bienfaits-des-omega-3-pourquoi-ajouter-des-omega-3-a-votre-alimentation",
 "les-effets-de-la-creatine-bienfaits-et-precautions",
 "les-meilleures-sources-de-proteines-animales-et-vegetales-a-integrer-protein-tn",
 "les-meilleurs-produits-minceur-pour-perdre-du-poids-rapidement-et-efficacement",
 "les-meilleurs-types-de-proteines-pour-la-musculation-guide-complet",
 "les-supplements-de-proteines-pour-les-sportifs-guide-complet-pour-optimiser-vos-performances",
 "mass-gainer-le-guide-ultime-pour-choisir-le-meilleur-complement-pour-la-prise-de-masse-musculaire",
 "mass-gainer-prix-tunisie",
 "materiel-de-musculation-guide-complet-pour-un-entrainement-efficace",
 "materiel-de-musculation-tunisie-guide-d-achat-et-les-meilleurs-produits-pour-un-entrainement-efficace",
 "materiel-de-salle-de-sport-professionnel-en-tunisie-equipez-votre-salle-de-sport-avec-les-meilleurs-produits",
 "nutrition-et-alimentation-les-bases-pour-une-vie-saine-et-active",
 "nutrition-guide-complet-pour-une-sante-optimale",
 "omega-3-bienfaits-pourquoi-ces-acides-gras-sont-ils-essentiels-a-votre-sante",
 "omega-3-les-bienfaits-incontournables-pour-la-sante-et-la-performance-sportive-protein-tn",
 "omega-3-tunisie-bienfaits-sources-et-ou-les-acheter-au-meilleur-prix",
 "pancakes-proteines",
 "parapharmacie-bio-guide-complet-pour-un-bien-etre-naturel",
 "parapharmacie-en-ligne-achetez-vos-produits-de-bien-etre-en-toute-serenite",
 "parapharmacie-tout-savoir-sur-les-produits-essentiels-pour-votre-bien-etre",
 "parapharmacie-tunisie-ou-acheter-en-ligne-et-en-magasin-a-tunis-sfax-sousse-monastir-bizerte",
 "perdre-du-poids-avec-la-whey-protein-un-guide-complet-pour-une-transformation-efficace-et-durable-protein-tn",
 "perte-de-poids-et-complements-alimentaires-guide-pour-maigrir-rapidement",
 "prix-proteine-tunisie-guide-complet-pour-trouver-les-meilleures-offres-en-2025",
 "produits-de-parapharmacie-guide-complet-pour-bien-choisir",
 "protein-the-essential-guide-to-its-benefits-sources-and-role-in-health",
 "protein-tn-votre-destination-de-confiance-pour-la-nutrition-sportive-et-les-complements-alimentaires-en-tunisie",
 "proteine-c-reactive-crp-definition-role-et-importance-pour-la-sante",
 "proteine-de-masse-quelle-est-la-meilleure-proteine-pour-une-prise-de-masse-en-musculation-protein-tn",
 "proteine-en-poudre-le-guide-ultime-pour-booster-vos-performances",
 "proteine-pour-cheveux-nourrissez-et-renforcez-votre-chevelure-protein-tn",
 "proteine-pour-la-musculation-guide-complet-pour-une-prise-de-masse-optimale",
 "proteine-whey-pourquoi-choisir-la-whey-protein-pour-votre-entrainement",
 "proteine-whey-tunisie-le-guide-ultime-pour-musculation-et-recuperation",
 "proteines-de-masse-questions-reponses-faq",
 "proteines-eco-responsables-zero-dechet-et-fabriquees-en-tunisie-l-avenir-de-la-nutrition-durable",
 "quand-prendre-de-la-creatine-le-guide-complet-pour-optimiser-vos-resultats",
 "quand-prendre-de-la-creatine-le-guide-complet-pour-optimiser-vos-resultats",
 "questions-reponses-complement-alimentaire",
 "salle-de-sport-guide-complet-pour-choisir-et-maximiser-votre-entrainement",
 "top-5-des-complements-alimentaires-essentiels-pour-la-musculation-en-tunisie",
 "tout-savoir-sur-la-creatine-questions-frequentes",
 "tout-savoir-sur-les-complements-de-creatine-benefices-et-utilisation",
 "whey-gold-standard-la-meilleure-proteine-en-2025",
 "whey-protein-pourquoi-la-gold-standard-100-whey-est-elle-la-meilleure",
 "whey-protein-questions-and-reponses-pour-tout-comprendre",
 "whey-protein-votre-alliee-incontournable-pour-la-performance-et-la-recuperation-protein-tn",
 "whey-proteine-guide-complet-pour-les-athletes-et-les-amateurs-de-fitness",
 "whey-proteine-le-guide-ultime-pour-optimiser-votre-prise-de-masse",
 "whey-proteine-tout-savoir-sur-la-meilleure-source-de-proteines-pour-la-musculation",
 "أفضل مكملات البروتين في تونس: كيف تختار المنتج المناسب لهدفك الرياضي؟",
 "أكثر الأخطاء شيوعًا عند استخدام المكملات الغذائية",
 "الفرق بين المكملات الغذائية والأدوية: تفسير واضح وسهل",
 "كيف تختار بروتين مصل اللبن في تونس؟ الدليل الشامل من protein.tn",
 "ما هي مصادر البروتين؟ دليل شامل لبناء العضلات وتحسين صحتك",
 "مصادر البروتين الطبيعية: ما هي؟",
 "هل المكملات الغذائية مفيدة للجميع؟ نصائح مهمة قبل الشراء",
 "هل المكملات تعوض الغذاء الطبيعي؟ رأي الخبراء"
];
/* END GENERATED BLOG REFRESH 2909 */
(function applyBlogRefresh2909() {
  const norm = (url: string) => {
    let u = url;
    try { u = decodeURIComponent(url); } catch { /* keep raw */ }
    return u.normalize('NFC').toLowerCase();
  };
  const retired = new Set(BLOG_RETIRED_2909.map((slug) => `/blog/${slug}`));
  const refreshed = new Set(BLOG_REFRESHED_2909.map((slug) => `/blog/${slug}`));
  const ownership = new Map(Object.entries(BLOG_OWNERSHIP_2909).map(([url, owner]) => [norm(url), owner]));
  const keep = (url: string, owner: string) => {
    const n = norm(url);
    if (!n.startsWith('/blog/')) return true;
    if (retired.has(n)) return false;
    if (refreshed.has(n)) return ownership.get(n) === owner;
    return true;
  };
  for (const cluster of Object.values(commercialSeoMap)) {
    cluster.supporting = cluster.supporting.filter((url) => keep(url, cluster.owner));
    cluster.conflicts = cluster.conflicts.filter((conflict) => keep(conflict.url, cluster.owner));
  }
  for (const [url, owner] of Object.entries(BLOG_OWNERSHIP_2909)) {
    const cluster = Object.values(commercialSeoMap).find((c) => c.owner === owner);
    if (!cluster) continue;
    const listed = [...cluster.supporting, ...cluster.conflicts.map((c) => c.url)].some((u) => norm(u) === norm(url));
    if (!listed) cluster.supporting.push(url);
  }
})();

export const commercialOwnerUrls: string[] = Object.values(commercialSeoMap).map((c) => c.owner);

/** The owner URL for a keyword, or null. Lowercased, accent-sensitive by design (French matters). */
export function ownerForKeyword(keyword: string): string | null {
  const k = keyword.trim().toLowerCase();
  for (const cluster of Object.values(commercialSeoMap)) {
    if (cluster.owns.some((t) => t.toLowerCase() === k)) return cluster.owner;
  }
  return null;
}

/**
 * The cluster a URL belongs to, whether as owner, supporting page or conflict.
 *
 * OWNERSHIP IS RESOLVED FIRST, across every cluster, before any supporting/conflict match. A URL
 * is routinely both: /materiel-de-musculation owns the gym-equipment terms AND is a supporting
 * page of the /equipement hub; /mass-gainers owns the gainer terms AND supports /prise-de-masse.
 * A single ordered pass returned whichever cluster happened to be declared first, so `anchorFor()`
 * — which only speaks for `role === 'owner'` — silently fell back to the caller's raw label for
 * pages that do own their family. Two passes make the answer independent of declaration order.
 */
export function clusterForUrl(url: string): { key: string; cluster: CommercialCluster; role: 'owner' | 'supporting' | 'conflict' } | null {
  const path = url.replace(/^https?:\/\/(?:www\.)?protein\.tn/i, '').split(/[?#]/, 1)[0].replace(/\/$/, '') || '/';
  for (const [key, cluster] of Object.entries(commercialSeoMap)) {
    if (cluster.owner === path) return { key, cluster, role: 'owner' };
  }
  for (const [key, cluster] of Object.entries(commercialSeoMap)) {
    if (cluster.supporting.includes(path)) return { key, cluster, role: 'supporting' };
    if (cluster.conflicts.some((c) => c.url === path)) return { key, cluster, role: 'conflict' };
  }
  return null;
}

/**
 * A varied anchor for a destination, chosen deterministically from `seed` so the same surface always
 * renders the same word (no hydration mismatch) while different surfaces differ.
 */
export function anchorFor(url: string, seed: string, fallback: string): string {
  const hit = clusterForUrl(url);
  if (!hit || hit.role !== 'owner' || hit.cluster.anchors.length === 0) return fallback;
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return hit.cluster.anchors[h % hit.cluster.anchors.length];
}
