<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Database\Seeders\CategorySeoSeeder;
use Database\Seeders\SousCategorySeoSeeder;
use Database\Seeders\BlogSeoSeeder;

class SeedSeoContentCommand extends Command
{
    protected $signature = 'seo:seed-content 
                            {--dry-run : Show what would be seeded without making changes}
                            {--force : Overwrite existing SEO content}
                            {--only= : Seed only specific type (categories, souscategories, blog, all)}
                            {--type= : Alias for --only}';

    protected $description = 'Seed SEO content for categories, sous-categories, and blog articles';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $force = $this->option('force');
        $type = $this->option('only') ?? $this->option('type') ?? 'all';

        if ($dryRun) {
            $this->info('🔍 Running in DRY RUN mode - no changes will be made');
            $this->info('');
        }

        if ($force) {
            $this->warn('⚠️ Force mode enabled - existing SEO content will be overwritten');
            $this->info('');
        }

        // Validate type option
        $validTypes = ['all', 'categories', 'souscategories', 'blog'];
        if (!in_array($type, $validTypes)) {
            $this->error("Invalid type: {$type}. Valid types: " . implode(', ', $validTypes));
            return self::FAILURE;
        }

        $this->info('═══════════════════════════════════════════════════════════════');
        $this->info('         SEO CONTENT SEEDER - Protein.tn');
        $this->info('═══════════════════════════════════════════════════════════════');
        $this->info('');

        $results = [
            'categories' => ['updated' => 0, 'skipped' => 0],
            'souscategories' => ['updated' => 0, 'skipped' => 0],
            'blog' => ['created' => 0, 'skipped' => 0],
        ];

        // Seed Categories
        if (in_array($type, ['all', 'categories'])) {
            $this->seedCategories($dryRun, $force);
        }

        // Seed Sous-Categories  
        if (in_array($type, ['all', 'souscategories'])) {
            $this->seedSousCategories($dryRun, $force);
        }

        // Seed Blog Articles
        if (in_array($type, ['all', 'blog'])) {
            $this->seedBlog($dryRun, $force);
        }

        $this->info('');
        $this->info('═══════════════════════════════════════════════════════════════');
        $this->info('                      COMPLETED');
        $this->info('═══════════════════════════════════════════════════════════════');

        return self::SUCCESS;
    }

    protected function seedCategories(bool $dryRun, bool $force): void
    {
        $this->info('');
        $this->info('═══════════════════════════════════════════════════════════════');
        $this->info(' 1️⃣  CATEGORIES SEO CONTENT');
        $this->info('═══════════════════════════════════════════════════════════════');

        if ($dryRun) {
            $seeder = new CategorySeoSeeder($this->output);
            $seeder->runDryRun();
        } else {
            $this->call('db:seed', [
                '--class' => CategorySeoSeeder::class,
                '--force' => $force,
            ]);
        }
    }

    protected function seedSousCategories(bool $dryRun, bool $force): void
    {
        $this->info('');
        $this->info('═══════════════════════════════════════════════════════════════');
        $this->info(' 2️⃣  SOUS-CATEGORIES SEO CONTENT');
        $this->info('═══════════════════════════════════════════════════════════════');

        if ($dryRun) {
            $seeder = new SousCategorySeoSeeder($this->output);
            $seeder->runDryRun();
        } else {
            $this->call('db:seed', [
                '--class' => SousCategorySeoSeeder::class,
                '--force' => $force,
            ]);
        }
    }

    protected function seedBlog(bool $dryRun, bool $force): void
    {
        $this->info('');
        $this->info('═══════════════════════════════════════════════════════════════');
        $this->info(' 3️⃣  BLOG ARTICLES SEO CONTENT');
        $this->info('═══════════════════════════════════════════════════════════════');

        if ($dryRun) {
            $seeder = new BlogSeoSeeder($this->output);
            $seeder->runDryRun();
        } else {
            $this->call('db:seed', [
                '--class' => BlogSeoSeeder::class,
                '--force' => $force,
            ]);
        }
    }
}