<?php

namespace Database\Seeders;

use App\Models\Categ;
use Illuminate\Database\Seeder;
use App\Console\Commands\SeoContentData;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Console\Output\OutputInterface;

class CategorySeoSeeder extends Seeder
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
        $this->info('🏷️ Seeding Category SEO content...');
        
        $categoriesData = SeoContentData::getCategoriesData();
        $updated = 0;
        $skipped = 0;
        $missing = [];
        $force = $this->getForce();

        foreach ($categoriesData as $slug => $data) {
            $category = Categ::where('slug', $slug)->first();

            if (!$category) {
                $category = Categ::where('slug', 'like', '%' . SeoContentData::normalizeSlug($data['name']) . '%')
                    ->first();
            }

            if (!$category) {
                $missing[] = $data['name'];
                $this->warn("  ⚠️ Category not found: {$data['name']} (slug: {$slug})");
                continue;
            }

            if (!$force && filled($category->meta_title)) {
                $skipped++;
                $this->info("  ⏭️ Skipped (already has SEO): {$category->designation_fr}");
                continue;
            }

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
            $this->info("  ✅ Updated: {$category->designation_fr}");
        }

        $this->info('');
        $this->info("📊 Summary:");
        $this->info("  - Categories updated: {$updated}");
        $this->info("  - Categories skipped: {$skipped}");
        
        if (count($missing) > 0) {
            $this->warn("  - Categories not found: " . implode(', ', $missing));
        }
    }

    public function runDryRun(): void
    {
        $this->info('🏷️ DRY RUN - Category SEO content (no changes will be made)');
        
        $categoriesData = SeoContentData::getCategoriesData();
        $force = $this->getForce();
        
        foreach ($categoriesData as $slug => $data) {
            $category = Categ::where('slug', $slug)->first();
            
            if (!$category) {
                $category = Categ::where('slug', 'like', '%' . SeoContentData::normalizeSlug($data['name']) . '%')
                    ->first();
            }

            if (!$category) {
                $this->warn("  ⚠️ Would create: {$data['name']} (slug: {$slug})");
            } elseif (filled($category->meta_title) && !$force) {
                $this->info("  ⏭️ Would skip (has SEO): {$category->designation_fr}");
            } else {
                $this->info("  ✅ Would update: {$category->designation_fr}");
            }
        }
    }
}