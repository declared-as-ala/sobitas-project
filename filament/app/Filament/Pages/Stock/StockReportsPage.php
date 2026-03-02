<?php

namespace App\Filament\Pages\Stock;

use App\Services\StockReportService;
use Filament\Actions;
use Filament\Pages\Page;
use Illuminate\Contracts\Support\Htmlable;

class StockReportsPage extends Page
{
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-chart-bar';

    protected static ?string $navigationLabel = 'Rapports & exports';

    protected static ?string $title = 'Rapports stock';

    protected static string | \UnitEnum | null $navigationGroup = 'Gestion de stock';

    protected static ?int $navigationSort = 6;

    protected string $view = 'filament.pages.stock.stock-reports-page';

    public static function getSlug(?\Filament\Panel $panel = null): string
    {
        return 'stock/reports';
    }

    public function getTitle(): string | Htmlable
    {
        return 'Rapports stock';
    }

    public function getSubheading(): ?string
    {
        return 'Valeur par catégorie, alertes et export des rapports.';
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('refresh')
                ->label('Actualiser')
                ->icon('heroicon-o-arrow-path')
                ->color('gray')
                ->action(fn () => $this->refreshReport()),
            Actions\Action::make('exportPdf')
                ->label('Télécharger PDF')
                ->icon('heroicon-o-document-arrow-down')
                ->url(route('stock.reports.export.pdf'))
                ->openUrlInNewTab()
                ->color('gray'),
            Actions\Action::make('exportCsv')
                ->label('Export CSV')
                ->icon('heroicon-o-table-cells')
                ->url(route('stock.reports.export.csv'))
                ->openUrlInNewTab()
                ->color('gray'),
            Actions\Action::make('exportExcel')
                ->label('Export Excel')
                ->icon('heroicon-o-document-text')
                ->url(route('stock.reports.export.excel'))
                ->openUrlInNewTab()
                ->color('gray'),
        ];
    }

    public function refreshReport(): void
    {
        app(StockReportService::class)->clearCache();
        $this->dispatch('$refresh');
        \Filament\Notifications\Notification::make()
            ->title('Rapport actualisé')
            ->success()
            ->send();
    }

    public function getReports(): array
    {
        $service = app(StockReportService::class);
        return [
            'value_by_category' => $service->getValueByCategory(10),
            'distribution' => $service->getDistributionByCategory(),
            'low_stock' => $service->getLowStockProducts(50),
            'kpis' => $service->getKpiCounts(),
            'total_value' => $service->getTotalStockValue(),
        ];
    }

    /**
     * URL to products page with stock_status filter (for KPI card links).
     */
    public function getProductsUrl(string $filter): string
    {
        $base = \App\Filament\Pages\Stock\StockProductsPage::getUrl();

        return $base . '?tableFilters[stock_status][value]=' . urlencode($filter);
    }
}
