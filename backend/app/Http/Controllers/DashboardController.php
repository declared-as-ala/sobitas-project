<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Commande;
use App\Client;
use App\Product;
use App\Facture;
use App\FactureTva;
use App\Ticket;
use App\DetailsFacture;
use App\DetailsFactureTva;
use App\DetailsTicket;
use App\CommandeDetail;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Display the main dashboard view
     */
    public function index()
    {
        // Use modern dashboard if it exists, otherwise fallback to default
        if (view()->exists('admin.index-modern')) {
            return view('admin.index-modern');
        }
        return view('admin.index');
    }

    /**
     * Get dashboard statistics via AJAX
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getStatistics(Request $request)
    {
        // Check if custom dates are provided
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        if ($startDate && $endDate) {
            // Use custom date range
            $dateRange = $this->getCustomDateRange($startDate, $endDate);
        } else {
            // Fallback to period-based selection
            $period = $request->input('period', 'current_month');
            $dateRange = $this->getDateRange($period);
        }

        $statistics = [
            'overview' => $this->getOverviewStats($dateRange),
            'top_products' => $this->getTopProducts($dateRange),
            'sales_chart' => $this->getSalesChartData($dateRange),
            'revenue_by_source' => $this->getRevenueBySource($dateRange),
            'monthly_comparison' => $this->getMonthlyComparison(),
        ];

        return $statistics;
    }

    /**
     * Create custom date range from provided dates
     *
     * @param string $startDate
     * @param string $endDate
     * @return array
     */
    private function getCustomDateRange($startDate, $endDate)
    {
        $start = Carbon::parse($startDate)->startOfDay();
        $end = Carbon::parse($endDate)->endOfDay();

        return [
            'start' => $start,
            'end' => $end,
            'label' => $start->format('d M Y') . ' - ' . $end->format('d M Y')
        ];
    }

    /**
     * Calculate date range based on selected period
     *
     * @param string $period
     * @return array
     */
    private function getDateRange($period)
    {
        $now = Carbon::now();

        switch ($period) {
            case 'current_month':
                return [
                    'start' => $now->copy()->startOfMonth(),
                    'end' => $now->copy()->endOfMonth(),
                    'label' => $now->translatedFormat('F Y')
                ];

            case 'last_month':
                return [
                    'start' => $now->copy()->subMonth()->startOfMonth(),
                    'end' => $now->copy()->subMonth()->endOfMonth(),
                    'label' => $now->copy()->subMonth()->translatedFormat('F Y')
                ];

            case 'last_3_months':
                return [
                    'start' => $now->copy()->subMonths(3)->startOfMonth(),
                    'end' => $now->copy()->endOfMonth(),
                    'label' => 'Last 3 Months'
                ];

            case 'last_6_months':
                return [
                    'start' => $now->copy()->subMonths(6)->startOfMonth(),
                    'end' => $now->copy()->endOfMonth(),
                    'label' => 'Last 6 Months'
                ];

            case 'current_year':
                return [
                    'start' => $now->copy()->startOfYear(),
                    'end' => $now->copy()->endOfYear(),
                    'label' => $now->year
                ];

            case 'last_year':
                return [
                    'start' => $now->copy()->subYear()->startOfYear(),
                    'end' => $now->copy()->subYear()->endOfYear(),
                    'label' => $now->copy()->subYear()->year
                ];

            default:
                return [
                    'start' => $now->copy()->startOfMonth(),
                    'end' => $now->copy()->endOfMonth(),
                    'label' => $now->translatedFormat('F Y')
                ];
        }
    }

    /**
     * Get overview statistics (total revenue, orders, clients, etc.)
     *
     * @param array $dateRange
     * @return array
     */
    private function getOverviewStats($dateRange)
    {
        $start = $dateRange['start'];
        $end = $dateRange['end'];

        // Calculate total revenue from all sources
        $facturesRevenue = Facture::whereBetween('created_at', [$start, $end])
            ->sum('prix_ttc');

        $factureTvasRevenue = FactureTva::whereBetween('created_at', [$start, $end])
            ->sum('prix_ttc');

        $ticketsRevenue = Ticket::whereBetween('created_at', [$start, $end])
            ->sum('prix_ttc');

        $commandesRevenue = Commande::where('etat', 'expidee')->whereBetween('created_at', [$start, $end])
            ->sum('prix_ttc');

        $totalRevenue = $facturesRevenue + $factureTvasRevenue + $ticketsRevenue + $commandesRevenue;

        // Count orders
        $totalOrders = Commande::where('etat', 'expidee')->whereBetween('created_at', [$start, $end])->count() +
                       Facture::whereBetween('created_at', [$start, $end])->count() +
                       FactureTva::whereBetween('created_at', [$start, $end])->count() +
                       Ticket::whereBetween('created_at', [$start, $end])->count();

        // New clients in period
        $newClients = Client::whereBetween('created_at', [$start, $end])->count();

        // New orders status
        $newCommandes = Commande::where('etat', 'nouvelle_commande')
            ->whereBetween('created_at', [$start, $end])
            ->count();

        return [
            'total_revenue' => round($totalRevenue, 2),
            'total_orders' => $totalOrders,
            'new_clients' => $newClients,
            'new_commandes' => $newCommandes,
            'average_order_value' => $totalOrders > 0 ? round($totalRevenue / $totalOrders, 2) : 0,
        ];
    }

    /**
     * Get top 5 best-selling products
     *
     * @param array $dateRange
     * @return array
     */
    public function getTopProducts($dateRange)
    {
        $start = $dateRange['start'];
        $end = $dateRange['end'];

        // Aggregate sales from all sources
        $productSales = [];

        // From factures
        $factureProducts = DB::table('details_factures')
            ->join('factures', 'details_factures.facture_id', '=', 'factures.id')
            ->whereBetween('factures.created_at', [$start, $end])
            ->select('produit_id', DB::raw('SUM(details_factures.qte) as total_quantity'), DB::raw('SUM(details_factures.prix_ttc) as total_revenue'))
            ->groupBy('produit_id')
            ->get();

        foreach ($factureProducts as $item) {
            if (!isset($productSales[$item->produit_id])) {
                $productSales[$item->produit_id] = ['quantity' => 0, 'revenue' => 0];
            }
            $productSales[$item->produit_id]['quantity'] += $item->total_quantity;
            $productSales[$item->produit_id]['revenue'] += $item->total_revenue;
        }

        // From facture_tvas
        $factureTvaProducts = DB::table('details_facture_tvas')
            ->join('facture_tvas', 'details_facture_tvas.facture_tva_id', '=', 'facture_tvas.id')
            ->whereBetween('facture_tvas.created_at', [$start, $end])
            ->select('produit_id', DB::raw('SUM(details_facture_tvas.qte) as total_quantity'), DB::raw('SUM(details_facture_tvas.prix_ttc) as total_revenue'))
            ->groupBy('produit_id')
            ->get();

        foreach ($factureTvaProducts as $item) {
            if (!isset($productSales[$item->produit_id])) {
                $productSales[$item->produit_id] = ['quantity' => 0, 'revenue' => 0];
            }
            $productSales[$item->produit_id]['quantity'] += $item->total_quantity;
            $productSales[$item->produit_id]['revenue'] += $item->total_revenue;
        }

        // From tickets
        $ticketProducts = DB::table('details_tickets')
            ->join('tickets', 'details_tickets.ticket_id', '=', 'tickets.id')
            ->whereBetween('tickets.created_at', [$start, $end])
            ->select('produit_id', DB::raw('SUM(details_tickets.qte) as total_quantity'), DB::raw('SUM(details_tickets.prix_ttc) as total_revenue'))
            ->groupBy('produit_id')
            ->get();

        foreach ($ticketProducts as $item) {
            if (!isset($productSales[$item->produit_id])) {
                $productSales[$item->produit_id] = ['quantity' => 0, 'revenue' => 0];
            }
            $productSales[$item->produit_id]['quantity'] += $item->total_quantity;
            $productSales[$item->produit_id]['revenue'] += $item->total_revenue;
        }

        // From commandes
        $commandeProducts = DB::table('commande_details')
            ->join('commandes', 'commande_details.commande_id', '=', 'commandes.id')
            ->whereBetween('commandes.created_at', [$start, $end])
            ->where('commandes.etat', 'expidee')
            ->select('produit_id', DB::raw('SUM(commande_details.qte) as total_quantity'), DB::raw('SUM(commande_details.prix_ttc) as total_revenue'))
            ->groupBy('produit_id')
            ->get();

        foreach ($commandeProducts as $item) {
            if (!isset($productSales[$item->produit_id])) {
                $productSales[$item->produit_id] = ['quantity' => 0, 'revenue' => 0];
            }
            $productSales[$item->produit_id]['quantity'] += $item->total_quantity;
            $productSales[$item->produit_id]['revenue'] += $item->total_revenue;
        }

        // Sort by revenue and get top 5
        uasort($productSales, function($a, $b) {
            return $b['revenue'] <=> $a['revenue'];
        });

        $topProducts = [];
        $count = 0;
        foreach ($productSales as $productId => $data) {
            if ($count >= 5) break;

            $product = Product::find($productId);
            if ($product) {
                $topProducts[] = [
                    'id' => $product->id,
                    'name' => $product->designation_fr ?? $product->name ?? 'Unknown Product',
                    'quantity' => $data['quantity'],
                    'revenue' => round($data['revenue'], 2),
                    'image' => $product->image ?? null,
                ];
                $count++;
            }
        }

        return $topProducts;
    }

    /**
     * Get sales chart data for visualization
     *
     * @param array $dateRange
     * @return array
     */
    private function getSalesChartData($dateRange)
    {
        $start = $dateRange['start'];
        $end = $dateRange['end'];

        $days = $start->diffInDays($end);

        // Determine grouping (daily, weekly, or monthly)
        if ($days <= 31) {
            $groupBy = 'daily';
        } elseif ($days <= 90) {
            $groupBy = 'weekly';
        } else {
            $groupBy = 'monthly';
        }

        $chartData = [];

        if ($groupBy === 'daily') {
            for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
                $dayStart = $date->copy()->startOfDay();
                $dayEnd = $date->copy()->endOfDay();

                $revenue = $this->getDailyRevenue($dayStart, $dayEnd);

                $chartData[] = [
                    'label' => $date->format('d M'),
                    'value' => round($revenue, 2),
                ];
            }
        } elseif ($groupBy === 'monthly') {
            for ($date = $start->copy()->startOfMonth(); $date->lte($end); $date->addMonth()) {
                $monthStart = $date->copy()->startOfMonth();
                $monthEnd = $date->copy()->endOfMonth();

                $revenue = $this->getDailyRevenue($monthStart, $monthEnd);

                $chartData[] = [
                    'label' => $date->format('M Y'),
                    'value' => round($revenue, 2),
                ];
            }
        }

        return $chartData;
    }

    /**
     * Calculate daily/period revenue
     *
     * @param Carbon $start
     * @param Carbon $end
     * @return float
     */
    private function getDailyRevenue($start, $end)
    {
        $factures = Facture::whereBetween('created_at', [$start, $end])->sum('prix_ttc');
        $factureTvas = FactureTva::whereBetween('created_at', [$start, $end])->sum('prix_ttc');
        $tickets = Ticket::whereBetween('created_at', [$start, $end])->sum('prix_ttc');
        $commandes = Commande::where('etat', 'expidee')->whereBetween('created_at', [$start, $end])->sum('prix_ttc');

        return $factures + $factureTvas + $tickets + $commandes;
    }

    /**
     * Get revenue breakdown by source
     *
     * @param array $dateRange
     * @return array
     */
    private function getRevenueBySource($dateRange)
    {
        $start = $dateRange['start'];
        $end = $dateRange['end'];

        return [
            [
                'source' => 'Bon de livraison',
                'revenue' => round(Facture::whereBetween('created_at', [$start, $end])->sum('prix_ttc'), 2),
            ],
            [
                'source' => 'Factures TVA',
                'revenue' => round(FactureTva::whereBetween('created_at', [$start, $end])->sum('prix_ttc'), 2),
            ],
            [
                'source' => 'Tickets',
                'revenue' => round(Ticket::whereBetween('created_at', [$start, $end])->sum('prix_ttc'), 2),
            ],
            [
                'source' => 'Commandes',
                'revenue' => round(Commande::where('etat', 'expidee')->whereBetween('created_at', [$start, $end])->sum('prix_ttc'), 2),
            ],
        ];
    }

    /**
     * Get monthly comparison data
     *
     * @return array
     */
    private function getMonthlyComparison()
    {
        $currentMonth = Carbon::now()->startOfMonth();
        $lastMonth = Carbon::now()->subMonth()->startOfMonth();

        $currentMonthRevenue = $this->getDailyRevenue(
            $currentMonth,
            Carbon::now()
        );

        $lastMonthRevenue = $this->getDailyRevenue(
            $lastMonth,
            $lastMonth->copy()->endOfMonth()
        );

        $percentageChange = $lastMonthRevenue > 0
            ? (($currentMonthRevenue - $lastMonthRevenue) / $lastMonthRevenue) * 100
            : 0;

        return [
            'current_month' => round($currentMonthRevenue, 2),
            'last_month' => round($lastMonthRevenue, 2),
            'percentage_change' => round($percentageChange, 2),
        ];
    }
}
