<?php

namespace App\Filament\Resources;

use App\Enums\LoyaltyCardStatus;
use App\Filament\Resources\LoyaltyCardResource\Pages;
use App\Models\Client;
use App\Models\LoyaltyCard;
use App\Services\LoyaltyService;
use Filament\Actions\Action;
use Filament\Actions\EditAction;
use Filament\Forms;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;

class LoyaltyCardResource extends Resource
{
    protected static ?string $model = LoyaltyCard::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-credit-card';

    protected static string|\UnitEnum|null $navigationGroup = 'Clients';

    protected static ?int $navigationSort = 11;

    protected static ?string $navigationLabel = 'Cartes fidélité';

    protected static ?string $modelLabel = 'Carte fidélité';

    protected static ?string $pluralModelLabel = 'Cartes fidélité';

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Section::make()->schema([
                Forms\Components\TextInput::make('card_number')
                    ->label('N° Carte')
                    ->disabled(),
                Forms\Components\Select::make('status')
                    ->label('Statut')
                    ->options(collect(LoyaltyCardStatus::cases())->mapWithKeys(
                        fn ($case) => [$case->value => $case->label()]
                    )),
                Forms\Components\Textarea::make('notes')
                    ->label('Notes')
                    ->rows(2)
                    ->columnSpanFull(),
            ])->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('card_number')
                    ->label('N° Carte')
                    ->searchable()
                    ->sortable()
                    ->copyable(),
                Tables\Columns\TextColumn::make('client.name')
                    ->label('Client')
                    ->searchable()
                    ->placeholder('—')
                    ->sortable(),
                Tables\Columns\TextColumn::make('client.phone_1')
                    ->label('Téléphone')
                    ->placeholder('—')
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\BadgeColumn::make('status')
                    ->label('Statut')
                    ->formatStateUsing(fn (LoyaltyCardStatus $state) => $state->label())
                    ->color(fn (LoyaltyCardStatus $state) => $state->color()),
                Tables\Columns\TextColumn::make('batch.name')
                    ->label('Lot')
                    ->placeholder('—')
                    ->toggleable(),
                Tables\Columns\TextColumn::make('assigned_at')
                    ->label('Assignée le')
                    ->date('d/m/Y')
                    ->placeholder('—')
                    ->sortable(),
                Tables\Columns\TextColumn::make('printed_at')
                    ->label('Imprimée le')
                    ->date('d/m/Y')
                    ->placeholder('—')
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->label('Statut')
                    ->options(collect(LoyaltyCardStatus::cases())->mapWithKeys(
                        fn ($case) => [$case->value => $case->label()]
                    )),
                Tables\Filters\SelectFilter::make('batch_id')
                    ->label('Lot')
                    ->relationship('batch', 'name'),
            ])
            ->actions([
                // Assign to client (available cards only)
                Action::make('assign')
                    ->label('Attribuer')
                    ->icon('heroicon-o-user-plus')
                    ->color('success')
                    ->visible(fn (LoyaltyCard $record) => $record->status === LoyaltyCardStatus::Available)
                    ->form([
                        Forms\Components\Select::make('client_id')
                            ->label('Client')
                            ->searchable()
                            ->getSearchResultsUsing(fn (string $search) => Client::where('name', 'like', "%{$search}%")
                                ->orWhere('phone_1', 'like', "%{$search}%")
                                ->limit(20)
                                ->pluck('name', 'id')
                            )
                            ->getOptionLabelUsing(fn ($value) => Client::find($value)?->name ?? "Client #{$value}")
                            ->required(),
                    ])
                    ->action(function (LoyaltyCard $record, array $data) {
                        try {
                            $client = Client::findOrFail($data['client_id']);
                            app(LoyaltyService::class)->assignCard($record, $client);
                            Notification::make()
                                ->title("Carte {$record->card_number} attribuée à {$client->name}")
                                ->success()->send();
                        } catch (\Throwable $e) {
                            Notification::make()->title($e->getMessage())->danger()->send();
                        }
                    }),

                // Mark lost (active cards only)
                Action::make('mark_lost')
                    ->label('Perdue')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->visible(fn (LoyaltyCard $record) => $record->status === LoyaltyCardStatus::Active)
                    ->requiresConfirmation()
                    ->modalHeading('Marquer la carte comme perdue ?')
                    ->modalDescription('Le client conserve tous ses points. Vous pourrez attribuer une nouvelle carte.')
                    ->form([
                        Forms\Components\Textarea::make('notes')
                            ->label('Notes')
                            ->rows(2),
                    ])
                    ->action(function (LoyaltyCard $record, array $data) {
                        try {
                            app(LoyaltyService::class)->markCardLost($record, $data['notes'] ?? null);
                            Notification::make()
                                ->title("Carte {$record->card_number} marquée comme perdue.")
                                ->success()->send();
                        } catch (\Throwable $e) {
                            Notification::make()->title($e->getMessage())->danger()->send();
                        }
                    }),

                // Replace card (lost cards only)
                Action::make('replace')
                    ->label('Remplacer')
                    ->icon('heroicon-o-arrow-path')
                    ->color('warning')
                    ->visible(fn (LoyaltyCard $record) => $record->status === LoyaltyCardStatus::Lost)
                    ->form([
                        Forms\Components\Select::make('new_card_id')
                            ->label('Nouvelle carte disponible')
                            ->searchable()
                            ->getSearchResultsUsing(fn (string $search) => LoyaltyCard::available()
                                ->where('card_number', 'like', "%{$search}%")
                                ->limit(20)
                                ->pluck('card_number', 'id')
                            )
                            ->getOptionLabelUsing(fn ($value) => LoyaltyCard::find($value)?->card_number)
                            ->required(),
                    ])
                    ->action(function (LoyaltyCard $record, array $data) {
                        try {
                            $newCard = LoyaltyCard::findOrFail($data['new_card_id']);
                            app(LoyaltyService::class)->replaceCard($newCard, $record);
                            Notification::make()
                                ->title("Carte remplacée par {$newCard->card_number}.")
                                ->success()->send();
                        } catch (\Throwable $e) {
                            Notification::make()->title($e->getMessage())->danger()->send();
                        }
                    }),

                // Print card
                Action::make('print')
                    ->label('Imprimer')
                    ->icon('heroicon-o-printer')
                    ->color('info')
                    ->url(fn (LoyaltyCard $record) => route('loyalty.print.single', $record))
                    ->openUrlInNewTab(),

                EditAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListLoyaltyCards::route('/'),
            'edit'  => Pages\EditLoyaltyCard::route('/{record}/edit'),
        ];
    }
}
