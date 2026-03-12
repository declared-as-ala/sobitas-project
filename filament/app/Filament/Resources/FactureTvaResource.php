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
    protected static ?string $modelLabel = 'Facture TVA';
    protected static ?string $pluralModelLabel = 'Factures TVA';
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
        // Root cause fix: facture_tvas.tva stores TVA AMOUNT (TND), not rate. The previous column
        // displayed it with suffix '%', producing nonsense (e.g. 23978%). We now show TVA % (derived)
        // and TVA (DT) (amount) separately.
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->with('client:id,name')->select(['facture_tvas.id', 'facture_tvas.numero', 'facture_tvas.status', 'facture_tvas.client_id', 'facture_tvas.prix_ht', 'facture_tvas.tva', 'facture_tvas.remise', 'facture_tvas.timbre', 'facture_tvas.prix_ttc', 'facture_tvas.net_a_payer', 'facture_tvas.created_at']))
            ->columns([
                Tables\Columns\TextColumn::make('numero')->label('N°')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(fn ($state) => $state?->label() ?? (is_string($state) ? $state : '—'))
                    ->color(fn ($state) => match ($state?->value ?? '') {
                        'issued' => 'success',
                        'paid' => 'success',
                        'partially_paid' => 'warning',
                        'canceled' => 'danger',
                        default => 'gray',
                    })
                    ->toggleable(),
                Tables\Columns\TextColumn::make('client.name')->label('Client')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('net_a_payer')
                    ->label('NET À PAYER')
                    ->getStateUsing(fn (FactureTva $record) => $record->net_a_payer ?? 0)
                    ->money('TND')
                    ->sortable()
                    ->weight('bold'),
                Tables\Columns\TextColumn::make('prix_ttc')
                    ->label('Total TTC')
                    ->money('TND')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('tva_rate_display')
                    ->label('TVA %')
                    ->getStateUsing(fn (FactureTva $record) => $record->getTvaRatePercent())
                    ->formatStateUsing(fn ($state) => $state !== null ? (round($state) == $state ? (int) $state : $state) . '%' : '—')
                    ->badge()
                    ->color('gray'),
                Tables\Columns\TextColumn::make('tva_amount_display')
                    ->label('TVA (DT)')
                    ->getStateUsing(fn (FactureTva $record) => $record->getTvaAmount())
                    ->formatStateUsing(fn ($state) => number_format((float) $state, 3, '.', ' ') . ' DT')
                    ->sortable(query: function ($query, string $direction) {
                        return $query->orderBy('tva', $direction);
                    }),
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
