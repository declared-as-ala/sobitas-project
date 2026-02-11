<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Commande;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DashboardMetricsService
{
    private array $period;

    public function __construct(?array $period = null)
    {
        // Default to last 30 days if no period specified
        $this->period = $period ?? DateRangeFilterService::getPeriod('30d');
    }

    /**
     * Set custom period.
     */
    public function setPeriod(array $period): self
    {
        $this->period = $period;

        return $this;
    }

    /**
     * Get GMV (Gross Merchandise Value) - total order value.
     */
    public function getGMV(bool $comparison = true): array
    {
        $cacheKey = $this->getCacheKey('gmv', $comparison);

        return Cache::remember($cacheKey, 120, function () use ($comparison) {
            $current = $this->calculateGMV($this->period['start'], $this->period['end']);

            if (! $comparison) {
                return ['current' => $current, 'previous' => 0, 'change' => 0];
            }

            $previous = $this->calculateGMV($this->period['prev_start'], $this->period['prev_end']);
            $change = DateRangeFilterService::calculateChange($current, $previous);

            return compact('current', 'previous', 'change');
        });
    }

    private function calculateGMV(Carbon $start, Carbon $end): float
    {
        // GMV = all orders excluding cancelled
        return (float) Commande::whereBetween('created_at', [$start, $end])
            ->whereNotIn('etat', ['annuler'])
            ->sum('prix_ttc');
    }

    /**
     * Get Net Revenue (GMV - refunds - discounts).
     */
    public function getNetRevenue(bool $comparison = true): array
    {
        $cacheKey = $this->getCacheKey('net_revenue', $comparison);

        return Cache::remember($cacheKey, 120, function () use ($comparison) {
            $current = $this->calculateNetRevenue($this->period['start'], $this->period['end']);

            if (! $comparison) {
                return ['current' => $current, 'previous' => 0, 'change' => 0];
            }

            $previous = $this->calculateNetRevenue($this->period['prev_start'], $this->period['prev_end']);
            $change = DateRangeFilterService::calculateChange($current, $previous);

            return compact('current', 'previous', 'change');
        });
    }

    private function calculateNetRevenue(Carbon $start, Carbon $end): float
    {
        $hasRefundField = Schema::hasColumn('commandes', 'refund_amount');
        $hasDiscountField = Schema::hasColumn('commandes', 'discount_amount');

        $query = Commande::whereBetween('created_at', [$start, $end])
            ->whereNotIn('etat', ['annuler']);

        $gmv = (float) $query->sum('prix_ttc');
        $refunds = $hasRefundField ? (float) $query->sum('refund_amount') : 0;
        $discounts = $hasDiscountField ? (float) $query->sum('discount_amount') : 0;

        return $gmv - $refunds - $discounts;
    }

    /**
     * Get order count.
     */
    public function getOrdersCount(bool $comparison = true): array
    {
        $cacheKey = $this->getCacheKey('orders_count', $comparison);

        return Cache::remember($cacheKey, 120, function () use ($comparison) {
            $current = Commande::whereBetween('created_at', [$this->period['start'], $this->period['end']])
                ->whereNotIn('etat', ['annuler'])
                ->count();

            if (! $comparison) {
                return ['current' => $current, 'previous' => 0, 'change' => 0];
            }

            $previous = Commande::whereBetween('created_at', [$this->period['prev_start'], $this->period['prev_end']])
                ->whereNotIn('etat', ['annuler'])
                ->count();

            $change = DateRangeFilterService::calculateChange($current, $previous);

            return compact('current', 'previous', 'change');
        });
    }

    /**
     * Get AOV (Average Order Value).
     */
    public function getAOV(bool $comparison = true): array
    {
        $cacheKey = $this->getCacheKey('aov', $comparison);

        return Cache::remember($cacheKey, 120, function () use ($comparison) {
            $current = $this->calculateAOV($this->period['start'], $this->period['end']);

            if (! $comparison) {
                return ['current' => $current, 'previous' => 0, 'change' => 0];
            }

            $previous = $this->calculateAOV($this->period['prev_start'], $this->period['prev_end']);
            $change = DateRangeFilterService::calculateChange($current, $previous);

            return compact('current', 'previous', 'change');
        });
    }

    private function calculateAOV(Carbon $start, Carbon $end): float
    {
        $stats = Commande::whereBetween('created_at', [$start, $end])
            ->whereNotIn('etat', ['annuler'])
            ->selectRaw('COUNT(*) as count, SUM(prix_ttc) as total')
            ->first();

        if (! $stats || $stats->count == 0) {
            return 0;
        }

        return round($stats->total / $stats->count, 2);
    }

    /**
     * Get cancellation rate (%).
     */
    public function getCancellationRate(bool $comparison = true): array
    {
        $cacheKey = $this->getCacheKey('cancellation_rate', $comparison);

        return Cache::remember($cacheKey, 120, function () use ($comparison) {
            $current = $this->calculateCancellationRate($this->period['start'], $this->period['end']);

            if (! $comparison) {
                return ['current' => $current, 'previous' => 0, 'change' => 0];
            }

            $previous = $this->calculateCancellationRate($this->period['prev_start'], $this->period['prev_end']);
            // For rates, we want absolute change, not percentage of percentage
            $change = round($current - $previous, 2);

            return compact('current', 'previous', 'change');
        });
    }

    private function calculateCancellationRate(Carbon $start, Carbon $end): float
    {
        $stats = Commande::whereBetween('created_at', [$start, $end])
            ->selectRaw('COUNT(*) as total, SUM(CASE WHEN etat = ? THEN 1 ELSE 0 END) as cancelled', ['annuler'])
            ->first();

        if (! $stats || $stats->total == 0) {
            return 0;
        }

        return round(($stats->cancelled / $stats->total) * 100, 2);
    }

    /**
     * Get refund rate (%).
     */
    public function getRefundRate(bool $comparison = true): array
    {
        $cacheKey = $this->getCacheKey('refund_rate', $comparison);

        return Cache::remember($cacheKey, 120, function () use ($comparison) {
            $hasRefundField = Schema::hasColumn('commandes', 'refund_amount');

            if (! $hasRefundField) {
                return ['current' => 0, 'previous' => 0, 'change' => 0];
            }

            $current = $this->calculateRefundRate($this->period['start'], $this->period['end']);

            if (! $comparison) {
                return ['current' => $current, 'previous' => 0, 'change' => 0];
            }

            $previous = $this->calculateRefundRate($this->period['prev_start'], $this->period['prev_end']);
            $change = round($current - $previous, 2);

            return compact('current', 'previous', 'change');
        });
    }

    private function calculateRefundRate(Carbon $start, Carbon $end): float
    {
        $stats = Commande::whereBetween('created_at', [$start, $end])
            ->whereNotIn('etat', ['annuler'])
            ->selectRaw('COUNT(*) as total, SUM(CASE WHEN refund_amount > 0 THEN 1 ELSE 0 END) as refunded')
            ->first();

        if (! $stats || $stats->total == 0) {
            return 0;
        }

        return round(($stats->refunded / $stats->total) * 100, 2);
    }

    /**
     * Get new vs returning customers.
     */
    public function getCustomerMetrics(bool $comparison = true): array
    {
        $cacheKey = $this->getCacheKey('customer_metrics', $comparison);

        return Cache::remember($cacheKey, 120, function () use ($comparison) {
            $current = $this->calculateCustomerMetrics($this->period['start'], $this->period['end']);

            if (! $comparison) {
                return [
                    'new_customers' => $current['new'],
                    'returning_customers' => $current['returning'],
                    'previous_new' => 0,
                    'previous_returning' => 0,
                    'change_new' => 0,
                    'change_returning' => 0,
                ];
            }

            $previous = $this->calculateCustomerMetrics($this->period['prev_start'], $this->period['prev_end']);

            return [
                'new_customers' => $current['new'],
                'returning_customers' => $current['returning'],
                'previous_new' => $previous['new'],
                'previous_returning' => $previous['returning'],
                'change_new' => DateRangeFilterService::calculateChange($current['new'], $previous['new']),
                'change_returning' => DateRangeFilterService::calculateChange($current['returning'], $previous['returning']),
            ];
        });
    }

    private function calculateCustomerMetrics(Carbon $start, Carbon $end): array
    {
        // Get unique customers who ordered in this period
        $customersInPeriod = Commande::whereBetween('created_at', [$start, $end])
            ->whereNotIn('etat', ['annuler'])
            ->distinct('user_id')
            ->pluck('user_id')
            ->filter(); // Remove nulls

        $newCustomers = 0;
        $returningCustomers = 0;

        foreach ($customersInPeriod as $userId) {
            // Check if customer had orders before this period
            $hadPreviousOrders = Commande::where('user_id', $userId)
                ->where('created_at', '<', $start)
                ->whereNotIn('etat', ['annuler'])
                ->exists();

            if ($hadPreviousOrders) {
                $returningCustomers++;
            } else {
                $newCustomers++;
            }
        }

        return ['new' => $newCustomers, 'returning' => $returningCustomers];
    }

    /**
     * Get average fulfillment time (in hours).
     */
    public function getAvgFulfillmentTime(bool $comparison = true): array
    {
        $cacheKey = $this->getCacheKey('avg_fulfillment', $comparison);

        return Cache::remember($cacheKey, 120, function () use ($comparison) {
            $hasDeliveredField = Schema::hasColumn('commandes', 'delivered_at');

            if (! $hasDeliveredField) {
                // Fallback: calculate average time to "expidee" status
                return $this->getAvgTimeToShipped($comparison);
            }

            $current = $this->calculateAvgFulfillmentTime($this->period['start'], $this->period['end']);

            if (! $comparison) {
                return ['current' => $current, 'previous' => 0, 'change' => 0];
            }

            $previous = $this->calculateAvgFulfillmentTime($this->period['prev_start'], $this->period['prev_end']);
            $change = DateRangeFilterService::calculateChange($current, $previous);

            return compact('current', 'previous', 'change');
        });
    }

    private function calculateAvgFulfillmentTime(Carbon $start, Carbon $end): float
    {
        $avg = Commande::whereBetween('created_at', [$start, $end])
            ->whereNotNull('delivered_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, delivered_at)) as avg_hours')
            ->value('avg_hours');

        return $avg ? round($avg, 1) : 0;
    }

    private function getAvgTimeToShipped(bool $comparison): array
    {
        // Fallback: use updated_at for shipped orders as approximation
        $current = Commande::whereBetween('created_at', [$this->period['start'], $this->period['end']])
            ->where('etat', 'expidee')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_hours')
            ->value('avg_hours');

        $current = $current ? round($current, 1) : 0;

        if (! $comparison) {
            return ['current' => $current, 'previous' => 0, 'change' => 0];
        }

        $previous = Commande::whereBetween('created_at', [$this->period['prev_start'], $this->period['prev_end']])
            ->where('etat', 'expidee')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_hours')
            ->value('avg_hours');

        $previous = $previous ? round($previous, 1) : 0;
        $change = DateRangeFilterService::calculateChange($current, $previous);

        return compact('current', 'previous', 'change');
    }

    /**
     * Get daily revenue data for charts.
     */
    public function getDailyRevenue(): array
    {
        $cacheKey = $this->getCacheKey('daily_revenue');

        return Cache::remember($cacheKey, 120, function () {
            $data = Commande::whereBetween('created_at', [$this->period['start'], $this->period['end']])
                ->whereNotIn('etat', ['annuler'])
                ->selectRaw('DATE(created_at) as date, SUM(prix_ttc) as total')
                ->groupBy('date')
                ->orderBy('date')
                ->get()
                ->keyBy('date');

            // Fill gaps
            $result = [];
            $current = $this->period['start']->copy();
            while ($current->lte($this->period['end'])) {
                $key = $current->format('Y-m-d');
                $result[$key] = $data[$key]->total ?? 0;
                $current->addDay();
            }

            return $result;
        });
    }

    /**
     * Get top products by revenue.
     */
    public function getTopProducts(int $limit = 10): array
    {
        $cacheKey = $this->getCacheKey("top_products_{$limit}");

        return Cache::remember($cacheKey, 300, function () use ($limit) {
            return DB::table('commande_details')
                ->join('commandes', 'commande_details.commande_id', '=', 'commandes.id')
                ->join('products', 'commande_details.produit_id', '=', 'products.id')
                ->whereBetween('commandes.created_at', [$this->period['start'], $this->period['end']])
                ->whereNotIn('commandes.etat', ['annuler'])
                ->select(
                    'products.id',
                    'products.designation_fr as name',
                    DB::raw('SUM(commande_details.qte) as total_quantity'),
                    DB::raw('SUM(commande_details.qte * commande_details.prix_unitaire) as total_revenue')
                )
                ->groupBy('products.id', 'products.designation_fr')
                ->orderByDesc('total_revenue')
                ->limit($limit)
                ->get()
                ->toArray();
        });
    }

    /**
     * Get low stock products.
     */
    public function getLowStockProducts(int $threshold = 10): array
    {
        $cacheKey = "dashboard:low_stock_{$threshold}";

        return Cache::remember($cacheKey, 300, function () use ($threshold) {
            return Product::where('qte', '<', $threshold)
                ->where('qte', '>', 0)
                ->where('publier', 1)
                ->orderBy('qte')
                ->limit(20)
                ->get()
                ->toArray();
        });
    }

    /**
     * Get delayed orders.
     */
    public function getDelayedOrders(): array
    {
        $cacheKey = 'dashboard:delayed_orders';

        return Cache::remember($cacheKey, 60, function () {
            $now = Carbon::now();

            return Commande::where(function ($query) use ($now) {
                // Orders in preparation > 24 hours
                $query->where('etat', 'en_cours_de_preparation')
                    ->where('created_at', '<', $now->copy()->subHours(24));
            })
                ->orWhere(function ($query) use ($now) {
                    // Orders ready > 48 hours
                    $query->where('etat', 'prete')
                        ->where('created_at', '<', $now->copy()->subHours(48));
                })
                ->orderBy('created_at')
                ->limit(20)
                ->get()
                ->toArray();
        });
    }

    /**
     * Detect revenue anomaly.
     */
    public function detectRevenueAnomaly(): ?array
    {
        $sevenDaysAgo = Carbon::now()->subDays(7);
        $avgRevenue = $this->calculateGMV($sevenDaysAgo, Carbon::now()) / 7;

        $today = Carbon::now()->startOfDay();
        $todayRevenue = $this->calculateGMV($today, Carbon::now());

        if ($todayRevenue < ($avgRevenue * 0.6)) {
            return [
                'severity' => 'critical',
                'message' => "Revenue aujourd'hui est 40% sous la moyenne (7j)",
                'current' => $todayRevenue,
                'expected' => $avgRevenue,
            ];
        }

        return null;
    }

    /**
     * Generate cache key.
     */
    private function getCacheKey(string $metric, bool $comparison = false): string
    {
        $start = $this->period['start']->format('Ymd');
        $end = $this->period['end']->format('Ymd');
        $comp = $comparison ? '_comp' : '';

        return "dashboard:v1:{$metric}:{$start}_{$end}{$comp}";
    }
}
