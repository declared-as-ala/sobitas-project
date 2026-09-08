# Phase 18 — the sitemap's data cache is at 91.6% of a hard ceiling

## The measurement

An audit of the sitemap pipeline today, using the formula in `sitemapData.ts` itself
(`dataCacheItemBytes`) against the real payload:

    6,150 entries = 1,920,506 bytes   vs the 2 MB unstable_cache limit
    ~312 bytes per entry
    ~565 URLs of headroom

`sitemapData.ts:199` memoises the whole crawl in one `unstable_cache` entry:
`unstable_cache(computeSitemapEntries, ['sitemap-entries'], { revalidate: 3600, tags: ['sitemap'] })`.

**What happens when it crosses.** Next silently refuses to store an oversized entry. No error, no
log. `unstable_cache` then stores nothing, `revalidateTag('sitemap')` becomes a dead letter, and
regeneration degrades to the 5-minute in-process snapshot — meaning a **full 23-page upstream API
crawl on every crawler burst**, on `force-dynamic` routes.

This matters now because the catalogue holds **6,566 products** at `seo_robots_index = false`
behind a 250-word thin-content gate. Releasing even a few hundred of them crosses the line, and the
failure is silent — the sitemap would look fine while the cache did nothing.

`sitemapData.ts:258` already names the fix: a `cacheHandler` in `next.config.js`.

## Do

1. Read `frontend/src/util/sitemapData.ts` in full first — especially `dataCacheItemBytes` and the
   comment at :258, which states the intended remedy. Then `frontend/src/util/sitemapSources.ts`,
   `frontend/src/app/sitemap.xml/route.ts` and `frontend/src/app/sitemaps/[file]/route.ts`.
2. Fix it so the cache cannot silently fall over as the catalogue grows. Decide the approach and
   defend it. Two obvious candidates, and you may propose better:
   - a `cacheHandler` in `next.config.js` (what the file itself suggests), or
   - splitting the single entry into per-chunk entries so no one entry approaches the limit, which
     also means a bust only invalidates what changed.
   Whichever you pick, say why, and say what its failure mode is.
3. **Add a guard that fails loudly instead of silently.** The core defect is not the size — it is
   that crossing the limit is invisible. Compute the entry size and fail (or at minimum log a hard
   warning) when it approaches the ceiling, so this never degrades unnoticed again. Print the
   current bytes and the headroom.
4. Do NOT change which URLs are emitted. The 4,802-of-11,368 figure is a deliberate, documented
   thin-content gate owned by the backend (`PromotionGate::DEFAULT_MIN_BODY_WORDS = 250`,
   `CatalogIHerbPromote.php`). Adding the noindexed products to the sitemap would manufacture 6,566
   "Submitted URL marked noindex" errors. Leave that alone.
5. `frontend/scripts/verify-sitemap.sh` step 5 cross-checks product URLs against `pagination.total`
   with `TOLERANCE_PCT=10`. At 4,802 vs 11,368 that is a 57.8% shortfall, so it would print FAIL on
   a healthy sitemap. It is not in the prebuild chain so it breaks nothing today. Fix its premise —
   it should compare against the INDEXABLE count, not the total — and say what you changed.

## Don't

- Do not touch `content/categories/*.json`, `config/blogSeoConfig.ts`, `config/brandSeoConfig.ts`,
  `util/structuredData.ts`, checkout, account, `ProductRequestDialog.tsx`, `globals.css`, or any
  component. Other work is in flight there.
- Do not commit, stage or push. **No network** for code changes; you may curl read-only to verify.

## Acceptance

```
cd frontend
npx tsc --noEmit
npm run lint:design      # must print "baseline holding"
npm run lint
NEXT_DIST_DIR=.next-p18 npm run build   # a dist dir that does not exist yet
```

Build into a directory you just created — a reused one served stale output earlier today. Note two
people hit a second form of this: a running dev server appends its own `.next-*/types/**` to
`tsconfig.json`'s `include`, so stop dev servers and `git checkout frontend/tsconfig.json` before
building.

Then serve that build and prove the sitemaps are unchanged: all seven children, same URL counts
(static 13 / listings 1107 / products-0 2812 / products-1 1336 / products-2 654 / blog 223 /
pages 5 = 6,150), and the index still lists seven.

Report: the approach and why, the measured entry size before and after, the headroom the guard
reports, and proof the emitted URLs are byte-identical.
