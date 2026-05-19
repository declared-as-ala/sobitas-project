<?php

namespace Database\Seeders;

use App\Models\Categ;
use Illuminate\Database\Seeder;
use App\Console\Commands\SeoContentData;
use Illuminate\Support\Facades\DB;

class CategorySeoSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🏷️ Seeding Category SEO content...');
        
        $categoriesData = SeoContentData::getCategoriesData();
        $updated = 0;
        $skipped = 0;
        $missing = [];

        foreach ($categoriesData as $slug => $data) {
            // Find category by slug
            $category = Categ::where('slug', $slug)->first();

            if (!$category) {
                // Try to find by normalized name
                $category = Categ::where('slug', 'like', '%' . SeoContentData::normalizeSlug($data['name']) . '%')
                    ->first();
            }

            if (!$category) {
                $missing[] = $data['name'];
                $this->command->warn("  ⚠️ Category not found: {$data['name']} (slug: {$slug})");
                continue;
            }

            // Check if SEO content already exists (only update if empty)
            $force = $this->command->option('force') ?? false;

            if (!$force && filled($category->meta_title)) {
                $skipped++;
                $this->command->info("  ⏭️ Skipped (already has SEO): {$category->designation_fr}");
                continue;
            }

            // Update SEO fields
            $category->update([
                'meta_title' => $data['meta_title'],
                'meta_description' => $data['meta_description'],
                'h1_title' => $data['h1_title'],
                'primary_keyword' => $data['primary_keyword'],
                'secondary_keywords' => json_encode($data['secondary_keywords'] ?? []),
                'short_intro' => $data['short_intro'] ?? null,
                'long_bottom_content' => $data['long_bottom_content'] ?? null,
                'robots_index' => true,
                'robots_follow' => true,
                'seo_enabled' => true,
                'sitemap_include' => true,
                'sitemap_priority' => 0.85,
                'sitemap_changefreq' => 'weekly',
            ]);

            $updated++;
            $this->command->info("  ✅ Updated: {$category->designation_fr}");
        }

        $this->command->info('');
        $this->command->info("📊 Summary:");
        $this->command->info("  - Categories updated: {$updated}");
        $this->command->info("  - Categories skipped: {$skipped}");
        
        if (count($missing) > 0) {
            $this->command->warn("  - Categories not found: " . implode(', ', $missing));
        }
    }

    public function runDryRun(): void
    {
        $this->command->info('🏷️ DRY RUN - Category SEO content (no changes will be made)');
        
        $categoriesData = SeoContentData::getCategoriesData();
        
        foreach ($categoriesData as $slug => $data) {
            $category = Categ::where('slug', $slug)->first();
            
            if (!$category) {
                $category = Categ::where('slug', 'like', '%' . SeoContentData::normalizeSlug($data['name']) . '%')
                    ->first();
            }

            if (!$category) {
                $this->command->warn("  ⚠️ Would create: {$data['name']} (slug: {$slug})");
            } elseif (filled($category->meta_title) && !($this->command->option('force') ?? false)) {
                $this->command->info("  ⏭️ Would skip (has SEO): {$category->designation_fr}");
            } else {
                $this->command->info("  ✅ Would update: {$category->designation_fr}");
            }
        }
    }
}