<?php

namespace App\Services;

use App\Models\Facture;
use App\Models\FactureTva;
use App\Models\Ticket;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Revenue (Chiffre d'affaires) calculation — Policy 1: no double counting.
 *
 * - Boutique: Ticket (type = ticket_caisse) only.
 * - Delivery: Bon de livraison (factures) only.
 * - Commande does NOT contribute.
 * - BL (Ticket type = bon_livraison) does NOT contribute.
 * - Facture TVA linked to a ticket, commande, or BL does NOT contribute (standalone only).
 * - Date filter: created_at.
 */
class RevenueService
{
    /**
     * Revenue HT for the period (main KPI).
     */
    public function revenueHt(Carbon $start, Carbon $end): float
    {
        $tickets = Ticket::where('type', Ticket::TYPE_TICKET_CAISSE)
            ->whereBetween('created_at', [$start, $end])
            ->sum('prix_ht');

        $bls = Facture::whereBetween('created_at', [$start, $end])->sum('prix_ht');

        $standaloneInvoices = $this->queryStandaloneFactureTvas($start, $end)->sum('prix_ht');

        return (float) $tickets + (float) $bls + (float) $standaloneInvoices;
    }

    /**
     * Revenue TTC for the period (secondary).
     */
    public function revenueTtc(Carbon $start, Carbon $end): float
    {
        $tickets = Ticket::where('type', Ticket::TYPE_TICKET_CAISSE)
            ->whereBetween('created_at', [$start, $end])
            ->sum('prix_ttc');

        $bls = Facture::whereBetween('created_at', [$start, $end])->sum('prix_ttc');

        $standaloneInvoices = $this->queryStandaloneFactureTvas($start, $end)->sum('prix_ttc');

        return (float) $tickets + (float) $bls + (float) $standaloneInvoices;
    }

    /**
     * Revenue HT split by source for charts/pies.
     *
     * @return array{tickets: float, bls: float, facture_tvas: float}
     */
    public function revenueSourcesHt(Carbon $start, Carbon $end): array
    {
        return [
            'tickets' => (float) Ticket::where('type', Ticket::TYPE_TICKET_CAISSE)
                ->whereBetween('created_at', [$start, $end])
                ->sum('prix_ht'),
            'bls' => (float) Facture::whereBetween('created_at', [$start, $end])
                ->sum('prix_ht'),
            'facture_tvas' => (float) $this->queryStandaloneFactureTvas($start, $end)->sum('prix_ht'),
        ];
    }

    /**
     * Revenue today (HT) — for dashboard "today" stat.
     */
    public function revenueHtToday(): float
    {
        $start = Carbon::today()->startOfDay();
        $end = Carbon::now();

        return $this->revenueHt($start, $end);
    }

    /**
     * Revenue today (TTC).
     */
    public function revenueTtcToday(): float
    {
        $start = Carbon::today()->startOfDay();
        $end = Carbon::now();

        return $this->revenueTtc($start, $end);
    }

    /**
     * Daily totals for chart: returns [ 'Y-m-d' => total_ht ] for last N days.
     * Uses HT as primary; optional TTC via second array.
     */
    public function dailyRevenueHt(Carbon $startDate, int $days = 30): array
    {
        $end = Carbon::now()->endOfDay();
        $start = $startDate->copy()->startOfDay();

        $tickets = DB::table('tickets')
            ->where('type', Ticket::TYPE_TICKET_CAISSE)
            ->whereBetween('created_at', [$start, $end])
            ->select(DB::raw('DATE(created_at) as day'), DB::raw('COALESCE(SUM(prix_ht), 0) as total'))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->pluck('total', 'day')
            ->toArray();

        $bls = DB::table('factures')
            ->whereBetween('created_at', [$start, $end])
            ->select(DB::raw('DATE(created_at) as day'), DB::raw('COALESCE(SUM(prix_ht), 0) as total'))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->pluck('total', 'day')
            ->toArray();

        $invoicesQuery = DB::table('facture_tvas')->whereBetween('created_at', [$start, $end]);
        $this->applyStandaloneFactureTvasConditions($invoicesQuery);
        $invoices = $invoicesQuery
            ->select(DB::raw('DATE(created_at) as day'), DB::raw('COALESCE(SUM(prix_ht), 0) as total'))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->pluck('total', 'day')
            ->toArray();

        $result = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $day = Carbon::now()->subDays($i)->format('Y-m-d');
            $result[$day] = round(
                (float) ($tickets[$day] ?? 0) + (float) ($bls[$day] ?? 0) + (float) ($invoices[$day] ?? 0),
                2
            );
        }

        return $result;
    }

    /**
     * Daily totals TTC for chart.
     */
    public function dailyRevenueTtc(Carbon $startDate, int $days = 30): array
    {
        $end = Carbon::now()->endOfDay();
        $start = $startDate->copy()->startOfDay();

        $tickets = DB::table('tickets')
            ->where('type', Ticket::TYPE_TICKET_CAISSE)
            ->whereBetween('created_at', [$start, $end])
            ->select(DB::raw('DATE(created_at) as day'), DB::raw('COALESCE(SUM(prix_ttc), 0) as total'))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->pluck('total', 'day')
            ->toArray();

        $bls = DB::table('factures')
            ->whereBetween('created_at', [$start, $end])
            ->select(DB::raw('DATE(created_at) as day'), DB::raw('COALESCE(SUM(prix_ttc), 0) as total'))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->pluck('total', 'day')
            ->toArray();

        $invoicesQuery = DB::table('facture_tvas')->whereBetween('created_at', [$start, $end]);
        $this->applyStandaloneFactureTvasConditions($invoicesQuery);
        $invoices = $invoicesQuery
            ->select(DB::raw('DATE(created_at) as day'), DB::raw('COALESCE(SUM(prix_ttc), 0) as total'))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->pluck('total', 'day')
            ->toArray();

        $result = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $day = Carbon::now()->subDays($i)->format('Y-m-d');
            $result[$day] = round(
                (float) ($tickets[$day] ?? 0) + (float) ($bls[$day] ?? 0) + (float) ($invoices[$day] ?? 0),
                2
            );
        }

        return $result;
    }

    /**
     * Query FactureTva for standalone only (no ticket/commande/BL link).
     * When link columns are missing, includes all facture_tvas.
     */
    private function queryStandaloneFactureTvas(Carbon $start, Carbon $end)
    {
        $query = FactureTva::whereBetween('created_at', [$start, $end]);
        if (Schema::hasColumn('facture_tvas', 'source_ticket_id')) {
            $query->whereNull('source_ticket_id');
        }
        if (Schema::hasColumn('facture_tvas', 'commande_id')) {
            $query->whereNull('commande_id');
        }
        if (Schema::hasColumn('facture_tvas', 'facture_id')) {
            $query->whereNull('facture_id');
        }
        return $query;
    }

    /**
     * Apply standalone-only conditions to a query builder (table or eloquent).
     * Safe when columns do not exist (e.g. migration not run on production).
     */
    private function applyStandaloneFactureTvasConditions($query): void
    {
        if (Schema::hasColumn('facture_tvas', 'source_ticket_id')) {
            $query->whereNull('source_ticket_id');
        }
        if (Schema::hasColumn('facture_tvas', 'commande_id')) {
            $query->whereNull('commande_id');
        }
        if (Schema::hasColumn('facture_tvas', 'facture_id')) {
            $query->whereNull('facture_id');
        }
    }
}
