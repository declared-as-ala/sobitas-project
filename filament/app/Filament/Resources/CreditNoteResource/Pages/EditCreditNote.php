<?php

namespace App\Filament\Resources\CreditNoteResource\Pages;

use App\Enums\CreditNoteStatus;
use App\Filament\Resources\CreditNoteResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditCreditNote extends EditRecord
{
    protected static string $resource = CreditNoteResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('issue')
                ->label('Émettre l\'avoir')
                ->icon('heroicon-o-check-circle')
                ->color('success')
                ->visible(fn () => $this->record->status === CreditNoteStatus::Draft)
                ->requiresConfirmation()
                ->action(function () {
                    $this->record->status = CreditNoteStatus::Issued;
                    $this->record->issued_at = $this->record->issued_at ?? now();
                    $this->record->save();
                    $this->refreshFormData(['status', 'issued_at']);
                }),
            Actions\DeleteAction::make(),
        ];
    }
}
