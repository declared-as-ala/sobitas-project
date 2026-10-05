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
                        ->required()->live(),
                    Forms\Components\TextInput::make('value')
                        ->label('Valeur (%) ou montant DT')
                        ->numeric()
                        ->minValue(0)
                        ->default(10)
                        ->required()
                        ->live(onBlur: true)
                        ->helperText('Pour type Pourcentage: ex. 10 pour 10%. Pour type Montant fixe: ex. 5 pour 5 DT.'),
                    // v2 (rollback) only: the old 10 % advisory.
                    Forms\Components\Placeholder::make('discount_warning')
                        ->label('Attention')
                        ->content(fn () => 'Cette remise dépasse le seuil recommandé de '.config('loyalty.coupons.warn_above_percent', 10).' % des articles. Elle reste autorisée et sera auditée.')
                        ->visible(function (callable $get): bool {
                            if (self::guardedRules()) {
                                return false;
                            }
                            $warn = (float) config('loyalty.coupons.warn_above_percent', 10);
                            $value = (float) $get('value');
                            return ($get('type') === Coupon::TYPE_PERCENT && $value > $warn)
                                || ($get('type') === Coupon::TYPE_FIXED
                                    && $value > (float) $get('min_order_amount') * $warn / 100);
                        }),
                    // Protinas v3: the largest code that never eats into the shop's margin floor, from the
                    // hidden order budget (OrderBudget). Only the derived thresholds are shown.
                    Forms\Components\Placeholder::make('safe_discount')
                        ->label('Remise sûre')
                        ->content(fn (callable $get): string => self::safeDiscountHint(
                            (string) $get('type'), (float) $get('value'), (float) $get('min_order_amount'),
                            (bool) $get('allow_over_budget')))
                        ->visible(fn (): bool => self::guardedRules())
                        ->columnSpanFull(),
                    Forms\Components\Toggle::make('allow_over_budget')
                        ->label('Accepter une perte possible')
                        ->helperText('Désactivé (recommandé) : le code est plafonné sur chaque commande pour que la boutique reste gagnante. Activé : le code est honoré en entier, même quand la commande devient perdante.')
                        ->default(false)
                        ->live()
                        ->visible(fn (): bool => \Illuminate\Support\Facades\Schema::hasColumn('coupons', 'allow_over_budget'))
                        ->columnSpanFull(),
                    // The confirmation the toggle needs: asked only when switching it ON.
                    Forms\Components\Checkbox::make('confirm_over_budget')
                        ->label('Je confirme : ce code pourra faire perdre de l’argent à la boutique sur certaines commandes.')
                        ->accepted()
                        ->dehydrated(false)
                        ->visible(fn (callable $get, ?Coupon $record): bool => (bool) $get('allow_over_budget')
                            && ! (bool) ($record?->allow_over_budget ?? false))
                        ->columnSpanFull(),
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
                        ->live(onBlur: true)
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
                // The public vps-run reports (protinas:coupons-review, protinas:audit) name codes by this
                // number only, never by the code itself.
                Tables\Columns\TextColumn::make('id')
                    ->label('#')
                    ->sortable()
                    ->searchable()
                    ->toggleable(),
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
                Tables\Columns\IconColumn::make('allow_over_budget')
                    ->label('Perte acceptée')
                    ->boolean()
                    ->trueColor('danger')
                    ->falseColor('gray')
                    ->visible(fn (): bool => \Illuminate\Support\Facades\Schema::hasColumn('coupons', 'allow_over_budget'))
                    ->toggleable(),
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

    /** v3 rules with the code guard on: the budget-based hint replaces the old 10 % advisory. */
    public static function guardedRules(): bool
    {
        return (int) config('loyalty.rules_version', 3) >= 3;
    }

    /**
     * « Remise sûre max : 5 % dès 60 DT » and friends, for the code being typed. French, staff-facing.
     * Never shows the budget itself, only the thresholds derived from it.
     */
    public static function safeDiscountHint(string $type, float $value, float $minOrderDt, bool $allowOver): string
    {
        $budget = app(\App\Services\OrderBudget::class);
        $guard = (bool) config('loyalty.coupons.margin_guard', true);
        $minLabel = $minOrderDt > 0 ? rtrim(rtrim(number_format($minOrderDt, 3, ',', ' '), '0'), ',').' DT' : null;
        $lines = [];
        if ($type === Coupon::TYPE_FREE_SHIPPING) {
            $from = $budget->freeShippingCodeFromDt();
            $lines[] = $from !== null
                ? 'Livraison offerte sûre dès '.$from.' DT d’articles. En dessous, le client garde la livraison à payer (le code n’est pas consommé).'
                : 'Livraison offerte jamais sûre avec la marge plancher actuelle.';
            if ($from !== null && $minOrderDt < $from) {
                $lines[] = 'Conseil : montant minimum '.$from.' DT.';
            }
        } elseif ($type === Coupon::TYPE_FIXED) {
            $from = $value > 0 ? $budget->safeFixedFrom($value) : 1;
            $lines[] = $from !== null
                ? 'Montant sûr dès '.$from.' DT d’articles pour '.rtrim(rtrim(number_format($value, 3, ',', ' '), '0'), ',').' DT de remise.'
                : 'Ce montant n’est jamais sûr avec la marge plancher actuelle.';
            if ($from !== null && $minOrderDt < $from) {
                $lines[] = 'En dessous de '.$from.' DT, le code sera réduit automatiquement. Conseil : montant minimum '.$from.' DT.';
            }
        } else {
            $reference = $minOrderDt > 0 ? $minOrderDt : 60.0;
            $safe = $budget->safeCouponPercent($reference);
            $lines[] = $safe > 0
                ? 'Remise sûre max : '.$safe.' % dès '.($minLabel ?? '60 DT').($minLabel === null ? ' (exemple : aucun montant minimum saisi)' : '').'.'
                : 'Aucun pourcentage n’est sûr dès '.($minLabel ?? '60 DT').' : augmentez le montant minimum.';
            if ($value > 0) {
                $from = $budget->safePercentFromDt((int) ceil($value));
                $lines[] = $from !== null
                    ? 'Ce code de '.rtrim(rtrim(number_format($value, 2, ',', ''), '0'), ',').' % est entier dès '.$from.' DT d’articles'
                        .($minOrderDt < $from ? ' ; en dessous il sera réduit automatiquement. Conseil : montant minimum '.$from.' DT.' : '.')
                    : 'Ce code de '.rtrim(rtrim(number_format($value, 2, ',', ''), '0'), ',').' % sera toujours réduit : il dépasse la marge plancher.';
            }
        }
        if ($allowOver) {
            $lines[] = '⚠ Perte acceptée : ce code est honoré en entier, même au-delà de la remise sûre.';
        } elseif (! $guard) {
            $lines[] = '⚠ Le plafonnement des codes est désactivé (COUPON_MARGIN_GUARD=false).';
        } else {
            $lines[] = 'Le code est plafonné automatiquement sur chaque commande : la boutique reste gagnante.';
        }

        return implode(' ', $lines);
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
