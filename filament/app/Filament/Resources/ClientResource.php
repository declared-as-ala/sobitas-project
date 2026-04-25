<?php

namespace App\Filament\Resources;

use App\Filament\Pages\ScannerFidelite;
use App\Filament\Pages\TicketPosPage;
use App\Filament\Resources\ClientResource\Pages;
use App\Models\Client;
use App\Services\LoyaltyService;
use App\Jobs\SendSmsJob;
use Filament\Forms;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
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
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $q) => $q->with(['loyaltyCard'])->withMax('tickets', 'created_at'))
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
                Tables\Columns\TextColumn::make('loyaltyCard.card_number')
                    ->label('N° carte fidélité')
                    ->placeholder('—')
                    ->toggleable(),
                Tables\Columns\TextColumn::make('loyalty_points')
                    ->label('Points')
                    ->getStateUsing(fn (Client $record): int => app(LoyaltyService::class)->getBalance((int) $record->id))
                    ->alignEnd()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('loyalty_value_dt')
                    ->label('Valeur pts')
                    ->getStateUsing(fn (Client $record): string => number_format(app(LoyaltyService::class)->getMonetaryValue((int) $record->id), 3, ',', ' ') . ' DT')
                    ->alignEnd()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('tickets_max_created_at')
                    ->label('Dernier ticket')
                    ->dateTime('d/m/Y H:i')
                    ->placeholder('—')
                    ->sortable()
                    ->toggleable(),
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
                Actions\Action::make('ticket_pos')
                    ->label('Ticket POS')
                    ->icon('heroicon-o-ticket')
                    ->url(fn (Client $record): string => TicketPosPage::getUrl([]) . '?client_id=' . $record->id)
                    ->openUrlInNewTab(),
                Actions\Action::make('scanner_fidelite')
                    ->label('Scanner fidélité')
                    ->icon('heroicon-o-qr-code')
                    ->url(fn (Client $record): string => ScannerFidelite::getUrl() . '?client=' . $record->id)
                    ->openUrlInNewTab(),
                Actions\Action::make('create_loyalty_card')
                    ->label('Créer carte')
                    ->icon('heroicon-o-credit-card')
                    ->visible(fn (Client $record): bool => ! $record->loyaltyCard)
                    ->action(function (Client $record): void {
                        app(LoyaltyService::class)->getOrCreateCard($record);
                        Notification::make()->title('Carte fidélité créée')->success()->send();
                    }),
                Actions\Action::make('print_loyalty_card')
                    ->label('Imprimer carte')
                    ->icon('heroicon-o-printer')
                    ->visible(fn (Client $record): bool => (bool) $record->loyaltyCard)
                    ->url(fn (Client $record): string => route('loyalty.card.print', ['card' => $record->loyaltyCard->id]))
                    ->openUrlInNewTab(),
                Actions\Action::make('adjust_loyalty_points')
                    ->label('Ajuster points')
                    ->icon('heroicon-o-sparkles')
                    ->form([
                        Forms\Components\TextInput::make('points')
                            ->label('Points (+ ou −)')
                            ->integer()
                            ->required(),
                        Forms\Components\TextInput::make('description')
                            ->label('Motif')
                            ->default('Ajustement admin')
                            ->maxLength(255),
                    ])
                    ->action(function (Client $record, array $data): void {
                        try {
                            app(LoyaltyService::class)->adjustPoints(
                                (int) $record->id,
                                (int) $data['points'],
                                $data['description'] ?? null,
                                auth()->id() ? (int) auth()->id() : null
                            );
                            Notification::make()->title('Solde mis à jour')->success()->send();
                        } catch (\InvalidArgumentException $e) {
                            Notification::make()->title('Fidélité')->body($e->getMessage())->danger()->send();
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

