<?php

namespace App\Filament\Resources\QuotationResource\Pages;

use App\Filament\Resources\QuotationResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditQuotation extends EditRecord
{
    protected static string $resource = QuotationResource::class;

    public function getHeading(): string
    {
        return 'Devis #' . $this->record->numero;
    }

    public function getSubheading(): ?string
    {
        $client = $this->record->client?->name ?? '—';
        $date = $this->record->created_at?->format('d/m/Y') ?? '—';
        $total = number_format((float) ($this->record->prix_ttc ?? 0), 2, ',', ' ') . ' TND';
        $statut = $this->getStatutLabel($this->record->statut ?? null);

        return "Client : {$client} · Date : {$date} · Total : {$total}" . ($statut ? " · Statut : {$statut}" : '');
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('print')
                ->label('Imprimer')
                ->icon('heroicon-o-printer')
                ->color('gray')
                ->modalHeading('Aperçu d\'impression')
                ->modalContent(fn () => view('filament.components.print-modal', [
                    'printUrl' => route('quotations.print', ['quotation' => $this->record->id]),
                    'title' => 'Devis ' . $this->record->numero,
                ]))
                ->modalSubmitAction(false)
                ->closeParentActions(),
            Actions\DeleteAction::make(),
        ];
    }

    private function getStatutLabel(?string $statut): string
    {
        return match ($statut) {
            'brouillon' => 'Brouillon',
            'valide' => 'Validé',
            'refuse' => 'Refusé',
            'en_attente' => 'En attente',
            default => '',
        };
    }
}
