<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DashboardExportController extends Controller
{
    /**
     * Export dashboard data to CSV
     */
    public function export(Request $request)
    {
        $preset = $request->get('preset', '30_days');
        
        // Get date range based on preset
        $dateRange = $this->getDateRange($preset);
        $start = $dateRange['start'];
        $end = $dateRange['end'];
        $label = $dateRange['label'];
        
        // Generate filename with date range
        $filename = 'dashboard-export-' . $label . '-' . Carbon::now()->format('Y-m-d-His') . '.csv';
        
        // Get export data
        $data = $this->getExportData($start, $end);
        
        // Return CSV download
        return $this->downloadCsv($filename, $data, $label);
    }
    
    /**
     * Get date range based on preset
     */
    private function getDateRange(string $preset): array
    {
        $now = Carbon::now();
        
        switch ($preset) {
            case '7_days':
                $start = $now->copy()->subDays(6)->startOfDay();
                $end = $now->copy()->endOfDay();
                $label = '7-jours';
                break;
            case '90_days':
                $start = $now->copy()->subDays(89)->startOfDay();
                $end = $now->copy()->endOfDay();
                $label = '90-jours';
                break;
            case 'this_month':
                $start = $now->copy()->startOfMonth();
                $end = $now->copy()->endOfMonth();
                $label = 'ce-mois';
                break;
            case 'last_month':
                $start = $now->copy()->subMonth()->startOfMonth();
                $end = $now->copy()->subMonth()->endOfMonth();
                $label = 'mois-dernier';
                break;
            case '30_days':
            default:
                $start = $now->copy()->subDays(29)->startOfDay();
                $end = $now->copy()->endOfDay();
                $label = '30-jours';
                break;
        }
        
        return [
            'start' => $start,
            'end' => $end,
            'label' => $label,
        ];
    }
    
    /**
     * Get all export data for the period
     */
    private function getExportData(Carbon $start, Carbon $end): array
    {
        $data = [];
        
        // 1. Revenue Summary
        $revenue = DB::selectOne("
            SELECT
                COALESCE(SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN prix_ttc ELSE 0 END), 0) as period_revenue,
                COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN prix_ttc ELSE 0 END), 0) as today_revenue
            FROM (
                SELECT prix_ttc, created_at FROM factures WHERE created_at >= ? AND created_at <= ?
                UNION ALL
                SELECT prix_ttc, created_at FROM facture_tvas WHERE created_at >= ? AND created_at <= ?
                UNION ALL
                SELECT prix_ttc, created_at FROM tickets WHERE created_at >= ? AND created_at <= ?
            ) AS combined_revenue
        ", [
            $start, $end,
            $start, $end,
            $start, $end,
            $start, $end,
        ]);
        
        $data['revenue'] = [
            'Période' => number_format((float) $revenue->period_revenue, 3, '.', ' ') . ' DT',
            "Aujourd'hui" => number_format((float) $revenue->today_revenue, 3, '.', ' ') . ' DT',
        ];
        
        // 2. Orders Statistics
        $orderStats = DB::selectOne("
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN etat IN ('nouvelle_commande', 'en_cours_de_preparation') THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN etat = 'expidee' THEN 1 ELSE 0 END) as shipped,
                SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN 1 ELSE 0 END) as period_count
            FROM commandes
        ", [$start, $end]);
        
        $data['orders'] = [
            'Total' => (int) $orderStats->total,
            'En attente' => (int) $orderStats->pending,
            'Expédiées' => (int) $orderStats->shipped,
            'Période sélectionnée' => (int) $orderStats->period_count,
        ];
        
        // 3. Products Statistics
        $productStats = DB::selectOne("
            SELECT 
                COUNT(*) as total, 
                SUM(CASE WHEN publier = 1 THEN 1 ELSE 0 END) as published
            FROM products
        ");
        
        $data['products'] = [
            'Total' => (int) $productStats->total,
            'Publiés' => (int) $productStats->published,
        ];
        
        // 4. Clients Statistics
        $clientStats = DB::selectOne("
            SELECT 
                COUNT(*) as total, 
                SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN 1 ELSE 0 END) as period_new
            FROM clients
        ", [$start, $end]);
        
        $data['clients'] = [
            'Total' => (int) $clientStats->total,
            'Nouveaux (période)' => (int) $clientStats->period_new,
        ];
        
        // 5. Daily Revenue Breakdown
        $dailyData = DB::select("
            SELECT
                DATE(created_at) as day,
                SUM(prix_ttc) as daily_total,
                COUNT(*) as count
            FROM (
                SELECT prix_ttc, created_at FROM factures WHERE created_at >= ? AND created_at <= ?
                UNION ALL
                SELECT prix_ttc, created_at FROM facture_tvas WHERE created_at >= ? AND created_at <= ?
                UNION ALL
                SELECT prix_ttc, created_at FROM tickets WHERE created_at >= ? AND created_at <= ?
            ) AS combined
            GROUP BY DATE(created_at)
            ORDER BY day
        ", [
            $start, $end,
            $start, $end,
            $start, $end,
        ]);
        
        $data['daily_revenue'] = collect($dailyData)->map(function ($row) {
            return [
                'Date' => $row->day,
                'Revenu (DT)' => number_format((float) $row->daily_total, 3, '.', ' '),
                'Nombre de transactions' => (int) $row->count,
            ];
        })->toArray();
        
        // 6. Recent Orders Details
        $recentOrders = DB::select("
            SELECT
                numero,
                nom,
                prenom,
                phone,
                prix_ttc,
                etat,
                created_at
            FROM commandes
            WHERE created_at >= ? AND created_at <= ?
            ORDER BY created_at DESC
            LIMIT 100
        ", [$start, $end]);
        
        $data['recent_orders'] = collect($recentOrders)->map(function ($order) {
            return [
                'Numéro' => $order->numero,
                'Nom' => $order->nom,
                'Prénom' => $order->prenom,
                'Téléphone' => $order->phone,
                'Prix TTC (DT)' => number_format((float) $order->prix_ttc, 3, '.', ' '),
                'État' => $order->etat,
                'Date' => Carbon::parse($order->created_at)->format('Y-m-d H:i:s'),
            ];
        })->toArray();
        
        return $data;
    }
    
    /**
     * Generate and download CSV file
     */
    private function downloadCsv(string $filename, array $data, string $periodLabel): StreamedResponse
    {
        return response()->streamDownload(function () use ($data, $periodLabel) {
            $handle = fopen('php://output', 'w');
            
            // Add BOM for Excel UTF-8 support
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));
            
            // Header
            fputcsv($handle, ['EXPORT TABLEAU DE BORD - ' . strtoupper($periodLabel)]);
            fputcsv($handle, ['Date d\'export: ' . Carbon::now()->format('d/m/Y H:i:s')]);
            fputcsv($handle, []); // Empty line
            
            // Revenue Summary
            fputcsv($handle, ['=== RÉSUMÉ DES REVENUS ===']);
            foreach ($data['revenue'] as $key => $value) {
                fputcsv($handle, [$key, $value]);
            }
            fputcsv($handle, []); // Empty line
            
            // Orders Statistics
            fputcsv($handle, ['=== STATISTIQUES DES COMMANDES ===']);
            foreach ($data['orders'] as $key => $value) {
                fputcsv($handle, [$key, $value]);
            }
            fputcsv($handle, []); // Empty line
            
            // Products Statistics
            fputcsv($handle, ['=== STATISTIQUES DES PRODUITS ===']);
            foreach ($data['products'] as $key => $value) {
                fputcsv($handle, [$key, $value]);
            }
            fputcsv($handle, []); // Empty line
            
            // Clients Statistics
            fputcsv($handle, ['=== STATISTIQUES DES CLIENTS ===']);
            foreach ($data['clients'] as $key => $value) {
                fputcsv($handle, [$key, $value]);
            }
            fputcsv($handle, []); // Empty line
            
            // Daily Revenue Breakdown
            if (!empty($data['daily_revenue'])) {
                fputcsv($handle, ['=== REVENUS QUOTIDIENS ===']);
                // Headers
                fputcsv($handle, array_keys($data['daily_revenue'][0]));
                // Data
                foreach ($data['daily_revenue'] as $row) {
                    fputcsv($handle, array_values($row));
                }
                fputcsv($handle, []); // Empty line
            }
            
            // Recent Orders
            if (!empty($data['recent_orders'])) {
                fputcsv($handle, ['=== COMMANDES RÉCENTES (100 dernières) ===']);
                // Headers
                fputcsv($handle, array_keys($data['recent_orders'][0]));
                // Data
                foreach ($data['recent_orders'] as $row) {
                    fputcsv($handle, array_values($row));
                }
            }
            
            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }
}
