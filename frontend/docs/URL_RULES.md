# URL rules

Every rule here is enforced by a script. If you change behaviour and the scripts still pass, either
the change is fine or the scripts have a gap — fix the gap, don't relax the rule.

```
node scripts/check-url-contract.mjs        static, no network, runs in `prebuild` → fails the build
node scripts/check-indexability-live.mjs   live, against production or a local build
BASE_URL=http://localhost:3000 node scripts/check-indexability-live.mjs
```

The registry both read is [`scripts/urlContract.mjs`](../scripts/urlContract.mjs). Each entry
carries the measurement that put it there.

---

## Why these rules and not others

Search Console names symptoms, never causes, and its buckets feed each other. A 404 that gets a
redirect stops being a 404 and becomes "Page with redirect". A **soft 404** — HTTP 200 on a page
that says "not found" — is not in the 404 bucket at all; it sits in "Crawled - currently not
indexed" forever. You can move URLs between buckets for months without one page entering the index.

The audit of 18/08/2026 found five route families answering **HTTP 200** for content that does not
exist, over unbounded slug spaces, reproduced identically on production and on a local production
build:

| URL | was | why it mattered |
|---|---|---|
| `/blog/{any-invented-slug}` | 200, `s-maxage=600, stale-while-revalidate=31535400` | a soft 404 cached for a year |
| `/blog/tag/{anything}` | 200, no canonical, robots flipped per request | the CMS has **zero** blog tags |
| `/blog/category/{anything}` | 200, no canonical, robots flipped per request | the CMS has **zero** blog categories |
| `/shop/{cat}/{invented}` | 200, `index, follow`, homepage `<title>` | indexable unbounded duplicate |
| `/shop/{invented}/reviews` | 200 | same |

Two root causes, both invisible to any check that only asks whether the site is up:

1. **`app/(shop)/not-found.tsx` did not exist.** The root `app/not-found.tsx` documented it in a
   comment — *"Storefront 404s … are handled by app/(shop)/not-found.tsx instead"* — and the file
   had never been added. With no not-found boundary inside the route group, a `notFound()` raised
   under `(shop)/` rendered an empty main region at **HTTP 200**.

2. **`permanentRedirect()` from a page body degrades to a meta-refresh.**
   `/shop/whey-proteine/whey-isolate` — a *valid* URL — answered:

   ```
   HTTP 200
   <meta id="__next-page-redirect" http-equiv="refresh" content="0;url=/whey-isolate"/>
   ```

   Both legacy `/shop/*` redirect routes had therefore never redirected. `middleware.ts` already
   carried this lesson for `/shop/:slug` ("fires before the page renders, eliminating the
   `__next-page-redirect` meta-refresh tag"); the 3-segment routes never got it.

---

## The rules

### 1. A route may never answer 200 for input it cannot serve

`404` or `410`. Not 200, not a redirect to a hub.

A 200 mints an **unbounded family of near-duplicate pages** — one per slug anyone can invent — and
Google will crawl every one, forever, without indexing any.

*Enforced by `C1` (registration) and `L1` (behaviour).*

### 2. Every dynamic route is registered in `urlContract.mjs`

Adding `app/**/[param]/page.tsx` without an entry **fails the build**. The entry states what the
route answers for a segment that does not exist, whether valid URLs on it are meant to be indexed,
and a sample URL for the positive checks.

*Enforced by `C1`.*

### 3. Status changes belong in `middleware.ts`, not in a page body

Middleware runs before rendering, so its status codes are real. `notFound()` needs a boundary in
the same route group; `permanentRedirect()` from a page body can degrade to a meta-refresh at 200.

Use a page body only when the decision needs data the middleware cannot cheaply have — and then
give the route explicit `noindex` metadata for the path where it falls through.

### 4. `catch` inside `generateMetadata` must rethrow, or return explicit `robots`

Returning `{ title: '…' }` and nothing else lets the **root layout defaults** apply — `index,
follow`, no canonical — to a page whose data failed to load. Three consecutive fetches of
`/blog/tag/whey` returned `noindex`, `noindex`, then `index, follow`, from a CDN `BYPASS`. Whether
a URL was indexable depended on whether one backend call happened to succeed.

For a **transient** failure (429/5xx/timeout) rethrow: an uncached 5xx is retried by the crawler,
whereas a cached wrong answer is believed for the whole revalidate window. For a genuine 404,
return an explicit `noindex`. An indexable fallback must also carry a canonical.

*Enforced by `C2` and `L3`.*

### 5. Every indexable 200 carries exactly one clean self-canonical

Absolute, `https`, apex host (no `www`), no trailing slash, exactly one `<link rel=canonical>` and
one `<meta name=robots>`. A canonical must resolve to a **200 that points at itself** — never to a
redirect, a 404, or a page that canonicalises somewhere else again.

*Enforced by `L4`, `L5`.*

### 6. Browser and Googlebot get the same status and the same indexability

Middleware rewrites crawler user-agents to `/x-crawler/**`, so **every SEO check must run with a
Googlebot UA**. This project has been bitten three separate times by a fix applied only to the
route a browser reaches while Search Console kept reporting the problem.

The rendered *content* may differ (that is what the crawler view is for). The status code and the
robots directive may not.

*Enforced by `L2`.*

### 7. The same URL answers the same way twice

Indexability is not allowed to depend on backend weather.

*Enforced by `L3`.*

### 8. The sitemap lists only final, 200, indexable, self-canonical URLs

Never a noindex URL (that is "Submitted URL marked noindex" by construction), never a redirect,
never a URL that canonicalises elsewhere. A section that fails to load takes the whole sitemap to
`503` rather than publishing a short file — a short sitemap reads to Google as *"those URLs were
removed"*.

*Enforced by `L7`, and by `check-sitemap-routes.mjs` / `check-sitemap-crawl.mjs`.*

### 9. Machine endpoints are disallowed **and** noindexed

`/api/`, `/api-proxy/`, `/x-crawler/`. The two mechanisms fail in opposite directions:

- `robots.txt` stops the crawl but **cannot remove a URL Google already indexed from a link** —
  that is the "Indexed, though blocked by robots.txt" bucket, unfixable by robots.txt alone
  precisely because the crawler is forbidden to fetch the page and see the noindex.
- `X-Robots-Tag` removes it, but only if crawling is allowed.

`/api-proxy/**` was serving 200 JSON with no `X-Robots-Tag` while robots.txt disallowed only
`/api/`; it is now disallowed. The header is declared too but does not arrive — that path rewrites
to a different origin, so Next cannot attach headers to a response it only proxies.

**`/x-crawler/**` is the exception, deliberately.** Refusing it in middleware was implemented and
measured, and it answered Googlebot `404` for `/whey-proteine`, `/shop` and every product page: the
rewrite re-enters middleware on a cold cache, so the guard cannot tell "someone asked for the
internal path" from "we sent them there ourselves". A `next.config` header is no safer — whether it
matches the original path or the rewritten one decides whether the whole site gets `noindex`. The
`Disallow` is the entire defence, `L6` reports the direct-access 200 as an **advisory**, and this
paragraph exists so nobody fixes it again the expensive way.

*Enforced by `C3`, `L6`.*

### 10. A private page that says `noindex` must stay crawlable

A `Disallow` does not remove a URL from the index — it removes Google's **permission to look**. So
a page that is both disallowed and `noindex` is in the worst possible state: Google keeps the URL,
cannot fetch it, and can therefore never discover the `noindex` that would drop it. If the page is
also linked from the header or footer, discovery never stops either, and the URL sits in "Blocked
by robots.txt" permanently. Validation on that row fails forever, because there is nothing a
validation *can* do.

`/cart`, `/checkout`, `/account`, `/login`, `/register`, `/forgot-password` and `/reset-password`
were in exactly that state. They all answer 200 with `noindex`, so the `Disallow` bought nothing
and cost the only mechanism that could retire them. They are now crawlable.

Only machine paths (`/api/`, `/api-proxy/`, `/x-crawler/`, `/admin`) and per-order URLs
(`/order-confirmation/`) stay disallowed — none of them is linked, so none of them accumulates.

*Enforced by `L8`, which fails when a `noindex` page is also disallowed.*

### 11. Dead URL classes are terminal, and never redirected to a hub

WordPress residue and scanner probes get `410`. Not 404 (slower to drain), not 500 (Google treats
it as temporary and **retries**), and above all not a redirect to `/`.

Google documents a redirect to an irrelevant page as a **soft 404**: the hop is spent, the URL is
never retired, and it merely moves from "Not found" to "Page with redirect". `/xmlrpc.php` used to
308 to the homepage for exactly this reason and has been retired to 410.

Every `*.php` path on this origin was answering **HTTP 500** (`/foo.php`, `/index.php`,
`/config.php`, `/admin.php`), as was `/.env`. Now 410.

*Enforced by `L8`.*

### 12. One hop, never two

`http://` → `https://`, `www.` → apex, trailing slash → none, uppercase → lowercase. Each of these
is one 301. Chains spend crawl budget to say nothing.

The one documented exception is `/page/:slug` → `/{slug}`, kept because those URLs carry real
traffic (`/page/creatine-monohydrate-tunisie`, 698 impressions at position 9.58).

*Enforced by `L1`, `L5`.*

---

## Adding a route: the checklist

1. Add it to `ROUTE_CONTRACT` in `scripts/urlContract.mjs`, with a real `why`.
2. Decide the missing-input status **first**. If the answer is 200, the design is wrong.
3. If it is a top-level `/{segment}`, add it to `isReservedRouteSlug`
   (`check-reserved-routes.mjs` will fail the build otherwise — middleware would rewrite it to the
   category crawler view and Googlebot would get a 404 while you get a 200).
4. Decide indexable / noindex, and give it a self-canonical if indexable.
5. Add it to the sitemap only if it is indexable, 200, and self-canonical.
6. Run `node scripts/check-indexability-live.mjs` against a local production build —
   `next dev` does not reproduce ISR, caching, or the meta-refresh behaviour.

## What these rules do *not* cover

- **Content quality.** "Crawled - currently not indexed" is mostly a judgement that a page is not
  worth indexing. No status code fixes that.
- **`/api-proxy` reachability from inside the container**, which is a deployment concern.
- **The `*.php` 500 itself.** Middleware now returns 410 before anything can 500, but the
  underlying reason a dotted `.php` slug throws where `.bar` and `.html` 404 cleanly is not
  diagnosed.
