<?php

namespace App\Filament\Resources;

use App\Enums\PartnerStatus;
use App\Enums\PartnerType;
use App\Filament\Resources\PartnerResource\Pages;
use App\Filament\Resources\PartnerResource\RelationManagers\PartnerCouponsRelationManager;
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
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class PartnerResource extends Resource
{
    protected static ?string $model = Partner::class;

    protected static ?PartnerType $restrictedType = null;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-user-group';

    protected static string | \UnitEnum | null $navigationGroup = 'Partenaires';

    protected static ?string $navigationLabel = 'Partenaires';

    protected static ?string $modelLabel = 'Partenaire';

    protected static ?string $pluralModelLabel = 'Partenaires';

    protected static ?int $navigationSort = 1;

    public static function getEloquentQuery(): Builder
    {
        $q = parent::getEloquentQuery();

        if (static::$restrictedType !== null) {
            $q->where('type', static::$restrictedType);
        }

        return $q;
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Section::make('Profil')
                ->schema([
                    ...(static::$restrictedType !== null
                        ? [
                            Forms\Components\Hidden::make('type')
                                ->default(static::$restrictedType->value),
                        ]
                        : [
                            Forms\Components\Select::make('type')
                                ->label('Type')
                                ->options(collect(PartnerType::cases())->mapWithKeys(fn (PartnerType $t) => [$t->value => $t->label()]))
                                ->default(PartnerType::Coach->value)
                                ->required(),
                        ]),
                    Forms\Components\TextInput::make('name')
                        ->label('Nom')
                        ->required()
                        ->maxLength(255),
                    Forms\Components\TextInput::make('business_name')
                        ->label('Raison sociale')
                        ->maxLength(255),
                    Forms\Components\TextInput::make('email')
                        ->label('Email')
                        ->email()
                        ->required()
                        ->maxLength(255),
                    Forms\Components\TextInput::make('phone')
                        ->label('Téléphone')
                        ->tel()
                        ->maxLength(64),
                    Forms\Components\Textarea::make('address')
                        ->label('Adresse')
                        ->rows(2)
                        ->columnSpanFull(),
                    Forms\Components\Select::make('status')
                        ->label('Statut')
                        ->options(collect(PartnerStatus::cases())->mapWithKeys(fn (PartnerStatus $s) => [$s->value => $s->label()]))
                        ->default(PartnerStatus::Pending->value)
                        ->required(),
                    Forms\Components\TextInput::make('default_commission_rate')
                        ->label('Commission par défaut (%)')
                        ->numeric()
                        ->default(10)
                        ->required(),
                ])->columns(2),

            Section::make('Paiement')
                ->schema([
                    Forms\Components\TextInput::make('payment_method')
                        ->label('Méthode de paiement')
                        ->maxLength(64),
                    Forms\Components\TextInput::make('bank_name')
                        ->label('Banque')
                        ->maxLength(128),
                    Forms\Components\TextInput::make('rib_or_iban')
                        ->label('RIB / IBAN')
                        ->maxLength(128),
                    Forms\Components\Textarea::make('payout_notes')
                        ->label('Notes paiement')
                        ->columnSpanFull(),
                ])->columns(2)->collapsed(),

            Section::make('Interne')
                ->schema([
                    Forms\Components\Textarea::make('admin_notes')
                        ->label('Notes admin')
                        ->columnSpanFull(),
                ])->collapsed(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')->label('Nom')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('type')
                    ->label('Type')
                    ->formatStateUsing(function (mixed $state): string {
                        if ($state instanceof PartnerType) {
                            return $state->label();
                        }

                        return PartnerType::tryFrom((string) $state)?->label() ?? (string) $state;
                    }),
                Tables\Columns\TextColumn::make('email')->label('Email')->searchable(),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(function (mixed $state): string {
                        if ($state instanceof PartnerStatus) {
                            return $state->label();
                        }

                        return PartnerStatus::tryFrom((string) $state)?->label() ?? (string) $state;
                    }),
                Tables\Columns\TextColumn::make('default_commission_rate')->label('Com. %')->alignEnd(),
                Tables\Columns\TextColumn::make('user.email')->label('Compte')->placeholder('—'),
            ])
            ->defaultSort('created_at', 'desc')
            ->actions([
                Actions\EditAction::make(),
                Actions\Action::make('invite')
                    ->label('Invitation')
                    ->icon('heroicon-o-envelope')
                    ->requiresConfirmation()
                    ->visible(fn (Partner $record): bool => $record->status === PartnerStatus::Active)
                    ->action(function (Partner $record): void {
                        $user = User::query()->firstOrCreate(
                            ['email' => $record->email],
                            [
                                'name' => $record->name,
                                'password' => Hash::make(Str::random(40)),
                                'role_id' => Partner::availableCommissionRoleId(),
                            ]
                        );

                        if ((int) $user->role_id !== Partner::availableCommissionRoleId()) {
                            $user->forceFill(['role_id' => Partner::availableCommissionRoleId()])->save();
                        }

                        $record->forceFill(['user_id' => $user->id])->save();

                        $token = Password::broker()->createToken($user);
                        $user->sendPartnerInvitationResetNotification($token);
                    }),
                Actions\Action::make('suspend')
                    ->label('Suspendre')
                    ->color('warning')
                    ->visible(fn (Partner $record): bool => $record->status === PartnerStatus::Active)
                    ->requiresConfirmation()
                    ->action(fn (Partner $record) => $record->update(['status' => PartnerStatus::Suspended])),
                Actions\Action::make('activate')
                    ->label('Activer')
                    ->color('success')
                    ->visible(fn (Partner $record): bool => in_array($record->status, [PartnerStatus::Pending, PartnerStatus::Suspended], true))
                    ->requiresConfirmation()
                    ->action(fn (Partner $record) => $record->update(['status' => PartnerStatus::Active])),
            ])
            ->bulkActions([]);
    }

    public static function getRelations(): array
    {
        return [
            PartnerCouponsRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPartners::route('/'),
            'create' => Pages\CreatePartner::route('/create'),
            'edit' => Pages\EditPartner::route('/{record}/edit'),
        ];
    }
}
