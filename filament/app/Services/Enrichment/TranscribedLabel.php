<?php

namespace App\Services\Enrichment;

use Illuminate\Support\Carbon;

/**
 * Turn a panel typed by a human — reading the tub in their hand — into the same shape DSLD produces,
 * so NutritionPanelBuilder renders both identically.
 *
 * ── WHY THIS IS THE MAIN PATH, NOT THE FALLBACK ───────────────────────────────────────────
 * Measured on 2026-08-07 against the 12 protein.tn products that carry a valid barcode: the NIH
 * label database matched ZERO of them — it transcribes US labels and this catalogue is Polish,
 * Spanish and Portuguese — and Open Food Facts knew two. Across 60 live product pages, 3% carried
 * any nutrition content and 0% carried allergens or a FAQ.
 *
 * There is no external database that covers this catalogue. There is, however, the physical product,
 * and somebody is already handling all 309 of them to scan barcodes. A person reading a label is not
 * a degraded source here — for these brands it is the ONLY complete one, and it is the same evidence
 * DSLD's own transcribers work from.
 *
 * ── WHAT THIS CLASS REFUSES TO DO ─────────────────────────────────────────────────────────
 * Nothing here computes. It does not sum a column, convert a unit, infer a missing %DV or guess a
 * serving count from a net weight. It reads what was typed and hands it on. Every guard in
 * NutritionPanelBuilder — the two undisclosed markers, the American-%DV footnote, the curated French
 * nutrient names, full escaping — applies to this input unchanged, because it is the same input
 * shape travelling through the same code.
 */
class TranscribedLabel
{
    /**
     * The label shape, built from the `nutrition_facts` JSON column.
     *
     * @param  array<string, mixed>  $facts  as stored by the Filament form
     * @return array<string, mixed>|null null when there is nothing worth rendering
     */
    public static function fromStored(array $facts, ?string $transcribedAt = null): ?array
    {
        $rows = self::rows($facts['rows'] ?? []);

        // An empty table with a stray allergen note is not a panel. Rendering the shell would put a
        // "Valeurs nutritionnelles" heading over nothing, which reads worse than no section at all.
        if ($rows === []) {
            return null;
        }

        return [
            'nutrients' => $rows,
            'serving_sizes' => self::servingSizes($facts),
            'servings_per_container' => self::text($facts['servings_per_container'] ?? null),
            'net_contents' => self::netContents($facts),
            'other_ingredients' => self::list($facts['other_ingredients'] ?? null),
            'allergen_statements' => self::list($facts['allergens'] ?? null),
            'warning_statements' => self::list($facts['warnings'] ?? null),
            'manufacturer_claims' => self::list($facts['claims'] ?? null),
            // Typed in Sousse, in French. Marking it lang="en" — correct for a US DSLD record —
            // would tell every screen reader to pronounce French allergen text as English.
            'statement_lang' => null,
            /**
             * European reference intakes by default, because that is what is printed on a tub sold
             * in the EU. A US-market product does occur (some brands ship American packaging), so
             * the person transcribing can say so — but the default matches the common case rather
             * than inheriting DSLD's American assumption by accident.
             */
            'percent_basis' => ($facts['percent_basis'] ?? 'eu') === 'us' ? 'us' : 'eu',
            'source' => [
                'name' => "Étiquette du produit, transcrite par l'équipe Protein.tn",
                'reference' => self::text($facts['label_reference'] ?? null),
                'reference_label' => 'lot/référence',
                'date' => self::date($facts['transcribed_at'] ?? $transcribedAt),
                'url' => '',
            ],
        ];
    }

    /**
     * Rows, in the order they were entered.
     *
     * Order is preserved because a Supplement Facts panel is ordered — and `depth` is preserved
     * because a sub-row is a component of the row above, not a line item beside it. A form that let
     * someone reorder rows alphabetically would quietly destroy both.
     *
     * @param  mixed  $rows
     * @return list<array<string, mixed>>
     */
    private static function rows(mixed $rows): array
    {
        if (! is_array($rows)) {
            return [];
        }

        $out = [];

        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }

            $name = trim((string) ($row['name'] ?? ''));
            if ($name === '') {
                continue;
            }

            $kind = (string) ($row['kind'] ?? 'value');
            $quantity = $row['quantity'] ?? null;

            $out[] = [
                'name' => $name,
                'category' => $kind === 'blend' ? 'blend' : '',
                'group' => '',
                'depth' => max(0, min(4, (int) ($row['depth'] ?? 0))),
                // `undisclosed` covers both "proprietary blend" and "percentage only", and `blend`
                // separates them — the same distinction DSLD's category makes, surfaced to the
                // person typing as a three-way choice instead of a silent inference.
                'quantity' => $kind === 'value' && is_numeric($quantity) ? $quantity + 0 : null,
                'unit' => $kind === 'value' ? trim((string) ($row['unit'] ?? '')) : '',
                'undisclosed' => $kind !== 'value',
                'blend' => $kind === 'blend',
                'operator' => '=',
                'serving_quantity' => null,
                'serving_unit' => '',
                'percent_dv' => is_numeric($row['percent_dv'] ?? null) ? $row['percent_dv'] + 0 : null,
            ];
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $facts
     * @return list<array<string, mixed>>
     */
    private static function servingSizes(array $facts): array
    {
        $quantity = $facts['serving_quantity'] ?? null;
        $notes = self::text($facts['serving_note'] ?? null);

        if (! is_numeric($quantity) && $notes === '') {
            return [];
        }

        return [[
            'min_quantity' => is_numeric($quantity) ? $quantity + 0 : null,
            'max_quantity' => null,
            'unit' => trim((string) ($facts['serving_unit'] ?? '')),
            'notes' => $notes,
            'min_daily_servings' => null,
            'max_daily_servings' => null,
        ]];
    }

    /**
     * @param  array<string, mixed>  $facts
     * @return list<array<string, mixed>>
     */
    private static function netContents(array $facts): array
    {
        $quantity = $facts['net_quantity'] ?? null;
        $unit = trim((string) ($facts['net_unit'] ?? ''));

        if (! is_numeric($quantity) || $unit === '') {
            return [];
        }

        return [[
            'quantity' => $quantity + 0,
            'unit' => $unit,
            'display' => '',
            'source_display' => '',
        ]];
    }

    /**
     * A textarea, one statement per line.
     *
     * Lines rather than commas: allergen statements contain commas ("Contains milk, soy") and
     * splitting on them would shred a safety sentence into fragments.
     *
     * @return list<string>
     */
    private static function list(mixed $value): array
    {
        if (is_array($value)) {
            return array_values(array_filter(array_map(
                static fn ($v): string => trim((string) $v),
                $value
            )));
        }

        $text = trim((string) $value);
        if ($text === '') {
            return [];
        }

        return array_values(array_filter(array_map('trim', preg_split('/\R/u', $text) ?: [])));
    }

    private static function text(mixed $value): string
    {
        return trim((string) ($value ?? ''));
    }

    private static function date(mixed $value): string
    {
        $text = self::text($value);
        if ($text === '') {
            return Carbon::now()->toDateString();
        }

        return preg_match('/^\d{4}-\d{2}-\d{2}/', $text) === 1
            ? substr($text, 0, 10)
            : Carbon::now()->toDateString();
    }
}
