<?php

namespace App\Filament\Pages\Stock;

use App\Filament\Resources\ProductResource;
use App\Models\Product;
use App\Services\StockService;
use Filament\Actions;
use Filament\Pages\Page;
use Filament\Tables;
use Filament\Tables\Concerns\InteractsWithTable;
use Filament\Tables\Contracts\HasTable;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class StockProductsPage extends Page implements HasTable
{
    use InteractsWithTable;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-cube-transparent';

    protected static ?string $navigationLabel = 'Produits & niveaux de stock';

    protected static ?string $title = 'Produits & niveaux de stock';

    protected static string | \UnitEnum | null $navigationGroup = 'Gestion de stock';

    protected static ?int $navigationSort = 2;

    protected string $view = 'filament.pages.stock.stock-products-page';

    public static function getSlug(?\Filament\Panel $panel = null): string
    {
        return 'stock/products';
    }

    public function table(Table $table): Table
    {
        $velocity = app(StockService::class)->getSalesVelocity(30);

        return $table
            ->query(
                Product::query()
                    ->with(['sousCategorie', 'brand'])
                    ->orderByRaw('qte ASC, designation_fr ASC')
            )
            ->columns([
                Tables\Columns\ImageColumn::make('cover')
                    ->label('Image')
                    ->disk('public')
                    ->circular()
                    ->size(40),
                Tables\Columns\TextColumn::make('designation_fr')
                    ->label('Désignation')
                    ->searchable()
                    ->sortable()
                    ->limit(35),
                Tables\Columns\TextColumn::make('slug')
                    ->label('Code / SKU')
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('sousCategorie.designation_fr')
                    ->label('Sous-catégorie')
                    ->sortable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('brand.designation_fr')
                    ->label('Marque')
                    ->sortable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('qte')
                    ->label('Quantité')
                    ->sortable()
                    ->badge()
                    ->color(fn ($record) => $this->stockBadgeColor($record)),
                Tables\Columns\TextColumn::make('stock_status')
                    ->label('État')
                    ->badge()
                    ->formatStateUsing(fn ($record) => $this->stockStatusLabel($record))
                    ->color(fn ($record) => $this->stockStatusColor($record)),
                Tables\Columns\TextColumn::make('stock_threshold')
                    ->label('Seuil alerte')
                    ->toggleable()
                    ->placeholder('10'),
                Tables\Columns\TextColumn::make('velocity_30d')
                    ->label('Ventes 30j')
                    ->state(function ($record) use ($velocity) {
                        return $velocity[$record->id] ?? 0;
                    })
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('updated_at')
                    ->label('Dernière MAJ')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->toggleable(),
            ])
            ->defaultSort('qte', 'asc')
            ->defaultPaginationPageOption(25)
            ->recordUrl(fn (Product $record): string => ProductResource::getUrl('edit', ['record' => $record]))
            ->actions([
                Actions\EditAction::make()
                    ->url(fn (Product $record): string => ProductResource::getUrl('edit', ['record' => $record])),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('stock_status')
                    ->label('État stock')
                    ->options([
                        'in_stock' => 'En stock',
                        'low_stock' => 'Stock faible',
                        'out_of_stock' => 'Rupture',
                        'inconsistent' => 'Incohérence',
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        $v = $data['value'] ?? null;
                        if (!$v) {
                            return $query;
                        }
                        if ($v === 'out_of_stock') {
                            return $query->where(function ($q) {
                                $q->where('qte', '<=', 0)->orWhere('rupture', 0);
                            });
                        }
                        if ($v === 'low_stock') {
                            return $query->where('qte', '>', 0)->where('qte', '<', 10);
                        }
                        if ($v === 'inconsistent') {
                            return $query->whereRaw('(qte > 0 AND rupture = 0) OR (qte <= 0 AND (rupture = 1 OR rupture IS NULL))');
                        }
                        return $query->where('qte', '>', 0)->where(function ($q) {
                            $q->where('rupture', 1)->orWhereNull('rupture');
                        });
                    }),
                Tables\Filters\SelectFilter::make('brand_id')
                    ->label('Marque')
                    ->relationship('brand', 'designation_fr')
                    ->searchable()
                    ->preload(),
            ]);
    }

    private function stockBadgeColor(Product $record): string
    {
        $status = $record->stock_status;
        return match ($status) {
            'in_stock' => 'success',
            'low_stock' => 'warning',
            'out_of_stock' => 'danger',
            'inconsistent' => 'danger',
            default => 'gray',
        };
    }

    private function stockStatusLabel(Product $record): string
    {
        return match ($record->stock_status) {
            'in_stock' => 'En stock',
            'low_stock' => 'Stock faible',
            'out_of_stock' => 'Rupture de stock',
            'inconsistent' => 'Incohérence',
            default => '—',
        };
    }

    private function stockStatusColor(Product $record): string
    {
        return $this->stockBadgeColor($record);
    }
}
