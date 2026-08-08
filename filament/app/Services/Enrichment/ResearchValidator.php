<?php

namespace App\Services\Enrichment;

use App\Services\Content\ProductContentGenerator;
use App\Support\Figures;
use App\Support\YouTubeId;

/**
 * The gate between researched content and a live product page.
 *
 * ── WHY THIS IS A SERVICE AND NOT A METHOD ON THE COMMAND ─────────────────────────────────
 * These rules are the only thing standing between "an agent read a web page" and "a customer reads
 * a number and measures a scoop by it". Rules that important have to be testable without booting a
 * framework, runnable from more than one entry point, and readable in one place. Buried as private
 * methods on a console command they were none of those.
 *
 * ── THE RULE THAT EARNS ITS KEEP ──────────────────────────────────────────────────────────
 * Every figure in a FAQ answer must appear in the panel imported beside it. A researcher that reads
 * the 908 g page while we sell the 2.27 kg tub produces text that is fluent, cited, internally
 * consistent and wrong — and no amount of prose review catches it, because the prose is fine. Only
 * comparing its numbers against the panel does.
 */
class ResearchValidator
{
    /**
     * Nutrition in the shape `nutrition_facts` stores, or null.
     *
     * @param  mixed  $nutrition
     * @return array<string, mixed>|null
     */
    public function nutritionFacts(mixed $nutrition): ?array
    {
        if (! is_array($nutrition)) {
            return null;
        }

        $sourceUrl = trim((string) ($nutrition['source_url'] ?? ''));

        // No citation, no panel. A figure whose origin cannot be re-checked is not evidence — and
        // this field is what makes a wrong number traceable six months from now.
        if ($sourceUrl === '' || filter_var($sourceUrl, FILTER_VALIDATE_URL) === false) {
            return null;
        }

        $rows = [];
        foreach ((array) ($nutrition['rows'] ?? []) as $row) {
            if (! is_array($row)) {
                continue;
            }

            $name = trim((string) ($row['name'] ?? ''));
            if ($name === '') {
                continue;
            }

            $kind = in_array($row['kind'] ?? '', ['value', 'undeclared', 'blend'], true)
                ? (string) $row['kind']
                : 'value';

            // A "value" row with no number is not a value row. Rendering it as a blank cell would
            // read as "we failed to fetch this"; it is really "the label declares no amount".
            if ($kind === 'value' && ! is_numeric($row['quantity'] ?? null)) {
                $kind = 'undeclared';
            }

            $rows[] = [
                'name' => $name,
                'kind' => $kind,
                'quantity' => $kind === 'value' ? $row['quantity'] + 0 : null,
                'unit' => $kind === 'value' ? trim((string) ($row['unit'] ?? '')) : '',
                'percent_dv' => is_numeric($row['percent_dv'] ?? null) ? $row['percent_dv'] + 0 : null,
                'depth' => max(0, min(2, (int) ($row['depth'] ?? 0))),
            ];
        }

        if ($rows === []) {
            return null;
        }

        return [
            'rows' => $rows,
            'serving_quantity' => is_numeric($nutrition['serving_quantity'] ?? null) ? $nutrition['serving_quantity'] + 0 : null,
            'serving_unit' => trim((string) ($nutrition['serving_unit'] ?? '')),
            'serving_note' => trim((string) ($nutrition['serving_note'] ?? '')),
            'servings_per_container' => trim((string) ($nutrition['servings_per_container'] ?? '')),
            'net_quantity' => is_numeric($nutrition['net_quantity'] ?? null) ? $nutrition['net_quantity'] + 0 : null,
            'net_unit' => trim((string) ($nutrition['net_unit'] ?? '')),
            // EU reference intakes unless the source explicitly said Daily Value. Vitamin D is 20 µg
            // in the US against 5 µg in the EU — the same capsule reads 100 % on one label and 400 %
            // on the other, so guessing prints a correct number under the wrong name.
            'percent_basis' => ($nutrition['percent_basis'] ?? '') === 'us' ? 'us' : 'eu',
            'other_ingredients' => trim((string) ($nutrition['other_ingredients'] ?? '')),
            'allergens' => trim((string) ($nutrition['allergens'] ?? '')),
            'warnings' => trim((string) ($nutrition['warnings'] ?? '')),
            'claims' => trim((string) ($nutrition['claims'] ?? '')),
            'source_url' => $sourceUrl,
        ];
    }

    /**
     * Every figure a panel vouches for.
     *
     * @param  array<string, mixed>  $facts
     * @return list<string>
     */
    public function figuresIn(array $facts): array
    {
        $parts = [];

        foreach ($facts['rows'] ?? [] as $row) {
            if (($row['quantity'] ?? null) !== null) {
                $parts[] = $row['quantity'].' '.($row['unit'] ?? '');
            }
            if (($row['percent_dv'] ?? null) !== null) {
                $parts[] = $row['percent_dv'].' %';
            }
        }

        $parts[] = ($facts['serving_quantity'] ?? '').' '.($facts['serving_unit'] ?? '');
        $parts[] = ($facts['net_quantity'] ?? '').' '.($facts['net_unit'] ?? '');
        $parts[] = (string) ($facts['serving_note'] ?? '');
        $parts[] = (string) ($facts['servings_per_container'] ?? '');

        return Figures::in(implode(' ', $parts));
    }

    /**
     * FAQ entries that survive, plus why each rejection happened.
     *
     * @param  list<string>  $approved  figures the imported panel vouches for
     * @return array{kept: list<array{q: string, a: string}>, rejected: list<string>}
     */
    public function faq(mixed $entries, array $approved, string $productName): array
    {
        $kept = [];
        $rejected = [];

        if (! is_array($entries)) {
            return ['kept' => [], 'rejected' => []];
        }

        // Pack size lives in the product name and is a legitimate thing to quote.
        $allowed = array_merge($approved, Figures::in($productName));

        foreach ($entries as $entry) {
            if (! is_array($entry)) {
                continue;
            }

            $q = trim((string) ($entry['q'] ?? ''));
            $a = trim((string) ($entry['a'] ?? ''));
            if ($q === '' || $a === '') {
                continue;
            }

            $label = mb_strimwidth($q, 0, 46, '…');
            $text = $q.' '.$a;

            if ($this->hasHealthClaim($text)) {
                $rejected[] = "allégation santé: {$label}";

                continue;
            }

            if ($this->hasDosage($text)) {
                $rejected[] = "posologie: {$label}";

                continue;
            }

            $ungrounded = Figures::ungrounded($a, $allowed);
            if ($ungrounded !== []) {
                $rejected[] = 'chiffre non sourcé ('.implode(', ', array_slice($ungrounded, 0, 3))."): {$label}";

                continue;
            }

            $kept[] = ['q' => $q, 'a' => $a];
        }

        return ['kept' => array_slice($kept, 0, 6), 'rejected' => $rejected];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function video(mixed $video, string $today): ?array
    {
        if (! is_array($video) || ($video['official'] ?? false) !== true) {
            return null;
        }

        // Rejected, not sanitised. This id becomes an iframe origin on a page that takes payments;
        // anything outside YouTube's 11-character alphabet is not an id, whatever it resembles.
        $id = YouTubeId::parse((string) ($video['youtube_id'] ?? ''));
        if ($id === null) {
            return null;
        }

        $channel = trim((string) ($video['channel'] ?? ''));
        if ($channel === '') {
            // Without a channel, "is this really the brand's video?" stops being answerable, and an
            // unattributed embed is somebody else's claims wearing our layout.
            return null;
        }

        return [
            'youtube_id' => $id,
            'title' => trim((string) ($video['title'] ?? '')),
            'channel' => $channel,
            'source_url' => YouTubeId::watchUrl($id),
            'verified_at' => $today,
        ];
    }

    public function hasHealthClaim(string $text): bool
    {
        foreach (ProductContentGenerator::claimPatterns() as $pattern) {
            if (preg_match($pattern, $text) === 1) {
                return true;
            }
        }

        return false;
    }

    public function hasDosage(string $text): bool
    {
        foreach (ProductContentGenerator::dosagePatterns() as $pattern) {
            if (preg_match($pattern, $text) === 1) {
                return true;
            }
        }

        return false;
    }
}
