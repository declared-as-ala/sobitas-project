<?php

namespace App\Observers;

use App\Models\Slide;
use App\Services\Media\ConvertUploadedImageToWebp;

class SlideImageObserver
{
    public function saving(Slide $slide): void
    {
        $converter = new ConvertUploadedImageToWebp();

        if ($slide->isDirty('image') && $slide->image !== null) {
            $slide->image = $converter->convertStoredPathToWebp($slide->image);
        }
    }
}
