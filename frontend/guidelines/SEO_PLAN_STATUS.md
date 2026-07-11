# SEO Plan — Status vs. `SEO_PLAN_PROTEIN_TN.md`

_Reconciliation as of 2026-07-11. Legend: ✅ done · 🟡 partial · ⛔ not done · ↔️ deliberate deviation._

## §1 Keywords & mapping
- ✅ Keyword map exists (`src/data/keywords-seo-tunisie.json`), clusters defined.
- 🟡 **Ranking** for P1 heads (protéine / whey / créatine Tunisie): structurally set up (fast,
  indexable, schema-rich, internally linked, unique category copy). Ranking itself is time + content.
- ⛔ **Local P1 keywords** (protéine **Sousse**, compléments Sousse/Tunis) are under-served in on-page
  meta — see §2 action.

## §2 On-page (meta / slugs / Hn)
- ✅ Every page type has title/description/canonical via `generateMetadata`.
- ✅ Slugs: canonical `/{subcat}/{slug}` products; `/qui-sommes-nous` (was /about); legacy 301s.
- ↔️ `/brands` kept (plan suggested `/marques`) — established + linked; not worth a rename.
- ⛔ **Local angle** (Sousse / SOBITAS) missing from home/contact/about meta → **NEXT (this pass)**.
- 🟡 Image `alt` with keywords — some pages good; not systematic.

## §3 Technical SEO & structured data
- ✅ Organization + LocalBusiness + WebSite **+ SiteNavigationElement** (layout).
- ↔️ **WebSite SearchAction intentionally removed** — Google dropped the sitelinks-searchbox rich
  result (late 2024) and its urlTemplate leaked `?search=` junk URLs into the index. Correct to omit.
- ✅ Product (+Offer +MerchantReturnPolicy +Shipping +AggregateRating/Review) · FAQPage · Breadcrumb ·
  WebPage/CollectionPage on every indexable route (full audit: no gaps).
- ✅ **Sitemap now serves the full 303-product catalogue** (was 0), throws instead of caching empty,
  gates noindex URLs. **Googlebot 404→200 on /sitemap.xml + /robots.txt** (was the "couldn't fetch").
- ✅ robots.txt correct; faceted URLs `noindex,follow`; canonical internal links (no /shop/ hops).
- ✅ Perf: AVIF/WebP + responsive `sizes` + lazy; i18n client bundle slimmed; heavy islands lazy;
  hero direct-static AVIF; ISR. (Biggest remaining lever = **Cloudflare `/_next/image*` cache** — operator.)

## §4 Blog content (12-article calendar)
- ⛔ **Not written** — this is the content phase (planned with the backend LLM). Structure is ready:
  blog + per-article internal links + `BlogSeoBlock` hook. The 12 titles/keywords in the plan are the
  backlog for the LLM content generator.

## §5 Architecture & internal linking
- ✅ Footer → Shop/Packs/Blog/Marques/About/Contact **+ Catégories** (new). Home → shop/packs/blog/
  categories. Product → category + similar. Category → **subcategories** (new). Breadcrumbs everywhere.
  Blog → per-article category/tag links (new). (Blog has 0 backend categories/tags today.)

## §6–8 Local SEO / Backlinks / KPIs
- ⛔ Operator-owned: Google Business Profile, citations, review requests, outreach, GSC/GA4 tracking.
  Not code. (Post-purchase Google-review email = a backend/CRM task.)

---

## Actionable next (in code)
1. **Local on-page** (§2): weave Sousse / SOBITAS + local keywords into home/contact/about meta + H-copy.
2. **Data enrichment** (new ask): populate empty product `nutrition_values` / descriptions from free
   nutrition data so product pages carry unique, factual content (kills thin-content, feeds ranking).
   Safe source = **OpenFoodFacts / USDA FoodData Central** (open, factual) — NOT copying competitor copy
   (duplicate-content + legal risk). Backend Laravel command/job. See separate scoping.
3. **Systematic keyword `alt`** on product/category images.
4. **12 blog articles** — content phase (LLM).
