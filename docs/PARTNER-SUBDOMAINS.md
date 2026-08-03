# Partner vanity subdomains — `coach-ali.protein.tn`

**Goal (owner):** *"we can make it subdomain but point to same website, and the only thing change is
the sub is unique so from the sub I know the ref — it looks more pro."*

That is exactly what this delivers. A partner hands out `coach-ali.protein.tn`. Anyone who visits it
lands on the normal storefront with the referral already attributed, and never sees a query string.

```
coach-ali.protein.tn/whey-proteine   →  protein.tn/whey-proteine?ref=coach-ali  →  cookie set,
                                                                                   ?ref= stripped
```

The visitor's address bar ends up clean: `protein.tn/whey-proteine`.

---

## Why it redirects instead of serving the site on the subdomain

This is the one place worth being firm, because the alternative quietly damages the thing this whole
engagement is about.

If the storefront were **served** on every partner hostname, each partner would get a complete,
crawlable copy of the entire catalogue. `robots.ts`, the sitemap builders and `canonical.ts` all bake
`https://protein.tn` at build time, so those copies would advertise the apex as canonical while
Google crawled and evaluated them anyway. For a site whose central, long-running problem is
**indexation**, publishing N duplicate storefronts is the last thing to introduce.

It would also fragment the Cloudflare cache once per partner — the cache key includes the hostname —
so every partner's first visitor pays a cold origin fetch on every page.

The redirect costs one extra hop (~40 ms from the edge) and avoids both. The partner still gets the
link they wanted to print on a poster.

**307, not 308.** A permanent redirect is cached by the browser against that hostname more or less
forever. If a partner leaves or is renamed, every device that ever visited would keep redirecting to
a dead code. Attribution links have to stay revocable.

---

## What is already done (in code, shipped)

`frontend/redirects.js` — a host-conditional rule with a named capture:

```js
{
  source: '/:path*',
  has: [{ type: 'host', value: '(?<sub>[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?)\\.protein\\.tn' }],
  destination: 'https://protein.tn/:path*?ref=:sub',
  permanent: false,
}
```

It sits directly below the `www` rule, so `www` is consumed first and never matches here. The
character class refuses dots, so it cannot match a deeper label. `admin.protein.tn` resolves to the
Laravel origin and never reaches this app at all.

`frontend/src/util/referral.ts` then captures `?ref=`, writes a 30-day first-party cookie and strips
the parameter from the URL — client-side, because on a Cloudflare cache HIT the origin is never
reached.

**This rule is inert until the DNS below exists.** Nothing breaks in the meantime.

---

## Owner actions to switch it on

### 1. Wildcard DNS

Cloudflare → **DNS** → **Add record**

| Field | Value |
|---|---|
| Type | `CNAME` |
| Name | `*` |
| Target | `protein.tn` |
| Proxy status | **Proxied** (orange cloud) — required, so TLS and the cache rules apply |

Cloudflare's Universal SSL already covers `*.protein.tn` on the Free plan, so the browser-facing
certificate needs nothing extra.

### 2. Origin certificate

The origin (Nginx Proxy Manager) also has to answer for the new hostnames. The cheapest correct
option is a **Cloudflare Origin CA** certificate:

Cloudflare → **SSL/TLS** → **Origin Server** → **Create Certificate** → hostnames `protein.tn` and
`*.protein.tn` → 15-year validity. Install it in NPM as a custom certificate on a proxy host whose
domain list includes `*.protein.tn`, pointing at the same Next.js container as `protein.tn`.

This is the step that makes a wildcard genuinely cheaper than per-partner hosts: **one** certificate
and **one** proxy host covers every partner, forever, instead of a Let's Encrypt issuance per coach.

### 3. Verify

```bash
curl -sI https://coach-test.protein.tn/whey-proteine | grep -i "^HTTP\|^location"
```

Expected:

```
HTTP/2 307
location: https://protein.tn/whey-proteine?ref=coach-test
```

Then open it in a browser: the address bar should settle on `protein.tn/whey-proteine` with no
`?ref=`, and `document.cookie` should contain `pt_ref=coach-test`.

---

## Constraint the code already enforces

**The subdomain IS the referral code.** `coach-ali.protein.tn` yields `ref=coach-ali`, so a partner's
code must be a valid hostname label: lowercase `a–z`, `0–9` and hyphens, 3–32 characters, not
starting or ending with a hyphen. `util/referral.ts` validates against `[A-Za-z0-9_-]{3,32}` on both
write and read, which is compatible but slightly wider — underscores are legal in a code typed at
checkout and illegal in a hostname.

When the admin issues codes, restrict them to the hostname-safe subset so that every code works in
all three channels: typed at checkout, `?ref=` link, and subdomain.
