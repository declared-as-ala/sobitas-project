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
 *
 * Those are the same four rules App\Services\Content\ProductContentGenerator enforces on LLM output,
 * and selfCheck() below runs this class's own template bank through THAT class's exported patterns —
 * so a template added later that says "2 gélules par jour" fails a check instead of shipping.
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
 * ── MEASURED, NOT ASSERTED ────────────────────────────────────────────────────────────────
 * Numbers below come from running this class's own template bank and control flow over generated
 * inputs. There is no php binary on the development machine (see the note on the harness at the
 * bottom of this block), so the run was done outside PHP against the constants in THIS file; the
 * harness reproduces it wherever PHP exists, and it is the authority if the two ever disagree.
 *
 *   · 15 products shaped the way IHerbNormalizer produces them: 99-129 words, median 114
 *   · 768 distinct fact shapes at a FIXED identity — i.e. axis 3 pinned, axes 1 and 2 alone —
 *     produced 263 distinct bodies
 *   · the worst realistic cohort (ONE subcategory, ONE brand, ONE pack size, ONE flavour state:
 *     every fact identical, only the identity differing) produced 4,937 distinct bodies from 5,000
 *     identities. Independent selection over the ~196,000 arrangements available to that cohort
 *     predicts about 4,940, so the hash is realising essentially all of the variation the banks
 *     contain. The sparsest possible product — name, brand and rayon only, no pack, no flavour, no
 *     reference, no parent category — has a smaller space and produced 3,832 from 5,000, which is
 *     what the birthday bound predicts for it.
 *   · 95 frames in the bank, 0 of them containing a digit
 *
 * ── WHAT THIS DOES NOT SOLVE, STATED PLAINLY ──────────────────────────────────────────────
 * Around 100-130 words. That is materially more than the 83-93 the storefront's current fallback
 * produces, and every word of it is grounded — but it is NOT 250, and no honest arrangement of the
 * columns we hold reaches 250. `word_count` is returned for exactly this reason: it is computed the
 * way frontend/scripts/audit-pdp-content.mjs computes `bodyWords` (strip tags, collapse whitespace,
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
        'Intra-Workout' => 'performance',

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
     */
    private const PLANS = [
        'proteines' => [
            ['ident', 'pack', 'flavour'],
            ['placement', 'import', 'label', 'label_scope'],
            ['brandpage', 'reference', 'contact'],
        ],
        'performance' => [
            ['ident', 'form', 'pack', 'flavour'],
            ['placement', 'label', 'label_scope', 'import'],
            ['brandpage', 'reference', 'contact'],
        ],
        'silhouette' => [
            ['ident', 'form', 'pack'],
            ['placement', 'label', 'label_scope'],
            ['import', 'brandpage', 'reference', 'contact'],
        ],
        'micronutrition' => [
            ['ident_form', 'pack', 'placement'],
            ['label', 'label_scope', 'import'],
            ['brandpage', 'reference', 'contact'],
        ],
        'plantes' => [
            ['ident_form', 'pack', 'placement'],
            ['label_scope', 'label', 'import'],
            ['reference', 'brandpage', 'contact'],
        ],
        'bienetre' => [
            ['ident_form', 'flavour', 'pack'],
            ['placement', 'import', 'label', 'label_scope'],
            ['brandpage', 'reference', 'contact'],
        ],
        'snacking' => [
            ['ident', 'flavour', 'pack'],
            ['placement', 'label', 'label_scope'],
            ['import', 'brandpage', 'reference', 'contact'],
        ],
        'default' => [
            ['ident', 'form', 'pack', 'flavour'],
            ['placement', 'label', 'label_scope', 'import'],
            ['brandpage', 'reference', 'contact'],
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
                '{site} référence <strong>{core}</strong>, produit {brand}, à son rayon {sub}.',
                'Au rayon {sub} de {site} figure <strong>{core}</strong>, signé {brand}.',
                '<strong>{core}</strong> porte la marque {brand} et occupe le rayon {sub} du catalogue {site}.',
            ],
            'performance' => [
                '<strong>{core}</strong>, signé {brand}, est classé au rayon {sub} du catalogue {site}.',
                'Au catalogue {site}, <strong>{core}</strong> relève du rayon {sub} et porte la marque {brand}.',
                '{site} référence <strong>{core}</strong>, produit {brand}, au rayon {sub}.',
                '<strong>{core}</strong> rejoint le rayon {sub} de {site}, dans la gamme {brand}.',
            ],
            'silhouette' => [
                '<strong>{core}</strong> est un produit {brand} référencé par {site} au rayon {sub}.',
                '{site} inscrit <strong>{core}</strong>, de la marque {brand}, à son rayon {sub}.',
                'Le rayon {sub} de {site} comprend <strong>{core}</strong>, marque {brand}.',
                '<strong>{core}</strong>, marque {brand}, est classé en {sub} au catalogue {site}.',
            ],
            'snacking' => [
                '<strong>{core}</strong> est un produit {brand} référencé au rayon {sub} de {site}.',
                '{site} propose <strong>{core}</strong>, de la marque {brand}, au rayon {sub}.',
                'Au rayon {sub}, {site} référence <strong>{core}</strong>, signé {brand}.',
                '<strong>{core}</strong> vient de la marque {brand} et figure au rayon {sub} du catalogue {site}.',
            ],
            'default' => [
                '<strong>{core}</strong>, de la marque {brand}, est inscrit au rayon {sub} de {site}.',
                '{site} référence <strong>{core}</strong>, produit {brand}, au rayon {sub}.',
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
                '<strong>{core}</strong> est un complément {brand} présenté sous forme de {form} et référencé par {site} au rayon {sub}.',
                'Proposé en {form}, <strong>{core}</strong> porte la marque {brand} et figure au rayon {sub} du catalogue {site}.',
                '{site} référence <strong>{core}</strong> au rayon {sub} : un produit {brand} conditionné en {form}.',
                '<strong>{core}</strong>, marque {brand}, se présente en {form} et appartient au rayon {sub} de {site}.',
            ],
            'plantes' => [
                '<strong>{core}</strong> est un produit {brand} présenté en {form}, référencé par {site} au rayon {sub}.',
                'Au rayon {sub} de {site}, <strong>{core}</strong> se présente en {form} et porte la marque {brand}.',
                '{site} inscrit <strong>{core}</strong> à son rayon {sub} : marque {brand}, conditionnement en {form}.',
                'Signé {brand} et proposé en {form}, <strong>{core}</strong> relève du rayon {sub} du catalogue {site}.',
            ],
            'bienetre' => [
                '<strong>{core}</strong>, de la marque {brand}, est proposé en {form} et classé au rayon {sub} de {site}.',
                '{site} référence <strong>{core}</strong> en {form} au rayon {sub}, sous la marque {brand}.',
                'Présenté en {form}, <strong>{core}</strong> figure au rayon {sub} du catalogue {site} et porte la marque {brand}.',
                'Au rayon {sub}, {site} propose <strong>{core}</strong> — marque {brand}, format {form}.',
            ],
            'default' => [
                '<strong>{core}</strong>, marque {brand}, se présente en {form} et figure au rayon {sub} de {site}.',
                '{site} référence <strong>{core}</strong> au rayon {sub} : produit {brand} conditionné en {form}.',
                'Proposé en {form}, <strong>{core}</strong> porte la marque {brand} et relève du rayon {sub} de {site}.',
                'Au rayon {sub} du catalogue {site}, <strong>{core}</strong> est un produit {brand} présenté en {form}.',
            ],
        ],

        /** Galenic form as its own sentence, for the families that do not fold it into the opener. */
        'form' => [
            'default' => [
                'Cette référence se présente sous forme de {form}.',
                'Le produit est conditionné en {form}.',
                'Il s\'agit d\'un format {form}.',
            ],
        ],

        /**
         * Conditionnement. Fact-keyed rather than family-keyed: what changes here is whether the
         * figure counts units or weighs the contents, and that is a property of the unit.
         */
        'pack_count' => [
            'default' => [
                'Le conditionnement annoncé est de {pack}.',
                'Chaque unité vendue contient {pack}.',
                'La quantité indiquée sur l\'emballage est de {pack}.',
                'L\'emballage annonce {pack}.',
            ],
        ],
        'pack_mass' => [
            'default' => [
                'Le format référencé est de {pack}.',
                'Le poids net indiqué sur l\'emballage est de {pack}.',
                'Cette référence correspond au conditionnement de {pack}.',
                'La contenance annoncée est de {pack}.',
            ],
        ],
        'pack_volume' => [
            'default' => [
                'Le volume indiqué sur l\'emballage est de {pack}.',
                'Cette référence correspond à la contenance de {pack}.',
                'Le conditionnement annoncé est de {pack}.',
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
        /** "Unflavored" is the absence of a flavour, so it gets its own bank and its own wording. */
        'flavour_none' => [
            'default' => [
                'Cette version est référencée sans arôme ajouté.',
                'La déclinaison référencée ici est la version sans arôme.',
                'Il s\'agit de la version neutre, sans arôme.',
            ],
        ],

        /** Where the product sits in our own taxonomy. True by construction — we placed it there. */
        'placement' => [
            'default' => [
                'Le rayon {sub} appartient à la catégorie {cat} du catalogue.',
                'Sur {site}, {sub} est un rayon de la catégorie {cat}.',
                '{sub} fait partie de la catégorie {cat}.',
                'Ce rayon, {sub}, est rattaché à la catégorie {cat}.',
            ],
        ],
        /** Same slot when the parent category is unknown: says less, still says something true. */
        'placement_sub_only' => [
            'default' => [
                'Cette référence est classée au rayon {sub} du catalogue.',
                'Sur {site}, le produit est listé au rayon {sub}.',
                'Le classement retenu pour cette fiche est le rayon {sub}.',
            ],
        ],

        'import' => [
            'default' => [
                'Ce produit est importé et proposé à la vente en Tunisie par {site}.',
                '{site} importe cette référence et la propose à sa clientèle en Tunisie.',
                'Il s\'agit d\'une référence importée, distribuée en Tunisie par {site}.',
                'Cette référence fait partie du catalogue importé de {site} pour la Tunisie.',
            ],
        ],

        /** Defer to the manufacturer's label. This is the house rule, not a stylistic choice. */
        'label' => [
            'proteines' => [
                'La composition complète et les valeurs nutritionnelles figurent sur l\'emballage d\'origine du fabricant.',
                'Reportez-vous à l\'étiquette du fabricant pour la composition et les valeurs nutritionnelles.',
                'Les valeurs nutritionnelles et la liste des ingrédients sont celles imprimées sur l\'emballage d\'origine.',
            ],
            'micronutrition' => [
                'La composition et les apports par unité figurent sur l\'étiquette d\'origine du fabricant.',
                'Reportez-vous à l\'emballage du fabricant pour la composition détaillée et les apports.',
                'Les apports et la liste des ingrédients sont ceux imprimés sur l\'étiquette d\'origine.',
            ],
            'plantes' => [
                'La composition et les indications d\'usage figurent sur l\'étiquette d\'origine du fabricant.',
                'Reportez-vous à l\'emballage d\'origine pour la composition et les indications du fabricant.',
                'Les informations de composition sont celles imprimées par le fabricant sur l\'emballage.',
            ],
            'default' => [
                'La composition et les conseils d\'utilisation figurent sur l\'emballage d\'origine du fabricant.',
                'Reportez-vous à l\'étiquette du fabricant pour la composition et les conseils d\'utilisation.',
                'Les informations de composition et d\'usage sont celles imprimées sur l\'emballage d\'origine.',
            ],
        ],

        /**
         * Why the page carries no nutrition panel, said out loud.
         *
         * This is the sentence that most needed writing and is easiest to get wrong. It must not
         * read as "this page is unfinished"; it states a policy, which is what it actually is —
         * we publish a Supplement Facts panel only when it has been read off the label of the lot
         * we hold, and inventing or copying one from elsewhere is not on the table.
         */
        'label_scope' => [
            'default' => [
                'Aucune valeur nutritionnelle n\'est reproduite sur cette page tant qu\'elle n\'a pas été relevée sur l\'étiquette du produit reçu.',
                'Nous ne publions un tableau nutritionnel qu\'une fois relevé sur l\'étiquette du produit lui-même, ce qui n\'est pas encore le cas ici.',
                'Cette fiche ne reprend aucun chiffre nutritionnel : nous ne publions que les valeurs lues sur l\'étiquette du produit reçu.',
                'Les chiffres nutritionnels ne sont ajoutés qu\'après lecture de l\'étiquette du produit reçu ; ils ne figurent donc pas encore ici.',
            ],
        ],

        /** The brand page exists — BrandMatcher creates it, and the PDP already links to it. */
        'brandpage' => [
            'default' => [
                'Les autres références {brand} disponibles sur {site} sont regroupées sur la page de la marque.',
                'La page de marque {brand} rassemble les autres références disponibles sur {site}.',
                'Vous retrouvez le reste de la sélection {brand} sur sa page de marque.',
                'La marque {brand} dispose de sa propre page sur {site}.',
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

        'contact' => [
            'default' => [
                'Pour toute question sur {core}, l\'équipe de {site} répond depuis sa boutique de Sousse.',
                'L\'équipe de {site}, à Sousse, renseigne sur {core} et sur les références équivalentes.',
                'Une question sur {core} ? L\'équipe de {site} est joignable depuis sa boutique de Sousse.',
                'Notre équipe, installée à Sousse, répond aux questions portant sur {core}.',
            ],
        ],
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
     *     identity?: ?string
     * }  $facts  every key optional; every absent key removes the sentence that needed it
     * @return array{
     *     description_fr: ?string,
     *     seo_title: ?string,
     *     seo_description: ?string,
     *     word_count: int,
     *     facts_used: list<string>,
     *     family: string
     * }
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
            '{full}' => self::escape($full),
            // $core is guaranteed non-empty by the guard above; the old `$core !== '' ? $core : $full`
            // fallback was what silently put the brand into {core} on a brand-only title.
            '{core}' => self::escape($core),
            '{brand}' => self::escape($brand),
            '{sub}' => self::escape($subLabel),
            '{cat}' => $catLabel !== null ? self::escape($catLabel) : '',
            '{form}' => $form !== null ? self::escape($form) : '',
            '{pack}' => $pack !== null ? self::escape($pack['label']) : '',
            '{flavour}' => $flavour !== null ? self::escape($flavour) : '',
            '{ref}' => $reference !== null ? self::escape($reference) : '',
        ];

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

        $paragraphs = [];
        foreach (self::PLANS[$family] as $slotGroup) {
            $sentences = [];
            foreach ($slotGroup as $slot) {
                $sentence = self::sentence($slot, $family, $identity, $values, [
                    'form' => $form,
                    'pack' => $pack,
                    'flavour' => $flavour,
                    'category' => $catLabel,
                    'reference' => $reference,
                ]);
                if ($sentence !== null) {
                    $sentences[] = $sentence;
                }
            }
            if ($sentences !== []) {
                $paragraphs[] = '<p>'.implode(' ', $sentences).'</p>';
            }
        }

        $description = $paragraphs === [] ? null : implode('', $paragraphs);
        $wordCount = $description === null ? 0 : self::countWords($description);

        return [
            'description_fr' => $description,
            'seo_title' => self::seoTitle($full, $core, $subLabel, $pack, $flavour),
            'seo_description' => self::seoDescription($full, $brand, $subLabel, $pack, $flavour, $form),
            'word_count' => $wordCount,
            'facts_used' => $factsUsed,
            'family' => $family,
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
     * @return array{description_fr: ?string, seo_title: ?string, seo_description: ?string, word_count: int, facts_used: list<string>, family: string}
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

            // A digit inside a constant is a figure nobody measured for this product.
            if (preg_match('~\d~', $plain) === 1) {
                $problems[] = 'hardcoded figure in frame: '.$frame;
            }
        }

        return $problems;
    }

    // ─────────────────────────────────────────────────────────────────────────────────────
    // Sentence assembly
    // ─────────────────────────────────────────────────────────────────────────────────────

    /**
     * Render one slot, or null when the fact it needs is missing.
     *
     * @param  array<string, string>  $values
     * @param  array<string, mixed>   $available
     */
    private static function sentence(string $slot, string $family, string $identity, array $values, array $available): ?string
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

        return strtr($frames[self::pick($identity, $slot, count($frames))], $values);
    }

    /**
     * Deterministic index into a frame bank.
     *
     * Seeded with the slot name as well as the product identity — see the class docblock.
     *
     * ── WHY md5 AND NOT crc32 ─────────────────────────────────────────────────────────────
     * This was crc32 first, and it was measurably wrong. Product identities are not random: they are
     * sequential-ish part numbers, and crc32 is linear over GF(2), so its LOW bits — which is
     * exactly what `% 4` reads — stay correlated across inputs that differ only in a suffix. Measured
     * over 5,000 sequential identities in one worst-case cohort (every fact identical, only the
     * identity differing), crc32 produced 2,512 distinct bodies where independent selection predicts
     * about 4,940. Half the intended variation was being lost to the hash, in precisely the cohort
     * — one subcategory, one pack shape — where near-duplicate bodies do the damage.
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
     * Candidates are tried longest-first and the first one inside the window wins.
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

        // Everything undershoots: a very short name with a short rayon. The longest candidate is
        // still the most informative one.
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

        // Tail clauses, most informative first. Each is added only if the result still fits.
        $tails = [
            'Fiche produit et rayon '.$subLabel.' sur '.self::SITE.', importateur en Tunisie.',
            'Rayon '.$subLabel.' sur '.self::SITE.', boutique en Tunisie.',
            'Rayon '.$subLabel.' sur '.self::SITE.'.',
            'Marque '.$brand.' sur '.self::SITE.'.',
        ];

        $best = null;
        foreach ($tails as $tail) {
            $candidate = $lead.' '.$tail;
            $length = mb_strlen($candidate);
            if ($length <= self::DESCRIPTION_MAX) {
                // The first tail that fits is also the longest that fits, because the list is
                // ordered longest-first.
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

        // Still short? Add the shortest true clause we have left rather than padding with adjectives.
        if (mb_strlen($best) < self::DESCRIPTION_MIN) {
            $extra = ' Référence importée, disponible sur '.self::SITE.' en Tunisie.';
            if (mb_strlen($best.$extra) <= self::DESCRIPTION_MAX) {
                $best .= $extra;
            }
        }

        return $best;
    }

    // ─────────────────────────────────────────────────────────────────────────────────────
    // Fact extraction
    // ─────────────────────────────────────────────────────────────────────────────────────

    private static function family(?string $subSlug): string
    {
        if ($subSlug === null) {
            return 'default';
        }

        return self::FAMILY_BY_SUBCATEGORY[$subSlug]
            ?? self::FAMILY_BY_SUBCATEGORY[strtolower($subSlug)]
            ?? 'default';
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
     * HTML-escape a value interpolated into the description.
     *
     * The frames are ours; the VALUES are a third party's — brand names and titles arrive from
     * iHerb. `sanitizeRichHtml` on the storefront is the last line of defence, not the only one, and
     * `description_fr` is read by more than one consumer (the human PDP, the crawler view, the
     * schema description). Escaping at the point of composition means the column never holds markup
     * we did not write.
     *
     * ENT_NOQUOTES, not ENT_QUOTES, and that is deliberate. Every interpolation site here is TEXT
     * CONTENT, never an attribute value, so quotes need no escaping — and escaping them is actively
     * harmful downstream: `Doctor's Best` would be stored as `Doctor&#039;s Best`, and the
     * consumers that derive plain text from this column do it with strip_tags / a tag regex, which
     * removes markup but does NOT decode entities. The literal `&#039;` would then surface in a
     * meta description. French copy is dense with apostrophes, so this is the common case, not an
     * edge one. `&`, `<` and `>` are still escaped, because those are the ones that can change the
     * meaning of the markup.
     */
    private static function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_NOQUOTES | ENT_SUBSTITUTE, 'UTF-8');
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
