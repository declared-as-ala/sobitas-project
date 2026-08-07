<?php

namespace App\Console\Commands;

use App\Jobs\GenerateProductContentJob;
use App\Models\Product;
use App\Services\Content\ProductContentGenerator;
use Illuminate\Console\Command;

/**
 * Draft richer copy for thin product pages.
 *
 *   php artisan products:generate-content --dry-run --limit=5
 *   php artisan products:generate-content --limit=25 --max-words=300
 *   php artisan products:generate-content --limit=3 --sync     # inline, to read the output
 *
 * Deliberately opt-in and batched rather than a one-shot sweep of all 303 products. Publishing a
 * few hundred generated pages the same day is the shape Google's scaled-content-abuse policy
 * targets, and it also removes any chance to check quality before it is everywhere. Run it in
 * batches, approve in Filament, watch Search Console, then continue.
 *
 * Note the batching rationale applies to APPROVAL, not drafting: a draft is invisible to Google
 * until a human publishes it. Queueing the drafting work therefore costs nothing in policy terms —
 * which is why the schedule may safely keep a small queue of drafts waiting for review.
 *
 * Nothing here touches live content: drafts land in ai_description_draft / ai_faq_draft with
 * ai_review_status = 'pending'.
 */
class GenerateProductContent extends Command
{
    protected $signature = 'products:generate-content
        {--limit=10 : How many products to process in this run}
        {--max-words=300 : Only products whose current description is under this many words}
        {--regenerate : Include products that already have a pending draft}
        {--dry-run : Generate and print, but write nothing}
        {--sync : Call Groq inline instead of queueing (blocks; use for a handful or when inspecting output)}';

    protected $description = 'Draft French description + FAQ for thin product pages (needs approval before publishing)';

    public function handle(ProductContentGenerator $generator): int
    {
        if (! $generator->isConfigured()) {
            $this->error('GROQ_API_KEY is not set — nothing to do.');

            return self::FAILURE;
        }

        $limit = max(1, (int) $this->option('limit'));
        $maxWords = max(0, (int) $this->option('max-words'));
        $dryRun = (bool) $this->option('dry-run');

        $query = Product::query()
            ->with(['brand', 'sousCategorie'])
            ->where('publier', 1);

        if (! $this->option('regenerate')) {
            $query->whereNull('ai_review_status');
        }

        // Word count is not expressible in SQL portably, so filter in PHP over a bounded set.
        $candidates = $query->orderBy('id')->limit($limit * 8)->get()
            ->filter(function (Product $p) use ($maxWords) {
                $words = str_word_count(trim(strip_tags((string) $p->description_fr)));

                return $maxWords === 0 || $words < $maxWords;
            })
            ->take($limit);

        if ($candidates->isEmpty()) {
            $this->info('No products matched — nothing thin left in this batch.');

            return self::SUCCESS;
        }

        $this->info(sprintf('%d product(s) to process%s', $candidates->count(), $dryRun ? ' (dry run)' : ''));

        // Default path: hand each product to the queue. Groq takes seconds per call, so a batch of
        // 25 blocks the terminal for minutes and a catalogue-wide run for half an hour — during
        // which one timeout or one closed session loses everything after the failure. On the queue,
        // a failure costs one product and retries itself. --sync keeps the old inline behaviour for
        // small runs where you want to read the output as it appears.
        if (! $dryRun && ! $this->option('sync')) {
            foreach ($candidates as $product) {
                GenerateProductContentJob::dispatch($product->id);
                $this->line(sprintf('  <fg=cyan>→</> queued  %s', mb_strimwidth((string) $product->designation_fr, 0, 60, '…')));
            }

            $this->newLine();
            $this->info(sprintf('%d job(s) queued. Drafts will be PENDING — nothing goes live without approval.', $candidates->count()));
            $this->comment('Watch: php artisan queue:work redis   ·   Approve: Filament → Produits → filtre "Contenu IA"');

            return self::SUCCESS;
        }

        $ok = 0;
        $failed = 0;

        foreach ($candidates as $product) {
            $before = str_word_count(trim(strip_tags((string) $product->description_fr)));
            $result = $generator->generate($product);

            if ($result === null) {
                $failed++;
                $this->line(sprintf('  <fg=red>✗</> %-52s (rejected or failed — see log)', mb_substr((string) $product->designation_fr, 0, 52)));
                continue;
            }

            $after = str_word_count(trim(strip_tags($result['description'])));
            $ok++;
            $this->line(sprintf(
                '  <fg=green>✓</> %-52s %d → %d words, %d FAQ',
                mb_substr((string) $product->designation_fr, 0, 52),
                $before,
                $after,
                count($result['faq'])
            ));

            if ($dryRun) {
                continue;
            }

            $product->forceFill([
                'ai_description_draft' => $result['description'],
                'ai_faq_draft'         => $result['faq'],
                'ai_generated_at'      => now(),
                'ai_review_status'     => 'pending',
                'ai_model'             => (string) config('services.ai.groq_model'),
            ])->saveQuietly();   // no observers, no cache churn, no touch of updated_at semantics
        }

        $this->newLine();
        $this->info(sprintf('Done: %d drafted, %d rejected.', $ok, $failed));

        if (! $dryRun && $ok > 0) {
            $this->comment('Drafts are PENDING. Review and approve them in Filament — nothing is live yet.');
        }

        return self::SUCCESS;
    }
}
