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
    protected static ?string $navigationLabel  = 'Gestion de stock';
    protected static ?string $title            = 'Gestion de stock';
    protected static string|\UnitEnum|null $navigationGroup = 'Gestion de stock';
    protected static ?int $navigationSort      = 1;
    protected string $view = 'filament.pages.stock.stock-dashboard';

    /** Active tab: all | in_stock | rupture | low_stock | inconsistent */
    public string $activeTab = 'all';

    public static function getSlug(?\Filament\Panel $panel = null): string
    {
        return 'stock';
    }

    public function getTitle(): string|Htmlable
    {
        return 'Gestion de stock';
    }

    // ── Tab switching ──────────────────────────────────────────────────────────

    public function setTab(string $tab): void
    {
        $this->activeTab = $tab;
        $this->resetTable();
    }

    // ── Header actions ─────────────────────────────────────────────────────────

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('refresh')
                ->label('Actualiser')
                ->icon('heroicon-o-arrow-path')
                ->color('gray')
                ->action(fn () => $this->refreshData()),
        ];
    }

    public function refreshData(): void
    {
        app(StockReportService::class)->clearCache();
        $this->dispatch('$refresh');
        Notification::make()->title('Données actualisées')->success()->send();
    }

    // ── Data providers (called from blade) ────────────────────────────────────

    public function getMetrics(): array
    {
        return app(StockService::class)->getDashboardMetrics();
    }

    /** Build export URL for the current active tab. */
    public function exportUrl(string $format): string
    {
        return route('stock.export.' . $format, ['tab' => $this->activeTab]);
    }

    // ── Filtered product query (reactive to $activeTab) ────────────────────────

    private function getProductQuery(): Builder
    {
        $base = Product::query()
            ->with(['sousCategorie:id,designation_fr', 'brand:id,designation_fr'])
            ->orderByRaw('qte ASC, designation_fr ASC');

        return match ($this->activeTab) {
            // En stock : has stock, not marked rupture
            'in_stock'     => $base->where('qte', '>', 0)->where('rupture', 0),

            // Rupture : stock depleted (qte <= 0), regardless of rupture flag
            'rupture'      => $base->where(fn ($q) => $q->where('qte', '<=', 0)->orWhereNull('qte')),

            // Stock faible : in stock but below threshold
            'low_stock'    => $base->where('qte', '>', 0)
                                   ->where('rupture', 0)
                                   ->whereRaw('qte < COALESCE(NULLIF(low_stock_threshold, 0), 10)'),

            // Incohérences : has stock (qte > 0) but rupture flag is on, OR negative stock
            'inconsistent' => $base->where(fn ($q) =>
                                   $q->where(fn ($q2) => $q2->where('qte', '>', 0)->where('rupture', 1))
                                     ->orWhere('qte', '<', 0)
                               ),

            default => $base, // all
        };
    }

    // ── Filament table ─────────────────────────────────────────────────────────

    public function table(Table $table): Table
    {
        return $table
            ->query(fn (): Builder => $this->getProductQuery())
            ->columns([
                Tables\Columns\ImageColumn::make('cover')
                    ->label('')
                    ->disk('public')
                    ->circular()
                    ->size(34),

                Tables\Columns\TextColumn::make('designation_fr')
                    ->label('Produit')
                    ->searchable()
                    ->sortable()
                    ->limit(50)
                    ->weight(\Filament\Support\Enums\FontWeight::Medium),

                Tables\Columns\TextColumn::make('prix')
                    ->label('Prix')
                    ->money('TND', divideBy: 1)
                    ->sortable()
                    ->alignEnd(),

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

                Tables\Columns\TextColumn::make('stock_status')
                    ->label('Statut')
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

                Tables\Columns\TextColumn::make('sousCategorie.designation_fr')
                    ->label('Catégorie')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('brand.designation_fr')
                    ->label('Marque')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('updated_at')
                    ->label('MAJ')
                    ->date('d/m/Y')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->defaultSort('qte', 'asc')
            ->defaultPaginationPageOption(25)
            ->paginationPageOptions([10, 25, 50, 100])
            ->striped()
            ->recordUrl(fn (Product $record) => ProductResource::getUrl('edit', ['record' => $record]))
            ->filters([
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
                            ->numeric()->minValue(0)->required()->suffix('unités'),
                        Forms\Components\Textarea::make('note')
                            ->label('Note (optionnel)')->rows(2),
                    ])
                    ->fillForm(fn (Product $record) => ['new_qty' => (int) $record->qte])
                    ->action(function (Product $record, array $data) {
                        app(StockService::class)->adjustStock($record->id, (int) $data['new_qty'], 'manual_correction', $data['note'] ?? null);
                        app(StockReportService::class)->clearCache();
                        Notification::make()->title('Stock mis à jour')->success()->send();
                    }),

                Actions\Action::make('addStock')
                    ->label('+')
                    ->icon('heroicon-o-plus-circle')
                    ->color('success')
                    ->tooltip('Ajouter au stock')
                    ->modalHeading(fn (Product $record) => 'Ajouter du stock — ' . $record->designation_fr)
                    ->form([Forms\Components\TextInput::make('qty')->label('Quantité à ajouter')->numeric()->minValue(1)->default(1)->required()])
                    ->action(function (Product $record, array $data) {
                        app(StockService::class)->adjustStock($record->id, max(0, (int) $record->fresh()->qte + (int) $data['qty']), 'manual_correction', 'Ajout manuel');
                        app(StockReportService::class)->clearCache();
                        Notification::make()->title('+' . $data['qty'] . ' unités ajoutées')->success()->send();
                    }),

                Actions\Action::make('removeStock')
                    ->label('−')
                    ->icon('heroicon-o-minus-circle')
                    ->color('danger')
                    ->tooltip('Retirer du stock')
                    ->modalHeading(fn (Product $record) => 'Retirer du stock — ' . $record->designation_fr)
                    ->form([Forms\Components\TextInput::make('qty')->label('Quantité à retirer')->numeric()->minValue(1)->default(1)->required()])
                    ->action(function (Product $record, array $data) {
                        app(StockService::class)->adjustStock($record->id, max(0, (int) $record->fresh()->qte - (int) $data['qty']), 'manual_correction', 'Retrait manuel');
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
                            Notification::make()->title($records->count() . ' produit(s) marqués en rupture')->success()->send();
                        })
                        ->deselectRecordsAfterCompletion(),

                    Actions\BulkAction::make('markInStock')
                        ->label('Remettre en stock')
                        ->icon('heroicon-o-check-circle')
                        ->color('success')
                        ->form([Forms\Components\TextInput::make('qty')->label('Quantité à attribuer')->numeric()->minValue(1)->default(1)->required()])
                        ->action(function (Collection $records, array $data) {
                            $records->each(fn (Product $p) => $p->update(['qte' => max(1, (int) $data['qty']), 'rupture' => 0]));
                            app(StockReportService::class)->clearCache();
                            Notification::make()->title($records->count() . ' produit(s) remis en stock')->success()->send();
                        })
                        ->deselectRecordsAfterCompletion(),
                ]),
            ]);
    }
}
