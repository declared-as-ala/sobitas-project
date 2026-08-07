<?php

namespace App\Services\Enrichment;

use App\Support\Gtin;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * NIH Dietary Supplement Label Database — transcribed Supplement Facts panels.
 *
 * ── WHY THIS SOURCE ───────────────────────────────────────────────────────────────────────
 * Every product on this site is a supplement, and `nutrition_values` is empty on all 309. DSLD is a
 * US-government database of the actual printed label: serving size, every ingredient row with its
 * amount and %DV, other ingredients, net contents. It is free, needs no key, and — decisively — it
 * is transcription rather than estimation. Nothing here is generated; an LLM is not permitted
 * anywhere near a Supplement Facts panel.
 *
 * ── THE MATCHING PROBLEM, WHICH IS THE WHOLE PROBLEM ──────────────────────────────────────
 * DSLD's search does not index the barcode: querying "748927027211" returns nothing, while the same
 * digits spaced as "7 48927 02721 1" match unrelated products on the "7". So the barcode cannot be
 * the query. It can only be the VERIFICATION.
 *
 * The sequence is therefore: search by brand and name, fetch each candidate label, then compare its
 * `upcSku` against our GTIN. A match on the barcode is an identification. A match on the name is a
 * guess — and a dangerous one here, because "Gold Standard 100% Whey" exists in US and EU
 * formulations, in several flavours, across formula revisions, and their panels differ. Publishing
 * the wrong one puts numbers on the page that are on no tub the customer can buy from us.
 *
 * So a name-only match is recorded at low confidence, is never written into nutrition_values, and
 * exists to give a human a candidate to confirm.
 *
 * ── A USEFUL SIDE EFFECT ──────────────────────────────────────────────────────────────────
 * DSLD publishes `upcSku`, and it validates as a GTIN. For a US-brand product with no barcode yet,
 * a name search yields a CANDIDATE barcode that someone can check against the physical tub in
 * seconds — far quicker than reading digits off a label. It is proposed, never written silently.
 *
 * ── STALENESS ────────────────────────────────────────────────────────────────────────────
 * Labels carry an `entryDate` and an `offMarket` flag. A 2014 record for a reformulated product is
 * worse than no record, so on-market labels are requested by default and the date travels with
 * every observation rather than being dropped.
 */
class DsldClient
{
    private const BASE = 'https://api.ods.od.nih.gov/dsld/v9';

    /**
     * DSLD publishes no rate limit. The source report's instruction for that case is conservative
     * throttling, so requests are spaced rather than parallelised — we are a guest on a public
     * government service and there is no deadline here worth being rude for.
     */
    private const MIN_INTERVAL_MICROSECONDS = 500_000;

    public const SOURCE_ID = 'dsld';

    public const SOURCE_TYPE = 'government';

    public const LICENSE_ID = 'US-Gov-PD';

    public const ATTRIBUTION = 'NIH Office of Dietary Supplements — Dietary Supplement Label Database (DSLD)';

    private float $lastRequestAt = 0;

    /**
     * Candidate labels for a product, best first.
     *
     * @return list<array<string, mixed>> raw search hits; call label() for the panel itself
     */
    public function search(string $query, int $size = 5, bool $onMarketOnly = true): array
    {
        $params = ['q' => $query, 'size' => $size];
        if ($onMarketOnly) {
            // status=1 restricts to labels currently on the market. Without it the top hits are
            // frequently decade-old records for formulas that no longer exist.
            $params['status'] = 1;
        }

        $body = $this->get('/search-filter', $params);

        return is_array($body['hits'] ?? null) ? $body['hits'] : [];
    }

    /**
     * A full label record, normalised into the shape the rest of the pipeline speaks.
     *
     * @return array<string, mixed>|null
     */
    public function label(int|string $dsldId): ?array
    {
        $raw = $this->get('/label/'.$dsldId);
        if (! is_array($raw) || ! isset($raw['id'])) {
            return null;
        }

        return $this->normalizeLabel($raw);
    }

    /**
     * Find the label for a product and say how certain the identification is.
     *
     * @param  string|null  $gtin  our barcode, when we have one — the only deterministic check
     * @return array{label: array<string, mixed>, match_method: string, confidence: float}|null
     */
    public function findFor(string $brand, string $productName, ?string $gtin = null): ?array
    {
        $query = trim($brand.' '.$productName);
        if ($query === '') {
            return null;
        }

        $hits = $this->search($query, 8);
        if ($hits === []) {
            return null;
        }

        $firstNameMatch = null;

        foreach ($hits as $hit) {
            $id = $hit['_id'] ?? null;
            if ($id === null) {
                continue;
            }

            $label = $this->label($id);
            if ($label === null) {
                continue;
            }

            // The identification. Everything else in this method is a fallback.
            if ($gtin !== null && Gtin::sameItem($gtin, $label['upc'])) {
                return [
                    'label' => $label,
                    'match_method' => 'gtin',
                    'confidence' => 0.95,
                ];
            }

            $firstNameMatch ??= $label;
        }

        if ($firstNameMatch === null) {
            return null;
        }

        // A name match is a candidate for a human, not an identification. It is returned so the
        // reviewer has something to look at — and so its upc can be proposed as a barcode — but the
        // confidence keeps it out of anything that publishes.
        return [
            'label' => $firstNameMatch,
            'match_method' => 'brand_name',
            'confidence' => 0.60,
        ];
    }

    /**
     * @param  array<string, mixed>  $raw
     * @return array<string, mixed>
     */
    private function normalizeLabel(array $raw): array
    {
        return [
            'dsld_id' => (string) $raw['id'],
            'full_name' => (string) ($raw['fullName'] ?? ''),
            'brand_name' => (string) ($raw['brandName'] ?? ''),
            // DSLD prints the barcode with the human-readable spacing from the pack
            // ("7 48927 02721 1"); Gtin::normalize strips it back to digits.
            'upc' => Gtin::normalize((string) ($raw['upcSku'] ?? '')),
            'off_market' => (bool) ($raw['offMarket'] ?? false),
            'entry_date' => $this->date($raw['entryDate'] ?? null),
            'net_contents' => $this->netContents($raw['netContents'] ?? []),
            'serving_sizes' => $this->servingSizes($raw['servingSizes'] ?? []),
            'nutrients' => $this->rows($raw['ingredientRows'] ?? []),
            'other_ingredients' => $this->otherIngredients($raw['otheringredients'] ?? null),
            /**
             * Allergens and warnings, kept apart from marketing prose. These are the statements a
             * customer has a real reason to read, and the ones we must never paraphrase — they are
             * reproduced verbatim or omitted, never reworded.
             *
             * ONLY "Precautions re: Allergies" is an allergen statement. "Formulation re: Does NOT
             * Contain" reads like one and is not: on Serious Mass it holds "254 Grams of
             * Carbohydrates to Support Fueling of Intense Workouts… with No Added Sugar", which
             * under an allergen heading would be actively misleading. It is captured separately
             * below as what it is — an unverified manufacturer claim.
             */
            'allergen_statements' => $this->statements($raw['statements'] ?? [], ['Precautions re: Allergies']),
            // "Gluten free", "banned substance free". Regulated free-from claims that we have not
            // verified and do not publish automatically; a human decides whether we repeat them.
            'manufacturer_claims' => $this->statements($raw['statements'] ?? [], ['Formulation re: Does NOT Contain']),
            'warning_statements' => $this->statements($raw['statements'] ?? [], [
                'Precautions re: All Other',
                'Precautions re: Children',
                'Precautions re: Pregnant or Nursing or Prescription Medications',
            ]),
            'servings_per_container' => $raw['servingsPerContainer'] ?? null,
            'source_url' => 'https://dsld.od.nih.gov/label/'.$raw['id'],
        ];
    }

    /**
     * "Autres ingrédients" — the non-active list (binders, flavourings, capsule shell).
     *
     * DSLD returns `{text: null, ingredients: [{name, category, …}]}`, not a string. Reading it as
     * one yields the literal word "Array", which is the sort of thing that reaches a product page
     * and stays there. Label order is preserved: on an ingredient list, order is information —
     * it means descending quantity.
     *
     * @return list<string>
     */
    private function otherIngredients(mixed $raw): array
    {
        if (is_string($raw)) {
            return array_values(array_filter(array_map('trim', explode(',', $raw))));
        }

        if (! is_array($raw)) {
            return [];
        }

        if (is_string($raw['text'] ?? null) && trim($raw['text']) !== '') {
            return array_values(array_filter(array_map('trim', explode(',', $raw['text']))));
        }

        $ingredients = $raw['ingredients'] ?? [];

        return array_values(array_filter(array_map(
            static fn ($i): string => is_array($i) ? trim((string) ($i['name'] ?? '')) : trim((string) $i),
            is_array($ingredients) ? $ingredients : []
        )));
    }

    /**
     * @param  list<array<string, mixed>>  $statements
     * @param  list<string>  $types
     * @return list<string>
     */
    private function statements(array $statements, array $types): array
    {
        $out = [];

        foreach ($statements as $statement) {
            if (! in_array((string) ($statement['type'] ?? ''), $types, true)) {
                continue;
            }
            $notes = trim((string) ($statement['notes'] ?? ''));
            if ($notes !== '') {
                $out[] = $notes;
            }
        }

        return array_values(array_unique($out));
    }

    /**
     * Flatten the label's nested rows while keeping the nesting visible.
     *
     * A Supplement Facts panel indents sub-rows for a reason — "dont acides gras saturés" is a
     * component of total fat, not another line item beside it. Losing the depth would turn the
     * panel into a list that reads as if the amounts sum.
     *
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    private function rows(array $rows, int $depth = 0): array
    {
        $out = [];

        foreach ($rows as $row) {
            $quantity = $row['quantity'][0] ?? null;

            $out[] = [
                'name' => trim((string) ($row['name'] ?? '')),
                'category' => (string) ($row['category'] ?? ''),
                'group' => (string) ($row['ingredientGroup'] ?? ''),
                'depth' => $depth,
                // Never invented and never converted: transcribed as printed, with its unit.
                'quantity' => $this->quantity($quantity['quantity'] ?? null, (string) ($quantity['unit'] ?? '')),
                'unit' => $this->unit((string) ($quantity['unit'] ?? '')),
                // A disclosed-blend row with no amount is meaningful — say so rather than showing
                // a blank cell that reads as missing data.
                'undisclosed' => ($quantity['unit'] ?? '') === 'NP',
                'operator' => (string) ($quantity['operator'] ?? '='),
                'serving_quantity' => $quantity['servingSizeQuantity'] ?? null,
                'serving_unit' => $this->unit((string) ($quantity['servingSizeUnit'] ?? '')),
                'percent_dv' => $quantity['dailyValueTargetGroup'][0]['percent'] ?? null,
            ];

            if (is_array($row['nestedRows'] ?? null) && $row['nestedRows'] !== []) {
                $out = array_merge($out, $this->rows($row['nestedRows'], $depth + 1));
            }
        }

        return $out;
    }

    /**
     * DSLD's unit vocabulary is verbose ("Gram(s)") and inconsistent — the search endpoint returns
     * "{Calories}" where the label endpoint returns "Calorie(s)", and some units ("mg", "mcg", "IU")
     * arrive already short. Both spellings are mapped; the panel a customer reads is not written
     * in either.
     *
     * "NP" is DSLD's marker for an amount the manufacturer did not disclose — a proprietary blend.
     * It is not a unit and must never be printed as one. The row still matters (the ingredient IS
     * in the product), so it is kept with an empty unit and a null quantity.
     */
    private function unit(string $unit): string
    {
        return match ($unit) {
            'Gram(s)', 'g' => 'g',
            'Milligram(s)', 'mg' => 'mg',
            'Microgram(s)', 'mcg', 'µg' => 'µg',
            'Milliliter(s)', 'ml' => 'ml',
            'Liter(s)', 'l' => 'l',
            'International Unit(s)', 'IU' => 'UI',
            '{Calories}', 'Calorie(s)', 'kcal' => 'kcal',
            'Pound(s)', 'lb' => 'lb',
            'Kilogram(s)', 'kg' => 'kg',
            'Ounce(s)', 'oz' => 'oz',
            'Pack(s)' => 'sachet(s)',
            'Capsule(s)' => 'gélule(s)',
            'Tablet(s)' => 'comprimé(s)',
            'Softgel(s)' => 'capsule(s) molle(s)',
            'Serving(s)' => 'portion(s)',
            'Scoop(s)' => 'dose(s)',
            'NP', '' => '',
            default => $unit,
        };
    }

    /** Proprietary-blend rows carry no disclosed amount; "NP" is that marker, not a quantity. */
    private function quantity(mixed $value, string $rawUnit): int|float|null
    {
        return $rawUnit === 'NP' || ! is_numeric($value) ? null : $value + 0;
    }

    /**
     * @param  list<array<string, mixed>>  $contents
     * @return list<array{quantity: mixed, unit: string, display: string}>
     */
    private function netContents(array $contents): array
    {
        return array_values(array_map(function (array $c): array {
            $unit = $this->unit((string) ($c['unit'] ?? ''));
            $quantity = $c['quantity'] ?? null;

            return [
                'quantity' => $quantity,
                'unit' => $unit,
                // Rendered from the humanised unit rather than reusing DSLD's `display`, which is
                // its own American rendering ("4.8 Pound(s)"). The upstream string is kept beside
                // it so provenance still shows exactly what the source said.
                'display' => $quantity !== null && $unit !== '' ? trim($quantity.' '.$unit) : (string) ($c['display'] ?? ''),
                'source_display' => (string) ($c['display'] ?? ''),
            ];
        }, $contents));
    }

    /**
     * @param  list<array<string, mixed>>  $sizes
     * @return list<array<string, mixed>>
     */
    private function servingSizes(array $sizes): array
    {
        return array_values(array_map(fn (array $s): array => [
            'min_quantity' => $s['minQuantity'] ?? null,
            'max_quantity' => $s['maxQuantity'] ?? null,
            'unit' => $this->unit((string) ($s['unit'] ?? '')),
            // "1 rounded scoop" — the household measure, which is what a customer actually uses.
            'notes' => trim((string) ($s['notes'] ?? '')),
            'min_daily_servings' => $s['minDailyServings'] ?? null,
            'max_daily_servings' => $s['maxDailyServings'] ?? null,
        ], $sizes));
    }

    private function date(mixed $value): ?string
    {
        $value = trim((string) $value);

        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) ? $value : null;
    }

    /**
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>|null
     */
    private function get(string $path, array $params = []): ?array
    {
        $this->throttle();

        try {
            $response = Http::withHeaders([
                // Identify ourselves. A public service should be able to see who is calling and
                // reach us if we become a problem.
                'User-Agent' => 'protein-tn-enrichment/1.0 (+https://protein.tn)',
                'Accept' => 'application/json',
            ])->connectTimeout(5)->timeout(20)->retry(2, 1000, throw: false)
                ->get(self::BASE.$path, $params);

            if (! $response->successful()) {
                Log::warning('[DsldClient] request failed', [
                    'path' => $path,
                    'status' => $response->status(),
                ]);

                return null;
            }

            $json = $response->json();

            return is_array($json) ? $json : null;
        } catch (\Throwable $e) {
            Log::warning('[DsldClient] request threw', ['path' => $path, 'error' => $e->getMessage()]);

            return null;
        }
    }

    private function throttle(): void
    {
        $elapsed = (microtime(true) - $this->lastRequestAt) * 1_000_000;
        if ($this->lastRequestAt > 0 && $elapsed < self::MIN_INTERVAL_MICROSECONDS) {
            usleep((int) (self::MIN_INTERVAL_MICROSECONDS - $elapsed));
        }

        $this->lastRequestAt = microtime(true);
    }
}
