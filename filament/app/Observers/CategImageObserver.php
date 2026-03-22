<?php

namespace App\Observers;

use App\Models\Categ;
use App\Services\Media\ConvertUploadedImageToWebp;

class CategImageObserver
{
    public function saving(Categ $categ): void
    {
        $converter = new ConvertUploadedImageToWebp();

        if ($categ->isDirty('cover') && $categ->cover !== null) {
            $categ->cover = $converter->convertStoredPathToWebp($categ->cover);
        }
    }
}
