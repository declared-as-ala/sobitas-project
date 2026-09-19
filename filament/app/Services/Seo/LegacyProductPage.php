<?php

namespace App\Services\Seo;

use App\Services\Catalog\ImportedProductContent;

/**
 * How many words the crawler page of a LEGACY (hand-built, never imported) product carries.
 *
 * ── ONE DEFINITION, SHARED WITH THE AUDIT ─────────────────────────────────────────────────────
 * frontend/scripts/audit-pdp-content.mjs measures the crawler render of a product page as
 * description + "Valeurs nutritionnelles" + "Questions fréquentes", tags turned into whitespace,
 * tokens of more than one character counted. CrawlerProductView builds those three sections from
 * `description_fr` (falling back to `description_cover`), `nutrition_values` and the `faq` pairs.
 * This class measures the same columns the same way, so the gate a command applies with it and
 * the number the audit reports for the shipped page are the same number.
 *
 * ── WHY NOT ImportedSourceContent::renderedWordCount() ────────────────────────────────────────
 * That is the imported product's measurement: description_fr plus the staging row's transcribed
 * sections. A legacy product has no staging row, and its hand-written body is block-heavy HTML —
 * headings, lists, `<br>` runs. ImportedProductContent::countWords() strips tags without inserting
 * a space, so `</li><li>` and `</h3><p>` fuse the words on either side into one token. On the 95
 * legacy products measured 19/09/2026 that under-counted by 10–20 words each, and moved eight
 * products from "clears 250" to "does not". The tokenizer is reused unchanged; the only addition
 * is the tag-to-whitespace step a browser (and the audit) performs first.
 *
 * Pure: no models, no facades, no database — so tests/catalog/legacy-product-page-check.php can
 * require it and assert the cases above by name, without vendor/.
 */
final class LegacyProductPage
{
    /**
     * @param  mixed  $faq  the `faq` column as the model casts it (array of {q|question, a|answer}),
     *                      or anything else, which counts as no FAQ
     */
    public static function bodyWords(?string $descriptionFr, ?string $descriptionCover, ?string $nutritionValues, mixed $faq): int
    {
        // Same precedence as CrawlerProductView: the cover text is shown only when the description
        // is empty, never in addition to it.
        $description = trim((string) $descriptionFr) !== '' ? (string) $descriptionFr : (string) $descriptionCover;

        $words = self::renderedWords($description) + self::renderedWords((string) $nutritionValues);

        if (is_array($faq)) {
            foreach ($faq as $entry) {
                if (! is_array($entry)) {
                    continue;
                }
                $q = trim((string) ($entry['q'] ?? $entry['question'] ?? ''));
                $a = trim((string) ($entry['a'] ?? $entry['answer'] ?? ''));
                // The view drops a pair with either side empty, so it is not on the page.
                if ($q !== '' && $a !== '') {
                    $words += self::renderedWords($q) + self::renderedWords($a);
                }
            }
        }

        return $words;
    }

    /**
     * Words in one HTML fragment as rendered: every tag becomes whitespace, then the repo's own
     * token rule (ImportedProductContent::countWords) applies.
     */
    public static function renderedWords(?string $html): int
    {
        $html = (string) $html;
        $spaced = preg_replace('~<[^>]+>~', ' ', $html) ?? $html;

        return ImportedProductContent::countWords($spaced);
    }
}
