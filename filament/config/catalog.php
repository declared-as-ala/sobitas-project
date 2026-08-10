<?php

/**
 * External catalogue acquisition.
 *
 * ── WHAT THIS FILE DECIDES ────────────────────────────────────────────────────────────────
 * Three things that are business judgements, not engineering ones, and therefore belong in config
 * where the owner can change them without a deploy: which products are relevant, what a Tunisian
 * price is, and what must be true before a page goes live.
 */
return [

    'enabled' => env('CATALOG_IMPORT_ENABLED', true),

    /*
    |--------------------------------------------------------------------------
    | Discovery
    |--------------------------------------------------------------------------
    */
    'discovery' => [
        'chunk' => env('CATALOG_DISCOVER_CHUNK', 500),
    ],

    /*
    |--------------------------------------------------------------------------
    | Relevance
    |--------------------------------------------------------------------------
    | Two stages, because the authoritative category costs one HTTP request per product and the
    | slug costs nothing.
    |
    | Stage 1 runs over the sitemap slug alone. On ~61,500 products, every row it rejects is a
    | request never made — at 0.5 req/s that is the difference between a run measured in days and
    | one measured in weeks.
    |
    | Stage 2 runs on `rootCategoryId` after hydration and is the one that actually decides.
    | Verified live: 101046 = "Sports", 1855 = "Supplements".
    */
    'relevance' => [
        // Authoritative. Anything else is filtered_out after hydration.
        'root_category_ids' => [
            '101046',   // Sports
            '1855',     // Supplements
        ],

        /**
         * Stage-1 slug prefilter.
         *
         * DENY beats ALLOW. The deny list is the load-bearing one: iHerb's catalogue is mostly
         * cosmetics, groceries and household goods, and none of it belongs on a sports-nutrition
         * shop. Kept deliberately conservative — a false reject costs one product we could have
         * sold, while being too permissive costs an HTTP request per mistake across 61,500 rows.
         */
        'slug_deny' => [
            'shampoo', 'conditioner', 'body-wash', 'body-lotion', 'hand-soap', 'bar-soap',
            'toothpaste', 'mouthwash', 'deodorant', 'lipstick', 'mascara', 'foundation',
            'nail-polish', 'face-cream', 'face-mask', 'sunscreen', 'baby-wipes', 'diapers',
            'shaving', 'razor', 'perfume', 'cologne', 'candle', 'incense', 'essential-oil',
            'detergent', 'dish-soap', 'cleaner', 'air-freshener', 'pet-', 'dog-', 'cat-',
            'coffee-beans', 'tea-bags', 'chocolate-bar', 'cookies', 'crackers', 'chips',
            'curling', 'mousse', 'hair-', 'skin-', 'lip-balm', 'toothbrush',
        ],

        /**
         * Slugs matching these skip the deny list entirely.
         *
         * Necessary because the two lists genuinely collide: a "hair, skin & nails" supplement
         * contains "hair-" and "skin-", and "whey protein cookies and cream" contains "cookies".
         * Both are products we sell.
         */
        'slug_allow' => [
            'protein', 'whey', 'isolate', 'casein', 'creatine', 'bcaa', 'eaa', 'amino',
            'glutamine', 'pre-workout', 'preworkout', 'gainer', 'mass-', 'carnitine',
            'collagen', 'omega', 'fish-oil', 'multivitamin', 'vitamin-', 'magnesium', 'zinc',
            'calcium', 'iron', 'probiotic', 'electrolyte', 'beta-alanine', 'citrulline',
            'arginine', 'taurine', 'hmb', 'zma', 'testosterone', 'ashwagandha', 'creatina',
            'sport', 'energy-', 'recovery', 'nitric-oxide', 'weight-gainer', 'meal-replacement',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Pricing
    |--------------------------------------------------------------------------
    | iHerb's price is a REFERENCE, never our selling price. This formula turns it into a Tunisian
    | one; the result is written to `products.prix` at promotion and is protein.tn-owned from that
    | moment. A later sync refreshes the source figure in staging and must never touch `prix` again.
    |
    |   prix = source_price × usd_to_tnd × (1 + margin) × (1 + customs)
    |
    | Every factor is an owner decision. Nothing here guesses an exchange rate at runtime: a price
    | that silently moves with an API is a price nobody can reconcile against an invoice.
    */
    'pricing' => [
        'usd_to_tnd' => (float) env('CATALOG_USD_TND', 3.15),
        'margin' => (float) env('CATALOG_MARGIN', 0.35),
        'customs' => (float) env('CATALOG_CUSTOMS', 0.20),
        // Round up to the nearest N dinars. 1 gives whole-dinar prices.
        'round_to' => (float) env('CATALOG_ROUND_TO', 1),
        // A price below this is treated as a parse failure, not a bargain, and blocks promotion.
        'min_price' => (float) env('CATALOG_MIN_PRICE', 5),
        // Per-subcategory margin overrides, keyed by sous_category_id.
        'per_category' => [],
    ],

    /*
    |--------------------------------------------------------------------------
    | Promotion gate
    |--------------------------------------------------------------------------
    | What must be true before a staged row becomes a real product. This replaces human review of
    | 60,000 rows — so it has to be strict enough that "nobody looked at it" is still safe.
    */
    'promotion' => [
        // The subcategory decides the public URL (/{subcat}/{slug}), so an unmapped product cannot
        // be promoted without inventing a URL we would later have to redirect.
        'require_mapped_category' => true,
        'require_price' => true,
        'require_brand' => true,
        'min_completeness' => (int) env('CATALOG_MIN_COMPLETENESS', 60),
        // Promoted products carry no stock. Product::saving derives rupture from qte, so this
        // renders "En rupture de stock" with no frontend change and no invented availability.
        'initial_qte' => 0,
        // Publication is always a separate, explicit step (--publish), never a side effect.
        'publish_on_promote' => false,
        'chunk' => (int) env('CATALOG_PROMOTE_CHUNK', 100),
    ],

    /*
    |--------------------------------------------------------------------------
    | Media
    |--------------------------------------------------------------------------
    | OFF by default. iHerb's product photography is theirs; the URL is recorded so an admin can
    | look at it, and a product with no local image simply fails the completeness gate rather than
    | shipping a hotlink to a competitor's CDN.
    */
    'media' => [
        'mirror_images' => env('CATALOG_MIRROR_IMAGES', false),
        'max_bytes' => 5 * 1024 * 1024,
        'allowed_mime' => ['image/jpeg', 'image/png', 'image/webp'],
        'directory' => 'produits',
    ],

    /*
    |--------------------------------------------------------------------------
    | Hydration
    |--------------------------------------------------------------------------
    */
    'hydration' => [
        // Rows dispatched per batch. Pacing is PoliteFetcher's job (0.5 req/s for iherb.com);
        // this only bounds how much work sits in Redis at once.
        'batch' => (int) env('CATALOG_HYDRATE_BATCH', 250),
        'max_attempts' => (int) env('CATALOG_HYDRATE_ATTEMPTS', 3),
    ],
];
