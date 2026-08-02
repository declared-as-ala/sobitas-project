# Protein.tn — Platform Architecture

> The goal is not an e-commerce site. It is the operating system of fitness and nutrition in
> Tunisia: B2C commerce, a B2B partner network, a knowledge platform, and a fitness ecosystem,
> on one identity and one catalogue.

This is the map. Detail lives in:

| Document | Contents |
|---|---|
| [`modules.md`](modules.md) | Every module, analysed across 13 dimensions, with a build/extend/absent status |
| [`b2b-platform.md`](b2b-platform.md) | The partner network, the dashboard stack, and the validated chart palette |
| [`seo-engine.md`](seo-engine.md) | Programmatic SEO: the entity model, page templates, internal linking — the moat |
| [`roadmap.md`](roadmap.md) | Phased, ROI-ordered. Phase 1 optimises for 90-day commercial impact |

---

## 1. The stack, as it actually is

An earlier brief described this platform as *Node.js + Express, MongoDB, Cloudinary, JWT*. None of
that is true, and designing against it would have produced an architecture fitting nothing we own.
Recorded here so it is never repeated:

| Claimed | Actual |
|---|---|
| Node.js + Express backend | **Laravel 12.36.1 + Filament v4.2.0** (PHP 8.3) |
| MongoDB | **MySQL 8.0** + Redis 7 |
| Cloudinary | **Local disk** on a host bind-mount, served by nginx |
| JWT | **Laravel Sanctum** personal access tokens |

There *is* a TypeScript service — `fitness-api/` — but it is **NestJS 11 + Prisma against the same
MySQL database**, not an Express/Mongo storefront backend.

### Five deployables, not two

```
frontend/      Next.js 15.1.6 · React 18.3.1     -> protein.tn            storefront, SEO surface
filament/      Laravel 12 · Filament v4          -> admin.protein.tn      commerce source of truth
fitness-api/   NestJS 11 · Prisma · Redis        -> :4000                 fitness, AI, trackers
mobile/        Expo · React Native                                        member app
old backend/   empty — the deleted legacy app
```

All three CI workflows build a Docker image to GHCR and `ssh` into **one VPS** at
`/root/sobitas-project`. `sobitas-project` is the git root; `frontend/` is not its own repo, so
every revert is `git revert <sha>` at monorepo level.

---

## 2. The decision that matters most: who owns which table

Laravel and NestJS share one MySQL database. That is a legitimate and fast architecture — NestJS can
join `fitness_supplement_recommendations` straight onto Laravel's `products` with no network hop —
and it is also the single easiest way to build a **distributed monolith**: two services writing the
same rows, with business rules in both and transactions in neither.

**The rule, and it is not negotiable:**

> A table has exactly ONE writer. The other service may read it, never write it.
> Cross-service state changes go through the owner's API, not through the shared database.

| Domain | Owner | Tables (prefix) | The other service may |
|---|---|---|---|
| Catalogue, orders, invoicing, stock, clients, coupons, loyalty, partners | **Laravel** | `products`, `commandes`, `factures`, `clients`, `coupons`, `partners`, `loyalty_*`, … | read for joins and display |
| Fitness profiles, trackers, workouts, AI coach, meal scan | **NestJS** | `fitness_*` | read for personalisation |
| Identity | **Laravel** | `users`, `personal_access_tokens` | verify tokens read-only |

**Why identity stays with Laravel:** NestJS already authenticates by SHA-256-matching a Sanctum token
against `personal_access_tokens` and caching the result in Redis for 5 minutes. That is a *read*
against the owner's table — correct. It must never issue or revoke a token itself.

**The enforcement, not just the intention.** A rule in a document is a suggestion. Give the NestJS
Prisma client a database user with `SELECT`-only grants on Laravel-owned tables and full grants on
`fitness_*`. Then the boundary is enforced by MySQL, and a violation fails in CI rather than
corrupting an order six months later.

### Where new features go

```
Does it change money, stock, or an order?          -> Laravel. Always.
Does it need the catalogue but not to change it?   -> NestJS, reading products.
Is it a page Google must index?                    -> Next.js, server-rendered.
Is it member-only, interactive, no SEO value?      -> NestJS + the client that needs it.
```

---

## 3. Blocking issue: the schema is not in version control

151 migrations exist. They create **44 tables — none of them commercial.** `products`, `commandes`,
`clients`, `factures`, `reviews`, `slides`, `articles` and `categs` are only ever
`Schema::table`-altered; they were inherited from the deleted legacy app and exist **only in the
production MySQL instance.**

Consequences, all of them real today:

- `php artisan migrate:fresh` cannot reproduce this system. There is no working local environment
  from a clean checkout.
- No staging environment can be stood up truthfully.
- Nobody can review a schema change, because there is no schema to diff against.
- A `SyncMigrations` console command exists — evidence this has already been reconciled by hand.

**Fix, and it gates everything else in this document:** `mysqldump --no-data` from production,
committed as a baseline migration, with every subsequent change expressed as a migration on top.
Half a day of work. Until then, any architectural claim about the data model is a guess.

---

## 4. Module status

Detail in [`modules.md`](modules.md). The headline is that **most of the platform already exists** —
the work is surfacing and connecting it, not building it.

**Built — surface or extend, do not rebuild (17)**
catalogue & merchandising · orders & checkout · invoicing & POS (Devis/BL/Facture TVA/Ticket) ·
stock · reviews & UGC (attested-purchase, AI-moderated) · loyalty · affiliate/partner B2B ·
marketing & CRM · content & blog · SEO engine · media pipeline · logistics (Aramex) · auth ·
fitness tracking · workouts · AI coach / meal scan / supplement advisor · mobile app

**Partial (3)**
wishlist — `localStorage` only, no server persistence, lost on cache clear ·
search — SQL `LIKE`, no engine ·
programmatic SEO — a blog exists; the encyclopedia, glossary, comparison and goal pages do not

**Absent (7)**
subscriptions · directories (gyms, coaches, nutritionists) · community (transformations, challenges,
leaderboards) · recommendations & personalisation · public API · feature flags & experimentation ·
observability

---

## 5. Principles

1. **Surface before build.** A partner commission ledger with a payout flow already exists and no
   customer or coach can see it. Shipping a landing page for it beats building the eighth module.
2. **One writer per table.** §2.
3. **SEO pages are server-rendered, member pages are not.** Do not pay hydration cost for a page
   Google will never see; do not client-render a page that must rank.
4. **One design system across storefront and dashboards.** See
   [`b2b-platform.md`](b2b-platform.md) — the B2B dashboard reuses the storefront's tokens and
   primitives rather than importing a second component vocabulary.
5. **Verify against the live artifact.** A green CI check is not a deploy; a deploy is not a fix.
   This project has shipped three "successful" deploys that changed nothing on the server.
6. **Never fabricate trust signals.** No invented reviews, no invented nutrition values, no
   `AggregateRating` without attested purchases. This is a hard line, and it is also a moat: it
   is why the review system is purchase-token-gated and AI drafts require human approval.

---

## 6. Known infrastructure debt

| Issue | Impact |
|---|---|
| **`nginx/configuration.conf` never deploys.** The workflow `scp`s only `docker-compose.yml`, and the VPS `git pull` fails (exit 128, observed). | Server config has silently drifted from the repo. Any nginx change looks applied and is not. |
| **SSH password auth** (`secrets.VPS_PASSWORD`), running as root | Single credential, full control, no rotation story |
| **Mutable `:latest` image tag** on a single VPS | Two merges close together already deployed the older commit once (#183/#184) |
| **Two parallel loyalty ledgers** — `LoyaltyPointTransaction` and `UserPointTransaction` | Two balances for one customer; unification needed before loyalty is promoted |
| **`.env.example` says `DB_CONNECTION=sqlite`** | Misleads any new developer who trusts it |
