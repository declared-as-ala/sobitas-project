<?php

namespace App\Observers;

use App\Models\Page;
use App\Services\Media\ConvertUploadedImageToWebp;

class PageImageObserver
{
    public function saving(Page $page): void
    {
        $converter = new ConvertUploadedImageToWebp();

        if ($page->isDirty('image') && $page->image !== null) {
            $page->image = $converter->convertStoredPathToWebp($page->image);
        }
    }
}
