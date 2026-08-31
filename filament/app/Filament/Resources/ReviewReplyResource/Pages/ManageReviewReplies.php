<?php

namespace App\Filament\Resources\ReviewReplyResource\Pages;

use App\Filament\Resources\ReviewReplyResource;
use Filament\Actions;
use Filament\Resources\Pages\ManageRecords;

class ManageReviewReplies extends ManageRecords
{
    protected static string $resource = ReviewReplyResource::class;

    protected function getHeaderActions(): array
    {
        return [Actions\CreateAction::make()->label('Répondre')];
    }
}
