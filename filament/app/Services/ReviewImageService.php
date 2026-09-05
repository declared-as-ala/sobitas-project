<?php

namespace App\Services;

use App\Models\Review;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class ReviewImageService
{
    /**
     * Re-encode every customer photo as WebP. Besides keeping pages light, this strips EXIF data
     * such as the customer's GPS location instead of publishing the original phone file.
     *
     * @param  array<int,UploadedFile>  $files
     * @return array<int,string> Stored paths, useful for rollback cleanup.
     */
    public function store(Review $review, array $files): array
    {
        if ($files === []) {
            return [];
        }

        $manager = new ImageManager(new Driver());
        $stored = [];

        try {
            foreach (array_values($files) as $position => $file) {
                $image = $manager->read($file->getRealPath());
                $image->scaleDown(width: 1600, height: 1600);
                $encoded = $image->toWebp(quality: 82);
                $path = sprintf(
                    'reviews/%d/%s/%s.webp',
                    (int) $review->user_id,
                    now()->format('Y/m'),
                    Str::uuid()
                );

                Storage::disk('public')->put($path, (string) $encoded);
                $stored[] = $path;

                $review->images()->create([
                    'path' => $path,
                    'mime' => 'image/webp',
                    'size_bytes' => strlen((string) $encoded),
                    'width' => $image->width(),
                    'height' => $image->height(),
                    'position' => $position,
                ]);
            }
        } catch (\Throwable $error) {
            $this->delete($stored);
            throw $error;
        }

        return $stored;
    }

    /** @param array<int,string> $paths */
    public function delete(array $paths): void
    {
        if ($paths !== []) {
            Storage::disk('public')->delete($paths);
        }
    }
}
