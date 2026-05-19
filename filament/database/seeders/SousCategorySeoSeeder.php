<?php

namespace Database\Seeders;

use App\Models\SousCategory;
use Illuminate\Database\Seeder;
use App\Console\Commands\SeoContentData;
use Illuminate\Support\Str;

class SousCategorySeoSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🏷️ Seeding Sous-Category SEO content...');
        
        $sousCategoriesData = SeoContentData::getSousCategoriesData();
        $updated = 0;
        $skipped = 0;
        $missing = [];

        foreach ($sousCategoriesData as $slug => $data) {
            // Find sous-category by slug
            $sousCategory = SousCategory::where('slug', $slug)->first();

            if (!$sousCategory) {
                // Try to find by normalized name
                $normalizedName = SeoContentData::normalizeSlug($data['name']);
                $sousCategory = SousCategory::where('slug', 'like', '%' . $normalizedName . '%')
                    ->first();
            }

            if (!$sousCategory) {
                // Try partial match on designation
                $sousCategory = SousCategory::where('designation_fr', 'like', '%' . $data['name'] . '%')
                    ->first();
            }

            if (!$sousCategory) {
                $missing[] = $data['name'] . " (slug: {$slug})";
                $this->command->warn("  ⚠️ Sous-category not found: {$data['name']} (slug: {$slug})");
                continue;
            }

            // Check if SEO content already exists (only update if empty)
            $force = $this->command->option('force') ?? false;

            if (!$force && filled($sousCategory->meta_title)) {
                $skipped++;
                $this->command->info("  ⏭️ Skipped (already has SEO): {$sousCategory->designation_fr}");
                continue;
            }

            // Build SEO content
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

            // Add content fields if present
            if (isset($data['short_intro']) && filled($data['short_intro'])) {
                $updateData['short_intro'] = $data['short_intro'];
            }

            if (isset($data['long_bottom_content']) && filled($data['long_bottom_content'])) {
                $updateData['long_bottom_content'] = $data['long_bottom_content'];
            }

            // Add FAQ if present and model supports it
            if (isset($data['faq']) && is_array($data['faq']) && count($data['faq']) > 0) {
                $updateData['faq'] = json_encode($data['faq']);
            }

            // Update the record
            $sousCategory->update($updateData);

            $updated++;
            
            $parentName = $sousCategory->categorie ? $sousCategory->categorie->designation_fr : 'Unknown';
            $this->command->info("  ✅ Updated: {$sousCategory->designation_fr} ({$parentName})");
        }

        $this->command->info('');
        $this->command->info("📊 Summary:");
        $this->command->info("  - Sous-categories updated: {$updated}");
        $this->command->info("  - Sous-categories skipped: {$skipped}");
        
        if (count($missing) > 0) {
            $this->command->warn("  - Sous-categories not found: " . implode(', ', array_slice($missing, 0, 10)));
            if (count($missing) > 10) {
                $this->command->warn("  ... and " . (count($missing) - 10) . " more");
            }
        }
    }

    public function runDryRun(): void
    {
        $this->command->info('🏷️ DRY RUN - Sous-Category SEO content (no changes will be made)');
        
        $sousCategoriesData = SeoContentData::getSousCategoriesData();
        
        foreach ($sousCategoriesData as $slug => $data) {
            $sousCategory = SousCategory::where('slug', $slug)->first();
            
            if (!$sousCategory) {
                $normalizedName = SeoContentData::normalizeSlug($data['name']);
                $sousCategory = SousCategory::where('slug', 'like', '%' . $normalizedName . '%')
                    ->first();
            }

            if (!$sousCategory) {
                $this->command->warn("  ⚠️ Would create: {$data['name']} (slug: {$slug})");
            } elseif (filled($sousCategory->meta_title) && !($this->command->option('force') ?? false)) {
                $this->command->info("  ⏭️ Would skip (has SEO): {$sousCategory->designation_fr}");
            } else {
                $parentName = $sousCategory->categorie ? $sousCategory->categorie->designation_fr : 'Unknown';
                $this->command->info("  ✅ Would update: {$sousCategory->designation_fr} ({$parentName})");
            }
        }
    }
}