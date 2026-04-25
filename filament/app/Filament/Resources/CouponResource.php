<?php

namespace App\Filament\Resources;

use App\Filament\Resources\CouponResource\Pages;
use App\Models\Coupon;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class CouponResource extends Resource
{
    protected static ?string $model = Coupon::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-ticket';

    protected static string | \UnitEnum | null $navigationGroup = 'Vente';

    protected static ?string $navigationLabel = 'Codes Promo';

    protected static ?int $navigationSort = 15;

    protected static ?string $recordTitleAttribute = 'code';

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Section::make('Code promo')
                ->schema([
                    Forms\Components\TextInput::make('code')
                        ->label('Code')
                        ->required()
                        ->maxLength(64)
                        ->unique(ignoreRecord: true)
                        ->live(onBlur: true)
                        ->afterStateUpdated(fn ($state, callable $set) => $set('code', $state ? strtoupper(trim((string) $state)) : $state))
                        ->helperText('Ex: SOBI10, RAMADAN15. Utilisez le bouton « Générer un code » en haut de la page pour suggérer un code.'),
                    Forms\Components\Select::make('type')
                        ->label('Type')
                        ->options([
                            Coupon::TYPE_PERCENT => 'Pourcentage',
                            Coupon::TYPE_FIXED => 'Montant fixe',
                            Coupon::TYPE_FREE_SHIPPING => 'Livraison gratuite',
                        ])
                        ->default(Coupon::TYPE_PERCENT)
                        ->required(),
                    Forms\Components\TextInput::make('value')
                        ->label('Valeur (%) ou montant DT')
                        ->numeric()
                        ->minValue(0)
                        ->default(10)
                        ->required()
                        ->helperText('Pour type Pourcentage: ex. 10 pour 10%. Pour type Montant fixe: ex. 5 pour 5 DT.'),
                ])->columns(2),

            Section::make('Validité')
                ->schema([
                    Forms\Components\DateTimePicker::make('starts_at')
                        ->label('Début de validité')
                        ->nullable(),
                    Forms\Components\DateTimePicker::make('ends_at')
                        ->label('Fin de validité')
                        ->nullable(),
                    Forms\Components\Toggle::make('is_active')
                        ->label('Actif')
                        ->default(true),
                ])->columns(3),

            Section::make('Limites')
                ->schema([
                    Forms\Components\TextInput::make('min_order_amount')
                        ->label('Montant minimum (HT) DT')
                        ->numeric()
                        ->minValue(0)
                        ->nullable(),
                    Forms\Components\TextInput::make('max_discount_amount')
                        ->label('Plafond remise (DT)')
                        ->numeric()
                        ->minValue(0)
                        ->nullable()
                        ->helperText('Pour type Pourcentage: plafonne la remise à ce montant.'),
                    Forms\Components\TextInput::make('usage_limit_total')
                        ->label('Limite d\'utilisation totale')
                        ->integer()
                        ->minValue(0)
                        ->nullable(),
                    Forms\Components\TextInput::make('usage_limit_per_client')
                        ->label('Limite par client')
                        ->integer()
                        ->minValue(0)
                        ->nullable(),
                    Forms\Components\Select::make('applies_to')
                        ->label('S\'applique à')
                        ->options(['order' => 'Commande'])
                        ->default('order'),
                ])->columns(2),

            Section::make('Notes')
                ->schema([
                    Forms\Components\Textarea::make('notes')
                        ->label('Notes internes')
                        ->maxLength(65535)
                        ->columnSpanFull(),
                ])->collapsible(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('code')
                    ->label('Code')
                    ->searchable()
                    ->sortable()
                    ->formatStateUsing(fn (string $state): string => strtoupper($state)),
                Tables\Columns\TextColumn::make('type')
                    ->label('Type')
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        Coupon::TYPE_PERCENT => 'Pourcentage',
                        Coupon::TYPE_FIXED => 'Montant fixe',
                        Coupon::TYPE_FREE_SHIPPING => 'Livraison gratuite',
                        default => $state,
                    }),
                Tables\Columns\TextColumn::make('value')
                    ->label('Valeur')
                    ->suffix(fn ($record) => $record && $record->type === Coupon::TYPE_PERCENT ? '%' : ' DT'),
                Tables\Columns\IconColumn::make('is_active')
                    ->label('Actif')
                    ->boolean(),
                Tables\Columns\TextColumn::make('starts_at')
                    ->label('Début')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('ends_at')
                    ->label('Fin')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('redemptions_count')
                    ->label('Utilisations')
                    ->counts('redemptions')
                    ->sortable(query: function (Builder $query, string $direction): Builder {
                        return $query->withCount('redemptions')->orderBy('redemptions_count', $direction);
                    }),
                Tables\Columns\TextColumn::make('last_used_at')
                    ->label('Dernière utilisation')
                    ->getStateUsing(function (Coupon $record) {
                        $last = $record->redemptions()->orderByDesc('created_at')->first();

                        return $last?->created_at?->format('d/m/Y H:i');
                    })
                    ->placeholder('—')
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                Tables\Filters\TernaryFilter::make('is_active')
                    ->label('Actif'),
                Tables\Filters\Filter::make('valid_now')
                    ->label('Valide maintenant')
                    ->query(fn (Builder $query): Builder => $query->where('is_active', true)
                        ->where(function ($q) {
                            $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
                        })
                        ->where(function ($q) {
                            $q->whereNull('ends_at')->orWhere('ends_at', '>=', now());
                        })),
            ])
            ->actions([
                Actions\EditAction::make(),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListCoupons::route('/'),
            'create' => Pages\CreateCoupon::route('/create'),
            'edit' => Pages\EditCoupon::route('/{record}/edit'),
        ];
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->withCount('redemptions');
    }
}
