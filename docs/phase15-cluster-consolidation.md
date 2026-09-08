# Phase 15 — intent and internal-link audit

Working-tree implementation, 2026-09-08. No staging, commits, deployment, dependencies or backend edits.

## Keyword → winning page → change

| Keyword / intent | Target | Change |
| --- | --- | --- |
| whey, whey protein, whey protein tunisie, protein, proteine tunisie | `/whey-proteine` | Commercial anchors in the homepage's category band, navigation, footer, related-category links, product category links and blog configuration; three competing blog posts open with a pillar link. `/proteines` explicitly links down to this rayon. |
| protéines generally; catalogue browsing | `/proteines` | Title/H1 now describe the catalogue and types/formats. Opening copy distinguishes protein families and sends whey buyers to `/whey-proteine`. Category links say “Catalogue de protéines”. |
| creatine, creatine monohydrate, creatine tunisie | `/creatine` | H1 names monohydrate; commercial anchors across the same shopping surfaces; both specified creatine articles open with the exact pillar link. |
| protein tn, sobitas | `/` | Homepage title, H1, metadata and brand copy preserved. Commercial navigation is added under the category tiles, before product rails. |

The reviewed category title, H1, description and opening now use the same merge in the normal and crawler category renderers. A longer CMS intro cannot replace the reviewed opening on these three pillars. Other categories retain their existing intro policy; canonical, robots and supplementary schema handling were not changed.

## Link inventory

Capitalization follows the surrounding UI; the target phrase is the same.

| Source / rendered location | `/whey-proteine` anchor | `/proteines` anchor | `/creatine` anchor |
| --- | --- | --- | --- |
| Homepage, category band immediately below hero (`CategoryRail`) | Whey protein en Tunisie | Catalogue de protéines (taxonomy tile) | Créatine monohydrate en Tunisie |
| Homepage, existing lower navigation / editorial paragraph (`HomePageClient`) | Whey protein en Tunisie / whey protein en Tunisie | Catalogue de protéines | Créatine monohydrate en Tunisie / créatine monohydrate en Tunisie |
| Desktop product menu, mobile header category menu, legacy mobile product menu | Whey protein en Tunisie | Catalogue de protéines (including former “Tout voir”) | Créatine monohydrate en Tunisie |
| CMS navbar/sidebar item, when its URL is one of these targets | Whey protein en Tunisie | Catalogue de protéines | Créatine monohydrate en Tunisie |
| Footer's fixed category links | Whey protein en Tunisie | — | Créatine monohydrate en Tunisie |
| CategoryGrid, shop subcategory links and category directory | Whey protein en Tunisie | Catalogue de protéines | Créatine monohydrate en Tunisie |
| Related categories and crawler category/breadcrumb links | Whey protein en Tunisie | Catalogue de protéines | Créatine monohydrate en Tunisie |
| Product page's category breadcrumb and related-product “Voir tout” link | Whey protein en Tunisie | Catalogue de protéines | Créatine monohydrate en Tunisie |
| Hero image link, **only when configured to point at a target** | Whey protein en Tunisie (accessible name) | Catalogue de protéines (accessible name) | Créatine monohydrate en Tunisie (accessible name) |
| `/proteine-sousse`, shopping category links | Whey protein en Tunisie | — | Créatine monohydrate en Tunisie |
| Brand SEO related-category configuration (concurrent session) | Whey protéine en Tunisie | — | — |
| French `blogSeoConfig.internalLinks`, wherever those destinations already occur | whey protein en Tunisie | catalogue de protéines | créatine monohydrate en Tunisie |
| Blog's existing lower commercial CTA | whey protein en Tunisie (one contextual link replaces three repetitive links) | — | créatine monohydrate en Tunisie |
| `/proteines`, first introductory paragraph | whey protein en Tunisie | — | — |

The new homepage links render even when category data is empty. Menu labels wrap rather than truncate. Menu contents still require interaction, as before; the homepage band and footer supply links in initial HTML. Other taxonomy-derived links render when the relevant category exists in their data.

The audit also inspected content/category JSON, taxonomy link injection and existing blog body-link HTML. Existing contextual prose links that already name whey/creatine remain; automatic prose linking preserves the matched words. Arabic article links retain Arabic wording. Product URLs such as `/creatine/{product}` are product links and retain product-name anchors. No blanket rewriting of stored CMS article HTML was attempted.

## Titles and H1s of competing surfaces

These are the checked-in/resolved copy contracts, **not live observations**. The sandbox cannot reach the production site. Blog metadata passes these headlines through the existing article-title helper, which adds ` | Protéine Tunisie` only when within its title budget; the visible H1 is the headline below.

| Surface | Title | H1 |
| --- | --- | --- |
| Homepage `/` — common entry for whey/protein/creatine | Protéine Tunisie \| Protein.tn, boutique à Sousse | Protéine Tunisie — Protein.tn, boutique à Sousse et livraison partout en Tunisie |
| Category `/whey-proteine` | Whey Protein Tunisie \| Prix, Marques & Comparatif \| Protein.tn | Whey protein en Tunisie : prix et marques |
| Parent `/proteines` | Catalogue de protéines : types et formats \| Protein.tn | Catalogue de protéines : tous les types et formats |
| Category `/creatine` | Créatine Tunisie \| Monohydrate, Prix & Comparatif \| Protein.tn | Créatine monohydrate en Tunisie : prix et formats |
| Blog `/blog/creatine-a-quoi-ca-sert-et-pourquoi-en-prendre` | Créatine : à quoi ça sert et pourquoi en prendre ? | Same headline |
| Blog `/blog/proteines-tunisiennes-tout-ce-que-vous-devez-savoir` | Protéines : sources alimentaires et compléments, les différences | Same headline |
| Blog `/blog/protein-the-essential-guide-to-its-benefits-sources-and-role-in-nutrition` | Protéines : leur rôle dans la nutrition et les sources alimentaires | Same headline |
| Blog `/blog/whey-protein-et-entrainement-strategies-pour-des-gains-musculaires` | Whey et entraînement : comment organiser ses apports en protéines | Same headline |
| Blog `/blog/creatine-monohydrate-tunisie-guide-d-achat-bienfaits-et-meilleures-marques` | Créatine monohydrate : critères de choix et lecture des étiquettes | Same headline |

Previously `/proteines` had H1 “Protéines en Tunisie : whey, isolate et nutrition sportive” and opened “Vous cherchez une protéine en Tunisie ?”. It now introduces the parent catalogue and delegates whey shopping in its first paragraph. Whey and creatine category titles remain explicitly commercial. Blog headlines describe informational questions, nutrition, training or label-reading, and their opening paragraphs send buyers to the commercial pillar. The homepage keeps its existing brand targeting.

## Five opening body links

| Blog slug | Opening anchor → pillar |
| --- | --- |
| `creatine-a-quoi-ca-sert-et-pourquoi-en-prendre` | créatine monohydrate en Tunisie → `/creatine` |
| `proteines-tunisiennes-tout-ce-que-vous-devez-savoir` | whey protein en Tunisie → `/whey-proteine` |
| `protein-the-essential-guide-to-its-benefits-sources-and-role-in-nutrition` | whey protein en Tunisie → `/whey-proteine` |
| `whey-protein-et-entrainement-strategies-pour-des-gains-musculaires` | whey protein en Tunisie → `/whey-proteine` |
| `creatine-monohydrate-tunisie-guide-d-achat-bienfaits-et-meilleures-marques` | créatine monohydrate en Tunisie → `/creatine` |

All five lacked their own config entries before this change. `openingLinkHtml` is prepended to the selected French/fallback body on the server, before the client splits content for recommended products. Existing appended `bodyLinkHtml` entries for other posts keep their placement. URLs, indexing and stored CMS bodies remain intact.

## Files

All paths below are relative to `frontend/`.

| File | Change and purpose |
| --- | --- |
| `content/categories/proteines.json` | Parent catalogue metadata/H1/opening and downward whey link. |
| `content/categories/whey-protein.json` | Whey commercial H1; this is the existing content alias for `/whey-proteine`. |
| `content/categories/creatine.json` | Monohydrate commercial H1. |
| `src/util/categoryAnchor.ts` | Shared labels for the three intent destinations, including same-site absolute URLs. |
| `src/util/resolveCategorySeo.ts` | Shared curated merge; explicit opening-copy precedence for the three pillars. |
| `src/app/(shop)/category/[slug]/page.tsx` | Reuse shared merge; commercial related-category names. |
| `src/app/x-crawler/category/[slug]/page.tsx` | Reuse the same curated merge. |
| `src/app/(shop)/category/CategorySeoLanding.tsx` | Related-category anchor labels. |
| `src/app/components/crawler/CrawlerCategoryView.tsx` | Category and linked breadcrumb labels. |
| `src/app/components/CategoryRail.tsx` | Early homepage commercial links, catalogue tile label and empty-data link availability. |
| `src/app/components/HomePageClient.tsx` | Align existing lower category anchors. |
| `src/app/components/HeaderClient.tsx` | CMS nav and mobile category anchors; wrapping. |
| `src/app/components/ProductsDropdown.tsx` | Desktop menu anchors, including “Tout voir”; wrapping. |
| `src/app/components/MobileProductsMenu.tsx` | Legacy mobile category and subcategory anchors. |
| `src/app/components/FooterClient.tsx` | Sitewide whey and monohydrate anchors. |
| `src/app/components/Hero.tsx` | Category-specific accessible names for configured image links. |
| `src/app/components/CategoryGrid.tsx` | Taxonomy tile anchors and accessible names. |
| `src/app/(shop)/shop/ShopPageClient.tsx` | Subcategory and directory anchors. |
| `src/app/(shop)/products/[id]/ProductDetailClient.tsx` | Category breadcrumb and related-rail category anchor. |
| `src/app/(shop)/proteine-sousse/page.tsx` | Commercial category anchors. |
| `src/config/blogSeoConfig.ts` | Five informational headlines/opening links; French target-category anchors. |
| `src/app/(shop)/blog/[slug]/page.tsx` | Prepend opening paragraph before body splitting/recommendations. |
| `src/app/(shop)/blog/[slug]/ArticleDetailClient.tsx` | Commercial CTA anchors; remove repetitive whey links. |

Verification helpers and logs are under `output/p15-*`, separate from application code.

## Verification and limits

- `npx --no-install tsc --noEmit` — pass. The local npm-prefix override points the installed launcher at `C:/Program Files/nodejs`; no package downloads.
- `npm run typecheck` — pass, including the later concurrent brand changes.
- `npm run lint:design` — pass, “baseline holding”.
- `npm run lint` — pass with existing warnings, zero errors.
- `NEXT_DIST_DIR=.next-p15 npm run build` — pass, including prebuild guards and production bundle assertion.
- `NEXT_DIST_DIR=.next-p15-final npm run build` — pass after menu wrapping and final label edits; directory did not exist when started.
- `node output/p15-verify.cjs` — pass: category metadata/opening precedence against deliberately conflicting longer CMS copy, unrelated-category CMS precedence, unchanged canonical/robots fields, five opening links surviving the prose injector, rendered menu/rail anchors and empty-data homepage links.
- Local Chromium fixture render at 390px and 1440px, light/dark: category rail has no horizontal page overflow; screenshots in `output/p15-ui-*.png`. This is component-fixture QA, not a production-page or full interactive-navigation audit.
- `git diff --check` — pass. Build-added TypeScript include changes restored without reverting unrelated work.
- Read-only live fetch — blocked: `curl: (7) Failed to connect to protein.tn port 443`. Build-time backend fetches likewise logged `EACCES`; compilation and all build guards passed. Actual CMS bodies, live title/H1 output and menu data still need a reachable environment for verification.
- No rating/review markup changes, protected-file edits, redirects, noindex changes, staging, commits, pushes or deployment. Rankings are not verified or guaranteed by these local checks.
- Concurrent work appeared in `src/config/brandSeoConfig.ts` and `src/app/(shop)/brand/BrandSeoLanding.tsx` after the final Phase 15 build. That session overwrote the one-line brand-anchor edit, so these files are excluded from the Phase 15 file manifest. Their current “Whey protéine en Tunisie” links still name the whey target. Their added brand content is not part of this task or its build verification; subsequent typecheck/design lint passed with it present.
