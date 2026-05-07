<?php

namespace App\Filament\Partner\Pages;

use Filament\Forms;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Schema;

class PartnerProfilePage extends Page implements HasForms
{
    use InteractsWithForms;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-user-circle';

    protected static ?string $navigationLabel = 'Mon profil';

    protected static ?string $title = 'Mon profil';

    protected static ?string $slug = 'partner-coordonnees';

    protected static ?int $navigationSort = 90;

    protected string $view = 'filament.partner.pages.profile';

    public ?array $data = [];

    public function mount(): void
    {
        $partner = auth()->user()?->partner;
        if (! $partner) {
            Notification::make()->title('Profil partenaire introuvable')->danger()->send();

            return;
        }

        $this->data = [
            'name' => $partner->name,
            'business_name' => $partner->business_name,
            'phone' => $partner->phone,
            'address' => $partner->address,
            'payment_method' => $partner->payment_method,
            'bank_name' => $partner->bank_name,
            'rib_or_iban' => $partner->rib_or_iban,
            'payout_notes' => $partner->payout_notes,
        ];
    }

    public function form(Schema $schema): Schema
    {
        return $schema->statePath('data')->schema([
            Forms\Components\TextInput::make('name')->label('Nom')->required()->maxLength(255),
            Forms\Components\TextInput::make('business_name')->label('Raison sociale')->maxLength(255),
            Forms\Components\TextInput::make('phone')->label('Téléphone')->tel()->maxLength(64),
            Forms\Components\Textarea::make('address')->label('Adresse')->rows(3)->columnSpanFull(),
            Forms\Components\TextInput::make('payment_method')->label('Méthode de paiement')->maxLength(64),
            Forms\Components\TextInput::make('bank_name')->label('Banque')->maxLength(128),
            Forms\Components\TextInput::make('rib_or_iban')->label('RIB / IBAN')->maxLength(128),
            Forms\Components\Textarea::make('payout_notes')->label('Notes paiement')->columnSpanFull(),
        ])->columns(2);
    }

    public function save(): void
    {
        $partner = auth()->user()?->partner;
        if (! $partner) {
            return;
        }

        $state = $this->form->getState();
        $partner->forceFill([
            'name' => $state['name'] ?? $partner->name,
            'business_name' => $state['business_name'] ?? null,
            'phone' => $state['phone'] ?? null,
            'address' => $state['address'] ?? null,
            'payment_method' => $state['payment_method'] ?? null,
            'bank_name' => $state['bank_name'] ?? null,
            'rib_or_iban' => $state['rib_or_iban'] ?? null,
            'payout_notes' => $state['payout_notes'] ?? null,
        ])->save();

        Notification::make()->title('Profil mis à jour')->success()->send();
    }
}
