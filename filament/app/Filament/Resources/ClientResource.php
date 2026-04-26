<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ClientResource\Pages;
use App\Enums\LoyaltyCardStatus;
use App\Models\Client;
use App\Jobs\SendSmsJob;
use App\Services\LoyaltyService;
use Filament\Forms;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Collection;

class ClientResource extends Resource
{
    protected static ?string $model = Client::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-users';

    protected static string | \UnitEnum | null $navigationGroup = 'Clients';

    protected static ?int $navigationSort = 1;

    protected static ?string $recordTitleAttribute = 'name';

    public static function getGloballySearchableAttributes(): array
    {
        return ['name', 'email', 'phone_1'];
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Section::make('Informations client')
                ->schema([
                    Forms\Components\TextInput::make('name')
                        ->label('Nom')
                        ->required()
                        ->maxLength(255),
                    Forms\Components\TextInput::make('email')
                        ->label('Email')
                        ->email()
                        ->maxLength(255),
                    Forms\Components\TextInput::make('phone_1')
                        ->label('Téléphone 1')
                        ->maxLength(255),
                    Forms\Components\TextInput::make('phone_2')
                        ->label('Téléphone 2')
                        ->maxLength(255),
                    Forms\Components\TextInput::make('adresse')
                        ->label('Adresse')
                        ->maxLength(500)
                        ->columnSpanFull(),
                    Forms\Components\TextInput::make('matricule')
                        ->label('Matricule fiscal')
                        ->maxLength(255),
                    Forms\Components\Toggle::make('sms')
                        ->label('Accepte SMS')
                        ->default(true),
                ])->columns(2),

            Section::make('Programme fidélité')
                ->schema([
                    Forms\Components\Toggle::make('loyalty_enabled')
                        ->label('Fidélité activée')
                        ->default(false),
                    Forms\Components\TextInput::make('loyalty_points_balance')
                        ->label('Solde de points')
                        ->numeric()
                        ->disabled()
                        ->default(0)
                        ->suffix('pts'),
                    Forms\Components\Textarea::make('loyalty_note')
                        ->label('Note fidélité')
                        ->rows(2)
                        ->columnSpanFull(),
                    Forms\Components\Placeholder::make('active_card_info')
                        ->label('Carte fidélité active')
                        ->content(fn (?Client $record): string => (string) ($record?->activeCard?->card_number ?: '—'))
                        ->visible(fn (?Client $record): bool => (bool) $record?->activeCard),
                ])->columns(2)
                ->visible(function (?Client $record): bool {
                    if (! $record) {
                        return false;
                    }

                    $record->loadMissing('activeCard');

                    return (bool) $record->activeCard || ((int) ($record->loyalty_points_balance ?? 0) > 0);
                })
                ->collapsible(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Nom')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('email')
                    ->searchable(),
                Tables\Columns\TextColumn::make('phone_1')
                    ->label('Tél. 1')
                    ->searchable(),
                Tables\Columns\TextColumn::make('phone_2')
                    ->label('Tél. 2')
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('adresse')
                    ->label('Adresse')
                    ->limit(30)
                    ->toggleable(),
                Tables\Columns\IconColumn::make('sms')
                    ->label('SMS')
                    ->boolean(),
                Tables\Columns\TextColumn::make('loyalty_points_balance')
                    ->label('Points')
                    ->sortable()
                    ->badge()
                    ->color('warning')
                    ->toggleable(),
                Tables\Columns\TextColumn::make('activeCard.card_number')
                    ->label('Carte active')
                    ->placeholder('—')
                    ->badge()
                    ->color('success')
                    ->toggleable(),
                Tables\Columns\IconColumn::make('loyalty_enabled')
                    ->label('Fidélité')
                    ->boolean()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Créé le')
                    ->dateTime('d/m/Y')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(25)
            ->filters([
                Tables\Filters\TernaryFilter::make('sms')
                    ->label('Accepte SMS'),
            ])
            ->actions([
                // Assign loyalty card
                Actions\Action::make('assign_card')
                    ->label('Attribuer carte')
                    ->icon('heroicon-o-credit-card')
                    ->color('success')
                    ->modalWidth('2xl')
                    ->modalHeading('Attribuer carte')
                    ->modalSubmitActionLabel('Confirmer l’attribution')
                    ->form([
                        Section::make('Client sélectionné')
                            ->schema([
                                Forms\Components\Placeholder::make('client_name')
                                    ->label('Nom')
                                    ->content(fn (Client $record): string => (string) ($record->name ?: "Client #{$record->id}")),
                                Forms\Components\Placeholder::make('client_phone')
                                    ->label('Téléphone')
                                    ->content(fn (Client $record): string => (string) ($record->phone_1 ?: '—')),
                                Forms\Components\Placeholder::make('client_card')
                                    ->label('Carte active actuelle')
                                    ->content(fn (Client $record): string => (string) ($record->activeCard?->card_number ?: 'Aucune')),
                                Forms\Components\Placeholder::make('client_points')
                                    ->label('Solde points')
                                    ->content(fn (Client $record): string => (string) (($record->loyalty_points_balance ?? 0) . ' pts')),
                            ])->columns(2),
                        Section::make('Scan carte')
                            ->schema([
                                Forms\Components\TextInput::make('scan_code')
                                    ->label('Scanner ou saisir le numéro de carte')
                                    ->placeholder('Ex: SOBITAS-000100 / qr_token / barcode_value')
                                    ->autofocus()
                                    ->live(debounce: 250)
                                    ->required()
                                    ->afterStateUpdated(function ($state, callable $set, $record) {
                                        if (! $record instanceof Client) {
                                            return;
                                        }

                                        $set('found_card_id', null);
                                        $set('lookup_state', null);
                                        $set('lookup_message', null);
                                        $set('preview_card_number', null);
                                        $set('preview_status', null);
                                        $set('preview_batch', null);
                                        $set('preview_printed_at', null);

                                        $code = trim((string) $state);
                                        if ($code === '') {
                                            return;
                                        }

                                        $service = app(LoyaltyService::class);
                                        $card = $service->findCardByScanCode($code);

                                        if (! $card) {
                                            $set('lookup_state', 'not_found');
                                            $set('lookup_message', 'Carte introuvable');
                                            return;
                                        }

                                        $set('found_card_id', $card->id);
                                        $set('preview_card_number', $card->card_number);
                                        $set('preview_status', $card->status->label());
                                        $set('preview_batch', $card->batch?->name ?: ($card->batch_id ? "Lot #{$card->batch_id}" : '—'));
                                        $set('preview_printed_at', $card->printed_at?->format('d/m/Y H:i') ?: 'Non imprimée');

                                        if ($card->client_id && $card->client_id !== $record->id) {
                                            $owner = $card->client?->name ?: "Client #{$card->client_id}";
                                            $set('lookup_state', 'assigned_other');
                                            $set('lookup_message', "Cette carte est déjà attribuée à {$owner}.");
                                            return;
                                        }

                                        if ($card->status !== LoyaltyCardStatus::Available) {
                                            if ($card->client_id === $record->id && $card->status === LoyaltyCardStatus::Active) {
                                                $set('lookup_state', 'already_active_for_client');
                                                $set('lookup_message', "Cette carte est déjà active pour ce client : {$card->card_number}.");
                                                return;
                                            }

                                            $set('lookup_state', 'not_available');
                                            $set('lookup_message', "Cette carte ne peut pas être attribuée car son statut est : {$card->status->label()}.");
                                            return;
                                        }

                                        $existing = $record->activeCard;
                                        if ($existing && $existing->id !== $card->id) {
                                            $set('lookup_state', 'client_has_active');
                                            $set('lookup_message', "Ce client possède déjà une carte active : {$existing->card_number}.");
                                            return;
                                        }

                                        $set('lookup_state', 'found');
                                        $set('lookup_message', 'Carte trouvée');
                                    }),
                                Forms\Components\Placeholder::make('lookup_message_view')
                                    ->hiddenLabel()
                                    ->content(fn (callable $get): string => (string) ($get('lookup_message') ?: 'Scannez une carte puis validez avec Entrée.')),
                                Forms\Components\Placeholder::make('card_preview')
                                    ->label('Carte trouvée')
                                    ->content(function (callable $get): string {
                                        if (! $get('found_card_id')) {
                                            return '—';
                                        }

                                        return implode("\n", [
                                            'Numéro: ' . ($get('preview_card_number') ?: '—'),
                                            'Statut: ' . ($get('preview_status') ?: '—'),
                                            'Lot: ' . ($get('preview_batch') ?: '—'),
                                            'Impression: ' . ($get('preview_printed_at') ?: '—'),
                                        ]);
                                    }),
                                Forms\Components\Toggle::make('replace_existing')
                                    ->label('Remplacer la carte')
                                    ->helperText('Activez pour remplacer la carte active actuelle du client.')
                                    ->default(false)
                                    ->visible(fn (Client $record): bool => (bool) $record->activeCard),
                                Forms\Components\Hidden::make('found_card_id'),
                                Forms\Components\Hidden::make('lookup_state'),
                                Forms\Components\Hidden::make('preview_card_number'),
                                Forms\Components\Hidden::make('preview_status'),
                                Forms\Components\Hidden::make('preview_batch'),
                                Forms\Components\Hidden::make('preview_printed_at'),
                            ]),
                    ])
                    ->action(function (Client $record, array $data) {
                        try {
                            $scanCode = trim((string) ($data['scan_code'] ?? ''));
                            if ($scanCode === '') {
                                throw new \RuntimeException('Scanner ou saisir le numéro de carte.');
                            }

                            $service = app(LoyaltyService::class);
                            $card = $service->findCardByScanCode($scanCode);

                            if (! $card) {
                                throw new \RuntimeException('Carte introuvable. Réessayez ou générez des cartes dans Lots de cartes.');
                            }

                            $wasAlreadyActiveForClient = $card->client_id === $record->id
                                && $card->status === LoyaltyCardStatus::Active;

                            $assignedCard = $service->assignCardToClient(
                                $card,
                                $record,
                                (bool) ($data['replace_existing'] ?? false),
                            );

                            Notification::make()
                                ->title($wasAlreadyActiveForClient ? 'Cette carte est déjà active pour ce client' : 'Carte attribuée avec succès')
                                ->body($wasAlreadyActiveForClient
                                    ? "La carte {$assignedCard->card_number} était déjà liée à {$record->name}."
                                    : "Carte {$assignedCard->card_number} attribuée à {$record->name}.")
                                ->success()->send();
                        } catch (\Throwable $e) {
                            Notification::make()->title($e->getMessage())->danger()->send();
                        }
                    }),

                // Adjust points manually
                Actions\Action::make('adjust_points')
                    ->label('Ajuster points')
                    ->icon('heroicon-o-adjustments-horizontal')
                    ->color('warning')
                    ->form([
                        Forms\Components\TextInput::make('delta')
                            ->label('Points à ajouter / retirer (négatif pour retirer)')
                            ->integer()
                            ->required(),
                        Forms\Components\TextInput::make('description')
                            ->label('Raison')
                            ->required()
                            ->maxLength(255),
                    ])
                    ->action(function (Client $record, array $data) {
                        try {
                            app(LoyaltyService::class)->adjustPoints(
                                $record,
                                (int) $data['delta'],
                                $data['description']
                            );
                            Notification::make()
                                ->title("Solde ajusté. Nouveau solde : {$record->fresh()->loyalty_points_balance} pts")
                                ->success()->send();
                        } catch (\Throwable $e) {
                            Notification::make()->title($e->getMessage())->danger()->send();
                        }
                    }),

                Actions\EditAction::make(),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\DeleteBulkAction::make(),
                    Actions\BulkAction::make('sendSms')
                        ->label('Envoyer SMS')
                        ->icon('heroicon-o-chat-bubble-left-right')
                        ->form([
                            Forms\Components\Textarea::make('message')
                                ->label('Message SMS')
                                ->required()
                                ->maxLength(160),
                        ])
                        ->action(function (Collection $records, array $data): void {
                            $count = 0;

                            foreach ($records as $client) {
                                if ($client->phone_1) {
                                    SendSmsJob::dispatch($client->phone_1, $data['message']);
                                    $count++;
                                }
                            }

                            Notification::make()
                                ->title("SMS en file d'attente")
                                ->body("{$count} SMS mis en file d'attente pour envoi.")
                                ->success()
                                ->send();
                        })
                        ->deselectRecordsAfterCompletion()
                        ->requiresConfirmation(),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListClients::route('/'),
            'create' => Pages\CreateClient::route('/create'),
            'edit'   => Pages\EditClient::route('/{record}/edit'),
        ];
    }
}

