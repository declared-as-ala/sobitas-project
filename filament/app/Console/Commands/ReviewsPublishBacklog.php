<?php

namespace App\Console\Commands;

use App\Models\Review;
use App\Services\Reviews\ReviewAuthenticity;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

/**
 * Publish the unpublished review backlog (owner decision 21/09/2026: the collected reviews are
 * shown on the product pages again), with the two guards that stay non-negotiable:
 *
 *   1. DUPLICATES STAY DOWN. One published review per (product, text_hash); the backfill first
 *      writes the missing hashes exactly the way reviews:rescore does, so the dedup sees the whole
 *      corpus. Rating-only reviews (no text) have no hash and are treated as always-unique.
 *
 *   2. STARS ARE NOT TOUCHED. `publier = 1` makes a review VISIBLE; the star rating on the page
 *      and in Product JSON-LD reads scopeAttested() / isAttestedPurchase() — published AND
 *      (verified by an admin OR attached to an order). This command never writes `verified`,
 *      `commande_id` or scores, so the aggregate rating remains backed by attested purchases only.
 *      The honest star engine is reviews:backfill-requests (real post-delivery review emails).
 *
 * Direct chunked UPDATEs, deliberately: a model save would fire the review observer, which
 * re-moderates and can settle loyalty points — 56k times. Publishing visibility is not an edit.
 * Product pages render dynamically, so published reviews appear on the next request; no
 * revalidation sweep is needed.
 */
class ReviewsPublishBacklog extends Command
{
    protected $signature = 'reviews:publish-backlog
                            {--apply : Write publier = 1 (report only without it)}
                            {--limit=100000 : Maximum reviews to publish in this run}';

    protected $description = 'Publish the unpublished review backlog, deduped by (product, text_hash); never touches verified/commande_id, so star ratings stay attested-only';

    public function handle(ReviewAuthenticity $authenticity): int
    {
        $apply = (bool) $this->option('apply');
        $limit = max(1, (int) $this->option('limit'));

        if (! Schema::hasColumn('reviews', 'text_hash')) {
            $this->error('reviews.text_hash does not exist — run the 2026_08_21 review migrations first.');

            return self::FAILURE;
        }

        // ── 1. Hash backfill, so dedup sees every commented review ─────────────────────────────
        $missing = Review::query()->whereNull('text_hash')->whereNotNull('comment')->count();
        if ($missing > 0 && $apply) {
            $done = 0;
            Review::query()
                ->whereNull('text_hash')->whereNotNull('comment')
                ->select(['id', 'comment'])
                ->chunkById(500, function ($chunk) use ($authenticity, &$done): void {
                    foreach ($chunk as $review) {
                        $comment = trim((string) $review->comment);
                        if ($comment === '') {
                            continue;
                        }
                        // saveQuietly, as reviews:rescore does: a backfill must not re-moderate.
                        $review->forceFill(['text_hash' => $authenticity->textHash($comment)])->saveQuietly();
                        $done++;
                    }
                });
            $this->info(sprintf('  text_hash backfilled on %d review(s).', $done));
        } elseif ($missing > 0) {
            $this->warn(sprintf('  %d review(s) still lack text_hash; --apply backfills them first so dedup is complete.', $missing));
        }

        // ── 2. What is already published, keyed for dedup ──────────────────────────────────────
        $publishedKeys = [];
        Review::query()
            ->where('publier', 1)->whereNotNull('text_hash')->whereNotNull('product_id')
            ->select(['id', 'product_id', 'text_hash'])
            ->chunkById(5000, function ($chunk) use (&$publishedKeys): void {
                foreach ($chunk as $r) {
                    $publishedKeys[$r->product_id.':'.$r->text_hash] = true;
                }
            });

        // ── 3. Select candidates, dedup, publish ───────────────────────────────────────────────
        $toPublish = [];
        $dupes = 0;
        $noProduct = 0;
        $badRating = 0;
        $seen = $publishedKeys;

        Review::query()
            ->where('publier', '!=', 1)
            ->select(['id', 'product_id', 'stars', 'text_hash'])
            ->chunkById(5000, function ($chunk) use (&$toPublish, &$dupes, &$noProduct, &$badRating, &$seen, $limit): bool {
                foreach ($chunk as $r) {
                    if (count($toPublish) >= $limit) {
                        return false;
                    }
                    if (empty($r->product_id)) {
                        $noProduct++;
                        continue;
                    }
                    $stars = (int) $r->stars;
                    if ($stars < 1 || $stars > 5) {
                        $badRating++;
                        continue;
                    }
                    if ($r->text_hash !== null && $r->text_hash !== '') {
                        $key = $r->product_id.':'.$r->text_hash;
                        if (isset($seen[$key])) {
                            $dupes++;
                            continue;
                        }
                        $seen[$key] = true;
                    }
                    $toPublish[] = $r->id;
                }

                return true;
            });

        $this->info(sprintf('BACKLOG: %d review(s) %s be published', count($toPublish), $apply ? 'will' : 'would'));
        $this->line(sprintf('  skipped: %d duplicate(s), %d without product, %d without a 1-5 rating', $dupes, $noProduct, $badRating));

        if ($apply && $toPublish !== []) {
            $published = 0;
            foreach (array_chunk($toPublish, 1000) as $batch) {
                $published += Review::query()->whereIn('id', $batch)->update(['publier' => 1]);
            }
            $this->info(sprintf('  PUBLISHED %d review(s). Product pages render them on the next request.', $published));
            $this->line('  Star ratings unchanged by design: they read attested reviews only.');
            $this->line('  To grow attested stars, run the reviews-backfill-apply task (real post-delivery emails).');
        } elseif (! $apply) {
            $this->line('');
            $this->info('REPORT ONLY. Re-run with --apply to publish.');
        }

        return self::SUCCESS;
    }
}
