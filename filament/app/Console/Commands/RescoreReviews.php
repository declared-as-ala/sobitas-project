<?php

namespace App\Console\Commands;

use App\Models\Review;
use App\Services\Reviews\ReviewAuthenticity;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

/**
 * Run the authenticity detector across reviews that already exist, and say what it found.
 *
 * ── WHY THIS IS NOT OPTIONAL ────────────────────────────────────────────────────────────────
 * `ReviewAuthenticity` decides whether a review earns 50 loyalty points, which at 20 points to the
 * dinar means it decides whether a review is worth 2.50 DT. A detector that has only ever been
 * reasoned about is a detector with an unknown false-negative rate, and the failure mode is paying
 * for spam.
 *
 * This shop happens to own an unusually good test set for it. `seo:audit-reviews` found, and then
 * unpublished, a seeded pool: ~200 reviews per product with `verified = 0` and
 * `commande_id = NULL` on every row, drawn from a shared comment pool — a lateral-pulldown machine
 * and a shoulder press sharing 72 byte-identical comments, the shoulder press reviewed in Arabic
 * for its vanilla flavour. Those are KNOWN fakes, in the database, right now.
 *
 * So the detector can be measured rather than asserted: run it over the corpus and see how much of
 * a known-fake pool it rejects. That is what `--dry-run` (the default) prints.
 *
 * ── THE ORDER MATTERS, AND IT IS NOT THE OBVIOUS ONE ────────────────────────────────────────
 * Duplicate detection compares a review's text hash against the STORED hashes of other reviews.
 * Every review written before the column existed has `text_hash = NULL`, so on a fresh corpus that
 * check finds nothing and the strongest signal against a seeded pool is silently unavailable —
 * a detector that reports "clean" because it has nothing to compare against.
 *
 * `--apply` therefore backfills every missing hash FIRST, in one pass, and only then scores. On the
 * dry run the hashes are computed in memory for the same reason.
 *
 * ── WHAT THIS COMMAND WILL NOT DO ───────────────────────────────────────────────────────────
 * It never changes `publier`. Rescoring is a measurement; unpublishing hundreds of reviews on the
 * strength of a score no human has looked at is a content decision, and this shop has already had
 * to make that one once, deliberately, with `seo:audit-reviews --unpublish-unattested`. The score
 * is written so a moderator can sort by it. The moderator still decides.
 */
class RescoreReviews extends Command
{
    protected $signature = 'reviews:rescore
                            {--apply : Write text_hash and the authenticity score (never changes publier)}
                            {--limit=5000 : Maximum reviews to process}
                            {--hash-only : Backfill text_hash and stop}';

    protected $description = 'Score existing reviews for authenticity and report what the detector finds';

    public function handle(ReviewAuthenticity $authenticity): int
    {
        $apply    = (bool) $this->option('apply');
        $hashOnly = (bool) $this->option('hash-only');
        $limit    = max(1, (int) $this->option('limit'));

        if (! Schema::hasColumn('reviews', 'authenticity_score') || ! Schema::hasColumn('reviews', 'text_hash')) {
            $this->error('Colonnes manquantes — lancez les migrations avant ce contrôle.');

            return self::FAILURE;
        }

        // ── 1. HASHES FIRST ─────────────────────────────────────────────────────────────────
        $missing = Review::query()->whereNull('text_hash')->whereNotNull('comment')->count();
        $this->line(sprintf('%d avis sans empreinte de texte.', $missing));

        if ($missing > 0 && ($apply || $hashOnly)) {
            $done = 0;
            Review::query()
                ->whereNull('text_hash')
                ->whereNotNull('comment')
                ->select(['id', 'comment'])
                ->chunkById(500, function ($chunk) use ($authenticity, &$done) {
                    foreach ($chunk as $review) {
                        $comment = trim((string) $review->comment);
                        if ($comment === '') {
                            continue;
                        }
                        // saveQuietly: this is a backfill, not an edit. Firing the observer here
                        // would re-run moderation on the entire corpus and, worse, re-settle points.
                        $review->forceFill(['text_hash' => $authenticity->textHash($comment)])->saveQuietly();
                        $done++;
                    }
                });
            $this->info(sprintf('%d empreinte(s) écrite(s).', $done));
        } elseif ($missing > 0) {
            $this->warn('Sans --apply les empreintes ne sont pas écrites : la détection de doublons ne verra que les avis déjà pourvus.');
        }

        if ($hashOnly) {
            return self::SUCCESS;
        }

        // ── 2. SCORE ────────────────────────────────────────────────────────────────────────
        $buckets = ['human' => 0, 'suspect' => 0, 'bot' => 0, 'unknown' => 0];
        $signals = [];
        // Split on attestation, because that is the axis the known-fake pool sits on: every seeded
        // review has verified = 0 and commande_id = NULL. A detector that scores both halves the
        // same has learned nothing.
        $byAttestation = [
            'attested'   => ['n' => 0, 'bot' => 0, 'suspect' => 0],
            'unattested' => ['n' => 0, 'bot' => 0, 'suspect' => 0],
        ];
        $payable = 0;
        $scored  = 0;

        $bar = $this->output->createProgressBar(min($limit, Review::query()->whereNotNull('comment')->count()));
        $bar->start();

        Review::query()
            ->whereNotNull('comment')
            ->orderBy('id')
            ->limit($limit)
            ->chunkById(200, function ($chunk) use (
                $authenticity, $apply, &$buckets, &$signals, &$byAttestation, &$payable, &$scored, $bar
            ) {
                foreach ($chunk as $review) {
                    $result = $authenticity->assess($review, ['compose_ms' => $review->compose_ms ?? null]);

                    $verdict = (string) ($result['verdict'] ?? 'unknown');
                    $buckets[$verdict] = ($buckets[$verdict] ?? 0) + 1;
                    $scored++;

                    if (! empty($result['may_earn_points'])) {
                        $payable++;
                    }

                    foreach ((array) ($result['signals'] ?? []) as $signal) {
                        $signals[$signal] = ($signals[$signal] ?? 0) + 1;
                    }

                    $attested = ((int) ($review->verified ?? 0) === 1) || ! empty($review->commande_id);
                    $key = $attested ? 'attested' : 'unattested';
                    $byAttestation[$key]['n']++;
                    if ($verdict === 'bot') {
                        $byAttestation[$key]['bot']++;
                    } elseif ($verdict === 'suspect') {
                        $byAttestation[$key]['suspect']++;
                    }

                    if ($apply) {
                        $review->forceFill([
                            'authenticity_score'   => (int) $result['score'],
                            'authenticity_signals' => $result,
                        ])->saveQuietly();
                    }

                    $bar->advance();
                }
            });

        $bar->finish();
        $this->newLine(2);

        // ── 3. REPORT ───────────────────────────────────────────────────────────────────────
        $this->line(sprintf('<options=bold>%d avis analysés%s</>', $scored, $apply ? '' : ' (lecture seule)'));
        $this->newLine();

        $this->table(
            ['Verdict', 'Avis', 'Part'],
            array_map(
                fn (string $k, int $v) => [
                    $k,
                    $v,
                    $scored > 0 ? round($v * 100 / $scored, 1) . ' %' : '—',
                ],
                array_keys($buckets),
                array_values($buckets)
            )
        );

        arsort($signals);
        if ($signals) {
            $this->line('<options=bold>Signaux déclenchés</>');
            $this->table(
                ['Signal', 'Occurrences'],
                array_map(fn (string $k, int $v) => [$k, $v], array_keys($signals), array_values($signals))
            );
        }

        $this->line('<options=bold>Par attestation d’achat</>');
        $this->table(
            ['Groupe', 'Avis', 'Robots', 'Suspects', 'Part rejetée'],
            array_map(function (string $k, array $v) {
                $bad = $v['bot'] + $v['suspect'];

                return [
                    $k,
                    $v['n'],
                    $v['bot'],
                    $v['suspect'],
                    $v['n'] > 0 ? round($bad * 100 / $v['n'], 1) . ' %' : '—',
                ];
            }, array_keys($byAttestation), array_values($byAttestation))
        );

        /*
         * The number that matters most, said plainly. Everything above describes the corpus; this
         * one describes the exposure — how many of these reviews the detector would hand 50 points
         * to if they were all published tomorrow.
         */
        $this->info(sprintf(
            '%d avis rempliraient les deux conditions pour être payés (achat attesté ET verdict « humain ») — soit %s DT.',
            $payable,
            number_format($payable * (int) config('reviews.points.award', 50) / 20, 2, ',', ' ')
        ));

        if (! $apply) {
            $this->newLine();
            $this->line('Aucune écriture. Relancez avec --apply pour enregistrer les scores (publier n’est jamais modifié).');
        }

        return self::SUCCESS;
    }
}
