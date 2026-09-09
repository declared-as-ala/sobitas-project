# Affiliate vanity subdomains — `ali.protein.tn`

*(The file keeps its old name because notes elsewhere link to this path. The module is **Affilié**;
"partner" survives only in legacy identifiers.)*

**Goal (owner):** *"maybe you can do for each affiliate something like x.protein.tn as a subdomain.
And he sends it, and we detect that this website is opened from an affiliate subdomain. And when
they buy, we detect that someone buys from the affiliate."*

An affiliate hands out `ali.protein.tn`. It **serves the normal storefront** — same catalogue, same
prices, same checkout — and every visit that starts there is attributed to `ali` for 30 days. The
address bar keeps reading `ali.protein.tn` for the whole session, which is the part that made the
subdomain worth building.

```
ali.protein.tn/whey-proteine   →  200, the storefront
                                  Set-Cookie: pt_aff=ali; Domain=.protein.tn; HttpOnly; Max-Age=30d
                                  X-Robots-Tag: noindex, nofollow
                                  <link rel="canonical" href="https://protein.tn/whey-proteine">
```

---

## This used to redirect, and no longer does

The first version answered `coach-ali.protein.tn/whey` with a **307 to `protein.tn/whey?ref=…`**.
It was right about the danger — a complete crawlable copy of ~11,000 product pages on every
affiliate hostname — and wrong about the price of avoiding it:

1. **The hostname survived one click.** Everything after the first page read `protein.tn`, which is
   the opposite of the "looks more pro" the subdomain existed for.
2. **It moved the cache fragmentation onto the apex.** Cloudflare's cache key includes the query
   string (measured on this site — see `frontend/src/util/referral.ts`), so every affiliate visit
   minted a separate `protein.tn/<path>?ref=<code>` entry for byte-identical HTML: a cold origin
   fetch each time, on the hostname that serves *all* of the organic traffic. Serving on the
   subdomain fragments by hostname instead, and the apex keeps one entry per URL.
3. **A redirect cannot validate.** It attributed to any string somebody typed in front of the
   domain, because there is nowhere in a `next.config` redirect to ask the backend whether the
   affiliate exists.

## What buys the safety back

**`X-Robots-Tag: noindex, nofollow` on every non-apex host**, declared in `next.config.js`
`headers()` — not in middleware, and not as `robots.txt Disallow`. Both of those choices are
load-bearing:

- **Not middleware.** Mutating headers on middleware's passthrough `NextResponse.next()` pinned
  every response to HTTP 200 on this codebase and turned `notFound()` into a soft 404 (the note is
  in `middleware.ts`). A `headers()` rule is applied to the real response whatever its status.
  Verified against a real build: a 404 path on an affiliate host still answers **404**, a retired
  URL still answers **410**, and both still carry the noindex.
- **Not `Disallow`.** A Disallow removes Google's permission to *look*, so it can never see the
  noindex that would drop the URL — the trap `app/robots.ts` documents at length. Crawlable +
  noindex is what actually empties the bucket.

Canonicals needed no change at all: `util/canonical.ts` builds them from `NEXT_PUBLIC_BASE_URL`,
never from the request host, so every page on `ali.protein.tn` already declares
`https://protein.tn/…`. noindex is the directive; the apex canonical is the belt.

`www.protein.tn` is excluded from the rule by a negative lookahead, because `headers` are evaluated
*before* `redirects` and a noindex stamped onto the www → apex 301 is a risk not worth taking.

---

## How a visit becomes an attributed order

| Step | Where |
|---|---|
| Read `Host`, extract the label, refuse reserved names | `frontend/src/util/affiliateHost.ts` |
| Ask the backend whether the label is an active affiliate (cached, fail-safe) | `frontend/src/util/affiliateSubdomains.ts` |
| Answer the question | `GET /api/affilie-subdomains/{sub}` → `AffilieSubdomainController` |
| Write `pt_aff` on the response | end of `frontend/src/middleware.ts` |
| Copy the cookie onto the order payload, discarding any client value | `frontend/src/lib/orderAttribution.ts` |
| Resolve the label to an affiliate and set `commandes.affilie_id` | `CommandeController::storeCommandeApi()` |
| Assign the label to an affiliate | Filament → Affiliés → *Sous-domaine dédié* |

**An unknown subdomain is a normal visit.** No cookie, no attribution, the storefront renders
exactly as it does on the apex. That is also what happens when the backend is unreachable: a
commission is money, and guessing one on a timeout is the wrong way to be wrong.

**Nothing trusts the browser.** The cookie is `HttpOnly`, the proxy overwrites whatever the page
sent, and the backend resolves the label again before it writes a row — the same posture
`CommandeController` already takes with `resolveTokenUser()`, "the ONLY trusted identity".

No commission is accrued at order time. Accrual is gated on delivery, for the reason `PointsService`
records for loyalty points: these are cash-on-delivery orders, so crediting before the customer has
paid would let a place-then-cancel loop farm the ledger.

---

## Constraint on the label

`a–z`, `0–9` and hyphens, 1–32 characters, no leading or trailing hyphen, no `xn--` prefix, and not
one of the reserved names (`www`, `admin`, `dev`, `files`, `next`, `api`, `affilie`, `mail`, … —
the full list is `Affilie::RESERVED_SUBDOMAINS`, mirrored in `affiliateHost.ts`).

Referral **codes** stay at 3–32 characters (`util/referral.ts`): a code is typed into a checkout
field by a human, where two characters collide. A subdomain is clicked, never typed.

---

## Owner actions to switch it on

Nothing below is code, and until it exists the feature is inert — no hostname resolves, so nothing
reaches the app and nothing changes.

### 1. Wildcard DNS

Cloudflare → **DNS** → **Add record**

| Field | Value |
|---|---|
| Type | `CNAME` |
| Name | `*` |
| Target | `protein.tn` |
| Proxy status | **Proxied** (orange cloud) — required, so TLS and the cache rules apply |

Cloudflare's Universal SSL already covers `*.protein.tn` on the Free plan.

### 2. Origin certificate

The origin (Nginx Proxy Manager) also has to answer for the new hostnames. Cloudflare → **SSL/TLS**
→ **Origin Server** → **Create Certificate** → hostnames `protein.tn` and `*.protein.tn` → 15-year
validity. Install it in NPM as a custom certificate on a proxy host whose domain list includes
`*.protein.tn`, pointing at the same Next.js container as `protein.tn`.

**One** certificate and **one** proxy host covers every affiliate, forever — that is what makes a
wildcard cheaper than a Let's Encrypt issuance per coach.

### 3. Assign a subdomain

Filament → **Affiliés** → open the affiliate → **Sous-domaine dédié** → `ali` → Save. The field
normalises a pasted URL, refuses reserved names and enforces uniqueness. A newly assigned subdomain
goes live within a minute (the storefront caches a *miss* for 60 seconds).

### 4. Verify

```bash
curl -sI https://ali.protein.tn/whey-proteine | grep -i "^HTTP\|^set-cookie\|^x-robots-tag"
```

Expected:

```
HTTP/2 200
set-cookie: pt_aff=ali; Path=/; Max-Age=2592000; Domain=.protein.tn; HttpOnly; Secure; SameSite=Lax
x-robots-tag: noindex, nofollow
```

And an unassigned hostname must attribute nothing:

```bash
curl -sI https://not-an-affiliate.protein.tn/ | grep -ic "set-cookie: pt_aff"   # → 0
```

### 5. Optional — a cache rule for the affiliate hosts

Every response on an affiliate hostname carries `Set-Cookie`, deliberately: the value is a pure
function of the hostname, so a cached copy carrying it is *correct* (only visitors who asked for
`ali.protein.tn` can receive `pt_aff=ali`), while a cached copy stripped of it would leave new
visitors unattributed. Depending on how Cloudflare treats `Set-Cookie` on this plan, affiliate
hostnames may bypass the HTML cache and pay an origin fetch per page view. That is acceptable for
traffic nobody arrives at organically. If it ever matters, add a cache rule scoped to
`http.host ne "protein.tn"` rather than removing the cookie.
