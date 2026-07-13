<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

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

    protected $description = 'Scan published products for missing SEO data (gtin, brand, description, image, alt)';

    public function handle(): int
    {
        $limit = max(1, (int) $this->option('limit'));
        $base = fn () => Product::query()->where('publier', 1);
        $total = $base()->count();

        $issues = [
            'sans GTIN (identifiant global)' => $base()->where(fn ($q) => $q->whereNull('gtin')->orWhere('gtin', '')),
            'sans marque (brand_id)' => $base()->whereNull('brand_id'),
            'sans description' => $base()->where(fn ($q) => $q->whereNull('description_fr')->orWhere('description_fr', '')),
            'sans image (cover)' => $base()->where(fn ($q) => $q->whereNull('cover')->orWhere('cover', '')),
            'sans alt image' => $base()->where(fn ($q) => $q->whereNull('alt_cover')->orWhere('alt_cover', '')),
            'sans valeurs nutritionnelles' => $base()->where(fn ($q) => $q->whereNull('nutrition_values')->orWhere('nutrition_values', '')),
        ];

        $this->info("SEO Health — {$total} produits publiés");
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

        Log::info('seo:health-report', ['total_published' => $total] + $summary);
        $this->newLine();
        $this->info('Corrections: GTIN/marque/description dans Filament → Produits; alt/meta se remplissent automatiquement à la sauvegarde; nutrition via seo:enrich-nutrition.');

        return self::SUCCESS;
    }
}
