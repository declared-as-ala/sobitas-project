<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Stock product-list export (per tab): PDF and CSV.
 * Replaces the old StockReportExportController aggregate export.
 */
class StockExportController extends Controller
{
    // ── Tab label map ──────────────────────────────────────────────────────────

    private const TAB_LABELS = [
        'all'          => 'Tous les produits',
        'in_stock'     => 'En stock',
        'rupture'      => 'Rupture',
        'low_stock'    => 'Stock faible',
        'inconsistent' => 'Incohérences',
    ];

    // ── Filtered query ─────────────────────────────────────────────────────────

    private function filteredQuery(string $tab): Builder
    {
        $base = Product::query()
            ->with(['sousCategorie:id,designation_fr', 'brand:id,designation_fr'])
            ->orderByRaw('qte ASC, designation_fr ASC');

        return match ($tab) {
            'in_stock'     => $base->where('qte', '>', 0)->where('rupture', 0),
            'rupture'      => $base->where(fn ($q) => $q->where('qte', '<=', 0)->orWhereNull('qte')),
            'low_stock'    => $base->where('qte', '>', 0)
                                   ->where('rupture', 0)
                                   ->whereRaw('qte < COALESCE(NULLIF(low_stock_threshold, 0), 10)'),
            'inconsistent' => $base->where(fn ($q) =>
                                   $q->where(fn ($q2) => $q2->where('qte', '>', 0)->where('rupture', 1))
                                     ->orWhere('qte', '<', 0)
                               ),
            default        => $base,
        };
    }

    private static function stockStatusLabel(Product $p): string
    {
        $status = $p->stock_status ?? 'unknown';
        return match ($status) {
            'in_stock'     => 'En stock',
            'low_stock'    => 'Stock faible',
            'out_of_stock' => 'Rupture',
            'inconsistent' => 'Incohérence',
            default        => '—',
        };
    }

    // ── PDF ────────────────────────────────────────────────────────────────────

    public function pdf(Request $request)
    {
        $tab      = $request->query('tab', 'all');
        $tabLabel = self::TAB_LABELS[$tab] ?? 'Tous les produits';
        $products = $this->filteredQuery($tab)->get();

        $data = [
            'products'     => $products,
            'tab_label'    => $tabLabel,
            'generated_at' => now()->format('d/m/Y H:i'),
            'statusLabel'  => fn (Product $p) => self::stockStatusLabel($p),
        ];

        $filename = 'stock-' . $tab . '-' . Carbon::now()->format('Y-m-d') . '.pdf';

        try {
            if (! class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
                // Fallback: return HTML for browser printing
                return response(view('filament.pages.stock.stock-export-pdf', $data)->render())
                    ->header('Content-Type', 'text/html; charset=UTF-8');
            }

            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('filament.pages.stock.stock-export-pdf', $data)
                ->setPaper('a4', 'portrait');

            return $pdf->download($filename);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('StockExportController::pdf', ['error' => $e->getMessage()]);

            return response(view('filament.pages.stock.stock-export-pdf', $data)->render())
                ->header('Content-Type', 'text/html; charset=UTF-8');
        }
    }

    // ── CSV ────────────────────────────────────────────────────────────────────

    public function csv(Request $request): StreamedResponse
    {
        $tab      = $request->query('tab', 'all');
        $tabLabel = self::TAB_LABELS[$tab] ?? 'Tous les produits';
        $products = $this->filteredQuery($tab)->get();
        $filename = 'stock-' . $tab . '-' . Carbon::now()->format('Y-m-d') . '.csv';

        return Response::streamDownload(function () use ($products, $tabLabel) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // UTF-8 BOM

            fputcsv($out, ['Gestion de stock — ' . $tabLabel, 'Généré le ' . now()->format('d/m/Y H:i')], ';');
            fputcsv($out, [], ';');
            fputcsv($out, ['Produit', 'Prix TTC (DT)', 'Quantité', 'Statut', 'Catégorie', 'Marque'], ';');

            foreach ($products as $p) {
                fputcsv($out, [
                    $p->designation_fr,
                    number_format((float) ($p->prix ?? 0), 3, ',', ''),
                    (int) $p->qte,
                    self::stockStatusLabel($p),
                    $p->sousCategorie?->designation_fr ?? '—',
                    $p->brand?->designation_fr ?? '—',
                ], ';');
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
