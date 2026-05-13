<?php

namespace App\Observers;

use App\Models\Product;
use App\Services\Media\ConvertUploadedImageToWebp;

class ProductImageObserver
{
    public function saving(Product $product): void
    {
        $converter = new ConvertUploadedImageToWebp();

        if ($product->isDirty('cover') && $product->cover !== null) {
            $product->cover = $converter->convertStoredPathToWebp($product->cover);
        }

        if ($product->isDirty('images') && $product->images !== null) {
            $product->images = $converter->convertStoredPathsToWebp($product->images);
        }

        if ($product->isDirty('nutrition_images') && $product->nutrition_images !== null) {
            $product->nutrition_images = $converter->convertStoredPathsToWebp($product->nutrition_images);
        }
    }
}
