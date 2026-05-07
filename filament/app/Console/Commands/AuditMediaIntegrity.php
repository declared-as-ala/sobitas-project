<?php

namespace App\Console\Commands;

use App\Filament\Support\ImagePath;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class AuditMediaIntegrity extends Command
{
    protected $signature = 'media:audit-images
        {--apply-path-fix : Apply safe products/* -> produits/* DB path fixes when target exists}
        {--only-table= : Scan only one table (products, articles, brands, categs, slides, pages, annonces)}
        {--json : Print missing rows as JSON}';

    protected $description = 'Audit all media DB references and detect products/ vs produits/ mismatches';

    public function handle(): int
    {
        $disk = Storage::disk('public');
        $applyFix = (bool) $this->option('apply-path-fix');
        $only = $this->option('only-table');

        $missing = [];
        $checked = 0;
        $fixed = 0;
        $prefixStats = [
            'products/' => 0,
            'produits/' => 0,
            'other' => 0,
        ];

        $singleFields = [
            'products' => ['cover'],
            'articles' => ['cover'],
            'brands' => ['logo'],
            'categs' => ['cover'],
            'slides' => ['image'],
            'pages' => ['image'],
            'annonces' => ['image'],
        ];

        foreach ($singleFields as $table => $columns) {
            if ($only && $only !== $table) {
                continue;
            }
            if (! Schema::hasTable($table)) {
                continue;
            }
            foreach ($columns as $column) {
                if (! Schema::hasColumn($table, $column)) {
                    continue;
                }
                DB::table($table)->select('id', $column)->orderBy('id')->chunkById(500, function ($rows) use (
                    $disk,
                    $table,
                    $column,
                    $applyFix,
                    &$missing,
                    &$checked,
                    &$fixed,
                    &$prefixStats
                ): void {
                    foreach ($rows as $row) {
                        $path = ImagePath::normalize((string) ($row->{$column} ?? ''));
                        if (! $path) {
                            continue;
                        }
                        $checked++;
                        $this->bumpPrefixStats($path, $prefixStats);
                        if ($disk->exists($path)) {
                            continue;
                        }
                        $fallback = $this->productsToProduitsCandidate($path);
                        $fallbackExists = $fallback !== null && $disk->exists($fallback);
                        $missing[] = [
                            'table' => $table,
                            'id' => (int) $row->id,
                            'column' => $column,
                            'path' => $path,
                            'fallback_candidate' => $fallback,
                            'fallback_exists' => $fallbackExists,
                        ];
                        if ($applyFix && $fallbackExists) {
                            DB::table($table)->where('id', $row->id)->update([$column => $fallback]);
                            $fixed++;
                        }
                    }
                });
            }
        }

        // products.images JSON gallery
        if ((! $only || $only === 'products') && Schema::hasTable('products') && Schema::hasColumn('products', 'images')) {
            DB::table('products')->select('id', 'images')->orderBy('id')->chunkById(500, function ($rows) use (
                $disk,
                $applyFix,
                &$missing,
                &$checked,
                &$fixed,
                &$prefixStats
            ): void {
                foreach ($rows as $row) {
                    $images = [];
                    if (is_string($row->images) && $row->images !== '') {
                        $decoded = json_decode($row->images, true);
                        $images = is_array($decoded) ? $decoded : [];
                    } elseif (is_array($row->images)) {
                        $images = $row->images;
                    }
                    if ($images === []) {
                        continue;
                    }

                    $normalized = ImagePath::normalizeArray($images);
                    $rewritten = [];
                    $changed = false;
                    foreach ($normalized as $path) {
                        $checked++;
                        $this->bumpPrefixStats($path, $prefixStats);
                        if ($disk->exists($path)) {
                            $rewritten[] = $path;
                            continue;
                        }
                        $fallback = $this->productsToProduitsCandidate($path);
                        $fallbackExists = $fallback !== null && $disk->exists($fallback);
                        $missing[] = [
                            'table' => 'products',
                            'id' => (int) $row->id,
                            'column' => 'images[]',
                            'path' => $path,
                            'fallback_candidate' => $fallback,
                            'fallback_exists' => $fallbackExists,
                        ];
                        if ($applyFix && $fallbackExists) {
                            $rewritten[] = $fallback;
                            $changed = true;
                        } else {
                            $rewritten[] = $path;
                        }
                    }
                    if ($applyFix && $changed) {
                        DB::table('products')->where('id', $row->id)->update([
                            'images' => json_encode(array_values($rewritten), JSON_UNESCAPED_SLASHES),
                        ]);
                        $fixed++;
                    }
                }
            });
        }

        $this->info("Checked paths: {$checked}");
        $this->warn('Missing paths: ' . count($missing));
        $this->line('Prefix stats: ' . json_encode($prefixStats, JSON_UNESCAPED_SLASHES));
        if ($applyFix) {
            $this->info("Safe path fixes applied: {$fixed}");
        }

        if ($this->option('json')) {
            $this->line(json_encode($missing, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        } else {
            foreach (array_slice($missing, 0, 200) as $item) {
                $this->line(sprintf(
                    '[%s#%d] %s => %s',
                    $item['table'],
                    $item['id'],
                    $item['column'],
                    $item['path']
                ));
            }
            if (count($missing) > 200) {
                $this->line('... truncated, use --json for full report');
            }
        }

        return self::SUCCESS;
    }

    /**
     * @param array{products/: int, produits/: int, other: int} $stats
     */
    private function bumpPrefixStats(string $path, array &$stats): void
    {
        if (str_starts_with($path, 'products/')) {
            $stats['products/']++;
            return;
        }
        if (str_starts_with($path, 'produits/')) {
            $stats['produits/']++;
            return;
        }
        $stats['other']++;
    }

    private function productsToProduitsCandidate(string $path): ?string
    {
        if (! str_starts_with($path, 'products/')) {
            return null;
        }

        return 'produits/' . substr($path, strlen('products/'));
    }
}

