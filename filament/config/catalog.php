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

    /**
     * Let the scheduler drive discovery and hydration without anyone logging in.
     *
     * On because the owner asked for the import to start itself, and because the two phases it
     * covers cannot hurt anything: discovery and hydration write ONLY to
     * `external_catalog_products`. No product is created, no page changes, no URL appears. The one
     * step that is customer-visible — promotion — is deliberately NOT scheduled and never will be;
     * it stays a command somebody runs on purpose.
     *
     * To stop it: set CATALOG_AUTORUN=false, or set the running job row's status to `paused`, which
     * the discovery loop checks between sitemaps.
     */
    'autorun' => env('CATALOG_AUTORUN', true),

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
    | Stage 1 runs over the sitemap slug alone. On ~47,537 products, every row it rejects is a
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
         * Stage-1 slug prefilter. ALLOW beats DENY — see App\Services\Catalog\SlugRelevance.
         *
         * ── WHY THIS LIST IS SHORTER THAN IT LOOKS LIKE IT SHOULD BE ──────────────────────
         * Measured against all 47,537 real sitemap slugs on 10/08/2026, the first draft of this
         * list denied 5,994 products and saved 3.3 hours of a 26-hour hydration run. Reading what
         * it actually caught showed it was also destroying products we sell:
         *
         * (The list below denies 4,655 and saves 2.6 h. Verified by
         *  `php filament/tests/catalog/slug-relevance-check.php`, which asserts named products
         *  rather than totals — a percentage cannot show that Cat's Claw went missing.)
         *
         *     "cat-"        killed every CAT'S CLAW product — a herbal supplement (93 rows)
         *     "hair-"       killed Hair-Skin-Nails tablets
         *     "skin-"       killed Skin Eternal tablets
         *     "pet-"        killed Petadolex butterbur softgels
         *     "foundation"  killed AGELESS FOUNDATION LABORATORIES, a supplement brand
         *
         * The two errors are not symmetrical, and that asymmetry is the whole design:
         *
         *   · a term left OFF this list costs one HTTP request, after which `rootCategoryId`
         *     rejects the product correctly and nothing is published
         *   · a term wrongly ON this list loses a sellable product SILENTLY — the row is never
         *     hydrated, so nothing downstream ever notices it is missing
         *
         * Three hours of crawl time is not worth several hundred products. So every ambiguous
         * term was replaced with a specific one, and the authoritative filter does the real work.
         * Nothing here is a guess: each entry below was checked against what it matches.
         */
        'slug_deny' => [
            // Hair and body care. "shampoo"/"conditioner" carry the category on their own; the
            // "hair-*" entries are spelled out because bare "hair-" also matches supplements.
            'shampoo', 'conditioner', 'hair-color', 'hair-colour', 'hair-spray', 'hair-remover',
            'hair-gel', 'hair-mask', 'hair-serum', 'curling', 'mousse',
            'body-wash', 'body-lotion', 'body-scrub', 'hand-soap', 'bar-soap', 'soap-bar',
            'shower-gel', 'bubble-bath',

            // Oral care.
            'toothpaste', 'mouthwash', 'toothbrush', 'dental-floss',

            // Cosmetics. "foundation" is deliberately absent — it is a supplement brand name.
            'lipstick', 'lip-gloss', 'lip-balm', 'mascara', 'eyeliner', 'eyeshadow', 'concealer',
            'nail-polish', 'face-cream', 'face-mask', 'face-serum', 'eye-cream', 'skin-cream',
            'makeup-remover', 'sunscreen', 'self-tanning',

            // Baby and personal.
            'baby-wipes', 'diapers', 'shaving', 'razor', 'perfume', 'cologne', 'deodorant',

            // Home.
            'candle', 'incense', 'detergent', 'dish-soap', 'laundry', 'cleaner', 'air-freshener',
            'trash-bags', 'paper-towels',

            // Pet. Spelled as phrases: bare "cat-"/"dog-"/"pet-" hit cat's claw, petadolex and
            // "rose-petals" respectively.
            'for-dogs', 'for-cats', 'for-pets', 'dog-food', 'cat-food', 'pet-food', 'cat-litter',
            'dog-treats', 'cat-treats', 'pet-supplies',

            // Groceries that are unambiguously not sports nutrition. "cookies", "chips",
            // "crackers" and "chocolate-bar" were removed: protein cookies and protein chips are
            // real products, and stage 2 rejects the ordinary snacks at no risk.
            'tea-bags', 'coffee-beans', 'essential-oil',
        ],

        /**
         * Slugs matching these skip the deny list entirely.
         *
         * Necessary because the lists genuinely collide even after narrowing: a "hair, skin &
         * nails" supplement still contains "hair-", and Cat's Claw still reads as a cat product to
         * anything doing substring matching.
         */
        'slug_allow' => [
            'protein', 'whey', 'isolate', 'casein', 'creatine', 'bcaa', 'eaa', 'amino',
            'glutamine', 'pre-workout', 'preworkout', 'gainer', 'mass-', 'carnitine',
            'collagen', 'omega', 'fish-oil', 'multivitamin', 'vitamin-', 'magnesium', 'zinc',
            'calcium', 'iron', 'probiotic', 'electrolyte', 'beta-alanine', 'citrulline',
            'arginine', 'taurine', 'hmb', 'zma', 'testosterone', 'ashwagandha', 'creatina',
            'sport', 'energy-', 'recovery', 'nitric-oxide', 'weight-gainer', 'meal-replacement',

            // Rescued from the deny list by measurement, not by guesswork — every one of these was
            // observed being wrongly denied in the 47,537-slug run.
            'cat-s-claw', 'hair-skin', 'skin-eternal', 'petadolex', 'ageless-foundation',
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
