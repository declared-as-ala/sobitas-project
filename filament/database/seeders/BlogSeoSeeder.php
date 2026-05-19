<?php

namespace Database\Seeders;

use App\Models\Article;
use Illuminate\Database\Seeder;
use App\Console\Commands\SeoContentData;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Symfony\Component\Console\Output\OutputInterface;

class BlogSeoSeeder extends Seeder
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
        // Only check for force option if command is available and method exists
        try {
            if ($this->command && is_callable([$this->command, 'option'])) {
                return (bool) $this->command->option('force');
            }
        } catch (\Exception $e) {
            // Option doesn't exist or command not available
        }
        return false;
    }

    public function run(): void
    {
        $this->info('📝 Seeding Blog Articles SEO content...');
        
        $articlesData = SeoContentData::getBlogArticlesData();
        $created = 0;
        $skipped = 0;
        $updated = 0;
        
        // Get force option safely - default to false if not available
        $force = false;
        try {
            $force = $this->getForce();
        } catch (\Exception $e) {
            // Ignore - default to false
        }

        foreach ($articlesData as $articleData) {
            $article = Article::where('slug', $articleData['slug'])->first();

            if ($article) {
                if ($force) {
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
                    $this->info("  🔄 Updated: {$article->designation_fr}");
                } else {
                    $skipped++;
                    $this->info("  ⏭️ Skipped (exists): {$article->designation_fr}");
                }
                continue;
            }

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
                    // Valid blog_type values: complements, lifestyle, nutrition, recettes, sport
                    'blog_type' => in_array($articleData['blog_type'], ['complements', 'lifestyle', 'nutrition', 'recettes', 'sport']) 
                        ? $articleData['blog_type'] 
                        : 'complements',
                    'publier' => $articleData['publier'] ?? 0,
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ]);

                $created++;
                $this->info("  ✅ Created: {$article->designation_fr}");
            } catch (\Exception $e) {
                $this->warn("  ⚠️ Error creating {$articleData['title']}: {$e->getMessage()}");
            }
        }

        $this->info('');
        $this->info("📊 Summary:");
        $this->info("  - Articles created: {$created}");
        $this->info("  - Articles updated: {$updated}");
        $this->info("  - Articles skipped (exists): {$skipped}");
    }

    public function runDryRun(): void
    {
        $this->info('📝 DRY RUN - Blog Articles (no changes will be made)');
        
        $articlesData = SeoContentData::getBlogArticlesData();
        $force = $this->getForce();
        
        foreach ($articlesData as $articleData) {
            $article = Article::where('slug', $articleData['slug'])->first();
            
            if ($article) {
                $status = $force ? 'would update' : 'exists (skip)';
                $this->info("  ⏭️ {$status}: {$article->designation_fr}");
            } else {
                $this->info("  ✅ Would create: {$articleData['title']}");
            }
        }
    }
}