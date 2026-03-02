<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class SyncMigrations extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:sync-migrations';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync migration history for existing tables (skips creation if table exists)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $migrations = [
            '2014_10_12_000000_create_users_table' => 'users',
            '2014_10_12_100000_create_password_reset_tokens_table' => 'password_reset_tokens',
            '2019_08_19_000000_create_failed_jobs_table' => 'failed_jobs',
            '2019_12_14_000001_create_personal_access_tokens_table' => 'personal_access_tokens',
            '2021_12_13_055514_create_media_table' => 'media',
            '2022_09_10_131605_create_notifications_table' => 'notifications',
            '2023_11_29_144716_create_job_batches_table' => 'job_batches',
            '2023_11_29_144720_create_imports_table' => 'imports',
            '2023_11_29_144721_create_failed_import_rows_table' => 'failed_import_rows',
            '2024_01_01_105157_create_exports_table' => 'exports',
        ];

        $this->info('Starting migration synchronization...');

        $batch = DB::table('migrations')->max('batch') + 1;

        foreach ($migrations as $migration => $table) {
            if (Schema::hasTable($table)) {
                $exists = DB::table('migrations')->where('migration', $migration)->exists();
                
                if (!$exists) {
                    DB::table('migrations')->insert([
                        'migration' => $migration,
                        'batch' => $batch
                    ]);
                    $this->info("Synced existing table: {$table} -> {$migration}");
                } else {
                    $this->line("Skipping {$table}: Migration already recorded.");
                }
            } else {
                $this->warn("Table {$table} does not exist. Migration {$migration} will run normally via 'php artisan migrate'.");
            }
        }

        $this->info('Migration synchronization complete.');
    }
}
