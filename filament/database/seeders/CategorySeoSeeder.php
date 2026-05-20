<?php

namespace Database\Seeders;

use App\Console\Commands\SeoContentData;
use App\Models\Categ;
use Illuminate\Console\Command as ConsoleCommand;
use Illuminate\Database\Seeder;
use Symfony\Component\Console\Output\OutputInterface;

class CategorySeoSeeder extends Seeder
{
    protected ?OutputInterface $output = null;

    public function __construct(?ConsoleCommand $command = null)
    {
        if ($command !== null) {
            $this->command = $command;
        }
    }

    protected function getOutput(): ?OutputInterface
    {
        if ($this->output === null) {
            $this->output = $this->command ? $this->command->getOutput() : null;
        }

        return $this->output;
    }

    protected function info(string $message): void
    {
        $this->getOutput()?->writeln($message);
    }

    protected function warn(string $message): void
    {
        $this->getOutput()?->writeln("<comment>{$message}</comment>");
    }

    protected function getForce(): bool
    {
        if ($this->command && method_exists($this->command, 'option')) {
            return (bool) ($this->command->option('force') ?? false);
        }

        return false;
    }

    public function run(): void
    {
        $this->info('Seeding category SEO content...');

        $categoriesData = SeoContentData::getCategoriesData();
        $updated = 0;
        $skipped = 0;
        $missing = [];
        $force = $this->getForce();
        $handledIds = [];

        foreach ($categoriesData as $slug => $data) {
            $data = SeoContentData::buildCompleteSeoData($slug, $data['name'], $data, 'category');
            $category = Categ::where('slug', $slug)->first();

            if (! $category) {
                $category = Categ::where('slug', 'like', '%'.SeoContentData::normalizeSlug($data['name']).'%')->first();
            }

            if (! $category) {
                $missing[] = $data['name'];
                $this->warn("  Category not found: {$data['name']} (slug: {$slug})");
                continue;
            }

            $handledIds[] = $category->id;
            $updateData = $this->seoUpdatePayload($data, 0.85, $category->cover);
            if (! $force) {
                $updateData = $this->onlyMissingFields($category, $updateData);
            }

            if ($updateData === []) {
                $skipped++;
                $this->info("  Skipped (SEO complete): {$category->designation_fr}");
                continue;
            }

            $category->update($updateData);
            $updated++;
            $this->info("  Updated: {$category->designation_fr}");
        }

        Categ::query()
            ->when($handledIds !== [], fn ($query) => $query->whereNotIn('id', $handledIds))
            ->orderBy('designation_fr')
            ->get()
            ->each(function (Categ $category) use (&$updated, &$skipped, $force): void {
                $data = SeoContentData::buildCompleteSeoData(
                    (string) $category->slug,
                    (string) $category->designation_fr,
                    [],
                    'category'
                );

                $updateData = $this->seoUpdatePayload($data, 0.85, $category->cover);
                if (! $force) {
                    $updateData = $this->onlyMissingFields($category, $updateData);
                }

                if ($updateData === []) {
                    $skipped++;
                    $this->info("  Skipped (SEO complete): {$category->designation_fr}");
                    return;
                }

                $category->update($updateData);
                $updated++;
                $this->info("  Updated generic SEO: {$category->designation_fr}");
            });

        $this->info('');
        $this->info('Summary:');
        $this->info("  - Categories updated: {$updated}");
        $this->info("  - Categories skipped: {$skipped}");

        if ($missing !== []) {
            $this->warn('  - Seed data categories not found: '.implode(', ', $missing));
        }
    }

    public function runDryRun(): void
    {
        $this->info('DRY RUN - Category SEO content (no changes will be made)');

        $categoriesData = SeoContentData::getCategoriesData();
        $handledIds = [];
        $force = $this->getForce();

        foreach ($categoriesData as $slug => $data) {
            $category = Categ::where('slug', $slug)->first();

            if (! $category) {
                $category = Categ::where('slug', 'like', '%'.SeoContentData::normalizeSlug($data['name']).'%')->first();
            }

            if (! $category) {
                $this->warn("  Would use generic fallback if category exists later: {$data['name']} (slug: {$slug})");
                continue;
            }

            $handledIds[] = $category->id;
            $payload = $this->seoUpdatePayload(
                SeoContentData::buildCompleteSeoData($slug, $data['name'], $data, 'category'),
                0.85,
                $category->cover
            );
            $missing = $force ? $payload : $this->onlyMissingFields($category, $payload);
            $this->info($missing === []
                ? "  Would skip (SEO complete): {$category->designation_fr}"
                : "  Would update: {$category->designation_fr}");
        }

        Categ::query()
            ->when($handledIds !== [], fn ($query) => $query->whereNotIn('id', $handledIds))
            ->orderBy('designation_fr')
            ->get()
            ->each(fn (Categ $category) => $this->info("  Would ensure generic SEO: {$category->designation_fr}"));
    }

    protected function seoUpdatePayload(array $data, float $priority, ?string $cover = null): array
    {
        $payload = [
            'meta_title' => $data['meta_title'],
            'meta_description' => $data['meta_description'],
            'meta_keywords' => $data['meta_keywords'] ?? null,
            'h1_title' => $data['h1_title'],
            'breadcrumb_label' => $data['breadcrumb_label'] ?? $data['name'],
            'primary_keyword' => $data['primary_keyword'],
            'secondary_keywords' => $data['secondary_keywords'] ?? [],
            'seo_tags' => $data['seo_tags'] ?? [],
            'short_intro' => $data['short_intro'] ?? null,
            'long_bottom_content' => $data['long_bottom_content'] ?? null,
            'canonical_url' => $data['canonical_url'] ?? null,
            'og_title' => $data['og_title'] ?? $data['meta_title'],
            'og_description' => $data['og_description'] ?? $data['meta_description'],
            'og_image' => ($data['og_image'] ?? '') ?: $cover,
            'og_image_alt' => $data['og_image_alt'] ?? $data['h1_title'],
            'twitter_title' => $data['twitter_title'] ?? $data['meta_title'],
            'twitter_description' => $data['twitter_description'] ?? $data['meta_description'],
            'twitter_image' => ($data['twitter_image'] ?? '') ?: $cover,
            'related_category_slugs' => $data['related_category_slugs'] ?? [],
            'faq' => $data['faq'] ?? [],
            'robots_index' => true,
            'robots_follow' => true,
            'seo_enabled' => true,
            'sitemap_include' => true,
            'sitemap_priority' => $data['sitemap_priority'] ?? $priority,
            'sitemap_changefreq' => $data['sitemap_changefreq'] ?? 'weekly',
            'extra_json_ld' => $data['extra_json_ld'] ?? null,
        ];

        if ($cover) {
            $payload['seo_banner_desktop'] = $data['seo_banner_desktop'] ?? $cover;
        }

        return array_filter($payload, fn ($value): bool => ! ($value === null || $value === ''));
    }

    protected function onlyMissingFields(Categ $category, array $payload): array
    {
        return array_filter(
            $payload,
            function ($value, string $field) use ($category): bool {
                if (in_array($field, ['robots_index', 'robots_follow', 'seo_enabled', 'sitemap_include'], true)) {
                    return $category->{$field} === null;
                }

                if ($field === 'canonical_url') {
                    $canonical = trim((string) $category->canonical_url);

                    return $canonical === '' || str_contains($canonical, '/category/');
                }

                $current = $category->{$field};
                if (is_string($current) && trim($current, " \t\n\r\0\x0B\"'") === '[]') {
                    return true;
                }

                return blank($current);
            },
            ARRAY_FILTER_USE_BOTH
        );
    }
}
