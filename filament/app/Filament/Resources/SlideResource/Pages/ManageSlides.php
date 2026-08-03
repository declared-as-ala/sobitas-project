<?php

namespace App\Filament\Resources\SlideResource\Pages;

use App\Filament\Resources\SlideResource;
use App\Models\Slide;
use Filament\Actions;
use Filament\Resources\Pages\ManageRecords;

class ManageSlides extends ManageRecords
{
    protected static string $resource = SlideResource::class;

    protected function getHeaderActions(): array
    {
        return [
            // Same post-save verification as the edit action. A slide created with a Titre that
            // silently fails to persist is the identical bug, and the create path is where the
            // owner meets it first. See SlideResource::verifyPersisted().
            Actions\CreateAction::make()
                ->after(fn (Slide $record, array $data) => SlideResource::verifyPersisted($record, $data)),
        ];
    }
}
