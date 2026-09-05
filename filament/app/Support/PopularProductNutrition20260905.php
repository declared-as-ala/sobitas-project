<?php

namespace App\Support;

use App\Models\Product;
use App\Services\Enrichment\ResearchValidator;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Curated manufacturer-label data for the products customers compare most often.
 *
 * Values are deliberately stored per the named flavour/label instead of normalised to 100 g.
 * The frontend shows that basis beside every value, preventing a 25 g scoop being compared as if
 * it were a 45 g scoop. Existing admin-entered facts are never overwritten.
 */
final class PopularProductNutrition20260905
{
    /** @return array<string, array<string, mixed>> */
    public static function records(): array
    {
        $onGold = self::panel('https://www.optimumnutrition.com/fr-fr/products/gold-standard-100-whey-protein-powder-eu', 31, 'g', [
            ['Énergie', 116, 'kcal'], ['Matières grasses', 1.4, 'g'], ['Glucides', 1.6, 'g'], ['Sucres', 1, 'g'], ['Protéines', 24, 'g'],
        ], 'Peut contenir des traces de gluten, œuf, fruits à coque et arachides. Contient du lait et du soja.', '', 'Double Rich Chocolate');
        $hydro = self::panel('https://www.optimumnutrition.com/fr-fr/products/platinum-hydrowhey-hydrolysed-whey-protein-powder-eu', 40, 'g', [
            ['Énergie', 141, 'kcal'], ['Matières grasses', .5, 'g'], ['Glucides', 1.2, 'g'], ['Sucres', .5, 'g'], ['Protéines', 30, 'g'],
        ], 'Peut contenir des traces de gluten, œuf, fruits à coque et arachides. Contient du lait et du soja.', '', 'Milk Chocolate');
        $serious = self::panel('https://www.optimumnutrition.com/fr-fr/products/serious-mass-weight-gainer-protein-powder-eu', 336, 'g', [
            ['Énergie', 1262, 'kcal'], ['Matières grasses', 7, 'g'], ['Glucides', 248, 'g'], ['Sucres', 11, 'g'], ['Protéines', 50, 'g'], ['Créatine', 3, 'g'],
        ], 'Peut contenir des traces de gluten, œuf, fruits à coque et arachides. Contient du lait et du soja.', '', 'Chocolat');

        return [
            'anabolic-whey-80-2-25kg-proactive' => self::panel('https://protein.tn/whey-proteine/anabolic-whey-80-2-25kg-proactive', 35, 'g', [
                ['Protéines', 25, 'g'], ['Créatine monohydrate', 5, 'g'],
            ], '', '', 'Valeurs annoncées sur la fiche et 64 portions pour 2,25 kg'),
            'nitrotech-whey-protein-1-81-kg-muscletech' => self::panel('https://international.muscletech.com/products/all/protein/nitro-tech/', 45, 'g', [
                ['Énergie', 160, 'kcal'], ['Matières grasses', 3, 'g'], ['Glucides', 4, 'g'], ['Sucres', 2, 'g'], ['Protéines', 30, 'g'], ['Créatine monohydrate', 3, 'g'],
            ], 'Contient du lait et du soja.', '', 'Milk Chocolate'),
            '100-whey-gold-standard-2-27kg' => $onGold,
            '100-pure-whey-2-27kg-biotech-usa' => self::panel('https://shop.biotechusa.com/products/100-pure-whey-natural-900-g', 28, 'g', [
                ['Énergie', 114, 'kcal'], ['Matières grasses', 1.7, 'g'], ['Glucides', 2.2, 'g'], ['Sucres', 2.2, 'g'], ['Protéines', 22, 'g'],
            ], 'Contient du lait. Fabriqué dans une usine utilisant aussi œuf, soja et fruits à coque.', 'Sans gluten.', 'Version Natural'),
            'big-whey-2kg-big-ramy-labs' => self::panel('https://eg.bigramylabs.com/en/products/red-rex-big-whey', 34, 'g', [
                ['Énergie', 130, 'kcal'], ['Matières grasses', 1.5, 'g'], ['Glucides', 5, 'g'], ['Protéines', 24, 'g'],
            ]),
            'whey-testo-mr-x-1-8-kg-v-shapes' => self::panel('https://vshapesupps.in/products/v-shape-mr-x-whey-testo', 30, 'g', [
                ['Énergie', 118, 'kcal'], ['Matières grasses', 1.4, 'g'], ['Glucides', 1.4, 'g'], ['Sucres', 1.4, 'g'], ['Protéines', 25, 'g'],
            ]),
            'whey-ultimate-2kg-william-bonac' => self::panel('https://williambonacsignature.com/product/whey-ultimate/', 30, 'g', [
                ['Énergie', 111, 'kcal'], ['Matières grasses', 1.5, 'g'], ['Glucides', 1.44, 'g'], ['Sucres', 1.44, 'g'], ['Protéines', 23, 'g'],
            ]),
            'v-zero-isopro-18-kg-v-shape-supps' => self::panel('https://vshapesupps.in/products/v-shape-v-zero-isopro', 30, 'g', [
                ['Énergie', 110, 'kcal'], ['Matières grasses', .09, 'g'], ['Glucides', .3, 'g'], ['Sucres', .3, 'g'], ['Protéines', 27, 'g'],
            ], '', '', 'Formule annoncée comme adaptée aux personnes sensibles au lactose'),
            'whey-iso-regime-2kg-william-bonac' => self::panel('https://williambonacsignature.com/product/whey-iso-regime/', 30, 'g', [
                ['Énergie', 140, 'kcal'], ['Matières grasses', .84, 'g'], ['Glucides', 1.5, 'g'], ['Sucres', 0, 'g'], ['Protéines', 26, 'g'],
            ]),
            'whey-regime-2kg-william-bonac' => self::panel('https://williambonacsignature.com/product/whey-regime/', 30, 'g', [
                ['Énergie', 133.74, 'kcal'], ['Matières grasses', .86, 'g'], ['Glucides', 1.5, 'g'], ['Sucres', .87, 'g'], ['Protéines', 25, 'g'],
            ]),
            'optimum-nutrition-platinum-hydro-whey-turbo-chocolate-164-kg' => $hydro,
            'optimum-nutrition-platinum-hydro-whey-velocity-vanilla-16-kg' => $hydro,
            'optimum-nutrition-platinum-hydro-whey-turbo-chocolate-820-g' => $hydro,
            'serious-mass-5-45-kg-optimum-nutrition' => $serious,
            'serious-mass-2-7-kg' => $serious,
            'iso-whey-zero-2-27-kg' => self::panel('https://shop.biotechusa.com/products/iso-whey-zero-1816-g', 25, 'g', [
                ['Énergie', 92, 'kcal'], ['Matières grasses', .5, 'g'], ['Glucides', .7, 'g'], ['Sucres', .5, 'g'], ['Protéines', 21, 'g'],
            ], 'Contient du lait.', 'Sans gluten.', 'Banane ; teneur réduite en lactose'),
            'micronised-creatine-optimum-nutrition-317g' => self::panel('https://www.optimumnutrition.com/en-gb/products/micronised-creatine-powder', 3.4, 'g', [
                ['Créatine monohydrate', 3.4, 'g'], ['Créatine', 3, 'g'],
            ], '', '', 'Sans arôme'),
            'creatine-monohydrate-ostrovit-500gr' => self::panel('https://ostrovit.com/en/products/ostrovit-creatine-monohydrate-500-g-16618.html', 3.4, 'g', [
                ['Créatine monohydrate', 3.4, 'g'], ['Créatine', 3, 'g'],
            ], 'Fabriqué dans une usine utilisant des ingrédients issus du lait, du soja et du poisson.', '', 'Nature'),
            'c4-original-pre-workout-cellucor' => self::panel('https://cellucor.com/products/c4-original-old', 6.5, 'g', [
                ['Caféine', 150, 'mg'], ['Bêta-alanine CarnoSyn', 1600, 'mg'], ['Créatine nitrate', 1000, 'mg'],
            ], '', '', 'Une mesure ; la taille de portion peut varier selon le marché'),
            'vitamin-c-110-tabs-ostrovit' => self::panel('https://ostrovit.com/en/products/ostrovit-vitamin-c-110-tablets-25300.html', 1, 'tablet', [
                ['Vitamine C', 1000, 'mg'],
            ], 'Fabriqué dans une usine utilisant lait, soja, arachides, fruits à coque, sésame, gluten, œuf, crustacés et poisson.', '', '1 comprimé'),
        ];
    }

    public static function install(): int
    {
        $validator = app(ResearchValidator::class);
        $records = self::records();
        $updated = 0;

        DB::transaction(function () use ($validator, $records, &$updated): void {
            Product::query()->whereIn('slug', array_keys($records))->lockForUpdate()->get()->each(function (Product $product) use ($validator, $records, &$updated): void {
                if (is_array($product->nutrition_facts) && $product->nutrition_facts !== []) {
                    return;
                }
                $facts = $validator->nutritionFacts($records[$product->slug]);
                if ($facts === null) {
                    throw new RuntimeException('Invalid curated nutrition panel for '.$product->slug);
                }
                $product->nutrition_facts = $facts;
                $product->save();
                $updated++;
            });
        });

        ApiResponseCache::forget('product_details');
        ApiResponseCache::forget('all_products');

        return $updated;
    }

    public static function restore(): int
    {
        $validator = app(ResearchValidator::class);
        $records = self::records();
        $restored = 0;

        DB::transaction(function () use ($validator, $records, &$restored): void {
            Product::query()->whereIn('slug', array_keys($records))->lockForUpdate()->get()->each(function (Product $product) use ($validator, $records, &$restored): void {
                $expected = $validator->nutritionFacts($records[$product->slug]);
                if ($expected === null || $product->nutrition_facts !== $expected) {
                    return;
                }
                $product->nutrition_facts = null;
                $product->nutrition_values = null;
                $product->save();
                $restored++;
            });
        });

        ApiResponseCache::forget('product_details');
        ApiResponseCache::forget('all_products');

        return $restored;
    }

    /** @param list<array{0: string, 1: int|float, 2: string}> $rows */
    private static function panel(string $source, int|float $serving, string $unit, array $rows, string $allergens = '', string $claims = '', string $note = ''): array
    {
        return [
            'source_url' => $source,
            'serving_quantity' => $serving,
            'serving_unit' => $unit,
            'serving_note' => $note,
            'rows' => array_map(fn (array $row): array => ['name' => $row[0], 'kind' => 'value', 'quantity' => $row[1], 'unit' => $row[2]], $rows),
            'allergens' => $allergens,
            'claims' => $claims,
        ];
    }
}
