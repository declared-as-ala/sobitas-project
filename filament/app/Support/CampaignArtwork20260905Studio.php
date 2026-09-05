<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/** Atomic, reversible release of the six studio campaign images. */
final class CampaignArtwork20260905Studio
{
    public const DIRECTORY = 'slide-assets/2026-09-05-studio-v2';

    public const ARCHIVE = 'campaign-archives/2026-09-05-studio-v2';

    public const CAMPAIGNS = [
        [
            'name' => 'returns',
            'link' => '/politique-de-remboursement',
            'previous' => [
                'image' => 'slides/protein-returns-desktop-20260905-larger.webp',
                'image_mobile' => 'slides/protein-returns-mobile-20260903-natural.webp',
            ],
        ],
        [
            'name' => 'pack-builder',
            'link' => '/pack-builder',
            'previous' => [
                'image' => 'slides/protein-pack-builder-desktop-20260903-natural.webp',
                'image_mobile' => 'slides/protein-pack-builder-mobile-20260903-natural.webp',
            ],
        ],
        [
            'name' => 'welcome-bonus',
            'link' => '/register?offer=welcome-15',
            'previous' => [
                'image' => 'slides/protein-welcome-bonus-desktop-20260903-natural.webp',
                'image_mobile' => 'slides/protein-welcome-bonus-mobile-20260903-natural.webp',
            ],
        ],
    ];

    public static function target(string $name, string $field): string
    {
        $format = $field === 'image' ? 'desktop' : 'mobile';

        return "slides/protein-{$name}-{$format}-20260905-studio-v2.webp";
    }

    public static function source(string $name, string $field): string
    {
        $format = $field === 'image' ? 'desktop' : 'mobile';

        return resource_path(self::DIRECTORY."/{$name}-{$format}.webp");
    }

    public static function install(): void
    {
        $masters = [];
        foreach (self::CAMPAIGNS as $campaign) {
            foreach ($campaign['previous'] as $field => $previous) {
                $source = self::source($campaign['name'], $field);
                $bytes = @file_get_contents($source);
                $size = $bytes === false ? false : @getimagesizefromstring($bytes);
                $expected = $field === 'image' ? [1942, 809] : [1122, 1402];
                if ($bytes === false || ! $size || ($size['mime'] ?? '') !== 'image/webp'
                    || [$size[0], $size[1]] !== $expected) {
                    throw new RuntimeException("Missing or invalid campaign master: {$source}");
                }
                $masters[$campaign['name']][$field] = $bytes;
            }
        }

        foreach (self::CAMPAIGNS as $campaign) {
            foreach ($campaign['previous'] as $field => $previous) {
                self::putVerified('public', self::target($campaign['name'], $field), $masters[$campaign['name']][$field]);
                if (Storage::disk('public')->exists($previous)) {
                    self::putVerified('campaign-archive', self::ARCHIVE.'/'.basename($previous), Storage::disk('public')->get($previous));
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
                foreach ($campaign['previous'] as $field => $previous) {
                    $target = self::target($campaign['name'], $field);
                    if (! in_array($slide->{$field}, [$previous, $target], true)) {
                        throw new RuntimeException('Campaign was edited independently; refusing to overwrite it.');
                    }
                    $changes[$field] = $target;
                }
                DB::table('slides')->where('id', $slide->id)->update($changes + ['updated_at' => now()]);
            }
        });

        ApiResponseCache::forget('slides');
    }

    public static function restore(): void
    {
        foreach (self::CAMPAIGNS as $campaign) {
            foreach ($campaign['previous'] as $previous) {
                if (Storage::disk('public')->exists($previous)) {
                    continue;
                }
                $backup = self::ARCHIVE.'/'.basename($previous);
                if (! Storage::disk('campaign-archive')->exists($backup)) {
                    throw new RuntimeException('A campaign backup is missing: '.$backup);
                }
                self::putVerified('public', $previous, Storage::disk('campaign-archive')->get($backup));
            }
        }

        DB::transaction(function (): void {
            foreach (self::CAMPAIGNS as $campaign) {
                $query = DB::table('slides')->where('lien', $campaign['link']);
                foreach ($campaign['previous'] as $field => $previous) {
                    $query->where($field, self::target($campaign['name'], $field));
                }
                $query->update($campaign['previous'] + ['updated_at' => now()]);
            }
        });

        ApiResponseCache::forget('slides');
    }

    private static function putVerified(string $disk, string $path, string $bytes): void
    {
        $storage = Storage::disk($disk);
        $visibility = $disk === 'public' ? 'public' : 'private';
        if (! $storage->put($path, $bytes, ['visibility' => $visibility])
            || ! hash_equals(hash('sha256', $bytes), hash('sha256', $storage->get($path)))) {
            throw new RuntimeException('Campaign asset copy failed: '.$path);
        }
    }
}
