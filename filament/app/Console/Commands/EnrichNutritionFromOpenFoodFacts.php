<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

/**
 * Fills empty `nutrition_values` on products from Open Food Facts — a free, open, factual database —
 * matched by the product's GTIN/barcode. This adds unique, factual content to thin product pages
 * (helps the "Crawled – not indexed" bucket) WITHOUT scraping competitor copy (duplicate-content /
 * legal risk). Only products that already have a GTIN and no existing nutrition table are touched;
 * pricing, stock and publish state are never modified.
 *
 * Safe to run repeatedly. Dry-run first:
 *   php artisan seo:enrich-nutrition --dry-run
 *   php artisan seo:enrich-nutrition --limit=100
 *   php artisan seo:enrich-nutrition --id=1234 --force
 */
class EnrichNutritionFromOpenFoodFacts extends Command
{
    protected $signature = 'seo:enrich-nutrition
                            {--limit=50 : Max products to process this run}
                            {--id= : Only this product id (ignores the empty-value filter unless --force omitted)}
                            {--force : Overwrite existing nutrition_values}
                            {--dry-run : Show what would change without saving}
                            {--sleep=1 : Seconds to wait between API calls (be polite to Open Food Facts)}';

    protected $description = 'Fill empty product nutrition_values from Open Food Facts (matched by GTIN)';

    private const API = 'https://world.openfoodfacts.org/api/v2/product/';

    /** OFF nutriment key (per 100g) => [French label, unit]. Order = display order. */
    private const NUTRIMENTS = [
        'energy-kj_100g'     => ['Énergie', 'kJ'],
        'energy-kcal_100g'   => ['Énergie', 'kcal'],
        'fat_100g'           => ['Matières grasses', 'g'],
        'saturated-fat_100g' => ['dont acides gras saturés', 'g'],
        'carbohydrates_100g' => ['Glucides', 'g'],
        'sugars_100g'        => ['dont sucres', 'g'],
        'fiber_100g'         => ['Fibres alimentaires', 'g'],
        'proteins_100g'      => ['Protéines', 'g'],
        'salt_100g'          => ['Sel', 'g'],
        'sodium_100g'        => ['Sodium', 'g'],
    ];

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');
        $limit = max(1, (int) $this->option('limit'));
        $sleep = max(0, (int) $this->option('sleep'));
        $onlyId = $this->option('id');

        $query = Product::query()
            ->whereNotNull('gtin')
            ->where('gtin', '!=', '');

        if ($onlyId) {
            $query->where('id', (int) $onlyId);
        }

        $products = $query->select('id', 'designation_fr', 'gtin', 'nutrition_values')
            ->orderBy('id')
            ->limit($onlyId ? 1 : $limit)
            ->get();

        if ($products->isEmpty()) {
            $this->warn('No products with a GTIN matched the filter. Nothing to do.');

            return self::SUCCESS;
        }

        $this->info(($dry ? '[DRY-RUN] ' : '')."Processing {$products->count()} product(s) with a GTIN…");

        $filled = 0;
        $skipped = 0;
        $missed = 0;

        foreach ($products as $product) {
            if (! $force && ! $this->isBlank($product->nutrition_values)) {
                $skipped++;

                continue;
            }

            $gtin = preg_replace('/\D+/', '', (string) $product->gtin);
            if ($gtin === '') {
                $skipped++;

                continue;
            }

            $nutriments = $this->fetchNutriments($gtin);

            if ($nutriments === null) {
                $missed++;
                $this->line("  · <fg=yellow>miss</> #{$product->id} (GTIN {$gtin}) — not found on Open Food Facts");
                $this->pause($sleep);

                continue;
            }

            $html = $this->buildHtml($nutriments);
            if ($html === null) {
                $missed++;
                $this->line("  · <fg=yellow>miss</> #{$product->id} (GTIN {$gtin}) — no usable nutriment data");
                $this->pause($sleep);

                continue;
            }

            $this->line("  · <fg=green>fill</> #{$product->id} {$this->short($product->designation_fr)} (GTIN {$gtin})");

            if (! $dry) {
                // Update only this column — never touch pricing/stock/publish.
                $product->forceFill(['nutrition_values' => $html])->save();
            }

            $filled++;
            $this->pause($sleep);
        }

        $this->newLine();
        $this->info(($dry ? '[DRY-RUN] ' : '')."Done. filled={$filled} skipped={$skipped} not-found={$missed}");

        return self::SUCCESS;
    }

    /**
     * @return array<string, mixed>|null  the OFF `nutriments` map, or null on any failure
     */
    private function fetchNutriments(string $gtin): ?array
    {
        try {
            $response = Http::withHeaders([
                    // OFF policy asks for an identifying UA with contact info.
                    'User-Agent' => 'ProteineTunisie-SEO/1.0 (protein.tn; web@protein.tn)',
                ])
                ->timeout(12)
                ->retry(2, 500)
                ->acceptJson()
                ->get(self::API.$gtin.'.json', ['fields' => 'product_name,nutriments']);

            if (! $response->ok()) {
                return null;
            }

            $json = $response->json();
            if (! is_array($json) || (int) ($json['status'] ?? 0) !== 1) {
                return null;
            }

            $nutriments = $json['product']['nutriments'] ?? null;

            return is_array($nutriments) ? $nutriments : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * @param  array<string, mixed>  $nutriments
     */
    private function buildHtml(array $nutriments): ?string
    {
        $rows = [];
        foreach (self::NUTRIMENTS as $key => [$label, $unit]) {
            if (! array_key_exists($key, $nutriments)) {
                continue;
            }
            $value = $nutriments[$key];
            if ($value === '' || $value === null || ! is_numeric($value)) {
                continue;
            }
            $rows[] = '<tr><td>'.e($label).'</td><td>'.$this->num((float) $value).' '.e($unit).'</td></tr>';
        }

        if ($rows === []) {
            return null;
        }

        return '<table class="nutrition-table">'
            .'<thead><tr><th>Valeurs nutritionnelles moyennes</th><th>Pour 100 g</th></tr></thead>'
            .'<tbody>'.implode('', $rows).'</tbody>'
            .'</table>'
            .'<p class="nutrition-source"><small>Source : Open Food Facts</small></p>';
    }

    /** Trim trailing zeros: 7.50 → "7.5", 373.0 → "373". */
    private function num(float $n): string
    {
        $s = rtrim(rtrim(number_format($n, 2, '.', ''), '0'), '.');

        return $s === '' ? '0' : $s;
    }

    private function isBlank(?string $html): bool
    {
        $t = trim((string) $html);

        return $t === '' || $t === '<p></p>' || $t === '<p><br></p>';
    }

    private function short(?string $s): string
    {
        return mb_strimwidth((string) $s, 0, 48, '…');
    }

    private function pause(int $seconds): void
    {
        if ($seconds > 0) {
            sleep($seconds);
        }
    }
}
