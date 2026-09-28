<?php

use App\Models\Product;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * Four products whose nutrition_facts were a pasted AI answer, not a label.
 *
 * Each had ONE row whose "name" was a whole block of text — the full nutrient list plus a note to
 * the shop owner ("…doivent être comparées à l'étiquette du lot que tu commercialises avant
 * publication définitive") — and a meaningless quantity ("10", "100,0007"). The derived
 * nutrition_values rendered that as a one-row table on the live page (found 28/09/2026 while
 * rewriting the same products' descriptions).
 *
 * - Pro Vitamin (per 2 tablets) and the WeightWorld multivitamin (per tablet): the pasted block
 *   DOES carry the real per-dose values, so they are parsed into proper rows.
 * - MK-677 and NAC: the block is a product-information list with no nutrient values at all, so the
 *   fake table is removed rather than invented.
 *
 * Saved through the model: the saving() hook rebuilds nutrition_values from the facts, and the
 * observer revalidates the page. Guarded on the pasted shape (a single row whose name contains a
 * tab), so a table fixed by hand in the meantime is left alone.
 */
return new class extends Migration
{
    private const PARSE = [
        'pro-vitamin-90-tabletas-muscle-care' => ['serving_quantity' => 2, 'serving_unit' => 'comprimés', 'servings_per_container' => 45],
        'multivitamines-et-mineraux-400-tablets-weightword' => ['serving_quantity' => 1, 'serving_unit' => 'comprimé', 'servings_per_container' => 400],
    ];

    private const REMOVE = ['mk-677-60-capsules', 'nac-90-tablets-muscle-care'];

    public function up(): void
    {
        if (! Schema::hasTable('products') || ! Schema::hasColumn('products', 'nutrition_facts')) {
            return;
        }

        foreach (self::PARSE as $slug => $serving) {
            $product = Product::query()->where('slug', $slug)->first();
            $blob = $this->pastedBlob($product);
            if ($blob === null) {
                echo "[nutrition-facts] {$slug}: not in the pasted shape — skipped\n";
                continue;
            }
            // "Vitamine A\t800 µg", "Potassium\t40,15 mg" — the name is everything up to the tab.
            preg_match_all('/(?:^|\s)([A-ZÀ-Ýa-zà-ÿ][^\t]{1,40}?)\t(\d+(?:,\d+)?)\s*(mg|µg|g)\b/u', $blob, $m, PREG_SET_ORDER);
            $rows = [];
            foreach ($m as [, $name, $qty, $unit]) {
                $name = trim(preg_replace('/^.*(?:Quantité|Nutriment)\s+/u', '', $name) ?? $name);
                if ($name === '' || mb_strlen($name) > 30) {
                    continue;
                }
                $rows[] = ['kind' => 'value', 'name' => $name, 'unit' => $unit, 'depth' => 0,
                    'quantity' => (float) str_replace(',', '.', $qty), 'percent_dv' => null];
            }
            if (count($rows) < 15) {
                echo "[nutrition-facts] {$slug}: only ".count($rows)." rows parsed — skipped\n";
                continue;
            }
            $facts = array_merge((array) $product->nutrition_facts, $serving, ['rows' => $rows]);
            $product->nutrition_facts = $facts;
            $product->save();
            echo "[nutrition-facts] {$slug}: ".count($rows)." rows rebuilt\n";
        }

        foreach (self::REMOVE as $slug) {
            $product = Product::query()->where('slug', $slug)->first();
            if ($this->pastedBlob($product) === null) {
                echo "[nutrition-facts] {$slug}: not in the pasted shape — skipped\n";
                continue;
            }
            $product->nutrition_facts = null;
            $product->nutrition_values = null;
            $product->save();
            echo "[nutrition-facts] {$slug}: pasted table removed (no nutrient values exist)\n";
        }
    }

    private function pastedBlob(?Product $product): ?string
    {
        $facts = $product?->nutrition_facts;
        $rows = is_array($facts) ? ($facts['rows'] ?? null) : null;
        if (! is_array($rows) || count($rows) !== 1) {
            return null;
        }
        $name = (string) ($rows[0]['name'] ?? '');

        return str_contains($name, "\t") && mb_strlen($name) > 150 ? $name : null;
    }

    public function down(): void
    {
        // Not reverted: the previous value was a pasted note, not data.
    }
};
