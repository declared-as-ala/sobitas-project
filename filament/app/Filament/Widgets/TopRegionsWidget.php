<?php

namespace App\Filament\Widgets;

use App\Services\DateRangeFilterService;
use Carbon\Carbon;
use Filament\Widgets\Widget;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Livewire\Attributes\On;

class TopRegionsWidget extends Widget
{
    protected static string $view = 'filament.widgets.top-regions-widget';

    protected static ?int $sort = 9;

    protected static bool $isLazy = true;

    protected int | string | array $columnSpan = 'full';

    protected ?string $pollingInterval = null;

    #[On('dashboardFilterUpdated')]
    public function refresh(): void {}

    private function getCurrentPeriod(): array
    {
        $preset      = session('dashboard.filter.preset', '30d');
        $customStart = session('dashboard.filter.custom_start')
            ? Carbon::parse(session('dashboard.filter.custom_start')) : null;
        $customEnd   = session('dashboard.filter.custom_end')
            ? Carbon::parse(session('dashboard.filter.custom_end')) : null;

        return DateRangeFilterService::getPeriod($preset, $customStart, $customEnd);
    }

    public function getTopRegions(): array
    {
        $period   = $this->getCurrentPeriod();
        $cacheKey = "dashboard:top_regions:{$period['start']->format('Ymd')}_{$period['end']->format('Ymd')}";

        return Cache::remember($cacheKey, 180, function () use ($period) {
            $rows = DB::select("
                SELECT
                    COALESCE(NULLIF(TRIM(region), ''), 'Non renseignée') AS region,
                    COUNT(*)                                              AS total_commandes,
                    SUM(prix_ht)                                         AS total_ht,
                    SUM(prix_ttc)                                        AS total_ttc,
                    COUNT(DISTINCT COALESCE(client_id, phone))           AS total_clients
                FROM commandes
                WHERE created_at BETWEEN ? AND ?
                GROUP BY region
                ORDER BY total_commandes DESC
                LIMIT 8
            ", [$period['start'], $period['end']]);

            $maxOrders = collect($rows)->max('total_commandes') ?: 1;

            return collect($rows)->map(fn ($r) => [
                'region'          => $r->region,
                'total_commandes' => (int) $r->total_commandes,
                'total_ht'        => round((float) $r->total_ht, 3),
                'total_ttc'       => round((float) $r->total_ttc, 3),
                'total_clients'   => (int) $r->total_clients,
                'pct'             => round(($r->total_commandes / $maxOrders) * 100),
            ])->toArray();
        });
    }

    public function getTopClients(): array
    {
        $period   = $this->getCurrentPeriod();
        $cacheKey = "dashboard:top_clients_region:{$period['start']->format('Ymd')}_{$period['end']->format('Ymd')}";

        return Cache::remember($cacheKey, 180, function () use ($period) {
            $rows = DB::select("
                SELECT
                    c.id,
                    c.name,
                    c.email,
                    c.phone_1,
                    COALESCE(NULLIF(TRIM(c.region), ''), 'N/A') AS region,
                    COUNT(co.id)      AS total_commandes,
                    SUM(co.prix_ht)   AS total_ht,
                    SUM(co.prix_ttc)  AS total_ttc,
                    MAX(co.created_at) AS last_order
                FROM clients c
                INNER JOIN commandes co ON co.client_id = c.id
                WHERE co.created_at BETWEEN ? AND ?
                GROUP BY c.id, c.name, c.email, c.phone_1, c.region
                ORDER BY total_ttc DESC
                LIMIT 8
            ", [$period['start'], $period['end']]);

            return collect($rows)->map(fn ($r) => [
                'id'               => $r->id,
                'name'             => $r->name ?: 'Anonyme',
                'email'            => $r->email,
                'phone'            => $r->phone_1,
                'region'           => $r->region,
                'total_commandes'  => (int) $r->total_commandes,
                'total_ht'         => round((float) $r->total_ht, 3),
                'total_ttc'        => round((float) $r->total_ttc, 3),
                'last_order'       => $r->last_order
                    ? Carbon::parse($r->last_order)->diffForHumans()
                    : '—',
                'initials'         => strtoupper(
                    collect(explode(' ', trim($r->name ?: 'A')))->map(fn ($w) => $w[0] ?? '')->take(2)->implode('')
                ),
            ])->toArray();
        });
    }

    public function getPeriodLabel(): string
    {
        $period = $this->getCurrentPeriod();
        return $period['label'] ?? 'Période';
    }
}
