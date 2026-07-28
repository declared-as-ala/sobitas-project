<?php

namespace App\Console\Commands;

use App\Models\Page;
use App\Models\Product;
use App\Services\Seo\PageSeoDefaults;
use App\Services\Seo\ProductSeoDefaults;
use App\Services\Seo\SeoNotifier;
use Illuminate\Console\Command;

/**
 * Sweep the catalogue and fill any SEO field that has gone blank.
 *
 * The observers already fill these on save, which covers everything created or edited through the
 * admin. But "self-healing on save" only heals what somebody saves: an audit found 279 of 303
 * products (92%) with meta_title, meta_description AND alt_cover all empty, purely because nobody
 * had re-opened them since the observer shipped. Imports, direct SQL, restores from backup and
 * bulk edits all bypass model events too.
 *
 * This closes that gap on a schedule, so the answer to "is our metadata complete?" stays yes
 * without anyone remembering to check.
 *
 *   php artisan seo:self-heal              # fill blanks
 *   php artisan seo:self-heal --dry-run    # report what would change
 *
 * Blanks only — never overwrites a value someone wrote. saveQuietly, so a sweep does not fire one
 * IndexNow ping per row; the sitemap is refreshed once at the end if anything changed.
 */
class SeoSelfHeal extends Command
{
    protected $signature = 'seo:self-heal {--dry-run : Report what would change without writing}';

    protected $description = 'Fill blank SEO fields on products and CMS pages (blanks only, never overwrites)';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');
        $productsFixed = 0;
        $pagesFixed = 0;

        Product::with(['brand:id,designation_fr', 'sousCategorie:id,designation_fr'])
            ->chunkById(200, function ($products) use ($dry, &$productsFixed) {
                foreach ($products as $product) {
                    if (! ProductSeoDefaults::apply($product)) {
                        continue;
                    }
                    $productsFixed++;
                    if (! $dry) {
                        $product->saveQuietly();
                    }
                }
            });

        Page::query()->chunkById(100, function ($pages) use ($dry, &$pagesFixed) {
            foreach ($pages as $page) {
                if (! PageSeoDefaults::apply($page)) {
                    continue;
                }
                $pagesFixed++;
                if (! $dry) {
                    $page->saveQuietly();
                }
            }
        });

        $verb = $dry ? 'would fill' : 'filled';
        $this->info(sprintf('%s %d product(s) and %d CMS page(s).', ucfirst($verb), $productsFixed, $pagesFixed));

        if (! $dry && ($productsFixed + $pagesFixed) > 0) {
            app(SeoNotifier::class)->sitemapChanged();
            $this->info('Sitemap refresh requested.');
        }

        return self::SUCCESS;
    }
}
