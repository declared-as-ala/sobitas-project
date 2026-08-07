<?php

namespace App\Console\Commands;

use App\Models\Product;
use DOMDocument;
use DOMElement;
use DOMNode;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Lift FAQ blocks that are buried inside `description_fr` HTML into the structured `faq` column.
 *
 * ── WHY THIS IS WORTH A COMMAND ───────────────────────────────────────────────────────────
 * The FAQ machinery is already complete and already wired to Google: `products.faq` feeds a
 * Filament repeater, `buildFAQPageSchemaFromProductFaq` (frontend/src/util/structuredData.ts:1054)
 * turns it into FAQPage JSON-LD, and both the human and the crawler view render it. The column is
 * simply empty on all 309 products.
 *
 * Seven products DO have questions and answers — they were written straight into the description as
 * `<h2>FAQ – Questions fréquentes</h2>` followed by `<h3>`/`<p>` pairs. Those render as prose, earn
 * no rich-result eligibility, and cannot be edited as data. Moving them costs nothing and switches
 * the schema on for those products the moment it runs.
 *
 * The other ~302 products need `products:generate-content`; this command deliberately does not
 * invent anything.
 *
 * ── WHAT IT REFUSES TO DO ─────────────────────────────────────────────────────────────────
 * • It never writes over a `faq` column that already has entries.
 * • It never keeps a question without an answer, or vice versa.
 * • Answers are stored as plain text, because both views render `{f.a}` as text — leaving HTML in
 *   would print tags to the customer.
 * • It is idempotent: once the block is out of the description there is nothing left to match.
 *
 *   php artisan products:extract-faq            # report + diff, changes nothing
 *   php artisan products:extract-faq --apply
 */
class ExtractProductFaq extends Command
{
    protected $signature = 'products:extract-faq
                            {--apply : Write the changes (without this the command only reports)}
                            {--id= : Restrict to one product id}
                            {--keep-html : Leave the FAQ block in description_fr instead of removing it}';

    protected $description = 'Move FAQ blocks embedded in description_fr into the structured faq column';

    /**
     * The heading that opens the block. Anchored to the whole heading text so a description that
     * merely mentions "faq" in a sentence is not treated as a section boundary.
     */
    private const FAQ_HEADING = '/^\s*(?:FAQ|Questions?\s+fr[ée]quentes?|Foire\s+aux\s+questions)\b/iu';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');
        $keepHtml = (bool) $this->option('keep-html');

        $query = Product::query()->select('id', 'designation_fr', 'slug', 'description_fr', 'faq');
        if ($id = $this->option('id')) {
            $query->where('id', (int) $id);
        }

        $changes = [];
        $skippedExisting = 0;
        $scanned = 0;

        foreach ($query->orderBy('id')->cursor() as $product) {
            $scanned++;
            $html = (string) ($product->description_fr ?? '');
            if ($html === '' || ! preg_match('/<h[1-6][^>]*>/i', $html)) {
                continue;
            }

            $result = $this->extract($html);
            if ($result === null) {
                continue;
            }

            // An existing faq is authored data. Never clobber it — report and move on.
            if (is_array($product->faq) && $product->faq !== []) {
                $skippedExisting++;

                continue;
            }

            $changes[] = [
                'id' => $product->id,
                'name' => $product->designation_fr,
                'faq' => $result['faq'],
                'description' => $keepHtml ? $html : $result['remaining'],
                'wordsRemoved' => $this->wordCount($html) - $this->wordCount($result['remaining']),
            ];
        }

        $this->newLine();
        $this->line(sprintf('  scanned                     %d products', $scanned));
        $this->line(sprintf('  faq already populated       %d (left untouched)', $skippedExisting));
        $this->line(sprintf('  extractable FAQ blocks      %d', count($changes)));

        if (! $changes) {
            $this->newLine();
            $this->info('Nothing to extract. Products without an FAQ need `products:generate-content`.');

            return self::SUCCESS;
        }

        foreach ($changes as $change) {
            $this->newLine();
            $this->line(sprintf(
                '  <fg=cyan>#%d</> %s  — %d question(s), %d words leave the description',
                $change['id'],
                mb_strimwidth((string) $change['name'], 0, 54, '…'),
                count($change['faq']),
                $change['wordsRemoved']
            ));
            foreach ($change['faq'] as $entry) {
                $this->line('      Q: '.mb_strimwidth($entry['q'], 0, 88, '…'));
                $this->line('      A: '.mb_strimwidth($entry['a'], 0, 88, '…'));
            }
        }

        if (! $apply) {
            $this->newLine();
            $this->info('Report only. Re-run with --apply to write.');

            return self::SUCCESS;
        }

        $written = 0;
        foreach ($changes as $change) {
            // Query builder: writes exactly these two columns, skips the model `saving` hook that
            // re-derives `rupture` from qte, and leaves updated_at alone so a content migration does
            // not restamp every product's <lastmod>.
            $written += DB::table('products')->where('id', $change['id'])->update([
                'faq' => json_encode($change['faq'], JSON_UNESCAPED_UNICODE),
                'description_fr' => $change['description'],
            ]);
        }

        $this->newLine();
        $this->info(sprintf('Updated %d product(s). FAQPage schema is now live for them.', $written));
        $this->line('  Verify: npm run audit:pdp  (faqSchemaPct should rise from 0)');

        return self::SUCCESS;
    }

    /**
     * @return array{faq: list<array{q: string, a: string}>, remaining: string}|null
     */
    private function extract(string $html): ?array
    {
        $dom = $this->loadHtml($html);
        if ($dom === null) {
            return null;
        }

        $body = $dom->getElementsByTagName('body')->item(0);
        if (! $body instanceof DOMNode) {
            return null;
        }

        /** @var list<DOMNode> $nodes */
        $nodes = iterator_to_array($body->childNodes);

        $startIndex = null;
        $faqLevel = 0;
        foreach ($nodes as $index => $node) {
            $level = $this->headingLevel($node);
            if ($level > 0 && preg_match(self::FAQ_HEADING, $this->text($node))) {
                $startIndex = $index;
                $faqLevel = $level;
                break;
            }
        }

        if ($startIndex === null) {
            return null;
        }

        $faq = [];
        $question = null;
        $answer = [];
        $consumed = [$startIndex];

        for ($i = $startIndex + 1, $n = count($nodes); $i < $n; $i++) {
            $node = $nodes[$i];
            $level = $this->headingLevel($node);

            // A heading at or above the FAQ's own level ends the block — the FAQ section is over and
            // whatever follows belongs to the description.
            if ($level > 0 && $level <= $faqLevel) {
                break;
            }

            if ($level > $faqLevel) {
                $this->push($faq, $question, $answer);
                $question = $this->text($node);
                $answer = [];
                $consumed[] = $i;

                continue;
            }

            // Body content before the first question is a lead-in paragraph, not an answer.
            if ($question === null) {
                continue;
            }

            $text = $this->text($node);
            if ($text !== '') {
                $answer[] = $text;
            }
            $consumed[] = $i;
        }

        $this->push($faq, $question, $answer);

        if ($faq === []) {
            return null;
        }

        foreach (array_reverse($consumed) as $index) {
            $node = $nodes[$index];
            $node->parentNode?->removeChild($node);
        }

        return ['faq' => $faq, 'remaining' => $this->serialize($dom)];
    }

    /**
     * @param  list<array{q: string, a: string}>  $faq
     * @param  list<string>  $answer
     */
    private function push(array &$faq, ?string $question, array $answer): void
    {
        $q = trim((string) $question);
        $a = trim(implode(' ', $answer));

        // A question with no answer is not an FAQ entry, and an answer with no question cannot be
        // rendered. Google also rejects an incomplete FAQPage item, so half a pair is worse than none.
        if ($q !== '' && $a !== '') {
            $faq[] = ['q' => $q, 'a' => $a];
        }
    }

    private function headingLevel(DOMNode $node): int
    {
        return $node instanceof DOMElement && preg_match('/^h([1-6])$/i', $node->tagName, $m)
            ? (int) $m[1]
            : 0;
    }

    /** Plain text — both product views render an answer as text, so stored HTML would print as tags. */
    private function text(DOMNode $node): string
    {
        return trim(preg_replace('/\s+/u', ' ', (string) $node->textContent) ?? '');
    }

    private function wordCount(string $html): int
    {
        return str_word_count(strip_tags(html_entity_decode($html, ENT_QUOTES | ENT_HTML5, 'UTF-8')));
    }

    private function loadHtml(string $html): ?DOMDocument
    {
        $dom = new DOMDocument;
        $previous = libxml_use_internal_errors(true);

        // The meta charset keeps DOMDocument from reading UTF-8 as ISO-8859-1 and mangling every
        // accented French character; HTML5 tags are unknown to libxml, hence the suppressed errors.
        $loaded = $dom->loadHTML(
            '<?xml encoding="UTF-8"><html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body>'
                .$html.'</body></html>',
            LIBXML_HTML_NODEFDTD | LIBXML_NOERROR | LIBXML_NOWARNING
        );

        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        return $loaded ? $dom : null;
    }

    private function serialize(DOMDocument $dom): string
    {
        $body = $dom->getElementsByTagName('body')->item(0);
        if (! $body instanceof DOMNode) {
            return '';
        }

        $out = '';
        foreach ($body->childNodes as $child) {
            $out .= $dom->saveHTML($child);
        }

        return trim($out);
    }
}
