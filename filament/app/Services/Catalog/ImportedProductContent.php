<?php

namespace App\Services\Catalog;

use App\Services\Content\ProductContentGenerator;

/**
 * French copy for an imported product, composed from FACTS ONLY.
 *
 * ── THE PROBLEM THIS EXISTS FOR ───────────────────────────────────────────────────────────
 * An imported product arrives with a brand, a name, a pack size, sometimes a flavour, and nothing
 * else. No description, no Supplement Facts, no reviews, no video. Rendered through the storefront's
 * existing fallback it produces a page whose entire body is one generated paragraph — measured at
 * 83, 87 and 93 words on three real imported titles, against a repo gate of 250.
 *
 * Multiply that by 20,000 and the problem stops being "thin page" and becomes a site-level one.
 * Google's spam policy on SCALED CONTENT ABUSE is aimed exactly at this shape: many pages produced
 * at scale whose bodies differ only by a substituted noun. The observable outcome is "Crawled —
 * currently not indexed", and because quality signals are evaluated across a domain, 20,000 such
 * pages are a bet placed with the ranking of the 309 pages that actually sell.
 *
 * ── WHAT THIS CLASS WILL AND WILL NOT DO ──────────────────────────────────────────────────
 * It writes sentences that are TRUE OF THIS PRODUCT and derivable from a column we hold. It has no
 * model, no network call and no vocabulary of benefits. Specifically it never emits:
 *
 *   · a nutrition figure          — the label is not in our database; DSLD returned 0/12 and Open
 *                                   Food Facts 2/12 on a measured sample, so there is no automatic
 *                                   path to a real Supplement Facts panel
 *   · a health or therapeutic claim
 *   · a dosage or serving instruction
 *   · a benefit, an origin, a certification, a lab test or an ingredient list
 *   · a rating, a review, or anything derived from `source_rating` / `source_rating_count`
 *   · an act of importation, distribution or supply. We hold no supplier record, no import
 *     document and no arrival date; the row we compose from is a discovered listing, nothing
 *     more. Sentences asserting one were in this class and have been deleted.
 *   · an availability or stock statement. Promotion writes qte = 0 and Product::booted() derives
 *     `rupture` from it, so every promoted page renders an OUT OF STOCK badge — a stored sentence
 *     saying the product is "disponible" contradicts the page it is printed on.
 *   · the existence of anything the input does not name: other references of the brand, a brand
 *     page, an equivalent product, a neighbouring size. The class is handed a brand STRING; it
 *     knows nothing about what else carries that brand, and "les autres références {brand}" is
 *     flatly false the first time a brand arrives with one product.
 *
 * Those are the same rules App\Services\Content\ProductContentGenerator enforces on LLM output,
 * and selfCheck() below runs this class's own template bank through THAT class's exported patterns —
 * so a template added later that says "2 gélules par jour" fails a check instead of shipping. It
 * additionally rejects the vocabulary of the three bullets above (see UNSUPPORTED_VOCABULARY) and
 * any frame with no product-specific placeholder in it, because both failures are invisible when
 * you read one rendered page and obvious only across thirteen thousand of them.
 *
 * Where a fact is missing, the sentence that would have carried it is dropped. Where too few facts
 * survive to make a paragraph worth reading, compose() returns nulls. Padding an empty product with
 * filler is the failure this class was written to prevent, not a fallback it is allowed to reach for.
 *
 * ── ONLY DURABLE FACTS. NO PRICE, NO STOCK. ───────────────────────────────────────────────
 * This is the non-obvious constraint and it is deliberate. Output here is written ONCE into
 * `products.description_fr` / `seo_title` / `seo_description` and then served from those columns for
 * as long as they hold. A price or a stock state baked into a stored column goes stale the first
 * time either changes, and the page then contradicts its own live badge — the exact defect
 * util/productDescriptionFallback.ts already carries a comment about ("so the indexable SEO text
 * can't contradict the visible price/stock badge"). The crawler view renders price and availability
 * from live data in its own `<section aria-label="Prix et disponibilité">`; this copy stays silent
 * about both and therefore cannot ever disagree with it.
 *
 * ── HOW THE VARIATION WORKS, AND WHY IT IS NOT A SYNONYM SWAP ─────────────────────────────
 * Three independent axes, applied in this order:
 *
 * 1. STRUCTURE VARIES BY PRODUCT FAMILY. The subcategory slug — which the classifier already
 *    decided and which is literally the first segment of the URL — selects one of eight families,
 *    and each family owns a PLAN: which sentence slots the page gets, in which order, split across
 *    which paragraphs. A micronutrition page folds the galenic form into its opening sentence and
 *    then talks about the flacon count; a protein page opens on brand and rayon and then talks
 *    about conditionnement and saveur. Those are different sentences about different facts, not one
 *    sentence reworded.
 *
 * 2. SLOTS EXIST ONLY WHEN THEIR FACT EXISTS. A capsule product has a unit count and no flavour; a
 *    powder has a mass and usually a flavour; a softgel says "capsules molles" where a tablet says
 *    "comprimés". `pack_unit` is a real, label-transcribed distinction, so it drives a real
 *    difference in what the page says. A product whose pack size resolved to a per-unit dose
 *    (mg/µg) gets NO conditionnement sentence at all, because stating "500 mg" as a pack size would
 *    be false.
 *
 * 3. PHRASING IS CHOSEN PER SLOT BY A STABLE HASH — see pick(). Seeding PER SLOT rather than once
 *    per product is what makes this worth doing: with one seed, two products landing in the same
 *    bucket produce a byte-identical paragraph and the whole scheme collapses to N distinct pages.
 *
 * The rule that keeps axis 3 honest: every frame in a bank states THE SAME FACT a different way.
 * Variation may rearrange true statements; it may never make two pages claim different things. If a
 * frame can only be filled by inventing something, it does not belong in the bank.
 *
 * ── NO NUMBERS IN THIS COMMENT; THE HARNESS COMPUTES THEM ─────────────────────────────────
 * This block used to carry measured distinctness figures and say that the harness reproduced them.
 * It did not: nothing in filament/tests/catalog/imported-product-content-check.php computed a
 * distinctness number at all, so those figures were one bank edit away from being false and nothing
 * would have said so. They are gone, and what replaced them is a computation that runs every time
 * the harness runs:
 *
 *   · compose() returns `arrangements` — the EXACT size of the phrasing space for the fact set it
 *     was handed: the product of the bank sizes of the slots the plan actually filled. Exact,
 *     because no two frames within one bank are byte-identical, so two different picks can never
 *     collapse to one body.
 *   · the harness composes a worst-case cohort — one subcategory, one brand, one pack size, one
 *     flavour state, N identities: every fact identical, only the hash input differing — counts the
 *     distinct bodies, and compares that count against S·(1−(1−1/S)^N), which is what independent
 *     selection over S arrangements predicts for N draws. A hash that correlates loses that ratio,
 *     which is the failure crc32 produced here (see pick()).
 *   · it repeats the measurement for the sparsest product this pipeline can emit — name, brand and
 *     rayon only — whose space is far smaller, and PRINTS both results rather than asserting a
 *     remembered one.
 *
 * Every figure is therefore derived from the constants in THIS file at the moment of the run: edit a
 * bank and the numbers move with it, and no comment goes stale behind your back.
 *
 * ── WHAT THIS DOES NOT SOLVE, STATED PLAINLY ──────────────────────────────────────────────
 * These bodies are short, and this comment deliberately does not say how short — the harness prints
 * the min/median/max it measures over its own sample, which is the only word count anybody should
 * quote. What is certain is that it is not 250, and that no honest arrangement of the columns we
 * hold reaches 250: the sentences that would have got there are exactly the ones that asserted an
 * import, a distribution, an availability or a brand range we hold no record of, and those were
 * deleted rather than kept for their word count.
 *
 * On the sparsest fact sets that now lands BELOW the storefront fallback's own word count, and that
 * is still the right trade. The fallback's defect was never its length — it was that it says the
 * same thing on every page. Length is what you add once the facts arrive (a transcribed label, a
 * translated description); it is not something to manufacture out of a brand name.
 *
 * `word_count` is returned for this reason. It is computed the way
 * frontend/scripts/audit-pdp-content.mjs computes `bodyWords` (strip tags, collapse whitespace,
 * split on space, count tokens longer than one character), so the caller can compare it to that
 * gate directly instead of guessing. A promotion path that wants pages indexed should treat a short
 * result as "promote with seo_robots_index = 0", not as a reason to lengthen the text.
 *
 * ── FRAMEWORK-FREE ON PURPOSE ─────────────────────────────────────────────────────────────
 * No facades, no container, no Eloquent, no config(). There is no vendor/ and no php binary on the
 * development machine, so the only way this class can be verified before deploy is a standalone
 * harness that require()s it — filament/tests/catalog/imported-product-content-check.php. Same
 * pattern, and same reason, as IHerbNormalizer and SubCategoryClassifier.
 */
final class ImportedProductContent
{
    /** Google truncates the SERP title around here; frontend/scripts/verify-seo.js uses 30/60. */
    private const TITLE_MIN = 30;
    private const TITLE_MAX = 60;

    /** Meta description window. Below ~110 Google rewrites it; above ~160 it is cut. */
    private const DESCRIPTION_MIN = 110;
    private const DESCRIPTION_MAX = 160;

    private const SITE = 'Protéine Tunisie';

    /**
     * Subcategory slug → content family.
     *
     * Keyed by slug because the slug is the stable thing: it is the URL segment, it is what the
     * classification rules in config/catalog.php target, and unlike a numeric id it cannot be
     * silently reused when a subcategory is deleted and recreated. A slug that is not listed here
     * simply falls to `default`, which is a working plan — an unknown subcategory must not be a
     * fatal error in a class that runs 20,000 times.
     *
     * ── EVERY KEY IS LOWER-CASE, AND THE LOOKUP LOWER-CASES TOO ───────────────────────────
     * `intra-workout` was written here as `Intra-Workout`, the only mixed-case key in the map, and
     * that spelling is not arbitrary: the live rayon really is served at /Intra-Workout and
     * config/catalog.php's rule for it is `['sub' => 'Intra-Workout', ...]`, so the value in
     * `sous_categories.slug` carries capitals. A map that mixes both conventions only works while
     * the caller's spelling happens to match the key character for character — one lower-cased slug
     * from one call site and the rayon silently falls to `default`, taking its whole content family
     * with it and giving 20,000 pages no way to report the loss. family() now lower-cases the
     * incoming slug and this map is lower-case throughout, so both spellings resolve.
     */
    private const FAMILY_BY_SUBCATEGORY = [
        // Protein powders and mass gainers.
        'whey-proteine' => 'proteines',
        'whey-isolate' => 'proteines',
        'whey-hydrolysee' => 'proteines',
        'caseine' => 'proteines',
        'proteines-vegetales' => 'proteines',
        'proteine-de-boeuf' => 'proteines',
        'proteines-multi-sources' => 'proteines',
        'mass-gainers' => 'proteines',
        'gainers-proteines' => 'proteines',

        // Training support.
        'creatine' => 'performance',
        'beta-alanine' => 'performance',
        'citrulline' => 'performance',
        'l-arginine' => 'performance',
        'bcaa' => 'performance',
        'eaa' => 'performance',
        'glutamine' => 'performance',
        'hmb' => 'performance',
        'zma' => 'performance',
        'pre-workout' => 'performance',
        'post-workout' => 'performance',
        'intra-workout' => 'performance',

        // Weight management.
        'l-carnitine' => 'silhouette',
        'cla' => 'silhouette',
        'bruleurs-de-graisse' => 'silhouette',

        // Vitamins, minerals, fatty acids.
        'vitamines' => 'micronutrition',
        'mineraux' => 'micronutrition',
        'zinc' => 'micronutrition',
        'magnesium' => 'micronutrition',
        'omega-3' => 'micronutrition',
        'antioxydants' => 'micronutrition',

        // Botanicals.
        'ashwagandha' => 'plantes',
        'tribulus' => 'plantes',
        'boosters-hormonaux' => 'plantes',
        'plantes-et-herbes' => 'plantes',

        // Everyday wellbeing.
        'probiotiques' => 'bienetre',
        'digestion' => 'bienetre',
        'sommeil-stress' => 'bienetre',
        'immunite' => 'bienetre',
        'articulations' => 'bienetre',
        'collagene' => 'bienetre',
        'beaute-cheveux' => 'bienetre',
        'enfants' => 'bienetre',

        // Eaten rather than dosed.
        'barres-proteinees' => 'snacking',
    ];

    /**
     * Which slots a family gets, in order, split into paragraphs.
     *
     * This is axis 1 of the variation and the one that does the heavy lifting: two products in
     * different families do not merely word the same sentence differently, they carry a different
     * set of sentences in a different order. A slot whose fact is absent is skipped when the plan is
     * executed, and a paragraph left with nothing in it is dropped rather than emitted empty.
     *
     * `ident_form` is `ident` with the galenic form folded in — used by the families whose products
     * are overwhelmingly capsules and tablets, where the form is the single most useful thing to say
     * first and a separate sentence for it reads like padding.
     *
     * ── TWO SLOTS USED TO BE HERE AND ARE NOT COMING BACK ─────────────────────────────────
     * `import` said the product had been imported and was distributed in Tunisia by us. `brandpage`
     * said the brand's OTHER references were gathered on its brand page. Neither fact is in the
     * input: this class is handed a title, a brand string, a rayon, a pack and sometimes a flavour,
     * and from those you cannot know that anything was imported, that anything is distributed, or
     * that a second product of that brand exists. Both slots appeared in every plan, so both were
     * about to be asserted on every one of ~20,000 pages. Removing them costs roughly two sentences
     * per page; keeping them cost the whole page's credibility, and a page that says less is not the
     * page Google's scaled-content policy is aimed at — a page that says more than it knows is.
     */
    private const PLANS = [
        'proteines' => [
            ['ident', 'pack', 'flavour'],
            ['placement', 'label', 'label_scope'],
            ['reference', 'contact'],
        ],
        'performance' => [
            ['ident', 'form', 'pack', 'flavour'],
            ['placement', 'label_scope', 'label'],
            ['reference', 'contact'],
        ],
        'silhouette' => [
            ['ident', 'form', 'pack', 'placement'],
            ['label', 'label_scope'],
            ['reference', 'contact'],
        ],
        'micronutrition' => [
            ['ident_form', 'pack', 'placement'],
            ['label', 'label_scope'],
            ['reference', 'contact'],
        ],
        'plantes' => [
            ['ident_form', 'pack', 'placement'],
            ['label_scope', 'label'],
            ['reference', 'contact'],
        ],
        'bienetre' => [
            ['ident_form', 'flavour', 'pack'],
            ['placement', 'label', 'label_scope'],
            ['reference', 'contact'],
        ],
        'snacking' => [
            ['ident', 'flavour', 'pack', 'placement'],
            ['label', 'label_scope'],
            ['reference', 'contact'],
        ],
        'default' => [
            ['ident', 'form', 'pack', 'flavour'],
            ['placement', 'label', 'label_scope'],
            ['reference', 'contact'],
        ],
    ];

    /**
     * Pack unit (as IHerbNormalizer writes it) → the kind of thing that unit measures.
     *
     * `dose` is the important one. "500 mg" can reach `pack_unit` when a title carried no countable
     * and no metric mass — and a milligram figure is a PER-UNIT STRENGTH, never a pack size. It gets
     * a group here purely so the composer can recognise it and say nothing, rather than printing
     * "conditionnement de 500 mg" on a 180-capsule bottle.
     */
    private const UNIT_GROUPS = [
        'gélules végétales' => 'count',
        'gélules véganes' => 'count',
        'gélules' => 'count',
        'gélule' => 'count',
        'capsules molles' => 'count',
        'comprimés' => 'count',
        'comprimé' => 'count',
        'gommes' => 'count',
        'pastilles' => 'count',
        'sachets' => 'count',
        'sachet' => 'count',
        'portions' => 'count',
        'portion' => 'count',
        'barres' => 'count',
        'barre' => 'count',
        'kg' => 'mass',
        'g' => 'mass',
        'lb' => 'mass',
        'oz' => 'mass',
        'ml' => 'volume',
        'l' => 'volume',
        'fl oz' => 'volume',
        'mg' => 'dose',
        'µg' => 'dose',
    ];

    /**
     * Pack units that name a galenic form, and the French phrase for it.
     *
     * Only these produce a "se présente sous forme de …" sentence. A mass or a volume says nothing
     * about form: a 600 g tub could be a powder or a liquid, and we do not know which, so the
     * `form` slot is simply absent for those products.
     */
    private const FORM_PHRASES = [
        'gélules végétales' => 'gélules végétales',
        'gélules véganes' => 'gélules véganes',
        'gélules' => 'gélules',
        'gélule' => 'gélules',
        'capsules molles' => 'capsules molles',
        'comprimés' => 'comprimés',
        'comprimé' => 'comprimés',
        'gommes' => 'gommes à mâcher',
        'pastilles' => 'pastilles',
        'sachets' => 'sachets individuels',
        'sachet' => 'sachets individuels',
    ];

    /**
     * The frame banks. One entry per slot; family-keyed where the family changes what is natural to
     * say, fact-keyed where the FACT is what differs.
     *
     * Every frame inside one bank states the same fact. That is the invariant that keeps axis 3 from
     * becoming fabrication, and it is checkable by reading a bank top to bottom.
     *
     * Placeholders: {full} {core} {brand} {sub} {cat} {form} {pack} {flavour} {ref} {site}
     *
     * ── EVERY FRAME CARRIES A PLACEHOLDER THAT VARIES WITHIN A BRAND-AND-RAYON COHORT ─────
     * {core}, {full}, {pack}, {flavour}, {form} or {ref}. Not {brand}, not {sub}, not {cat}, not
     * {site} — those four are CONSTANTS for every product of one brand in one rayon, which is the
     * cohort where near-duplicate bodies actually cost something.
     *
     * The rule started as "at least one placeholder that is not {site}", after `import`, `label` and
     * `label_scope` were found carrying none at all. That version was still wrong by exactly one
     * step: it accepted {brand}-only and {sub}-only frames, and `placement`, `placement_sub_only`
     * and two thirds of every `label` bank were made of them. Measured over 300 products of one
     * brand in one rayon, 50 pages carried a middle paragraph that named no product at all and
     * shared two strings between them. Counting distinct BODIES cannot see that — the surrounding
     * paragraphs still differ — which is why the check is on the frame and not on the output.
     *
     * ── NOTHING THAT ELIDES MAY SIT IN FRONT OF A PLACEHOLDER ────────────────────────────
     * French elides de / le / la / ce / que before a vowel, and the values are third-party strings
     * we cannot inspect: "de {core}" renders "de Ashwagandha" where the language wants
     * "d'Ashwagandha", and "celles que {brand} imprime" renders "que Optimum Nutrition" where it
     * wants "qu'Optimum" — and vowel-initial brands are not rare (Optimum, Applied, Olimp, AllMax).
     * The frames therefore use only prepositions that never elide — pour, sur, par, en, dans, à —
     * and otherwise put {core}/{brand} in subject position. {form} is safe after "de" because every
     * FORM_PHRASES value begins with a consonant, and {pack} is safe because it begins with a digit.
     *
     * ── WHY THE IDENTITY FRAMES USE {core} AND NOT {full} ─────────────────────────────────
     * {full} is "Brand Core" — `normalized_title` already leads with the brand. A frame written as
     * "<strong>{full}</strong>, signé {brand}" therefore renders "Optimum Nutrition Gold Standard
     * 100% Whey, signé Optimum Nutrition": the brand twice in one clause, which reads like machine
     * output and is the exact impression these pages cannot afford to give. The identity frames say
     * the brand ONCE, next to {core}. The full designation still appears on the page — it is the
     * h1, the title tag, the meta description and the image alt — so nothing is lost by not
     * repeating it inside the body copy.
     *
     * @var array<string, array<string, list<string>>>
     */
    private const FRAMES = [
        'ident' => [
            'proteines' => [
                '<strong>{core}</strong>, de la marque {brand}, est inscrit au rayon {sub} de {site}.',
                '{site} référence <strong>{core}</strong>, produit {brand}, dans son rayon {sub}.',
                'Au rayon {sub} de {site} figure <strong>{core}</strong>, signé {brand}.',
                '<strong>{core}</strong> porte la marque {brand} et figure au rayon {sub} du catalogue {site}.',
            ],
            'performance' => [
                '<strong>{core}</strong>, signé {brand}, est classé au rayon {sub} du catalogue {site}.',
                'Dans le catalogue {site}, <strong>{core}</strong> relève du rayon {sub} et porte la marque {brand}.',
                '{site} référence <strong>{core}</strong>, produit {brand}, au rayon {sub}.',
                '<strong>{core}</strong> figure au rayon {sub} de {site}, dans la gamme {brand}.',
            ],
            'silhouette' => [
                '<strong>{core}</strong> est un produit {brand} référencé par {site} au rayon {sub}.',
                '{site} inscrit <strong>{core}</strong>, de la marque {brand}, à son rayon {sub}.',
                'Le rayon {sub} de {site} comprend <strong>{core}</strong>, marque {brand}.',
                '<strong>{core}</strong>, marque {brand}, est classé au rayon {sub} du catalogue {site}.',
            ],
            'snacking' => [
                '<strong>{core}</strong> est un produit {brand} référencé au rayon {sub} de {site}.',
                '{site} référence <strong>{core}</strong>, de la marque {brand}, au rayon {sub}.',
                'Au rayon {sub}, {site} référence <strong>{core}</strong>, signé {brand}.',
                '<strong>{core}</strong> vient de la marque {brand} et figure au rayon {sub} du catalogue {site}.',
            ],
            'default' => [
                '<strong>{core}</strong> est référencé par {site} au rayon {sub}, sous la marque {brand}.',
                '{site} classe <strong>{core}</strong> au rayon {sub} : un produit de la marque {brand}.',
                'Au rayon {sub} du catalogue {site} figure <strong>{core}</strong>, marque {brand}.',
                '<strong>{core}</strong>, marque {brand}, est classé au rayon {sub} par {site}.',
            ],
        ],

        /**
         * Identity with the galenic form folded in — the pill families. Requires {form}; the plan
         * falls back to the plain `ident` frame when the product has no form.
         */
        'ident_form' => [
            'micronutrition' => [
                '<strong>{core}</strong> est un complément {brand} présenté sous forme de {form}, référencé par {site} au rayon {sub}.',
                'Présenté en {form}, <strong>{core}</strong> porte la marque {brand} et figure au rayon {sub} du catalogue {site}.',
                '{site} référence <strong>{core}</strong> au rayon {sub} : un produit {brand} conditionné en {form}.',
                '<strong>{core}</strong>, marque {brand}, se présente en {form} et appartient au rayon {sub} de {site}.',
            ],
            'plantes' => [
                '<strong>{core}</strong> est un produit {brand} présenté en {form}, référencé par {site} au rayon {sub}.',
                'Au rayon {sub} de {site}, <strong>{core}</strong> se présente en {form} et porte la marque {brand}.',
                '{site} inscrit <strong>{core}</strong> à son rayon {sub} : marque {brand}, conditionnement en {form}.',
                'Signé {brand} et présenté en {form}, <strong>{core}</strong> relève du rayon {sub} du catalogue {site}.',
            ],
            'bienetre' => [
                '<strong>{core}</strong>, de la marque {brand}, est présenté en {form} et classé au rayon {sub} de {site}.',
                '{site} référence <strong>{core}</strong> en {form} au rayon {sub}, sous la marque {brand}.',
                'Conditionné en {form}, <strong>{core}</strong> figure au rayon {sub} du catalogue {site} et porte la marque {brand}.',
                'Au rayon {sub}, {site} référence <strong>{core}</strong> — marque {brand}, conditionnement en {form}.',
            ],
            'default' => [
                '<strong>{core}</strong>, marque {brand}, se présente en {form} et figure au rayon {sub} de {site}.',
                '{site} référence <strong>{core}</strong> au rayon {sub} : produit {brand} conditionné en {form}.',
                'Présenté en {form}, <strong>{core}</strong> porte la marque {brand} et relève du rayon {sub} de {site}.',
                'Au rayon {sub} du catalogue {site}, <strong>{core}</strong> est un produit {brand} présenté en {form}.',
            ],
        ],

        /**
         * Galenic form as its own sentence, for the families that do not fold it into the opener.
         *
         * The third frame used to read "Il s'agit d'un format {form}", which fills as "un format
         * gélules végétales" — a noun apposed to a noun with nothing joining them. French needs the
         * preposition.
         */
        'form' => [
            'default' => [
                'Cette référence se présente sous forme de {form}.',
                'Le produit est conditionné en {form}.',
                'Il s\'agit d\'un conditionnement en {form}.',
            ],
        ],

        /**
         * Conditionnement. Fact-keyed rather than family-keyed: what changes here is whether the
         * figure counts units or weighs the contents, and that is a property of the unit.
         */
        'pack_count' => [
            'default' => [
                'Le conditionnement annoncé est de {pack}.',
                'Chaque emballage contient {pack}.',
                'La quantité indiquée sur l\'emballage est de {pack}.',
                'L\'emballage annonce {pack}.',
            ],
        ],
        /**
         * `contenance` was in this bank and does not belong: it names a VOLUME, and every unit that
         * reaches `pack_mass` is a mass (kg, g, lb, oz). "La contenance annoncée est de 2,27 kg"
         * measures the wrong quantity in the wrong noun. It survives in `pack_volume`, where it is
         * the correct word.
         */
        'pack_mass' => [
            'default' => [
                'Le format référencé est de {pack}.',
                'Le poids net indiqué sur l\'emballage est de {pack}.',
                'Cette référence correspond au conditionnement de {pack}.',
                'La masse nette annoncée est de {pack}.',
            ],
        ],
        'pack_volume' => [
            'default' => [
                'Le volume indiqué sur l\'emballage est de {pack}.',
                'Cette référence correspond à la contenance de {pack}.',
                'L\'emballage annonce une contenance de {pack}.',
            ],
        ],

        'flavour' => [
            'default' => [
                'La saveur référencée pour cette déclinaison est {flavour}.',
                'Cette déclinaison correspond au parfum {flavour}.',
                'Le goût indiqué sur cette référence est {flavour}.',
                'Il s\'agit de la version {flavour}.',
            ],
        ],
        /**
         * "Unflavored" is the absence of a flavour, so it gets its own bank and its own wording.
         *
         * "sans arôme AJOUTÉ" was one of these frames and says more than the source does: the row
         * carries a flavour field that IHerbNormalizer mapped to "Sans arôme", which tells us how
         * the variant is named — not that nothing aromatic is in the formula. The frames now name
         * the variant and stop there.
         */
        'flavour_none' => [
            'default' => [
                'La déclinaison retenue pour {core} est la version sans arôme.',
                '{core} est référencé ici dans sa version sans arôme.',
                'Cette fiche porte sur {core} en version sans arôme.',
            ],
        ],

        /**
         * Where the product sits in our own taxonomy. True by construction — we placed it there.
         *
         * Every frame names {core}. None of them used to: they carried {sub}, {cat} and {site} and
         * nothing else, all three of which are CONSTANT inside one brand-and-rayon cohort — so the
         * sentence was byte-identical on every product of that rayon. `placement` is in every plan,
         * and in three families it shares a paragraph with `label` and `label_scope`, which had the
         * same hole; the measured result was a middle paragraph that named no product at all, shared
         * verbatim across a sixth of a 300-product cohort. selfCheck() now rejects a frame whose only
         * placeholders are cohort-constant, which is what stops the next one.
         */
        'placement' => [
            'default' => [
                'Le rayon {sub}, où figure {core}, appartient à la catégorie {cat} du catalogue.',
                'Sur {site}, {core} est classé au rayon {sub}, rattaché à la catégorie {cat}.',
                'Ce rayon, {sub}, relève de la catégorie {cat} ; {core} y est listé.',
                'La catégorie {cat} regroupe le rayon {sub}, où {site} référence {core}.',
            ],
        ],
        /** Same slot when the parent category is unknown: says less, still says something true. */
        'placement_sub_only' => [
            'default' => [
                'Cette référence, {core}, est classée au rayon {sub} du catalogue.',
                'Sur {site}, {core} est listé au rayon {sub}.',
                'Le classement retenu pour {core} est le rayon {sub}.',
            ],
        ],

        /**
         * Defer to the manufacturer's label. This is the house rule, not a stylistic choice.
         *
         * Every frame names {core}. Naming the manufacturer as well is the more accurate sentence —
         * it is {brand} that prints the panel, not an anonymous "fabricant" — but {brand} is NOT a
         * product-specific placeholder and two of the three frames in each of these banks had only
         * that. Inside one brand's rayon the brand name is a constant, so those frames rendered the
         * same bytes on every product of that brand; paired with a `label_scope` frame that had the
         * same hole, a whole middle paragraph came out identical across the cohort — measured at 26
         * byte-identical paragraphs in a 300-product, one-brand, one-rayon sample. The frames now
         * carry {core} as well, and selfCheck() rejects any future frame that does not.
         */
        'label' => [
            'proteines' => [
                'Pour {core}, la composition complète et les valeurs nutritionnelles sont celles imprimées sur l\'emballage d\'origine.',
                '{brand} imprime la composition et les valeurs nutritionnelles sur l\'emballage d\'origine qui accompagne {core}.',
                'La composition et les valeurs nutritionnelles retenues pour {core} sont celles imprimées par {brand} sur l\'emballage.',
            ],
            'micronutrition' => [
                'Pour {core}, la composition et les apports par unité figurent sur l\'étiquette d\'origine.',
                '{brand} indique la composition et les apports par unité sur l\'étiquette d\'origine qui accompagne {core}.',
                'La liste des ingrédients et les apports par unité retenus pour {core} sont imprimés par {brand} sur l\'étiquette d\'origine.',
            ],
            'plantes' => [
                'Pour {core}, la composition et les indications d\'usage figurent sur l\'emballage d\'origine.',
                'La composition et les indications d\'usage sont imprimées par {brand} sur l\'emballage d\'origine qui accompagne {core}.',
                'Pour {core}, cette fiche renvoie à l\'emballage d\'origine, où {brand} imprime la composition et les indications d\'usage.',
            ],
            'default' => [
                'Pour {core}, la composition et les conseils d\'utilisation figurent sur l\'emballage d\'origine.',
                '{brand} imprime la composition et les conseils d\'utilisation sur l\'emballage d\'origine qui accompagne {core}.',
                'Pour {core}, cette fiche renvoie à l\'emballage d\'origine, où {brand} imprime la composition et les conseils d\'utilisation.',
            ],
        ],

        /**
         * Why the page carries no nutrition panel, said out loud.
         *
         * This is the sentence that most needed writing and is easiest to get wrong. It must not
         * read as "this page is unfinished"; it states a policy, which is what it actually is —
         * we publish a Supplement Facts panel only when it has been read off the label of the lot
         * we hold, and inventing or copying one from elsewhere is not on the table.
         *
         * The first frame used to open "Aucune valeur nutritionnelle n'est reproduite … tant
         * qu'ELLE n'a pas été relevée": a singular pronoun reaching back for its antecedent through
         * a negated plural noun phrase, which is not French. The frames now name what has not been
         * read — the label — rather than pronominalising what is not there.
         *
         * ── AND IT SAID "L'ÉTIQUETTE DU PRODUIT REÇU", WHICH IS A SUPPLY CLAIM ────────────
         * "le produit reçu" is a definite noun phrase asserting that the product has been RECEIVED
         * by us — the same class of assertion the `import` slot was deleted for, and forbidden for
         * the same reason: we hold no supplier record, no import document, no arrival date and no
         * stock (promotion writes qte = 0, so the badge on the very page says RUPTURE). It is not
         * load-bearing — the other three frames in this bank state the identical policy without it —
         * and it was reachable on roughly a quarter of the pages that pick this slot, which is in
         * every plan. The frame now names the label on the packaging, which is where the panel is
         * printed whether or not anything ever arrived anywhere. UNSUPPORTED_VOCABULARY grew a
         * `reçu` pattern so the next one fails the check instead of shipping.
         */
        'label_scope' => [
            'default' => [
                'Aucune valeur nutritionnelle n\'est publiée pour {core} tant que l\'étiquette imprimée sur l\'emballage n\'a pas été relevée.',
                '{site} ne publie un tableau nutritionnel qu\'après relevé de l\'étiquette : pour {core}, ce relevé n\'a pas encore été fait.',
                'Cette fiche ne reprend aucun chiffre nutritionnel pour {core} : seules les valeurs lues sur l\'étiquette du produit sont publiées.',
                'Les valeurs nutritionnelles ne sont ajoutées pour {core} qu\'après lecture de l\'étiquette imprimée par {brand} ; elles ne figurent donc pas encore sur cette fiche.',
            ],
        ],

        /**
         * The catalogue reference. Emitted ONLY when the caller passes one, and worded exactly as
         * the product page prints it ("Référence : X"), because the caller is the only party that
         * knows whether that value will actually appear on the page.
         */
        'reference' => [
            'default' => [
                'Référence catalogue : {ref}.',
                'Cette fiche porte la référence catalogue {ref}.',
                'Référence interne de la fiche : {ref}.',
            ],
        ],

        /**
         * The only slot about us rather than about the product, and it stays inside what we know.
         *
         * "renseigne sur {core} ET SUR LES RÉFÉRENCES ÉQUIVALENTES" was here and asserted that
         * equivalents exist in the catalogue — the same unsupported claim that removed `brandpage`,
         * one slot further down the page. The question mark in the third frame is gone too: French
         * typography wants a non-breaking space before it, and a stored column travelling through
         * strip_tags, JSON and a template is not where you want to be maintaining one.
         *
         * The fourth frame says "renseigne" and not "traite les demandes", which is the more natural
         * verb — and which selfCheck() rejects, because `\btraite\b` is one of
         * ProductContentGenerator::claimPatterns()' health-claim words. The pattern is right to be
         * blunt (a supplement page that "traite" anything is a regulated claim) and this bank simply
         * has no business using the word.
         */
        'contact' => [
            'default' => [
                'Pour toute question sur {core}, l\'équipe de {site} vous répond depuis sa boutique de Sousse.',
                'L\'équipe de {site}, installée à Sousse, répond aux questions portant sur {core}.',
                'Une question sur {core} : l\'équipe de {site} est joignable depuis sa boutique de Sousse.',
                'Depuis sa boutique de Sousse, l\'équipe de {site} renseigne sur {core}.',
            ],
        ],
    ];

    /**
     * Vocabulary this class may not use, because no column we hold supports it.
     *
     * A frame bank is read by a human once and then rendered ~20,000 times, so the guard has to be
     * mechanical. Each pattern here corresponds to a sentence that WAS in the banks above and was
     * removed: an import, a distribution, an availability, a stock or price statement, other
     * references of the brand, a review. The value is the reason, printed by selfCheck() so whoever
     * trips it reads the argument rather than just the rule.
     *
     * The `import` pattern is anchored on both sides so that it matches "importé"/"importateur" and
     * NOT "important" — a word ordinary copy is allowed to use.
     *
     * ── WHY `reçu` IS IN HERE ─────────────────────────────────────────────────────────────
     * Because it got past this list once. A `label_scope` frame read "l'étiquette du produit REÇU",
     * which asserts that we have taken delivery of the product — the same supply claim the whole
     * `import` slot was deleted for, in a different word, on roughly a quarter of the pages that
     * reach that slot. Nothing here matched it: an assertion is a MEANING, and this list can only
     * catch the spellings somebody thought of. Every entry below is a spelling that shipped.
     *
     * @var array<string, string>
     */
    private const UNSUPPORTED_VOCABULARY = [
        '~\bimport(?:e|é|ée|és|ées|er|ation|ations|ateur|ateurs)?\b~iu' => 'asserts an act of importation; we hold no supplier record, no import document and no arrival date',
        '~\bre[çc]u(?:e|s|es)?\b~iu' => 'asserts that the product has been received by us; we hold no supplier record, no arrival date and no stock — promotion writes qte = 0',
        '~\bdistribu~iu' => 'asserts distribution; we are not recorded anywhere as this product\'s distributor',
        '~\bdisponib~iu' => 'asserts availability; promotion writes qte = 0, so the page badge says the opposite',
        '~\bstocks?\b~iu' => 'asserts a stock state, which is live data and must never be baked into a stored column',
        '~\bprix\b~iu' => 'asserts a price, which is live data and must never be baked into a stored column',
        '~\blivraison\b~iu' => 'asserts a delivery term this class has no knowledge of',
        '~\bvend(?:u|ue|us|ues|re|ons|ez)\b~iu' => 'asserts a sale; the product is created unpublished with qte = 0',
        '~\bautres?\s+r[ée]f[ée]rences?\b~iu' => 'asserts that other references exist; the class is handed one brand string and knows nothing else that carries it',
        '~\b[ée]quivalent~iu' => 'asserts that an equivalent product exists in the catalogue',
        '~\bavis\b~iu' => 'advertises reviews; imported products carry none and emit no aggregateRating',
        '~\bauthentique~iu' => 'asserts an authenticity guarantee we have no chain of custody for',
        '~\bmeilleur~iu' => 'a superlative is a comparison, and we hold nothing to compare against',
    ];

    /**
     * Compose the copy.
     *
     * @param  array{
     *     name?: ?string,
     *     brand?: ?string,
     *     sub_category_slug?: ?string,
     *     sub_category_label?: ?string,
     *     category_label?: ?string,
     *     pack_size?: float|int|string|null,
     *     pack_unit?: ?string,
     *     flavour?: ?string,
     *     reference?: ?string,
     *     identity?: ?string,
     *     page_has_nutrition_panel?: bool
     * }  $facts  every key optional; every absent key removes the sentence that needed it.
     *            `page_has_nutrition_panel` is the one key that is not a fact about the product —
     *            see the note beside it in $available.
     * @return array{
     *     description_fr: ?string,
     *     seo_title: ?string,
     *     seo_description: ?string,
     *     word_count: int,
     *     facts_used: list<string>,
     *     family: string,
     *     arrangements: int
     * }
     *
     * `arrangements` is the number of DIFFERENT bodies this fact set could have produced across all
     * identities: the product of the bank sizes of the slots the plan actually filled. It is exact
     * — no two frames inside one bank are byte-identical, so two different picks cannot collapse
     * onto one body — and it is returned rather than computed in a comment because it is what makes
     * the distinctness of this whole scheme a thing a test can assert instead of a thing a docblock
     * claims. 1 means the body is fixed for this fact set; 0 slots filled means no body at all.
     */
    public static function compose(array $facts): array
    {
        $name = self::text($facts['name'] ?? null);
        $brand = self::text($facts['brand'] ?? null);
        $subSlug = self::text($facts['sub_category_slug'] ?? null);
        $subLabel = self::text($facts['sub_category_label'] ?? null);
        $catLabel = self::text($facts['category_label'] ?? null);
        $flavour = self::text($facts['flavour'] ?? null);
        $reference = self::text($facts['reference'] ?? null);

        $family = self::family($subSlug);
        $empty = [
            'description_fr' => null,
            'seo_title' => null,
            'seo_description' => null,
            'word_count' => 0,
            'facts_used' => [],
            'family' => $family,
            'arrangements' => 0,
        ];

        // The opening sentence needs a product, a brand and a rayon. Without all three there is no
        // true sentence to write about what this thing IS, and everything downstream would be
        // decoration around a hole. Both remaining gates in config/catalog.php agree — promotion
        // already requires a brand and a mapped category — so this is not a case that should reach
        // production; it returns nulls rather than a half-sentence if it ever does.
        if ($name === null || $brand === null || $subLabel === null) {
            return $empty;
        }

        $core = self::productCore($name, $brand);

        /**
         * A title whose head is nothing but the brand has no product identity to write about.
         *
         * productCore() used to hand back the head — which in this branch IS the brand — so
         * $full became "{brand} {brand}" and the identity frame rendered "<strong>NOW Foods</strong>,
         * de la marque NOW Foods, est inscrit au rayon …": the brand twice in one clause, which is
         * the exact failure the FRAMES docblock says the {core}/{full} split exists to prevent, and
         * it reached seo_title and seo_description as well.
         *
         * It is reachable: IHerbNormalizer::frenchTitle builds its head as trim(brand.' '.product)
         * and `product` is empty whenever stripLeadingBrand() consumed the whole displayName, so
         * normalized_title comes out as "NOW Foods – 454 g".
         *
         * Returning nulls is the same answer this method already gives for a missing brand or rayon,
         * for the same reason: there is no true sentence to write about what this thing IS, and
         * everything downstream would be decoration around a hole. CatalogIHerbPromote falls back to
         * its spec block for these rows, so they still get a description.
         */
        if ($core === '') {
            return $empty;
        }

        $full = trim($brand.' '.$core);

        $pack = self::pack($facts['pack_size'] ?? null, $facts['pack_unit'] ?? null);
        $form = self::form($facts['pack_unit'] ?? null);

        // Identity for the hash. The part number is preferred because it is stable across a title
        // rewrite: if the normaliser is improved and every title changes, seeding on the title would
        // reshuffle the phrasing of the entire catalogue at once and rewrite 20,000 live pages for
        // no reason. Falling back to the title keeps the function total.
        $identity = self::text($facts['identity'] ?? null) ?? $reference ?? $name;

        $values = [
            '{site}' => self::SITE,
            '{full}' => self::markupFree($full),
            // $core is guaranteed non-empty by the guard above; the old `$core !== '' ? $core : $full`
            // fallback was what silently put the brand into {core} on a brand-only title.
            '{core}' => self::markupFree($core),
            '{brand}' => self::markupFree($brand),
            '{sub}' => self::markupFree($subLabel),
            '{cat}' => $catLabel !== null ? self::markupFree($catLabel) : '',
            '{form}' => $form !== null ? self::markupFree($form) : '',
            '{pack}' => $pack !== null ? self::markupFree($pack['label']) : '',
            '{flavour}' => $flavour !== null ? self::markupFree($flavour) : '',
            '{ref}' => $reference !== null ? self::markupFree($reference) : '',
        ];

        /*
         * THE METADATA IS BUILT FROM THE SAME NEUTRALISED VALUES AS THE BODY.
         *
         * It was not. Every {placeholder} above went through markupFree(), and then seoTitle() and
         * seoDescription() were handed $full, $core, $brand, $subLabel, $pack and $flavour STRAIGHT
         * FROM self::text(), which only collapses whitespace. Same row, two different strings: for a
         * brand arriving as "Nature&#039;s Way" in a rayon labelled "Vitamines &amp; Minéraux" the
         * body read "…un produit Nature's Way…au rayon Vitamines & Minéraux" while seo_title kept
         * "Nature&#039;s Way …" and seo_description kept "Rayon Vitamines &amp; Minéraux, marque
         * Nature&#039;s Way". Markup leaked the same way: the body neutralised "Turbo <b>Ultra</b>
         * Complex", the title did not.
         *
         * Those two columns are the ones a crawler reads VERBATIM — x-crawler/product/[slug]
         * emits product.seo.title as `title: { absolute: … }` and product.seo.description as the
         * meta description and the og/twitter description, with no decode and no sanitise, and
         * ProductSchemaBuilder::plainDescription() prefers the same string for JSON-LD. So the one
         * half of the output that gets no second chance was the half that was not neutralised.
         *
         * It also corrupted the sizing: mb_strlen() counts "&#039;" as six characters, so the 30/60
         * and 110/160 windows were being enforced against a length no SERP ever shows.
         */
        $packText = $pack === null ? null : ['label' => self::markupFree($pack['label']), 'group' => $pack['group']];
        $flavourText = $flavour === null ? null : self::markupFree($flavour);
        $formText = $form === null ? null : self::markupFree($form);

        $factsUsed = ['name', 'brand', 'sub_category'];
        if ($catLabel !== null) {
            $factsUsed[] = 'category';
        }
        if ($pack !== null) {
            $factsUsed[] = 'pack';
        }
        if ($form !== null) {
            $factsUsed[] = 'form';
        }
        if ($flavour !== null) {
            $factsUsed[] = 'flavour';
        }
        if ($reference !== null) {
            $factsUsed[] = 'reference';
        }

        $available = [
            'form' => $form,
            'pack' => $pack,
            'flavour' => $flavour,
            'category' => $catLabel,
            'reference' => $reference,
            /*
             * NOT a fact about the product — a fact about the PAGE, and the only one this class is
             * told.
             *
             * The `label_scope` slot says, in every one of its frames, that no nutritional value is
             * published for this product because nobody has read its label. That was true of every
             * imported product for as long as this class has existed. It stops being true the moment
             * the page carries a transcribed Supplement Facts panel — and it then becomes precisely
             * the defect the "ONLY DURABLE FACTS" section above was written to prevent: a stored
             * sentence contradicting the page it is printed on, exactly like a stored "disponible"
             * next to a RUPTURE badge.
             *
             * So the caller, which is the only party that knows what the page will render, says so,
             * and bank() drops the slot. `label` is deliberately KEPT: "la composition et les
             * conseils d'utilisation figurent sur l'emballage d'origine" is still true beside a
             * transcribed panel, and is in fact the right disclaimer to have next to one.
             */
            'nutrition_panel' => ($facts['page_has_nutrition_panel'] ?? false) === true,
        ];

        $paragraphs = [];
        // The size of the phrasing space, accumulated as the plan is executed rather than rebuilt by
        // a second walk over PLANS — a duplicate walk is a duplicate set of skip rules, and the two
        // would drift the first time a slot learns a new condition.
        $arrangements = 1;

        foreach (self::PLANS[$family] as $slotGroup) {
            $sentences = [];
            foreach ($slotGroup as $slot) {
                $bank = self::bank($slot, $family, $available);
                if ($bank === null) {
                    continue;
                }
                $frames = $bank['frames'];
                $sentences[] = strtr($frames[self::pick($identity, $bank['slot'], count($frames))], $values);
                $arrangements *= count($frames);
            }
            if ($sentences !== []) {
                $paragraphs[] = '<p>'.implode(' ', $sentences).'</p>';
            }
        }

        $description = $paragraphs === [] ? null : implode('', $paragraphs);
        $wordCount = $description === null ? 0 : self::countWords($description);

        return [
            'description_fr' => $description,
            // $values holds the already-neutralised {full}/{core}/{brand}/{sub}; reusing them is what
            // makes "the body and the metadata are built from the same strings" a property of the
            // code rather than of whoever edits these two lines next.
            'seo_title' => self::seoTitle($values['{full}'], $values['{core}'], $values['{sub}'], $packText, $flavourText),
            'seo_description' => self::seoDescription($values['{full}'], $values['{brand}'], $values['{sub}'], $packText, $flavourText, $formText),
            'word_count' => $wordCount,
            'facts_used' => $factsUsed,
            'family' => $family,
            'arrangements' => $description === null ? 0 : $arrangements,
        ];
    }

    /**
     * Convenience adapter for an `external_catalog_products` row.
     *
     * The row carries `sous_category_id`, not a slug or a label, and this class must not touch the
     * database — so the caller resolves the subcategory and passes it in. Keeping the lookup outside
     * is what lets the whole class run under a bare `php` with no vendor/.
     *
     * @param  array<string, mixed>  $row       an ExternalCatalogProduct row (or its toArray())
     * @param  array<string, mixed>  $resolved  brand / sub_category_slug / sub_category_label /
     *                                          category_label / reference, resolved by the caller
     * @return array{description_fr: ?string, seo_title: ?string, seo_description: ?string, word_count: int, facts_used: list<string>, family: string, arrangements: int}
     */
    public static function fromStagingRow(array $row, array $resolved = []): array
    {
        return self::compose([
            'name' => $resolved['name'] ?? $row['normalized_title'] ?? $row['source_title'] ?? null,
            'brand' => $resolved['brand'] ?? $row['source_brand_name'] ?? null,
            'sub_category_slug' => $resolved['sub_category_slug'] ?? null,
            'sub_category_label' => $resolved['sub_category_label'] ?? null,
            'category_label' => $resolved['category_label'] ?? null,
            'pack_size' => $row['pack_size'] ?? null,
            'pack_unit' => $row['pack_unit'] ?? null,
            'flavour' => $row['flavour'] ?? null,
            'reference' => $resolved['reference'] ?? null,
            // Stable across a normaliser change; see the note at the call site in compose().
            'identity' => $row['external_part_number'] ?? $row['external_product_id'] ?? null,
            /*
             * Passed by the CALLER rather than derived from $row here, and that is deliberate: the
             * derivation lives in ImportedSourceContent, which applies the language gate, and this
             * class must not name it. Every harness that require()s ImportedProductContent on its
             * own — promotion-gate-check.php does — would then need a second require to avoid a
             * fatal at call time. A defaulted bool costs nothing and keeps this file loadable alone.
             */
            'page_has_nutrition_panel' => ($resolved['page_has_nutrition_panel'] ?? false) === true,
        ]);
    }

    /**
     * Every distinct sentence this class can produce, flattened.
     *
     * Exists so the harness — and anything else that cares — can assert over the WHOLE template bank
     * instead of over whatever a sample of products happened to select. A rule violated by a frame
     * that no test product reaches is still a rule violated on some fraction of 20,000 live pages.
     *
     * @return list<string>
     */
    public static function allFrames(): array
    {
        $out = [];
        foreach (self::FRAMES as $banks) {
            foreach ($banks as $frames) {
                foreach ($frames as $frame) {
                    $out[] = $frame;
                }
            }
        }

        return $out;
    }

    /**
     * Run the template bank through the project's existing content rules.
     *
     * ProductContentGenerator exports its claim and dosage patterns precisely so a second writer into
     * the same columns applies the same definitions — "two separate definitions of 'this is a dosage
     * instruction' would drift, at which point one entry point publishes advice the other rejects,
     * on the same product page". This class is that second writer, so it uses those patterns rather
     * than a copy, and additionally refuses any frame containing a bare digit: a number in a constant
     * template cannot have come from this product's data.
     *
     * Two rules of its own run alongside them, both learned from frames that shipped in this file:
     *
     *   · UNSUPPORTED_VOCABULARY — a frame may not assert an import, a distribution, an
     *     availability, a stock, a price, a review, or the existence of something the input never
     *     named. Each of those was a real sentence here, and each read perfectly well; that is the
     *     problem. Untrue copy does not look untrue, so it needs a mechanical check.
     *   · a frame must carry at least one placeholder that varies BETWEEN TWO PRODUCTS OF THE SAME
     *     BRAND IN THE SAME RAYON — {core}, {full}, {pack}, {flavour}, {form} or {ref}. The rule
     *     used to be "any placeholder that is not {site}", which accepted {brand}, {sub} and {cat};
     *     those are constants inside that cohort, so frames carrying only them rendered identical
     *     bytes across it, and whole paragraphs did.
     *
     * @return list<string> one message per offending frame; empty when the bank is clean
     */
    public static function selfCheck(): array
    {
        $problems = [];
        $patterns = array_merge(
            ProductContentGenerator::claimPatterns(),
            ProductContentGenerator::dosagePatterns()
        );

        foreach (self::allFrames() as $frame) {
            $plain = trim(preg_replace('~\s+~u', ' ', strip_tags($frame)) ?? $frame);

            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $plain)) {
                    $problems[] = 'health claim or dosage instruction in frame: '.$frame;

                    continue 2;
                }
            }

            $unsupported = self::unsupportedAssertions($plain);
            if ($unsupported !== []) {
                $problems[] = 'unsupported assertion in frame ('.$unsupported[0].'): '.$frame;

                continue;
            }

            // A digit inside a constant is a figure nobody measured for this product.
            if (preg_match('~\d~', $plain) === 1) {
                $problems[] = 'hardcoded figure in frame: '.$frame;

                continue;
            }

            /*
             * THE PLACEHOLDER MUST VARY BETWEEN TWO PRODUCTS THAT SIT SIDE BY SIDE.
             *
             * This was `\{(?!site\})[a-z_]+\}` — "any placeholder that is not {site}" — and it was
             * measuring the wrong thing. {brand}, {sub} and {cat} interpolate CONSTANTS inside a
             * brand-and-rayon cohort, which is the cohort the harness itself calls the worst
             * realistic one and the only cohort where near-duplicate bodies actually do damage. The
             * old rule therefore passed a bank of {brand}-only sentences as "product-specific", and
             * measured over 300 products of one brand in one rayon that let 50 pages carry a middle
             * paragraph naming no product at all, sharing two distinct strings between them — about
             * 40 % of a body, byte-identical, on a sixth of the cohort. Counting whole distinct
             * bodies cannot see it, because the paragraphs around it still differ.
             *
             * So the rule is now the one that was always meant: the frame must interpolate something
             * that DIFFERS from one product to the next — the name, the pack, the flavour, the
             * galenic form or the reference. {site}, {brand}, {sub} and {cat} do not count, whatever
             * else the frame carries.
             */
            if (preg_match('~\{(?:core|full|pack|flavour|form|ref)\}~', $frame) !== 1) {
                $problems[] = 'no per-product placeholder in frame (only cohort-constant ones): '.$frame;
            }
        }

        return $problems;
    }

    /**
     * Why this text asserts something our data does not support, or [] when it does not.
     *
     * Public, and used by selfCheck() rather than duplicated inside it, because the frame banks are
     * NOT the only thing this class writes: seoTitle() and seoDescription() assemble their strings
     * in PHP, from clauses that never appear in FRAMES, and the two worst offenders this file has
     * ever shipped — "importateur en Tunisie" and "Référence importée, disponible sur …" — were
     * both in seoDescription(), i.e. in exactly the half a frame-bank check cannot see. A caller
     * that wants to hold generated metadata to the same rule can now do so against the same
     * definitions, which is the reason ProductContentGenerator exports its patterns too.
     *
     * @return list<string> one reason per rule broken
     */
    public static function unsupportedAssertions(string $text): array
    {
        $reasons = [];
        foreach (self::UNSUPPORTED_VOCABULARY as $pattern => $why) {
            if (preg_match($pattern, $text)) {
                $reasons[] = $why;
            }
        }

        return $reasons;
    }

    // ─────────────────────────────────────────────────────────────────────────────────────
    // Sentence assembly
    // ─────────────────────────────────────────────────────────────────────────────────────

    /**
     * The frames one plan slot resolves to, or null when the fact it needs is missing.
     *
     * Split out of sentence() so that compose() can both PICK a frame and COUNT the frames it could
     * have picked from a single walk of the plan. The alternative — a second method re-deriving
     * which slots render — is two copies of every skip rule below, and the copy that gets forgotten
     * is the one that makes the harness's distinctness figure quietly wrong.
     *
     * The returned `slot` is the RESOLVED name (`pack_mass`, `flavour_none`, …) and that is what
     * pick() is seeded with, not the plan's name: `flavour` and `flavour_none` are different banks
     * of different sizes, and one seed for both would make a product's unflavoured wording a
     * function of an index chosen for a bank it never reaches.
     *
     * @param  array<string, mixed>  $available
     * @return array{slot: string, frames: list<string>}|null
     */
    private static function bank(string $slot, string $family, array $available): ?array
    {
        // Slots that resolve to a different bank depending on the facts present.
        if ($slot === 'ident_form') {
            // No form to fold in — fall back to the plain identity sentence rather than emitting a
            // sentence with an empty "{form}" hole in it.
            $slot = $available['form'] === null ? 'ident' : 'ident_form';
        }

        if ($slot === 'form' && $available['form'] === null) {
            return null;
        }

        // The page publishes a Supplement Facts panel, so the sentence that says none is published
        // has nothing left to be true about. See the `nutrition_panel` note in compose().
        if ($slot === 'label_scope' && ($available['nutrition_panel'] ?? false) === true) {
            return null;
        }

        if ($slot === 'pack') {
            if ($available['pack'] === null) {
                return null;
            }
            /** @var array{label: string, group: string} $pack */
            $pack = $available['pack'];
            $slot = 'pack_'.$pack['group'];
            // A unit group with no bank (currently only `dose`) is one we deliberately refuse to
            // describe. See UNIT_GROUPS.
            if (! isset(self::FRAMES[$slot])) {
                return null;
            }
        }

        if ($slot === 'flavour') {
            if ($available['flavour'] === null) {
                return null;
            }
            // IHerbNormalizer maps "Unflavored"/"Unflavoured" to exactly this string.
            $slot = $available['flavour'] === 'Sans arôme' ? 'flavour_none' : 'flavour';
        }

        if ($slot === 'placement') {
            $slot = $available['category'] === null ? 'placement_sub_only' : 'placement';
        }

        if ($slot === 'reference' && $available['reference'] === null) {
            return null;
        }

        $bank = self::FRAMES[$slot] ?? null;
        if ($bank === null) {
            return null;
        }

        $frames = $bank[$family] ?? $bank['default'] ?? null;
        if ($frames === null || $frames === []) {
            return null;
        }

        return ['slot' => $slot, 'frames' => array_values($frames)];
    }

    /**
     * Deterministic index into a frame bank.
     *
     * Seeded with the slot name as well as the product identity — see the class docblock.
     *
     * ── WHY md5 AND NOT crc32 ─────────────────────────────────────────────────────────────
     * This was crc32 first, and it was wrong for a structural reason. Product identities are not
     * random: they are sequential-ish part numbers, and crc32 is linear over GF(2), so its LOW bits
     * — which is exactly what `% 4` reads — stay correlated across inputs that differ only in a
     * suffix. The visible effect is fewer distinct bodies than independent selection would give, in
     * precisely the cohort — one subcategory, one pack shape, sequential part numbers — where
     * near-duplicate bodies do the damage.
     *
     * How much fewer is not asserted here, because a number in a comment is a number nothing checks.
     * The harness measures the realised fraction every run (see the class docblock): a hash that
     * correlates fails the ratio, whichever hash it is.
     *
     * md5's bit distribution has no such structure. It is a core function with no extension
     * dependency and returns the same digest on every platform and PHP version, which is what "same
     * input gives same output" has to mean for a value written into a database column: re-running
     * promotion must not rewrite copy that is already indexed. Seven hex digits (28 bits) rather than
     * eight, so hexdec() cannot exceed PHP_INT_MAX on a 32-bit build and return a float.
     */
    private static function pick(string $identity, string $slot, int $count): int
    {
        if ($count <= 1) {
            return 0;
        }

        return (int) (hexdec(substr(md5($identity.'#'.$slot), 0, 7)) % $count);
    }

    // ─────────────────────────────────────────────────────────────────────────────────────
    // Metadata
    // ─────────────────────────────────────────────────────────────────────────────────────

    /**
     * The <title>, 30-60 characters where the product name allows it.
     *
     * The crawler route emits `title: { absolute: … }` from `seo.title`, so whatever this returns is
     * the ENTIRE title tag — nothing is appended and nothing wraps it. That is why the site name is
     * added here rather than assumed, and why it is dropped rather than truncated when it does not
     * fit: a title cut mid-brand ("Optimum Nutrition Gold Standard 100% Whe…") reads as broken in a
     * result list, and the brand is the part a Tunisian buyer is scanning for.
     *
     * ── THE LADDER IS ORDERED BY PREFERENCE, NOT BY LENGTH ────────────────────────────────
     * This said "candidates are tried longest-first", and they are not: with a short rayon label
     * ("CLA") the third candidate is shorter than the second, and with a short brand the fourth is
     * longer than the third. Sorting them by length would make the sentence true and the OUTPUT
     * worse — on a 19-character name the longest fitting candidate is the one that dropped the
     * brand and kept " | Protéine Tunisie", which trades the word a Tunisian buyer scans for
     * against a site name repeated on every result. Each candidate gives up more of the OPTIONAL
     * material than the one before it, the first that lands inside the window wins, and that is
     * what the order means.
     *
     * ── EVERY ARGUMENT ARRIVES markupFree()'d; SEE THE CALL SITE ──────────────────────────
     * They did not use to, and the entity that survived here surfaced in the SERP title. Length is
     * measured on the neutralised string for the same reason: "&#039;" is six characters of window
     * spent on an apostrophe nobody sees.
     *
     * ── THE VARIANT SUFFIX IS NOT DECORATION; IT IS THE ONLY THING THAT DIFFERS ───────────────
     * iHerb lists every size and every flavour as its own part number, so each becomes its own
     * staging row, its own product and its own URL. This method used to build every candidate from
     * $full alone — and $full is productCore()'s output, which has ALREADY had the flavour and pack
     * segments stripped off. "Optimum Nutrition Gold Standard 100% Whey – Double Rich Chocolate –
     * 2,27 kg" and "… – Vanilla Ice Cream – 907 g" therefore both reduced to
     * "Optimum Nutrition Gold Standard 100% Whey", and the whole variant family shipped N distinct
     * URLs sharing one byte-identical <title> — the textbook duplicate-title signal, on exactly the
     * cohort this class was written to protect.
     *
     * So when the row carries a flavour or a pack size, EVERY candidate keeps ALL of them, and what
     * the ladder gives up instead is decoration: first the site name, then the brand. The brand is
     * what a Tunisian buyer scans for, which is why it is the last thing dropped — but it is
     * repeated on every variant of a product and so can never be what tells two of them apart.
     *
     * @param  array{label: string, group: string}|null  $pack
     */
    private static function seoTitle(string $full, string $core, string $subLabel, ?array $pack, ?string $flavour): ?string
    {
        if ($full === '') {
            return null;
        }

        // "Sans arôme" is included on purpose: the unflavoured SKU is a different product page from
        // the chocolate one, so the absence of a flavour is itself a discriminator here.
        $discriminators = [];
        if ($flavour !== null) {
            $discriminators[] = $flavour;
        }
        if ($pack !== null) {
            $discriminators[] = $pack['label'];
        }

        $variant = $discriminators === [] ? '' : ' – '.implode(' – ', $discriminators);

        $candidates = $variant === ''
            // Nothing distinguishes this row from a sibling, so the original ladder stands.
            ? [
                $full.' – '.$subLabel.' | '.self::SITE,
                $full.' | '.self::SITE,
                $full.' – '.$subLabel.' Tunisie',
                $full.' – Tunisie',
                $full,
            ]
            : [
                $full.$variant.' | '.self::SITE,
                $full.$variant,
                $core.$variant.' | '.self::SITE,
                $core.$variant,
            ];

        foreach ($candidates as $candidate) {
            $length = mb_strlen($candidate);
            if ($length >= self::TITLE_MIN && $length <= self::TITLE_MAX) {
                return $candidate;
            }
        }

        if ($variant !== '') {
            // Everything overshoots even with the brand gone. Truncate the NAME on a word boundary
            // and keep the discriminators whole: a name cut at a space still reads, whereas dropping
            // a discriminator hands two different URLs the same title again.
            $room = self::TITLE_MAX - mb_strlen($variant);
            $lead = ($core !== '' && mb_strlen($core) < mb_strlen($full)) ? $core : $full;

            // Below ~12 characters there is no name left to read, so the title runs long instead.
            // Google truncates the DISPLAY of a long title; it does not merge two URLs because one
            // of them was 75 characters, and length is the only currency left to pay for uniqueness.
            return $room >= 12 ? self::truncateOnWord($lead, $room).$variant : $lead.$variant;
        }

        // Everything overshoots: the product name alone is longer than the window. Truncate the name
        // on a word boundary — never mid-word — and drop the suffix entirely.
        if (mb_strlen($full) > self::TITLE_MAX) {
            return self::truncateOnWord($full, self::TITLE_MAX);
        }

        // Everything undershoots: a very short name with a short rayon. The first candidate is the
        // one that gave up nothing, so it is the most informative thing we can return.
        return $candidates[0];
    }

    /**
     * The meta description, 110-160 characters.
     *
     * Built by adding clauses while they fit, so a product with more facts gets a denser sentence
     * instead of the same sentence with a different noun in it. Deliberately contains NO price and NO
     * availability: this string is stored on the product and served until it is rewritten, and a
     * stored price is a promise that stops being true the first time the price moves.
     *
     * It also does not contain the word "avis". The route's current fallback does — on a page that
     * renders no reviews and emits no aggregateRating — which is a snippet that advertises something
     * the page does not have.
     *
     * ── THE TWO CLAUSES THAT WERE HERE AND SHOULD NOT HAVE BEEN ──────────────────────────
     * The longest tail ended "…, importateur en Tunisie", and the padding clause read "Référence
     * importée, disponible sur Protéine Tunisie en Tunisie". Both were about to be printed in the
     * SERP snippet of a page whose own badge says RUPTURE — promotion writes qte = 0 — and neither
     * import nor distribution is a fact we hold for a single one of these rows. A meta description
     * is the one sentence a searcher reads before deciding whether we are worth a click; "available"
     * on an out-of-stock page is the cheapest possible way to teach them we are not.
     *
     * What replaced the padding is a clause about US — the shop, in Sousse — which is true whatever
     * the stock column says and cannot go stale in a stored string.
     *
     * Every argument arrives markupFree()'d; see the call site. "Rayon Vitamines &amp; Minéraux,
     * marque Nature&#039;s Way" was reaching the meta description, the og:description and the JSON-LD
     * description while the body of the same page read them decoded.
     *
     * @param  array{label: string, group: string}|null  $pack
     */
    private static function seoDescription(
        string $full,
        string $brand,
        string $subLabel,
        ?array $pack,
        ?string $flavour,
        ?string $form
    ): ?string {
        if ($full === '') {
            return null;
        }

        // Opening clause: the product, as densely as the facts allow.
        $lead = $full;
        $qualifiers = [];
        if ($flavour !== null && $flavour !== 'Sans arôme') {
            $qualifiers[] = $flavour;
        }
        if ($pack !== null) {
            $qualifiers[] = $pack['label'];
        } elseif ($form !== null) {
            $qualifiers[] = $form;
        }
        if ($qualifiers !== []) {
            $lead .= ', '.implode(', ', $qualifiers);
        }
        $lead .= '.';

        /*
         * Tail clauses. Every one of them states only where the product sits in our catalogue and
         * who makes it — the two things we are certain of — and they are SORTED by length here
         * rather than written in a hopeful order, because whether "Rayon X, marque Y" is longer
         * than "Fiche produit du rayon X" depends entirely on how long X and Y turn out to be. With
         * the sort, "the first tail that fits is the longest that fits" is a property of the code
         * instead of an assumption about the data.
         */
        $tails = [
            'Rayon '.$subLabel.', marque '.$brand.', sur '.self::SITE.'.',
            'Fiche produit du rayon '.$subLabel.' sur '.self::SITE.'.',
            'Rayon '.$subLabel.' sur '.self::SITE.'.',
            'Marque '.$brand.' sur '.self::SITE.'.',
        ];
        usort($tails, static fn (string $a, string $b): int => mb_strlen($b) <=> mb_strlen($a));

        $best = null;
        foreach ($tails as $tail) {
            $candidate = $lead.' '.$tail;
            if (mb_strlen($candidate) <= self::DESCRIPTION_MAX) {
                $best = $candidate;
                break;
            }
        }

        if ($best === null) {
            // The lead alone already fills the window. Trim it on a word boundary rather than
            // publishing a description that Google will cut mid-word anyway.
            $best = mb_strlen($lead) > self::DESCRIPTION_MAX
                ? self::truncateOnWord($lead, self::DESCRIPTION_MAX)
                : $lead;
        }

        /*
         * Still under the window? Say who we are, longest phrasing first, and add nothing if even
         * the shortest overshoots. None of these mentions the rayon, the brand or the site name, so
         * whichever tail was chosen above, the sentence does not repeat it back.
         */
        if (mb_strlen($best) < self::DESCRIPTION_MIN) {
            foreach ([
                ' Boutique de compléments alimentaires à Sousse, en Tunisie.',
                ' Boutique de compléments à Sousse, en Tunisie.',
                ' Boutique à Sousse, en Tunisie.',
            ] as $extra) {
                if (mb_strlen($best.$extra) <= self::DESCRIPTION_MAX) {
                    $best .= $extra;
                    break;
                }
            }
        }

        return $best;
    }

    // ─────────────────────────────────────────────────────────────────────────────────────
    // Fact extraction
    // ─────────────────────────────────────────────────────────────────────────────────────

    /**
     * Content family for a subcategory slug, `default` for anything unmapped.
     *
     * Both sides are lower-cased. The map used to be tried verbatim first and lower-cased second,
     * which worked only for as long as every caller spelled the slug exactly the way the key was
     * typed — and the map contained one mixed-case key (`Intra-Workout`, matching the live rayon at
     * /Intra-Workout), so the two conventions were already coexisting. `mb_strtolower`, not
     * `strtolower`: slugs are UTF-8 and a byte-wise lower-case mangles accented ones.
     */
    private static function family(?string $subSlug): string
    {
        if ($subSlug === null) {
            return 'default';
        }

        return self::FAMILY_BY_SUBCATEGORY[mb_strtolower($subSlug)] ?? 'default';
    }

    /**
     * The product name with the brand stripped off the front.
     *
     * `normalized_title` is "Brand Product – Flavour – Size" (IHerbNormalizer::frenchTitle), so the
     * prose would otherwise read "Optimum Nutrition Gold Standard 100% Whey – Double Rich Chocolate –
     * 2,29 kg est une référence Optimum Nutrition" — the brand twice and the flavour and size
     * repeated in the very sentences that are about to state them separately.
     *
     * ── RETURNS '' WHEN NOTHING SURVIVES, AND THAT IS THE POINT ───────────────────────────
     * It used to `return $core !== '' ? $core : $head`, and in that branch $head IS the brand — so
     * a title carrying no product name handed the brand back as the product name and compose() then
     * built "{brand} {brand}". Signalling absence with '' lets the caller refuse to write copy it
     * cannot write truthfully, instead of writing it twice.
     */
    private static function productCore(string $name, string $brand): string
    {
        // Everything before the first en-dash separator: the flavour and the pack size are their own
        // segments and are stated by their own slots.
        $head = trim(explode(' – ', $name)[0]);
        if ($head === '') {
            $head = $name;
        }

        $pattern = '~^\s*'.preg_quote($brand, '~').'\s*[,\-–:]?\s*~iu';
        $core = trim(preg_replace($pattern, '', $head) ?? $head);

        /**
         * Second pass, because the regex above is exact and the two strings need not be.
         *
         * `source_brand_name` and the brand embedded in the title come from different fields of the
         * same payload and can differ by a trademark mark or a curly apostrophe ("Nature's Way" vs
         * "Nature’s Way"). When they do, the anchored pattern misses and `core` still starts with
         * the brand — which would put the brand back into a sentence that then states it again.
         * A plain case-insensitive prefix test catches what the regex could not.
         */
        if ($core !== '' && mb_stripos($core, $brand) === 0) {
            // Assigned unconditionally, including when the result is ''. An empty result here means
            // `core` was the brand and nothing else — which is absence, not a reason to keep the
            // brand as the product name.
            $core = trim(mb_substr($core, mb_strlen($brand)), " \t,-–:");
        }

        return $core;
    }

    /**
     * Pack size as a printable French phrase, plus the kind of thing it measures.
     *
     * Returns null for a per-unit dose (mg/µg): that figure is the strength of ONE capsule, and
     * printing it as a conditionnement would turn a 180-capsule bottle into a "500 mg" product. It
     * is the same trap IHerbNormalizer::packSize documents, one layer further downstream.
     *
     * @return array{label: string, group: string}|null
     */
    private static function pack(mixed $size, mixed $unit): ?array
    {
        $unitText = self::text($unit);
        if ($unitText === null) {
            return null;
        }

        $quantity = is_numeric($size) ? (float) $size : null;
        if ($quantity === null || $quantity <= 0) {
            return null;
        }

        $group = self::UNIT_GROUPS[$unitText] ?? self::UNIT_GROUPS[mb_strtolower($unitText)] ?? null;
        if ($group === null || $group === 'dose') {
            return null;
        }

        return ['label' => self::frenchNumber($quantity).' '.$unitText, 'group' => $group];
    }

    /** The galenic form, or null when the unit says nothing about form (a mass, a volume). */
    private static function form(mixed $unit): ?string
    {
        $unitText = self::text($unit);
        if ($unitText === null) {
            return null;
        }

        return self::FORM_PHRASES[$unitText] ?? self::FORM_PHRASES[mb_strtolower($unitText)] ?? null;
    }

    // ─────────────────────────────────────────────────────────────────────────────────────
    // Small helpers
    // ─────────────────────────────────────────────────────────────────────────────────────

    /** Trim to a non-empty string, or null. Whitespace-only is absent, not present-and-blank. */
    private static function text(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $text = trim(preg_replace('~\s+~u', ' ', (string) $value) ?? (string) $value);

        return $text === '' ? null : $text;
    }

    /**
     * A third-party value, reduced to something that cannot open a tag.
     *
     * The frames are ours; the VALUES are a third party's — brand names, titles and rayon labels.
     * `sanitizeRichHtml` on the storefront is the last line of defence, not the only one, and
     * `description_fr` is read by more than one consumer (the human PDP, the crawler view, the
     * schema description, the Merchant feed). Neutralising at the point of composition means the
     * column never holds markup we did not write.
     *
     * ── WHY THIS REMOVES CHARACTERS INSTEAD OF ENCODING THEM ──────────────────────────────
     * This was htmlspecialchars(ENT_NOQUOTES), whose docblock argued at length that quotes must NOT
     * be encoded because the consumers deriving plain text from this column use strip_tags or a tag
     * regex, which removes markup but does not decode entities — so `Doctor&#039;s Best` would
     * surface literally in a meta description. The argument was right and it was applied to one
     * character too few: ENT_NOQUOTES still encodes `&`, and `&` is not an exotic input here. Three
     * of this shop's own rayon labels contain one — "Sommeil & Stress", "Santé & Vitalité",
     * "Barres & Snacks Protéinés" — so the very consumers that comment describes were receiving
     * "Sommeil &amp; Stress" as literal text, in a meta description, on every page of those rayons.
     *
     * Encoding cannot fix that: any entity survives strip_tags by construction. So nothing is
     * encoded. Entities already present in the input are DECODED first (a source string carrying
     * `&amp;` must not become `&amp;amp;`), and then the only two characters that can open markup
     * in text content are dropped. What is left is a string that reads identically as HTML and as
     * plain text, which is the only property that actually holds across every consumer.
     *
     * A bare `&` in the stored HTML is well-formed: HTML5 only calls an ampersand ambiguous when it
     * is followed by alphanumerics AND a semicolon, which "& Stress" is not. `<` and `>` are
     * replaced by a space rather than deleted so that a title like "A<B" does not silently become
     * one word; the whitespace collapse then tidies up.
     */
    private static function markupFree(string $value): string
    {
        $decoded = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $stripped = str_replace(['<', '>'], ' ', $decoded);

        return trim(preg_replace('~\s+~u', ' ', $stripped) ?? $stripped);
    }

    /** "2.29" → "2,29"; "600" → "600". Matches IHerbNormalizer; no rounding, no conversion. */
    private static function frenchNumber(float $value): string
    {
        $formatted = rtrim(rtrim(number_format($value, 3, '.', ''), '0'), '.');

        return str_replace('.', ',', $formatted === '' ? '0' : $formatted);
    }

    /** Cut at or before $max characters, on a space, with no trailing separator left dangling. */
    private static function truncateOnWord(string $text, int $max): string
    {
        if (mb_strlen($text) <= $max) {
            return $text;
        }

        $slice = mb_substr($text, 0, $max);
        $lastSpace = mb_strrpos($slice, ' ');
        if ($lastSpace !== false && $lastSpace > 0) {
            $slice = mb_substr($slice, 0, $lastSpace);
        }

        return rtrim($slice, " \t\n\r\0\x0B,;:-–|.");
    }

    /**
     * Word count, computed the way the audit computes it.
     *
     * frontend/scripts/audit-pdp-content.mjs strips tags, decodes entities, collapses whitespace,
     * splits on a single space and counts tokens longer than one character. Mirroring that exactly
     * means the number returned here is comparable to the number that script will report for the
     * rendered page, rather than a second definition of "word" that happens to be more flattering.
     *
     * Note this is NOT str_word_count(): that function splits on bytes and would score "référencé"
     * as three words in UTF-8.
     */
    public static function countWords(string $html): int
    {
        $plain = strip_tags($html);
        $plain = html_entity_decode($plain, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $plain = trim(preg_replace('~\s+~u', ' ', $plain) ?? $plain);

        if ($plain === '') {
            return 0;
        }

        $count = 0;
        foreach (explode(' ', $plain) as $token) {
            if (mb_strlen($token) > 1) {
                $count++;
            }
        }

        return $count;
    }
}
