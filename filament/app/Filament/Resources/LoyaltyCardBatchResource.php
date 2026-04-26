<?php

namespace App\Filament\Resources;

use App\Filament\Resources\LoyaltyCardBatchResource\Pages;
use App\Models\LoyaltyCardBatch;
use App\Services\LoyaltyService;
use Filament\Actions\Action;
use Filament\Actions\DeleteAction;
use Filament\Actions\EditAction;
use Filament\Forms;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;

class LoyaltyCardBatchResource extends Resource
{
    protected static ?string $model = LoyaltyCardBatch::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-rectangle-stack';

    protected static string|\UnitEnum|null $navigationGroup = 'Clients';

    protected static ?int $navigationSort = 10;

    protected static ?string $navigationLabel = 'Lots de cartes';

    protected static ?string $modelLabel = 'Lot de cartes fidélité';

    protected static ?string $pluralModelLabel = 'Lots de cartes fidélité';

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Section::make('Informations du lot')
                ->schema([
                    Forms\Components\TextInput::make('name')
                        ->label('Nom du lot')
                        ->placeholder('Ex: Ouverture boutique avril 2026')
                        ->maxLength(100),
                    Forms\Components\TextInput::make('prefix')
                        ->label('Préfixe')
                        ->default('SOBITAS')
                        ->required()
                        ->maxLength(10)
                        ->hint('Ex: SOBITAS → SOBITAS-000001'),
                    Forms\Components\TextInput::make('start_number')
                        ->label('Numéro de début')
                        ->numeric()
                        ->default(1)
                        ->minValue(1)
                        ->required(),
                    Forms\Components\TextInput::make('quantity')
                        ->label('Quantité')
                        ->numeric()
                        ->default(100)
                        ->minValue(1)
                        ->maxValue(4000)
                        ->required()
                        ->hint('Maximum 4000 cartes par lot'),
                    Forms\Components\TextInput::make('padding')
                        ->label('Longueur du numéro')
                        ->numeric()
                        ->default(6)
                        ->minValue(4)
                        ->maxValue(8)
                        ->hint('Ex: 6 → 000001'),
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
                Tables\Columns\TextColumn::make('name')
                    ->label('Nom du lot')
                    ->default('—')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('prefix')
                    ->label('Préfixe')
                    ->badge(),
                Tables\Columns\TextColumn::make('quantity')
                    ->label('Quantité')
                    ->sortable(),
                Tables\Columns\TextColumn::make('generated_count')
                    ->label('Générées')
                    ->sortable(),
                Tables\Columns\TextColumn::make('available_count')
                    ->label('Disponibles')
                    ->getStateUsing(fn (LoyaltyCardBatch $record) => $record->available_count)
                    ->badge()
                    ->color('gray'),
                Tables\Columns\TextColumn::make('active_count')
                    ->label('Actives')
                    ->getStateUsing(fn (LoyaltyCardBatch $record) => $record->active_count)
                    ->badge()
                    ->color('success'),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Créé le')
                    ->date('d/m/Y')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->defaultSort('created_at', 'desc')
            ->actions([
                Action::make('generate')
                    ->label('Générer')
                    ->icon('heroicon-o-sparkles')
                    ->color('success')
                    ->requiresConfirmation()
                    ->modalHeading(fn (LoyaltyCardBatch $record) => "Générer {$record->quantity} cartes ?")
                    ->modalDescription('Les cartes seront créées avec des numéros séquentiels et des codes QR uniques.')
                    ->visible(fn (LoyaltyCardBatch $record) => !$record->isGenerated())
                    ->action(function (LoyaltyCardBatch $record) {
                        try {
                            app(LoyaltyService::class)->generateBatch($record);
                            Notification::make()
                                ->title("{$record->generated_count} cartes générées avec succès.")
                                ->success()
                                ->send();
                        } catch (\Throwable $e) {
                            Notification::make()
                                ->title('Erreur lors de la génération')
                                ->body($e->getMessage())
                                ->danger()
                                ->send();
                        }
                    }),
                Action::make('print_batch')
                    ->label('Imprimer le lot')
                    ->icon('heroicon-o-printer')
                    ->color('info')
                    ->form([
                        Forms\Components\Select::make('per_page')
                            ->label('Cartes par planche A4')
                            ->options([
                                4 => '4 cartes',
                                6 => '6 cartes',
                                8 => '8 cartes',
                                10 => '10 cartes',
                                12 => '12 cartes',
                            ])
                            ->default(8)
                            ->required(),
                        Forms\Components\Select::make('side')
                            ->label('Faces à imprimer')
                            ->options([
                                'both' => 'Recto + verso',
                                'front' => 'Recto uniquement',
                            ])
                            ->default('both')
                            ->required(),
                    ])
                    ->action(function (LoyaltyCardBatch $record, array $data) {
                        return redirect()->away(route('loyalty.print.batch', [
                            'batch' => $record,
                            'per_page' => (int) ($data['per_page'] ?? 8),
                            'side' => (string) ($data['side'] ?? 'both'),
                        ]));
                    })
                    ->visible(fn (LoyaltyCardBatch $record) => $record->isGenerated()),
                Action::make('export_batch_pdf')
                    ->label('Exporter cartes pour impression')
                    ->icon('heroicon-o-document-arrow-down')
                    ->color('warning')
                    ->form([
                        Forms\Components\Select::make('per_page')
                            ->label('Cartes par planche A4')
                            ->options([
                                4 => '4 cartes',
                                6 => '6 cartes',
                                8 => '8 cartes',
                                10 => '10 cartes',
                                12 => '12 cartes',
                            ])
                            ->default(8)
                            ->required(),
                        Forms\Components\Select::make('side')
                            ->label('Faces dans le PDF')
                            ->options([
                                'both' => 'Recto + verso',
                                'front' => 'Recto uniquement',
                            ])
                            ->default('front')
                            ->required(),
                    ])
                    ->action(function (LoyaltyCardBatch $record, array $data) {
                        return redirect()->away(route('loyalty.export.batch.pdf', [
                            'batch' => $record,
                            'per_page' => (int) ($data['per_page'] ?? 8),
                            'side' => (string) ($data['side'] ?? 'front'),
                        ]));
                    })
                    ->visible(fn (LoyaltyCardBatch $record) => $record->isGenerated()),
                Action::make('export_csv')
                    ->label('Exporter lot CSV')
                    ->icon('heroicon-o-arrow-down-tray')
                    ->color('gray')
                    ->url(fn (LoyaltyCardBatch $record) => route('loyalty.export.csv', $record))
                    ->visible(fn (LoyaltyCardBatch $record) => $record->isGenerated()),
                EditAction::make(),
                DeleteAction::make()
                    ->visible(fn (LoyaltyCardBatch $record) => !$record->isGenerated()),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListLoyaltyCardBatches::route('/'),
            'create' => Pages\CreateLoyaltyCardBatch::route('/create'),
            'edit'   => Pages\EditLoyaltyCardBatch::route('/{record}/edit'),
        ];
    }
}
