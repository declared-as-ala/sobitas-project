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

## ⚠️ The SAME bug, on a second axis: images

`Vary` is ignored for `Accept` too, and `/_next/image` negotiates its format from `Accept`. So one
cache entry per URL is shared by every format, and **whichever client asks first decides what
everyone else gets**. Measured on the live site — the same URL, cold, filled by three clients:

```
AVIF client first   -> image/avif     49,259 B
WebP client first   -> image/webp     88,222 B
plain client first  -> image/jpeg    163,558 B
```

…and then, asking those same URLs with a *different* `Accept`:

```
the AVIF-filled entry, asked by a plain client -> image/avif   <- a browser that cannot decode
                                                                  AVIF receives AVIF: BROKEN IMAGE
the JPEG-filled entry, asked by an AVIF client -> image/jpeg   <- 114 kB instead of 49 kB
```

**This happened in production.** On 2026-08-03 the homepage hero — the mobile LCP element — was
serving an 80 kB JPEG to every visitor instead of a ~50 kB AVIF, pinned for the full
`max-age=2592000` (**30 days**). Cause: `check-edge-cache.mjs` sent no `Accept` header, so Node
defaulted to a bare wildcard, Next correctly answered JPEG, and Cloudflare cached it. An audit of
all 468 `/_next/image` URLs on the homepage found 463 correctly AVIF and exactly that one wrong —
which is the point: it only takes one request from one badly-behaved client, and the URL it lands
on may be the most important image on the site.

### Owner action 1: purge the poisoned entry — DONE 2026-08-03

**Caching → Configuration → Purge Everything.** Verified afterwards: the hero preload returns
`image/avif · 43 kB`, down from `image/jpeg · 78 kB`.

### Owner action 2: put the format in the cache key

Cloudflare's cache key includes the **query string** on every plan. Next's optimizer reads only
`url`, `w` and `q` and **ignores any extra parameter** — verified against the live origin:

```
/_next/image?url=…&w=750&q=70            -> 200 image/avif  28,801 B
/_next/image?url=…&w=750&q=70&fmt=avif   -> 200 image/avif  28,801 B   (identical)
/_next/image?url=…&w=750&q=70&fmt=jpg    -> 200 image/jpeg  54,231 B   (separate cache entry)
```

So appending a format token derived from `Accept` gives one cache entry per format. The origin
keeps negotiating exactly as it does today; only Cloudflare's filing changes.

> **Not Transform Rules — protein.tn is on the Cloudflare FREE plan.** Rewrite URL rules on Free
> support *static* values only, and a static value cannot read the `Accept` header. An earlier
> revision of this document specified three dynamic Rewrite URL rules; they are not creatable on
> this account. **Snippets** are, and one snippet replaces all three.

**Where:** Cloudflare dashboard → **protein.tn** → **Rules** → **Snippets** → **Create Snippet**.

Name: `image-format-cache-key`. Code:

```js
export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Already tagged (or a retry) — pass straight through, so this can never loop.
    if (url.searchParams.has('fmt')) return fetch(request);

    // Cloudflare ignores `Vary: Accept`, so without this every image format would share ONE
    // cache entry and the first visitor's browser would decide the format for everyone.
    const accept = request.headers.get('accept') || '';
    const fmt = accept.includes('image/avif') ? 'avif'
              : accept.includes('image/webp') ? 'webp'
              : 'base';

    url.searchParams.set('fmt', fmt);
    return fetch(new Request(url.toString(), request));
  },
};
```

Match expression (**Edit expression**):

```
starts_with(http.request.uri.path, "/_next/image")
```

**Exactly one branch of that `if/else` chain can win, so there is no ordering to get wrong.** That
is deliberate — see the post-mortem below, where a design that depended on rule ordering was
ordered wrong.

**Revert:** Rules → Snippets → toggle off, then Purge Everything. Immediate.

Then **Purge Everything** again (the rewrite changes every image cache key) and verify:

```bash
node frontend/scripts/check-edge-cache.mjs --probe-format
```

`--probe-format` is opt-in because it is the one check that can cause the fault it tests for: if
the rules are absent, its legacy-client request pins that URL to JPEG. It probes a product
thumbnail rather than the hero so a failed run costs a thumbnail, not the LCP element.

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
