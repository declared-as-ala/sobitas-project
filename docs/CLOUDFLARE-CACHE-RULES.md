# Cloudflare — cache the HTML at the edge (protein.tn)

**Status: LIVE and verified.** `node frontend/scripts/check-edge-cache.mjs` reports 0 failures
against https://protein.tn. Measured effect on live mobile Lighthouse (median of 5):

| | before | after |
|---|---|---|
| Performance | 87 | **92** |
| TTFB | 81 ms | **38 ms** |
| LCP | 3618 ms | **3053 ms** |

**Why it was needed:** `curl -I https://protein.tn/` returned `cf-cache-status: DYNAMIC`. Cloudflare
does not cache HTML by default — only static file extensions — so every page view in Tunisia
travelled to the origin, and nothing else on the page could start until the document arrived. The
stylesheet request could not even begin, which is where most of PageSpeed's *"Render-blocking
requests — 1,700 ms"* actually came from.

**What it is worth:** `Server-Timing: cfEdge;dur=10, cfOrigin;dur=98` — the origin itself is fast.
The win is not origin speed, it is *distance*: a cached page is served from the Cloudflare PoP
nearest the shopper instead of making the edge fetch from the VPS on every request. It also makes
TTFB **consistent**, and `stale-while-revalidate` means no shopper ever waits for a regeneration.

---

## The one thing that can break the site

The origin sends `Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch`.
**Cloudflare honours `Vary` only for `Accept-Encoding` — it ignores the rest.** Next.js serves the
**same URL** as either an HTML document or a React (RSC) flight payload depending on those request
headers. So a plain "Cache Everything" rule can hand a React payload to a browser that asked for a
page, which renders as a blank or garbled screen.

That is why the rule below excludes those four headers, and why it must stay one rule — see the
post-mortem at the bottom.

---

## The rule (this is what is deployed)

**Where:** Cloudflare dashboard → **protein.tn** → **Caching** → **Cache Rules**

| Field | Value |
|---|---|
| **Rule name** | `Cache HTML at the edge` |
| **Expression** | the block below (via **Edit expression** for the plain-text editor) |
| **Cache eligibility** | **Eligible for cache** |
| **Edge TTL** | **Use cache-control header if present, bypass cache if not** |
| **Browser TTL** | **Respect origin TTL** |

```
(http.request.method eq "GET"
 and not any(http.request.headers["rsc"][*] ne "")
 and not any(http.request.headers["next-router-prefetch"][*] ne "")
 and not any(http.request.headers["next-router-state-tree"][*] ne "")
 and not any(http.request.headers["next-router-segment-prefetch"][*] ne "")
 and not starts_with(http.request.uri.path, "/_next/")
 and not starts_with(http.request.uri.path, "/api")
 and not starts_with(http.request.uri.path, "/api-proxy")
 and not starts_with(http.request.uri.path, "/account")
 and not starts_with(http.request.uri.path, "/cart")
 and not starts_with(http.request.uri.path, "/checkout")
 and not starts_with(http.request.uri.path, "/login")
 and not starts_with(http.request.uri.path, "/register")
 and not starts_with(http.request.uri.path, "/forgot-password")
 and not starts_with(http.request.uri.path, "/reset-password"))
```

`any(headers["x"][*] ne "")` is Cloudflare's documented idiom for "this header is present with a
value". It is not `headers["rsc"] ne ""` because the field is a **map of arrays** and has to be
tested element-wise.

**Why "use cache-control header if present" and not a fixed TTL:** the app already tells Cloudflare
exactly how long each page may be cached (`s-maxage=300, stale-while-revalidate=31535700`). Setting
a number here instead would override the app, and the two would drift apart the first time a route's
revalidate window changes.

**Why those paths are excluded:** `/_next/` and `/api*` are assets and data with their own caching;
the account/cart/checkout/auth routes are the ones where a wrongly shared page would be a privacy
problem rather than a cosmetic one. They are excluded even though they are currently client-rendered
— the cost is nothing and the downside of being wrong is severe.

**Alongside it**, two rules the owner wrote, both verified `HIT`: `Cache static assets (Next.js +
common file types)` and `Cache Next.js optimized images`. Those are left alone.

---

## Verify it — do not trust the dashboard

```bash
node frontend/scripts/check-edge-cache.mjs
```

Must print `0 failure(s)`. Run it after any change to the rules, and after any deploy that changes
how routes are rendered.

**A `cf-cache-status: HIT` proves nothing on its own** — that is the whole design of the script.
Because `Vary` is ignored, the edge can serve the wrong *representation* with a perfectly healthy
cache status. So every request is asserted on **the body it actually received** as well:

- HTML must still be HTML on a HIT
- an RSC request must not receive a document
- a document request *after* an RSC request must not receive flight data — that is cache poisoning,
  and it would be a blank homepage for every visitor
- personalised routes must never be a HIT

If something looks wrong on the site: **Caching → Cache Rules → toggle the rule off**, then
**Caching → Configuration → Purge Everything**. That reverts to pre-caching behaviour immediately.

---

## Post-mortem: the two-rule version was wrong

The first version of this document specified **two** rules — a "Bypass cache" rule for RSC requests
ordered *above* an "Eligible for cache" rule. It was applied to the live site and then measured:

```
RSC / router request (the one that can break the site)
  FAIL  bypasses the cache                        (cf-cache-status: HIT)
  FAIL  returns a React payload, NOT cached HTML  (starts "<!DOCTYPE html>")
```

**Cloudflare Cache Rules are not first-match-wins.** Every matching rule applies, and where two
rules set the same thing, **the last one wins**. So the "Eligible for cache" rule simply overrode
the "Bypass cache" rule on every RSC request. WAF/firewall rules *do* stop at the first match, and
conflating those two semantics is what produced the bug.

The fix was not to reorder — it was to remove the dependency on ordering entirely by folding the
exclusion **inside** the caching rule, so there is one rule and nothing that can override it.

**How bad was it?** Not an outage. Next's router asked for a URL with `RSC: 1`, got HTML back,
detected the mismatch and fell back to a **full page reload** — soft navigation silently degraded
into a whole-page fetch, and every prefetch was wasted bandwidth. The sharper risk was the mirror
image: had an RSC *prefetch* been the first request to populate a cold cache entry, the next
ordinary visitor to that URL would have been served React flight data as their document — a blank
page. `check-edge-cache.mjs` tests for that case specifically (`doc3`); it had not happened, but it
was available.

---

## Do NOT enable these

- **Auto Minify** — retired by Cloudflare, and the build already minifies.
- **Rocket Loader** — reorders script execution and reliably breaks React hydration.
- **Early Hints** — it works by re-sending `Link:` headers from the origin, and this origin sends
  none (verified: no `Link` header in the response). It would do nothing here today.

---

## After this, what is left on LCP

Edge caching addressed TTFB and most of the render-blocking figure. FCP is now **2103 ms** live and
is what gates LCP. The remaining levers are in the code:

1. **The stylesheet is 196 kB** (2,399 rules), most of it unused on any one page — the accumulated
   cost of ~2,037 hand-written `dark:` variants. The token migration *deletes* those rules rather
   than rewriting them. It also unblocks `experimental.inlineCss`, which currently **loses**
   (measured: FCP 1523→1264 ms and LCP 3570→3336 ms, but TBT 316→608 ms and score 81→77, because
   inlining 196 kB trades a round trip for main-thread parse work — see `next.config.js`).
2. **236 inline SVG icons** = 103 kB of the HTML document and 707 of its 2,000 DOM elements.
