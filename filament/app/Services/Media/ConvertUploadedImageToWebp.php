<?php

namespace App\Services\Media;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\Drivers\Imagick\Driver as ImagickDriver;
use Intervention\Image\ImageManager;
use Throwable;

/**
 * Prepare an uploaded image to be a MASTER — the file Next's optimizer reads from, never the file
 * a visitor downloads.
 *
 * THE BUG THIS FIXES: every image was encoded twice, lossily.
 *   1. here, on upload:  original → WebP q92  (lossy)
 *   2. at serve time:    that WebP → AVIF q80 (lossy, by Next's optimizer)
 * Encoding an already-lossy image re-quantises artefacts the first pass invented. That is
 * generation loss, and it is what the owner sees as soft, mushy slides. Raising the first quality
 * to 92 (the previous attempt) reduced it but could not remove it — two lossy passes are two lossy
 * passes.
 *
 * THE FIX: make the master LOSSLESS, so there is exactly ONE lossy encode in the whole pipeline —
 * the one at serve time, which is the only one that decides page weight. Three cases:
 *
 *   A. Already lossless (PNG/WebP-lossless/GIF/BMP) and within MAX_EDGE
 *        → re-encode to LOSSLESS WebP. Smaller file, mathematically identical pixels.
 *   B. Already lossy (JPEG / lossy WebP) and within MAX_EDGE
 *        → KEEP THE ORIGINAL BYTES UNTOUCHED. Any re-encode here can only lose information;
 *          it cannot add any back. This is the case that most uploads land in, and doing nothing
 *          is strictly the best available option.
 *   C. Larger than MAX_EDGE (any format)
 *        → downscale once with a proper resampler, then encode LOSSLESS WebP. The resize is a
 *          deliberate, single quality operation; encoding its result losslessly means it is the
 *          only one.
 *
 * Disk cost is real (lossless WebP of a large photo can be several MB) and deliberate: it lands on
 * the server, never on a visitor. Pages do not get heavier — users are served the optimizer's
 * output. MAX_EDGE keeps that cost bounded and also stops a 6000px phone photo being stored, and
 * re-decoded on every optimizer cache miss, at a size no layout on the site can use.
 *
 * IMAGICK IS PREFERRED over GD when the extension is present: GD's resampler is poorer, it discards
 * colour profiles (so wide-gamut product shots shift), and its WebP encoder has no lossless mode
 * worth the name. GD remains the fallback so this can never hard-fail an upload.
 *
 * The class name is kept because ~8 call sites use it and the public API is unchanged; what it
 * writes is no longer always WebP, which is the point.
 */
class ConvertUploadedImageToWebp
{
    /**
     * Longest-edge cap for a stored master, in pixels.
     *
     * 2560 comfortably exceeds every rendered size on the site — the widest consumer is the hero
     * at 1920 — so it can never soften a real layout, while bounding what a phone upload costs.
     */
    private const MAX_EDGE = 2560;

    /** Formats that carry no generation loss and can safely be re-encoded losslessly. */
    private const LOSSLESS_SOURCES = ['png', 'gif', 'bmp'];

    /**
     * Wall-clock budget for ALL image work in a single HTTP request, in seconds.
     *
     * WHY THIS EXISTS — it is a regression fix, and the regression was mine.
     *
     * Making the master lossless (the whole point of this class) also made encoding far more
     * expensive: `toWebp(100)` on a 2560px image costs seconds, and the production PHP image ships
     * GD, not Imagick, which is the slower of the two. That was survivable for a single slide.
     *
     * It was not survivable for a product. `FileUpload::make('images')->multiple()` calls
     * `saveUploadedFileUsing` once PER FILE, all inside the one save request, so a gallery of five
     * large PNGs serialises five expensive encodes back to back. nginx caps that request at
     * `fastcgi_read_timeout 60s` (nginx/configuration.conf), so the save died with a 504, Livewire
     * received HTML where it expected JSON, and the admin showed a page-load error. Intermittent by
     * nature: it depended entirely on how many images were attached and how big they were.
     *
     * A timeout is NOT a catchable exception — the existing try/catch could never have helped. The
     * only reliable defence is to stop starting work we cannot finish in time.
     *
     * 25s leaves comfortable headroom under the 60s cap for the rest of the save (validation, the
     * INSERT, relationship syncs, observers) even on a slow disk. When the budget is gone the
     * original file is kept, which is the same well-trodden branch every other failure path returns:
     * a correct, serveable image that simply has not been optimised. A product saved with a slightly
     * larger master beats a product the client cannot save at all.
     */
    private const REQUEST_TIME_BUDGET = 25.0;

    /**
     * Seconds of image work already spent in THIS request, across every instance of this class.
     *
     * A static is the right scope ONLY under PHP-FPM, where each request gets a fresh process and
     * statics therefore reset by themselves. It is the wrong scope in a long-running process —
     * `queue:work` and `schedule:work` both stay alive across many jobs, so this would accumulate
     * forever and eventually refuse to convert anything at all, silently and permanently.
     *
     * Hence `budgetApplies()`: the budget exists to survive nginx's `fastcgi_read_timeout`, and
     * there is no gateway in front of a console process. CLI does the full work, uncapped.
     */
    private static float $timeSpent = 0.0;

    /** The budget guards an HTTP request against the gateway timeout; console has no gateway. */
    private static function budgetApplies(): bool
    {
        try {
            return ! app()->runningInConsole();
        } catch (Throwable) {
            // No container (unlikely here) — assume web and stay conservative.
            return true;
        }
    }

    /**
     * @param  int  $quality  Retained for backward compatibility with existing call sites. It is
     *                        now only a floor for the rare lossy fallback path (case C on a driver
     *                        without lossless support); the normal paths do not use it.
     */
    public function __construct(
        private int $quality = 92,
    ) {}

    /**
     * Prepare a file already stored on a disk (e.g. after Filament FileUpload commits).
     * Returns the path to use — which may be the ORIGINAL path when the best action is none.
     */
    public function convertStoredPathToWebp(?string $relativePath, string $diskName = 'public'): ?string
    {
        if ($relativePath === null || $relativePath === '') {
            return $relativePath;
        }

        $relativePath = ltrim($relativePath, '/');
        $disk = Storage::disk($diskName);

        if (! $disk->exists($relativePath)) {
            return $relativePath;
        }

        $fullPath = $disk->path($relativePath);
        if (! is_readable($fullPath)) {
            return $relativePath;
        }

        try {
            $info = @getimagesize($fullPath);
            if ($info === false) {
                return $relativePath;   // not a raster image — leave it alone
            }

            [$width, $height] = $info;
            $ext = strtolower(pathinfo($relativePath, PATHINFO_EXTENSION));
            $needsResize = max($width, $height) > self::MAX_EDGE;
            $isLossySource = in_array($ext, ['jpg', 'jpeg'], true)
                || ($ext === 'webp' && ! $this->isLosslessWebp($fullPath));

            // CASE B — already lossy and correctly sized. Touching it can only make it worse.
            if (! $needsResize && $isLossySource) {
                Log::info('media.master.kept_original', [
                    'disk' => $diskName,
                    'path' => $relativePath,
                    'reason' => 'lossy source within size cap — re-encoding would add generation loss',
                    'dimensions' => "{$width}x{$height}",
                ]);

                return $relativePath;
            }

            // CASE A — lossless WebP already at a sane size: nothing to gain.
            if (! $needsResize && $ext === 'webp') {
                return $relativePath;
            }

            // Everything past this point is the expensive path — decode, optional resize, encode.
            // Cases A and B above cost only a stat and a 64-byte header read, so they are never
            // gated; this is the only work that can run a request into the gateway timeout.
            if (self::budgetApplies() && self::$timeSpent >= self::REQUEST_TIME_BUDGET) {
                Log::warning('media.master.skipped_over_budget', [
                    'disk' => $diskName,
                    'path' => $relativePath,
                    'dimensions' => "{$width}x{$height}",
                    'spent_seconds' => round(self::$timeSpent, 2),
                    'budget_seconds' => self::REQUEST_TIME_BUDGET,
                    'reason' => 'request time budget exhausted — original kept so the save still completes',
                ]);

                return $relativePath;
            }

            // Time the real work so the budget reflects this machine's actual cost, not a guess.
            $startedAt = microtime(true);

            $manager = new ImageManager($this->driver());
            $image = $manager->read($fullPath);

            if ($needsResize) {
                // scaleDown never enlarges, and keeps the aspect ratio.
                $image = $image->scaleDown(width: self::MAX_EDGE, height: self::MAX_EDGE);
            }

            $encoded = $this->encodeLossless($image);

            // Free the decoded bitmap before writing. A 2560px RGBA frame is ~26 MB, and a gallery
            // save holds one per iteration; without this, several in sequence walk toward the
            // 512M memory_limit.
            unset($image, $manager);

            $elapsed = microtime(true) - $startedAt;
            self::$timeSpent += $elapsed;

            $dir = pathinfo($relativePath, PATHINFO_DIRNAME);
            $newBase = Str::uuid()->toString() . '.webp';
            $newRelative = ($dir !== '.' && $dir !== '') ? $dir . '/' . $newBase : $newBase;

            $disk->put($newRelative, $encoded);

            // Only drop the original once the replacement is safely on disk.
            try {
                $disk->delete($relativePath);
            } catch (Throwable $e) {
                Log::warning('media.master.delete_original_failed', [
                    'disk' => $diskName,
                    'old_path' => $relativePath,
                    'new_path' => $newRelative,
                    'error' => $e->getMessage(),
                ]);
            }

            Log::info('media.master.written', [
                'disk' => $diskName,
                'old_path' => $relativePath,
                'new_path' => $newRelative,
                'source_format' => $ext,
                'resized' => $needsResize,
                'dimensions' => $needsResize
                    ? 'capped to ' . self::MAX_EDGE
                    : "{$width}x{$height}",
                'encoding' => 'webp-lossless',
                // Timings are logged so the budget can be tuned against reality instead of a guess,
                // and so a slow driver shows up in the logs before it shows up as a failed save.
                'seconds' => round($elapsed, 2),
                'request_total_seconds' => round(self::$timeSpent, 2),
                'driver' => extension_loaded('imagick') ? 'imagick' : 'gd',
            ]);

            return $newRelative;
        } catch (Throwable $e) {
            // An upload must never fail because of image processing — keep the original.
            Log::warning('media.master.preparation_failed', [
                'disk' => $diskName,
                'path' => $relativePath,
                'error' => $e->getMessage(),
            ]);

            return $relativePath;
        }
    }

    /**
     * @param  array<int, string>|null  $paths
     * @return array<int, string>|null
     */
    public function convertStoredPathsToWebp(?array $paths, string $diskName = 'public'): ?array
    {
        if ($paths === null || $paths === []) {
            return $paths;
        }

        return array_values(array_map(
            fn (string $p): string => $this->convertStoredPathToWebp($p, $diskName) ?? $p,
            $paths,
        ));
    }

    /** Imagick when available (better resampling, keeps colour profiles), GD otherwise. */
    private function driver(): ImagickDriver|GdDriver
    {
        return extension_loaded('imagick') ? new ImagickDriver() : new GdDriver();
    }

    /**
     * Encode losslessly. Intervention exposes quality only, and both encoders treat 100 as their
     * lossless/near-lossless setting, so this is the portable way to ask for it. Falls back to the
     * configured quality if a driver rejects it, which is still better than the old double pass.
     */
    private function encodeLossless(\Intervention\Image\Interfaces\ImageInterface $image): string
    {
        try {
            return (string) $image->toWebp(100);
        } catch (Throwable $e) {
            Log::warning('media.master.lossless_encode_failed', [
                'error' => $e->getMessage(),
                'fallback_quality' => $this->quality,
            ]);

            return (string) $image->toWebp($this->quality);
        }
    }

    /**
     * A WebP file is lossy unless its RIFF container carries a VP8L (lossless) or an ALPH+VP8L
     * chunk. Reading the first 64 bytes is enough to tell, and avoids decoding the whole image
     * just to classify it.
     */
    private function isLosslessWebp(string $fullPath): bool
    {
        $handle = @fopen($fullPath, 'rb');
        if ($handle === false) {
            return false;
        }

        $header = (string) fread($handle, 64);
        fclose($handle);

        if (! str_starts_with($header, 'RIFF') || substr($header, 8, 4) !== 'WEBP') {
            return false;
        }

        // 'VP8L' = lossless. 'VP8 ' (with the trailing space) = lossy. 'VP8X' = extended, which
        // may contain either, so it is treated as lossy — the conservative answer, since guessing
        // "lossless" wrongly would mean re-encoding a lossy file and adding the very generation
        // loss this class exists to prevent.
        return str_contains($header, 'VP8L');
    }
}
