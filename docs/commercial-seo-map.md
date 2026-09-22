# Commercial SEO map — cannibalisation, protein.tn

**Date:** 22/09/2026
**Data source:** the 22/09/2026 Search Console exports —
`protein.tn/GSC-2026-09-22.md` (page-level per-query breakdowns),
`protein.tn/2026-09-22-28d/{Pages,Queries}.csv` (23/08 → 19/09) and
`protein.tn/2026-09-22-3m/{Pages,Queries}.csv` (20/06 → 19/09).
The root `protein.tn/Pages.csv` and `Queries.csv` end 2026-07-29 and were **not** used.

**Scope:** cannibalisation only — pages of ours that compete with each other for the same
commercial query. Technical SEO (sitemaps, robots, schema, performance, metadata generation) is
deliberately out of scope, even where it was noticed.

## How to read every number in this document

- **A page position is real.** A row in `Pages.csv` is that URL's own average position.
- **A query position is an average** over *every* protein.tn URL that was shown for that query.
  `Queries.csv` position is never a page position. Where a page's position *on a specific query* is
  quoted, it comes from the page-level breakdown table in `GSC-2026-09-22.md`, and it is labelled.
- **"no rows"** means the URL is below the export cut-off (28d Pages stops at 5 impressions, 3m at
  12), not that it earned nothing.
- **Nothing here is estimated.** Every figure was read from one of the four files above.

## Rules this map enforces

1. **Protected by traffic.** A URL that earns clicks is never MERGE, REDIRECT or NOINDEX. Its action
   can only be KEEP, IMPROVE or RETARGET. See [Protected by traffic](#protected-by-traffic).
2. **One head term, one owner.** A term appears in exactly one cluster's `owns`.
3. **Conflicting URLs found** in the owner table = URLs in that cluster's table carrying a
   **non-KEEP** action.

---

## Owner table

| Cluster | Owner URL | Head terms it must win | Conflicting URLs found |
| --- | --- | --- | --- |
| Creatine | `/creatine` | creatine tunisie · créatine tunisie · creatine monohydrate tunisie · creatine prix tunisie | 3 recorded (cluster owned by the parallel workflow — see below) |
| Protein (head term) | `/` (homepage) | protein tunisie · proteine tunisie · protéine tunisie | 7 |
| Whey | `/whey-proteine` | whey tunisie · whey protein tunisie · whey proteine tunisie · whey prix tunisie | 9 |
| Mass gainer | `/mass-gainers` | mass gainer tunisie · gainer tunisie · mass gainer prix tunisie | 9 |
| Prise de masse (goal hub) | `/prise-de-masse` | prise de masse tunisie · supplement prise de masse tunisie | 6 |
| Pre-workout | `/pre-workout` | pre workout tunisie | 6 |
| BCAA | `/bcaa` | bcaa tunisie · bcaa prix tunisie | 5 |

---

## 1. Creatine — implementation in progress

> **Implementation in progress. See `SEO_AUDIT.md` and `frontend/src/config/commercialSeoMap.ts`.**
> This cluster is being implemented by a parallel workflow right now. The rows below are recorded
> from what is already decided in `commercialSeoMap.ts` plus the 22/09 exports, so this document is
> consistent with that work. **It was not re-derived and must not be re-litigated here.**

| URL | type | title | H1 | main keyword | intent | GSC (clicks/impr/pos) | competes with | action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/creatine` | category (owner) | — | — | creatine tunisie | commercial | 28d 2 / 204 / 22.23 · 3m 3 / 39 / 47.0 on the head term | its own two blogs, `/creatine-monohydrate-tunisie` | IMPROVE |
| `/blog/prix-de-la-creatine-en-tunisie` | blog | — | — | prix creatine tunisie | commercial | 28d 14 / 393 / 8.81 (page total); on "creatine tunisie" 6 / 13 / 27.3 | `/creatine` | KEEP (earns clicks) |
| `/blog/creatine-tunisie` | blog | — | — | creatine tunisie | commercial | 28d 2 / 81 / 29.42; on "creatine tunisie" 2 / 28 / 18.5 | `/creatine` | KEEP (earns clicks) |
| `/creatine-monohydrate-tunisie` | CMS page | "Créatine Monohydrate en Tunisie : guide expert & prix 2026" | — | creatine monohydrate tunisie | commercial | 28d 0 / 39 / 13.64 | `/creatine` | RETARGET |
| `/blog/les-meilleures-marques-de-creatine-en-tunisie-comparatif-et-avis` | blog | — | — | meilleures marques créatine | informational | 28d 10 / 193 / 5.99 | supporting | KEEP |
| `/blog/quelle-est-la-meilleure-creatine-monohydrate-en-tunisie` | blog | — | — | meilleure créatine monohydrate | informational | 28d 2 / 115 / 8.03 | supporting | KEEP |
| `/blog/meilleure-creatine-2026-notre-guide-pour-bien-choisir` | blog | — | — | meilleure créatine 2026 | informational | 28d 0 / 15 / 6.73 | supporting | KEEP |
| `/blog/meilleur-creatine-pour-prise-de-masse` | blog | — | — | meilleure créatine prise de masse | informational | 28d 0 / 17 / 13.24 · 3m 2 / 95 / 14.35 | creatine set, **not** the gainer hubs | KEEP |

- The shape of the problem is the same as whey's: on "creatine tunisie" (9 clicks / 164 impr, 28d)
  the owner `/creatine` sits at **64.0 with 0 clicks** while two of our blogs take all 9 clicks at
  27.3 and 18.5. The category is last among its own pages.
- `/blog/meilleur-creatine-pour-prise-de-masse` is the only URL where this cluster touches the
  gainer cluster. `blogSeoConfig` already injects a "mass gainer pour la prise de masse en Tunisie"
  anchor down to `/mass-gainers`, which is the correct direction. **No action from this batch.**
- `www.protein.tn/` takes 102 impressions at 6.9 on "creatine tunisie". That is the Google Business
  Profile website link, an owner action, not cannibalisation — recorded, not actioned.

---

## 2. Whey and Protein

Owner of the head term **protein/proteine tunisie** is the **homepage**. Owner of the whey family is
**`/whey-proteine`**. Both are settled; see [Settled decisions](#settled-decisions).

| URL | type | title | H1 | main keyword | intent | GSC (clicks/impr/pos) | competes with | action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | homepage | Protéine Tunisie \| Protein.tn, boutique à Sousse | Protéine Tunisie — Protein.tn, boutique à Sousse… | protein / proteine tunisie | commercial | 28d 508 / 5,580 / 8.26; on "protein tunisie" 125 / 608 / 5.5 | `/proteines`, `/proteine-tunisie`, 2 whey blogs, `/shop`, `/pure-protein` | **KEEP** |
| `/whey-proteine` | category (owner; `whey-protein.json` via alias, SERP owner) | Whey Protein Tunisie \| Prix, Marques & Comparatif | Whey protein en Tunisie : prix et marques | whey tunisie / whey protein tunisie | commercial | 28d 8 / 761 / 24.73 · 3m 12 / 1,169 / 31.13; on "whey protein tunisie" 1 / 25 / 34.4 | 2 whey blogs, `/whey-isolate`, `/proteines` | **IMPROVE** |
| `/proteines` | catalogue hub | Catalogue de protéines : types et formats | Catalogue de protéines : tous les types et formats | catalogue protéines | commercial | 28d 19 / 1,353 / 19.11 · 3m 38 / 3,209 / 25.23 | homepage, `/whey-proteine`, `/shop` | KEEP |
| `/proteine-tunisie` | CMS page | Comment choisir sa protéine ? Guide Tunisie | Comment choisir sa protéine ? Le guide | comment choisir sa protéine | informational | 28d 0 / 152 / 60.51 · 3m 2 / 684 / 56.9 | homepage, `/proteines` | KEEP |
| `/whey-isolate` | category | Whey Isolate Tunisie : Prix & Comparatif | Whey Isolate en Tunisie : prix, stock et comparatif | whey isolate tunisie | commercial | 28d 3 / 231 / 51.11 · 3m 17 / 927 / 52.3 | `/whey-proteine`, `/whey-hydrolysee` | **RETARGET** |
| `/caseine` | category | Caséine Tunisie \| Protéine Nuit & Micellaire | Caséine en Tunisie : protéine à digestion lente | caseine tunisie | commercial | 28d 5 / 30 / 13.37 · 3m 5 / 79 / 23.82 | nothing in cluster | KEEP |
| `/whey-hydrolysee` | category | Whey Hydrolysée Tunisie : Absorption Rapide | Whey Hydrolysée Tunisie – Absorption Ultra-Rapide | whey hydrolysee tunisie | commercial | 28d 2 / 107 / 9.11 · 3m 8 / 284 / 12.1 | sub-type of `/whey-proteine` | KEEP |
| `/proteines-vegetales` | category | Protéines Végétales Tunisie : Vegan dès 65 DT | Protéines Végétales Tunisie – Vegan & Sans Lactose | proteines vegetales tunisie | commercial | 28d 6 / 48 / 10.62 · 3m 15 / 148 / 14.55 | `/proteines` (parent) | KEEP |
| `/proteine-de-boeuf` | category | Protéine de Bœuf Tunisie : Beef Protein | Protéine de Bœuf Tunisie – **Alternative à la Whey** | proteine de boeuf tunisie | commercial | 28d 2 / 34 / 26.47 · 3m 10 / 154 / 20.27 | `/whey-proteine` (via the H1) | **IMPROVE** |
| `/proteines-multi-sources` | category (noindex,follow) | Protéines Multi-Sources Tunisie \| Blend Protéiné | Protéines Multi-Sources en Tunisie | blend proteine tunisie | commercial | 28d 1 / 3 / 9.00 · 3m 1 / 44 / 68.43 | cannot cannibalise — noindex | KEEP |
| `/barres-proteinees` | category | Protein Bar Chocolat Tunisie – Prix & Marques | Barres protéinées & protein bars en Tunisie | protein bar tunisie | commercial | 28d 0 / 157 / 10.32 | nothing in cluster | KEEP |
| `/pure-protein` | brand page (generic template) | Pure Protein Tunisie \| Compléments alimentaires | Produits Pure Protein | pure protein (brand) | commercial | 28d 2 / 94 / 79.16; on "protein tunisie" 0 / 12 / 89.7 | **homepage** | **RETARGET** |
| `/shop` | catalogue listing | Protéines & Compléments Alimentaires en Tunisie | Boutique — Protéines & Compléments Alimentaires… | proteines et complements tunisie | commercial | 28d 11 / 683 / 16.79 | `/proteines`, homepage | **RETARGET** |
| `/proteine-sousse` | local landing | Protéine à Sousse \| Whey, Créatine & Compléments | Protéine à Sousse — Whey, Créatine & Compléments | proteine sousse | commercial | 28d 6 / 484 / 18.68; "proteine sousse" 3 / 30 / 1.3 | nothing on the national term | KEEP |
| `/blog/whey-protein-en-tunisie` | blog (no headline override) | **Whey Proteine en Tunisie \| Protéine Tunisie** | Whey Proteine en Tunisie : est-ce vraiment le secret… | whey proteine tunisie **and** proteine tunisie | commercial | 28d 10 / 341 / 12.49 · 3m 45 / 1,896 / 10.55; on "proteine tunisie" 3 / 85 / 11.7 | **homepage** and `/whey-proteine` | **RETARGET** |
| `/blog/whey-proteine-pas-cher-tunisie` | blog (no headline override) | **Whey Protéine Pas Cher Tunisie \| Protéine Tunisie** | Whey Protéine Pas Cher Tunisie | whey pas cher / whey prix tunisie | commercial | 28d 13 / 495 / 14.09 · 3m 17 / 643 / 13.51; on "whey protein tunisie" 5 / 137 / 13.9 | `/whey-proteine`, homepage | **RETARGET** |
| `/blog/proteines-tunisie` | blog (no config entry) | Protéines Tunisie \| Protéine Tunisie | Protéines Tunisie | proteines tunisie | commercial | 28d 0 / 6 / 11.33 · 3m 0 / 28 / 12.82 | **homepage**, `/proteines` | **REDIRECT → /proteines** |
| `/blog/quel-est-le-prix-de-la-proteine-en-tunisie` | blog | Quel est le prix de la protéine en Tunisie ? | same | prix proteine tunisie | informational | 28d 0 / 11 / 7.73 · 3m 0 / 53 / 9.17 | its price twin below | RETARGET |
| `/blog/prix-proteine-tunisie-guide-complet-…-2025` | blog | Prix Protéine Tunisie : Guide Complet… | same | prix proteine tunisie | commercial | 28d no rows · 3m 0 / 15 / 8.93 | its twin above | **MERGE → the twin** |
| `/blog/proteine-whey-tunisie-guide-complet-2025` | blog (headline live) | Protéine whey : concentré, isolat, hydrolysat — les différences | same | différence whey concentré/isolat | informational | 28d 0 / 32 / 7.75 · 3m 0 / 86 / 7.98 | resolved | KEEP |
| `/blog/whey-proteine-prix-en-tunisie-comparatif-…` | blog (headline live) | Prix de la whey : comparer le coût par portion… | same | coût par portion whey | informational | 28d 0 / 58 / 18.43 · 3m 4 / 109 / 13.72 | `/blog/whey-proteine-pas-cher-tunisie` | KEEP |
| `/blog/whey-proteine-tunisie-guide-ultime-…` | blog (headline live) | Choisir une whey : teneur en protéines, lactose… | same | comment choisir sa whey | informational | 28d 0 / 20 / 40.55 · 3m 3 / 56 / 20.55 | resolved | KEEP |
| `/blog/proteine-whey-tunisie-tout-ce-que-vous-devez-savoir-avant-d-acheter` | blog (headline live) | Avant d'acheter une whey : ce qu'il faut vérifier sur l'étiquette | same | vérifier avant d'acheter | informational | 28d no rows · 3m 1 / 25 / 10.28 | resolved | KEEP |
| `/blog/proteine-whey-tunisie-le-guide-ultime-pour-musculation-et-recuperation` | blog (headline live) | Whey et récupération : quelle dose et quand la prendre | same | dosage whey récupération | informational | 28d no rows · 3m 0 / 16 / 7.94 | resolved | KEEP |
| `/blog/proteine-whey-tunisie-le-guide-ultime-…-qui-vous-convient-protein-tn` | blog (headline live) | Quelle whey pour quel objectif… | same | quelle whey pour quel objectif | informational | 28d 0 / 10 / 43.2 | resolved | KEEP |
| `/blog/meilleure-proteine-whey-2026` | blog (headline live) | Comment juger une whey : profil d'acides aminés… | same | comment juger une whey | informational | 28d 0 / 13 / 7.69 · 3m 0 / 28 / 6.39 | resolved | KEEP |
| `/blog/whey-protein-isolate-la-meilleure-proteine-…` | blog (no config entry) | Whey Protein Isolate : La Meilleure Protéine… | same | whey protein isolate | commercial | 28d no rows · 3m 0 / 24 / 41.79 | `/whey-isolate` | **RETARGET** |
| `/blog/whey-proteine-c-est-quoi-…` | blog (no config entry) | Whey Protéine : C'est quoi ? Tout savoir… | same | whey protéine c'est quoi | informational | 28d no rows · 3m 1 / 33 / 52.27 | `/whey-proteine` | **RETARGET** |
| `/blog/whey-proteine-pure-concentre-de-lactoserum-…` | blog (no config entry) | Whey Protéine Pure - Concentré de Lactosérum… | same | whey protéine concentrée | commercial | 28d 1 / 12 / 33.33 · 3m 1 / 18 / 25.39 | `/whey-proteine` | **RETARGET** |
| `/blog/proteine-en-poudre-guide-complet-pour-les-debutants` | blog (no config entry) | Protéine en Poudre : Guide Complet pour les Débutants | same | protéine en poudre | informational | 28d no rows · 3m 1 / 10 / 12.6 | `/proteines` | KEEP |
| `/blog/proteines-tunisiennes-tout-ce-que-vous-devez-savoir` | blog (headline live) | Protéines : sources alimentaires et compléments… | same | sources de protéines | informational | 28d 0 / 60 / 26.67 · 3m 1 / 155 / 19.45 | resolved | KEEP |
| `/blog/protein-the-essential-guide-…` | blog (headline live) | Protéines : leur rôle dans la nutrition… | same | rôle des protéines | informational | 28d 0 / 12 / 27.17 · 3m 0 / 49 / 28.76 | its French sibling above | KEEP |
| `/blog/whey-protein-et-entrainement-…` | blog (headline live) | Whey et entraînement : comment organiser ses apports | same | whey et entraînement | informational | 28d 0 / 29 / 55.38 · 3m 0 / 30 / 56.4 | resolved | KEEP |
| `/blog/iso-100-de-dymatize-la-whey-isolate-ultime-…` | blog | ISO 100 de Dymatize : La Whey Isolate Ultime… | same | iso 100 dymatize | commercial | **28d 44 / 411 / 6.62** · 3m 97 / 930 / 7.02 | product-level only | **KEEP — do not touch** |
| `/blog/impact-whey-protein-de-myprotein-…` | blog | Impact Whey Protein de MyProtein : Avis… | same | impact whey myprotein | commercial | 28d 9 / 534 / 8.79 · 3m 54 / 2,014 / 8.56 | product-level only | KEEP |
| `/blog/whey-protein-gold-standard-la-reference-ultime-…` | blog (no config entry) | Whey Protein Gold Standard : La Référence Ultime… | same | gold standard whey tunisie | commercial | 28d 1 / 25 / 10.56 · 3m 1 / 34 / 12.03 | 3 other gold-standard articles + `/optimum-nutrition` | **IMPROVE** |
| `/blog/les-meilleurs-complements-proteines-en-tunisie-**pour**-2025-guide-complet` | blog | Les Meilleurs Compléments Protéinés en Tunisie pour 2025 | same | meilleurs compléments protéinés | commercial | 28d 3 / 71 / 7.87 · 3m 5 / 151 / 7.36 | its slug twin below | **RETARGET** (surviving twin) |
| `/blog/les-meilleurs-complements-proteines-en-tunisie-**for**-2025-guide-complet` | blog — duplicate slug | (same article) | (same) | meilleurs compléments protéinés | commercial | 28d 1 / 3 / 4.33 · 3m 1 / 3 / 4.33 | its own twin | **RETARGET** (owner decision — see bullet) |
| `/blog/meilleur-site-pour-acheter-des-proteines-en-tunisie-…` | blog (no config entry) | Meilleur site pour acheter des protéines en Tunisie… | same | où acheter protéine tunisie | commercial | 28d 1 / 34 / 7.85 · 3m 2 / 104 / 7.93 | homepage (brand intent) | KEEP |

- **`/whey-proteine`'s title and H1 are already correct.** The gap is body depth, on-page coverage of
  "whey prix / prix au kg / formats", and inbound internal anchors — not metadata. It must also shed
  its 68 impressions on "protéine tunisie" (@65.3), which belong to the homepage.
- **`/whey-isolate` is a RETARGET, not a merge** — 3 clicks (28d). It absorbs 82 impressions on the
  owner's two head terms ("whey tunisie" 0/64/64.0, "whey protein tunisie" 0/18/52.2). Retarget the
  body and internal anchors to isolate-only intent (lactose, filtration, teneur) and keep the title.
- **`/proteine-de-boeuf`**: distinct product, correct title, but the H1 "Alternative à la Whey"
  plants the owner's head word in a sibling's strongest on-page slot. Move the comparison into the
  body with an up-link.
- **The duplicate slug pair** (`…-pour-2025…` / `…-for-2025…`) is one article at two indexed URLs.
  Both earn clicks, so the intended 301 from the "for" slug into the "pour" slug is an **owner
  decision**, not something this batch performs.
- **Gold Standard is a sub-cluster of its own.** Four of our articles answer "gold standard whey
  tunisie" while `/optimum-nutrition` (28d **47 clicks / 1,614 impr / 13.51**, the 3rd best page on
  the site) is the commercial owner of that intent. Flagged for its own batch, not resolved here.
- **Resolver chain, verified.** `content/categories/whey-protein.json` is aliased to six other slugs
  via `CONTENT_SLUG_ALIASES`, but `CONTENT_SERP_OWNER` maps the file to `whey-proteine`, so only the
  owner receives its h1/metaTitle/metaDescription. In practice all six aliases 308 at the edge, so
  the guard is belt-and-braces here. `proteines.json` owns its own SERP fields (filename == owner
  slug) and its intro hands whey intent to `/whey-proteine`. **That part of the architecture is
  already correct.**
- **Dead content files** (recorded, no action): `content/categories/proteines-en-poudre.json` and
  `proteines-completes.json` both exist with commercial whey-flavoured titles, but both slugs 308 to
  `/proteines`. Unreachable today; a live cannibalisation risk the moment either slug is re-enabled.

---

## 3. Mass gainer / prise de masse

Settled: **`/mass-gainers`** owns the gainer product terms; **`/prise-de-masse`** is the parent goal
hub owning "prise de masse tunisie". See [Settled decisions](#settled-decisions).

| URL | type | title | H1 | main keyword | intent | GSC (clicks/impr/pos) | competes with | action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/mass-gainers` | category (OWNER) | Mass Gainer Tunisie : Prix, Marques & Comparatif | Mass Gainer en Tunisie : prix, marques et comparatif | mass gainer tunisie | commercial | 28d 1 / 146 / 32.15 · 3m 1 / 291 / 42.94; on "mass gainer tunisie" 0 / 12 / 51.4 | `/prise-de-masse`, `/gainers-proteines`, the gainer blogs | **IMPROVE** |
| `/prise-de-masse` | category (goal hub) | Prise de Masse en Tunisie : Guide Complet | Prise de masse en Tunisie : la méthode complète | prise de masse tunisie | mixed | 28d 1 / 130 / 58.38 · 3m 1 / 290 / 55.6; on "mass gainer tunisie" 0 / 12 / 54.1 | `/mass-gainers`, `/gainers-proteines` | **RETARGET** (the grid, not the title) |
| `/gainers-proteines` | category (sub-type) | Gainer Protéiné Tunisie : Lean Gainer dès 120 DT | Gainers protéinés en Tunisie : lean gainer… | should be: lean gainer tunisie | commercial | 28d 0 / 48 / 46.52 · 3m 0 / 86 / 44.19; on "mass gainer tunisie" 0 / 10 / 53.3 | `/mass-gainers`, `/prise-de-masse` | **RETARGET** |
| `/blog/mass-gainer-prix-tunisie-guide-complet-pour-2025` | blog | Mass Gainer Prix Tunisie : guide d'achat 2026 | same | mass gainer prix tunisie | informational | **28d 23 / 697 / 5.86** · 3m 51 / 1,470 / 6.53; on "serious mass tunisie" 1 / 19 / 4.6 | `/mass-gainers` (holds the literal head term) | **KEEP — do not touch** |
| `/blog/mass-gainer-prix-tunisie` | blog (near-duplicate) | Prix d'un mass gainer : lire le coût au kilo et par portion | same | mass gainer prix tunisie | informational | 28d **no rows** · 3m 0 / 51 / 34.45 | the 23-click guide above | **MERGE → the 2025 guide** |
| `/blog/serious-mass-le-gainer-ultime-pour-une-prise-de-masse-rapide` | blog | Serious Mass : Le Gainer Ultime… | same | serious mass tunisie | informational | 28d 0 / 46 / 34.63 · 3m 6 / 644 / 11.25 | its ON-branded twin, the SKU page | **RETARGET** |
| `/blog/serious-mass-d-optimum-nutrition-le-gainer-ideal-…` | blog (near-duplicate) | Serious Mass d'Optimum Nutrition : Le Gainer Idéal… | same | serious mass tunisie | informational | 28d 0 / 65 / 11.58 · 3m 1 / 163 / 10.29 | its twin above | **RETARGET** |
| `/blog/mass-gainer-tout-savoir-sur-ce-complement-…` | blog (no config entry) | Mass Gainer : Tout savoir sur ce complément… | same | mass gainer (explainer) | informational | 28d 0 / 31 / 34.0 · 3m 0 / 120 / 40.31 | the other generic explainer, `/mass-gainers` | **MERGE → /mass-gainers** |
| `/blog/mass-gainer-le-guide-ultime-pour-choisir-…` | blog (no config entry) | Mass Gainer : Le Guide Ultime pour Choisir… | same | meilleur mass gainer | informational | 28d 0 / 7 / 48.57 · 3m 0 / 51 / 33.29 | as above | **MERGE → /mass-gainers** |
| `/blog/proteines-de-masse-questions-reponses-faq` | blog (FAQ) | Protéines de Masse – Questions / Réponses (FAQ) | same | protéine prise de masse | informational | 28d 0 / 6 / 11.0 · 3m 0 / 18 / 12.0 | the 8-item FAQs on both hubs | **RETARGET** |
| `/blog/proteine-de-mass-quelle-est-la-meilleure-proteine-…` | blog (no override) | (CMS title) | (CMS title) | meilleure protéine prise de masse | informational | 28d no rows · 3m 0 / 192 / 22.24 | `/prise-de-masse`, the article below | **RETARGET** |
| `/blog/proteine-pour-la-musculation-guide-complet-…` | blog (no override) | (CMS title) | (CMS title) | protéine musculation prise de masse | informational | 28d 0 / 16 / 54.12 · 3m 0 / 19 / 53.11 | the article above | **MERGE → the article above** |
| `/blog/proteine-pour-prise-de-poids-tunisie-…` | blog (no override) | (CMS title) | (CMS title) | proteine prise de poids tunisie | informational | 28d no rows · 3m 0 / 12 / 8.0 | `/prise-de-masse` | **RETARGET** |
| `/blog/regime-alimentaire-pour-la-prise-de-masse-…` | blog | Régime alimentaire pour la prise de masse… | same | alimentation prise de masse | informational | 28d 1 / 10 / 3.20 · 3m 3 / 31 / 5.55 | nothing — distinct diet intent | KEEP (add an up-link only) |
| `/blog/meilleur-creatine-pour-prise-de-masse` | blog (cluster boundary) | (config entry exists) | (same) | meilleure créatine prise de masse | informational | 28d 0 / 17 / 13.24 · 3m 2 / 95 / 14.35 | the creatine set, not the hubs | KEEP — **creatine workflow's territory** |
| `/glucides` | category | Glucides Sport Tunisie : Énergie Musculation | Glucides Sport Tunisie – Énergie & Performance | glucides sport tunisie | commercial | 28d 4 / 126 / 55.12 · 3m 8 / 228 / 54.39 | no gainer head term | KEEP |
| `/glucides-energie` | category (noindex,follow) | Glucides & Énergie \| Protéine Tunisie | Glucides & Énergie | n/a — noindex | commercial | 28d 1 / 1 / 1.0 | neutralised by noindex | KEEP |
| `/mass-gainers/serious-mass-2-7-kg` | PDP | Serious Mass 2,7 kg – Prix Tunisie \| Optimum Nutrition | (product) | serious mass 2.7 kg prix | commercial | **28d 14 / 129 / 9.51** · 3m 62 / 390 / 9.42 | outranked on the generic term by our own blogs | **KEEP — do not touch** |
| `/mass-gainers/serious-mass-5-45-kg-optimum-nutrition` | PDP | Serious Mass 5,45 kg – Prix Tunisie \| Optimum Nutrition | (product) | serious mass 5kg / 7kg prix tunisie | commercial | 28d no rows · 3m 5 / 483 / 9.78 | the two Serious Mass articles | **IMPROVE** |
| `/prise-de-masse?page=3` | paginated category | (hub title) — Page 3 | (hub H1) | inherits the hub's | commercial | 0 clicks; 1 impr @79 on "mass gainer tunisie" (page-level breakdown); no standalone row | `/prise-de-masse`, `/mass-gainers` | **NOINDEX,follow** |
| `/shop?search=GAINER&sort=relevance` | internal search results | (shop title) | (shop H1) | none intended | navigational | 28d no rows · 3m 0 / 79 / 88.49 | `/mass-gainers`, `/gainers-proteines` | **NOINDEX** |

- **The mechanism is the product grid, not the metadata.** Measured 22/09 with a Googlebot UA:
  `/prise-de-masse` renders **27 products / 28 "En stock"** from 24 distinct PDP links (9 of them
  `/mass-gainers/*`), while the OWNER `/mass-gainers` renders **20 / 14** and `/gainers-proteines`
  **18 / 8**. The goal hub republishes the owner's own catalogue at double its in-stock count. Fill
  the owner's grid before touching anything else.
- **`/gainers-proteines` claims the owner's family in its own SERP fields** and owns them outright
  (`gainers-proteines.json` resolves by identity — no alias, so `CONTENT_SERP_OWNER` never demotes
  it). Never 301: its PDPs earn (thunder-gainer 12 clicks @5.12, premium-v-bulk 9 @6.51 over 3m).
- **`/blog/serious-mass-d-optimum-nutrition-…` earns exactly 1 click over 3m**, which is why it is
  RETARGET and not MERGE. Folding it into its twin would be cleaner, but the traffic rule is
  explicit — that is an owner decision.
- **Out of scope but worth the owner's attention:** `/mass-gainers/hard-mass-gainer-7kg` now 308s to
  the category, and it earned 28d 1 / 76 / 12.67 and 20 clicks / 538 impr / 12.35 over 3m. Likely an
  unpublished product rather than an SEO decision — worth confirming it was intentional.
- **Taxonomy leak (record, do not act):** gainer SKUs canonicalised outside the owner's folder —
  `/glucides/mass-gainer-creatine-eric-favre-7-kg`, `/proteine-de-boeuf/big-ramy-labs-beef-mass-gainer-4-9kg`,
  `/proteine-de-boeuf/musclemeds-carnivor-mass-…`, plus all 14 `/gainers-proteines/*` PDPs. Every one
  earns or has nowhere better to go — a separate PDP-taxonomy pass.
- **"gainer tunisie" and "prise de masse tunisie" return NO rows** as literal query strings in either
  window. The cluster's measured demand is "mass gainer tunisie" (55 impr 28d), "mass gainer" and
  the Serious Mass family.

---

## 4. Pre-workout

| URL | type | title | H1 | main keyword | intent | GSC (clicks/impr/pos) | competes with | action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/pre-workout` | category (OWNER) | Pre Workout Tunisie \| C4, Prix & Livraison | Pre Workout en Tunisie : Énergie, Focus & Congestion | pre workout tunisie | commercial | 28d 6 / 155 / 13.52 · 3m 19 / 1,246 / 9.85 | loses nothing at category level | **KEEP — leave completely alone** |
| `/pre-workout/pre-workout-born-rage-original-eric-favre` | PDP | Pre Workout Born Rage Original – Prix Tunisie | PRE WORKOUT BORN RAGE ORIGINAL - ERIC FAVRE | pre workout (generic) | commercial | 28d 1 / 385 / 5.38 · 3m 3 / 427 / 5.86 | `/pre-workout` | **IMPROVE the category, not the PDP** |
| `/pre-workout/c4-original-pre-workout-cellucor` | PDP | C4® Original Pre-Workout – Cellucor® – Prix Tunisie | C4® Original Pre-Workout - Cellucor® | c4 pre workout tunisie | commercial | 28d no rows · 3m 5 / 92 / 14.51 | `/c4-cellucor`, `/cellucor` | KEEP |
| `/c4-cellucor` | brand page | **C4 / Cellucor Tunisie \| Pre-Workout**, C4 Whey & Créatine | C4 / Cellucor Tunisie : pre-workout, whey et créatine | c4 tunisie / cellucor tunisie | commercial | 28d 1 / 30 / 8.9 · 3m 1 / 38 / 9.29 | `/cellucor`, the C4 PDP, `/pre-workout` | **RETARGET** |
| `/cellucor` | brand page (duplicate brand) | CELLUCOR Tunisie \| Compléments alimentaires | Produits CELLUCOR | cellucor tunisie | commercial | 28d 1 / 5 / 9.4 · 3m 1 / 14 / 14.64 | `/c4-cellucor` | **RETARGET** |
| `/performance` | parent hub | **Compléments Performance Tunisie \| Créatine & BCAA** | Compléments Performance en Tunisie : force, endurance… | compléments performance tunisie | commercial | 28d 1 / 55 / 23.45 · 3m 5 / 155 / 17.74 | `/bcaa` (and `/creatine`) | **RETARGET** |
| `/boosters-hormonaux` | category | Boosters Hormonaux Tunisie : Tribulus Ashwagandha | Boosters Hormonaux Tunisie – Tribulus & Ashwagandha | testo booster tunisie | commercial | 28d 1 / 36 / 8.11 · 3m 1 / 54 / 11.54 | only because the map assigns "booster tunisie" to `/pre-workout` | KEEP (fix the map) |
| `/pre-workout?page=9` | paginated category | (owner title) | (owner H1) | pre workout tunisie | commercial | 28d 1 / 14 / 43.93 (sibling `?page=2` 0 / 16 / 47.81) | `/pre-workout` | **IMPROVE** (distinct paginated title; no noindex — it earns) |
| `/intra-workout` | category | Intra-Workout Tunisie : Pendant l'Entraînement | Intra-Workout Tunisie – Hydratation & Performance | intra workout tunisie | commercial | 28d 0 / 5 / 2.6 · 3m no rows | `/bcaa` (via its description lead) | **RETARGET** (description only) |
| `/post-workout` | category | Post-Workout Tunisie : Récupération dès 45 DT | Post-Workout Tunisie – Récupération & Reconstruction | post workout tunisie | commercial | 28d no rows · 3m 1 / 4 / 12.25 | nothing measurable | KEEP |

- **Leave `/pre-workout` completely alone.** 19 clicks / 1,246 impr / pos 9.85 over 3m, 1,799-word
  body, 9 FAQs — the best commercial category on the site. All pre-workout work belongs on the two
  Cellucor brand pages and on `/performance`'s title.
- **The Born Rage PDP is not the problem, it is the symptom.** It takes 385 of the cluster's 28d
  impressions at pos 5.38 with 0.26% CTR while the generic query "pre workout" runs 0 clicks /
  393 impr / 7.03 (28d, query-average). Fix the category's pull; do not touch the PDP title.
- **Orphaned content file** (recorded): `frontend/content/categories/complements-d-entrainement.json`
  carries metaTitle "Compléments Entraînement Tunisie : Pre & Post" and a pre-workout FAQ, but
  `/complements-d-entrainement` returns 404 + noindex and `redirects.js` sends the legacy category
  paths to `/performance`. A loaded gun if that slug is ever re-enabled.

---

## 5. BCAA

| URL | type | title | H1 | main keyword | intent | GSC (clicks/impr/pos) | competes with | action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/bcaa` | category (OWNER) | BCAA Tunisie : **Acides Aminés** dès 70 DT | BCAA Tunisie : **Acides Aminés** 2:1:1 pour Récupération | bcaa tunisie | commercial | 28d 0 / 26 / 12.69 · 3m 1 / 82 / 17.20 | `/acides-amines` (title token), its own PDP | **IMPROVE** |
| `/acides-amines` | parent hub | **Acides Aminés Tunisie : EAA, BCAA, Glutamine** | Acides aminés en Tunisie : EAA, BCAA, glutamine et arginine | acides aminés tunisie | commercial | 28d 4 / 42 / 10.67 · 3m 4 / 43 / 10.44 | `/bcaa`, `/eaa`, `/glutamine`, `/l-arginine` (all four named) | **RETARGET** |
| `/eaa` | category | EAA Tunisie : Acides Aminés Essentiels | EAA en Tunisie : les neuf acides aminés essentiels | eaa tunisie | commercial | 28d 3 / 18 / 7.94 · 3m 10 / 56 / 12.89 | nothing — resolved by the 22/09 alias fix | **KEEP — leave alone** |
| `/glutamine` | category | Glutamine Tunisie : L-Glutamine dès 60 DT | Glutamine Tunisie : Récupération & Système Immunitaire | glutamine tunisie | commercial | 28d 0 / 26 / 17.77 · 3m 4 / 69 / 16.68 | only via `/acides-amines`' title | KEEP |
| `/citrulline` | category | Citrulline Tunisie : Achetez au Meilleur Prix | Citrulline Tunisie – Pump, Endurance & Performance | citrulline tunisie | commercial | 28d 0 / 22 / 34.86 · 3m 6 / 76 / 23.93 | `/l-arginine` (product-level only) | KEEP |
| `/l-arginine` | category | L-Arginine Tunisie \| AAKG, Poudre & Gélules | L-Arginine en Tunisie : AAKG, poudre et gélules | l arginine tunisie | commercial | 28d 0 / 18 / **63.94** · 3m 8 / 107 / 28.02 | its own PDP (`elite-arginine` 28d 0 / 91 / 9.9) | **IMPROVE** |
| `/beta-alanine` | category | Bêta-Alanine Tunisie : Achetez au Meilleur Prix | Bêta-Alanine Tunisie – Endurance, Force & Pump | beta alanine tunisie | commercial | 28d no rows · 3m 2 / 32 / 33.44 | its own PDPs | KEEP |
| `/blog/eaa-vs-bcaa-le-match-nul` | blog (not in blogSeoConfig) | EAA vs BCAA : le match nul ! \| Protéine Tunisie | EAA vs BCAA : le match nul ! | eaa vs bcaa | informational | 28d no rows · 3m 0 / 17 / 20.41 | the same H2 on `/bcaa`, `/eaa` and `/acides-amines` | **IMPROVE** |
| `/blog/bcaa-ou-proteines-quel-complement-choisir-…` | blog (not in blogSeoConfig) | BCAA ou Protéines : Quel Complément Choisir… | same | bcaa ou protéine | informational | 28d no rows · 3m 0 / 12 / 15.17 | the identical FAQ on `/bcaa` | **IMPROVE** |
| `/bcaa/bcaa-12-000-457-g` | PDP | (generated) | (generated) | bcaa tunisie | commercial | 3m 1 / 26 / 17.77; on the bcaa* family 1 / 19 / **16.4** vs `/bcaa` at 0 / 22 / **34.7** | `/bcaa` | KEEP — it is the evidence, not the problem |
| `/pre-workout/amino-energy-270-g` | PDP (cross-cluster) | (generated) | (generated) | amino energy tunisie | commercial | 28d 2 / 20 / 24.2 · 3m 7 / 83 / 18.48 | `/bcaa`, `/eaa`, `/acides-amines` | KEEP (taxonomy note) |

- **The 22/09 alias fix is live and complete**, verified by curl with a Googlebot UA: `/bcaa`,
  `/acides-amines` and `/eaa` now return three distinct titles, H1s, meta descriptions, bodies and
  H2 sets, all 200, index,follow, self-canonical. `CONTENT_SLUG_ALIASES` no longer maps
  `acides-amines` or `eaa` onto `bcaa`. **Residual overlap is SERP-surface wording only.**
- **`/acides-amines` is not a `/bcaa` duplicate** — every click-earning PDP under `/acides-amines/`
  in the 28d export is an isolated amino (glycine, lysine, taurine, tyrosine, carnosine,
  phenylalanine); not one is a BCAA. The rayons sell different things.
- **The designated owner is the weakest page of its own family.** Over 3m: `/eaa` 10 clicks,
  `/l-arginine` 8, `/citrulline` 6, `/acides-amines` 4, `/glutamine` 4, `/beta-alanine` 2,
  **`/bcaa` 1**. On the bcaa* family its own PDP sits 18 positions ahead of it.
- **`blogSeoConfig.ts` has zero coverage for this cluster.** All 42 keys are creatine, whey, gainer,
  compléments-alimentaires, cosmetics or equipment slugs. The two ranking BCAA articles have no
  overlay and no editorial up-link — while the three category pages each answer the EAA-vs-BCAA
  question on-page. The duplication to remove is on the categories, not in the blog.
- **Redirect inconsistency, one line, not an action:** `redirects.js:284` sends
  `/eaa-bcaa-390gr-challenger-nutrition` to `/bcaa`, while the live PDP for that product is
  `/eaa/eaa-bcaa-390gr-challenger-nutrition` (3m 2 clicks / 62 impr / 14.27).

---

## Top conflicts

Ranked by money at stake. One line of evidence each.

1. **`/blog/whey-protein-en-tunisie` claims the homepage's head term in its `<title>`.**
   Live title "Whey Proteine en Tunisie **| Protéine Tunisie**"; it takes 85 impressions on
   "proteine tunisie" at pos 11.7 while the homepage takes 352 at 9.9 — two of our URLs in one SERP,
   one of them the site's single best page (125 of 127 clicks on "protein tunisie"). 10 clicks (28d)
   → title-only retarget via a `headline` in `blogSeoConfig`, never a redirect.
2. **`/blog/whey-proteine-pas-cher-tunisie` out-ranks the whey owner on the owner's own term.**
   "whey protein tunisie": this article 5 clicks @13.9, `/blog/whey-protein-en-tunisie` 4 @12.5,
   **`/whey-proteine` 1 @34.4**. Same "| Protéine Tunisie" suffix. 13 clicks (28d) → retitle to the
   price-method framing its own `metaDescription` already describes; keep URL and ranking.
3. **The three-way category split on "mass gainer tunisie": 55 impressions, 0 clicks.**
   `/mass-gainers` 12 @51.4, `/prise-de-masse` 12 @54.1, `/gainers-proteines` 10 @53.3 — three of our
   own indexable categories in the 51–54 band, none in the top 50. The owner is not winning.
4. **The grid inversion behind that split.** Curled 22/09 (Googlebot UA): `/prise-de-masse` renders
   27 products / 28 "En stock", the OWNER `/mass-gainers` 20 / 14, `/gainers-proteines` 18 / 8. The
   goal hub republishes the owner's catalogue at double its in-stock count.
5. **Seven URLs on "serious mass tunisie" (3 clicks / 89 impr).** homepage 2/37/10.2 · the price
   guide 1/19/4.6 · `/blog/serious-mass-le-gainer-ultime` 0/12/27.3 · `/prise-de-masse` 0/11/26.9 ·
   `/mass-gainers` 0/7/35.4 · `/blog/serious-mass-d-ON` 0/6/13.0 · **the SKU page itself 0/1/12**.
   The page that sells the tub is last.
6. **`/whey-proteine` cannot win its cluster while two blogs sit 20+ positions above it**, and on
   "whey tunisie" (0 clicks, 107 impr) four of our URLs split the SERP: `/whey-isolate` 64.0,
   `/whey-proteine` 63.1, `/proteines` 75.1, `/blog/whey-proteine-pas-cher-tunisie` 14.0.
7. **Two live brand pages for one brand.** `/cellucor` (28d 1/5/9.4) and `/c4-cellucor` (1/30/8.9)
   are both 200, index,follow, self-canonical — `brandSeoConfig.ts` documents the cause (brand ids
   342 and 11 are two DB rows). `/c4-cellucor` also leads its title with "Pre-Workout". Both earn
   clicks, so: retarget both, 301 neither.
8. **The BCAA owner is beaten by its own PDP.** On the bcaa* family (3m): `/bcaa/bcaa-12-000-457-g`
   1 click / 19 impr / **16.4** vs `/bcaa` 0 / 22 / **34.7**.
9. **A single PDP absorbs the pre-workout category query.** Born Rage takes 385 of 28d impressions
   at 5.38 with 0.26% CTR while "pre workout" runs 0 clicks / 393 impr (28d query-average).
10. **The near-duplicate gainer blog is still live.** `/blog/mass-gainer-prix-tunisie` returns 200,
    index,follow, self-canonical, sits on the **exact-match slug**, and earns nothing in either
    window (28d no rows; 3m 0 / 51 / 34.45) while the 23-click guide sits on the longer 2025 slug.
    The single clearest merge on the site.
11. **`/blog/proteines-tunisie` states the homepage's head term twice** ("Protéines Tunisie |
    Protéine Tunisie"), one-line H1, **0 clicks in both windows**. Nothing to protect → 301 to
    `/proteines`.
12. **Four live blog titles start with "Mass Gainer."** Two of them have no `blogSeoConfig` entry at
    all, carry raw CMS titles, inject no link down to the owner, and earn zero clicks in both
    windows. This is why the bare query "mass gainer" averages position 51.9 on 181 impressions (3m).
13. **Parent hubs put their children's head terms in their titles.** `/performance` →
    "…| Créatine & BCAA"; `/acides-amines` → "…: EAA, BCAA, Glutamine" plus an H1 naming four
    children; `/bcaa` itself carries "Acides Aminés" in both title and H1; `/intra-workout`'s
    description leads with "BCAA".
14. **`/pure-protein`: a brand page whose brand name is the homepage's head term**, surfacing on
    "protein tunisie" at pos 89.7 (12 impressions). 2 clicks → scope the title to the brand.
15. **`/shop` and `/proteines` offer Google the same "all the proteins" page** — `/shop` titled
    "Protéines & Compléments Alimentaires en Tunisie" (11 clicks @16.79) one taxonomy level above
    `/proteines` (19 clicks @19.11).
16. **One article, two indexed URLs, both earning.** `…-pour-2025-guide-complet` (3/71/7.87) and
    `…-for-2025-guide-complet` (1/3/4.33). Owner decision, not an automatic 301.
17. **Four articles answer "gold standard whey tunisie"** while `/optimum-nutrition` (28d 47 clicks /
    1,614 impr, the site's 3rd best page) is the real owner. Adjacent sub-cluster, flagged.
18. **Paginated hub copies are indexable and self-canonical.** `/prise-de-masse?page=3` repeats the
    hub's H1 and full intro and already surfaced on "mass gainer tunisie" at pos 79.

---

## Protected by traffic

Every URL below earned clicks in the 22/09 export. **None may be MERGE, REDIRECT or NOINDEX.**
Clicks are 28-day unless marked (3m), which means the URL was below the 28-day export floor.

| URL | Clicks | URL | Clicks |
| --- | --- | --- | --- |
| `/` | 508 | `/blog/iso-100-de-dymatize-…` | 44 |
| `/optimum-nutrition` | 47 | `/blog/mass-gainer-prix-tunisie-guide-complet-pour-2025` | 23 |
| `/proteines` | 19 | `/mass-gainers/serious-mass-2-7-kg` | 14 |
| `/blog/prix-de-la-creatine-en-tunisie` | 14 | `/blog/whey-proteine-pas-cher-tunisie` | 13 |
| `/shop` | 11 | `/blog/whey-protein-en-tunisie` | 10 |
| `/blog/les-meilleures-marques-de-creatine-…` | 10 | `/blog/impact-whey-protein-de-myprotein-…` | 9 |
| `/whey-proteine` | 8 | `/pre-workout` | 6 |
| `/proteines-vegetales` | 6 | `/proteine-sousse` | 6 |
| `/caseine` | 5 | `/glucides` | 4 |
| `/acides-amines` | 4 | `/whey-isolate` | 3 |
| `/eaa` | 3 | `/blog/les-meilleurs-complements-proteines-…-pour-2025-…` | 3 |
| `/creatine` | 2 | `/blog/creatine-tunisie` | 2 |
| `/blog/quelle-est-la-meilleure-creatine-monohydrate-…` | 2 | `/whey-hydrolysee` | 2 |
| `/proteine-de-boeuf` | 2 | `/pure-protein` | 2 |
| `/pre-workout/amino-energy-270-g` | 2 | `/mass-gainers` | 1 |
| `/prise-de-masse` | 1 | `/performance` | 1 |
| `/boosters-hormonaux` | 1 | `/c4-cellucor` | 1 |
| `/cellucor` | 1 | `/pre-workout?page=9` | 1 |
| `/pre-workout/pre-workout-born-rage-…` | 1 | `/glucides-energie` | 1 |
| `/proteines-multi-sources` | 1 | `/blog/regime-alimentaire-pour-la-prise-de-masse-…` | 1 |
| `/blog/whey-protein-gold-standard-…` | 1 | `/blog/meilleur-site-pour-acheter-des-proteines-…` | 1 |
| `/blog/whey-proteine-pure-concentre-…` | 1 | `/blog/les-meilleurs-complements-proteines-…-for-2025-…` | 1 |
| `/mass-gainers/hard-mass-gainer-7kg` | 1 | `/blog/mass-gainer-prix-tunisie-guide…` (dup. of above) | — |
| `/eaa` PDPs, `/citrulline` (3m 6) | 3m | `/l-arginine` (3m 8) | 3m |
| `/glutamine` (3m 4) | 3m | `/beta-alanine` (3m 2) | 3m |
| `/post-workout` (3m 1) | 3m | `/blog/serious-mass-le-gainer-ultime-…` (3m 6) | 3m |
| `/mass-gainers/serious-mass-5-45-kg-…` (3m 5) | 3m | `/pre-workout/c4-original-pre-workout-cellucor` (3m 5) | 3m |
| `/blog/meilleur-creatine-pour-prise-de-masse` (3m 2) | 3m | `/blog/serious-mass-d-optimum-nutrition-…` (3m 1) | 3m |
| `/bcaa` (3m 1) | 3m | `/bcaa/bcaa-12-000-457-g` (3m 1) | 3m |
| `/proteine-tunisie` (3m 2) | 3m | `/blog/whey-proteine-c-est-quoi-…` (3m 1) | 3m |
| `/blog/proteine-en-poudre-guide-…` (3m 1) | 3m | `/blog/proteines-tunisiennes-…` (3m 1) | 3m |
| `/blog/proteine-whey-tunisie-tout-ce-que-vous-devez-savoir-avant-d-acheter` (3m 1) | 3m | `/blog/whey-proteine-prix-en-tunisie-comparatif-…` (3m 4) | 3m |
| `/blog/whey-proteine-tunisie-guide-ultime-…` (3m 3) | 3m | | |

**The only unprotected consolidation targets in this batch** — zero clicks in **both** the 28-day and
the 3-month windows:

| URL | 28d | 3m | Action |
| --- | --- | --- | --- |
| `/blog/proteines-tunisie` | 0 / 6 / 11.33 | 0 / 28 / 12.82 | REDIRECT → `/proteines` |
| `/blog/prix-proteine-tunisie-guide-complet-…-2025` | no rows | 0 / 15 / 8.93 | MERGE → `/blog/quel-est-le-prix-de-la-proteine-en-tunisie` |
| `/blog/mass-gainer-prix-tunisie` | no rows | 0 / 51 / 34.45 | MERGE → the 2025 guide |
| `/blog/mass-gainer-tout-savoir-…` | 0 / 31 / 34.0 | 0 / 120 / 40.31 | MERGE → `/mass-gainers` |
| `/blog/mass-gainer-le-guide-ultime-…` | 0 / 7 / 48.57 | 0 / 51 / 33.29 | MERGE → `/mass-gainers` |
| `/blog/proteine-pour-la-musculation-guide-…` | 0 / 16 / 54.12 | 0 / 19 / 53.11 | MERGE → `/blog/proteine-de-mass-quelle-…` |
| `/prise-de-masse?page=3` (and `?page=N` / `/page/N`) | 0 | 0 | NOINDEX,follow |
| `/shop?search=GAINER…` (and `?search=MASS GAINER`) | no rows | 0 / 79 / 88.49 | NOINDEX |

---

## Settled decisions

These were decided before this batch and are recorded, not re-opened.

### The homepage owns "protein tunisie"

`/` takes **125 of 127 clicks at pos 5.5** on "protein tunisie" (28d, page-level breakdown) and 22 of
28 on "proteine tunisie" @9.9. **Nothing on the site may carry a bare "Protéine Tunisie" title while
the homepage holds that term.** `/proteines` is the catalogue hub — its title is already
"Catalogue de protéines : types et formats" and must stay off the head term. `/proteine-tunisie` is
already repositioned to "Comment choisir sa protéine ?" via `cmsPageSeoConfig` and verified live; it
is deliberately not redirected, because `redirects.js` records that both it and
`/page/proteine-tunisie` return 200 with real impressions.

### `/mass-gainers` owns the gainer product terms

Decided by the owner on 22/09/2026 after the conflict was put to them explicitly:

1. **Search Console** — `/mass-gainers` pos 32.2 vs `/prise-de-masse` pos 58.4 (26 positions).
2. **Every click-earning gainer PDP lives under `/mass-gainers/`** — serious-mass-2-7-kg 14 clicks
   @9.51, hard-mass-gainer-7kg, levro-legendary, gain-bolic-6000.
3. **The repo already encodes and GUARDS the decision.**
   `frontend/scripts/check-commercial-intent-map.mjs` fails the build unless `/mass-gainer`,
   `/serious-mass-*` and `/product-category/prise-de-masse/mass-gainer` redirect to `/mass-gainers`.
   Legacy equity was deliberately consolidated there; naming a different owner would mean unwinding
   those redirects.

`/prise-de-masse` is therefore the parent **goal** hub and owns "prise de masse tunisie". Nothing is
redirected between them; the hub links down. All legacy redirects verified live on 22/09:
`/mass-gainer` 308 → `/mass-gainers`, `/gainers-riche-en-glucides` 301 → `/mass-gainers`,
`/gainers-haute-energie` 308 → `/gainers-proteines`.

### The creatine cluster belongs to the parallel workflow

Section 1 is recorded from `commercialSeoMap.ts` and the 22/09 exports so this document stays
consistent with it. It was not re-derived. See `SEO_AUDIT.md`.

---

## Disagreements with `frontend/src/config/commercialSeoMap.ts`

Recorded explicitly rather than silently resolved. **The file is the target state; these are places
where the measurement on 22/09 does not match what the file says.**

| # | Where | What the file says | What 22/09 measures | Suggested resolution |
| --- | --- | --- | --- | --- |
| 1 | `whey.secondary` | includes **"whey isolate tunisie"** | that exact string is `/whey-isolate`'s own primary head term | An owner's `secondary` must not be a sibling's `primary`. Remove it from `whey.secondary`. |
| 2 | `whey.conflicts['/blog/whey-protein-en-tunisie'].reason` | quotes the live title as **"PROTÉINE en Tunisie : Guide Achat 2026"** | live title on 22/09 is **"Whey Proteine en Tunisie \| Protéine Tunisie"** | The conclusion still holds (it does claim the homepage's term) but the quoted evidence is stale — correct the string, or the next reader hunts for text that is not there. |
| 3 | `preWorkout.conflicts['/performance'].reason` | "must not claim the pre-workout head term" | the live title contains **no pre-workout token**; it claims **Créatine & BCAA** | The reason string is factually wrong. The real conflict is two children's head terms in a parent hub's title. |
| 4 | `preWorkout.owns` | includes **"booster tunisie"** | that query has **zero rows** in both windows; the measured booster demand is hormonal ("testo booster tunisie" 3m 1/84/8.46) and served by `/boosters-hormonaux` (28d 1/36/8.11) | Release "booster tunisie" from `preWorkout.owns`. |
| 5 | `preWorkout.secondary` | includes **"c4 tunisie"** | zero rows; all measured C4 demand is "c4 pre workout …" and lands on the C4 **PDP** (3m 5 clicks) | Point the C4 intent at the PDP, not the category. |
| 6 | `owns` across clusters | "pre workout prix tunisie", "eaa tunisie", "gainer tunisie", "prise de masse tunisie" | **zero rows** as literal query strings in both windows | Not wrong to own them — just unmeasured. Do not treat their absence as a ranking failure. |
| 7 | `bcaa.conflicts` for `/eaa` and `/acides-amines` | "must not render the same title/H1/intro as `/bcaa` (it did until 22/09/2026)" | **fixed and verified live** — three distinct titles, H1s, descriptions, bodies and H2 sets | Downgrade to the residual SERP-wording overlap, which is all that remains. |
| 8 | `protectedByTraffic` | 8 entries | at least 60 URLs earn clicks in the 28d export, including `/pre-workout` (6), `/eaa` (3), `/acides-amines` (4), `/shop` (11), `/proteines` (19), `/whey-proteine` (8), `/c4-cellucor` and `/cellucor` (1 each) | Extend it, so the guard script stops anyone consolidating them later. |
| 9 | `protectedByTraffic` figures | `/blog/whey-proteine-pas-cher-tunisie` "5 clicks @13.9", `/blog/whey-protein-en-tunisie` "4 clicks @12.5" | those are **query-level page splits** on "whey protein tunisie"; the pages' own 28d totals are **13** and **10** clicks | Both are true; label which is which, so the next reader does not compare a query split to a page total. |

---

## Scope and method

**Read-only.** Nothing in the codebase was modified. No git, no npm. This document is the only file
written. Every live title, H1 and robots value quoted was fetched on 22/09/2026 with a Googlebot UA
against `https://protein.tn`. Every GSC figure comes from a URL's own row in the 22/09 exports, or
from the page-level per-query breakdown in `GSC-2026-09-22.md` where a page's position **on a
specific query** is quoted — never from a query-level average. Nothing was estimated.
