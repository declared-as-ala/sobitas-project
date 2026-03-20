<?php

namespace App\Filament\Resources;

use App\Filament\Resources\FactureResource\Pages;
use App\Models\Client;
use App\Models\Coordinate;
use App\Models\Facture;
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

class FactureResource extends Resource
{
    protected static ?string $model = Facture::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-document-text';

    protected static string | \UnitEnum | null $navigationGroup = 'Facturation & Tickets';

    protected static ?int $navigationSort = 1;

    protected static ?string $modelLabel = 'Bon de Livraison';

    protected static ?string $pluralModelLabel = 'Bons de Livraison';

    protected static ?string $recordTitleAttribute = 'numero';

    public static function getGloballySearchableAttributes(): array
    {
        return ['numero'];
    }

    public static function updateTotals($get, $set, bool $isItem = false): void
    {
        $details = $isItem ? ($get('../../details') ?? []) : ($get('details') ?? []);
        $remise = (float) ($isItem ? ($get('../../remise') ?? 0) : ($get('remise') ?? 0));
        // BL: no timbre — always 0
        $timbre = 0.0;
        $fraisLivraison = (float) ($isItem ? ($get('../../frais_livraison') ?? 0) : ($get('frais_livraison') ?? 0));

        // BL is HT only: no TVA; net_a_payer includes frais_livraison
        $calcTotals = \App\Services\InvoiceCalculator::calculate($details, $remise, $timbre, 0, $fraisLivraison, true);

        $prefix = $isItem ? '../../' : '';

        $set($prefix . 'prix_ht', $calcTotals['total_ht_brut']);
        $set($prefix . 'pourcentage_remise', $calcTotals['pourcentage_remise']);
        $set($prefix . 'prix_ht_apres_remise', $calcTotals['prix_ht_apres_remise']);
        $set($prefix . 'tva', $calcTotals['tva']);
        $set($prefix . 'prix_ttc', $calcTotals['prix_ttc']);
        $set($prefix . 'net_a_payer', $calcTotals['net_a_payer']);
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\ViewField::make('bl_pos_view')
                ->hiddenLabel()
                ->columnSpanFull()
                ->view('filament.pages.create-facture-bl'),

            Forms\Components\Hidden::make('numero'),
            Forms\Components\Hidden::make('client_id'),
            Forms\Components\Hidden::make('details'),
            Forms\Components\Hidden::make('prix_ht'),
            Forms\Components\Hidden::make('remise')->default(0),
            Forms\Components\Hidden::make('pourcentage_remise'),
            Forms\Components\Hidden::make('prix_ht_apres_remise'),
            Forms\Components\Hidden::make('frais_livraison')->default(0),
            Forms\Components\Hidden::make('tva'),
            Forms\Components\Hidden::make('prix_ttc'),
            Forms\Components\Hidden::make('timbre')->default(0),
            Forms\Components\Hidden::make('net_a_payer'),
            Forms\Components\Hidden::make('livraison_nom'),
            Forms\Components\Hidden::make('livraison_phone'),
            Forms\Components\Hidden::make('livraison_adresse1'),
            Forms\Components\Hidden::make('livraison_ville'),
            Forms\Components\Hidden::make('livraison_region'),
            Forms\Components\Hidden::make('livraison_email'),
            Forms\Components\Hidden::make('livraison_code_postale'),

            Forms\Components\Hidden::make('nom'),
            Forms\Components\Hidden::make('email'),
            Forms\Components\Hidden::make('phone'),
            Forms\Components\Hidden::make('adresse1'),
            Forms\Components\Hidden::make('ville'),
            Forms\Components\Hidden::make('region'),
            Forms\Components\Hidden::make('code_postale'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query
                ->select(['factures.id', 'factures.numero', 'factures.client_id', 'factures.prix_ht', 'factures.remise', 'factures.pourcentage_remise', 'factures.tva', 'factures.timbre', 'factures.net_a_payer', 'factures.created_at'])
                ->with('client:id,name')
            )
            ->columns([
                Tables\Columns\TextColumn::make('numero')
                    ->label('Numéro B.L')
                    ->searchable()
                    ->sortable()
                    ->weight(\Filament\Support\Enums\FontWeight::Bold),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date de Facture')
                    ->dateTime('d/m/Y')
                    ->sortable()
                    ->color('gray'),
                Tables\Columns\TextColumn::make('client.name')
                    ->label('Clients')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('prix_ht')
                    ->label('Prix HT')
                    ->money('TND', divideBy: 1)
                    ->sortable()
                    ->alignEnd(),
                Tables\Columns\TextColumn::make('remise')
                    ->label('Remise')
                    ->money('TND', divideBy: 1)
                    ->sortable()
                    ->alignEnd()
                    ->placeholder('—'),
                Tables\Columns\TextColumn::make('pourcentage_remise')
                    ->label('Pourcentage Remise')
                    ->suffix(' %')
                    ->sortable()
                    ->alignEnd()
                    ->placeholder('—'),
                Tables\Columns\TextColumn::make('tva')
                    ->label('TVA')
                    ->money('TND', divideBy: 1)
                    ->sortable()
                    ->alignEnd()
                    ->placeholder('—'),
                Tables\Columns\TextColumn::make('timbre')
                    ->label('Timbre')
                    ->money('TND', divideBy: 1)
                    ->sortable()
                    ->alignEnd()
                    ->placeholder('—'),
                Tables\Columns\TextColumn::make('net_a_payer')
                    ->label('Prix TTC')
                    ->money('TND', divideBy: 1)
                    ->sortable()
                    ->alignEnd()
                    ->weight(\Filament\Support\Enums\FontWeight::Bold),
            ])
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(25)
            ->paginationPageOptions([10, 25, 50])
            ->striped()
            ->actions([
                Actions\EditAction::make(),
                Actions\Action::make('print')
                    ->label('Imprimer')
                    ->icon('heroicon-o-printer')
                    ->color('gray')
                    ->url(fn (Facture $record) => route('factures.print', ['facture' => $record->id]))
                    ->openUrlInNewTab(),
                Actions\DeleteAction::make(),
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
            'index'  => Pages\ListFactures::route('/'),
            'create' => Pages\CreateFacture::route('/create'),
            'edit'   => Pages\EditFacture::route('/{record}/edit'),
        ];
    }
}
