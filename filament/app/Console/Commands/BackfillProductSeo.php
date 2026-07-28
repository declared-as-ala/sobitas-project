<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Services\Seo\ProductSeoDefaults;
use Illuminate\Console\Command;

/**
 * Apply the default product SEO templates to the products already in the catalogue.
 *
 * ProductSeoObserver fills these on save, so anything created or edited since it shipped is fine.
 * Everything older is not: an audit found 279 of 303 products (92%) with meta_title,
 * meta_description AND alt_cover all empty, simply because nobody had re-saved them. Those blanks
 * matter most for image search — alt_cover is the strongest signal Google Images has for a product
 * photo.
 *
 * Uses saveQuietly(): the fill is deliberate and idempotent, and firing model events for the whole
 * catalogue would dispatch a revalidation + IndexNow ping per product — hundreds of outbound calls
 * for a change no visitor sees. The sitemap is refreshed ONCE at the end instead.
 *
 *   php artisan seo:backfill-product-meta --dry-run   # report only, writes nothing
 *   php artisan seo:backfill-product-meta             # fill blanks
 */
class BackfillProductSeo extends Command
{
    protected $signature = 'seo:backfill-product-meta {--dry-run : Report what would change without writing}';

    protected $description = 'Fill blank meta_title / meta_description / alt_cover on existing products (blanks only, never overwrites)';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $scanned = 0;
        $changed = 0;

        // chunkById keeps memory flat and is safe while rows are being written.
        Product::with('brand:id,designation_fr')->chunkById(200, function ($products) use ($dryRun, &$scanned, &$changed) {
            foreach ($products as $product) {
                $scanned++;
                if (! ProductSeoDefaults::apply($product)) {
                    continue;
                }
                $changed++;
                if ($dryRun) {
                    $this->line("  would fill #{$product->id} {$product->slug}");
                    continue;
                }
                // No model events: see the class docblock.
                $product->saveQuietly();
            }
        });

        $this->info(sprintf('%s %d of %d product(s).', $dryRun ? 'Would fill' : 'Filled', $changed, $scanned));

        if (! $dryRun && $changed > 0) {
            // One sitemap refresh for the whole run rather than one per product.
            app(\App\Services\Seo\SeoNotifier::class)->sitemapChanged();
            $this->info('Sitemap refresh requested.');
        }

        return self::SUCCESS;
    }
}
