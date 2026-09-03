<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/** A fixed six-file release. Never scans or deletes arbitrary storage uploads. */
final class CampaignArtwork20260903
{
    public const DIRECTORY = 'slide-assets/2026-09-03-natural';

    public const ARCHIVE = 'campaign-archives/2026-09-03-natural';

    public const CAMPAIGNS = [
        [
            'name' => 'returns',
            'link' => '/politique-de-remboursement',
            'old' => [
                'image' => 'slides/protein-returns-desktop-20260902-v6.webp',
                'image_mobile' => 'slides/protein-returns-mobile-20260902-v6.webp',
            ],
        ],
        [
            'name' => 'pack-builder',
            'link' => '/pack-builder',
            'old' => [
                'image' => 'slides/protein-pack-builder-desktop-20260902-v6.webp',
                'image_mobile' => 'slides/protein-pack-builder-mobile-20260902-v6.webp',
            ],
        ],
        [
            'name' => 'welcome-bonus',
            'link' => '/register?offer=welcome-15',
            'old' => [
                'image' => 'slides/welcome-bonus-desktop-v1.webp',
                'image_mobile' => 'slides/welcome-bonus-mobile-v1.webp',
            ],
        ],
    ];

    public static function target(string $name, string $field): string
    {
        $format = $field === 'image' ? 'desktop' : 'mobile';

        return "slides/protein-{$name}-{$format}-20260903-natural.webp";
    }

    public static function source(string $name, string $field): string
    {
        $format = $field === 'image' ? 'desktop' : 'mobile';

        return resource_path(self::DIRECTORY."/{$name}-{$format}.webp");
    }

    public static function install(): void
    {
        // Complete all copies and checksum checks before switching a single database reference.
        foreach (self::CAMPAIGNS as $campaign) {
            foreach ($campaign['old'] as $field => $old) {
                $source = self::source($campaign['name'], $field);
                $bytes = @file_get_contents($source);
                $size = $bytes === false ? false : @getimagesizefromstring($bytes);
                if ($bytes === false || ! $size || ($size['mime'] ?? '') !== 'image/webp') {
                    throw new RuntimeException("Missing or invalid campaign master: {$source}");
                }
                self::putVerified('public', self::target($campaign['name'], $field), $bytes);
                if (Storage::disk('public')->exists($old)) {
                    self::putVerified('local', self::ARCHIVE.'/'.basename($old), Storage::disk('public')->get($old));
                }
            }
        }

        DB::transaction(function (): void {
            foreach (self::CAMPAIGNS as $campaign) {
                $rows = DB::table('slides')->where('lien', $campaign['link'])->lockForUpdate()->get();
                if ($rows->count() !== 1) {
                    throw new RuntimeException('Expected exactly one slide for '.$campaign['link']);
                }
                $slide = $rows->first();
                $changes = [];
                foreach ($campaign['old'] as $field => $old) {
                    $target = self::target($campaign['name'], $field);
                    if (! in_array($slide->{$field}, [$old, $target], true)) {
                        throw new RuntimeException('Campaign was edited independently; refusing to overwrite it.');
                    }
                    $changes[$field] = $target;
                }
                // Keep IDs, order, links, alt descriptions and active status exactly as configured.
                DB::table('slides')->where('id', $slide->id)->update($changes + ['updated_at' => now()]);
            }
        });
        ApiResponseCache::forget('slides');
    }

    /** Run only after storefront QA: old URLs remain valid during the cache transition. */
    public static function retire(bool $apply): int
    {
        $html = Http::timeout(30)->get('https://protein.tn/')->throw()->body();
        $retire = [];
        foreach (self::CAMPAIGNS as $campaign) {
            $rows = DB::table('slides')->where('lien', $campaign['link'])->get();
            if ($rows->count() !== 1) {
                throw new RuntimeException('Campaign lookup changed; no files removed.');
            }
            foreach ($campaign['old'] as $field => $old) {
                $target = self::target($campaign['name'], $field);
                if ($rows->first()->{$field} !== $target || ! str_contains($html, basename($target))) {
                    throw new RuntimeException('The storefront has not switched to all six new images yet.');
                }
                if (DB::table('slides')->where('image', $old)->orWhere('image_mobile', $old)->exists()) {
                    throw new RuntimeException('An older image is still referenced; no files removed.');
                }
                $master = @file_get_contents(self::source($campaign['name'], $field));
                if ($master === false || ! Storage::disk('public')->exists($target)
                    || ! hash_equals(hash('sha256', $master), hash('sha256', Storage::disk('public')->get($target)))) {
                    throw new RuntimeException('A new image is missing or corrupt; no files removed.');
                }
                if (! Storage::disk('public')->exists($old)) {
                    continue;
                }
                $backup = self::ARCHIVE.'/'.basename($old);
                if (! Storage::disk('local')->exists($backup)
                    || ! hash_equals(hash('sha256', Storage::disk('public')->get($old)), hash('sha256', Storage::disk('local')->get($backup)))) {
                    throw new RuntimeException('Verified private backup is required before retirement.');
                }
                $retire[] = $old;
            }
        }
        // Every safety check above must succeed before the first public file is removed.
        if ($apply) {
            foreach ($retire as $old) {
                if (! Storage::disk('public')->delete($old)) {
                    throw new RuntimeException('Could not retire '.$old);
                }
            }
        }

        return count($retire);
    }

    public static function restore(): void
    {
        foreach (self::CAMPAIGNS as $campaign) {
            foreach ($campaign['old'] as $old) {
                $backup = self::ARCHIVE.'/'.basename($old);
                if (! Storage::disk('local')->exists($backup)) {
                    throw new RuntimeException('A private campaign backup is missing.');
                }
                self::putVerified('public', $old, Storage::disk('local')->get($backup));
            }
        }
        DB::transaction(function (): void {
            foreach (self::CAMPAIGNS as $campaign) {
                $query = DB::table('slides')->where('lien', $campaign['link']);
                foreach ($campaign['old'] as $field => $old) {
                    $query->where($field, self::target($campaign['name'], $field));
                }
                // Do not undo a later admin edit. New files remain for cached pages during rollback.
                $query->update($campaign['old'] + ['updated_at' => now()]);
            }
        });
        ApiResponseCache::forget('slides');
    }

    private static function putVerified(string $disk, string $path, string $bytes): void
    {
        $storage = Storage::disk($disk);
        if (! $storage->put($path, $bytes, ['visibility' => $disk === 'public' ? 'public' : 'private'])
            || ! hash_equals(hash('sha256', $bytes), hash('sha256', $storage->get($path)))) {
            throw new RuntimeException('Campaign asset copy failed: '.$path);
        }
    }
}
