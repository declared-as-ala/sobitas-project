<?php

namespace App\Filament\Resources;

use App\Filament\Resources\FactureTvaResource\Pages;
use App\Models\Client;
use App\Models\Coordinate;
use App\Models\FactureTva;
use App\Services\InvoiceCalculator;
use Filament\Actions;
use Filament\Forms;
use Filament\Forms\Components\Repeater;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
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
    protected static ?string $navigationLabel = 'Factures';
    protected static ?string $modelLabel = 'Facture';
    protected static ?string $pluralModelLabel = 'Factures';
    protected static ?string $recordTitleAttribute = 'numero';

    public static function getGloballySearchableAttributes(): array
    {
        return ['numero'];
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\ViewField::make('custom_pos_view')
                ->hiddenLabel()
                ->view('filament.pages.create-facture-tva')
                ->columnSpanFull(),

            // Hidden fields that the save button pushes values into
            Forms\Components\Hidden::make('client_id'),
            Forms\Components\Hidden::make('details'),
            Forms\Components\Hidden::make('remise')->default(0),
            Forms\Components\Hidden::make('pourcentage_remise')->default(0),
            Forms\Components\Hidden::make('prix_ht')->default(0),
            Forms\Components\Hidden::make('tva')->default(0),
            Forms\Components\Hidden::make('prix_ttc')->default(0),
            Forms\Components\Hidden::make('timbre')->default(1),
            Forms\Components\Hidden::make('net_a_payer')->default(0),
            Forms\Components\Hidden::make('prix_ht_apres_remise')->default(0),
            Forms\Components\Hidden::make('numero'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query
                ->select(['facture_tvas.id', 'facture_tvas.numero', 'facture_tvas.client_id', 'facture_tvas.remise', 'facture_tvas.prix_ttc', 'facture_tvas.created_at'])
                ->with('client:id,name')
            )
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
                Tables\Columns\TextColumn::make('remise')
                    ->label('Montant Remise')
                    ->money('TND')
                    ->sortable()
                    ->alignEnd()
                    ->placeholder('—')
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('prix_ttc')
                    ->label('Montant TTC')
                    ->money('TND')
                    ->sortable()
                    ->alignEnd(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime('d/m/Y')
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(25)
            ->paginationPageOptions([10, 25, 50])
            ->actions([
                Actions\EditAction::make(),
                Actions\Action::make('print')
                    ->label('Imprimer')
                    ->icon('heroicon-o-printer')
                    ->color('gray')
                    ->url(fn (FactureTva $record) => route('facture-tvas.print', ['factureTva' => $record->id]))
                    ->openUrlInNewTab(),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([Actions\DeleteBulkAction::make()]);
    }

    public static function recalculateFactureTvaTotals($get, $set, bool $isItem = false): void
    {
        $details = $isItem ? ($get('../../details') ?? []) : ($get('details') ?? []);
        
        $remise = (float) ($isItem ? ($get('../../remise') ?? 0) : ($get('remise') ?? 0));
        $timbre = (float) ($isItem ? ($get('../../timbre') ?? 0) : ($get('timbre') ?? 0));
        
        static $defaultTva = null;
        if ($defaultTva === null) {
            $coordinate = Coordinate::getCached();
            $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
        }

        $totals = InvoiceCalculator::calculate($details, $remise, $timbre, $defaultTva);

        $prefix = $isItem ? '../../' : '';

        $set($prefix . 'prix_ht', $totals['total_ht_brut']);
        $set($prefix . 'prix_ht_apres_remise', $totals['prix_ht_apres_remise']);
        $set($prefix . 'tva', $totals['tva']);
        $set($prefix . 'prix_ttc', $totals['prix_ttc']);
        $set($prefix . 'net_a_payer', $totals['net_a_payer']);
        $set($prefix . 'pourcentage_remise', $totals['pourcentage_remise']);
    }

    public static function getRelations(): array
    {
        return [];
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
