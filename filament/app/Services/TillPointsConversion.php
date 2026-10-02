<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * The shop-till card moves from 10 pts = 1 DT to 20 pts = 1 DT (the online Protinas scale). Every
 * card balance is DOUBLED once so its value in dinars does not change.
 *
 * Shared by the migration 2026_09_29_000300 (deploy) and `protinas:till-convert` (re-run from
 * vps-run). Idempotent: a client that already carries the MARKER row is skipped.
 *
 * The production ledger is a LEGACY table: balance_after, processed_by and monetary_value may be
 * missing (LoyaltyService checks every one of them). A column is written only when it exists; an
 * unconditional balance_after made every insert fail on the legacy table while the new rate went
 * live on balances that were never doubled.
 *
 * Balance ≠ ledger: the STORED balance wins. It is what the till lets the customer spend and what
 * the card slip shows; one card on 29/09/2026 was 279 pts below its ledger (a hand edit). The client
 * keeps exactly the value they could spend, doubled, and ONE adjustment row brings the ledger there.
 */
class TillPointsConversion
{
    public const MARKER = 'Conversion barème 20 pts = 1 DT (valeur inchangée)';

    private static function tablesPresent(): bool
    {
        return Schema::hasTable('clients') && Schema::hasColumn('clients', 'loyalty_points_balance')
            && Schema::hasTable('loyalty_point_transactions');
    }

    /**
     * @return array{status: string, converted: int, already_converted: int, nothing_to_convert: int, failed: int, failed_client_ids: list<int>}
     */
    public function run(bool $dryRun = false): array
    {
        $result = ['status' => 'ok', 'converted' => 0, 'already_converted' => 0, 'nothing_to_convert' => 0,
            'failed' => 0, 'failed_client_ids' => []];
        if (! self::tablesPresent()) {
            $result['status'] = 'no_till_tables';

            return $result;
        }
        if ((int) config('loyalty.till.points_per_dt', 20) !== 20) {
            Log::warning('till points conversion skipped: loyalty.till.points_per_dt is not 20');
            $result['status'] = 'rate_not_20';

            return $result;
        }

        $columns = [];
        foreach (['balance_after', 'monetary_value', 'created_at', 'updated_at'] as $column) {
            $columns[$column] = Schema::hasColumn('loyalty_point_transactions', $column);
        }

        $clientIds = DB::table('clients')
            ->where('loyalty_points_balance', '>', 0)
            ->orWhereIn('id', DB::table('loyalty_point_transactions')->select('client_id'))
            ->orderBy('id')
            ->pluck('id');

        foreach ($clientIds as $clientId) {
            try {
                $outcome = $dryRun
                    ? $this->convertClient((int) $clientId, $columns, true)
                    : DB::transaction(fn () => $this->convertClient((int) $clientId, $columns, false));
                $result[$outcome]++;
            } catch (\Throwable $e) {
                // One odd row must not stop the others; it is counted, logged and can be re-run.
                $result['failed']++;
                $result['failed_client_ids'][] = (int) $clientId;
                Log::error('till points conversion failed for one client', ['client_id' => $clientId, 'error' => $e->getMessage()]);
            }
        }

        return $result;
    }

    /**
     * @param  array<string, bool>  $columns
     * @return 'converted'|'already_converted'|'nothing_to_convert'
     */
    private function convertClient(int $clientId, array $columns, bool $dryRun): string
    {
        $query = DB::table('clients')->where('id', $clientId);
        $locked = $dryRun ? $query->first() : $query->lockForUpdate()->first();
        if (! $locked) {
            return 'nothing_to_convert';
        }
        if (DB::table('loyalty_point_transactions')->where('client_id', $clientId)
            ->where('description', self::MARKER)->exists()) {
            return 'already_converted';
        }
        $stored = max(0, (int) $locked->loyalty_points_balance);
        $ledger = (int) DB::table('loyalty_point_transactions')->where('client_id', $clientId)->sum('points');
        if ($stored === 0 && $ledger <= 0) {
            return 'nothing_to_convert';
        }
        if ($dryRun) {
            return 'converted';
        }
        if ($stored !== max(0, $ledger)) {
            Log::warning('till points conversion: balance differs from ledger, stored balance kept', [
                'client_id' => $clientId, 'stored' => $stored, 'ledger' => $ledger,
            ]);
        }
        $target = 2 * $stored;
        $row = [
            'client_id' => $clientId,
            'type' => 'adjustment',
            'points' => $target - $ledger,
            'description' => self::MARKER,
        ];
        if ($columns['balance_after']) {
            $row['balance_after'] = $target;
        }
        if ($columns['monetary_value']) {
            // Magnitude, like the till's redeem rows (the column may be unsigned).
            $row['monetary_value'] = number_format(abs($target - $ledger) / 20, 3, '.', '');
        }
        if ($columns['created_at']) {
            $row['created_at'] = now();
        }
        if ($columns['updated_at']) {
            $row['updated_at'] = now();
        }
        // processed_by / created_by are deliberately not written: a system conversion has no
        // operator, and leaving them out lets a legacy default apply.
        DB::table('loyalty_point_transactions')->insert($row);
        DB::table('clients')->where('id', $clientId)->update(['loyalty_points_balance' => $target]);

        return 'converted';
    }

    /**
     * Cards still holding a balance with no conversion row while the till runs at 20 pts = 1 DT:
     * their points are worth half what they were. Cards whose whole ledger starts after the first
     * conversion row never needed converting and are not listed.
     *
     * @return list<int>
     */
    public static function unconvertedClientIds(int $limit = 50): array
    {
        if (! self::tablesPresent() || LoyaltyService::pointsPerDt() !== 20) {
            return [];
        }
        $firstMarkerAt = Schema::hasColumn('loyalty_point_transactions', 'created_at')
            ? DB::table('loyalty_point_transactions')->where('description', self::MARKER)->min('created_at')
            : null;

        return DB::table('clients as c')
            ->where('c.loyalty_points_balance', '>', 0)
            ->whereNotExists(fn ($q) => $q->select(DB::raw(1))->from('loyalty_point_transactions as m')
                ->whereColumn('m.client_id', 'c.id')->where('m.description', self::MARKER))
            ->when($firstMarkerAt !== null, fn ($q) => $q->where(fn ($w) => $w
                ->whereExists(fn ($e) => $e->select(DB::raw(1))->from('loyalty_point_transactions as t')
                    ->whereColumn('t.client_id', 'c.id')->where('t.created_at', '<', $firstMarkerAt))
                ->orWhereNotExists(fn ($e) => $e->select(DB::raw(1))->from('loyalty_point_transactions as t2')
                    ->whereColumn('t2.client_id', 'c.id'))))
            ->orderBy('c.id')
            ->limit($limit)
            ->pluck('c.id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }
}
