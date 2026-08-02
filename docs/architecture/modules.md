# Module Inventory

Every module across the 13 dimensions. **Status is the most important field** — most of this
platform exists, and treating a built module as unbuilt is the expensive mistake available here.

`BUILT` surface or extend, do not rebuild · `PARTIAL` exists but incomplete · `ABSENT` not started

Complexity: **S** ≤3d · **M** 4–10d · **L** 11–25d · **XL** >25d

---

# BUILT

## Catalogue & merchandising — BUILT
**Why** Everything else hangs off the product record. **Value** The entire revenue base.
**Architecture** Laravel `Product`/`Brand`/`Categ`/`SousCategory`/`Aroma`/`Tag`, Filament CRUD, cached API.
**DB** French-slug columns (`designation_fr`, `publier`, `rupture`, `qte`, `prix_ht`). **Both `categories` and `categs` exist — `Categ` uses `categs`; a migration once targeted the wrong one and silently matched zero rows.**
**API** `/categories`, `/all_products`, `/product_details/{slug}`, `/productsByCategoryId/{slug}` — 60–300s cache.
**UI** Storefront listings + PDP. **SEO** The primary indexable surface; `ProductSchemaBuilder` emits Product+Offer.
**Security** Public read; writes admin-only. **Perf** `/api/all_products` **ignores `per_page` and returns all 303 products — 799 kB of the 1 MB `/shop` document.**
**Scale** Fine to ~5k SKUs; then server-side faceting is required. **Risks** The `categories`/`categs` duplication will bite again.
**Complexity** — **Depends** nothing.

## Orders & checkout — BUILT
**Why** Converts intent to revenue. **Value** Direct. **Architecture** `Commande` + `CommandeDetail`, `CommandeObserver` fans out to commission, loyalty and stock. COD-first.
**DB** `commandes.etat`: `nouvelle_commande`, `en_cours_de_preparation`, `expidee`, `livree`, `annulee`, `retournee`.
**API** `POST /add_commande`, `GET /commande/{id}` — guest access validated by `?email=`/`?phone=`, correct for COD without accounts.
**UI** `CheckoutPage.tsx` — **494 lint violations, the worst file in the codebase.** Migrate last (Stage 6 Wave 4).
**SEO** noindex. **Security** Coupon and loyalty redemption **re-validated server-side**; idempotent observers prevent double-award.
**Perf** Longest client-side path. **Scale** Fine. **Risks** The observer is load-bearing for three subsystems; changing it changes money.
**Complexity** — **Depends** catalogue, stock, coupons, loyalty, partners.

## Invoicing & POS — BUILT
**Why** Tunisian legal compliance. **Value** Operational necessity; wholesale depends on it.
**Architecture** Devis (`Quotation`) → BL (`Facture`) → Facture TVA (`FactureTva`), plus `Ticket` POS and `CreditNote`. `InvoiceCalculator` is the single source of totals; `NumberSequenceService` numbers documents; DomPDF prints.
**DB** Header+detail per document type. **API** Filament-internal; no public surface.
**UI** Filament, incl. a custom POS page. **SEO** none. **Security** Admin-only; sequences must never gap.
**Perf** PDF generation is synchronous. **Scale** Fine. **Risks** Legal formatting; **`net_a_payer = prix_ttc + timbre + frais_livraison` must not drift between screen, print and PDF.**
**Complexity** — **Depends** catalogue, clients.

## Stock — BUILT
**Why** Overselling on COD is a refund and a lost customer. **Value** Margin protection.
**Architecture** `StockMovement`, `StockService`, `StockReportService`, `LowStockProducts` page.
**DB** Bidirectional `qte` ↔ `rupture` sync. **API** Exposed via product payloads. **UI** Filament + storefront stock chips.
**SEO** Feeds `availability` in Product schema — wrong values are wrong rich results.
**Security** Admin-only. **Perf** Fine. **Scale** Single-warehouse; multi-location is a schema change.
**Risks** Restore-on-cancel/delete was **missing and caused wrongly out-of-stock products** (fixed #100–#101); a one-time reconciliation is still outstanding.
**Complexity** — **Depends** orders.

## Reviews & UGC — BUILT
**Why** Social proof and rich results. **Value** Conversion + SERP stars.
**Architecture** `Review` with `ai_moderation` JSON, `ReviewModerator` (LLM gate), tokenised verified-purchase flow, `SendDueReviewRequests` 3 days post-delivery, `scopeAttested`.
**DB** `note`/`stars`, `publier`, `ai_checked_at`. **API** Public `GET /reviews/order/{token}` + `POST /reviews/by-order` — deliberately public so COD guests without accounts can review.
**UI** PDP + a dedicated reviews route. **SEO** `AggregateRating` **only from attested purchases**.
**Security** Token-gated, single-use. **Perf** Aggregates cached. **Scale** Fine.
**Risks** **All 203 pre-existing reviews were unpublished as unattested** — stars rebuild from the request engine, which requires orders to be marked delivered. Fabricating reviews is a manual-action risk and is prohibited outright.
**Complexity** — **Depends** orders.

## Loyalty — BUILT (needs unification)
**Why** Repeat purchase. **Value** LTV. **Architecture** `LoyaltyService` + `PointsService`; QR cards, in-store scan, checkout redemption; `config/loyalty.php`.
**DB** **Two parallel ledgers: `LoyaltyPointTransaction` and `UserPointTransaction`.**
**API** `/loyalty/card`, `/loyalty/transactions`, `/loyalty/validate-redemption`, admin `/loyalty/scan`.
**UI** Account tab + checkout redemption. **SEO** none. **Security** `qr_token` is 48 random chars and **never encodes the client id**; redemption re-validated server-side; balances derived from an append-only ledger.
**Perf** `SUM(points)` per read — cache at scale. **Scale** Fine. **Risks** **Two ledgers = two balances for one customer. Unify before promoting the programme.**
**Complexity** S to unify — **Depends** orders, auth.

## Affiliate / Partner B2B — BUILT, INVISIBLE
**Why** Distribution through coaches and gyms. **Value** Highest untapped revenue ceiling.
**Architecture** Append-only commission ledger, derived balance, `/partner` Filament panel with scoped queries. See [`b2b-platform.md`](b2b-platform.md).
**DB** `partners`, `partner_codes`, `partner_commission_transactions`, `partner_payouts`; `partner_id` on `coupons` and `commandes`.
**API** Panel-internal. **UI** Filament default — functional, not sellable.
**SEO** **No public acquisition page exists.** **Security** Partner isolation verified. **Perf** Fine.
**Scale** One type, one rate — coach/gym/influencer/wholesale differ in more than a percentage.
**Risks** Commercially dormant; the engine ages while unused.
**Complexity** M to surface — **Depends** orders, coupons.

## Marketing & CRM — BUILT
**Why** Owned audience. **Value** Cheapest repeat revenue.
**Architecture** `MarketingCampaign/Log/Setting/Template`, `MarketingService`, `SmsService`, `RecipientResolver`.
**DB** Campaign + per-recipient log. **API** admin `POST /send_mail`. **UI** Filament Send Email/SMS.
**SEO** none. **Security** Admin-gated. **Perf** Should be queued. **Scale** SMS cost is the limit.
**Risks** **Bulk email to real customers requires explicit owner go-ahead.** Consent records must exist before any campaign.
**Complexity** — **Depends** clients.

## Content & blog — BUILT, UNDER-INDEXED
**Why** Topical authority. **Value** The main organic lever.
**Architecture** `Article`, `ArticleType`, `BlogCategory`, `BlogTag` + pivots; ISR with on-demand revalidation.
**DB** Per-article language resolution — 31 Arabic posts distinguished from French. **API** `/all_articles`, `/article_details/{slug}`, `/blog/category/{slug}`.
**UI** `/blog`. **SEO** **224 published, ~40 indexed. The single cheapest win available.**
**Security** Public read. **Perf** ISR 3600s. **Scale** Fine. **Risks** Orphan articles reachable only from a paginated index.
**Complexity** S–M to fix indexation — **Depends** nothing.

## SEO engine — BUILT
**Why** Ranking is the growth channel. **Value** Compounding.
**Architecture** `SeoPage`, `Redirection`, `seo_health_checks`, `PageSeoDefaults`, `ProductSchemaBuilder`, `SeoHealthMonitor`, `SeoNotifier`; daily `seo:health-check` fetching the live site **as Googlebot**; `seo:self-heal`; IndexNow.
**DB** `seo_pages`, `redirections`, `seo_health_checks`. **API** `/seo_page/{name}`. **UI** Filament.
**SEO** — it is the module. **Security** Admin-only. **Perf** Scheduled, off-peak.
**Scale** Fine. **Risks** **The scheduler container did not exist until 2026-07-28 — every scheduled SEO command had never run.**
**Complexity** — **Depends** catalogue, content.

## Media pipeline — BUILT
**Why** Image weight drives LCP. **Value** Core Web Vitals + perceived quality.
**Architecture** `ConvertUploadedImageToWebp` — lossless master so the only lossy encode is at serve time; `MediaLibraryItem`, `MediaManagerService`, `AuditMediaIntegrity`.
**DB** Paths on owning models. **API** `/storage/{path}` via nginx.
**UI** Filament media page. **SEO** Alt text; feeds `next/image`.
**Security** Upload validation. **Perf** **Lossless encoding is expensive; a 25s per-request budget prevents the gallery save from hitting nginx's 60s `fastcgi_read_timeout` (PR #210).**
**Scale** Conversion belongs on the queue at higher volume. **Risks** Uploads live on a host bind-mount outside git — never let a deploy touch it.
**Complexity** — **Depends** nothing.

## Logistics (Aramex) — BUILT
**Why** Delivery outside Sousse/Tunis. **Value** Reach.
**Architecture** `AramexService`. **DB** Shipping fields on `commandes`/`factures`. **API** Aramex.
**UI** Filament. **SEO** none. **Security** Credentials in env. **Perf** Sync call at label time.
**Scale** Single carrier. **Risks** No retry/fallback. **Complexity** S to harden — **Depends** orders.

## Auth & accounts — BUILT
**Why** Identity across web, mobile and partner. **Value** Enables everything personalised.
**Architecture** Sanctum, 90-day tokens; NestJS verifies by SHA-256 against `personal_access_tokens` + 5-min Redis cache.
**DB** `users`, `personal_access_tokens`. **API** `/login` (10/min), `/register` (5/min), `/user`, `/profil`.
**UI** Login/register/reset. **SEO** noindex. **Security** Rate-limited; **Laravel is the only issuer — NestJS reads, never writes.**
**Perf** Redis-cached. **Scale** Fine. **Risks** Role handling is a raw `role_id` integer; a real permission model is needed as partner types multiply.
**Complexity** — **Depends** nothing.

## Fitness tracking · Workouts · AI coach — BUILT, MOBILE-ONLY
**Why** Daily-habit surface; the reason to open the app when not buying. **Value** Retention, and a genuine differentiator no Tunisian competitor has.
**Architecture** NestJS modules: `trackers` (water/protein/body), `workouts`, `workout-plan`, `supplements`, `ai-coach` (Gemini + `ChatHistory`), `meal-scan`.
**DB** `fitness_*` (Prisma), same MySQL. **API** `:4000`, Sanctum-verified. **UI** **Expo app only — no web surface.**
**SEO** None today; workout and exercise libraries are strong indexable candidates.
**Security** Health data — treat as sensitive; never expose in public payloads. **Perf** Redis-cached auth.
**Scale** Fine. **Risks** **Built, deployed, and unreachable from the web.** AI output must never give dosage or medical advice.
**Complexity** M to surface — **Depends** auth, catalogue.

## Mobile app — BUILT
**Why** Push, habit, offline. **Value** Retention. **Architecture** Expo, talks to both backends.
**DB** — **API** both. **UI** own. **SEO** app-store only. **Security** Sanctum.
**Perf** — **Scale** — **Risks** A third client to keep in sync with every API change.
**Complexity** — **Depends** auth, fitness API, catalogue.

---

# PARTIAL

## Wishlist — PARTIAL (frontend only)
**Why** Save-for-later is a purchase signal. **Value** Retention + back-in-stock, one of the highest-converting emails in e-commerce.
**Architecture** `FavoritesContext` → **`localStorage` only. No table, no model, no endpoint.**
**DB** none. **API** none. **UI** `/favoris` works, per-device. **SEO** noindex.
**Security** n/a. **Perf** instant. **Scale** n/a.
**Risks** Not cross-device, lost on cache clear, **invisible to marketing** — the demand signal is being discarded.
**Complexity** S — **Depends** auth, stock.

## Search — PARTIAL (no engine)
**Why** Search users convert at multiples of browsers. **Value** Direct.
**Architecture** SQL `LIKE` via `/searchProduct/{text}`, `AsyncSearchService`. **No Scout, Meilisearch, Algolia or Elasticsearch.**
**DB** LIKE scans. **API** uncached. **UI** `SearchBar`. **SEO** search pages noindex; zero-result queries are free keyword research being thrown away.
**Security** Injection-safe via the ORM. **Perf** Uncached full scans. **Scale** Degrades with catalogue growth.
**Risks** **No typo tolerance and no Arabic stemming** — "creatin", "كرياتين" and "protien" all return nothing.
**Complexity** M — **Depends** catalogue.

## Programmatic SEO — PARTIAL
See [`seo-engine.md`](seo-engine.md). Blog exists; ingredient, goal, comparison, glossary and
brand×category entities do not. **Complexity L.**

---

# ABSENT

## Subscriptions — ABSENT
**Why** Protein is consumed monthly — the category is built for it. **Value** **Highest LTV lever available.**
**Architecture** New. **DB** `subscriptions`, `subscription_items`, schedule. **API** manage/pause/skip/cancel.
**UI** PDP toggle + account management. **SEO** "abonnement protéine Tunisie" is uncontested.
**Security** Recurring charges need explicit consent and one-click cancel. **Perf** Scheduled job.
**Scale** Fine. **Risks** **COD-dominant market — a subscription without online payment means a recurring COD delivery, which is operationally different.** Validate demand before building.
**Complexity** L — **Depends** orders, payment.

## Directories (gyms, coaches, nutritionists) — ABSENT
**Why** Local SEO + partner acquisition in one. **Value** Every listing is an indexable page *and* a lead.
**DB** `venues`, `professionals`, geo. **API** public read, claim flow. **UI** map + filters.
**SEO** `LocalBusiness` schema; city × category pages. **Security** Claim verification or it fills with spam.
**Perf** Geo queries need indexes. **Scale** Fine. **Risks** Cold-start — a directory with 5 gyms is worse than none. Seed before launch.
**Complexity** L — **Depends** SEO engine.

## Community — ABSENT
Transformations, challenges, leaderboards, badges. **Value** Retention + UGC; every transformation is content that also sells. **Risks** Needs moderation from day one; before/after photos carry health-claim risk. **Complexity L** — **Depends** auth, fitness.

## Recommendations & personalisation — ABSENT (foundations exist)
`SupplementRecommendationRule` and `SupplementStack` already exist in Prisma. **Value** AOV + conversion. **Risks** Personalising a server-rendered homepage endangers its cacheability — personalise *below* the fold, or at the edge. **Complexity M** — **Depends** catalogue, fitness profile.

## Public API — ABSENT
**Value** Ecosystem play; partner integrations. **Risks** A public contract is permanent — do not publish one until the internal boundary (§2 of the README) is enforced. **Complexity L.**

## Feature flags & experimentation — ABSENT
**Value** Ships risk-reduction for everything above; makes "did it work?" answerable. **Risks** Flags without expiry become permanent dead branches. **Complexity S.**

## Observability — ABSENT
**Value** Currently every incident is diagnosed by reading source. The product-save timeout was found that way because there is no telemetry. **Risks** That approach stops working as the codebase grows past one head. **Complexity M.** **Pull earlier than its phase if incidents recur.**
