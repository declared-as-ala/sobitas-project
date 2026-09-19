<?php

/**
 * Standalone check for App\Services\Seo\LegacyProductPage and the command built on it,
 * seo:products-legacy-reindex — no vendor/, no database, no network.
 *
 *     php filament/tests/catalog/legacy-product-page-check.php
 *
 * ── WHAT IS AT STAKE ──────────────────────────────────────────────────────────────────────────
 * This measurement decides whether a hand-built product page is offered to search engines. Erring
 * high submits a thin page; erring low keeps a best seller out of the index — which is the state
 * 95 legacy products were found in on 14/09/2026, and the reason the command exists. So every case
 * below is named for the way the number could be wrong:
 *
 *   · block tags must SEPARATE words. ImportedProductContent::countWords() strips tags without
 *     inserting a space, so `</li><li>` fuses two list items into one token. On the real legacy
 *     bodies that under-counted by 10–20 words and moved eight products across a 250-word gate;
 *   · the cover text is a FALLBACK for an empty description, never an addition to it — counting
 *     both would double a page that renders one;
 *   · nutrition and FAQ text is on the page, so it counts; a FAQ pair with an empty side is dropped
 *     by the view, so it does not; both key spellings (`q`/`question`, `a`/`answer`) are real;
 *   · one-character tokens ("à", "g", "1", "•") are not words — the audit's rule, kept as is;
 *   · the boundary: 249 words is below the gate and 250 clears it. `>=`, exactly at the number
 *     frontend/scripts/audit-pdp-content.mjs accepts, and asserted from both sides.
 *
 * The last section reads the COMMAND's source, because it extends Illuminate\Console\Command and
 * cannot be loaded here. The defects it guards are not return values — they are which query
 * selects the rows (the complement of --reindex, or a silent overlap with it), whether the flip is
 * a model save (fires ProductSeoObserver → revalidate + sitemap + IndexNow) or a bulk UPDATE (fires
 * nothing, and the storefront keeps serving cached noindex HTML for an hour), and whether the
 * vps-run button that applies it is wired as a WRITE (confirm=APPLY + database backup) rather than
 * as a read.
 */

require __DIR__.'/../../app/Services/Content/ProductContentGenerator.php';
require __DIR__.'/../../app/Services/Catalog/ImportedProductContent.php';
require __DIR__.'/../../app/Services/Seo/LegacyProductPage.php';
require __DIR__.'/../../app/Services/Catalog/SubCategoryClassifier.php';
require __DIR__.'/../../app/Services/Catalog/PromotionGate.php';

use App\Services\Catalog\ImportedProductContent;
use App\Services\Catalog\PromotionGate;
use App\Services\Seo\LegacyProductPage;

// config/catalog.php calls env(); it is not loaded here, so provide the fallback-only shape.
if (! function_exists('env')) {
    function env(string $key, mixed $default = null): mixed
    {
        return $default;
    }
}

$config = require __DIR__.'/../../config/catalog.php';
$min = (int) $config['promotion']['min_body_words'];

$failed = 0;

function check(string $label, bool $ok, string $detail = ''): void
{
    global $failed;

    if (! $ok) {
        $failed++;
    }

    printf("  %s  %s\n", $ok ? 'PASS' : 'FAIL', $label);

    if (! $ok && $detail !== '') {
        printf("        %s\n", $detail);
    }
}

/** A body of exactly $n distinct multi-character words, as `<p>` blocks of five. */
function bodyOf(int $n): string
{
    $words = [];
    for ($i = 1; $i <= $n; $i++) {
        $words[] = 'mot'.$i;
    }

    $html = '';
    foreach (array_chunk($words, 5) as $chunk) {
        $html .= '<p>'.implode(' ', $chunk).'</p>';
    }

    return $html;
}

echo "\nLegacyProductPage — the crawler page's word count, by named case\n";
printf("  gate: catalog.promotion.min_body_words = %d\n\n", $min);

// ── 1. block tags separate words ─────────────────────────────────────────────────────────────
$listed = '<ul><li>whey isolate</li><li>zéro sucre</li><li>digestion rapide</li></ul>';
check(
    'list items are separate words: `</li><li>` yields 6, not 4',
    LegacyProductPage::renderedWords($listed) === 6,
    'got '.LegacyProductPage::renderedWords($listed).' — the raw tokenizer gives '
        .ImportedProductContent::countWords($listed).' because it fuses "isolatezéro" and "sucredigestion"',
);
check(
    'the raw tokenizer really does fuse across tags (so the fix is not redundant)',
    ImportedProductContent::countWords($listed) < 6,
    'if countWords() now spaces tags itself, renderedWords() can be retired',
);
$heading = '<h1><strong>PSYCHOTIC PRE-WORKOUT</strong></h1><p>Libérez votre potentiel</p>';
check(
    'a heading followed by a paragraph: the last word of one and the first of the next stay apart',
    LegacyProductPage::renderedWords($heading) === 5,
    'got '.LegacyProductPage::renderedWords($heading),
);
check(
    '`<br>` runs separate words too',
    LegacyProductPage::renderedWords('ligne une<br>ligne deux<br/>ligne trois') === 6,
    'got '.LegacyProductPage::renderedWords('ligne une<br>ligne deux<br/>ligne trois'),
);

// ── 2. the token rule is the audit's, unchanged ──────────────────────────────────────────────
check(
    'one-character tokens are not words ("à", ":", "5", "g", "•", "1" → dose/prendre/fois/par/jour = 5)',
    LegacyProductPage::renderedWords('<p>dose à prendre : 5 g • 1 fois par jour</p>') === 5,
    'got '.LegacyProductPage::renderedWords('<p>dose à prendre : 5 g • 1 fois par jour</p>'),
);
check(
    'entities decode before counting (&amp;nbsp; and &amp;#039; do not become words)',
    LegacyProductPage::renderedWords('<p>Énergie&nbsp;&amp;&nbsp;Performance d&#039;entraînement</p>') === 3,
    'got '.LegacyProductPage::renderedWords('<p>Énergie&nbsp;&amp;&nbsp;Performance d&#039;entraînement</p>'),
);
check('empty and null fragments count 0', LegacyProductPage::renderedWords('') === 0 && LegacyProductPage::renderedWords(null) === 0);

// ── 3. which columns make the page ───────────────────────────────────────────────────────────
check(
    'description alone: cover is NOT added when the description is present',
    LegacyProductPage::bodyWords('<p>un deux trois</p>', '<p>quatre cinq</p>', null, null) === 3,
    'got '.LegacyProductPage::bodyWords('<p>un deux trois</p>', '<p>quatre cinq</p>', null, null),
);
check(
    'cover is the fallback when the description is empty or whitespace',
    LegacyProductPage::bodyWords('  ', '<p>quatre cinq</p>', null, null) === 2
        && LegacyProductPage::bodyWords(null, '<p>quatre cinq</p>', null, null) === 2,
);
check(
    'nutrition_values HTML is on the page and counts (un deux + Protéines 24g par dose = 6)',
    LegacyProductPage::bodyWords('<p>un deux</p>', null, '<table><tr><td>Protéines</td><td>24g par dose</td></tr></table>', null) === 6,
    'got '.LegacyProductPage::bodyWords('<p>un deux</p>', null, '<table><tr><td>Protéines</td><td>24g par dose</td></tr></table>', null),
);
$faq = [
    ['q' => 'Quand prendre ?', 'a' => 'Après entraînement'],
    ['question' => 'Combien de doses ?', 'answer' => 'Trente doses'],
    ['q' => 'Sans réponse ?', 'a' => ''],             // dropped by the view
    ['q' => '', 'a' => 'sans question'],              // dropped by the view
    'not an entry',                                   // ignored
];
check(
    'FAQ pairs count both sides, accept q/question and a/answer, and drop half-empty pairs',
    LegacyProductPage::bodyWords('<p>un deux</p>', null, null, $faq) === 2 + 2 + 2 + 3 + 2,
    'got '.LegacyProductPage::bodyWords('<p>un deux</p>', null, null, $faq).' (expected 11: un deux | Quand prendre | Après entraînement | Combien de doses | Trente doses)',
);
check(
    'a non-array faq (NULL column, malformed JSON) is simply no FAQ',
    LegacyProductPage::bodyWords('<p>un deux</p>', null, null, null) === 2
        && LegacyProductPage::bodyWords('<p>un deux</p>', null, null, 'oops') === 2,
);

// ── 4. the boundary, from both sides, at the shipped gate ────────────────────────────────────
$just = LegacyProductPage::bodyWords(bodyOf($min), null, null, null);
$short = LegacyProductPage::bodyWords(bodyOf($min - 1), null, null, null);
check(sprintf('a %d-word body measures %d', $min, $min), $just === $min, 'got '.$just);
check(sprintf('a %d-word body clears the gate', $min), PromotionGate::indexable($just, $min));
check(sprintf('a %d-word body does not', $min - 1), ! PromotionGate::indexable($short, $min), 'got '.$short.' words');

// ── 5. the command, from its source ──────────────────────────────────────────────────────────
$command = file_get_contents(__DIR__.'/../../app/Console/Commands/SeoProductsLegacyReindex.php');
$workflow = file_get_contents(__DIR__.'/../../../.github/workflows/vps-run.yml');

echo "\nseo:products-legacy-reindex — source assertions\n";
check(
    'selects the complement of --reindex: published, index = 0, and NO staging row',
    str_contains($command, "->where('publier', 1)")
        && str_contains($command, "->where('seo_robots_index', 0)")
        && str_contains($command, "->whereDoesntHave('externalCatalogSource')"),
    'without the whereDoesntHave, this pass and catalog:iherb:promote --reindex overlap on ~6,000 imported stubs',
);
check(
    'measures with LegacyProductPage::bodyWords and gates with PromotionGate::indexable',
    str_contains($command, 'LegacyProductPage::bodyWords(') && str_contains($command, 'PromotionGate::indexable('),
);
check(
    'the flip is a model save (`seo_robots_index = true` then `->save()`), so ProductSeoObserver fires',
    str_contains($command, '$product->seo_robots_index = true;') && str_contains($command, '$product->save();'),
);
check(
    'no bulk ->update([ on products (fires no observer: no revalidate, no sitemap bust, no IndexNow)',
    ! str_contains($command, '->update(['),
);
check(
    'no forceFill() call (wasChanged would be ambiguous)',
    ! preg_match('~->forceFill\(~', $command),
);
check(
    'rows are loaded in full before saving (a partial select shows blanks to the saving hooks)',
    str_contains($command, '$candidates = $query->get();') && ! preg_match('~\$query->get\(\s*\[~', $command),
);
check(
    'writes are behind --apply; without it the command is a report',
    str_contains($command, '{--apply :') && str_contains($command, "\$apply = (bool) \$this->option('apply');"),
);

echo "\nvps-run.yml — the button is wired as a write\n";
check(
    'seo-legacy-reindex-dry-run is listed and resolves to the bare command with WRITES=no',
    str_contains($workflow, '- seo-legacy-reindex-dry-run')
        && preg_match('~seo-legacy-reindex-dry-run\)\s*\n(?:\s*#.*\n)*\s*ARGS="seo:products-legacy-reindex"\s*\n\s*WRITES=no~', $workflow) === 1,
);
check(
    'seo-legacy-reindex-apply is listed and resolves to --apply with WRITES=yes (confirm=APPLY + backup)',
    str_contains($workflow, '- seo-legacy-reindex-apply')
        && preg_match('~seo-legacy-reindex-apply\)\s*\n(?:\s*#.*\n)*\s*ARGS="seo:products-legacy-reindex --apply"\s*\n\s*WRITES=yes~', $workflow) === 1,
    'an apply arm at WRITES=no would skip the pre-command database backup and the confirm gate',
);

echo "\n".($failed === 0 ? 'ALL PASS' : $failed.' FAILED')."\n\n";

exit($failed === 0 ? 0 : 1);
