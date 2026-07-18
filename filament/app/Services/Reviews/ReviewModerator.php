<?php

namespace App\Services\Reviews;

use App\Models\Review;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * LLM (Groq) content moderation for customer reviews.
 *
 * The legacy flow auto-publishes every 4–5★ review and holds 1–3★ (a pure
 * star-gate). That lets a spammy / fake / abusive 5★ go live automatically —
 * the exact thing that risks a Google review-snippet penalty. This service vets
 * each new review and returns a verdict the observer acts on, so only GENUINE
 * reviews stay published.
 *
 * Design rules:
 *  - NEVER throws — a moderation failure must never break a customer's submission.
 *  - Degrades gracefully: with no Groq key it falls back to deterministic rule
 *    checks (links / contact info) instead of the LLM.
 *  - Sentiment-neutral: a negative but genuine review is VALID and must be
 *    published. We flag spam / fake / abuse / off-topic / contact-harvesting —
 *    never mere criticism. Suppressing genuine negatives is review-gating.
 */
class ReviewModerator
{
    private const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

    /**
     * Vet one review. Always returns a verdict array (never throws).
     *
     * @return array{
     *   decision:string, genuine:?bool, sentiment:?string, language:?string,
     *   flags:array<int,string>, summary:string, reason:string, source:string, checked_at:string
     * }
     */
    public function moderate(Review $review): array
    {
        $comment = trim((string) $review->comment);
        $stars   = (int) ($review->note ?? $review->stars ?? 0);

        $ruleFlags = $this->ruleScan($comment);

        $ai = null;
        if ((bool) config('reviews.moderation.enabled', true) && $this->apiKey() !== '') {
            $ai = $this->aiClassify($review, $comment, $stars);
        }

        return $this->decide($ruleFlags, $ai);
    }

    /**
     * Deterministic checks that need no API key. Only ever DOWNGRADES (never
     * approves) so a false positive just routes a review to a human, never
     * publishes something bad.
     *
     * @return array<int,string>
     */
    private function ruleScan(string $text): array
    {
        $flags = [];

        if ($text === '') {
            $flags[] = 'empty';

            return $flags;
        }

        // Ignore mentions of our OWN domain(s) so "protein.tn est super" is not
        // mistaken for an outbound link.
        $scan = preg_replace('~\b(?:protein|sobitas)\.tn\b~i', ' ', $text) ?? $text;

        // Explicit URL / domain — near-certain self-promotion or spam in a review.
        if (preg_match('~\b(?:https?://|www\.)~i', $scan)
            || preg_match('~\b[a-z0-9-]+\.(?:com|net|org|tn|fr|shop|store|xyz|info|biz|online|site)\b~i', $scan)) {
            $flags[] = 'link';
        }

        // Email address.
        if (preg_match('~[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}~i', $scan)) {
            $flags[] = 'contact';
        }

        // Phone number: a run of 8+ digits, or a grouped Tunisian 8-digit number.
        if (preg_match('~\d{8,}~', $scan)
            || preg_match('~(?:\+?216)?[\s.\-]?\d{2}[\s.\-]\d{3}[\s.\-]\d{3}~', $scan)) {
            if (! in_array('contact', $flags, true)) {
                $flags[] = 'contact';
            }
        }

        return $flags;
    }

    /**
     * Ask the LLM to classify the review. Returns the decoded JSON object, or
     * null on any error / timeout / unparseable output (caller falls back).
     *
     * @return array<string,mixed>|null
     */
    private function aiClassify(Review $review, string $comment, int $stars): ?array
    {
        $product = optional($review->product)->designation_fr ?? ('#' . $review->product_id);

        $system = <<<'SYS'
You are a strict content-moderation classifier for product reviews on Protein.tn, a sports-nutrition and supplements store in Tunisia. Reviews may be written in French, Tunisian Arabic ("derja", in Arabic OR Latin script), or English.

Judge ONLY whether the review is a genuine, publishable customer opinion about the product. A negative or critical review is PERFECTLY VALID — never reject a review just because it is unfavourable; genuine criticism MUST be published.

Recommend "hold" or "reject" ONLY when the text is: spam or advertising, a link or contact detail (phone/email/social) meant to move the customer off-site, abusive/hateful, gibberish or empty of meaning, obviously fake or bot-generated, or about something other than the product.

Respond with ONLY a JSON object (no prose, no markdown):
{
  "genuine": boolean,
  "spam": boolean,
  "abusive": boolean,
  "off_topic": boolean,
  "gibberish": boolean,
  "contains_contact": boolean,
  "language": "fr" | "ar" | "en" | "other",
  "sentiment": "positive" | "neutral" | "negative",
  "summary": "<= 8 words, French",
  "recommendation": "publish" | "hold" | "reject",
  "reason": "<= 15 words, French"
}
SYS;

        $user = "Produit: {$product}\nNote: {$stars}/5\nAvis: \"{$comment}\"";

        try {
            $res = Http::withToken($this->apiKey())
                ->connectTimeout(3)
                ->timeout((int) config('services.ai.timeout', 12))
                ->acceptJson()
                ->post(self::GROQ_ENDPOINT, [
                    'model'           => (string) config('services.ai.groq_model', 'llama-3.3-70b-versatile'),
                    'temperature'     => 0,
                    'max_tokens'      => 400,
                    'response_format' => ['type' => 'json_object'],
                    'messages'        => [
                        ['role' => 'system', 'content' => $system],
                        ['role' => 'user', 'content' => $user],
                    ],
                ]);

            if (! $res->successful()) {
                Log::warning('[ReviewModerator] Groq HTTP error', ['status' => $res->status()]);

                return null;
            }

            $content = data_get($res->json(), 'choices.0.message.content');
            if (! is_string($content) || trim($content) === '') {
                return null;
            }

            $parsed = json_decode($content, true);

            return is_array($parsed) ? $parsed : null;
        } catch (\Throwable $e) {
            Log::warning('[ReviewModerator] Groq call failed', ['error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * Fold the rule flags and the (optional) AI verdict into a single decision.
     * The STRICTEST of the two wins (reject > hold > publish) so safety always
     * dominates.
     *
     * @param  array<int,string>  $ruleFlags
     * @param  array<string,mixed>|null  $ai
     */
    private function decide(array $ruleFlags, ?array $ai): array
    {
        $now   = now()->toIso8601String();
        $flags = $ruleFlags;

        // Baseline decision from rules alone (also the fallback when AI is off).
        $ruleDecision = 'publish';
        if (in_array('link', $ruleFlags, true) || in_array('contact', $ruleFlags, true) || in_array('empty', $ruleFlags, true)) {
            $ruleDecision = 'hold';
        }

        if ($ai === null) {
            return [
                'decision'   => $ruleDecision,
                'genuine'    => null,
                'sentiment'  => null,
                'language'   => null,
                'flags'      => array_values(array_unique($flags)),
                'summary'    => $ruleDecision === 'publish' ? 'OK (règles)' : 'Signalé par règles',
                'reason'     => $ruleDecision === 'publish'
                    ? 'Aucun lien / coordonnées détectés (IA indisponible).'
                    : 'Lien ou coordonnées détectés dans l’avis.',
                'source'     => 'rules',
                'checked_at' => $now,
            ];
        }

        // Merge AI-detected problems into the flag list.
        foreach (['spam' => 'spam', 'abusive' => 'abusive', 'off_topic' => 'off_topic', 'gibberish' => 'gibberish', 'contains_contact' => 'contact'] as $key => $flag) {
            if (! empty($ai[$key])) {
                $flags[] = $flag;
            }
        }

        $genuine = array_key_exists('genuine', $ai) ? (bool) $ai['genuine'] : null;

        $rec = is_string($ai['recommendation'] ?? null) ? strtolower(trim($ai['recommendation'])) : 'hold';
        if (! in_array($rec, ['publish', 'hold', 'reject'], true)) {
            $rec = 'hold';
        }
        // Hard overrides: clearly-bad content is a reject regardless of the model's
        // own recommendation; off-topic is at least a hold.
        if (! empty($ai['spam']) || ! empty($ai['abusive']) || ! empty($ai['gibberish']) || $genuine === false) {
            $rec = 'reject';
        } elseif (! empty($ai['off_topic']) && $rec === 'publish') {
            $rec = 'hold';
        }

        return [
            'decision'   => $this->strictest($ruleDecision, $rec),
            'genuine'    => $genuine,
            'sentiment'  => is_string($ai['sentiment'] ?? null) ? $ai['sentiment'] : null,
            'language'   => is_string($ai['language'] ?? null) ? $ai['language'] : null,
            'flags'      => array_values(array_unique($flags)),
            'summary'    => Str::limit((string) ($ai['summary'] ?? ''), 60, '') ?: 'Analysé par IA',
            'reason'     => Str::limit((string) ($ai['reason'] ?? ''), 140, '') ?: 'Analysé par IA.',
            'source'     => 'ai',
            'checked_at' => $now,
        ];
    }

    private function strictest(string $a, string $b): string
    {
        $rank = ['publish' => 0, 'hold' => 1, 'reject' => 2];

        return ($rank[$a] ?? 0) >= ($rank[$b] ?? 0) ? $a : $b;
    }

    private function apiKey(): string
    {
        // config() first (works when config is cached); env() fallback covers the
        // container case where the var is injected via docker `env_file: .env`.
        return trim((string) (config('services.ai.groq_key') ?: env('GROQ_API_KEY', '')));
    }
}
