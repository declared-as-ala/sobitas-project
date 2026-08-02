# Roadmap — ordered by return, not by ambition

Phase 1 optimises for **90-day commercial impact**. The reasoning is simple: most of this platform
is already built and invisible, so the highest return is not the eighth module — it is making the
seven that exist earn money, while the SEO layer compounds behind them.

Effort is in engineer-days. **Confidence** is how sure the return is, and it is deliberately shown,
because a low-confidence high-ceiling bet should not be scheduled like a certainty.

---

## Phase 0 — Unblock (this week, ~2 days)

Nothing here ships a feature. Everything here removes a reason later work fails.

| Task | Effort | Why now |
|---|---|---|
| **`mysqldump --no-data` → baseline migration** | 0.5d | 29 commercial tables are not in git. No local env, no staging, no reviewable schema. **Gates everything.** |
| **Fix the deploy so `nginx/` actually syncs** | 0.5d | The VPS `git pull` fails (exit 128). Server config has silently drifted; any nginx change looks applied and is not. |
| **SSH key auth + immutable image tags** | 0.5d | Password auth as root; a mutable `:latest` already deployed the wrong commit once |
| **Unify the two loyalty ledgers** | 0.5d | `LoyaltyPointTransaction` and `UserPointTransaction` give one customer two balances |

---

## Phase 1 — Make what exists earn (weeks 1–12)

### 1.1 Fix indexation — *highest return on the board*

**184 of 224 published articles are not indexed.** The content is written and paid for.

| Task | Effort |
|---|---|
| Segment sitemaps by type; submit separately | 1d |
| Internal links from products/categories into relevant articles | 2d |
| Audit the 184: canonical, noindex, orphan status, thin body | 2d |
| Re-request indexing, then measure for 30 days | 0.5d |

**Effort 5.5d · Confidence high.** Nothing is being created; something already built is being made
reachable.

### 1.2 Surface the partner programme — *highest revenue ceiling*

A commission ledger, payout flow and self-service panel exist. **No URL exists to send a gym owner to.**

| Task | Effort |
|---|---|
| Public `/partenaires` acquisition page — terms, rates, signup | 2d |
| Self-serve signup → pending partner (today an admin edits `role_id` by hand) | 2d |
| Partner dashboard in Next.js: shadcn + scoped Recharts ([`b2b-platform.md`](b2b-platform.md)) | 5d |
| Marketing assets: QR poster, shareable card, link generator | 2d |

**Effort 11d · Confidence medium-high.** Each partner becomes a distribution channel; the
commission engine is already correct, which is the expensive part.

### 1.3 Wholesale B2B ordering — *largest order values*

`ProductPriceList` implements per-client pricing and **nothing in the storefront reads it.** Quotes,
BL and Facture TVA all exist in Filament.

| Task | Effort |
|---|---|
| Logged-in ordering surface honouring the client's price list | 4d |
| Quote request → existing Devis flow | 2d |
| B2B account page: price list, credit terms, order history | 2d |

**Effort 8d · Confidence medium.** Not a new commercial system — a surface over one that exists.

### 1.4 Search — *conversion, directly*

SQL `LIKE`, no engine, uncached. Worst module on a 303-product catalogue.

| Task | Effort |
|---|---|
| Meilisearch on the existing VPS (self-hosted; French **and** Arabic; typo-tolerant) | 2d |
| Index products, articles, brands, categories; sync on save | 2d |
| Search UI: suggestions, facets, zero-result handling | 3d |

**Effort 7d · Confidence high.** Recommended over Algolia (per-search pricing at scale) and
Elasticsearch (operationally heavy for one VPS).

### 1.5 Server-side wishlist — *retention, cheap*

`localStorage` only: not cross-device, lost on cache clear, invisible to marketing.

| Task | Effort |
|---|---|
| `wishlists` table + API; migrate local → server on login | 2d |
| Back-in-stock notification on wishlisted items | 2d |

**Effort 4d · Confidence high.** Back-in-stock email is among the highest-converting messages in
e-commerce and the stock data already exists.

### 1.6 SEO entity layer — *compounding*

Start narrow: ingredients and goal hubs only. See [`seo-engine.md`](seo-engine.md).

| Task | Effort |
|---|---|
| `Ingredient` + `Goal` entities, admin CRUD, product relationships | 3d |
| Page templates + schema + automated internal linking | 4d |
| Draft ~60 ingredient pages via the existing human-gated AI pipeline | 5d |
| ~10 goal hubs | 2d |

**Effort 14d · Confidence medium** — the ceiling is high but SEO returns arrive in months, not weeks.
Do not expand to the ~470-page plan until these index and rank.

**Phase 1 total: ~50 engineer-days.**

---

## Phase 2 — Ecosystem (months 4–8)

| Module | Effort | Note |
|---|---|---|
| Surface the fitness API to web | 10d | Trackers, workouts, AI coach exist in NestJS and **only the mobile app can reach them** |
| Directories: gyms, coaches, nutritionists | 15d | Local SEO + partner acquisition in one; every listing is an indexable page |
| Full programmatic SEO expansion | 20d | Comparisons, glossary, brand × category — gated on Phase 1.6 |
| Recommendations & personalised homepage | 12d | `SupplementRecommendationRule` and `SupplementStack` already exist in Prisma |
| Subscriptions / recurring orders | 15d | Highest LTV lever; genuinely absent |
| Community: transformations, challenges, leaderboards | 20d | Retention and UGC — every transformation is content |

---

## Phase 3 — Scale (months 9+)

Public API · vendor marketplace · feature flags & experimentation · observability · ERP/accounting
integration · international expansion.

**Observability should arrive earlier than its phase suggests** if incidents recur. The
product-save timeout was diagnosed from source rather than from telemetry, because there is no
telemetry — that only works while the codebase is small enough to hold in one head.

---

## What NOT to build, and why

| Not this | Because |
|---|---|
| A Node/MongoDB rewrite | 61 models, 42 Filament resources and a full Devis/BL/Facture TVA/POS suite work today. A rewrite buys nothing a customer can see. |
| `/ar/` locale routing | Google determines language from **visible content**, not URLs or `lang` attributes. 31 Arabic articles already rank at root. Write 10–15 more, measure 90 days, then decide. |
| A second UI library for dashboards | shadcn + the repaired tokens already give one design system. A second vocabulary is what produced 5,788 lint violations. |
| Nutrition data via AI | People dose themselves on those numbers. No product carries a barcode, so there is no reliable source to join against either. |
| More AI-generated product copy at scale | The pipeline exists and is human-gated. Volume is not the constraint — indexation is. |

---

## Measurement

Each phase carries a number decided **before** the work, not after.

| Work | Metric | Baseline |
|---|---|---|
| Indexation | pages indexed | ~40 of 224 articles |
| Partner programme | active partners; commission-attributed revenue | 0 visible |
| Wholesale | B2B orders/month; AOV | 0 self-serve |
| Search | search→cart rate; zero-result rate | unmeasured |
| Wishlist | wishlist→purchase; back-in-stock CTR | n/a |
| SEO entities | indexed entity pages; non-brand impressions | 0 |
| Storefront | CTR on the 32 pages carrying 29,101 impressions | 0.88% |
