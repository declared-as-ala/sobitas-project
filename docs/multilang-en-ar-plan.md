# Multilingue EN + AR — plan & estimation (protein.tn)

Owner request, 25/09/2026: *"make the whole website translatable to English and Arabic."*
Decision same day: **plan it, don't rush it tonight.** This is that plan.

## The honest headline
Translating the **whole** site is **~10–14 semaines-ingénieur** + le coût de traduction/relecture de
**~11 000 fiches produits**. It is not a one-night task. Rushed, it ships thin machine-Arabic pages that
Google indexes and that **drag down the French rankings** — the opposite of the goal. Done in phases, each
phase is safe and shippable on its own, and **French URLs never change**.

## What already exists (do NOT rebuild)
- A **client-side i18n scaffold** (`src/i18n/I18nProvider.tsx`, `LanguageSwitcher.tsx`, `legacy-*` dictionaries)
  that is **disabled** — it did a DOM text-swap that caused visible language-mixing. Salvage the ~230 human
  phrases from it, then delete it.
- A **partial `next-intl` setup** (`src/i18n/request.ts`, `src/i18n/index.ts`) — reuse for the message layer.
- `middleware.ts` already handles locale-ish paths and the SEO rewrites — it is the single middleware slot
  and must own locale negotiation too.
- **No `_en` / `_ar` content in the database.** The catalogue is French-only. This is the big lift.

## Architecture (fixed decisions)
- **French stays at the root, unprefixed** (`/whey-proteine`). Only `/en/…` and `/ar/…` are prefixed.
  Middleware rewrites French internally to `/fr/…` (invisible, no redirect) so **no ranking French URL changes**.
- **`next-intl` for UI strings only** (ICU catalogs); the existing SEO middleware keeps the one middleware slot.
- **Content lives in sidecar `*_translations` tables** (product/categ/page), never widening the hot `products`
  table. API emits `${field}_${locale}` with `_fr` fallback.
- **RTL via logical CSS properties** (`ms-/me-/ps-/pe-/start-/end-`), migrated file-by-file.
- **Per-URL index gate:** EN/AR ship live but `noindex` until that page is translated **and reviewed**, then
  flip to `index` + add to the locale sitemap + hreflang. Keeps thin machine-Arabic out of Google at scale.

## Phases (dependency order 0 → 1 → (2 ∥ 3 ∥ 5) → 4 → launch)
| Phase | What | Effort |
|---|---|---|
| 0 | Foundations & guardrails (locale primitives, URL-contract, no user-visible change) | ~2–3 j |
| 1 | **SSR routing + middleware locale negotiation** — the hard gate; `app/[locale]/…` tree, `<html lang/dir>` from SSR | ~2–3 sem |
| 2 | UI string extraction — ~1 300 hardcoded French strings → `messages/{fr,en,ar}.json`, traffic-first | ~4–6 sem (parallélisable) |
| 3 | Backend content translation — `*_translations` tables + API + Filament authoring + MT pipeline for ~11k products | ~3–4 sem + compute traduction |
| 4 | Locale-aware canonical / hreflang / per-locale sitemaps / og:locale | ~2 sem (a besoin de 1+3) |
| 5 | RTL pour l'arabe — physical → logical utilities, delete the `!important` overrides | ~2–3 sem (chevauche P2) |
| 6 | Rollout — EN/AR noindex → flip per-URL when translated; French URLs never 301 | continu |

**Total : ~10–14 semaines-ingénieur** + traduction/relecture des ~11k produits.

## Coût de traduction (au-delà de l'ingénierie)
- **EN** : DeepL (bon marché, qualité forte fr→en). ~11k fiches + UI.
- **AR** : Google Cloud / LLM (DeepL est faible en arabe), + **relecture humaine** des pages à fort trafic.
- Glossaire « ne pas traduire » : marques, noms produits, arômes, unités (g/kg/ml), Whey/BCAA/EAA.
- Levier : traduire d'abord les best-sellers + top catégories + pages légales ; auto-publier « machine » pour
  la longue traîne selon décision owner.

## Recommandation de séquencement
1. **Lancer FR + EN d'abord** (EN est plus rapide et de meilleure qualité via DeepL) — valide toute
   l'architecture (routing, hreflang, sitemaps) avec une langue « facile ».
2. **AR ensuite**, une fois le RTL et le pipeline de traduction rodés, avec relecture humaine sur le haut de gamme.
3. Indexation **par URL**, jamais en masse.

## Risques majeurs (et parade)
1. Ordre du middleware / re-préfixe → mauvais statut HTTP par locale → **matrice curl CI** (fr/en/ar × humain/Googlebot).
2. Indexation d'arabe-machine mince → **gate d'index par URL**.
3. Table `products` héritée fragile → **tables sidecar** `*_translations`.
4. La locale SSR n'atteint pas l'API → **passer `locale` explicitement** dans les fetchers serveur.

## Premier pas concret (quand tu donnes le go)
Exécuter **Phase 0 + Phase 1** comme tranche fondatrice : routing + middleware + arbre `[locale]`, EN/AR **live
mais noindex**, servant encore le contenu français. Ça valide l'architecture la plus risquée avant de s'engager
sur le volume de traduction du catalogue.
