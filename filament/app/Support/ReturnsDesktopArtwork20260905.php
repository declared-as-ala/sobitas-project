<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/** Safe, idempotent release of the first desktop slide only. */
final class ReturnsDesktopArtwork20260905
{
    public const LINK = '/politique-de-remboursement';

    public const PREVIOUS = 'slides/protein-returns-desktop-20260903-natural.webp';

    public const TARGET = 'slides/protein-returns-desktop-20260905-larger.webp';

    public const ARCHIVE = 'campaign-archives/2026-09-05/'.self::PREVIOUS;

    public static function source(): string
    {
        return resource_path('slide-assets/2026-09-05/returns-desktop-larger.webp');
    }

    public static function install(): void
    {
        $bytes = @file_get_contents(self::source());
        $size = $bytes === false ? false : @getimagesizefromstring($bytes);
        if ($bytes === false || ! $size || ($size['mime'] ?? '') !== 'image/webp') {
            throw new RuntimeException('Missing or invalid larger returns desktop artwork.');
        }

        $public = Storage::disk('public');
        if (! $public->put(self::TARGET, $bytes, ['visibility' => 'public'])
            || ! hash_equals(hash('sha256', $bytes), hash('sha256', $public->get(self::TARGET)))) {
            throw new RuntimeException('Could not publish larger returns desktop artwork.');
        }

        DB::transaction(function () use ($public): void {
            $rows = DB::table('slides')->where('lien', self::LINK)->lockForUpdate()->get();
            if ($rows->count() !== 1) {
                throw new RuntimeException('Expected exactly one returns slide.');
            }
            $slide = $rows->first();
            if (! in_array($slide->image, [self::PREVIOUS, self::TARGET], true)) {
                throw new RuntimeException('Returns slide was edited independently; refusing to overwrite it.');
            }
            if ($slide->image === self::PREVIOUS && $public->exists(self::PREVIOUS)) {
                $archive = Storage::disk('campaign-archive');
                $previous = $public->get(self::PREVIOUS);
                if (! $archive->put(self::ARCHIVE, $previous, ['visibility' => 'private'])
                    || ! hash_equals(hash('sha256', $previous), hash('sha256', $archive->get(self::ARCHIVE)))) {
                    throw new RuntimeException('Could not archive previous returns desktop artwork.');
                }
            }
            DB::table('slides')->where('id', $slide->id)->update([
                'image' => self::TARGET,
                'updated_at' => now(),
            ]);
        });

        ApiResponseCache::forget('slides');
    }

    public static function restore(): void
    {
        DB::table('slides')
            ->where('lien', self::LINK)
            ->where('image', self::TARGET)
            ->update(['image' => self::PREVIOUS, 'updated_at' => now()]);
        ApiResponseCache::forget('slides');
    }
}
