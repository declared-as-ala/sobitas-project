<?php

namespace App\Console\Commands;

use App\Filament\Support\ImagePath;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AuditMediaIntegrity extends Command
{
    protected $signature = 'media:audit-images
        {--repair : Null broken single-image columns and prune broken gallery entries}
        {--json : Print missing rows as JSON}';

    protected $description = 'Audit product/blog image references against filesystem existence';

    public function handle(): int
    {
        $disk = Storage::disk('public');
        $repair = (bool) $this->option('repair');

        $missing = [];
        $checked = 0;
        $repaired = 0;

        // Products: cover
        DB::table('products')->select('id', 'cover')->orderBy('id')->chunkById(500, function ($rows) use ($disk, $repair, &$missing, &$checked, &$repaired): void {
            foreach ($rows as $row) {
                $checked++;
                $path = ImagePath::normalize($row->cover);
                if (! $path) {
                    continue;
                }
                if (! $disk->exists($path)) {
                    $missing[] = ['table' => 'products', 'id' => (int) $row->id, 'column' => 'cover', 'path' => $path];
                    if ($repair) {
                        DB::table('products')->where('id', $row->id)->update(['cover' => null]);
                        $repaired++;
                    }
                }
            }
        });

        // Products: gallery images (JSON array)
        DB::table('products')->select('id', 'images')->orderBy('id')->chunkById(500, function ($rows) use ($disk, $repair, &$missing, &$checked, &$repaired): void {
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
                $kept = [];

                foreach ($normalized as $path) {
                    $checked++;
                    if ($disk->exists($path)) {
                        $kept[] = $path;
                        continue;
                    }
                    $missing[] = ['table' => 'products', 'id' => (int) $row->id, 'column' => 'images[]', 'path' => $path];
                }

                if ($repair && count($kept) !== count($normalized)) {
                    DB::table('products')->where('id', $row->id)->update(['images' => json_encode(array_values($kept), JSON_UNESCAPED_SLASHES)]);
                    $repaired++;
                }
            }
        });

        // Articles: cover
        DB::table('articles')->select('id', 'cover')->orderBy('id')->chunkById(500, function ($rows) use ($disk, $repair, &$missing, &$checked, &$repaired): void {
            foreach ($rows as $row) {
                $checked++;
                $path = ImagePath::normalize($row->cover);
                if (! $path) {
                    continue;
                }
                if (! $disk->exists($path)) {
                    $missing[] = ['table' => 'articles', 'id' => (int) $row->id, 'column' => 'cover', 'path' => $path];
                    if ($repair) {
                        DB::table('articles')->where('id', $row->id)->update(['cover' => null]);
                        $repaired++;
                    }
                }
            }
        });

        $this->info("Checked paths: {$checked}");
        $this->warn('Missing paths: ' . count($missing));
        if ($repair) {
            $this->info("Records repaired: {$repaired}");
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
}

