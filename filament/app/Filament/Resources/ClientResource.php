<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ClientResource\Pages;
use App\Models\Client;
use App\Models\LoyaltyCard;
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
                ])->columns(2)
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
                    ->form([
                        Forms\Components\Select::make('card_id')
                            ->label('Carte disponible')
                            ->searchable()
                            ->getSearchResultsUsing(fn (string $search) => LoyaltyCard::available()
                                ->where('card_number', 'like', "%{$search}%")
                                ->limit(20)
                                ->pluck('card_number', 'id')
                            )
                            ->getOptionLabelUsing(fn ($value) => LoyaltyCard::find($value)?->card_number)
                            ->required(),
                    ])
                    ->action(function (Client $record, array $data) {
                        try {
                            $card = LoyaltyCard::findOrFail($data['card_id']);
                            app(LoyaltyService::class)->assignCard($card, $record);
                            Notification::make()
                                ->title("Carte {$card->card_number} attribuée à {$record->name}")
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

