<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\ProductSourceObservation;
use App\Services\Enrichment\ProductEnricher;
use Illuminate\Console\Command;

/**
 * Collect product facts from the open web, one product at a time.
 *
 *   php artisan products:enrich-web --limit=5 --dry-run
 *   php artisan products:enrich-web --id=1234
 *   php artisan products:enrich-web --limit=25 --missing=gtin
 *
 * Facts only. Barcodes, ingredients, serving sizes, allergen statements, official images — none of
 * which anyone owns. Descriptions are collected from manufacturers as reference material for
 * whoever writes ours; they are never published verbatim, from any source. Reviews and ratings are
 * not collected at all.
 *
 * Everything lands in product_source_observations with status `pending`. This command changes no
 * product and no page.
 */
class EnrichProductsFromWeb extends Command
{
    protected $signature = 'products:enrich-web
        {--limit=10 : How many products to process}
        {--id= : One product id}
        {--missing= : Only products lacking this: gtin|nutrition|all}
        {--force : Re-run products that already have observations}
        {--dry-run : Discover and report, write nothing}';

    protected $description = 'Collect product facts (barcode, ingredients, nutrition, images) from the web with provenance';

    public function handle(ProductEnricher $enricher): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $limit = max(1, (int) $this->option('limit'));

        $query = Product::query()->with('brand')->where('publier', 1);

        if ($id = $this->option('id')) {
            $query->where('id', (int) $id);
        }

        match ($this->option('missing')) {
            'gtin' => $query->where(fn ($q) => $q->whereNull('gtin')->orWhere('gtin', '')),
            'nutrition' => $query->where(fn ($q) => $q->whereNull('nutrition_values')->orWhere('nutrition_values', '')),
            default => null,
        };

        if (! $this->option('force') && ! $this->option('id')) {
            // A product already carrying observations has been looked at; spending the rate-limit
            // budget on it again buys nothing until the upstream pages change.
            $query->whereNotExists(fn ($q) => $q->selectRaw(1)
                ->from('product_source_observations')
                ->whereColumn('product_source_observations.product_id', 'products.id'));
        }

        $products = $query->orderBy('id')->limit($this->option('id') ? 1 : $limit)->get();

        if ($products->isEmpty()) {
            $this->info('No products matched.');

            return self::SUCCESS;
        }

        $this->info(sprintf('%d product(s)%s', $products->count(), $dryRun ? ' (dry run — nothing will be written)' : ''));
        $this->line('  Pacing is deliberate: a host that notices us blocks us, and a blocked host yields nothing ever again.');
        $this->newLine();

        $totals = ['observations' => 0, 'sources' => 0, 'gtin' => 0, 'conflicts' => 0];

        foreach ($products as $product) {
            $this->line(sprintf('<fg=cyan>▸</> %s', mb_strimwidth((string) $product->designation_fr, 0, 66, '…')));

            if ($dryRun) {
                // Discovery alone still costs search requests, so a dry run shows what WOULD be
                // fetched rather than pretending it is free.
                $this->line('    (dry run — discovery only)');

                continue;
            }

            $result = $enricher->enrich($product);

            $totals['observations'] += $result['observations'];
            $totals['sources'] += $result['sources'];
            $totals['conflicts'] += count($result['conflicts']);

            $this->line(sprintf(
                '    %d fact(s) from %d source(s)',
                $result['observations'],
                $result['sources']
            ));

            if ($result['proposed_gtin'] !== null) {
                $totals['gtin']++;
                $this->line(sprintf(
                    '    <fg=yellow>code-barres proposé : %s</> — à confirmer sur le pot avant écriture',
                    $result['proposed_gtin']
                ));
            }

            foreach ($result['conflicts'] as $conflict) {
                $this->line('    <fg=red>conflit</> '.$conflict);
            }
        }

        $this->newLine();
        $this->info(sprintf(
            '%d observation(s) from %d source fetch(es). %d barcode(s) proposed, %d conflict(s).',
            $totals['observations'],
            $totals['sources'],
            $totals['gtin'],
            $totals['conflicts'],
        ));

        $pending = ProductSourceObservation::pending()->count();
        if ($pending > 0) {
            $this->comment(sprintf('%d observation(s) pending review. Nothing is on a page yet.', $pending));
        }

        return self::SUCCESS;
    }
}
