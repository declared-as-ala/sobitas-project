<?php

namespace App\Filament\Resources;

use App\Filament\Resources\FactureTvaResource\Pages;
use App\Models\FactureTva;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class FactureTvaResource extends Resource
{
    protected static ?string $model = FactureTva::class;
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-document-duplicate';
    protected static string | \UnitEnum | null $navigationGroup = 'Facturation & Tickets';
    protected static ?int $navigationSort = 2;
    protected static ?string $modelLabel = 'Facture TVA';
    protected static ?string $pluralModelLabel = 'Factures TVA';
    protected static ?string $recordTitleAttribute = 'numero';

    protected static bool $isGloballySearchable = false;

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\Select::make('client_id')
                ->label('Client')
                ->relationship('client', 'name')
                ->searchable()
                ->preload()
                ->required(),
            Forms\Components\TextInput::make('numero')->label('Numéro')->disabled()->dehydrated(false),
            Forms\Components\TextInput::make('remise')->numeric()->prefix('DT')->default(0),
            Forms\Components\TextInput::make('tva')->label('TVA (%)')->numeric()->suffix('%')->default(19),
            Forms\Components\TextInput::make('timbre')->label('Timbre fiscal')->numeric()->prefix('DT')->default(0),
            Forms\Components\TextInput::make('prix_ht')->label('Prix HT')->numeric()->prefix('DT')->disabled(),
            Forms\Components\TextInput::make('prix_ttc')->label('Prix TTC')->numeric()->prefix('DT')->disabled(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->with('client:id,name'))
            ->columns([
                Tables\Columns\TextColumn::make('numero')->label('N°')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('client.name')->label('Client')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('prix_ttc')->label('Total TTC')->money('TND')->sortable(),
                Tables\Columns\TextColumn::make('tva')->label('TVA')->suffix('%'),
                Tables\Columns\TextColumn::make('created_at')->label('Date')->dateTime('d/m/Y')->sortable(),
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
                    ->modalContent(fn (FactureTva $record) => view('filament.components.print-modal', [
                        'printUrl' => route('facture-tvas.print', ['factureTva' => $record->id]),
                        'title' => 'Facture ' . $record->numero,
                    ]))
                    ->modalSubmitAction(false)
                    ->closeParentActions(),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([Actions\DeleteBulkAction::make()]);
    }

    public static function getRelations(): array
    {
        return [
            FactureTvaResource\RelationManagers\DetailsRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListFactureTvas::route('/'),
            'create' => Pages\CreateFactureTva::route('/create'),
            'edit'   => Pages\EditFactureTva::route('/{record}/edit'),
        ];
    }
}
