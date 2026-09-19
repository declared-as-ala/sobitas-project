<?php

namespace App\Filament\Affilie\Pages;

use App\Enums\AffiliePayoutMethod;
use Filament\Forms;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Schema;

class AffilieProfilePage extends Page implements HasForms
{
    use InteractsWithForms;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-user-circle';

    protected static ?string $navigationLabel = 'Mon profil';

    protected static ?string $title = 'Mon profil';

    protected static ?string $slug = 'affilie-coordonnees';

    protected static ?int $navigationSort = 90;

    protected string $view = 'filament.affilie.pages.profile';

    public ?array $data = [];

    public function mount(): void
    {
        $affilie = auth()->user()?->affilie;
        if (! $affilie) {
            Notification::make()->title('Profil affilié introuvable')->danger()->send();

            return;
        }

        $this->data = [
            'name' => $affilie->name,
            'email' => $affilie->email,
            'business_name' => $affilie->business_name,
            'phone' => $affilie->phone,
            'address' => $affilie->address,
            'payment_method' => AffiliePayoutMethod::tryFrom($affilie->payment_method ?? '')?->label() ?? 'Non renseigné',
            'payout_notes' => $affilie->payout_notes,
        ];
    }

    public function form(Schema $schema): Schema
    {
        return $schema->statePath('data')->schema([
            Forms\Components\TextInput::make('name')->label('Nom')->required()->maxLength(255),
            Forms\Components\TextInput::make('email')->label('Email')->email()->disabled()->dehydrated(false),
            Forms\Components\TextInput::make('business_name')->label('Raison sociale')->maxLength(255),
            Forms\Components\TextInput::make('phone')->label('Téléphone')->tel()->maxLength(64),
            Forms\Components\Textarea::make('address')->label('Adresse')->rows(3)->columnSpanFull(),
            Forms\Components\TextInput::make('payment_method')
                ->label('Méthode de paiement')
                ->disabled()
                ->dehydrated(false)
                ->helperText('Pour modifier votre méthode de paiement, contactez l’équipe Protein.tn.'),
            Forms\Components\Textarea::make('payout_notes')->label('Notes paiement')->columnSpanFull(),
        ])->columns(2);
    }

    public function save(): void
    {
        $affilie = auth()->user()?->affilie;
        if (! $affilie) {
            return;
        }

        $state = $this->form->getState();
        $affilie->forceFill([
            'name' => $state['name'] ?? $affilie->name,
            'business_name' => $state['business_name'] ?? null,
            'phone' => $state['phone'] ?? null,
            'address' => $state['address'] ?? null,
            'payout_notes' => $state['payout_notes'] ?? null,
        ])->save();

        Notification::make()->title('Profil mis à jour')->success()->send();
    }
}
