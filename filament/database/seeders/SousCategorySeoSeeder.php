<?php

namespace Database\Seeders;

use App\Console\Commands\SeoContentData;
use App\Models\SousCategory;
use Illuminate\Console\Command as ConsoleCommand;
use Illuminate\Database\Seeder;
use Symfony\Component\Console\Output\OutputInterface;

class SousCategorySeoSeeder extends Seeder
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
        $this->info('Seeding sous-category SEO content...');

        $sousCategoriesData = SeoContentData::getSousCategoriesData();
        $updated = 0;
        $skipped = 0;
        $missing = [];
        $force = $this->getForce();
        $handledIds = [];

        foreach ($sousCategoriesData as $slug => $data) {
            $sousCategory = SousCategory::with('categorie')->where('slug', $slug)->first();

            if (! $sousCategory) {
                $normalizedName = SeoContentData::normalizeSlug($data['name']);
                $sousCategory = SousCategory::with('categorie')
                    ->where('slug', 'like', '%'.$normalizedName.'%')
                    ->first();
            }

            if (! $sousCategory) {
                $sousCategory = SousCategory::with('categorie')
                    ->where('designation_fr', 'like', '%'.$data['name'].'%')
                    ->first();
            }

            if (! $sousCategory) {
                $missing[] = $data['name']." (slug: {$slug})";
                $this->warn("  Sous-category not found: {$data['name']} (slug: {$slug})");
                continue;
            }

            $handledIds[] = $sousCategory->id;
            $data = SeoContentData::buildCompleteSeoData(
                $slug,
                $data['name'],
                $data,
                'subcategory',
                $sousCategory->categorie?->designation_fr
            );
            $updateData = $this->seoUpdatePayload($data, 0.80, $sousCategory->cover);
            if (! $force) {
                $updateData = $this->onlyMissingFields($sousCategory, $updateData);
            }

            if ($updateData === []) {
                $skipped++;
                $this->info("  Skipped (SEO complete): {$sousCategory->designation_fr}");
                continue;
            }

            $sousCategory->update($updateData);
            $updated++;
            $parentName = $sousCategory->categorie?->designation_fr ?? 'Unknown';
            $this->info("  Updated: {$sousCategory->designation_fr} ({$parentName})");
        }

        SousCategory::query()
            ->with('categorie')
            ->when($handledIds !== [], fn ($query) => $query->whereNotIn('id', $handledIds))
            ->orderBy('designation_fr')
            ->get()
            ->each(function (SousCategory $sousCategory) use (&$updated, &$skipped, $force): void {
                $data = SeoContentData::buildCompleteSeoData(
                    (string) $sousCategory->slug,
                    (string) $sousCategory->designation_fr,
                    [],
                    'subcategory',
                    $sousCategory->categorie?->designation_fr
                );
                $updateData = $this->seoUpdatePayload($data, 0.80, $sousCategory->cover);
                if (! $force) {
                    $updateData = $this->onlyMissingFields($sousCategory, $updateData);
                }

                if ($updateData === []) {
                    $skipped++;
                    $this->info("  Skipped (SEO complete): {$sousCategory->designation_fr}");
                    return;
                }

                $sousCategory->update($updateData);
                $updated++;
                $parentName = $sousCategory->categorie?->designation_fr ?? 'Unknown';
                $this->info("  Updated generic SEO: {$sousCategory->designation_fr} ({$parentName})");
            });

        $this->info('');
        $this->info('Summary:');
        $this->info("  - Sous-categories updated: {$updated}");
        $this->info("  - Sous-categories skipped: {$skipped}");

        if ($missing !== []) {
            $this->warn('  - Seed data sous-categories not found: '.implode(', ', array_slice($missing, 0, 10)));
            if (count($missing) > 10) {
                $this->warn('  ... and '.(count($missing) - 10).' more');
            }
        }
    }

    public function runDryRun(): void
    {
        $this->info('DRY RUN - Sous-category SEO content (no changes will be made)');

        $sousCategoriesData = SeoContentData::getSousCategoriesData();
        $handledIds = [];
        $force = $this->getForce();

        foreach ($sousCategoriesData as $slug => $data) {
            $sousCategory = SousCategory::with('categorie')->where('slug', $slug)->first();

            if (! $sousCategory) {
                $normalizedName = SeoContentData::normalizeSlug($data['name']);
                $sousCategory = SousCategory::with('categorie')->where('slug', 'like', '%'.$normalizedName.'%')->first();
            }

            if (! $sousCategory) {
                $this->warn("  Would use generic fallback if sous-category exists later: {$data['name']} (slug: {$slug})");
                continue;
            }

            $handledIds[] = $sousCategory->id;
            $payload = $this->seoUpdatePayload(
                SeoContentData::buildCompleteSeoData(
                    $slug,
                    $data['name'],
                    $data,
                    'subcategory',
                    $sousCategory->categorie?->designation_fr
                ),
                0.80,
                $sousCategory->cover
            );
            $missing = $force ? $payload : $this->onlyMissingFields($sousCategory, $payload);
            $parentName = $sousCategory->categorie?->designation_fr ?? 'Unknown';
            $this->info($missing === []
                ? "  Would skip (SEO complete): {$sousCategory->designation_fr} ({$parentName})"
                : "  Would update: {$sousCategory->designation_fr} ({$parentName})");
        }

        SousCategory::query()
            ->with('categorie')
            ->when($handledIds !== [], fn ($query) => $query->whereNotIn('id', $handledIds))
            ->orderBy('designation_fr')
            ->get()
            ->each(function (SousCategory $sousCategory): void {
                $parentName = $sousCategory->categorie?->designation_fr ?? 'Unknown';
                $this->info("  Would ensure generic SEO: {$sousCategory->designation_fr} ({$parentName})");
            });
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
            'alt_cover' => $data['alt_cover'] ?? null,
            'description_cover' => $data['description_cover'] ?? null,
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

    protected function onlyMissingFields(SousCategory $sousCategory, array $payload): array
    {
        return array_filter(
            $payload,
            function ($value, string $field) use ($sousCategory): bool {
                if (in_array($field, ['robots_index', 'robots_follow', 'seo_enabled', 'sitemap_include'], true)) {
                    return $sousCategory->{$field} === null;
                }

                if ($field === 'canonical_url') {
                    $canonical = trim((string) $sousCategory->canonical_url);

                    return $canonical === '' || str_contains($canonical, '/category/');
                }

                $current = $sousCategory->{$field};
                if (is_string($current) && trim($current, " \t\n\r\0\x0B\"'") === '[]') {
                    return true;
                }

                return blank($current);
            },
            ARRAY_FILTER_USE_BOTH
        );
    }
}
