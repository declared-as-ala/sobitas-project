<?php

namespace Database\Seeders;

use App\Models\SousCategory;
use Illuminate\Database\Seeder;
use App\Console\Commands\SeoContentData;
use Illuminate\Support\Str;
use Symfony\Component\Console\Output\OutputInterface;

class SousCategorySeoSeeder extends Seeder
{
    protected ?OutputInterface $output = null;

    protected function getOutput(): ?OutputInterface
    {
        if ($this->output === null) {
            $this->output = $this->command ? $this->command->getOutput() : null;
        }
        return $this->output;
    }

    protected function info(string $message): void
    {
        $out = $this->getOutput();
        if ($out) {
            $out->writeln($message);
        }
    }

    protected function warn(string $message): void
    {
        $out = $this->getOutput();
        if ($out) {
            $out->writeln("<comment>{$message}</comment>");
        }
    }

    protected function getForce(): bool
    {
        if ($this->command && method_exists($this->command, 'option')) {
            return $this->command->option('force') ?? false;
        }
        return false;
    }

    public function run(): void
    {
        $this->info('🏷️ Seeding Sous-Category SEO content...');
        
        $sousCategoriesData = SeoContentData::getSousCategoriesData();
        $updated = 0;
        $skipped = 0;
        $missing = [];
        $force = $this->getForce();

        foreach ($sousCategoriesData as $slug => $data) {
            $sousCategory = SousCategory::where('slug', $slug)->first();

            if (!$sousCategory) {
                $normalizedName = SeoContentData::normalizeSlug($data['name']);
                $sousCategory = SousCategory::where('slug', 'like', '%' . $normalizedName . '%')
                    ->first();
            }

            if (!$sousCategory) {
                $sousCategory = SousCategory::where('designation_fr', 'like', '%' . $data['name'] . '%')
                    ->first();
            }

            if (!$sousCategory) {
                $missing[] = $data['name'] . " (slug: {$slug})";
                $this->warn("  ⚠️ Sous-category not found: {$data['name']} (slug: {$slug})");
                continue;
            }

            if (!$force && filled($sousCategory->meta_title)) {
                $skipped++;
                $this->info("  ⏭️ Skipped (already has SEO): {$sousCategory->designation_fr}");
                continue;
            }

            $updateData = [
                'meta_title' => $data['meta_title'],
                'meta_description' => $data['meta_description'],
                'h1_title' => $data['h1_title'],
                'primary_keyword' => $data['primary_keyword'],
                'secondary_keywords' => json_encode($data['secondary_keywords'] ?? []),
                'robots_index' => true,
                'robots_follow' => true,
                'seo_enabled' => true,
                'sitemap_include' => true,
                'sitemap_priority' => 0.80,
                'sitemap_changefreq' => 'weekly',
            ];

            if (isset($data['short_intro']) && filled($data['short_intro'])) {
                $updateData['short_intro'] = $data['short_intro'];
            }

            if (isset($data['long_bottom_content']) && filled($data['long_bottom_content'])) {
                $updateData['long_bottom_content'] = $data['long_bottom_content'];
            }

            if (isset($data['faq']) && is_array($data['faq']) && count($data['faq']) > 0) {
                $updateData['faq'] = json_encode($data['faq']);
            }

            $sousCategory->update($updateData);

            $updated++;
            
            $parentName = $sousCategory->categorie ? $sousCategory->categorie->designation_fr : 'Unknown';
            $this->info("  ✅ Updated: {$sousCategory->designation_fr} ({$parentName})");
        }

        $this->info('');
        $this->info("📊 Summary:");
        $this->info("  - Sous-categories updated: {$updated}");
        $this->info("  - Sous-categories skipped: {$skipped}");
        
        if (count($missing) > 0) {
            $this->warn("  - Sous-categories not found: " . implode(', ', array_slice($missing, 0, 10)));
            if (count($missing) > 10) {
                $this->warn("  ... and " . (count($missing) - 10) . " more");
            }
        }
    }

    public function runDryRun(): void
    {
        $this->info('🏷️ DRY RUN - Sous-Category SEO content (no changes will be made)');
        
        $sousCategoriesData = SeoContentData::getSousCategoriesData();
        $force = $this->getForce();
        
        foreach ($sousCategoriesData as $slug => $data) {
            $sousCategory = SousCategory::where('slug', $slug)->first();
            
            if (!$sousCategory) {
                $normalizedName = SeoContentData::normalizeSlug($data['name']);
                $sousCategory = SousCategory::where('slug', 'like', '%' . $normalizedName . '%')
                    ->first();
            }

            if (!$sousCategory) {
                $this->warn("  ⚠️ Would create: {$data['name']} (slug: {$slug})");
            } elseif (filled($sousCategory->meta_title) && !$force) {
                $this->info("  ⏭️ Would skip (has SEO): {$sousCategory->designation_fr}");
            } else {
                $parentName = $sousCategory->categorie ? $sousCategory->categorie->designation_fr : 'Unknown';
                $this->info("  ✅ Would update: {$sousCategory->designation_fr} ({$parentName})");
            }
        }
    }
}