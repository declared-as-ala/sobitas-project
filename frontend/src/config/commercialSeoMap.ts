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
 * WHAT IS AND IS NOT ENFORCED, because an earlier draft of this comment overstated it:
 * `scripts/check-commercial-intent-map.mjs` does NOT read this file. It asserts five hard-coded
 * gainer redirects and that three content files do not link to the redirecting /mass-gainer — the
 * narrow guard it was written as, before this map existed. So the rules below are a decision
 * record that humans and agents follow, not a build-time contract. Until a guard reads it, a
 * duplicate `owns` entry will not fail CI; `scripts/check-category-seo-content.ts` catches the
 * symptom instead, by failing on a duplicate title or H1 across the content files.
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
};

export const commercialSeoMap: Record<string, CommercialCluster> = {
  creatine: {
    owner: '/creatine',
    owns: ['creatine tunisie', 'créatine tunisie', 'creatine monohydrate tunisie', 'créatine monohydrate tunisie', 'creatine prix tunisie', 'créatine prix tunisie'],
    secondary: ['creatine monohydrate', 'créatine micronisée', 'creapure tunisie', 'creatine 300g tunisie', 'creatine 500g tunisie', 'creatine 1kg tunisie', 'creatine optimum nutrition tunisie', 'acheter creatine tunisie'],
    supporting: [
      '/blog/quelle-est-la-meilleure-creatine-monohydrate-en-tunisie',
      '/blog/les-meilleures-marques-de-creatine-en-tunisie-comparatif-et-avis',
      '/blog/meilleure-creatine-2026-notre-guide-pour-bien-choisir',
    ],
    conflicts: [
      { url: '/creatine-monohydrate-tunisie', reason: 'CMS page, index,follow, title "Créatine Monohydrate en Tunisie : guide expert & prix 2026" — a near-duplicate of the category intent', action: 'retarget' },
      { url: '/blog/prix-de-la-creatine-en-tunisie', reason: 'holds the top slot for "creatine tunisie" with 6 clicks — retarget to price *comparison methodology*, keep the ranking, link down', action: 'leave-earns-clicks' },
      { url: '/blog/creatine-tunisie', reason: '2 clicks @18.5 — informational retarget only, never 301', action: 'leave-earns-clicks' },
    ],
    anchors: ['créatine en Tunisie', 'créatine monohydrate', 'notre sélection de créatine', 'acheter de la créatine en Tunisie', 'voir les créatines disponibles'],
  },

  whey: {
    owner: '/whey-proteine',
    owns: ['whey tunisie', 'whey protein tunisie', 'whey proteine tunisie', 'whey protéine tunisie', 'whey prix tunisie', 'whey protein prix tunisie'],
    secondary: ['whey concentrée', 'whey isolate tunisie', 'whey 2kg tunisie', 'whey protein 1kg prix tunisie', 'gold standard whey tunisie'],
    supporting: ['/blog/whey-proteine-pas-cher-tunisie', '/blog/les-avantages-de-la-whey-proteine-pour-les-athletes-tunisiens-guide-complet'],
    conflicts: [
      { url: '/blog/whey-protein-en-tunisie', reason: 'live title "PROTÉINE en Tunisie : Guide Achat 2026" fights the HOMEPAGE\'s head term, not just the category; it earns 4 clicks so retarget the title, keep the URL', action: 'leave-earns-clicks' },
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
    supporting: ['/prise-de-masse', '/gainers-proteines', '/blog/mass-gainer-prix-tunisie-guide-complet-pour-2025'],
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
    supporting: ['/mass-gainers', '/gainers-proteines', '/whey-proteine', '/creatine'],
    conflicts: [],
    anchors: ['prise de masse en Tunisie', 'tout pour la prise de masse', 'compléments de prise de masse'],
  },

  preWorkout: {
    owner: '/pre-workout',
    owns: ['pre workout tunisie', 'pre workout prix tunisie', 'booster tunisie'],
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
    supporting: ['/blog/eaa-vs-bcaa-le-match-nul', '/blog/bcaa-ou-proteines-quel-complement-choisir-pour-vos-objectifs'],
    conflicts: [
      { url: '/acides-amines', reason: 'parent hub for the amino family — must not render the same title/H1/intro as /bcaa (it did until 22/09/2026)', action: 'retarget' },
      { url: '/eaa', reason: 'distinct product type — owns "eaa tunisie", must not claim BCAA terms', action: 'retarget' },
    ],
    anchors: ['BCAA en Tunisie', 'nos BCAA disponibles', 'acides aminés BCAA'],
  },

  protein: {
    owner: '/',
    owns: ['proteine tunisie', 'protéine tunisie', 'protein tunisie', 'complément sportif tunisie', 'nutrition sportive tunisie', 'supplement sportif tunisie'],
    secondary: ['compléments alimentaires tunisie', 'protein tn'],
    supporting: ['/proteines', '/proteine-tunisie', '/qui-sommes-nous', '/proteine-sousse'],
    conflicts: [
      { url: '/proteines', reason: 'the catalogue hub. It must NOT carry a "Protéine Tunisie" head-term title — the homepage earns 125 clicks @5.5 there and /proteines sits at 35-39', action: 'retarget' },
      { url: '/proteine-tunisie', reason: 'already repositioned to "Comment choisir sa protéine ? Guide Tunisie" — informational, correct as-is', action: 'leave-earns-clicks' },
    ],
    anchors: ['protéines en Tunisie', 'tout le catalogue protéines', 'nos protéines'],
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
    supporting: ['/bcaa', '/eaa', '/glutamine', '/citrulline', '/l-arginine', '/beta-alanine'],
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
    supporting: ['/acides-amines', '/blog/eaa-vs-bcaa-le-match-nul'],
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
    supporting: ['/sante-vitalite', '/articulations'],
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
    supporting: ['/equipement', '/blog/materiel-de-musculation-maison-le-guide-ultime-pour-equiper-votre-espace-d-entrainement-a-domicile', '/blog/materiel-salle-de-sport-decouvrez-les-meilleurs-equipements-et-leurs-prix-en-tunisie'],
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
