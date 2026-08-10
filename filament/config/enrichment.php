<?php

/**
 * Product-enrichment configuration: where we collect product facts, and how hard we lean on each
 * host while doing it.
 *
 * ── THE ONE RULE THAT SHAPES EVERYTHING ───────────────────────────────────────────────────
 * We collect FACTS and we write our own prose. A protein content, an ingredient list, a barcode, a
 * serving size — nobody owns those, anywhere. A supplier's marketing paragraph is a different
 * thing, and copying it onto our page would also be the fastest way to be read as scraped,
 * duplicate content by the very search engine we are trying to rank in. So `store_text` below is
 * about what we may REPUBLISH, not about what we may read.
 *
 * ── RATE LIMITS ARE ENGINEERING, NOT ETIQUETTE ────────────────────────────────────────────
 * A host that notices us blocks us, and a blocked host yields zero facts forever. Slow and
 * unnoticed beats fast and banned. The defaults below are deliberately unhurried: 309 products
 * against a handful of hosts is a background job, not a deadline.
 */
return [

    /*
    |--------------------------------------------------------------------------
    | Discovery
    |--------------------------------------------------------------------------
    | Finding the right page for a product. Measured on the live catalogue: searching a BARCODE
    | returns the manufacturer's own site plus several retailers; searching a product NAME returns
    | nothing usable. The barcode is the query — which is why Stage 1 comes first.
    */
    'discovery' => [
        /**
         * Ordered; the first provider returning results wins.
         *
         * Measured, not assumed. Searching the barcode 5903246226645:
         *   brave      11 distinct hosts incl. the manufacturer's own site — usable
         *   duckduckgo works twice, then answers 202-with-zero-results and stays that way
         *   mojeek / startpage / bing HTML  0 usable external hosts
         *
         * So DuckDuckGo is a last resort rather than the default, and Brave leads among the
         * keyless options. For a 309-product run, get a key: Google Programmable Search is 100
         * queries/day free and Brave's Search API is 2,000/month free. A keyed API also does not
         * silently change shape when a results page is redesigned.
         */
        'providers' => ['google_cse', 'brave_api', 'brave_html', 'duckduckgo'],

        // https://programmablesearchengine.google.com/ — 100 queries/day free.
        'google_cse' => [
            'key' => env('GOOGLE_CSE_KEY'),
            'cx' => env('GOOGLE_CSE_CX'),
        ],

        // https://api.search.brave.com/ — 2,000 queries/month free.
        'brave_api' => [
            'key' => env('BRAVE_SEARCH_KEY'),
        ],

        'brave_html' => [
            'min_interval_seconds' => 3,
        ],

        'duckduckgo' => [
            'min_interval_seconds' => 4,
        ],

        'max_results_per_query' => 10,

        // Hosts that never carry useful product facts, or whose results are noise.
        'ignore_hosts' => [
            'protein.tn', 'facebook.com', 'instagram.com', 'pinterest.com', 'youtube.com',
            'tiktok.com', 'x.com', 'twitter.com', 'reddit.com', 'aliexpress.com',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Fetching
    |--------------------------------------------------------------------------
    */
    'fetch' => [
        // Identify ourselves honestly. A host that wants to talk to us can, and a host that wants
        // us gone can say so — both are better than being mistaken for something worse.
        'user_agent' => env(
            'ENRICHMENT_USER_AGENT',
            'protein-tn-bot/1.0 (+https://protein.tn/about; product data enrichment; web@slamatravel.com)'
        ),

        'timeout_seconds' => 25,
        'max_bytes' => 4 * 1024 * 1024,
        'max_retries' => 3,

        // Default pace for a host with no entry in `hosts` below.
        'default_requests_per_second' => 0.33,   // one request every three seconds

        // Honour robots.txt unless a host is explicitly exempted. It is a routing hint, and
        // following it keeps us out of endless calendars, search pages and login walls as much as
        // it keeps us polite.
        'respect_robots' => true,

        // A 401/403/429 streak means stop, not try harder. Rotating identity to get past a block
        // is how an ingestion job turns into something else — and practically, it earns a
        // permanent ban instead of a temporary one.
        'circuit_breaker_failures' => 5,
        'circuit_breaker_cooldown_seconds' => 1800,
    ],

    /*
    |--------------------------------------------------------------------------
    | Per-host policy
    |--------------------------------------------------------------------------
    | `trust` orders conflict resolution: a manufacturer beats a distributor beats a retailer.
    | `store_text` says whether a description from this host may be kept for a human to READ while
    | writing ours. It is never published verbatim regardless.
    */
    'hosts' => [

        // ---- Manufacturers: the authoritative source for their own products ----
        'ostrovit.com' => ['trust' => 0.95, 'rps' => 0.5, 'store_text' => true, 'type' => 'manufacturer'],
        'ostrovit.eu' => ['trust' => 0.95, 'rps' => 0.5, 'store_text' => true, 'type' => 'manufacturer'],
        'optimumnutrition.com' => ['trust' => 0.95, 'rps' => 0.5, 'store_text' => true, 'type' => 'manufacturer'],
        'myprotein.com' => ['trust' => 0.90, 'rps' => 0.5, 'store_text' => true, 'type' => 'manufacturer'],
        'biotechusa.com' => ['trust' => 0.95, 'rps' => 0.5, 'store_text' => true, 'type' => 'manufacturer'],
        'scitecnutrition.com' => ['trust' => 0.95, 'rps' => 0.5, 'store_text' => true, 'type' => 'manufacturer'],
        'realpharm.pl' => ['trust' => 0.95, 'rps' => 0.5, 'store_text' => true, 'type' => 'manufacturer'],
        'muscletech.com' => ['trust' => 0.95, 'rps' => 0.5, 'store_text' => true, 'type' => 'manufacturer'],
        'dymatize.com' => ['trust' => 0.95, 'rps' => 0.5, 'store_text' => true, 'type' => 'manufacturer'],
        'appliednutrition.uk' => ['trust' => 0.95, 'rps' => 0.5, 'store_text' => true, 'type' => 'manufacturer'],
        'quamtrax.com' => ['trust' => 0.95, 'rps' => 0.5, 'store_text' => true, 'type' => 'manufacturer'],
        'ericfavre.com' => ['trust' => 0.95, 'rps' => 0.5, 'store_text' => true, 'type' => 'manufacturer'],

        // ---- Open databases: free to reuse, with attribution ----
        'world.openfoodfacts.org' => ['trust' => 0.80, 'rps' => 0.25, 'store_text' => true, 'type' => 'open_database'],
        'api.ods.od.nih.gov' => ['trust' => 0.95, 'rps' => 2.0, 'store_text' => true, 'type' => 'government'],
        'api.nal.usda.gov' => ['trust' => 0.95, 'rps' => 3.0, 'store_text' => true, 'type' => 'government'],
        'query.wikidata.org' => ['trust' => 0.85, 'rps' => 1.0, 'store_text' => true, 'type' => 'open_database'],
        'pubchem.ncbi.nlm.nih.gov' => ['trust' => 0.90, 'rps' => 3.0, 'store_text' => true, 'type' => 'government'],

        /**
         * ---- iHerb: catalogue acquisition (see App\Services\Catalog\IHerb) ----
         *
         * `rps` is 0.5 — one request every two seconds. A 61,500-product import is a background
         * task measured in days, not a deadline: at this pace a full hydration run is roughly
         * 34 hours of wall clock, which is fine for something that runs once and then only
         * re-syncs what changed. Going faster buys hours and risks a permanent block, and a
         * blocked host yields nothing ever again.
         *
         * `store_text` is FALSE. iHerb's product descriptions are their copy, and republishing
         * them would also be the fastest way for Google to read our pages as duplicates of a far
         * stronger domain. We take facts — identity, brand, category, pack size — and write our
         * own French titles from them.
         */
        'iherb.com' => ['trust' => 0.70, 'rps' => 0.5, 'store_text' => false, 'type' => 'retailer'],
        'tn.iherb.com' => ['trust' => 0.70, 'rps' => 0.5, 'store_text' => false, 'type' => 'retailer'],
        // Static image CDN — no crawl budget concern, but still paced.
        'cloudinary.images-iherb.com' => ['trust' => 0.70, 'rps' => 2.0, 'store_text' => false, 'type' => 'cdn'],

        // ---- Retailers: read for facts, never for prose ----
        // A retailer's specs table is a fine cross-check on a barcode or a serving size. Its
        // description is written copy and its reviews belong to its customers, so neither is kept.
        'zumub.com' => ['trust' => 0.70, 'rps' => 0.25, 'store_text' => false, 'type' => 'retailer'],
        'bulk.com' => ['trust' => 0.70, 'rps' => 0.25, 'store_text' => false, 'type' => 'retailer'],
        'prozis.com' => ['trust' => 0.70, 'rps' => 0.25, 'store_text' => false, 'type' => 'retailer'],
        'iherb.com' => ['trust' => 0.70, 'rps' => 0.2, 'store_text' => false, 'type' => 'retailer'],
        'amazon.com' => ['trust' => 0.60, 'rps' => 0.15, 'store_text' => false, 'type' => 'retailer'],
        'ebay.com' => ['trust' => 0.55, 'rps' => 0.2, 'store_text' => false, 'type' => 'retailer'],
    ],

    /*
    |--------------------------------------------------------------------------
    | What may be extracted
    |--------------------------------------------------------------------------
    | Field paths recorded as observations. Anything not listed is ignored even when a page offers
    | it, so widening the crawl is a deliberate edit rather than a side effect.
    */
    'fields' => [
        'identity.gtin',
        'identity.mpn',
        'identity.brand',
        'identity.official_name',
        'content_facts.ingredients',
        'content_facts.allergens',
        'content_facts.warnings',
        'content_facts.serving_size',
        'content_facts.servings_per_container',
        'content_facts.net_content',
        'content_facts.nutrition',
        'content_facts.flavours',
        'media.images',
        'media.videos',
        'reference.description',   // read by a human while writing ours; never published as-is
    ],

    /*
    |--------------------------------------------------------------------------
    | Never collected
    |--------------------------------------------------------------------------
    | Customer review text and reviewer identities. Republishing another shop's reviews as ours is
    | the same manual-action risk as inventing them, and the same lie to the customer. Our own
    | attested reviews are the only ones that move stars.
    */
    'never_collect' => ['reviews', 'ratings', 'reviewer_names', 'customer_photos', 'prices'],
];
