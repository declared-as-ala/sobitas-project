<?php

namespace App\Filament\Pages\Stock;

use App\Filament\Resources\ProductResource;
use App\Models\Product;
use App\Services\StockReportService;
use App\Services\StockService;
use Filament\Actions;
use Filament\Forms;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Tables;
use Filament\Tables\Concerns\InteractsWithTable;
use Filament\Tables\Contracts\HasTable;
use Filament\Tables\Table;
use Illuminate\Contracts\Support\Htmlable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

class StockDashboard extends Page implements HasTable
{
    use InteractsWithTable;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-archive-box';

    protected static ?string $navigationLabel = 'Gestion de stock';

    protected static ?string $title = 'Gestion de stock';

    protected static string|\UnitEnum|null $navigationGroup = 'Gestion de stock';

    protected static ?int $navigationSort = 1;

    protected string $view = 'filament.pages.stock.stock-dashboard';

    public static function getSlug(?\Filament\Panel $panel = null): string
    {
        return 'stock';
    }

    public function getTitle(): string|Htmlable
    {
        return 'Gestion de stock';
    }

    // ── Header actions ────────────────────────────────────────────────────────

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('refresh')
                ->label('Actualiser')
                ->icon('heroicon-o-arrow-path')
                ->color('gray')
                ->action(fn () => $this->refreshData()),
            Actions\Action::make('exportPdf')
                ->label('PDF')
                ->icon('heroicon-o-document-arrow-down')
                ->url(route('stock.reports.export.pdf'))
                ->openUrlInNewTab()
                ->color('gray'),
            Actions\Action::make('exportCsv')
                ->label('CSV')
                ->icon('heroicon-o-table-cells')
                ->url(route('stock.reports.export.csv'))
                ->openUrlInNewTab()
                ->color('gray'),
            Actions\Action::make('exportExcel')
                ->label('Excel')
                ->icon('heroicon-o-document-text')
                ->url(route('stock.reports.export.excel'))
                ->openUrlInNewTab()
                ->color('gray'),
        ];
    }

    public function refreshData(): void
    {
        app(StockReportService::class)->clearCache();
        $this->dispatch('$refresh');
        Notification::make()->title('Données actualisées')->success()->send();
    }

    // ── Data providers (called from blade) ───────────────────────────────────

    public function getMetrics(): array
    {
        return app(StockService::class)->getDashboardMetrics();
    }

    public function getReportData(): array
    {
        $svc = app(StockReportService::class);

        return [
            'value_by_category' => $svc->getValueByCategory(10),
            'distribution'      => $svc->getDistributionByCategory(),
            'kpis'              => $svc->getKpiCounts(),
            'total_value'       => $svc->getTotalStockValue(),
        ];
    }

    public function getAlertProducts(): \Illuminate\Support\Collection
    {
        return Product::query()
            ->select(['id', 'designation_fr', 'qte', 'low_stock_threshold', 'rupture', 'sous_categorie_id', 'updated_at'])
            ->with(['sousCategorie:id,designation_fr'])
            ->where(function (Builder $q) {
                $q->where('qte', '<=', 0)
                  ->orWhereNull('qte')
                  ->orWhereRaw('(qte > 0 AND qte < 10)')
                  ->orWhereRaw('(qte > 0 AND rupture = 1)');
            })
            ->orderByRaw('CASE WHEN qte <= 0 OR qte IS NULL THEN 0 WHEN rupture = 1 AND qte > 0 THEN 1 ELSE 2 END, qte ASC')
            ->limit(15)
            ->get();
    }

    // ── Filament table ────────────────────────────────────────────────────────

    public function table(Table $table): Table
    {
        return $table
            ->query(
                Product::query()
                    ->with(['sousCategorie:id,designation_fr', 'brand:id,designation_fr'])
                    ->orderByRaw('qte ASC, designation_fr ASC')
            )
            ->columns([
                Tables\Columns\ImageColumn::make('cover')
                    ->label('')
                    ->disk('public')
                    ->circular()
                    ->size(36),
                Tables\Columns\TextColumn::make('designation_fr')
                    ->label('Produit')
                    ->searchable()
                    ->sortable()
                    ->limit(40)
                    ->weight(\Filament\Support\Enums\FontWeight::Medium),
                Tables\Columns\TextColumn::make('slug')
                    ->label('SKU / Réf.')
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('sousCategorie.designation_fr')
                    ->label('Catégorie')
                    ->sortable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('brand.designation_fr')
                    ->label('Marque')
                    ->sortable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('qte')
                    ->label('Quantité')
                    ->sortable()
                    ->alignCenter()
                    ->badge()
                    ->color(fn (Product $record) => match ($record->stock_status) {
                        'in_stock'                     => 'success',
                        'low_stock'                    => 'warning',
                        'out_of_stock', 'inconsistent' => 'danger',
                        default                        => 'gray',
                    }),
                Tables\Columns\TextColumn::make('low_stock_threshold')
                    ->label('Seuil')
                    ->alignCenter()
                    ->placeholder('10')
                    ->toggleable(),
                Tables\Columns\TextColumn::make('stock_status')
                    ->label('État')
                    ->alignCenter()
                    ->badge()
                    ->formatStateUsing(fn (Product $record) => match ($record->stock_status) {
                        'in_stock'     => 'En stock',
                        'low_stock'    => 'Stock faible',
                        'out_of_stock' => 'Rupture',
                        'inconsistent' => 'Incohérence',
                        default        => '—',
                    })
                    ->color(fn (Product $record) => match ($record->stock_status) {
                        'in_stock'                     => 'success',
                        'low_stock'                    => 'warning',
                        'out_of_stock', 'inconsistent' => 'danger',
                        default                        => 'gray',
                    }),
                Tables\Columns\TextColumn::make('prix_ht')
                    ->label('Prix HT')
                    ->money('TND', divideBy: 1)
                    ->sortable()
                    ->alignEnd()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('prix')
                    ->label('Prix TTC')
                    ->money('TND', divideBy: 1)
                    ->sortable()
                    ->alignEnd()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('updated_at')
                    ->label('MAJ')
                    ->date('d/m/Y')
                    ->sortable()
                    ->toggleable(),
            ])
            ->defaultSort('qte', 'asc')
            ->defaultPaginationPageOption(25)
            ->paginationPageOptions([10, 25, 50, 100])
            ->striped()
            ->recordUrl(fn (Product $record) => ProductResource::getUrl('edit', ['record' => $record]))
            ->filters([
                Tables\Filters\SelectFilter::make('stock_status')
                    ->label('État stock')
                    ->options([
                        'in_stock'     => 'En stock',
                        'low_stock'    => 'Stock faible',
                        'out_of_stock' => 'Rupture',
                        'inconsistent' => 'Incohérence',
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        $v = $data['value'] ?? null;
                        if (! $v) {
                            return $query;
                        }

                        return match ($v) {
                            'out_of_stock' => $query->where(fn ($q) => $q->where('qte', '<=', 0)->orWhereNull('qte')),
                            'low_stock'    => $query->where('qte', '>', 0)->where('qte', '<', 10),
                            'inconsistent' => $query->whereRaw('(qte > 0 AND rupture = 1)'),
                            default        => $query->where('qte', '>', 0)->where('rupture', 0),
                        };
                    }),
                Tables\Filters\SelectFilter::make('brand_id')
                    ->label('Marque')
                    ->relationship('brand', 'designation_fr')
                    ->searchable()
                    ->preload(),
                Tables\Filters\SelectFilter::make('sous_categorie_id')
                    ->label('Catégorie')
                    ->relationship('sousCategorie', 'designation_fr')
                    ->searchable()
                    ->preload(),
                Tables\Filters\Filter::make('updated_range')
                    ->label('Date MAJ')
                    ->form([
                        Forms\Components\DatePicker::make('updated_from')->label('Du'),
                        Forms\Components\DatePicker::make('updated_until')->label('Au'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when($data['updated_from'] ?? null, fn ($q, $v) => $q->whereDate('updated_at', '>=', $v))
                            ->when($data['updated_until'] ?? null, fn ($q, $v) => $q->whereDate('updated_at', '<=', $v));
                    }),
            ])
            ->actions([
                Actions\Action::make('adjustStock')
                    ->label('Ajuster')
                    ->icon('heroicon-o-adjustments-horizontal')
                    ->color('warning')
                    ->modalHeading(fn (Product $record) => 'Ajuster le stock — ' . $record->designation_fr)
                    ->form([
                        Forms\Components\TextInput::make('new_qty')
                            ->label('Nouvelle quantité')
                            ->numeric()
                            ->minValue(0)
                            ->required()
                            ->suffix('unités'),
                        Forms\Components\Textarea::make('note')
                            ->label('Note (optionnel)')
                            ->rows(2),
                    ])
                    ->fillForm(fn (Product $record) => ['new_qty' => (int) $record->qte])
                    ->action(function (Product $record, array $data) {
                        app(StockService::class)->adjustStock(
                            $record->id,
                            (int) $data['new_qty'],
                            'manual_correction',
                            $data['note'] ?? null,
                        );
                        app(StockReportService::class)->clearCache();
                        Notification::make()->title('Stock mis à jour')->success()->send();
                    }),
                Actions\Action::make('addStock')
                    ->label('+')
                    ->icon('heroicon-o-plus-circle')
                    ->color('success')
                    ->tooltip('Ajouter au stock')
                    ->modalHeading(fn (Product $record) => 'Ajouter du stock — ' . $record->designation_fr)
                    ->form([
                        Forms\Components\TextInput::make('qty')
                            ->label('Quantité à ajouter')
                            ->numeric()
                            ->minValue(1)
                            ->default(1)
                            ->required(),
                    ])
                    ->action(function (Product $record, array $data) {
                        $newQty = (int) $record->fresh()->qte + (int) $data['qty'];
                        app(StockService::class)->adjustStock($record->id, max(0, $newQty), 'manual_correction', 'Ajout manuel');
                        app(StockReportService::class)->clearCache();
                        Notification::make()->title('+' . $data['qty'] . ' unités ajoutées')->success()->send();
                    }),
                Actions\Action::make('removeStock')
                    ->label('−')
                    ->icon('heroicon-o-minus-circle')
                    ->color('danger')
                    ->tooltip('Retirer du stock')
                    ->modalHeading(fn (Product $record) => 'Retirer du stock — ' . $record->designation_fr)
                    ->form([
                        Forms\Components\TextInput::make('qty')
                            ->label('Quantité à retirer')
                            ->numeric()
                            ->minValue(1)
                            ->default(1)
                            ->required(),
                    ])
                    ->action(function (Product $record, array $data) {
                        $newQty = max(0, (int) $record->fresh()->qte - (int) $data['qty']);
                        app(StockService::class)->adjustStock($record->id, $newQty, 'manual_correction', 'Retrait manuel');
                        app(StockReportService::class)->clearCache();
                        Notification::make()->title('−' . $data['qty'] . ' unités retirées')->success()->send();
                    }),
                Actions\Action::make('editProduct')
                    ->label('Modifier')
                    ->icon('heroicon-o-pencil-square')
                    ->url(fn (Product $record) => ProductResource::getUrl('edit', ['record' => $record])),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\BulkAction::make('markRupture')
                        ->label('Marquer en rupture')
                        ->icon('heroicon-o-x-circle')
                        ->color('danger')
                        ->requiresConfirmation()
                        ->action(function (Collection $records) {
                            $records->each(fn (Product $p) => $p->update(['qte' => 0, 'rupture' => 1]));
                            app(StockReportService::class)->clearCache();
                            Notification::make()
                                ->title($records->count() . ' produit(s) marqués en rupture')
                                ->success()
                                ->send();
                        })
                        ->deselectRecordsAfterCompletion(),
                    Actions\BulkAction::make('markInStock')
                        ->label('Remettre en stock')
                        ->icon('heroicon-o-check-circle')
                        ->color('success')
                        ->form([
                            Forms\Components\TextInput::make('qty')
                                ->label('Quantité à attribuer')
                                ->numeric()
                                ->minValue(1)
                                ->default(1)
                                ->required(),
                        ])
                        ->action(function (Collection $records, array $data) {
                            $qty = max(1, (int) $data['qty']);
                            $records->each(fn (Product $p) => $p->update(['qte' => $qty, 'rupture' => 0]));
                            app(StockReportService::class)->clearCache();
                            Notification::make()
                                ->title($records->count() . ' produit(s) remis en stock')
                                ->success()
                                ->send();
                        })
                        ->deselectRecordsAfterCompletion(),
                    Actions\BulkAction::make('updateThreshold')
                        ->label('Mettre à jour le seuil')
                        ->icon('heroicon-o-adjustments-vertical')
                        ->form([
                            Forms\Components\TextInput::make('threshold')
                                ->label("Nouveau seuil d'alerte")
                                ->numeric()
                                ->minValue(0)
                                ->default(10)
                                ->required(),
                        ])
                        ->action(function (Collection $records, array $data) {
                            $records->each(fn (Product $p) => $p->update(['low_stock_threshold' => (int) $data['threshold']]));
                            Notification::make()
                                ->title('Seuil mis à jour pour ' . $records->count() . ' produit(s)')
                                ->success()
                                ->send();
                        })
                        ->deselectRecordsAfterCompletion(),
                ]),
            ]);
    }
}
