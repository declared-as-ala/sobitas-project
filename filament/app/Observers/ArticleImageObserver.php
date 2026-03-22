<?php

namespace App\Observers;

use App\Models\Article;
use App\Services\Media\ConvertUploadedImageToWebp;

class ArticleImageObserver
{
    public function saving(Article $article): void
    {
        $converter = new ConvertUploadedImageToWebp();

        if ($article->isDirty('cover') && $article->cover !== null) {
            $article->cover = $converter->convertStoredPathToWebp($article->cover);
        }
    }
}
