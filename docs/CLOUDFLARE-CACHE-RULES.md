# Cloudflare — cache the HTML at the edge (protein.tn)

**Why:** `curl -I https://protein.tn/` returns `cf-cache-status: DYNAMIC`. Cloudflare is not caching
the storefront's HTML at all, even though the origin already sends
`Cache-Control: s-maxage=300, stale-while-revalidate=31535700` and Next's own cache reports
`x-nextjs-cache: HIT`. Cloudflare does **not** cache HTML by default — it only caches static file
extensions unless you tell it otherwise.

So today every single page view in Tunisia travels to the origin server. Field TTFB is **0.8 s**,
and nothing else can start until the document arrives — the stylesheet request cannot even begin,
which is where most of PageSpeed's *"Render-blocking requests — 1,700 ms"* actually comes from.

**What it is worth:** `Server-Timing: cfEdge;dur=10, cfOrigin;dur=98` — the origin itself is fast.
The win is not origin speed, it is *distance*: a cached page is served from the Cloudflare PoP
nearest the shopper instead of making the edge fetch from the VPS on every request. It also makes
TTFB **consistent**, and `stale-while-revalidate` means no shopper ever waits for a regeneration.

> ⚠️ **The one thing that can break the site.** The origin sends
> `Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch`.
> Cloudflare only honours `Vary` for `Accept-Encoding` — it ignores the rest. Next.js serves the
> **same URL** as either an HTML document or a React (RSC) payload depending on those request
> headers. So a plain "Cache Everything" rule can hand a React payload to a browser that asked for
> a page, which renders as a blank or garbled screen.
>
> **That is why Rule 1 below exists and why it must come first.** Do not create Rule 2 without it.

---

## Rule 1 — bypass cache for React/router requests

**Where:** Cloudflare dashboard → select **protein.tn** → left menu **Caching** → **Cache Rules** →
**Create rule**

| Field | What to enter |
|---|---|
| **Rule name** | `1 — Bypass cache: Next.js RSC requests` |
| **When incoming requests match…** | click **Edit expression** (top-right of the expression box) to get the plain-text editor |
| **Expression** | paste the block below |
| **Then… Cache eligibility** | select **Bypass cache** |

```
(http.request.headers["rsc"][0] ne "") or
(http.request.headers["next-router-prefetch"][0] ne "") or
(http.request.headers["next-router-state-tree"][0] ne "") or
(http.request.headers["next-router-segment-prefetch"][0] ne "")
```

Click **Deploy**.

---

## Rule 2 — cache the HTML

**Create rule** again (this one must sit **below** Rule 1 in the list).

| Field | What to enter |
|---|---|
| **Rule name** | `2 — Cache HTML at the edge` |
| **Expression** | paste the block below |
| **Cache eligibility** | **Eligible for cache** |
| **Edge TTL** | **Use cache-control header if present, bypass cache if not** |
| **Browser TTL** | **Respect origin TTL** |

```
(http.request.method eq "GET"
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

Click **Deploy**.

**Why "use cache-control header if present" and not a fixed TTL:** the app already tells Cloudflare
exactly how long each page may be cached (`s-maxage=300`). Setting a number here instead would
override the app, and the two would drift apart the first time a route's revalidate window changes.

**Why those paths are excluded:** `/_next/` and `/api*` are assets and data that have their own
caching; the account/cart/checkout/auth routes are the ones where a wrongly shared page would be a
privacy problem rather than a cosmetic one. They are excluded even though they are currently
client-rendered — the cost is nothing and the downside of being wrong is severe.

---

## Check it worked (2 minutes later)

Load https://protein.tn/ twice, then run this — or open DevTools → Network → click the first
request → Headers:

```bash
curl -sI https://protein.tn/ | grep -i cf-cache-status
```

- First request after deploying: `cf-cache-status: MISS` ✅ (it is now *eligible*)
- Second request: `cf-cache-status: HIT` ✅ **this is the goal**
- Still `DYNAMIC` ❌ → the rule is not matching. Check Rule 2 is enabled and that its expression
  saved correctly.

**Then test the site properly, because this is the risky change:**

1. Open the homepage, click through to a category, then a product, then back — all via clicking,
   not reloading. Pages must render normally, never blank or as raw text.
2. Add something to the cart, open the cart, go to checkout. The cart must keep its contents.
3. Log in. Your name must appear in the header, and must **not** appear for someone else.

If anything looks wrong: **Caching → Cache Rules → toggle Rule 2 off**, then **Caching →
Configuration → Purge Everything**. That reverts to today's behaviour immediately.

---

## Do NOT enable these

- **Auto Minify** — retired by Cloudflare, and the build already minifies.
- **Rocket Loader** — reorders script execution and reliably breaks React hydration.
- **Early Hints** — it works by re-sending `Link:` headers from the origin, and this origin sends
  none (verified: no `Link` header in the response). It would do nothing here today.

---

## After this, what is left on LCP

This addresses TTFB and most of the render-blocking figure. The remaining items are in the code and
are tracked in the repo:

1. **The stylesheet is 196 kB** (2,399 rules), of which most is unused on any one page. That is the
   accumulated cost of ~2,037 hand-written `dark:` variants; the token migration deletes rules
   rather than rewriting them. It also unblocks `experimental.inlineCss`, which currently *loses*
   because inlining 228 kB costs more main-thread time than the round trip it saves — measured, see
   `next.config.js`.
2. **236 inline SVG icons** = 103 kB of the HTML document and 707 of its 2,000 DOM elements.
