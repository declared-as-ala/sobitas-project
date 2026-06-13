<?php

namespace App\Filament\Resources\LoyaltyCardResource\Pages;

use App\Filament\Resources\LoyaltyCardResource;
use Filament\Resources\Pages\ListRecords;

class ListLoyaltyCards extends ListRecords
{
    protected static string $resource = LoyaltyCardResource::class;

    protected function getHeaderActions(): array
    {
        return [
            \Filament\Actions\Action::make('generate_cards')
                ->label('Générer cartes')
                ->icon('heroicon-o-sparkles')
                ->color('success')
                ->form([
                    \Filament\Forms\Components\TextInput::make('prefix')
                        ->label('Préfixe')
                        ->default('SOBITAS')
                        ->required()
                        ->maxLength(10),
                    \Filament\Forms\Components\TextInput::make('quantity')
                        ->label('Quantité')
                        ->numeric()
                        ->default(100)
                        ->minValue(1)
                        ->maxValue(4000)
                        ->required(),
                ])
                ->action(function (array $data): void {
                    try {
                        $quantity = (int) $data['quantity'];
                        $prefix = trim((string) ($data['prefix'] ?? 'SOBITAS'));
                        
                        $maxStart = 1;
                        $lastBatch = \App\Models\LoyaltyCardBatch::query()
                            ->orderBy('id', 'desc')
                            ->first();
                        if ($lastBatch) {
                            $maxStart = (int) $lastBatch->start_number + (int) $lastBatch->quantity;
                        }
                        
                        $batch = \App\Models\LoyaltyCardBatch::create([
                            'name' => 'Lot ' . $prefix . ' ' . now()->format('d/m/Y H:i'),
                            'prefix' => $prefix,
                            'start_number' => $maxStart,
                            'quantity' => $quantity,
                            'padding' => 6,
                            'notes' => 'Généré depuis la page de gestion.',
                        ]);
                        
                        app(\App\Services\LoyaltyService::class)->generateBatch($batch);
                        
                        \Filament\Notifications\Notification::make()
                            ->title("Génération réussie")
                            ->body("{$quantity} cartes avec le préfixe {$prefix} ont été générées.")
                            ->success()
                            ->send();
                    } catch (\Throwable $e) {
                        \Filament\Notifications\Notification::make()
                            ->title("Erreur lors de la génération")
                            ->body($e->getMessage())
                            ->danger()
                            ->send();
                    }
                }),
        ];
    }
}
