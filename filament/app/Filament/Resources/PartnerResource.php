<?php

namespace App\Filament\Resources;

use App\Enums\PartnerStatus;
use App\Enums\PartnerType;
use App\Filament\Resources\PartnerResource\Pages;
use App\Models\Partner;
use App\Models\User;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class PartnerResource extends Resource
{
    protected static ?string $model = Partner::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-user-group';

    protected static string|\UnitEnum|null $navigationGroup = 'Partenaires';

    protected static ?string $navigationLabel = 'Partenaires';

    protected static ?int $navigationSort = 1;

    protected static ?string $recordTitleAttribute = 'name';

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Section::make('Identité du partenaire')
                ->schema([
                    Forms\Components\Select::make('type')
                        ->label('Type')
                        ->options(PartnerType::options())
                        ->required()
                        ->default(PartnerType::Coach->value),
                    Forms\Components\Select::make('status')
                        ->label('Statut')
                        ->options(PartnerStatus::options())
                        ->required()
                        ->default(PartnerStatus::Pending->value),
                    Forms\Components\TextInput::make('name')
                        ->label('Nom complet')
                        ->required()
                        ->maxLength(255),
                    Forms\Components\TextInput::make('business_name')
                        ->label('Nom du club / salle de sport')
                        ->maxLength(255)
                        ->nullable(),
                    Forms\Components\TextInput::make('email')
                        ->label('Email')
                        ->email()
                        ->maxLength(255)
                        ->nullable(),
                    Forms\Components\TextInput::make('phone')
                        ->label('Téléphone')
                        ->maxLength(20)
                        ->nullable(),
                    Forms\Components\Textarea::make('address')
                        ->label('Adresse')
                        ->maxLength(500)
                        ->nullable()
                        ->columnSpanFull(),
                    Forms\Components\FileUpload::make('avatar')
                        ->label('Logo / Photo')
                        ->image()
                        ->disk('public')
                        ->directory('partners')
                        ->nullable()
                        ->columnSpanFull(),
                ])->columns(2),

            Section::make('Commission')
                ->schema([
                    Forms\Components\TextInput::make('commission_rate')
                        ->label('Taux de commission (%)')
                        ->numeric()
                        ->minValue(0)
                        ->maxValue(100)
                        ->default(10)
                        ->required()
                        ->suffix('%'),
                ])->columns(1),

            Section::make('Compte utilisateur')
                ->schema([
                    Forms\Components\Select::make('user_id')
                        ->label('Compte de connexion')
                        ->relationship('user', 'email')
                        ->searchable()
                        ->preload()
                        ->nullable()
                        ->helperText('Associer un compte utilisateur pour accès au tableau de bord partenaire (role_id = 4).'),
                ]),

            Section::make('Informations de paiement')
                ->schema([
                    Forms\Components\TextInput::make('payout_method')
                        ->label('Méthode de paiement')
                        ->maxLength(100)
                        ->nullable(),
                    Forms\Components\TextInput::make('bank_name')
                        ->label('Banque')
                        ->maxLength(100)
                        ->nullable(),
                    Forms\Components\TextInput::make('rib_or_iban')
                        ->label('RIB / IBAN')
                        ->maxLength(255)
                        ->nullable(),
                    Forms\Components\Textarea::make('notes')
                        ->label('Notes internes')
                        ->maxLength(1000)
                        ->nullable()
                        ->columnSpanFull(),
                ])->columns(2)->collapsible(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('avatar')
                    ->label('')
                    ->disk('public')
                    ->circular()
                    ->size(40),
                Tables\Columns\TextColumn::make('name')
                    ->label('Nom')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('type')
                    ->label('Type')
                    ->badge()
                    ->formatStateUsing(fn ($state) => $state instanceof PartnerType ? $state->label() : PartnerType::from($state)->label())
                    ->color(fn ($state): string => match (($state instanceof PartnerType ? $state->value : $state)) {
                        'coach' => 'info',
                        'gym'   => 'warning',
                        default => 'gray',
                    }),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(fn ($state) => $state instanceof PartnerStatus ? $state->label() : PartnerStatus::from($state)->label())
                    ->color(fn ($state): string => ($state instanceof PartnerStatus ? $state : PartnerStatus::from($state))->color()),
                Tables\Columns\TextColumn::make('commission_rate')
                    ->label('Commission')
                    ->suffix('%')
                    ->sortable(),
                Tables\Columns\TextColumn::make('coupons_count')
                    ->label('Codes promo')
                    ->counts('coupons')
                    ->sortable(),
                Tables\Columns\TextColumn::make('commandes_count')
                    ->label('Commandes')
                    ->counts('commandes')
                    ->sortable(),
                Tables\Columns\TextColumn::make('phone')
                    ->label('Téléphone')
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Créé le')
                    ->dateTime('d/m/Y')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                Tables\Filters\SelectFilter::make('type')
                    ->label('Type')
                    ->options(PartnerType::options()),
                Tables\Filters\SelectFilter::make('status')
                    ->label('Statut')
                    ->options(PartnerStatus::options()),
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
            'index'  => Pages\ListPartners::route('/'),
            'create' => Pages\CreatePartner::route('/create'),
            'edit'   => Pages\EditPartner::route('/{record}/edit'),
        ];
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->withCount(['coupons', 'commandes']);
    }
}
