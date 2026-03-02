<?php

namespace App\Filament\Resources\CouponResource\Pages;

use App\Filament\Resources\CouponResource;
use Filament\Resources\Pages\CreateRecord;
use Filament\Forms;
use Filament\Actions;

class CreateCoupon extends CreateRecord
{
    protected static string $resource = CouponResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('generateCode')
                ->label('Générer un code')
                ->icon('heroicon-o-sparkles')
                ->form([
                    Forms\Components\TextInput::make('prefix')
                        ->label('Préfixe (ex: SOBI, RAMADAN)')
                        ->default('PROMO')
                        ->maxLength(20)
                        ->required(),
                    Forms\Components\TextInput::make('suffix')
                        ->label('Suffixe (ex: 10 pour 10%)')
                        ->default('10')
                        ->maxLength(10)
                        ->required(),
                ])
                ->action(function (array $data): void {
                    $prefix = strtoupper(preg_replace('/[^A-Z0-9]/', '', $data['prefix'] ?? 'PROMO'));
                    $suffix = (string) ($data['suffix'] ?? '10');
                    $this->form->fill(['code' => $prefix . $suffix]);
                }),
        ];
    }
}
