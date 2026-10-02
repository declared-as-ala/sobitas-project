<?php

namespace App\Console\Commands;

use App\Models\Article;
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

    /**
     * Blog articles take the same guarded replacement (`"model": "article"`): the body fields, and
     * since 29/09/2026 the cover + its alt (new generated covers shipped via restore-article-images)
     * and `publier` (a post merged into another by a 301 leaves the sitemap). Same hash guard: the
     * edit applies only while the stored value still hashes to `old_sha1` (sha1 of '' when empty).
     */
    private const ARTICLE_FIELDS = ['description_fr', 'description', 'cover', 'alt_cover', 'publier'];

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
            foreach ($decoded as $key => $entry) {
                if (! is_string($key) || ! is_array($entry)) {
                    continue;
                }
                // One edit per slug AND field: a post can take a new body, a new cover and its alt in
                // one run. The key may carry a `#suffix` (e.g. "slug#cover") so one JSON object can
                // hold several fields of one slug; later files still win on the same slug+field.
                $slug = explode('#', $key, 2)[0];
                $entry['__slug'] = $slug;
                $entries[$slug."|".($entry['field'] ?? '')] = $entry;
            }
        }
        if ($only !== '') {
            $entries = array_filter($entries, fn ($e) => $e['__slug'] === $only);
        }

        $this->line(sprintf('%s — %d edit(s) from %s', $apply ? 'APPLY' : 'REPORT ONLY', count($entries), $dir));
        $this->line('');

        $productSlugs = array_values(array_unique(array_column(array_filter($entries, fn ($e) => ($e['model'] ?? 'product') !== 'article'), '__slug')));
        $articleSlugs = array_values(array_unique(array_column(array_filter($entries, fn ($e) => ($e['model'] ?? 'product') === 'article'), '__slug')));
        $products = Product::query()->whereIn('slug', $productSlugs)->get();
        $articles = $articleSlugs === [] ? collect() : Article::query()->whereIn('slug', $articleSlugs)->get();
        $changed = $upToDate = $skipped = 0;

        foreach ($entries as $entry) {
            $slug = $entry['__slug'];
            $field = (string) ($entry['field'] ?? '');
            $value = $entry['value'] ?? null;
            $oldSha = strtolower((string) ($entry['old_sha1'] ?? ''));
            $isArticle = ($entry['model'] ?? 'product') === 'article';
            $allowed = $isArticle ? self::ARTICLE_FIELDS : self::FIELDS;
            /** @var Product|Article|null $product */
            $product = $isArticle ? $articles->firstWhere('slug', $slug) : $products->firstWhere('slug', $slug);

            if (! in_array($field, $allowed, true) || ! is_string($value) || trim($value) === '' || $oldSha === '') {
                $skipped++;
                $this->warn(sprintf('  INVALID   %s — needs field (%s), a non-empty value and old_sha1', $slug, implode('|', $allowed)));
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

            $words = fn () => $isArticle
                ? count(preg_split('/\s+/u', trim(strip_tags((string) $product->{$field})), -1, PREG_SPLIT_NO_EMPTY))
                : LegacyProductPage::bodyWords($product->description_fr, $product->description_cover, $product->nutrition_values, $product->faq);
            $before = $words();
            $product->{$field} = $value;
            $after = $words();
            $summary = sprintf('%-56s %4d w -> %4d w  [%s%s]%s', $slug, $before, $after, $isArticle ? 'article.' : '', $field,
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
