<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Services\Seo\LegacyProductPage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Apply repo-reviewed REPLACEMENTS of product copy: `resources/seo/product-edits/*.json`.
 *
 * seo:products-apply-copy can only ADD text. This is its counterpart for text that must go: on
 * 28/09/2026 the hand-built catalogue carried AI answers pasted verbatim onto live product pages
 * ("que tu commercialises", "Je ne mettrais pas…", "Termes sémantiques à intégrer"), the retired
 * SOBITAS brand, fixed prices from 2025 ("2990 dinars tunisiens"), unauthorised cardiovascular
 * claims and CP1252 mojibake ("âœ”"). Each edit was computed from the live text and reviewed.
 *
 * GUARDED: an edit applies only while the stored field still hashes to `old_sha1` — the exact
 * text it was computed from. If anyone edited the product since, the edit is skipped and
 * reported, never forced. Saves go through the model, so ProductSeoObserver revalidates the page,
 * refreshes the sitemap and pings IndexNow. Idempotent: an applied edit reports UP-TO-DATE.
 *
 *   { "<slug>": { "field": "description_fr", "old_sha1": "<sha1 of current>", "value": "<html>", "why": "…" } }
 */
class SeoProductsApplyEdits extends Command
{
    protected $signature = 'seo:products-apply-edits
        {--apply : Write the edits (default is a report)}
        {--only= : Limit to one product slug}
        {--dir= : Override the edits directory}';

    protected $description = 'Apply reviewed product-copy replacements (resources/seo/product-edits/*.json), guarded by a hash of the current text';

    private const FIELDS = ['description_fr', 'description_cover', 'questions'];

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');
        $only = trim((string) $this->option('only'));
        $dir = (string) ($this->option('dir') ?: resource_path('seo/product-edits'));

        if (! is_dir($dir)) {
            $this->info(sprintf('No edits directory at %s — nothing to apply.', $dir));

            return self::SUCCESS;
        }

        $entries = [];
        foreach (File::glob(rtrim($dir, '/').'/*.json') as $file) {
            $decoded = json_decode((string) File::get($file), true);
            if (! is_array($decoded)) {
                $this->error(sprintf('  INVALID   %s — not a JSON object, ignored', basename($file)));
                continue;
            }
            foreach ($decoded as $slug => $entry) {
                if (is_string($slug) && is_array($entry)) {
                    $entries[$slug] = $entry; // later files win on the same slug
                }
            }
        }
        if ($only !== '') {
            $entries = array_intersect_key($entries, [$only => true]);
        }

        $this->line(sprintf('%s — %d edit(s) from %s', $apply ? 'APPLY' : 'REPORT ONLY', count($entries), $dir));
        $this->line('');

        $products = Product::query()->whereIn('slug', array_keys($entries))->get();
        $changed = $upToDate = $skipped = 0;

        foreach ($entries as $slug => $entry) {
            $field = (string) ($entry['field'] ?? '');
            $value = $entry['value'] ?? null;
            $oldSha = strtolower((string) ($entry['old_sha1'] ?? ''));
            /** @var Product|null $product */
            $product = $products->firstWhere('slug', $slug);

            if (! in_array($field, self::FIELDS, true) || ! is_string($value) || trim($value) === '' || $oldSha === '') {
                $skipped++;
                $this->warn(sprintf('  INVALID   %s — needs field (%s), a non-empty value and old_sha1', $slug, implode('|', self::FIELDS)));
                continue;
            }
            if (! $product) {
                $skipped++;
                $this->warn(sprintf('  MISSING   %s — no product with this slug', $slug));
                continue;
            }

            $current = (string) ($product->{$field} ?? '');
            if ($current === $value) {
                $upToDate++;
                $this->line(sprintf('  UP-TO-DATE %s', $slug));
                continue;
            }
            if (sha1($current) !== $oldSha) {
                $skipped++;
                $this->warn(sprintf('  CHANGED   %s — %s was edited since this edit was computed; left alone', $slug, $field));
                continue;
            }

            $before = LegacyProductPage::bodyWords($product->description_fr, $product->description_cover, $product->nutrition_values, $product->faq);
            $product->{$field} = $value;
            $after = LegacyProductPage::bodyWords($product->description_fr, $product->description_cover, $product->nutrition_values, $product->faq);
            $summary = sprintf('%-56s %4d w -> %4d w  [%s]%s', $slug, $before, $after, $field,
                isset($entry['why']) && is_string($entry['why']) && $entry['why'] !== '' ? '  — '.$entry['why'] : '');

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
            ? sprintf('Applied %d, up-to-date %d, skipped %d. Revalidation/sitemap/IndexNow dispatched by ProductSeoObserver.', $changed, $upToDate, $skipped)
            : sprintf('REPORT ONLY — %d would change, %d up-to-date, %d skipped. Re-run with --apply.', count($entries) - $upToDate - $skipped, $upToDate, $skipped));

        return self::SUCCESS;
    }
}
