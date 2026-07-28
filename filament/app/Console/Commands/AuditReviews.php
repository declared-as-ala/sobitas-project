<?php

namespace App\Console\Commands;

use App\Models\Review;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Report the scale of published-but-unattested reviews, and optionally unpublish them.
 *
 * WHY THIS EXISTS
 * An audit of the live API found every sampled product carrying ~200 published reviews with
 * verified = 0 and commande_id = NULL on every row, drawn from a shared comment pool: a
 * lateral-pulldown machine and a shoulder press share 72 byte-identical comments, and the shoulder
 * press is reviewed with "Vanilla طعمها هايل" ("the vanilla tastes great"). Those were seeded, not
 * written by customers.
 *
 * Structured data no longer asserts them to Google (ProductSchemaBuilder::isAttestedPurchase), which
 * removes the manual-action risk. But they are still DISPLAYED to shoppers, and that is a business
 * and trust decision rather than a technical one — so this command reports by default and only
 * changes data when explicitly told to.
 *
 *   php artisan seo:audit-reviews                      # report only (default)
 *   php artisan seo:audit-reviews --unpublish-unattested --force
 *
 * Unpublishing sets publier = 0. It does not delete anything, so it is reversible.
 */
class AuditReviews extends Command
{
    protected $signature = 'seo:audit-reviews
        {--unpublish-unattested : Set publier=0 on published reviews with no purchase evidence}
        {--force : Required alongside --unpublish-unattested; without it nothing is written}';

    protected $description = 'Report (or unpublish) published reviews that have no evidence of a real purchase';

    public function handle(): int
    {
        $published = Review::query()->where('publier', 1);

        $total = (clone $published)->count();
        $attested = (clone $published)
            ->where(fn ($q) => $q->where('verified', 1)->orWhereNotNull('commande_id'))
            ->count();
        $unattested = $total - $attested;

        $productsWithUnattested = (clone $published)
            ->where('verified', '!=', 1)
            ->whereNull('commande_id')
            ->distinct()
            ->count('product_id');

        $this->line('');
        $this->info('Published reviews');
        $this->line(sprintf('  total                       : %d', $total));
        $this->line(sprintf('  attested (order or verified): %d', $attested));
        $this->line(sprintf('  NOT attested                : %d', $unattested));
        $this->line(sprintf('  products carrying unattested: %d', $productsWithUnattested));

        // Comment text reused across DIFFERENT products is the signature of a seeded pool: a real
        // customer does not write the same sentence about a shaker and a squat rack.
        $shared = DB::table('reviews')
            ->select('comment', DB::raw('COUNT(DISTINCT product_id) AS products'), DB::raw('COUNT(*) AS uses'))
            ->where('publier', 1)
            ->whereNotNull('comment')
            ->where('comment', '<>', '')
            ->groupBy('comment')
            ->havingRaw('COUNT(DISTINCT product_id) > 1')
            ->orderByDesc('products')
            ->limit(10)
            ->get();

        $this->line('');
        $this->info('Comments reused across multiple products (top 10)');
        if ($shared->isEmpty()) {
            $this->line('  none — no cross-product duplication detected');
        } else {
            foreach ($shared as $row) {
                $this->line(sprintf('  %3d products, %4d uses : %s', $row->products, $row->uses, mb_substr((string) $row->comment, 0, 60)));
            }
        }

        if (! $this->option('unpublish-unattested')) {
            $this->line('');
            $this->comment('Report only. Re-run with --unpublish-unattested --force to set publier=0 on the unattested ones.');

            return self::SUCCESS;
        }

        if (! $this->option('force')) {
            $this->line('');
            $this->error('--unpublish-unattested requires --force. Nothing was written.');

            return self::FAILURE;
        }

        $affected = Review::query()
            ->where('publier', 1)
            ->where('verified', '!=', 1)
            ->whereNull('commande_id')
            ->update(['publier' => 0]);

        $this->line('');
        $this->info(sprintf('Unpublished %d review(s). Reversible: they are set publier=0, not deleted.', $affected));

        // One sitemap/page refresh rather than one per review.
        app(\App\Services\Seo\SeoNotifier::class)->sitemapChanged();

        return self::SUCCESS;
    }
}
