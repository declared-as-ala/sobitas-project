<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboardService,
    ) {}

    /**
     * Display the main dashboard view.
     */
    public function index()
    {
        $now = Carbon::now();
        $todayStart = $now->copy()->startOfDay();
        $todayEnd = $now->copy()->endOfDay();
        $weekStart = $now->copy()->startOfWeek();
        $monthStart = $now->copy()->startOfMonth();
        $monthEnd = $now->copy()->endOfMonth();

        // Overview stats for different periods
        $todayStats = $this->dashboardService->getOverviewStats($todayStart, $todayEnd);
        $weekStats = $this->dashboardService->getOverviewStats($weekStart, $now->copy());
        $monthStats = $this->dashboardService->getOverviewStats($monthStart, $monthEnd);
        $monthlyComparison = $this->dashboardService->getMonthlyComparison();

        // Order status breakdown
        $orderStatuses = $this->dashboardService->getOrderStatusBreakdown();

        // Top products (last 30 days)
        $topProducts = $this->dashboardService->getTopProducts(
            $now->copy()->subDays(30),
            $now->copy()
        );

        // Revenue by source (this month)
        $revenueBySource = $this->dashboardService->getRevenueBySource($monthStart, $monthEnd);

        // Daily revenue for last 7 days (mini chart)
        $dailyRevenue = $this->dashboardService->getSalesChartData(
            $now->copy()->subDays(6)->startOfDay(),
            $now->copy()->endOfDay()
        );

        // Total entity counts
        $totalCounts = $this->dashboardService->getTotalCounts();

        // Recent activity
        $recentActivity = $this->dashboardService->getRecentActivity(10);

        // Pending orders count
        $pendingCommandes = $orderStatuses['nouvelle'] + $orderStatuses['preparation'];

        return view('admin.index', [
            'recentCommandes' => $recentActivity['recentCommandes'],
            'recentFactures' => $recentActivity['recentFactures'],
            'recentTickets' => $recentActivity['recentTickets'],
            'recentClients' => $recentActivity['recentClients'],
            'todayRevenue' => $todayStats['total_revenue'],
            'todayOrders' => $todayStats['total_orders'],
            'weekRevenue' => $weekStats['total_revenue'],
            'monthRevenue' => $monthStats['total_revenue'],
            'lastMonthRevenue' => $monthlyComparison['last_month'],
            'revenueGrowth' => $monthlyComparison['percentage_change'],
            'pendingCommandes' => $pendingCommandes,
            'orderStatuses' => $orderStatuses,
            'topProducts' => $topProducts,
            'revenueBySource' => $revenueBySource,
            'dailyRevenue' => $dailyRevenue,
            'totalClients' => $totalCounts['total_clients'],
            'totalProducts' => $totalCounts['total_products'],
            'totalFactures' => $totalCounts['total_factures'],
            'totalTickets' => $totalCounts['total_tickets'],
            'totalCommandes' => $totalCounts['total_commandes'],
        ]);
    }

    /**
     * Get dashboard statistics via AJAX.
     */
    public function getStatistics(Request $request): array
    {
        $dateRange = $this->resolveDateRange($request);

        return [
            'overview' => $this->dashboardService->getOverviewStats($dateRange['start'], $dateRange['end']),
            'top_products' => $this->dashboardService->getTopProducts($dateRange['start'], $dateRange['end']),
            'sales_chart' => $this->dashboardService->getSalesChartData($dateRange['start'], $dateRange['end']),
            'revenue_by_source' => $this->dashboardService->getRevenueBySource($dateRange['start'], $dateRange['end']),
            'monthly_comparison' => $this->dashboardService->getMonthlyComparison(),
        ];
    }

    /**
     * Resolve date range from request.
     */
    private function resolveDateRange(Request $request): array
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        if ($startDate && $endDate) {
            return [
                'start' => Carbon::parse($startDate)->startOfDay(),
                'end' => Carbon::parse($endDate)->endOfDay(),
            ];
        }

        $period = $request->input('period', 'current_month');
        $now = Carbon::now();

        return match ($period) {
            'last_month' => [
                'start' => $now->copy()->subMonth()->startOfMonth(),
                'end' => $now->copy()->subMonth()->endOfMonth(),
            ],
            'last_3_months' => [
                'start' => $now->copy()->subMonths(3)->startOfMonth(),
                'end' => $now->copy()->endOfMonth(),
            ],
            'last_6_months' => [
                'start' => $now->copy()->subMonths(6)->startOfMonth(),
                'end' => $now->copy()->endOfMonth(),
            ],
            'current_year' => [
                'start' => $now->copy()->startOfYear(),
                'end' => $now->copy()->endOfYear(),
            ],
            'last_year' => [
                'start' => $now->copy()->subYear()->startOfYear(),
                'end' => $now->copy()->subYear()->endOfYear(),
            ],
            default => [ // current_month
                'start' => $now->copy()->startOfMonth(),
                'end' => $now->copy()->endOfMonth(),
            ],
        };
    }
}
