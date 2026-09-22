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
 * "mass gainer" always points at the family owner and never at a sibling. `scripts/check-commercial-
 * intent-map.mjs` reads the whole thing and fails the build when two owners claim one keyword, when
 * an owner URL is not a live route, or when a `conflicts` entry has drifted back onto an owner term.
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

/** The cluster a URL belongs to, whether as owner, supporting page or conflict. */
export function clusterForUrl(url: string): { key: string; cluster: CommercialCluster; role: 'owner' | 'supporting' | 'conflict' } | null {
  const path = url.replace(/^https?:\/\/(?:www\.)?protein\.tn/i, '').split(/[?#]/, 1)[0].replace(/\/$/, '') || '/';
  for (const [key, cluster] of Object.entries(commercialSeoMap)) {
    if (cluster.owner === path) return { key, cluster, role: 'owner' };
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
