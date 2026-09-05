<?php

namespace App\Services\Reviews;

use App\Models\Review;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * ── IS A HUMAN BEHIND THIS REVIEW? ──────────────────────────────────────────────────────────
 * Owner, 21/08/2026: *"make ppl can earn points by reviewing products, but make it smart to detect
 * if the review is real or just botting."*
 *
 * `ReviewModerator` already asks a different question — is this text PUBLISHABLE? — and it answers
 * it well: spam, abuse, links, contact-harvesting, gibberish. It is deliberately sentiment-neutral,
 * because a furious genuine review must be published.
 *
 * This class asks the question that only matters once reviews are PAID FOR: was this written by a
 * person, or generated? A review can be perfectly publishable prose and
 * still be farmed, and the moderator has no reason to care about the difference. This one does,
 * because at 20 points to the dinar a fake review that clears both filters is minted money.
 *
 * ── THE SIGNALS, AND WHY EACH IS HARD TO FAKE ───────────────────────────────────────────────
 * The good ones are BEHAVIOURAL, not textual. Text is exactly what a language model is good at;
 * everything below is about how the text arrived, which it is not:
 *
 *   HONEYPOT       A field no human can see and no human can fill. Filled = a script that submits
 *                  every input it finds. Decades old, still the cheapest true positive there is.
 *   COMPOSE TIME   How long the form was open. Three sentences typed on a phone in 900ms did not
 *                  happen. The threshold scales with length, because "Super produit" legitimately
 *                  takes four seconds and 400 characters do not.
 *   DUPLICATE TEXT An indexed hash of the normalised text. A person writing about two proteins
 *                  does not produce byte-identical prose; a script pasting one paragraph across
 *                  forty listings does. This is the shape review farming has everywhere.
 *   BURST          Several reviews from one hashed address in a day, or from one account in an
 *                  hour. Slow to fake without infrastructure a Tunisian supplement shop is not
 *                  worth building.
 *   MISMATCH       Five stars on text the classifier read as negative. Nobody types "ça m'a rendu
 *                  malade" and picks five stars — a generator that fills a rating separately from
 *                  a body does.
 *   NO PURCHASE    No delivered order behind it. It receives the smaller member reward rather
 *                  than the verified-purchase reward; it is never a reason to hide the review.
 *
 * ── WHAT A LOW SCORE DOES, AND WHAT IT MUST NEVER DO ────────────────────────────────────────
 * It withholds POINTS and, below the floor, holds the review for a human. It never silently
 * deletes and never quietly unpublishes a genuine negative — suppressing real criticism is
 * review-gating, and it is a worse problem than the one this class solves. Every signal that fired
 * is stored on the row so a human can disagree with it.
 *
 * NEVER THROWS. A scoring failure must not break a customer's submission; it returns a neutral
 * score and says so in the signals.
 */
class ReviewAuthenticity
{
    /** At or above this, the review is treated as human and may earn points. */
    public const HUMAN_FLOOR = 70;

    /** Below this, the review is held for a human regardless of what the moderator thought. */
    public const BOT_CEILING = 35;

    /**
     * Milliseconds per character of review text that a real person plausibly needs.
     *
     * ~28ms/char is roughly 85 words per minute of sustained typing — comfortably FASTER than
     * almost anyone on a phone, so a submission under this bar did not involve typing. Deliberately
     * generous: the cost of a false positive here is a real customer silently not being paid.
     */
    private const MS_PER_CHAR = 28;

    /** Floor for the timing check — below this, no amount of text is plausible. */
    private const MIN_COMPOSE_MS = 2500;

    /**
     * Score one review. Always returns a verdict; never throws.
     *
     * @param  array<string,mixed>  $context  Client-side evidence: honeypot, compose_ms.
     * @param  array<string,mixed>|null  $moderation  The ReviewModerator verdict, when it has run.
     * @return array{score:int, verdict:string, signals:array<int,string>, may_earn_points:bool, reason:string}
     */
    public function assess(Review $review, array $context = [], ?array $moderation = null): array
    {
        try {
            return $this->score($review, $context, $moderation);
        } catch (\Throwable $e) {
            Log::warning('ReviewAuthenticity failed', ['review_id' => $review->id ?? null, 'error' => $e->getMessage()]);

            /*
             * Neutral, and NOT payable.
             *
             * A scoring failure must not hold up a customer's review — but it must also not be a
             * way to get paid. "We could not check" is not "we checked and it was fine", and the
             * two must never collapse into the same outcome when money is on the other side.
             */
            return [
                'score'            => 50,
                'verdict'          => 'unknown',
                'signals'          => ['scoring_failed'],
                'may_earn_points'  => false,
                'reason'           => 'Vérification indisponible.',
            ];
        }
    }

    /**
     * The normalised text hash. Public so the observer can store it on the row and so the dedupe
     * check below compares like with like.
     *
     * Lowercased, accents left alone (a bot does not strip them either), punctuation and repeated
     * whitespace removed. That defeats the laziest evasion — reposting the same paragraph with a
     * different exclamation mark — without pretending to defeat a determined one.
     */
    public function textHash(string $comment): string
    {
        $normalised = mb_strtolower(trim($comment));
        $normalised = preg_replace('~[^\p{L}\p{N}\s]+~u', ' ', $normalised) ?? $normalised;
        $normalised = preg_replace('~\s+~u', ' ', $normalised) ?? $normalised;

        return sha1(trim($normalised));
    }

    /**
     * @param  array<string,mixed>  $context
     * @param  array<string,mixed>|null  $moderation
     * @return array{score:int, verdict:string, signals:array<int,string>, may_earn_points:bool, reason:string}
     */
    private function score(Review $review, array $context, ?array $moderation): array
    {
        $comment = trim((string) $review->comment);
        $length  = mb_strlen($comment);
        $signals = [];
        $score   = 100;

        // ── 1. HONEYPOT ─────────────────────────────────────────────────────────────────────
        // Not a deduction. A filled honeypot is not "suspicious", it is a script — a field that is
        // invisible and unlabelled cannot be filled by somebody reading the page.
        if (! empty($context['honeypot'])) {
            return [
                'score'           => 0,
                'verdict'         => 'bot',
                'signals'         => ['honeypot'],
                'may_earn_points' => false,
                'reason'          => 'Champ piège rempli — soumission automatisée.',
            ];
        }

        // ── 2. COMPOSE TIME ─────────────────────────────────────────────────────────────────
        $composeMs = isset($context['compose_ms']) ? (int) $context['compose_ms'] : null;
        if ($composeMs !== null && $composeMs > 0) {
            $expected = max(self::MIN_COMPOSE_MS, $length * self::MS_PER_CHAR);
            if ($composeMs < $expected) {
                // Scaled, not binary: 10x too fast is a different claim from 10% too fast.
                $ratio = $composeMs / max(1, $expected);
                $score -= $ratio < 0.25 ? 45 : 25;
                $signals[] = 'too_fast';
            }
        } else {
            // No timing at all means the submission did not come from our form — an API client, a
            // replayed request, or an older cached page. Mild on its own; it stacks.
            $signals[] = 'no_timing';
            $score -= 10;
        }

        // ── 3. DUPLICATE TEXT ───────────────────────────────────────────────────────────────
        if ($length >= 12 && Schema::hasColumn('reviews', 'text_hash')) {
            $hash = $this->textHash($comment);
            $twin = Review::query()
                ->where('text_hash', $hash)
                ->when($review->id, fn ($q) => $q->where('id', '!=', $review->id))
                ->exists();
            if ($twin) {
                $score -= 50;
                $signals[] = 'duplicate_text';
            }
        }

        // ── 4. BURSTS ───────────────────────────────────────────────────────────────────────
        if (! empty($review->ip_hash) && Schema::hasColumn('reviews', 'ip_hash')) {
            $fromSameAddress = Review::query()
                ->where('ip_hash', $review->ip_hash)
                ->when($review->id, fn ($q) => $q->where('id', '!=', $review->id))
                ->where('created_at', '>=', now()->subDay())
                ->count();
            if ($fromSameAddress >= 3) {
                $score -= 25;
                $signals[] = 'ip_burst';
            }
        }

        if (! empty($review->user_id)) {
            $fromSameUser = Review::query()
                ->where('user_id', $review->user_id)
                ->when($review->id, fn ($q) => $q->where('id', '!=', $review->id))
                ->where('created_at', '>=', now()->subHour())
                ->count();
            if ($fromSameUser >= 4) {
                $score -= 20;
                $signals[] = 'user_burst';
            }
        }

        // ── 5. RATING / SENTIMENT MISMATCH ──────────────────────────────────────────────────
        // Free: the moderator already returns a sentiment, and this is the one place that field is
        // worth acting on. A generator that fills the stars separately from the body produces this
        // combination constantly; a person almost never does.
        $sentiment = is_array($moderation) ? (string) ($moderation['sentiment'] ?? '') : '';
        $stars     = (int) ($review->stars ?? $review->note ?? 0);
        if ($sentiment === 'negative' && $stars >= 4) {
            $score -= 20;
            $signals[] = 'sentiment_mismatch';
        } elseif ($sentiment === 'positive' && $stars <= 2) {
            $score -= 15;
            $signals[] = 'sentiment_mismatch';
        }

        // The moderator's own conclusion carries weight here too — a review it wanted to reject is
        // not one to pay for, whatever the behavioural signals said.
        $decision = is_array($moderation) ? (string) ($moderation['decision'] ?? '') : '';
        if ($decision === 'reject') {
            $score -= 40;
            $signals[] = 'moderation_reject';
        } elseif ($decision === 'hold') {
            $score -= 15;
            $signals[] = 'moderation_hold';
        }

        // ── 6. EFFORT ───────────────────────────────────────────────────────────────────────
        // Not about quality. "Bon produit" is a fine review and earns nothing extra, but a rating
        // with three characters attached carries no information for the next customer, and paying
        // for it is paying for noise.
        if ($length < 15) {
            $score -= 25;
            $signals[] = 'too_short';
        }
        if ($length > 0 && count(array_unique(preg_split('~\s+~u', mb_strtolower($comment)) ?: [])) <= 2 && $length >= 15) {
            $score -= 20;
            $signals[] = 'repetitive';
        }

        // ── 7. PURCHASE ─────────────────────────────────────────────────────────────────────
        // Deliberately the LAST thing considered and deliberately not a large deduction: a review
        // without an order is legitimate and may earn the smaller phone-verified member reward.
        $attested = (int) ($review->verified ?? 0) === 1 || ($review->commande_id ?? null) !== null;
        if (! $attested) {
            $signals[] = 'no_purchase';
            $score -= 10;
        }

        $score   = max(0, min(100, $score));
        $verdict = $score >= self::HUMAN_FLOOR ? 'human' : ($score < self::BOT_CEILING ? 'bot' : 'suspect');

        /*
         * ── THE PAYMENT GATE ────────────────────────────────────────────────────────────────
         * The behavioural verdict decides whether the text is rewardable. Identity is checked by
         * ReviewObserver (phone verified), while purchase evidence only selects the 10 or 50 point
         * tier. Keeping those decisions separate prevents an email-only or guest review from being
         * paid while still allowing a genuine phone-verified member review to earn 10 points.
         */
        $mayEarn = $verdict === 'human';

        return [
            'score'           => $score,
            'verdict'         => $verdict,
            'signals'         => array_values(array_unique($signals)),
            'may_earn_points' => $mayEarn,
            'reason'          => $this->explain($verdict, $signals),
        ];
    }

    /** One French sentence an admin can read in a table cell. */
    private function explain(string $verdict, array $signals): string
    {
        if ($signals === []) {
            return 'Aucun signal suspect.';
        }

        $labels = [
            'honeypot'           => 'champ piège rempli',
            'too_fast'           => 'rédigé trop vite',
            'no_timing'          => 'pas de mesure de saisie',
            'duplicate_text'     => 'texte déjà publié ailleurs',
            'ip_burst'           => 'plusieurs avis depuis la même adresse',
            'user_burst'         => 'plusieurs avis en une heure',
            'sentiment_mismatch' => 'note incohérente avec le texte',
            'moderation_reject'  => 'rejeté par la modération',
            'moderation_hold'    => 'retenu par la modération',
            'too_short'          => 'trop court',
            'repetitive'         => 'texte répétitif',
            'no_purchase'        => 'aucun achat rattaché',
            'scoring_failed'     => 'vérification indisponible',
        ];

        $words = array_map(fn (string $s) => $labels[$s] ?? $s, $signals);

        return ucfirst(implode(', ', $words)) . '.';
    }
}
