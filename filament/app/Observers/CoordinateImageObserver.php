<?php

namespace App\Observers;

use App\Models\Coordinate;
use App\Services\Media\ConvertUploadedImageToWebp;

class CoordinateImageObserver
{
    public function saving(Coordinate $coordinate): void
    {
        $converter = new ConvertUploadedImageToWebp();

        if ($coordinate->isDirty('logo') && $coordinate->logo !== null) {
            $coordinate->logo = $converter->convertStoredPathToWebp($coordinate->logo);
        }

        if ($coordinate->isDirty('logo_facture') && $coordinate->logo_facture !== null) {
            $coordinate->logo_facture = $converter->convertStoredPathToWebp($coordinate->logo_facture);
        }
    }
}
