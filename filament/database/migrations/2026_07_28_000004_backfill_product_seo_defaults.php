<?php

use App\Models\Product;
use App\Services\Seo\ProductSeoDefaults;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * Run the product SEO backfill once, automatically, on deploy.
 *
 * The owner asked for this to be automatic for every product rather than a command someone has to
 * remember. New and edited products are already covered by ProductSeoObserver; this closes the
 * historical gap in the same deploy that unblocks Google Images, so the two land together — there
 * is no point letting the crawler back in to find 279 products with an empty image alt.
 *
 * Safe to run here:
 *   • Blanks only — ProductSeoDefaults never overwrites an existing value, so anything an admin
 *     wrote (now or later) is untouched.
 *   • saveQuietly — no model events, so the catalogue does not fire ~300 IndexNow pings and
 *     revalidations during a deploy.
 *   • Idempotent — a second run finds nothing to fill.
 *   • Wrapped: an unexpected failure here must not abort the migration run or the deploy.
 *
 * Re-runnable by hand any time with: php artisan seo:backfill-product-meta [--dry-run]
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('products')) {
            return;
        }

        try {
            $scanned = 0;
            $filled = 0;

            Product::with('brand:id,designation_fr')->chunkById(200, function ($products) use (&$scanned, &$filled) {
                foreach ($products as $product) {
                    $scanned++;
                    if (ProductSeoDefaults::apply($product)) {
                        $product->saveQuietly();
                        $filled++;
                    }
                }
            });

            echo sprintf("[product-seo-backfill] filled %d of %d product(s)\n", $filled, $scanned);
        } catch (\Throwable $e) {
            // Never let an SEO nicety break a deploy; the artisan command can finish the job.
            echo '[product-seo-backfill] skipped: ' . $e->getMessage() . "\n";
        }
    }

    public function down(): void
    {
        // Not reversible: the filled values are indistinguishable from admin-authored ones by
        // design, so blanking them again would destroy real edits.
    }
};
