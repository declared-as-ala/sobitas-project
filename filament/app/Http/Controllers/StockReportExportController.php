<?php

namespace App\Http\Controllers;

use App\Services\StockReportService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StockReportExportController extends Controller
{
    public function __construct(
        private StockReportService $reportService
    ) {}

    /**
     * Download stock report as PDF.
     */
    public function pdf(Request $request)
    {
        if (! class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            return redirect()->back()->with('error', 'Le package PDF (barryvdh/laravel-dompdf) est requis.');
        }

        $data = $this->gatherReportData();
        $data['generated_at'] = now()->format('d/m/Y H:i');

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('filament.pages.stock.stock-report-pdf', $data);
        $filename = 'stock-report-' . Carbon::now()->format('Y-m-d') . '.pdf';

        return $pdf->download($filename);
    }

    /**
     * Download stock report as CSV.
     */
    public function csv(Request $request): StreamedResponse
    {
        $data = $this->gatherReportData();
        $filename = 'stock-report-' . Carbon::now()->format('Y-m-d') . '.csv';

        return Response::streamDownload(function () use ($data) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // UTF-8 BOM for Excel
            fputcsv($out, ['Rapport stock', 'Généré le ' . now()->format('d/m/Y H:i')], ';');
            fputcsv($out, [], ';');

            fputcsv($out, ['Valeur du stock par catégorie (Top 10)'], ';');
            fputcsv($out, ['Catégorie', 'Valeur (DT)'], ';');
            foreach ($data['value_by_category'] as $row) {
                fputcsv($out, [$row->name, number_format($row->value, 2, ',', '')], ';');
            }
            fputcsv($out, [], ';');

            fputcsv($out, ['KPIs'], ';');
            fputcsv($out, ['Rupture', 'Stock faible', 'Stock normal', 'Valeur totale (DT)'], ';');
            fputcsv($out, [
                $data['kpis']['rupture'],
                $data['kpis']['low_stock'],
                $data['kpis']['in_stock'],
                number_format($data['total_value'], 2, ',', ''),
            ], ';');
            fputcsv($out, [], ';');

            fputcsv($out, ['Produits en stock faible'], ';');
            fputcsv($out, ['Désignation', 'Quantité', 'Seuil', 'Catégorie'], ';');
            foreach ($data['low_stock'] as $row) {
                fputcsv($out, [$row->designation_fr, $row->qte, $row->seuil, $row->category], ';');
            }
            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Download as Excel-compatible (CSV with .xlsx extension for user convenience; opens in Excel).
     */
    public function excel(Request $request): StreamedResponse
    {
        return $this->csv($request);
    }

    private function gatherReportData(): array
    {
        return [
            'value_by_category' => $this->reportService->getValueByCategory(10),
            'distribution' => $this->reportService->getDistributionByCategory(),
            'low_stock' => $this->reportService->getLowStockProducts(100),
            'kpis' => $this->reportService->getKpiCounts(),
            'total_value' => $this->reportService->getTotalStockValue(),
        ];
    }
}
