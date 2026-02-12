<?php

namespace App\Console\Commands;

use App\Models\Article;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use CloudinaryLabs\CloudinaryLaravel\Facades\Cloudinary;

class MigrateImagesToCloudinary extends Command
{
    protected $signature = 'images:migrate-to-cloudinary 
                            {--dry-run : Show what would be migrated without actually uploading}
                            {--limit= : Limit number of articles to process}';

    protected $description = 'Migrate article cover images from local storage to Cloudinary';

    public function handle()
    {
        $dryRun = $this->option('dry-run');
        $limit = $this->option('limit') ? (int) $this->option('limit') : null;

        $this->info('🔄 Starting image migration to Cloudinary...');
        $this->newLine();

        // Check Cloudinary config
        if (!config('cloudinary.cloud_name')) {
            $this->error('❌ Cloudinary not configured! Please set CLOUDINARY_URL in .env');
            return 1;
        }

        $this->info('✓ Cloudinary configured: ' . config('cloudinary.cloud_name'));
        $this->newLine();

        // Get articles with cover images
        $query = Article::whereNotNull('cover')
            ->where('cover', '!=', '')
            ->where('cover', 'not like', 'http%'); // Skip already migrated

        if ($limit) {
            $query->limit($limit);
        }

        $articles = $query->get();
        $total = $articles->count();

        if ($total === 0) {
            $this->info('ℹ️  No articles with local images found.');
            return 0;
        }

        $this->info("Found {$total} articles to migrate");
        $this->newLine();

        if ($dryRun) {
            $this->warn('🔍 DRY RUN MODE - No files will be uploaded');
            $this->newLine();
        }

        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $success = 0;
        $skipped = 0;
        $failed = 0;

        foreach ($articles as $article) {
            try {
                $coverPath = $article->cover;

                // Skip if already a Cloudinary URL
                if (str_starts_with($coverPath, 'http://') || str_starts_with($coverPath, 'https://')) {
                    $skipped++;
                    $bar->advance();
                    continue;
                }

                // Check if file exists locally
                $localPath = storage_path('app/public/' . ltrim($coverPath, '/'));
                if (!file_exists($localPath)) {
                    $this->newLine();
                    $this->warn("⚠️  File not found: {$coverPath} (Article ID: {$article->id})");
                    $failed++;
                    $bar->advance();
                    continue;
                }

                if ($dryRun) {
                    $this->newLine();
                    $this->line("Would upload: {$coverPath} → articles/{$article->id}_{$article->slug}");
                    $success++;
                } else {
                    // Upload to Cloudinary
                    $publicId = "articles/{$article->id}_{$article->slug}";
                    
                    $uploaded = Cloudinary::upload($localPath, [
                        'folder' => 'articles',
                        'public_id' => $publicId,
                        'overwrite' => false,
                        'resource_type' => 'image',
                    ]);

                    // Update article with Cloudinary public_id
                    $article->cover = $uploaded->getPublicId();
                    $article->save();

                    $success++;
                }

                $bar->advance();
            } catch (\Exception $e) {
                $this->newLine();
                $this->error("❌ Failed to migrate Article ID {$article->id}: " . $e->getMessage());
                $failed++;
                $bar->advance();
            }
        }

        $bar->finish();
        $this->newLine(2);

        // Summary
        $this->info('📊 Migration Summary:');
        $this->table(
            ['Status', 'Count'],
            [
                ['✅ Success', $success],
                ['⏭️  Skipped', $skipped],
                ['❌ Failed', $failed],
                ['📦 Total', $total],
            ]
        );

        if ($dryRun) {
            $this->newLine();
            $this->info('💡 Run without --dry-run to actually upload images');
        }

        return 0;
    }
}
