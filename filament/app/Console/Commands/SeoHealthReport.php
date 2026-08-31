<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * SEO health scanner — the monitoring half of the "keeps ranking automatically" system.
 * Counts published products with missing SEO-critical data (the exact fields Google Search
 * Console flags) and prints + logs a summary with the worst offenders, so gaps surface before
 * GSC emails do. Run manually or via the scheduler (routes/console.php).
 *
 *   php artisan seo:health-report
 */
class SeoHealthReport extends Command
{
    protected $signature = 'seo:health-report {--limit=10 : Offenders to list per issue}';

    protected $description = 'Scan in-stock products for missing SEO and rich product data';

    public function handle(): int
    {
        $limit = max(1, (int) $this->option('limit'));
        $published = fn () => Product::query()->where('publier', 1);
        $inStock = function () {
            $query = Product::query()->where('publier', 1)->where('qte', '>', 0);

            if (Schema::hasColumn('products', 'rupture')) {
                $query->where('rupture', 0);
            }
            if (Schema::hasColumn('products', 'force_out_of_stock')) {
                $query->where('force_out_of_stock', 0);
            }

            return $query;
        };

        $publishedTotal = $published()->count();
        $total = $inStock()->count();

        $issues = [
            'sans GTIN (identifiant global)' => $inStock()->where(fn ($q) => $q->whereNull('gtin')->orWhere('gtin', '')),
            'sans marque (brand_id)' => $inStock()->whereNull('brand_id'),
            'sans description' => $inStock()->where(fn ($q) => $q->whereNull('description_fr')->orWhere('description_fr', '')),
            'sans image (cover)' => $inStock()->where(fn ($q) => $q->whereNull('cover')->orWhere('cover', '')),
            'sans alt image' => $inStock()->where(fn ($q) => $q->whereNull('alt_cover')->orWhere('alt_cover', '')),
            'sans valeurs nutritionnelles' => $inStock()->where(fn ($q) => $q->whereNull('nutrition_values')->orWhere('nutrition_values', '')),
        ];

        if (Schema::hasColumn('products', 'nutrition_facts')) {
            $issues['sans panneau nutritionnel structuré'] = $inStock()->where(fn ($q) => $q
                ->whereNull('nutrition_facts')
                ->orWhereRaw('JSON_LENGTH(nutrition_facts) = 0'));
        }
        if (Schema::hasColumn('products', 'faq')) {
            $issues['sans FAQ produit'] = $inStock()->where(fn ($q) => $q
                ->whereNull('faq')
                ->orWhereRaw('JSON_LENGTH(faq) = 0'));
        }

        $this->info("SEO Health — {$total} produits réellement en stock ({$publishedTotal} publiés au total)");
        $summary = [];
        foreach ($issues as $label => $query) {
            $count = (clone $query)->count();
            $summary[$label] = $count;
            $pct = $total > 0 ? round(100 * $count / $total) : 0;
            $this->line(sprintf('  %-38s %5d  (%d%%)', $label, $count, $pct));
            if ($count > 0) {
                $offenders = (clone $query)->orderByDesc('best_seller')->orderByDesc('id')
                    ->limit($limit)->pluck('slug')->all();
                $this->line('      → ' . implode(', ', array_slice($offenders, 0, $limit)));
            }
        }

        if (Schema::hasColumn('products', 'nutrition_facts')) {
            $priorityMissing = $inStock()
                ->where(fn ($q) => $q
                    ->where('best_seller', 1)
                    ->orWhere('new_product', 1)
                    ->orWhere(fn ($promo) => $promo->whereNotNull('promo')->where('promo', '>', 0)))
                ->where(fn ($q) => $q
                    ->whereNull('nutrition_facts')
                    ->orWhereRaw('JSON_LENGTH(nutrition_facts) = 0'))
                ->orderByDesc('best_seller')
                ->orderByDesc('new_product')
                ->orderByDesc('id')
                ->limit($limit)
                ->pluck('slug')
                ->all();

            $this->newLine();
            $this->info('Priorité landing / commerciale sans panneau structuré');
            $this->line($priorityMissing === []
                ? '  aucune lacune prioritaire'
                : '  → '.implode(', ', $priorityMissing));
        }

        Log::info('seo:health-report', [
            'total_published' => $publishedTotal,
            'total_in_stock' => $total,
        ] + $summary);
        $this->newLine();
        $this->info('Corrections: GTIN/marque/description dans Filament → Produits; alt/meta à la sauvegarde; panneaux vérifiés via products:import-research.');

        return self::SUCCESS;
    }
}
