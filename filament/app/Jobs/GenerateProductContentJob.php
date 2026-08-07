<?php

namespace App\Jobs;

use App\Models\Product;
use App\Services\Content\ProductContentGenerator;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Draft description + FAQ for ONE product.
 *
 * ── WHY ONE PRODUCT PER JOB ───────────────────────────────────────────────────────────────
 * `products:generate-content` called Groq synchronously in a loop. Each call takes several
 * seconds, so a batch of 25 blocks a terminal for minutes and a batch covering the catalogue would
 * run for half an hour — during which one timeout, one deploy or one closed SSH session loses
 * every product after the failure with nothing recorded.
 *
 * One product per job means a failure costs one product, retries are automatic, and the work
 * survives a restart. Production already runs `php artisan queue:work redis`
 * (docker-compose.yml:190), so this needs no new infrastructure.
 *
 * ── WHAT IT DOES NOT DO ───────────────────────────────────────────────────────────────────
 * Nothing here publishes. Output lands in `ai_description_draft` / `ai_faq_draft` with
 * `ai_review_status = 'pending'`, all of which are in Product::$hidden and never reach the public
 * API. A human still has to approve it in Filament — which is not a nicety here: these are
 * supplements, and the source guidance is explicit that the category always gets human review.
 */
class GenerateProductContentJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /** Groq rate-limits per minute; a couple of retries with backoff rides that out. */
    public int $tries = 3;

    public int $backoff = 60;

    /** One Groq call, generously bounded. */
    public int $timeout = 120;

    /**
     * Two jobs for the same product would spend twice the tokens to produce one draft, and the
     * second write would silently overwrite the first. The lock is released as soon as the job
     * starts, so a genuine re-run later is never blocked.
     */
    public int $uniqueFor = 3600;

    public function __construct(public int $productId) {}

    public function uniqueId(): string
    {
        return (string) $this->productId;
    }

    public function handle(ProductContentGenerator $generator): void
    {
        if (! $generator->isConfigured()) {
            Log::warning('[GenerateProductContentJob] GROQ_API_KEY not set — skipping', [
                'product' => $this->productId,
            ]);

            return;
        }

        $product = Product::with(['brand', 'sousCategorie'])->find($this->productId);
        if (! $product) {
            return;
        }

        $result = $generator->generate($product);
        if ($result === null) {
            // The generator logs its own reason (health claim, dosage, invented figures, too short).
            // A rejected draft is a correct outcome, not an error, so the job does not fail and
            // retry — retrying would just spend tokens producing the same rejected text.
            return;
        }

        $product->forceFill([
            'ai_description_draft' => $result['description'],
            'ai_faq_draft' => $result['faq'],
            'ai_generated_at' => now(),
            'ai_review_status' => 'pending',
            'ai_model' => (string) config('services.ai.groq_model'),
        ])->saveQuietly();   // no observers, no cache churn, no touch of updated_at semantics
    }
}
