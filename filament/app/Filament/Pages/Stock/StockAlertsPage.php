<?php

namespace App\Filament\Pages\Stock;

use App\Filament\Resources\ProductResource;
use App\Models\Product;
use Filament\Pages\Page;
use Filament\Tables;
use Filament\Tables\Concerns\InteractsWithTable;
use Filament\Tables\Contracts\HasTable;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class StockAlertsPage extends Page implements HasTable
{
    use InteractsWithTable;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-bell-alert';

    protected static ?string $navigationLabel = 'Alertes / ruptures';

    protected static ?string $title = 'Alertes stock & ruptures';

    protected static string | \UnitEnum | null $navigationGroup = 'Gestion de stock';

    protected static ?int $navigationSort = 4;

    protected string $view = 'filament.pages.stock.stock-alerts-page';

    public static function getSlug(?\Filament\Panel $panel = null): string
    {
        return 'stock/alerts';
    }

    public function table(Table $table): Table
    {
        return $table
            ->query(
                Product::query()
                    ->with(['sousCategorie', 'brand'])
                    ->where(function (Builder $q) {
                        $q->where('qte', '<=', 0)
                            ->orWhereNull('qte')
                            ->orWhereRaw('(qte > 0 AND qte < 10)')
                            ->orWhereRaw('(qte > 0 AND rupture = 1)');
                    })
                    ->orderByRaw('CASE WHEN qte <= 0 OR qte IS NULL THEN 0 WHEN rupture = 1 AND qte > 0 THEN 1 ELSE 2 END, qte ASC')
            )
            ->columns([
                Tables\Columns\ImageColumn::make('cover')
                    ->label('Image')
                    ->disk('public')
                    ->circular()
                    ->size(36),
                Tables\Columns\TextColumn::make('designation_fr')
                    ->label('Produit')
                    ->searchable()
                    ->limit(40),
                Tables\Columns\TextColumn::make('qte')
                    ->label('Quantité')
                    ->badge()
                    ->color(fn ($state) => (int) $state <= 0 ? 'danger' : 'warning'),
                Tables\Columns\TextColumn::make('alert_type')
                    ->label('Alerte')
                    ->badge()
                    ->formatStateUsing(fn (Product $record): string => $this->alertLabel($record))
                    ->color(fn (Product $record): string => $this->alertColor($record)),
                Tables\Columns\TextColumn::make('sousCategorie.designation_fr')
                    ->label('Catégorie')
                    ->toggleable(),
                Tables\Columns\TextColumn::make('updated_at')
                    ->label('MAJ')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
            ])
            ->defaultPaginationPageOption(20)
            ->recordUrl(fn (Product $record): string => ProductResource::getUrl('edit', ['record' => $record]))
            ->actions([
                \Filament\Actions\EditAction::make()
                    ->url(fn (Product $record): string => ProductResource::getUrl('edit', ['record' => $record])),
            ]);
    }

    private function alertLabel(Product $record): string
    {
        $qte = (int) $record->qte;
        $rupture = (bool) $record->rupture;
        if ($rupture === true && $qte > 0) {
            return 'Incohérence';
        }
        if ($qte <= 0) {
            return 'Rupture';
        }
        $threshold = (int) $record->stock_threshold;
        if ($qte < $threshold) {
            return 'Stock faible';
        }
        return '—';
    }

    private function alertColor(Product $record): string
    {
        $qte = (int) $record->qte;
        if ($qte <= 0) {
            return 'danger';
        }
        if ((bool) $record->rupture === true && $qte > 0) {
            return 'danger';
        }
        return 'warning';
    }
}
