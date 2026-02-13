<?php

namespace App\Filament\Widgets;

use App\Client;
use App\Commande;
use App\Facture;
use App\FactureTva;
use App\Product;
use App\Ticket;
use Carbon\Carbon;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class StatsOverviewWidget extends BaseWidget
{
    protected static ?int $sort = 1;

    protected function getStats(): array
    {
        $today = Carbon::today();
        $weekStart = Carbon::now()->startOfWeek();
        $monthStart = Carbon::now()->startOfMonth();
        $lastMonthStart = Carbon::now()->subMonth()->startOfMonth();
        $lastMonthEnd = Carbon::now()->subMonth()->endOfMonth();

        // Today's revenue
        $todayRevenue = Facture::whereDate('created_at', $today)->sum('prix_ttc') +
            FactureTva::whereDate('created_at', $today)->sum('prix_ttc') +
            Ticket::whereDate('created_at', $today)->sum('prix_ttc');

        // This month's revenue
        $monthRevenue = Facture::where('created_at', '>=', $monthStart)->sum('prix_ttc') +
            FactureTva::where('created_at', '>=', $monthStart)->sum('prix_ttc') +
            Ticket::where('created_at', '>=', $monthStart)->sum('prix_ttc');

        // Last month's revenue
        $lastMonthRevenue = Facture::whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])->sum('prix_ttc') +
            FactureTva::whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])->sum('prix_ttc') +
            Ticket::whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])->sum('prix_ttc');

        // Revenue growth
        $revenueGrowth = $lastMonthRevenue > 0
            ? round((($monthRevenue - $lastMonthRevenue) / $lastMonthRevenue) * 100, 1)
            : 0;

        // Last 7 days revenue for chart
        $last7Days = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $dayRevenue = Facture::whereDate('created_at', $date)->sum('prix_ttc') +
                FactureTva::whereDate('created_at', $date)->sum('prix_ttc') +
                Ticket::whereDate('created_at', $date)->sum('prix_ttc');
            $last7Days[] = round($dayRevenue, 0);
        }

        // Today's orders
        $todayOrders = Commande::whereDate('created_at', $today)->count() +
            Facture::whereDate('created_at', $today)->count() +
            FactureTva::whereDate('created_at', $today)->count() +
            Ticket::whereDate('created_at', $today)->count();

        // This week's orders for chart
        $weekOrders = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $dayOrders = Commande::whereDate('created_at', $date)->count() +
                Facture::whereDate('created_at', $date)->count() +
                FactureTva::whereDate('created_at', $date)->count() +
                Ticket::whereDate('created_at', $date)->count();
            $weekOrders[] = $dayOrders;
        }

        // Pending commandes
        $pendingCommandes = Commande::whereIn('etat', ['nouvelle_commande', 'en_cours_de_preparation'])->count();

        // Total clients
        $totalClients = Client::count();
        $newClientsThisMonth = Client::where('created_at', '>=', $monthStart)->count();

        // Total products
        $totalProducts = Product::count();
        $lowStockProducts = Product::where('qte', '<', 10)->count();

        return [
            Stat::make('Revenue Today', number_format($todayRevenue, 2) . ' TND')
                ->description('Total revenue for today')
                ->descriptionIcon('heroicon-m-arrow-trending-up')
                ->color('success')
                ->chart($last7Days),
            
            Stat::make('Revenue This Month', number_format($monthRevenue, 2) . ' TND')
                ->description($revenueGrowth >= 0 ? '+' . $revenueGrowth . '% from last month' : $revenueGrowth . '% from last month')
                ->descriptionIcon($revenueGrowth >= 0 ? 'heroicon-m-arrow-trending-up' : 'heroicon-m-arrow-trending-down')
                ->color($revenueGrowth >= 0 ? 'success' : 'danger')
                ->chart($last7Days),
            
            Stat::make('Today\'s Orders', $todayOrders)
                ->description('Orders created today')
                ->descriptionIcon('heroicon-m-shopping-cart')
                ->color('info')
                ->chart($weekOrders),
            
            Stat::make('Pending Orders', $pendingCommandes)
                ->description('Orders awaiting processing')
                ->descriptionIcon('heroicon-m-clock')
                ->color('warning'),
            
            Stat::make('Total Clients', $totalClients)
                ->description($newClientsThisMonth . ' new this month')
                ->descriptionIcon('heroicon-m-users')
                ->color('primary'),
            
            Stat::make('Products', $totalProducts)
                ->description($lowStockProducts . ' low stock items')
                ->descriptionIcon($lowStockProducts > 0 ? 'heroicon-m-exclamation-triangle' : 'heroicon-m-cube')
                ->color($lowStockProducts > 0 ? 'warning' : 'success'),
        ];
    }
}
