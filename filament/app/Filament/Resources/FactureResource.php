<?php

namespace App\Filament\Resources;

use App\Filament\Resources\FactureResource\Pages;
use App\Models\Facture;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class FactureResource extends Resource
{
    protected static ?string $model = Facture::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-document-text';

    protected static string | \UnitEnum | null $navigationGroup = 'Facturation & Tickets';

    protected static ?int $navigationSort = 1;

    protected static ?string $modelLabel = 'Bon de Livraison';

    protected static ?string $pluralModelLabel = 'Bons de Livraison';

    protected static ?string $recordTitleAttribute = 'numero';

    protected static bool $isGloballySearchable = false;

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\Section::make('Informations du bon de livraison')
                ->schema([
                    Forms\Components\Select::make('client_id')
                        ->label('Client')
                        ->relationship('client', 'name')
                        ->searchable()
                        ->preload()
                        ->required(),
                    Forms\Components\TextInput::make('numero')
                        ->label('Numéro')
                        ->disabled()
                        ->dehydrated(false),
                    Forms\Components\TextInput::make('remise')
                        ->label('Remise')
                        ->numeric()
                        ->prefix('DT')
                        ->default(0),
                    Forms\Components\TextInput::make('pourcentage_remise')
                        ->label('% Remise')
                        ->numeric()
                        ->suffix('%')
                        ->default(0),
                    Forms\Components\TextInput::make('timbre')
                        ->label('Timbre fiscal')
                        ->numeric()
                        ->prefix('DT')
                        ->default(0),
                    Forms\Components\TextInput::make('prix_ht')
                        ->label('Prix HT')
                        ->numeric()
                        ->prefix('DT')
                        ->disabled(),
                    Forms\Components\TextInput::make('prix_ttc')
                        ->label('Prix TTC')
                        ->numeric()
                        ->prefix('DT')
                        ->disabled(),
                ])
                ->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            // Eager load client to prevent N+1 on client.name column
            ->modifyQueryUsing(fn (Builder $query) => $query->with('client:id,name'))
            ->striped()
            ->columns([
                Tables\Columns\TextColumn::make('numero')
                    ->label('N°')
                    ->searchable()
                    ->sortable()
                    ->weight(\Filament\Support\Enums\FontWeight::Bold),
                Tables\Columns\TextColumn::make('client.name')
                    ->label('Client')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('prix_ttc')
                    ->label('Total TTC')
                    ->money('TND')
                    ->sortable()
                    ->alignEnd(),
                Tables\Columns\TextColumn::make('remise')
                    ->label('Remise')
                    ->money('TND')
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->alignEnd(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime('d/m/Y')
                    ->sortable()
                    ->color('gray'),
            ])
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(25)
            ->actions([
                Actions\EditAction::make(),
                Actions\Action::make('print')
                    ->label('Imprimer')
                    ->icon('heroicon-o-printer')
                    ->color('gray')
                    ->modalHeading('Aperçu d\'impression')
                    ->modalContent(fn (Facture $record) => view('filament.components.print-modal', [
                        'printUrl' => route('factures.print', ['facture' => $record->id]),
                        'title' => 'Bon de livraison ' . $record->numero,
                    ]))
                    ->modalSubmitAction(false)
                    ->closeParentActions(),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Actions\DeleteBulkAction::make(),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            FactureResource\RelationManagers\DetailsRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListFactures::route('/'),
            'create' => Pages\CreateFacture::route('/create'),
            'edit'   => Pages\EditFacture::route('/{record}/edit'),
        ];
    }
}
