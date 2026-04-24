<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PartnerPayoutResource\Pages;
use App\Models\Partner;
use App\Models\PartnerPayout;
use App\Services\PartnerCommissionService;
use Filament\Actions;
use Filament\Forms;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class PartnerPayoutResource extends Resource
{
    protected static ?string $model = PartnerPayout::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-banknotes';

    protected static string|\UnitEnum|null $navigationGroup = 'Partenaires';

    protected static ?string $navigationLabel = 'Paiements partenaires';

    protected static ?int $navigationSort = 4;

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Section::make('Paiement partenaire')
                ->schema([
                    Forms\Components\Select::make('partner_id')
                        ->label('Partenaire')
                        ->options(Partner::where('status', 'active')->pluck('name', 'id'))
                        ->required()
                        ->searchable()
                        ->reactive()
                        ->afterStateUpdated(function ($state, callable $set) {
                            if ($state) {
                                $partner = Partner::find($state);
                                if ($partner) {
                                    $set('_available_balance', number_format($partner->available_balance, 3) . ' DT');
                                }
                            }
                        }),
                    Forms\Components\Placeholder::make('_available_balance')
                        ->label('Solde disponible')
                        ->content(fn ($get) => $get('_available_balance') ?? '—'),
                    Forms\Components\TextInput::make('amount')
                        ->label('Montant à payer (DT)')
                        ->numeric()
                        ->minValue(0.001)
                        ->required(),
                    Forms\Components\TextInput::make('payment_reference')
                        ->label('Référence de paiement')
                        ->maxLength(255)
                        ->nullable(),
                    Forms\Components\Textarea::make('admin_note')
                        ->label('Note admin')
                        ->maxLength(1000)
                        ->nullable()
                        ->columnSpanFull(),
                ])->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
                Tables\Columns\TextColumn::make('partner.name')
                    ->label('Partenaire')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('amount')
                    ->label('Montant')
                    ->formatStateUsing(fn ($state) => number_format((float) $state, 3, '.', ' ') . ' DT')
                    ->sortable(),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'paid'      => 'success',
                        'pending'   => 'warning',
                        'cancelled' => 'danger',
                        default     => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'paid'      => 'Payé',
                        'pending'   => 'En attente',
                        'cancelled' => 'Annulé',
                        default     => $state,
                    }),
                Tables\Columns\TextColumn::make('payment_reference')
                    ->label('Référence')
                    ->placeholder('—')
                    ->toggleable(),
                Tables\Columns\TextColumn::make('paid_at')
                    ->label('Payé le')
                    ->dateTime('d/m/Y H:i')
                    ->placeholder('—')
                    ->toggleable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                Tables\Filters\SelectFilter::make('partner_id')
                    ->label('Partenaire')
                    ->relationship('partner', 'name')
                    ->searchable()
                    ->preload(),
                Tables\Filters\SelectFilter::make('status')
                    ->label('Statut')
                    ->options([
                        'pending'   => 'En attente',
                        'paid'      => 'Payé',
                        'cancelled' => 'Annulé',
                    ]),
            ])
            ->actions([
                Actions\Action::make('mark_paid')
                    ->label('Marquer payé')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->visible(fn (PartnerPayout $record) => $record->status === 'pending')
                    ->requiresConfirmation()
                    ->action(function (PartnerPayout $record) {
                        app(PartnerCommissionService::class)->recordPayout($record);
                        Notification::make()->title('Paiement enregistré')->success()->send();
                    }),
                Actions\EditAction::make(),
            ])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListPartnerPayouts::route('/'),
            'create' => Pages\CreatePartnerPayout::route('/create'),
            'edit'   => Pages\EditPartnerPayout::route('/{record}/edit'),
        ];
    }

    public static function mutateFormDataBeforeCreate(array $data): array
    {
        $data['created_by'] = auth()->id();
        return $data;
    }
}
