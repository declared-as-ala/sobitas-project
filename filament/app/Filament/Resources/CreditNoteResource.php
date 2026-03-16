<?php

namespace App\Filament\Resources;

use App\Enums\CreditNoteStatus;
use App\Models\CreditNote;
use App\Models\FactureTva;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class CreditNoteResource extends Resource
{
    protected static ?string $model = CreditNote::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-document-minus';

    protected static string | \UnitEnum | null $navigationGroup = 'Facturation & Tickets';

    protected static ?int $navigationSort = 5;

    protected static ?string $modelLabel = 'Avoir';

    protected static ?string $pluralModelLabel = 'Avoirs';

    protected static ?string $recordTitleAttribute = 'numero';

    public static function getGloballySearchableAttributes(): array
    {
        return ['numero'];
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Section::make('Avoir')
                ->schema([
                    Forms\Components\Select::make('facture_tva_id')
                        ->label('Facture concernée')
                        ->relationship('factureTva', 'numero')
                        ->getOptionLabelFromRecordUsing(fn ($r) => $r->numero . ' — ' . ($r->client?->name ?? '') . ' — ' . number_format((float) $r->prix_ttc, 2, ',', ' ') . ' DT')
                        ->required()
                        ->searchable(),
                    Forms\Components\TextInput::make('numero')
                        ->label('N° Avoir')
                        ->required()
                        ->default(fn () => app(\App\Services\NumberSequenceService::class)->nextAvoir()),
                    Forms\Components\TextInput::make('total_ht')
                        ->label('Total HT (DT)')
                        ->numeric()
                        ->required()
                        ->default(0),
                    Forms\Components\TextInput::make('total_ttc')
                        ->label('Total TTC (DT)')
                        ->numeric()
                        ->required()
                        ->default(0),
                    Forms\Components\Select::make('status')
                        ->label('Statut')
                        ->options([
                            CreditNoteStatus::Draft->value => CreditNoteStatus::Draft->label(),
                            CreditNoteStatus::Issued->value => CreditNoteStatus::Issued->label(),
                        ])
                        ->default(CreditNoteStatus::Draft->value)
                        ->required(),
                    Forms\Components\DateTimePicker::make('issued_at')
                        ->label('Date d\'émission')
                        ->nullable(),
                ])
                ->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $q) => $q->with('factureTva:id,numero,client_id'))
            ->columns([
                Tables\Columns\TextColumn::make('numero')->label('N°')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('factureTva.numero')->label('Facture')->sortable(),
                Tables\Columns\TextColumn::make('total_ttc')->label('Montant TTC')->money('TND')->sortable(),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(fn ($state) => $state?->label() ?? (is_string($state) ? $state : '—'))
                    ->color(fn ($state) => ($state?->value ?? '') === 'issued' ? 'success' : 'gray')
                    ->toggleable(),
                Tables\Columns\TextColumn::make('issued_at')->label('Émis le')->dateTime('d/m/Y')->sortable()->toggleable(),
                Tables\Columns\TextColumn::make('created_at')->label('Créé le')->dateTime('d/m/Y')->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->actions([
                Actions\EditAction::make(),
            ])
            ->bulkActions([
                Actions\DeleteBulkAction::make(),
            ]);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => \App\Filament\Resources\CreditNoteResource\Pages\ListCreditNotes::route('/'),
            'create' => \App\Filament\Resources\CreditNoteResource\Pages\CreateCreditNote::route('/create'),
            'edit' => \App\Filament\Resources\CreditNoteResource\Pages\EditCreditNote::route('/{record}/edit'),
        ];
    }
}
