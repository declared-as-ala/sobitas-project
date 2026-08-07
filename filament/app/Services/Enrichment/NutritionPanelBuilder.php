<?php

namespace App\Services\Enrichment;

use App\Support\Figures;
use App\Support\NutrientNames;

/**
 * Render a transcribed supplement label into the French panel stored in `products.nutrition_values`.
 *
 * ── THIS CLASS DOES NO ARITHMETIC ─────────────────────────────────────────────────────────
 * Every number it prints was printed on a physical label and transcribed by NIH. It never sums a
 * column, never converts a unit, never derives per-100 g from per-portion, and never fills a gap
 * with a plausible value. Those operations all produce a number that appears on no tub anyone can
 * buy — which is the one failure mode that matters here, because customers dose themselves on these
 * figures. A missing cell stays empty.
 *
 * ── %DV IS AMERICAN, AND SAYING OTHERWISE WOULD BE THE LIE ────────────────────────────────
 * DSLD's `percent` is the US FDA Daily Value. It is NOT the European "apport de référence" (AR/VNR),
 * and the two genuinely differ — vitamin D's US DV is 20 µg against the EU's 5 µg, so the same
 * capsule is "100 %" on one label and "400 %" on the other. Printing an American percentage under a
 * French regulatory abbreviation would be a wrong number wearing the right name, so the column is
 * labelled as American and a footnote says so.
 *
 * ── NESTING IS INFORMATION ────────────────────────────────────────────────────────────────
 * A Supplement Facts panel indents sub-rows because they are components of the row above, not
 * further line items. Flattened, the panel reads as though the amounts sum. Depth survives as an
 * inline indent rather than a class, because the crawler view ships no stylesheet of ours and an
 * un-indented panel is a wrong panel.
 *
 * ── SAFETY TEXT IS QUOTED, NEVER TRANSLATED ───────────────────────────────────────────────
 * Allergen and precaution statements are reproduced exactly as the manufacturer wrote them, in
 * English, marked `lang="en"`. Translating "manufactured on equipment that also processes milk" is
 * rewriting a safety statement, and a translation that drifts by one word is the kind of error
 * someone with an allergy finds the hard way. A human reviewer may add a French rendering beside
 * the original; this class will not invent one.
 */
class NutritionPanelBuilder
{
    /** The manufacturer declares the blend's total, not each component's share. */
    private const BLEND_MARK = '†';

    /** The label gives a percentage but no absolute amount — routine on US vitamin rows. */
    private const UNDECLARED_MARK = '‡';

    /**
     * Build the panel.
     *
     * @param  array<string, mixed>  $label  a label normalised by DsldClient::label()
     * @return array{html: string, facts: list<string>, rows: int}|null null when the label carries
     *                                                                 no nutrient rows — an empty
     *                                                                 table is worse than none
     */
    public function build(array $label): ?array
    {
        $rows = array_values(array_filter(
            (array) ($label['nutrients'] ?? []),
            static fn ($row): bool => is_array($row) && trim((string) ($row['name'] ?? '')) !== ''
        ));

        if ($rows === []) {
            return null;
        }

        $facts = [];
        $body = [];
        $usesBlend = false;
        $usesUndeclared = false;
        $usesPercent = false;

        foreach ($rows as $row) {
            $depth = max(0, min(4, (int) ($row['depth'] ?? 0)));
            $amount = $this->amount($row);
            $percent = $this->percent($row['percent_dv'] ?? null);

            if ($amount === self::BLEND_MARK) {
                $usesBlend = true;
            } elseif ($amount === self::UNDECLARED_MARK) {
                $usesUndeclared = true;
            }
            if ($percent !== '') {
                $usesPercent = true;
            }

            // Whatever we print, we also record — the grounding check downstream compares generated
            // prose against exactly the figures on this panel and nothing else.
            foreach ($this->figures($amount) as $figure) {
                $facts[] = $figure;
            }

            // Classes, not inline styles. The frontend sanitiser strips `style` outright — DOMPurify
            // does not parse CSS, so allowing the attribute would let `background:url(javascript:…)`
            // through untouched. `nf-depth-N` is styled in globals.css and renders on both views.
            $body[] = sprintf(
                '<tr class="nf-row nf-depth-%d"><th scope="row">%s</th><td>%s</td><td>%s</td></tr>',
                $depth,
                // Regulated nutrient terms get their settled French name; everything else — every
                // botanical, blend and branded ingredient — keeps the manufacturer's wording.
                e(NutrientNames::display((string) $row['name'])),
                $amount === '' ? '&nbsp;' : e($amount),
                $percent === '' ? '&nbsp;' : e($percent),
            );
        }

        $html = '<div class="supplement-facts">';
        $html .= $this->servingBlock($label, $facts);

        /**
         * WHICH reference system the percentages belong to — and it is not always American.
         *
         * DSLD prints the US FDA Daily Value. A label transcribed off a tub bought here prints the
         * European "apport de référence" from Règlement (UE) 1169/2011. The two genuinely differ
         * (vitamin D: 20 µg in the US, 5 µg in the EU), so labelling an EU percentage as American —
         * or the reverse — puts a correct number under the wrong name, which is the exact failure
         * this class exists to prevent. Hence a property of the SOURCE, never a constant.
         */
        $basis = ($label['percent_basis'] ?? 'us') === 'eu'
            ? ['abbr' => '% AR*', 'note' => '* Pourcentage des apports de référence (AR) pour un adulte-type '
                .'(8&nbsp;400&nbsp;kJ / 2&nbsp;000&nbsp;kcal), selon le règlement (UE) n°&nbsp;1169/2011.']
            : ['abbr' => '% VQ*', 'note' => '* Pourcentage des valeurs quotidiennes (VQ) de référence '
                .'américaines, base 2&nbsp;000&nbsp;kcal. Ces valeurs ne sont pas identiques aux apports '
                .'de référence (AR) européens.'];

        $html .= '<table class="nutrition-table">'
            .'<caption>Valeurs nutritionnelles, par portion</caption>'
            .'<thead><tr>'
            .'<th scope="col">Nutriment</th>'
            .'<th scope="col">Par portion</th>'
            .'<th scope="col">'.($usesPercent ? $basis['abbr'] : '&nbsp;').'</th>'
            .'</tr></thead>'
            .'<tbody>'.implode('', $body).'</tbody>'
            .'</table>';

        if ($usesPercent) {
            $html .= '<p class="nutrition-note"><small>'.$basis['note'].'</small></p>';
        }

        if ($usesBlend) {
            $html .= '<p class="nutrition-note"><small>'.self::BLEND_MARK.' Mélange breveté : le '
                .'fabricant déclare le total du mélange mais pas la quantité de chaque ingrédient '
                .'qui le compose.</small></p>';
        }

        if ($usesUndeclared) {
            $html .= '<p class="nutrition-note"><small>'.self::UNDECLARED_MARK.' Quantité non '
                .'indiquée sur l\'étiquette : le fabricant déclare uniquement le pourcentage.'
                .'</small></p>';
        }

        /**
         * The language of the quoted statements, which is a property of the SOURCE, not of the page.
         *
         * A DSLD record reproduces a US label, so its allergen text is English and must be marked
         * `lang="en"` — that is what tells a screen reader to switch pronunciation and Google not to
         * read it as broken French. A panel someone typed off a tub in Sousse is already French, and
         * marking it English would do the reverse damage on every product we transcribe ourselves.
         */
        $lang = array_key_exists('statement_lang', $label) ? $label['statement_lang'] : 'en';

        $html .= $this->listBlock('Autres ingrédients', (array) ($label['other_ingredients'] ?? []));
        $html .= $this->quoteBlock('Allergènes', (array) ($label['allergen_statements'] ?? []), false, $lang);
        $html .= $this->quoteBlock('Précautions d\'emploi', (array) ($label['warning_statements'] ?? []), false, $lang);
        $html .= $this->quoteBlock('Allégations du fabricant', (array) ($label['manufacturer_claims'] ?? []), true, $lang);

        $html .= $this->sourceBlock($label);
        $html .= '</div>';

        return [
            'html' => $html,
            'facts' => array_values(array_unique($facts)),
            'rows' => count($rows),
        ];
    }

    /**
     * Portion, portions par contenant, contenu net.
     *
     * The manufacturer's own household measure ("1 rounded scoop") is quoted rather than translated:
     * it is what is written on the scoop, and a customer matching the page against the tub needs the
     * same words.
     *
     * @param  array<string, mixed>  $label
     * @param  list<string>  $facts  appended to in place
     */
    private function servingBlock(array $label, array &$facts): string
    {
        $items = [];

        $serving = (array) (($label['serving_sizes'] ?? [])[0] ?? []);
        if ($serving !== []) {
            $size = $this->range($serving['min_quantity'] ?? null, $serving['max_quantity'] ?? null, (string) ($serving['unit'] ?? ''));
            if ($size !== '') {
                $items[] = ['Portion', e($size), null];
                foreach ($this->figures($size) as $figure) {
                    $facts[] = $figure;
                }
            }

            $notes = trim((string) ($serving['notes'] ?? ''));
            if ($notes !== '') {
                $items[] = ['Mesure indiquée par le fabricant', e($notes), 'en'];
                foreach ($this->figures($notes) as $figure) {
                    $facts[] = $figure;
                }
            }
        }

        $perContainer = trim((string) ($label['servings_per_container'] ?? ''));
        if ($perContainer !== '') {
            $items[] = ['Portions par contenant', e($perContainer), null];
        }

        foreach ((array) ($label['net_contents'] ?? []) as $content) {
            // Rendered here rather than reusing the upstream string, so "4.8 lb" reads "4,8 lb" on a
            // French page. The unit itself is NOT converted: 4,8 lb is what the pack says, and a
            // kilogram figure printed nowhere on the tub would be our arithmetic, not the label's.
            $display = is_numeric($content['quantity'] ?? null) && trim((string) ($content['unit'] ?? '')) !== ''
                ? $this->number((float) $content['quantity']).' '.trim((string) $content['unit'])
                : trim((string) ($content['display'] ?? ''));

            if ($display !== '') {
                $items[] = ['Contenu net', e($display), null];
                foreach ($this->figures($display) as $figure) {
                    $facts[] = $figure;
                }
                break;
            }
        }

        if ($items === []) {
            return '';
        }

        $rows = '';
        foreach ($items as [$term, $value, $lang]) {
            $rows .= '<dt>'.e($term).'</dt><dd'.($lang ? ' lang="'.e($lang).'"' : '').'>'.$value.'</dd>';
        }

        return '<dl class="nutrition-serving">'.$rows.'</dl>';
    }

    /**
     * Label order is preserved. On an ingredient list order is information — it means descending
     * quantity, and re-sorting alphabetically would quietly destroy that.
     *
     * @param  list<mixed>  $values
     */
    private function listBlock(string $heading, array $values): string
    {
        $values = array_values(array_filter(array_map(
            static fn ($v): string => trim((string) $v),
            $values
        )));

        if ($values === []) {
            return '';
        }

        return '<h3>'.e($heading).'</h3><p>'.e(implode(', ', $values)).'</p>';
    }

    /**
     * @param  list<mixed>  $statements
     * @param  bool  $unverified  marks manufacturer claims we have not checked, so the page does not
     *                            present "gluten free" as something protein.tn has verified
     * @param  string|null  $lang  language of the quoted text; null when it is already the page's
     */
    private function quoteBlock(string $heading, array $statements, bool $unverified = false, ?string $lang = 'en'): string
    {
        $statements = array_values(array_filter(array_map(
            static fn ($s): string => trim((string) $s),
            $statements
        )));

        if ($statements === []) {
            return '';
        }

        $out = '<h3>'.e($heading).'</h3>';
        if ($unverified) {
            $out .= '<p><small>Déclarations reproduites depuis l\'étiquette du fabricant. '
                .'Protein.tn ne les a pas vérifiées de façon indépendante.</small></p>';
        }

        $attr = $lang === null || $lang === '' ? '' : ' lang="'.e($lang).'"';

        foreach ($statements as $statement) {
            $out .= '<blockquote'.$attr.'><p>'.e($statement).'</p></blockquote>';
        }

        return $out;
    }

    /**
     * Provenance on the page itself, not only in the database.
     *
     * The date matters as much as the source: a 2014 record for a reformulated product is worse than
     * no record, and a customer comparing the page to a tub bought last month deserves to see which
     * label this was.
     *
     * @param  array<string, mixed>  $label
     */
    private function sourceBlock(array $label): string
    {
        // Two provenances are possible and they must not be dressed the same. A DSLD record is a US
        // government transcription anyone can open; a hand-typed panel is our own staff reading the
        // tub. Both are legitimate; claiming the second is the first would not be.
        $source = is_array($label['source'] ?? null) ? $label['source'] : [
            'name' => DsldClient::ATTRIBUTION,
            'reference' => (string) ($label['dsld_id'] ?? ''),
            'date' => (string) ($label['entry_date'] ?? ''),
            'url' => (string) ($label['source_url'] ?? ''),
            'reference_label' => 'étiquette n°',
            'link_label' => "Voir l'étiquette d'origine",
        ];

        $parts = ['Source : '.e((string) ($source['name'] ?? ''))];

        $reference = trim((string) ($source['reference'] ?? ''));
        if ($reference !== '') {
            $parts[] = trim((string) ($source['reference_label'] ?? 'réf.')).' '.e($reference);
        }

        $date = trim((string) ($source['date'] ?? ''));
        if ($date !== '') {
            $parts[] = 'saisie le '.e($this->frenchDate($date));
        }

        $out = '<p class="nutrition-source"><small>'.implode(' — ', $parts).'.';

        $url = trim((string) ($source['url'] ?? ''));
        if ($url !== '' && filter_var($url, FILTER_VALIDATE_URL)) {
            $out .= ' <a href="'.e($url).'" rel="nofollow noopener" target="_blank">'
                .e((string) ($source['link_label'] ?? 'Voir la source')).'</a>.';
        }

        return $out.'</small></p>';
    }

    /** DSLD dates are ISO; a French page reads them the French way. No timezone maths, just order. */
    private function frenchDate(string $iso): string
    {
        return preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $iso, $m) === 1
            ? $m[3].'/'.$m[2].'/'.$m[1]
            : $iso;
    }

    /**
     * The amount cell, exactly as transcribed.
     *
     * A row with no disclosed amount is not a blank — it is a proprietary blend, and the dagger says
     * so. Blank would read as "we failed to fetch this", which is a different and misleading claim.
     *
     * @param  array<string, mixed>  $row
     */
    private function amount(array $row): string
    {
        if (($row['undisclosed'] ?? false) === true) {
            // Two different facts, two different marks. A vitamin whose milligrams the label omits
            // is not a secret formula, and saying so would be a claim about the product we have no
            // basis for.
            return ($row['blend'] ?? false) === true ? self::BLEND_MARK : self::UNDECLARED_MARK;
        }

        $quantity = $row['quantity'] ?? null;
        if (! is_numeric($quantity)) {
            return '';
        }

        $operator = (string) ($row['operator'] ?? '=');
        $prefix = in_array($operator, ['', '='], true) ? '' : $operator.' ';
        $unit = trim((string) ($row['unit'] ?? ''));

        return trim($prefix.$this->number((float) $quantity).($unit === '' ? '' : ' '.$unit));
    }

    private function percent(mixed $value): string
    {
        return is_numeric($value) ? $this->number((float) $value).' %' : '';
    }

    /** "1–2 doses", or "1 dose" when the label gives a single figure. */
    private function range(mixed $min, mixed $max, string $unit): string
    {
        $hasMin = is_numeric($min);
        $hasMax = is_numeric($max);

        if (! $hasMin && ! $hasMax) {
            return '';
        }

        $value = $hasMin && $hasMax && (float) $min !== (float) $max
            ? $this->number((float) $min).'–'.$this->number((float) $max)
            : $this->number((float) ($hasMin ? $min : $max));

        return trim($value.($unit === '' ? '' : ' '.$unit));
    }

    /**
     * French decimals. 24.5 → "24,5"; 373.0 → "373".
     *
     * Trailing zeros go because "24,50 g" implies a precision the label did not claim, but the digits
     * themselves are never rounded away: 0.0125 stays 0,0125 rather than becoming 0,01, which on a
     * microgram row would be a tenfold error.
     */
    private function number(float $value): string
    {
        $formatted = rtrim(rtrim(number_format($value, 6, '.', ''), '0'), '.');
        if ($formatted === '' || $formatted === '-') {
            $formatted = '0';
        }

        return str_replace('.', ',', $formatted);
    }

    /**
     * Every figure this panel vouches for, as canonical tokens.
     *
     * Deliberately delegated rather than reimplemented: the copy validator compares generated prose
     * against exactly this list, and two separate definitions of "what counts as a figure" would
     * eventually let through a number the panel never printed.
     *
     * @return list<string>
     */
    public function figures(string $text): array
    {
        return Figures::in($text);
    }
}
