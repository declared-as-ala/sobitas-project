<?php

namespace App\Filament\Resources\PartnerPayoutAdminResource\Pages;

use App\Filament\Resources\PartnerPayoutAdminResource;
use App\Models\Partner;
use App\Services\PartnerCommissionService;
use Filament\Actions;
use Filament\Forms;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ListRecords;

class ListPartnerPayoutsAdmin extends ListRecords
{
    protected static string $resource = PartnerPayoutAdminResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('createPayout')
                ->label('Créer paiement')
                ->icon('heroicon-o-plus-circle')
                ->form([
                    Forms\Components\Select::make('partner_id')
                        ->label('Partenaire')
                        ->options(fn (): array => Partner::query()->orderBy('name')->pluck('name', 'id')->all())
                        ->searchable()
                        ->required(),
                    Forms\Components\TextInput::make('amount')
                        ->label('Montant')
                        ->numeric()
                        ->required()
                        ->minValue(0.001),
                    Forms\Components\Textarea::make('admin_note')
                        ->label('Note')
                        ->columnSpanFull(),
                ])
                ->action(function (array $data): void {
                    $partner = Partner::findOrFail($data['partner_id']);
                    try {
                        app(PartnerCommissionService::class)->createPayout(
                            $partner,
                            (float) $data['amount'],
                            $data['admin_note'] ?? null
                        );
                        Notification::make()->title('Paiement créé')->success()->send();
                    } catch (\Throwable $e) {
                        Notification::make()->title($e->getMessage())->danger()->send();
                    }
                }),
            Actions\Action::make('adjustment')
                ->label('Ajustement solde')
                ->icon('heroicon-o-adjustments-horizontal')
                ->form([
                    Forms\Components\Select::make('partner_id')
                        ->label('Partenaire')
                        ->options(fn (): array => Partner::query()->orderBy('name')->pluck('name', 'id')->all())
                        ->searchable()
                        ->required(),
                    Forms\Components\TextInput::make('amount')
                        ->label('Montant (+/-)')
                        ->numeric()
                        ->required(),
                    Forms\Components\Textarea::make('note')->label('Motif')->columnSpanFull(),
                ])
                ->action(function (array $data): void {
                    $partner = Partner::findOrFail($data['partner_id']);
                    app(PartnerCommissionService::class)->adjustBalance(
                        $partner,
                        (float) $data['amount'],
                        $data['note'] ?? null
                    );
                    Notification::make()->title('Ajustement enregistré')->success()->send();
                }),
        ];
    }
}
