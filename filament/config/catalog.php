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

            // Added 10/08/2026. Clustering the unclassified products surfaced a large cosmetic
            // tail the earlier list did not reach — cream 976, serum 555, butter 520, mask 314.
            // Phrases rather than bare words, so a topical JOINT & MUSCLE CREAM is not swept up
            // with a face cream, and "beauty" alone never denies a beauty-from-within supplement.
            'body-butter', 'shea-butter', 'body-oil', 'bath-oil', 'massage-oil', 'facial-oil',
            'beauty-mask', 'mud-bath', 'bath-salts', 'haircolor', 'hair-colour-gel',
            'insect-repellent', 'diaper-cream', 'nail-file', 'cotton-balls', 'shower-cap',
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
    | Subcategory classification
    |--------------------------------------------------------------------------
    | Which protein.tn subcategory an imported product belongs in. This is the single most
    | consequential mapping in the import, because the subcategory IS the public URL:
    | `/{sous_category.slug}/{product.slug}`. Get it wrong and the fix is a 301, forever.
    |
    | ── WHY THE PRODUCT NAME AND NOT THE SOURCE CATEGORY ──────────────────────────────────
    | iHerb's `rootCategoryId` has exactly two useful values — 101046 "Sports" and 1855
    | "Supplements". Two buckets for 47,537 products is not a taxonomy; it would file every
    | import into one of two subcategories and produce two pages with 20,000 products each.
    |
    | protein.tn's own taxonomy, by contrast, is 41 subcategories named after the very words that
    | appear in supplement product names: whey-isolate, caseine, creatine, beta-alanine,
    | l-carnitine, collagene, omega-3, ashwagandha. So the name classifies far better than the
    | source category ever could.
    |
    | ── TARGETS ARE SLUGS, NOT IDS ────────────────────────────────────────────────────────
    | A numeric id hardcoded here becomes silently wrong the day a subcategory is deleted and its
    | id reused. A slug that no longer exists simply fails to resolve, and the product stays in
    | staging — which is the safe direction.
    |
    | ── ORDER IS THE ALGORITHM. FIRST MATCH WINS ──────────────────────────────────────────
    | "whey isolate" must be tested before "whey", or every isolate lands in whey-proteine.
    | "beta-alanine" before "amino". "mass gainer" before "protein". The sequence below is the
    | rule, and reordering it changes URLs.
    |
    | Anything that matches nothing is NOT promoted. No product is ever guessed into a category,
    | because guessing a category means guessing a URL and publishing it.
    */
    'classification' => [
        // ── Protein, most specific first ────────────────────────────────────────────────
        ['sub' => 'whey-hydrolysee', 'any' => ['hydrolyzed-whey', 'whey-hydrolysate', 'hydrolysate']],

        // The NON-whey isolates are tested first, and that order is load-bearing.
        //
        // "Gold Standard 100% Isolate" is a real whey isolate whose name never says "whey", so
        // whey-isolate has to accept a bare "isolate" to catch it. But bare "isolate" also matches
        // PEA-PROTEIN-ISOLATE, SOY-PROTEIN-ISOLATE and BEEF-ISOLATE — so plant and beef must
        // claim theirs before whey gets a chance, or every vegan isolate is published as whey.
        ['sub' => 'proteines-vegetales', 'any' => ['plant-protein', 'plant-based-protein', 'vegan-protein', 'pea-protein', 'rice-protein', 'hemp-protein', 'soy-protein', 'protein-vegan', 'pea-isolate', 'soy-isolate']],
        ['sub' => 'proteine-de-boeuf', 'any' => ['beef-protein', 'beef-isolate']],
        ['sub' => 'caseine', 'any' => ['casein', 'caseinate', 'micellar']],
        ['sub' => 'whey-isolate', 'any' => ['whey-isolate', 'whey-protein-isolate', 'isolate-protein', 'iso-whey', 'isopure', 'isolate']],
        ['sub' => 'mass-gainers', 'any' => ['mass-gainer', 'weight-gainer', 'serious-mass']],
        ['sub' => 'gainers-proteines', 'any' => ['gainer']],
        ['sub' => 'whey-proteine', 'any' => ['whey']],
        ['sub' => 'proteines-multi-sources', 'any' => ['protein-blend', 'protein-powder', 'protein-matrix']],

        // ── Performance ────────────────────────────────────────────────────────────────
        ['sub' => 'creatine', 'any' => ['creatine', 'creapure']],
        ['sub' => 'beta-alanine', 'any' => ['beta-alanine', 'carnosyn']],
        ['sub' => 'citrulline', 'any' => ['citrulline']],
        ['sub' => 'l-arginine', 'any' => ['arginine', 'aakg']],
        ['sub' => 'bcaa', 'any' => ['bcaa', 'branched-chain']],
        ['sub' => 'eaa', 'any' => ['eaa', 'essential-amino']],
        ['sub' => 'pre-workout', 'any' => ['pre-workout', 'preworkout', 'pump-formula', 'nitric-oxide']],
        ['sub' => 'post-workout', 'any' => ['post-workout', 'recovery-formula']],
        ['sub' => 'Intra-Workout', 'any' => ['intra-workout']],

        // ── Weight management ──────────────────────────────────────────────────────────
        ['sub' => 'l-carnitine', 'any' => ['carnitine']],
        // `exact`, not `any`. Measured on the real catalogue, a front-anchored "cla" matched 426
        // products — among them CAT'S CLAW and DEVIL'S CLAW (herbal supplements) and CLAY POWDER
        // (a cosmetic), all of which would have been published at /cla/…
        ['sub' => 'cla', 'exact' => ['cla', 'clas'], 'any' => ['conjugated-linoleic']],
        ['sub' => 'bruleurs-de-graisse', 'any' => ['fat-burner', 'thermogenic', 'lipo-6', 'garcinia', 'raspberry-ketone']],

        // ── Health and vitality ────────────────────────────────────────────────────────
        ['sub' => 'glutamine', 'any' => ['glutamine']],
        ['sub' => 'hmb', 'any' => ['hmb']],
        ['sub' => 'zma', 'any' => ['zma']],
        ['sub' => 'ashwagandha', 'any' => ['ashwagandha', 'ksm-66', 'sensoril']],
        ['sub' => 'tribulus', 'any' => ['tribulus']],
        // "maca" is `exact` so it cannot swallow MACADAMIA.
        ['sub' => 'boosters-hormonaux', 'exact' => ['maca', 'dhea'], 'any' => ['testosterone', 'test-booster', 'maca-root']],
        ['sub' => 'collagene', 'any' => ['collagen']],
        ['sub' => 'omega-3', 'any' => ['omega-3', 'fish-oil', 'krill-oil', 'epa-dha', 'cod-liver']],
        ['sub' => 'zinc', 'any' => ['zinc']],
        ['sub' => 'magnesium', 'any' => ['magnesium']],
        ['sub' => 'articulations', 'any' => ['glucosamine', 'chondroitin', 'msm', 'joint-support', 'joint-formula', 'turmeric', 'curcumin', 'boswellia']],
        ['sub' => 'beaute-cheveux', 'any' => ['hair-skin', 'biotin', 'keratin', 'nail-support']],
        ['sub' => 'antioxydants', 'any' => ['antioxidant', 'resveratrol', 'astaxanthin', 'coq10', 'alpha-lipoic', 'quercetin', 'grape-seed', 'green-tea-extract']],

        // ── Added 10/08/2026 from measurement, not intuition ────────────────────────────
        // Tokenising the 34,409 products that matched nothing ranked the clusters the shop had
        // no home for. Each rule below answers one of them. The clusters that are NOT supplements
        // (cream 976, serum 555, butter 520, mask 314) deliberately get no rule — they are handled
        // by the deny list, because a category for them would mean selling cosmetics.
        ['sub' => 'probiotiques', 'any' => ['probiotic', 'acidophilus', 'lactobacillus', 'bifidobacterium', 'bifidus', 'saccharomyces', 'cfu-']],
        ['sub' => 'digestion', 'any' => ['digestive-enzyme', 'digestive-enzymes', 'digest-', 'psyllium', 'betaine-hcl', 'colon-', 'slippery-elm', 'prebiotic', 'inulin'], 'exact' => ['fiber', 'fibre', 'enzymes']],
        ['sub' => 'sommeil-stress', 'any' => ['melatonin', 'sleep', 'valerian', 'l-theanine', 'theanine', 'passionflower', 'chamomile', '5-htp', 'rhodiola', 'holy-basil'], 'exact' => ['gaba']],
        ['sub' => 'immunite', 'any' => ['immune', 'immunity', 'elderberry', 'echinacea', 'mushroom', 'reishi', 'cordyceps', 'chaga', 'lions-mane', 'propolis', 'colostrum', 'olive-leaf', 'oregano-oil', 'andrographis']],
        ['sub' => 'enfants', 'any' => ['kids', 'children', 'child-', 'infant', 'toddler', 'junior', 'baby-']],
        ['sub' => 'barres-proteinees', 'any' => ['protein-bar', 'protein-bars', 'energy-bar', 'snack-bar', 'meal-bar', 'builders-bar']],
        // Broadest of the new ones, so it runs last among them: a named herb that has not already
        // been claimed by a more specific rule above (turmeric → articulations, ashwagandha and
        // tribulus → their own, elderberry → immunité).
        ['sub' => 'plantes-et-herbes', 'any' => ['ginkgo', 'saw-palmetto', 'milk-thistle', 'black-cohosh', 'ginseng', 'nettle', 'dandelion', 'hawthorn', 'red-yeast', 'garlic', 'fenugreek', 'moringa', 'spirulina', 'chlorella', 'wheatgrass', 'noni', 'graviola', 'cat-s-claw', 'devil-s-claw', 'horny-goat', 'bilberry', 'butcher-s-broom', 'burdock', 'goldenseal', 'astragalus', 'schisandra', 'eyebright', 'feverfew', 'yarrow', 'nattokinase', 'berberine', 'bacopa', 'gotu-kola'], 'exact' => ['herb', 'herbs', 'herbal']],
        ['sub' => 'vitamines', 'any' => ['multivitamin', 'vitamin-', 'vitamins', 'ascorbic-acid', 'cholecalciferol', 'folate', 'folic-acid', 'biotin-']],
        // `not` disqualifies the whole rule. "iron" as a mineral term matched "iron-free" and
        // "no-iron" — products that advertise the ABSENCE of the thing being matched. Filing an
        // iron-free multivitamin under minerals-for-iron inverts what the label says, which is not
        // a near miss. `iron` is also `exact`, so it cannot reach "ironman".
        [
            'sub' => 'mineraux',
            'exact' => ['iron'],
            'any' => ['mineral', 'calcium', 'potassium', 'selenium', 'chromium', 'iodine', 'electrolyte'],
            'not' => ['iron-free', 'no-iron', 'without-iron', 'free-of-iron'],
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
        /**
         * Reference the source CDN instead of copying every image.
         *
         * The owner's call, and technically it is the better one here: iHerb already serves these
         * through Cloudinary with `f_auto,q_auto` — format negotiated per browser (WebP/AVIF where
         * supported) and quality tuned per image — at five sizes. Downloading 20,000 JPEGs to
         * re-encode them ourselves would spend hours of transfer and gigabytes of disk to arrive
         * somewhere slightly worse.
         *
         * The trade-off, stated once: our product pages then depend on a third party's CDN. If
         * iHerb blocks referrers or changes its URL scheme, every imported image breaks at once —
         * and this is a competitor's infrastructure, not a neutral host. Switching to local copies
         * is `CATALOG_MIRROR_IMAGES=true` plus a backfill; nothing else has to change, because
         * `cover` holds a reference either way.
         */
        'mirror_images' => env('CATALOG_MIRROR_IMAGES', false),

        /**
         * Hosts whose absolute URLs survive ImagePath::normalize() intact.
         *
         * That method exists to turn `https://admin.protein.tn/storage/x.webp` into `x.webp`, and
         * it does so for ANY absolute URL. Without this allowlist it would strip the domain off a
         * CDN URL, leaving a path that resolves against our own host — a broken image on every
         * imported product, with a 200 on every request.
         *
         * These hosts must ALSO be listed in frontend/next.config.mjs `images.remotePatterns`, or
         * next/image refuses to render them. Two allowlists, both required; changing one without
         * the other is how images silently stop appearing.
         */
        'external_hosts' => [
            'cloudinary.images-iherb.com',
            'images-iherb.com',
        ],

        // Only used when mirror_images is true.
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
        /**
         * How long a dispatched window is meant to keep the worker busy.
         *
         * This is NOT a tuning knob — it is the scheduler's interval, written down. routes/console.php
         * refills the window with `->everyTenMinutes()`, so a window that covers less than 600 seconds
         * of work leaves the worker idle until the next tick.
         */
        'window_seconds' => (int) env('CATALOG_HYDRATE_WINDOW', 600),

        /**
         * Rows dispatched per batch — DERIVED, not chosen.
         *
         * ── THE DEFECT THIS REPLACES, MEASURED 10/08/2026 ─────────────────────────────────
         * The value was a literal 250 with a comment claiming the rate was 0.5 req/s. Both numbers
         * were wrong and they were wrong independently:
         *
         *   · the real rate is CATALOG_IHERB_RPS (1.5), set in config/enrichment.php
         *   · at 1.5 req/s a 250-row window is 167 seconds of work inside a 600-second schedule
         *
         * So the worker ran for 2.8 minutes and then sat idle for 7.2, and the import's actual
         * throughput was 0.42 req/s — 28% of the rate the owner had configured and the operator
         * believed was running. Nothing reports this: `--status` shows rows moving, the queue log
         * shows jobs completing, and the only symptom is that 42,034 rows take 28 hours instead of 8.
         *
         * ── WHY IT IS COMPUTED AND NOT JUST RAISED TO 900 ─────────────────────────────────
         * A literal 900 is correct only while the rate is exactly 1.5, and the rate lives in a
         * different file. This project has now been bitten three times in one day by two numbers that
         * had to agree and silently stopped agreeing: a duplicate `iherb.com` key that made the real
         * rate 0.2 while the config said 0.5, a hardcoded 2-second sleep in the estimate printed by
         * this very command, and this window. Deriving it means changing the rate changes the window,
         * with no second place to remember.
         *
         * env('CATALOG_IHERB_RPS') is read directly rather than through config('enrichment'): config
         * files are loaded in an order that is not guaranteed, so config() from inside a config file
         * can legitimately return null. The default here MUST stay in step with the one in
         * config/enrichment.php — the same literal, on purpose, because there is no earlier moment at
         * which one file can read the other.
         *
         * Overshooting is safe and is the intended direction: HydrateExternalProductJob is
         * ShouldBeUnique on the staging id, and claim() is an atomic conditional UPDATE, so a row
         * dispatched twice is fetched once. An undershoot costs hours; an overshoot costs nothing.
         */
        'batch' => (int) env(
            'CATALOG_HYDRATE_BATCH',
            (int) ceil((float) env('CATALOG_IHERB_RPS', 1.5) * (int) env('CATALOG_HYDRATE_WINDOW', 600)),
        ),

        'max_attempts' => (int) env('CATALOG_HYDRATE_ATTEMPTS', 3),
    ],
];
