<?php

namespace Database\Seeders;

use App\Models\Article;
use Illuminate\Database\Seeder;
use App\Console\Commands\SeoContentData;
use Illuminate\Support\Str;
use Carbon\Carbon;

class BlogSeoSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('📝 Seeding Blog Articles SEO content...');
        
        $articlesData = SeoContentData::getBlogArticlesData();
        $created = 0;
        $skipped = 0;
        $updated = 0;

        $force = $this->command->option('force') ?? false;

        foreach ($articlesData as $articleData) {
            // Check if article already exists by slug
            $article = Article::where('slug', $articleData['slug'])->first();

            if ($article) {
                if ($force) {
                    // Update existing article
                    $article->update([
                        'designation_fr' => $articleData['title'],
                        'description_fr' => $articleData['description'],
                        'description' => $articleData['description'],
                        'meta_title' => $articleData['seo_title'] ?? $articleData['title'],
                        'meta_description_fr' => $articleData['seo_description'] ?? $articleData['excerpt'],
                        'meta_description' => $articleData['seo_description'] ?? $articleData['excerpt'],
                        'seo_title' => $articleData['seo_title'] ?? null,
                        'seo_description' => $articleData['seo_description'] ?? null,
                        'related_shop_category_slugs' => json_encode($articleData['related_category_slugs'] ?? []),
                        'blog_type' => $articleData['blog_type'] ?? null,
                        'publier' => $articleData['publier'] ?? 0,
                    ]);
                    $updated++;
                    $this->command->info("  🔄 Updated: {$article->designation_fr}");
                } else {
                    $skipped++;
                    $this->command->info("  ⏭️ Skipped (exists): {$article->designation_fr}");
                }
                continue;
            }

            // Check if we should only update existing (no creation)
            if ($this->command->option('only-update') ?? false) {
                continue;
            }

            // Create new article
            try {
                $article = Article::create([
                    'designation_fr' => $articleData['title'],
                    'slug' => $articleData['slug'],
                    'description_fr' => $articleData['description'],
                    'description' => $articleData['description'],
                    'excerpt' => $articleData['excerpt'],
                    'meta_title' => $articleData['seo_title'] ?? $articleData['title'],
                    'meta_description_fr' => $articleData['seo_description'] ?? $articleData['excerpt'],
                    'meta_description' => $articleData['seo_description'] ?? $articleData['excerpt'],
                    'seo_title' => $articleData['seo_title'] ?? null,
                    'seo_description' => $articleData['seo_description'] ?? null,
                    'seo_robots_index' => true,
                    'seo_robots_follow' => true,
                    'related_shop_category_slugs' => json_encode($articleData['related_category_slugs'] ?? []),
                    'blog_type' => $articleData['blog_type'] ?? 'article',
                    'publier' => $articleData['publier'] ?? 0,
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ]);

                $created++;
                $this->command->info("  ✅ Created: {$article->designation_fr}");
            } catch (\Exception $e) {
                $this->command->warn("  ⚠️ Error creating {$articleData['title']}: {$e->getMessage()}");
            }
        }

        $this->command->info('');
        $this->command->info("📊 Summary:");
        $this->command->info("  - Articles created: {$created}");
        $this->command->info("  - Articles updated: {$updated}");
        $this->command->info("  - Articles skipped (exists): {$skipped}");
    }

    public function runDryRun(): void
    {
        $this->command->info('📝 DRY RUN - Blog Articles (no changes will be made)');
        
        $articlesData = SeoContentData::getBlogArticlesData();
        
        foreach ($articlesData as $articleData) {
            $article = Article::where('slug', $articleData['slug'])->first();
            
            if ($article) {
                $status = ($this->command->option('force') ?? false) ? 'would update' : 'exists (skip)';
                $this->command->info("  ⏭️ {$status}: {$article->designation_fr}");
            } else {
                $this->command->info("  ✅ Would create: {$articleData['title']}");
            }
        }
    }
}