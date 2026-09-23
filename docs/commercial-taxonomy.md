# Commercial taxonomy — the one category tree, protein.tn

**Date:** 23/09/2026
**Config:** `frontend/src/config/catalogTaxonomy.ts` — the tree itself, and the only place it is written.
**Guard:** `frontend/scripts/check-taxonomy.mjs` — runs in `prebuild`, so the build fails if the tree drifts.
**Scope:** internal linking and navigation only. **No URL changes.** Every slug below is a live URL
today and stays exactly as it is.

---

## Why this file exists

`GET https://admin.protein.tn/api/categories` returns the tree the back office holds: six rayons and
fifty sub-categories, flat, one level deep, in the order the shop happens to have created them. That
shape is fine for stock-keeping. It is not the shape a buyer reads, and it is not the shape Google
reads.

Google works out a site's hierarchy from navigation and internal links, not from URL folders. So
what a crawler knows about `/creatine` is not "it is a Performance page" — it is "it appeared in a
list of links on the homepage". Nothing in the HTML said the six amino-acid pages belong together,
or that Glutamine is an amino acid and not a wellness supplement.

`catalogTaxonomy.ts` states the relationships once. The header, the rayon pages, the breadcrumbs and
the related-category rails all read that one file, so every surface says the same thing about where
a page sits.

---

## The tree

56 slugs, 6 rayons. Indentation is the relationship, not the URL: every one of these is served at
`/{slug}` at the top level, exactly as it is today.

```
/proteines                         Protéines
  /whey-proteine                   Whey protéine
  /whey-isolate                    Whey isolate
  /whey-hydrolysee                 Whey hydrolysée
  /caseine                         Caséine
  /proteines-vegetales             Protéines végétales
  /proteine-de-boeuf               Protéine de bœuf
  /proteines-multi-sources         Protéines multi-sources
  /barres-proteinees               Barres & snacks protéinés

/prise-de-masse                    Prise de masse
  /mass-gainers                    Mass gainers
  /gainers-proteines               Gainers protéinés
  /glucides                        Glucides & énergie
  /glucides-energie                Glucides & énergie (ancien)     [nav:false]

/performance                       Performance
  /creatine                        Créatine
  /pre-workout                     Pré-workout
  /acides-amines                   Acides aminés
    /bcaa                          BCAA
    /eaa                           EAA
    /glutamine                     Glutamine
    /citrulline                    Citrulline
    /l-arginine                    L-arginine
    /beta-alanine                  Bêta-alanine
    /hmb                           HMB
  /intra-workout                   Intra-workout                   [nav:false]
  /post-workout                    Post-workout                    [nav:false]

/perte-de-poids                    Perte de poids
  /bruleurs-de-graisse             Brûleurs de graisse
  /l-carnitine                     L-carnitine
  /cla                             CLA

/sante-vitalite                    Santé & vitalité
  /vitamines                       Vitamines & minéraux
    /mineraux                      Minéraux
    /magnesium                     Magnésium
    /zinc                          Zinc
    /zma                           ZMA
  /collagene                       Articulations & bien-être
    /omega-3                       Oméga 3
    /articulations                 Articulations
    /antioxydants                  Antioxydants
    /beaute-cheveux                Beauté & cheveux
  /immunite                        Immunité & digestion            [nav:false]
    /probiotiques                  Probiotiques                    [nav:false]
    /digestion                     Digestion & transit             [nav:false]
    /sommeil-stress                Sommeil & stress                [nav:false]
    /enfants                       Enfants                         [nav:false]
  /boosters-hormonaux              Plantes & boosters
    /ashwagandha                   Ashwagandha
    /tribulus                      Tribulus
    /plantes-et-herbes             Plantes & herbes                [nav:false]

/equipement                        Équipement
  /materiel-de-musculation         Matériel de musculation
  /accessoires                     Accessoires
  /cardio-fitness                  Cardio & fitness
  /vetements                       Vêtements                       [nav:false]
```

A group head — `/acides-amines`, `/vitamines`, `/collagene`, `/immunite`, `/boosters-hormonaux` — is
a real page with its own products, not a folder. It heads a theme **and** remains a shelf.

---

## The four defects this corrects

### 1. `/acides-amines` was a sibling of its own children

In the API, `acides-amines`, `bcaa`, `eaa`, `citrulline`, `l-arginine` and `beta-alanine` are six
equal entries under Performance. A crawler reading that sees six unrelated pages that happen to be
next to each other, and has no reason to treat `/acides-amines` as the page that covers the family.

Declared as the parent, those links become one cluster with one head. `/acides-amines` already earns
4 clicks / 42 impressions at position 10.67 (28 days, 22/09/2026 export) — it is the page that was
already doing the job without being told it was the parent.

### 2. Glutamine and HMB were filed under Santé & vitalité

Both are amino acids. In the API they sit between Ashwagandha, Zinc and Oméga 3. They are now under
`/acides-amines`, next to BCAA and EAA — where their buyers are, and where the pages that should
link to them are.

`/hmb` earns 1 click at position 7.5. Nothing about its URL changes; only what links to it does.

### 3. `/glucides-energie` duplicates `/glucides`

Two shelves, same meaning, both live:

| URL | Products | In stock |
|---|---|---|
| `/glucides` | 7 | 6 |
| `/glucides-energie` | 24 | 0 |

`/glucides` is the survivor and keeps the header slot. `/glucides-energie` keeps its URL, keeps
`noindex, follow`, and is linked only from its twin. It is **not** redirected and **not** deleted:
if stock returns to those 24 products, the shelf is still there, with its products' breadcrumb
parent intact.

### 4. Santé & vitalité had 21 flat children

Twenty-one links in one column states nothing — a shopper scans it, gives up, and a crawler records
twenty-one siblings with no relationship. The same twenty-one pages are now four themes:

- **Vitamines & minéraux** — `/vitamines` heading `/mineraux`, `/magnesium`, `/zinc`, `/zma`
- **Articulations & bien-être** — `/collagene` heading `/omega-3`, `/articulations`, `/antioxydants`, `/beaute-cheveux`
- **Immunité & digestion** — `/immunite` heading `/probiotiques`, `/digestion`, `/sommeil-stress`, `/enfants`
- **Plantes & boosters** — `/boosters-hormonaux` heading `/ashwagandha`, `/tribulus`, `/plantes-et-herbes`

`/collagene` heads its theme because it is the rayon's best page: 10 clicks / 146 impressions at
position 19.55 over 28 days, 18 clicks over 3 months.

---

## `nav: false` — what it means, and what it does not

`nav: false` removes a shelf from the **global header** only. It does not change the URL, does not
add a redirect, and does not remove the page from its rayon: every one of these is still one click
away, from the rayon page it belongs to.

It is used for one reason: **nothing on that shelf is buyable today.** A header renders on every page
of the site, so a slot spent on a shelf where every product is out of stock is a slot taken from one
that sells.

| Slug | Rayon | Why it is out of the header |
|---|---|---|
| `/glucides-energie` | Prise de masse | Duplicate of `/glucides`. 24 products, none in stock. Linked only from its twin. |
| `/intra-workout` | Performance | 12 products, none in stock. (Its DB slug is capitalised `Intra-Workout`; the URL is lowercase.) |
| `/post-workout` | Performance | 9 products, none in stock. |
| `/immunite` | Santé & vitalité | Every shelf in this theme is currently unbuyable, so the whole theme is kept off the header rather than half of it. |
| `/probiotiques` | Santé & vitalité (Immunité) | Nothing in stock. Hidden with its theme. |
| `/digestion` | Santé & vitalité (Immunité) | Nothing in stock. Hidden with its theme. |
| `/sommeil-stress` | Santé & vitalité (Immunité) | Nothing in stock. Hidden with its theme. |
| `/enfants` | Santé & vitalité (Immunité) | Nothing in stock. Hidden with its theme. |
| `/plantes-et-herbes` | Santé & vitalité (Plantes & boosters) | Nothing in stock. |
| `/vetements` | Équipement | Nothing in stock. |

Ten of fifty-six. Forty-six stay in the header.

**When stock comes back, delete the `nav: false` line.** That is the whole reversal — no migration,
no redirect to unwind, no URL to recreate. This is why none of these was 301'd or 410'd.

### The rule that runs the other way

A shelf that **earns clicks or impressions** is never `nav: false`, however empty it looks. The build
fails if it is — see T4 below. The reference list is `protectedByTraffic` in
`frontend/src/config/commercialSeoMap.ts`, the same list the cannibalisation rules read.

### The related bug, fixed in the same pass

Six pages that are **in** the nav were serving `noindex` while earning search traffic:

| URL | 28-day traffic |
|---|---|
| `/caseine` | 5 clicks, position 13.4 |
| `/barres-proteinees` | 157 impressions, position 10.3 |
| `/hmb` | 1 click, position 7.5 |
| `/mineraux` | 2 clicks |
| `/articulations` | 1 click |
| `/cla` | 1 click |

The cause was `nothingBuyableHere` in `app/(shop)/category/[slug]/page.tsx`, which noindexes any
listing whose first page of products is entirely out of stock — and never consulted
`protectedByTraffic`. `/mineraux` was already a key of that list and was noindexed anyway, which is
what proved the list was decorative at that call site rather than enforced.

Fixed 23/09/2026: the route now suppresses that noindex for a protected URL, and all six are back to
`index, follow`. Out-of-stock *products* stay indexable per Google's own guidance because stock
returns and they hold long-tail; a *category* of them with measured demand is the same case.
`publishedTotal === 0` — nothing published at all — is a different rule and still noindexes.

Listed here because the two decisions look alike and are not: a page can be out of the nav
(`nav: false`) or out of the index, and neither implies the other. Nothing that earns traffic gets
either, and `check-taxonomy.mjs` rule T4 enforces the first half of that.

---

## The measurement that made this necessary

**23/09/2026, production, Googlebot user-agent.** Of the 56 live taxonomy URLs, the homepage links
**19**. The mega-menu holds one rayon's children in the DOM at a time (`activeSubs.map` in
`ProductsDropdown.tsx`), so the other 37 are reachable only after landing on a rayon page. A shopper
never notices, because hovering loads the panel. A crawler is handed a flat list of nineteen sibling
links with no stated relationship between any of them.

Reproduce it exactly — any POSIX shell (Git Bash on Windows):

```bash
# 1. the 56 live taxonomy slugs, straight from the back office
curl -s "https://admin.protein.tn/api/categories?per_page=200" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const rows=JSON.parse(s).data;const out=[];for(const r of rows){out.push(r.slug);for(const c of (r.sous_categories||[]))out.push(c.slug);}console.log([...new Set(out.map(x=>x.toLowerCase()))].sort().join('\n'));})" \
  > slugs.txt
wc -l < slugs.txt            # 56

# 2. the homepage exactly as Googlebot receives it
curl -s -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
  https://protein.tn/ > home.html

# 3. which of the 56 that page actually links
grep -o 'href="/[a-zA-Z0-9-]*"' home.html | sed 's/href="\///; s/"$//' | tr 'A-Z' 'a-z' | sort -u > homelinks.txt
comm -12 slugs.txt homelinks.txt | tee hit.txt | wc -l      # 19
```

The nineteen, as of the run above:

```
acides-amines  bcaa           caseine        creatine       equipement
glutamine      mass-gainers   omega-3        performance    perte-de-poids
pre-workout    prise-de-masse proteines      sante-vitalite vitamines
whey-hydrolysee whey-isolate  whey-proteine  zma
```

The same crawl of other entry pages, same date and user-agent:

| Page | Links on the page | Taxonomy URLs linked |
|---|---|---|
| `/` | 97 | 19 of 56 |
| `/shop` | 61 | 10 of 56 |
| `/proteines` | 72 | 16 of 56 — its own 8 children |
| `/performance` | 69 | 17 of 56 — 9 of its 10 children |
| `/creatine` | 72 | 10 of 56 — none of its 6 amino siblings |

The tree exists one hop down. It is the **global** surface that is flat.

---

## The guard

`frontend/scripts/check-taxonomy.mjs` runs in `prebuild`, immediately after
`check-commercial-intent-map`. Run it on its own with:

```bash
cd frontend && npm run check:taxonomy
```

It fails the build on five things:

| Rule | Fails when | Why it matters |
|---|---|---|
| **T1** | A slug in the config is not in the live catalogue | That slug is a 404 rendered in the header on every page of the site. |
| **T2** | A live slug is missing from the config | A new shelf exists, is in the sitemap, and nothing links to it — the exact defect this pass corrects. |
| **T3** | A slug appears twice in the tree | The config indexes by slug, so only the last copy survives: the breadcrumb would state one parent while the nav renders another. |
| **T4** | A slug in `protectedByTraffic` is out of the global nav | A page that earns clicks is never hidden to tidy the site up. Being hidden by a `nav: false` ancestor counts. |
| **T5** | A rayon has no nav-visible child | It renders as a header entry with an empty panel: a slot spent stating nothing. |

**T1 and T2 fail open.** They need the live catalogue, so a timeout, an HTTP error, bad JSON or an
empty response prints a warning and exits 0. A back-office hiccup must never fail a deploy, and "I
could not reach it" is not evidence that a category is gone. If the API reports more than one page
of results, T1 alone is skipped — a partial list cannot prove something is absent — and T2 still
runs, because every slug that was read is genuinely live.

**T3, T4 and T5 read only files.** They run, and they fail, whatever the network did.

Current state, 23/09/2026:

```
✓ Taxonomy: 56 slugs across 6 rayons, 46 in the global nav, matched against 56 live slugs,
  no duplicate slug, nothing that earns traffic is hidden.
```

---

## If you are changing the tree

- **Never change a slug to change a URL.** A slug here *is* the URL. A URL change is a redirect, a
  Redirections row and a sitemap consequence — a different job from this file.
- **A new shelf in the back office must be added here**, or T2 fails the next build. Put it under the
  rayon it belongs to; add `nav: false` with a note if nothing on it is buyable yet.
- **A shelf renamed in the back office** is a rename here plus a Redirections row for the old URL.
  T1 fails the build until the config points at the new slug.
- **Reordering within a rayon is meaningful.** Links are read in document order, so the pages that
  carry commercial intent are declared first.
- **Write the reason for a `nav: false` in its `note`**, with a number in it — "24 products, none in
  stock" can be re-checked in a year; "empty" cannot. Where a whole theme is hidden, the note sits on
  the theme head and its children inherit it: `/immunite` carries the reason for the four shelves
  under it. Nothing enforces this, which is exactly why it has to be a habit.
- **Update the tree diagram at the top of this file.** It is a hand-kept second copy of the config
  and `check-taxonomy.mjs` does not read it — none of T1–T5 will tell you it has gone stale. It was
  exact on 23/09/2026; if you change the config and not the diagram, this document starts lying and
  nothing catches it.
