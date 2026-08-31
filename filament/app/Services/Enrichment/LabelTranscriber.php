<?php

namespace App\Services\Enrichment;

use App\Support\Figures;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Read a Supplement Facts table off a fetched page, using a model, WITHOUT letting the model invent
 * a single number.
 *
 * ── WHY A MODEL AT ALL, HAVING SPENT THIS LONG KEEPING THEM AWAY FROM NUTRITION ───────────
 * Measured across roughly a dozen real manufacturer and retailer pages for products this shop
 * sells: exactly ONE published its amounts as machine-readable structured data. The rest print the
 * panel as an HTML table with merged cells, or as a `<div>` grid, or — most often — as a
 * photograph. StructuredDataExtractor, which is deterministic and already built, reads almost
 * nothing from them.
 *
 * So the choice is not "model or parser". It is "model, or 309 tables nobody ever transcribes".
 *
 * ── THE RULE THAT MAKES IT SAFE ───────────────────────────────────────────────────────────
 * The model TRANSCRIBES; it never estimates. And that claim is checked rather than trusted: every
 * figure it returns must appear literally in the text of the page it was given. "24 g of protein"
 * is only accepted if the page contains a 24 next to that unit. A hallucinated 27, a rounded 24.5,
 * a per-100 g figure derived from a per-serving panel — none of them survive, because none of them
 * are printed on the page.
 *
 * That check is a string search, not a judgement, which is the whole point. It is the same class of
 * check that caught a researcher silently converting a 200 g panel to per-100 g: the numbers were
 * plausible, internally consistent, and absent from the source.
 *
 * Everything that gets past here still faces ResearchValidator, and still lands as a `pending`
 * observation for a human. This class widens what CAN be collected; it does not widen what is
 * trusted.
 */
class LabelTranscriber
{
    private const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

    /**
     * How much page text the model sees.
     *
     * Nutrition panels sit late in the document on most retail pages, after the marketing copy, so
     * truncating from the front would cut off the very thing we came for. The extractor below keeps
     * the region AROUND the table instead of the head of the page.
     */
    private const MAX_CHARS = 24000;

    public function enabled(): bool
    {
        return filled(config('services.ai.groq_key'));
    }

    /**
     * @param  string  $html  the fetched page, as fetched
     * @return array<string, mixed>|null a nutrition block in the shape ResearchValidator expects
     */
    public function transcribe(string $html, string $sourceUrl, string $productName): ?array
    {
        if (! $this->enabled()) {
            return null;
        }

        $text = $this->readableText($html);
        if ($text === '' || ! $this->looksLikeALabel($text)) {
            // No point spending a request on a page that plainly has no panel on it.
            return null;
        }

        $raw = $this->ask($text, $productName);
        if ($raw === null) {
            return null;
        }

        $verified = $this->keepOnlyWhatThePageSays($raw, $text);
        if ($verified === null) {
            return null;
        }

        $verified['source_url'] = $sourceUrl;

        return $verified;
    }

    /**
     * Drop every row whose amount is not printed on the page.
     *
     * This is the anti-fabrication gate, and it is deliberately dumb: a number either appears in the
     * source text next to its unit or it does not. No tolerance, no rounding, no "close enough".
     *
     * A row whose name is present but whose amount is not becomes an `undeclared` row rather than
     * being deleted — the ingredient IS in the product, and saying so while admitting we could not
     * read the quantity is more honest than pretending the row does not exist.
     *
     * @param  array<string, mixed>  $raw
     * @return array<string, mixed>|null
     */
    private function keepOnlyWhatThePageSays(array $raw, string $text): ?array
    {
        // Figures::in canonicalises units, so "2.27 kg" in the answer matches "2270 g" on the page
        // and "24g" matches "24 g". Exact SI scaling only; no conversions that need a constant.
        $onPage = array_flip(Figures::in($text));

        $rows = [];
        $dropped = 0;

        foreach ((array) ($raw['rows'] ?? []) as $row) {
            $name = trim((string) ($row['name'] ?? ''));
            if ($name === '') {
                continue;
            }

            // The nutrient's own name must be on the page too. A model asked for a Supplement Facts
            // panel will happily produce the nutrients such a product USUALLY has.
            if (mb_stripos($text, $name) === false) {
                $dropped++;

                continue;
            }

            $quantity = $row['quantity'] ?? null;
            $unit = trim((string) ($row['unit'] ?? ''));
            $printed = is_numeric($quantity)
                && $unit !== ''
                && Figures::ungrounded($quantity.' '.$unit, array_keys($onPage)) === [];

            $rows[] = [
                'name' => $name,
                'kind' => $printed ? 'value' : 'undeclared',
                'quantity' => $printed ? $quantity + 0 : null,
                'unit' => $printed ? $unit : '',
                'percent_dv' => is_numeric($row['percent_dv'] ?? null)
                    && Figures::ungrounded($row['percent_dv'].' %', array_keys($onPage)) === []
                        ? $row['percent_dv'] + 0
                        : null,
                'depth' => max(0, min(2, (int) ($row['depth'] ?? 0))),
            ];

            if (! $printed) {
                $dropped++;
            }
        }

        $withAmounts = count(array_filter($rows, static fn (array $r): bool => $r['kind'] === 'value'));

        // A panel where nothing could be confirmed is not a panel. Publishing a table of blanks
        // would look like data and carry none.
        if ($withAmounts === 0) {
            Log::info('[LabelTranscriber] nothing confirmable on the page', ['rows' => count($rows)]);

            return null;
        }

        if ($dropped > 0) {
            Log::info('[LabelTranscriber] figures not found in source text', ['dropped' => $dropped]);
        }

        $serving = $raw['serving_quantity'] ?? null;
        $servingUnit = trim((string) ($raw['serving_unit'] ?? ''));
        $servingOk = is_numeric($serving) && $servingUnit !== ''
            && Figures::ungrounded($serving.' '.$servingUnit, array_keys($onPage)) === [];

        return [
            'rows' => $rows,
            'serving_quantity' => $servingOk ? $serving + 0 : null,
            'serving_unit' => $servingOk ? $servingUnit : '',
            'serving_note' => $this->quotedIfPresent($raw['serving_note'] ?? '', $text),
            'servings_per_container' => $this->quotedIfPresent($raw['servings_per_container'] ?? '', $text),
            'net_quantity' => null,
            'net_unit' => '',
            // "NRV", "AR" and "apport de référence" are the EU vocabulary; "Daily Value" is American.
            // Guessing this wrong prints a correct number under the wrong regulatory name.
            'percent_basis' => preg_match('~\b(daily value|%\s*dv)\b~i', $text) === 1 ? 'us' : 'eu',
            'other_ingredients' => $this->quotedIfPresent($raw['other_ingredients'] ?? '', $text),
            'allergens' => $this->quotedIfPresent($raw['allergens'] ?? '', $text),
            'warnings' => $this->quotedIfPresent($raw['warnings'] ?? '', $text),
            'claims' => '',
        ];
    }

    /**
     * Free text is kept only when it is a quotation, not a paraphrase.
     *
     * An allergen statement that has been reworded is a different statement. Comparing the first
     * few words against the page is a cheap way to tell "copied" from "summarised".
     */
    private function quotedIfPresent(mixed $value, string $text): string
    {
        $value = trim((string) $value);
        if ($value === '') {
            return '';
        }

        $probe = mb_substr($value, 0, 40);

        return mb_stripos($text, $probe) !== false ? $value : '';
    }

    /** Cheap gate before spending a request: does this page mention a panel at all? */
    private function looksLikeALabel(string $text): bool
    {
        return preg_match(
            '~\b(supplement facts|nutrition facts|nutritional information|valeurs? nutritionnelles?|'
            .'informations? nutritionnelles?|per serving|par portion|serving size|protein|prot[ée]ines?)\b~i',
            $text
        ) === 1;
    }

    /**
     * Page text, centred on the panel.
     *
     * Nutrition tables sit after the marketing copy on most retail pages, so a head-of-document
     * truncation throws away exactly what we came for. This finds the first mention of a panel and
     * keeps the window around it.
     */
    private function readableText(string $html): string
    {
        $text = preg_replace('~<(script|style|noscript)[^>]*>.*?</\1>~is', ' ', $html) ?? $html;
        // Cell and row boundaries become separators, so "24" and "g" do not fuse into "24g" across
        // a </td><td> and break the figure match.
        $text = preg_replace('~</(td|th|tr|li|p|div|h[1-6])>~i', ' | ', $text) ?? $text;
        $text = html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = trim(preg_replace('~[ \t\x{00A0}]+~u', ' ', preg_replace('~\s*\n\s*~', "\n", $text) ?? '') ?? '');

        if (mb_strlen($text) <= self::MAX_CHARS) {
            return $text;
        }

        if (preg_match('~(supplement facts|nutrition facts|valeurs? nutritionnelles?|informations? nutritionnelles?)~i', $text, $m, PREG_OFFSET_CAPTURE) === 1) {
            $at = mb_strlen(substr($text, 0, $m[0][1]));
            $from = max(0, $at - 2000);

            return mb_substr($text, $from, self::MAX_CHARS);
        }

        return mb_substr($text, 0, self::MAX_CHARS);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function ask(string $text, string $productName): ?array
    {
        $prompt = <<<PROMPT
        Tu transcris un tableau nutritionnel depuis le texte d'une page web. Tu ne l'interprètes pas.

        PRODUIT RECHERCHÉ : {$productName}

        RÈGLES ABSOLUES — ce sont des compléments alimentaires, des clients se dosent avec ces chiffres :
        1. Ne calcule RIEN. Pas de conversion d'unité, pas de somme, pas de "pour 100 g" déduit d'une portion.
        2. Chaque chiffre que tu renvoies doit être ÉCRIT TEL QUEL dans le texte ci-dessous. Si tu ne le
           vois pas écrit, ne le renvoie pas.
        3. Si le texte décrit un AUTRE format que "{$productName}", renvoie {"rows": []}. Un pot de 900 g
           et un pot de 2,27 kg n'ont pas le même tableau.
        4. Recopie les noms des nutriments exactement comme ils sont écrits (anglais ou français).
        5. Les textes libres (ingrédients, allergènes, précautions) sont copiés MOT POUR MOT ou omis.
           Ne reformule jamais une mention d'allergène.
        6. depth = 1 pour une sous-ligne ("dont sucres", "of which saturates").

        Réponds UNIQUEMENT en JSON :
        {"rows":[{"name":"","quantity":null,"unit":"","percent_dv":null,"depth":0}],
         "serving_quantity":null,"serving_unit":"","serving_note":"","servings_per_container":"",
         "other_ingredients":"","allergens":"","warnings":""}

        TEXTE DE LA PAGE :
        {$text}
        PROMPT;

        try {
            $response = Http::withToken((string) config('services.ai.groq_key'))
                ->timeout(90)
                ->retry(2, 1500, throw: false)
                ->post(self::ENDPOINT, [
                    'model' => (string) config('services.ai.groq_model', 'llama-3.3-70b-versatile'),
                    'temperature' => 0,   // transcription, not writing
                    'response_format' => ['type' => 'json_object'],
                    'messages' => [
                        ['role' => 'system', 'content' => 'Tu transcris des étiquettes. Tu ne calcules jamais et tu n\'inventes jamais un chiffre.'],
                        ['role' => 'user', 'content' => $prompt],
                    ],
                ]);

            if (! $response->successful()) {
                Log::warning('[LabelTranscriber] request failed', ['status' => $response->status()]);

                return null;
            }

            $json = json_decode((string) $response->json('choices.0.message.content'), true);

            return is_array($json) ? $json : null;
        } catch (\Throwable $e) {
            Log::warning('[LabelTranscriber] threw', ['error' => $e->getMessage()]);

            return null;
        }
    }
}
