<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\Client;
use App\Models\Commande;
use App\Models\Facture;
use App\Models\FactureTva;
use App\Models\Product;
use App\Models\Ticket;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    /**
     * Get overview stats for a date range with caching.
     */
    public function getOverviewStats(Carbon $start, Carbon $end): array
    {
        $cacheKey = "dashboard_overview_{$start->format('Ymd')}_{$end->format('Ymd')}";

        return Cache::remember($cacheKey, 300, function () use ($start, $end): array {
            $facturesRevenue = (float) Facture::whereBetween('created_at', [$start, $end])->sum('prix_ttc');
            $factureTvaRevenue = (float) FactureTva::whereBetween('created_at', [$start, $end])->sum('prix_ttc');
            $ticketsRevenue = (float) Ticket::whereBetween('created_at', [$start, $end])->sum('prix_ttc');
            $commandesRevenue = (float) Commande::shipped()->whereBetween('created_at', [$start, $end])->sum('prix_ttc');

            $totalRevenue = $facturesRevenue + $factureTvaRevenue + $ticketsRevenue + $commandesRevenue;

            $totalOrders = Commande::shipped()->whereBetween('created_at', [$start, $end])->count()
                + Facture::whereBetween('created_at', [$start, $end])->count()
                + FactureTva::whereBetween('created_at', [$start, $end])->count()
                + Ticket::whereBetween('created_at', [$start, $end])->count();

            return [
                'total_revenue' => round($totalRevenue, 2),
                'total_orders' => $totalOrders,
                'new_clients' => Client::whereBetween('created_at', [$start, $end])->count(),
                'pending_orders' => Commande::pending()->count(),
                'average_order_value' => $totalOrders > 0 ? round($totalRevenue / $totalOrders, 2) : 0,
            ];
        });
    }

    /**
     * Get revenue for a specific date range.
     */
    public function getRevenue(Carbon $start, Carbon $end): float
    {
        return (float) (
            Facture::whereBetween('created_at', [$start, $end])->sum('prix_ttc')
            + FactureTva::whereBetween('created_at', [$start, $end])->sum('prix_ttc')
            + Ticket::whereBetween('created_at', [$start, $end])->sum('prix_ttc')
            + Commande::shipped()->whereBetween('created_at', [$start, $end])->sum('prix_ttc')
        );
    }

    /**
     * Get top selling products for a date range.
     */
    public function getTopProducts(Carbon $start, Carbon $end, int $limit = 5): array
    {
        $cacheKey = "top_products_{$start->format('Ymd')}_{$end->format('Ymd')}";

        return Cache::remember($cacheKey, 300, function () use ($start, $end, $limit): array {
            $sales = collect();

            // Aggregate from all sales sources
            $sources = [
                ['table' => 'details_factures', 'join' => 'factures', 'fk' => 'facture_id'],
                ['table' => 'details_facture_tvas', 'join' => 'facture_tvas', 'fk' => 'facture_tva_id'],
                ['table' => 'details_tickets', 'join' => 'tickets', 'fk' => 'ticket_id'],
            ];

            foreach ($sources as $source) {
                $query = DB::table($source['table'])
                    ->join($source['join'], "{$source['table']}.{$source['fk']}", '=', "{$source['join']}.id")
                    ->whereBetween("{$source['join']}.created_at", [$start, $end])
                    ->select(
                        'produit_id',
                        DB::raw("SUM({$source['table']}.qte) as total_qty"),
                        DB::raw("SUM({$source['table']}.prix_ttc) as total_revenue")
                    )
                    ->groupBy('produit_id')
                    ->get();

                $sales = $sales->concat($query);
            }

            // Group by product
            $grouped = $sales->groupBy('produit_id')->map(fn ($items) => [
                'quantity' => $items->sum('total_qty'),
                'revenue' => $items->sum('total_revenue'),
            ])->sortByDesc('revenue')->take($limit);

            // Eager load product names
            $productIds = $grouped->keys()->toArray();
            $products = Product::whereIn('id', $productIds)->pluck('designation_fr', 'id');

            return $grouped->map(fn ($data, $id) => [
                'id' => $id,
                'name' => $products[$id] ?? 'Inconnu',
                'quantity' => (int) $data['quantity'],
                'revenue' => round((float) $data['revenue'], 2),
            ])->values()->toArray();
        });
    }

    /**
     * Get daily sales chart data for a date range.
     */
    public function getSalesChartData(Carbon $start, Carbon $end): array
    {
        $cacheKey = "sales_chart_{$start->format('Ymd')}_{$end->format('Ymd')}";

        return Cache::remember($cacheKey, 300, function () use ($start, $end): array {
            $days = [];
            $current = $start->copy();

            while ($current->lte($end)) {
                $dayStart = $current->copy()->startOfDay();
                $dayEnd = $current->copy()->endOfDay();

                $revenue = (float) Facture::whereBetween('created_at', [$dayStart, $dayEnd])->sum('prix_ttc')
                    + (float) FactureTva::whereBetween('created_at', [$dayStart, $dayEnd])->sum('prix_ttc')
                    + (float) Ticket::whereBetween('created_at', [$dayStart, $dayEnd])->sum('prix_ttc')
                    + (float) Commande::shipped()->whereBetween('created_at', [$dayStart, $dayEnd])->sum('prix_ttc');

                $days[] = [
                    'date' => $current->format('d/m'),
                    'revenue' => round($revenue, 2),
                ];

                $current->addDay();
            }

            return $days;
        });
    }

    /**
     * Get revenue breakdown by source for a date range.
     */
    public function getRevenueBySource(Carbon $start, Carbon $end): array
    {
        $cacheKey = "revenue_source_{$start->format('Ymd')}_{$end->format('Ymd')}";

        return Cache::remember($cacheKey, 300, function () use ($start, $end): array {
            return [
                'factures' => round((float) Facture::whereBetween('created_at', [$start, $end])->sum('prix_ttc'), 2),
                'factures_tva' => round((float) FactureTva::whereBetween('created_at', [$start, $end])->sum('prix_ttc'), 2),
                'tickets' => round((float) Ticket::whereBetween('created_at', [$start, $end])->sum('prix_ttc'), 2),
                'commandes' => round((float) Commande::shipped()->whereBetween('created_at', [$start, $end])->sum('prix_ttc'), 2),
            ];
        });
    }

    /**
     * Compare current month revenue with last month.
     */
    public function getMonthlyComparison(): array
    {
        $now = Carbon::now();

        $currentMonth = $this->getRevenue(
            $now->copy()->startOfMonth(),
            $now->copy()->endOfMonth()
        );

        $lastMonth = $this->getRevenue(
            $now->copy()->subMonth()->startOfMonth(),
            $now->copy()->subMonth()->endOfMonth()
        );

        $percentageChange = $lastMonth > 0
            ? round((($currentMonth - $lastMonth) / $lastMonth) * 100, 1)
            : ($currentMonth > 0 ? 100 : 0);

        return [
            'current_month' => round($currentMonth, 2),
            'last_month' => round($lastMonth, 2),
            'percentage_change' => $percentageChange,
        ];
    }

    /**
     * Get recent activity: latest commandes, factures, tickets, clients.
     */
    public function getRecentActivity(int $limit = 10): array
    {
        return [
            'recentCommandes' => Commande::latest()->limit($limit)->get(),
            'recentFactures' => Facture::with('client')->latest()->limit($limit)->get(),
            'recentTickets' => Ticket::with('client')->latest()->limit($limit)->get(),
            'recentClients' => Client::latest()->limit($limit)->get(),
        ];
    }

    /**
     * Get total entity counts for the dashboard.
     */
    public function getTotalCounts(): array
    {
        return Cache::remember('dashboard_total_counts', 300, function (): array {
            return [
                'total_clients' => Client::count(),
                'total_products' => Product::count(),
                'total_factures' => Facture::count() + FactureTva::count(),
                'total_tickets' => Ticket::count(),
                'total_commandes' => Commande::count(),
            ];
        });
    }

    /**
     * Get order status breakdown counts.
     */
    public function getOrderStatusBreakdown(): array
    {
        $statuses = Commande::select('etat', DB::raw('COUNT(*) as count'))
            ->groupBy('etat')
            ->pluck('count', 'etat')
            ->toArray();

        return [
            'nouvelle' => $statuses[OrderStatus::NOUVELLE_COMMANDE->value] ?? 0,
            'preparation' => $statuses[OrderStatus::EN_COURS_DE_PREPARATION->value] ?? 0,
            'prete' => $statuses[OrderStatus::PRETE->value] ?? 0,
            'livraison' => $statuses[OrderStatus::EN_COURS_DE_LIVRAISON->value] ?? 0,
            'expediee' => $statuses[OrderStatus::EXPEDIEE->value] ?? 0,
            'annulee' => $statuses[OrderStatus::ANNULEE->value] ?? 0,
        ];
    }
}
