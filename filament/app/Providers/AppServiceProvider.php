<?php

namespace App\Providers;

use App\Models\Commande;
use App\Models\Facture;
use App\Models\FactureTva;
use App\Models\Ticket;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;
use Livewire\Livewire;
use App\Filament\Widgets\DashboardHeaderWidget;
use App\Filament\Widgets\QuickActionsWidget;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // ── Strict mode only in LOCAL environment ──────────
        // preventLazyLoading throws exceptions which has overhead.
        // In Docker/staging, we want performance, not exception handling.
        if ($this->app->environment('local')) {
            Model::preventLazyLoading();
            Model::preventSilentlyDiscardingAttributes();
        }

        // ── Cache Invalidation for Dashboard Widgets ──────
        // Lightweight closure registration (no DB queries, just callback setup)
        $flushDashboardCache = function () {
            Cache::forget('dashboard:stats_overview');
            Cache::forget('dashboard:revenue_chart');
            Cache::forget('dashboard:order_status_chart');
            Cache::forget('dashboard:top_products');
            Cache::forget('dashboard:monthly_revenue_comparison');
            Cache::forget('nav:commandes_pending');
        };

        foreach ([Commande::class, Facture::class, FactureTva::class, Ticket::class] as $model) {
            $model::saved($flushDashboardCache);
            $model::deleted($flushDashboardCache);
        }

        // ── Slow Query Logging (Local Only) ────────────────
        // Logs queries that take > 100ms to help identify performance bottlenecks
        if ($this->app->environment('local')) {
            DB::listen(function ($query) {
                if ($query->time > 100) { // Log queries > 100ms
                    Log::warning('Slow query detected', [
                        'sql' => $query->sql,
                        'bindings' => $query->bindings,
                        'time' => $query->time . 'ms',
                        'connection' => $query->connectionName,
                    ]);
                }
            });
        }

        // ── Explicit Component Registration ────────────────
        // Fix for "Unable to find component" errors
        Livewire::component('app.filament.widgets.dashboard-header-widget', DashboardHeaderWidget::class);
        Livewire::component('filament.widgets.dashboard-header-widget', DashboardHeaderWidget::class);
        Livewire::component('app.filament.widgets.quick-actions-widget', QuickActionsWidget::class);
        Livewire::component('filament.widgets.quick-actions-widget', QuickActionsWidget::class);
    }
}
