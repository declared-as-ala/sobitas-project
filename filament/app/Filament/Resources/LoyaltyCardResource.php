<?php

namespace App\Filament\Resources;

use App\Enums\LoyaltyCardStatus;
use App\Filament\Resources\LoyaltyCardResource\Pages;
use App\Models\Client;
use App\Models\LoyaltyCard;
use App\Services\LoyaltyService;
use Filament\Actions;
use Filament\Forms;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class LoyaltyCardResource extends Resource
{
    protected static ?string $model = LoyaltyCard::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-credit-card';

    protected static string|\UnitEnum|null $navigationGroup = 'Fidélité';

    protected static ?string $navigationLabel = 'Cartes fidélité';

    protected static ?int $navigationSort = 1;

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Section::make('Carte fidélité')
                ->schema([
                    Forms\Components\Select::make('client_id')
                        ->label('Client')
                        ->options(
                            Client::query()
                                ->orderBy('name')
                                ->orderBy('id')
                                ->get()
                                ->mapWithKeys(fn (Client $c): array => [$c->id => $c->full_name])
                                ->all()
                        )
                        ->getSearchResultsUsing(function (string $search): array {
                            return Client::query()
                                ->where(function (Builder $q) use ($search) {
                                    $q->where('name', 'like', "%{$search}%")
                                        ->orWhere('email', 'like', "%{$search}%")
                                        ->orWhere('phone_1', 'like', "%{$search}%")
                                        ->orWhere('id', $search);
                                })
                                ->orderBy('name')
                                ->limit(50)
                                ->get()
                                ->mapWithKeys(fn (Client $c): array => [$c->id => $c->full_name])
                                ->all();
                        })
                        ->getOptionLabelUsing(function ($value): string {
                            if ($value === null || $value === '') {
                                return '';
                            }

                            return Client::find($value)?->full_name ?? 'Client #' . $value;
                        })
                        ->required()
                        ->searchable(),
                    Forms\Components\TextInput::make('card_number')
                        ->label('Numéro de carte')
                        ->required()
                        ->maxLength(20)
                        ->unique(ignoreRecord: true),
                    Forms\Components\Select::make('status')
                        ->label('Statut')
                        ->options(LoyaltyCardStatus::options())
                        ->required()
                        ->default(LoyaltyCardStatus::Active->value),
                ])->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('card_number')
                    ->label('N° carte')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('client.name')
                    ->label('Client')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('client.phone_1')
                    ->label('Téléphone')
                    ->toggleable(),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(fn ($state) => $state instanceof LoyaltyCardStatus ? $state->label() : LoyaltyCardStatus::from((string)$state)->label())
                    ->color(fn ($state): string => ($state instanceof LoyaltyCardStatus ? $state : LoyaltyCardStatus::from((string)$state))->color()),
                Tables\Columns\TextColumn::make('current_points')
                    ->label('Points')
                    ->getStateUsing(fn (LoyaltyCard $record) => app(LoyaltyService::class)->getBalance($record->client_id))
                    ->sortable(false),
                Tables\Columns\TextColumn::make('current_value_dt')
                    ->label('Valeur (DT)')
                    ->getStateUsing(fn (LoyaltyCard $record) => number_format(app(LoyaltyService::class)->getMonetaryValue($record->client_id), 3, '.', ' ') . ' DT')
                    ->sortable(false),
                Tables\Columns\TextColumn::make('issued_at')
                    ->label('Émise le')
                    ->dateTime('d/m/Y')
                    ->sortable(),
            ])
            ->defaultSort('issued_at', 'desc')
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->label('Statut')
                    ->options(LoyaltyCardStatus::options()),
            ])
            ->actions([
                Actions\Action::make('print')
                    ->label('Imprimer')
                    ->icon('heroicon-o-printer')
                    ->url(fn (LoyaltyCard $record) => route('loyalty.card.print', $record->id))
                    ->openUrlInNewTab(),
                Actions\Action::make('add_points')
                    ->label('Ajouter points')
                    ->icon('heroicon-o-plus-circle')
                    ->color('success')
                    ->form([
                        Forms\Components\TextInput::make('points')
                            ->label('Points à ajouter')
                            ->integer()
                            ->minValue(1)
                            ->required(),
                        Forms\Components\TextInput::make('description')
                            ->label('Description')
                            ->default('Ajout manuel admin')
                            ->maxLength(255),
                    ])
                    ->action(function (LoyaltyCard $record, array $data) {
                        \App\Models\LoyaltyPointTransaction::create([
                            'client_id'   => $record->client_id,
                            'type'        => 'adjustment',
                            'points'      => (int) $data['points'],
                            'description' => $data['description'] ?? 'Ajout manuel',
                            'created_by'  => auth()->id(),
                        ]);
                        Notification::make()->title('Points ajoutés')->success()->send();
                    }),
                Actions\EditAction::make(),
            ])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListLoyaltyCards::route('/'),
            'edit'  => Pages\EditLoyaltyCard::route('/{record}/edit'),
        ];
    }

    public static function canCreate(): bool
    {
        return true;
    }
}
