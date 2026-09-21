<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Services\Seo\LegacyProductPage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Apply repo-authored product copy from `resources/seo/products/*.json` to the live catalogue.
 *
 * This is how the cloud SEO routine (seo-agent/PLAYBOOK.md) reaches product content it cannot
 * edit in the database: it writes a JSON entry keyed by slug, the land workflow deploys this
 * image and queues `seo-copy-apply`, and this command performs the writes. Every save goes
 * through the model, so ProductSeoObserver revalidates the page, refreshes the sitemap and pings
 * IndexNow — the same machinery every other content write uses.
 *
 * SAFETY RULES (they are the whole design, keep them):
 *  - Idempotent. A second run with the same JSON reports nothing to do.
 *  - Never shrinks content. `description_fr` is only ever APPENDED to, inside a keyed block
 *    (<!-- seo-agent:block:KEY --> … <!-- /seo-agent:block:KEY -->) that a later entry with the
 *    same key can replace; the owner's own prose above it is never touched.
 *  - `meta_title` / `meta_description` fill EMPTY columns only, unless the entry says
 *    `"force": true` — the agent must have GSC evidence to force (documented in its log).
 *  - FAQ pairs are merged by question (case/space-insensitive); existing pairs are kept.
 *  - Unknown slugs and unpublished products are reported and skipped.
 *
 * Entry shape (one object per file, keyed by product slug):
 *   {
 *     "creatine-monohydrate-300g-ostrovit": {
 *       "meta_title": "≤65 chars",               // optional
 *       "meta_description": "≤160 chars",        // optional
 *       "force": false,                          // optional — overwrite non-empty meta_*
 *       "append_html": "<h2>…</h2><p>…</p>",     // optional — appended once inside a keyed block
 *       "block_key": "guide-2026-09",            // optional — default "seo-agent"
 *       "faq": [{"q": "…", "a": "…"}],           // optional — merged by question
 *       "why": "GSC: 'creatine ostrovit' pos 6.2, 0 clicks/7d"   // free text, printed only
 *     }
 *   }
 */
class SeoProductsApplyCopy extends Command
{
    protected $signature = 'seo:products-apply-copy
                            {--apply : Write the changes (report only without it)}
                            {--only= : Restrict to one slug}
                            {--dir= : Directory of JSON files (default resources/seo/products)}';

    protected $description = 'Apply repo-authored product copy (resources/seo/products/*.json) to the catalogue — additive, idempotent, model saves';

    private const MAX_TITLE = 70;

    private const MAX_DESCRIPTION = 170;

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');
        $only = trim((string) $this->option('only'));
        $dir = (string) ($this->option('dir') ?: resource_path('seo/products'));

        if (! is_dir($dir)) {
            $this->info(sprintf('No copy directory at %s — nothing to apply.', $dir));

            return self::SUCCESS;
        }

        $entries = $this->loadEntries($dir);
        if ($entries === []) {
            $this->info('No product copy entries found — nothing to apply.');

            return self::SUCCESS;
        }
        if ($only !== '') {
            $entries = array_intersect_key($entries, [$only => true]);
        }

        $this->line(sprintf('%s — %d entr%s from %s', $apply ? 'APPLY' : 'REPORT ONLY', count($entries), count($entries) === 1 ? 'y' : 'ies', $dir));
        $this->line('');

        $products = Product::query()
            ->whereIn('slug', array_keys($entries))
            ->get(['id', 'slug', 'publier', 'description_fr', 'description_cover', 'nutrition_values', 'faq', 'meta_title', 'meta_description']);

        $changed = 0;
        $unchanged = 0;
        $skipped = 0;

        foreach ($entries as $slug => $entry) {
            /** @var Product|null $product */
            $product = $products->firstWhere('slug', $slug);
            if (! $product) {
                $skipped++;
                $this->warn(sprintf('  MISSING   %s — no product with this slug', $slug));
                continue;
            }
            if (! (bool) $product->publier) {
                $skipped++;
                $this->warn(sprintf('  UNPUBL.   %s — product is not published, left alone', $slug));
                continue;
            }

            $plan = $this->plan($product, $entry);
            if ($plan === []) {
                $unchanged++;
                $this->line(sprintf('  UP-TO-DATE %s', $slug));
                continue;
            }

            $before = LegacyProductPage::bodyWords($product->description_fr, $product->description_cover, $product->nutrition_values, $product->faq);
            foreach ($plan as $field => $value) {
                $product->{$field} = $value;
            }
            $after = LegacyProductPage::bodyWords($product->description_fr, $product->description_cover, $product->nutrition_values, $product->faq);

            $summary = sprintf(
                '%-52s %4d w -> %4d w  [%s]%s',
                $slug,
                $before,
                $after,
                implode(', ', array_keys($plan)),
                isset($entry['why']) && is_string($entry['why']) && $entry['why'] !== '' ? '  — '.$entry['why'] : '',
            );

            if ($apply) {
                $product->save();
                $changed++;
                $this->info('  APPLIED   '.$summary);
            } else {
                $this->line('  WOULD     '.$summary);
            }
        }

        $this->line('');
        $this->info($apply
            ? sprintf('Applied %d, up-to-date %d, skipped %d. Revalidation/sitemap/IndexNow dispatched by ProductSeoObserver.', $changed, $unchanged, $skipped)
            : sprintf('REPORT ONLY — %d would change, %d up-to-date, %d skipped. Re-run with --apply.', count($entries) - $unchanged - $skipped, $unchanged, $skipped));

        return self::SUCCESS;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function loadEntries(string $dir): array
    {
        $entries = [];
        foreach (File::glob(rtrim($dir, '/').'/*.json') as $file) {
            $decoded = json_decode((string) File::get($file), true);
            if (! is_array($decoded)) {
                $this->error(sprintf('  INVALID   %s — not a JSON object, ignored', basename($file)));
                continue;
            }
            foreach ($decoded as $slug => $entry) {
                if (! is_string($slug) || ! is_array($entry)) {
                    continue;
                }
                // Later files win on the same slug (alphabetical order), so a dated file can supersede.
                $entries[$slug] = $entry;
            }
        }
        ksort($entries);

        return $entries;
    }

    /**
     * Compute the field writes an entry implies for this product. Empty array = nothing to do.
     *
     * @param  array<string, mixed>  $entry
     * @return array<string, mixed>
     */
    private function plan(Product $product, array $entry): array
    {
        $plan = [];
        $force = (bool) ($entry['force'] ?? false);

        foreach (['meta_title' => self::MAX_TITLE, 'meta_description' => self::MAX_DESCRIPTION] as $field => $max) {
            $wanted = isset($entry[$field]) && is_string($entry[$field]) ? trim($entry[$field]) : '';
            if ($wanted === '') {
                continue;
            }
            if (mb_strlen($wanted) > $max) {
                $this->warn(sprintf('  TOO LONG  %s.%s is %d chars (max %d) — ignored', $product->slug, $field, mb_strlen($wanted), $max));
                continue;
            }
            $current = trim((string) $product->{$field});
            if ($current === $wanted) {
                continue;
            }
            if ($current !== '' && ! $force) {
                continue; // a human (or an earlier decision) owns it — needs "force": true
            }
            $plan[$field] = $wanted;
        }

        $html = isset($entry['append_html']) && is_string($entry['append_html']) ? trim($entry['append_html']) : '';
        if ($html !== '') {
            $key = preg_replace('/[^a-z0-9_-]/i', '', (string) ($entry['block_key'] ?? 'seo-agent')) ?: 'seo-agent';
            $open = "<!-- seo-agent:block:{$key} -->";
            $close = "<!-- /seo-agent:block:{$key} -->";
            $block = "{$open}\n{$html}\n{$close}";
            $current = (string) $product->description_fr;

            $pattern = '/'.preg_quote($open, '/').'.*?'.preg_quote($close, '/').'/s';
            if (preg_match($pattern, $current, $m)) {
                if ($m[0] !== $block) {
                    $plan['description_fr'] = (string) preg_replace($pattern, str_replace('$', '\$', $block), $current, 1);
                }
            } else {
                $plan['description_fr'] = rtrim($current) === '' ? $block : rtrim($current)."\n".$block;
            }
        }

        if (isset($entry['faq']) && is_array($entry['faq'])) {
            $existing = is_array($product->faq) ? array_values(array_filter($product->faq, fn ($e) => is_array($e)
                && trim((string) ($e['q'] ?? $e['question'] ?? '')) !== ''
                && trim((string) ($e['a'] ?? $e['answer'] ?? '')) !== '')) : [];
            $seen = [];
            foreach ($existing as $pair) {
                $seen[$this->normalize((string) ($pair['q'] ?? $pair['question'] ?? ''))] = true;
            }
            $merged = $existing;
            foreach ($entry['faq'] as $pair) {
                if (! is_array($pair)) {
                    continue;
                }
                $q = trim((string) ($pair['q'] ?? ''));
                $a = trim((string) ($pair['a'] ?? ''));
                if ($q === '' || $a === '' || isset($seen[$this->normalize($q)])) {
                    continue;
                }
                $seen[$this->normalize($q)] = true;
                $merged[] = ['q' => $q, 'a' => $a];
            }
            if (count($merged) !== count($existing)) {
                $plan['faq'] = $merged;
            }
        }

        return $plan;
    }

    private function normalize(string $s): string
    {
        return mb_strtolower(trim((string) preg_replace('/\s+/u', ' ', $s)));
    }
}
