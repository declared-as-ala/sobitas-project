<?php

namespace App\Filament\Resources;

use App\Enums\AffilieStatus;
use App\Enums\AffilieType;
use App\Filament\Resources\AffilieResource\Pages;
use App\Filament\Resources\AffilieResource\RelationManagers\AffilieCodesRelationManager;
use App\Models\Affilie;
use App\Models\User;
use App\Services\AffilieTransactionService;
use Filament\Actions;
use Filament\Forms;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class AffilieResource extends Resource
{
    protected static ?string $model = Affilie::class;

    protected static ?AffilieType $restrictedType = null;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-user-group';

    protected static string | \UnitEnum | null $navigationGroup = 'Affiliés';

    protected static ?string $navigationLabel = 'Affiliés';

    protected static ?string $modelLabel = 'Affilié';

    protected static ?string $pluralModelLabel = 'Affiliés';

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
                                ->options(collect(AffilieType::cases())->mapWithKeys(fn (AffilieType $t) => [$t->value => $t->label()]))
                                ->default(AffilieType::Coach->value)
                                ->required(),
                        ]),
                    Forms\Components\TextInput::make('name')
                        ->label('Nom')
                        ->required()
                        ->maxLength(255),
                    Forms\Components\TextInput::make('email')
                        ->label('Email')
                        ->email()
                        ->nullable()
                        ->maxLength(255),
                    Forms\Components\TextInput::make('phone')
                        ->label('Téléphone')
                        ->tel()
                        ->maxLength(64),
                    Forms\Components\Select::make('status')
                        ->label('Statut')
                        ->options([
                            AffilieStatus::Active->value => AffilieStatus::Active->label(),
                            AffilieStatus::Suspended->value => AffilieStatus::Suspended->label(),
                        ])
                        ->default(AffilieStatus::Active->value)
                        ->required(),
                    Forms\Components\TextInput::make('commission_rate')
                        ->label('Commission par défaut (%)')
                        ->numeric()
                        ->default(10)
                        ->required(),
                    Forms\Components\Textarea::make('notes')
                        ->label('Notes')
                        ->columnSpanFull()
                        ->rows(2),
                ])->columns(2),

            Section::make('Coordonnées avancées')
                ->collapsed()
                ->schema([
                    Forms\Components\TextInput::make('business_name')
                        ->label('Raison sociale')
                        ->maxLength(255),
                    Forms\Components\Textarea::make('address')
                        ->label('Adresse')
                        ->rows(2)
                        ->columnSpanFull(),
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
                    Forms\Components\Textarea::make('admin_notes')
                        ->label('Notes admin (legacy)')
                        ->columnSpanFull(),
                ])->columns(2),
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
                        if ($state instanceof AffilieType) {
                            return $state->label();
                        }

                        return AffilieType::tryFrom((string) $state)?->label() ?? (string) $state;
                    }),
                Tables\Columns\TextColumn::make('phone')->label('Téléphone')->searchable(),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(function (mixed $state): string {
                        if ($state instanceof AffilieStatus) {
                            return $state->label();
                        }

                        return AffilieStatus::tryFrom((string) $state)?->label() ?? (string) $state;
                    }),
                Tables\Columns\TextColumn::make('commission_rate')->label('Com. %')->alignEnd(),
                Tables\Columns\TextColumn::make('current_balance')->label('Solde')->numeric(decimalPlaces: 3)->alignEnd(),
                Tables\Columns\TextColumn::make('total_earned')->label('Total gagné')->numeric(decimalPlaces: 3)->alignEnd(),
                Tables\Columns\TextColumn::make('total_paid')->label('Total payé')->numeric(decimalPlaces: 3)->alignEnd(),
                Tables\Columns\TextColumn::make('user.email')->label('Compte')->placeholder('—'),
            ])
            ->defaultSort('created_at', 'desc')
            ->actions([
                Actions\EditAction::make(),
                Actions\Action::make('pay_affilie')
                    ->label('Payer')
                    ->icon('heroicon-o-banknotes')
                    ->color('success')
                    ->visible(fn (Affilie $record): bool => $record->status === AffilieStatus::Active)
                    ->form([
                        Forms\Components\TextInput::make('amount')
                            ->label('Montant (DT)')
                            ->numeric()
                            ->required()
                            ->default(fn (Affilie $record): float => round(max(0.0, (float) ($record->current_balance ?? 0)), 3))
                            ->helperText(fn (Affilie $record): string => 'Solde disponible : ' . number_format((float) ($record->current_balance ?? 0), 3, '.', ' ') . ' DT'),
                        Forms\Components\TextInput::make('payment_reference')
                            ->label('Référence / note paiement')
                            ->maxLength(128),
                        Forms\Components\Textarea::make('admin_note')
                            ->label('Note interne')
                            ->rows(2),
                    ])
                    ->action(function (Affilie $record, array $data): void {
                        app(AffilieTransactionService::class)->recordAffiliePayment(
                            $record,
                            (float) $data['amount'],
                            $data['admin_note'] ?? null,
                            $data['payment_reference'] ?? null,
                        );
                        Notification::make()->title('Paiement enregistré et marqué payé.')->success()->send();
                    }),
                Actions\Action::make('invite')
                    ->label('Invitation')
                    ->icon('heroicon-o-envelope')
                    ->requiresConfirmation()
                    ->visible(fn (Affilie $record): bool => $record->status === AffilieStatus::Active && $record->email)
                    ->action(function (Affilie $record): void {
                        $email = (string) $record->email;
                        if ($email === '') {
                            return;
                        }

                        $user = User::query()->firstOrCreate(
                            ['email' => $email],
                            [
                                'name' => $record->name,
                                'password' => Hash::make(Str::random(40)),
                                'role_id' => Affilie::availableCommissionRoleId(),
                            ]
                        );

                        if ((int) $user->role_id !== Affilie::availableCommissionRoleId()) {
                            $user->forceFill(['role_id' => Affilie::availableCommissionRoleId()])->save();
                        }

                        $record->forceFill(['user_id' => $user->id])->save();

                        $token = Password::broker()->createToken($user);
                        $user->sendAffilieInvitationResetNotification($token);
                    }),
                Actions\Action::make('suspend')
                    ->label('Suspendre')
                    ->color('warning')
                    ->visible(fn (Affilie $record): bool => $record->status === AffilieStatus::Active)
                    ->requiresConfirmation()
                    ->action(fn (Affilie $record) => $record->update(['status' => AffilieStatus::Suspended])),
                Actions\Action::make('activate')
                    ->label('Activer')
                    ->color('success')
                    ->visible(fn (Affilie $record): bool => $record->status === AffilieStatus::Suspended)
                    ->requiresConfirmation()
                    ->action(fn (Affilie $record) => $record->update(['status' => AffilieStatus::Active])),
            ])
            ->bulkActions([]);
    }

    public static function getRelations(): array
    {
        return [
            AffilieCodesRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListAffilies::route('/'),
            'create' => Pages\CreateAffilie::route('/create'),
            'edit' => Pages\EditAffilie::route('/{record}/edit'),
        ];
    }
}
