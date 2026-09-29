<?php

namespace App\Console\Commands;

use App\Services\PointsService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * READ-ONLY picture of what the Protina (loyalty points) programme costs.
 *
 * Written 29/09/2026 after the owner saw one customer take 45 DT off a single product with
 * points. The rules allowed it — points could cover 50 % of the goods — but nobody could say
 * where that customer's 900 points came from, how many other balances could do the same, or
 * what the whole programme owes. This answers those three questions without writing a row.
 *
 *   php artisan protinas:audit [--days=120] [--top=15]
 *
 * Identities are masked (user #id only, no name/phone/email): the output lands in a CI log.
 */
class ProtinasAudit extends Command
{
    protected $signature = 'protinas:audit {--days=120 : Redemptions window} {--top=15 : Rows per list}';

    protected $description = 'Read-only audit of Protina points: sources, balances, liability, redemptions';

    public function handle(): int
    {
        if (! Schema::hasTable('user_point_transactions')) {
            $this->error('user_point_transactions is missing.');

            return self::FAILURE;
        }
        $days = max(1, (int) $this->option('days'));
        $top = max(1, (int) $this->option('top'));
        $rate = PointsService::REDEEM_POINTS_PER_DT;
        $dt = fn ($p) => number_format(((int) $p) / $rate, 2, ',', ' ').' DT';
        $hasReview = Schema::hasColumn('user_point_transactions', 'review_id');

        $this->info(sprintf('Rules: earn %d pt/DT · %d pts = 1 DT · redeem cap %d%% of goods HT · welcome bonus %d pts',
            PointsService::EARN_RATE, $rate, (int) round(PointsService::MAX_REDEEM_FRACTION * 100),
            \App\Services\PhoneVerificationService::BONUS_POINTS));

        // ── 1. Where every credited point came from ──────────────────────────────────────────
        $source = "CASE
            WHEN type = 'redeem' THEN 'redeem'
            WHEN description LIKE 'Cadeau de bienvenue%' THEN 'welcome'
            ".($hasReview ? "WHEN review_id IS NOT NULL AND points > 0 THEN 'review'
            WHEN review_id IS NOT NULL AND points < 0 THEN 'review-reversal'" : '')."
            WHEN type = 'earn' AND commande_id IS NOT NULL THEN 'order-earn'
            WHEN type = 'adjustment' AND commande_id IS NOT NULL AND points > 0 THEN 'order-refund'
            WHEN type = 'adjustment' AND commande_id IS NOT NULL AND points < 0 THEN 'order-clawback'
            WHEN points > 0 THEN 'other-credit'
            ELSE 'other-debit' END";
        $bySource = DB::table('user_point_transactions')
            ->selectRaw("$source as src, COUNT(*) as n, COUNT(DISTINCT user_id) as users, SUM(points) as pts")
            ->groupBy('src')->orderByDesc(DB::raw('ABS(SUM(points))'))->get();
        $this->line('');
        $this->info('1) Ledger by source (all time)');
        $this->table(['source', 'rows', 'users', 'points', 'value'],
            $bySource->map(fn ($r) => [$r->src, $r->n, $r->users, $r->pts, $dt($r->pts)])->all());

        $otherCredits = DB::table('user_point_transactions')
            ->selectRaw('description, COUNT(*) n, SUM(points) pts')
            ->where('points', '>', 0)->where('type', '<>', 'redeem')
            ->whereNull('commande_id')
            ->where('description', 'not like', 'Cadeau de bienvenue%')
            ->when($hasReview, fn ($q) => $q->whereNull('review_id'))
            ->groupBy('description')->orderByDesc('pts')->limit($top)->get();
        if ($otherCredits->isNotEmpty()) {
            $this->info('   other-credit descriptions');
            $this->table(['description', 'rows', 'points'],
                $otherCredits->map(fn ($r) => [mb_strimwidth((string) $r->description, 0, 70, '…'), $r->n, $r->pts])->all());
        }

        // ── 2. What is owed right now ─────────────────────────────────────────────────────────
        $bal = DB::table('users')->where('points_balance', '>', 0);
        $holders = (clone $bal)->count();
        $total = (int) (clone $bal)->sum('points_balance');
        $this->line('');
        $this->info(sprintf('2) Outstanding balances: %d customers hold %d pts = %s', $holders, $total, $dt($total)));
        $bands = [[1, 299], [300, 599], [600, 899], [900, 1999], [2000, PHP_INT_MAX]];
        $rows = [];
        foreach ($bands as [$lo, $hi]) {
            $q = DB::table('users')->whereBetween('points_balance', [$lo, $hi]);
            $rows[] = [$lo.'–'.($hi === PHP_INT_MAX ? '∞' : $hi).' pts', $q->count(), $dt((clone $q)->sum('points_balance'))];
        }
        $this->table(['balance band', 'customers', 'value'], $rows);

        $drift = DB::table('users as u')
            ->joinSub(DB::table('user_point_transactions')->selectRaw('user_id, SUM(points) s')->groupBy('user_id'), 't', 't.user_id', '=', 'u.id')
            ->whereRaw('u.points_balance <> GREATEST(t.s, 0)')->count();
        $noLedger = DB::table('users')->where('points_balance', '>', 0)
            ->whereNotExists(fn ($q) => $q->select(DB::raw(1))->from('user_point_transactions as t')->whereColumn('t.user_id', 'users.id'))->count();
        $this->line(sprintf('   balance ≠ ledger sum: %d customers · balance with NO ledger row: %d', $drift, $noLedger));

        // ── 3. Every redemption in the window, with how the balance was built ────────────────
        $since = now()->subDays($days);
        $redemptions = DB::table('user_point_transactions as t')
            ->leftJoin('commandes as c', 'c.id', '=', 't.commande_id')
            ->where('t.type', 'redeem')->where('t.created_at', '>=', $since)
            ->orderByDesc(DB::raw('ABS(t.points)'))->limit($top)
            ->get(['t.user_id', 't.points', 't.created_at', 'c.id as cid', 'c.numero', 'c.prix_ht', 'c.prix_ttc', 'c.remise', 'c.etat', 'c.coupon_code_snapshot']);
        $count = DB::table('user_point_transactions')->where('type', 'redeem')->where('created_at', '>=', $since)->count();
        $sum = (int) DB::table('user_point_transactions')->where('type', 'redeem')->where('created_at', '>=', $since)->sum('points');
        $this->line('');
        $this->info(sprintf('3) Redemptions, last %d days: %d orders, %s given away', $days, $count, $dt(abs($sum))));
        $rows = [];
        foreach ($redemptions as $r) {
            $mix = DB::table('user_point_transactions')->where('user_id', $r->user_id)
                ->where('created_at', '<=', $r->created_at)->where('points', '>', 0)
                ->selectRaw("$source as src, SUM(points) pts")->groupBy('src')->pluck('pts', 'src');
            $delivered = DB::table('commandes')->where('user_id', $r->user_id)
                ->whereIn('etat', PointsService::DELIVERED_STATUSES)->count();
            $goods = (float) $r->prix_ht + (float) ($r->remise ?? 0);
            $rows[] = [
                '#'.$r->user_id,
                substr((string) $r->created_at, 0, 10),
                $r->numero ?? $r->cid,
                (string) $r->etat,
                abs($r->points).' = '.$dt(abs($r->points)),
                $goods > 0 ? round(abs($r->points) / $rate / $goods * 100).'%' : '—',
                $r->coupon_code_snapshot ? 'oui' : '',
                $delivered,
                collect($mix)->map(fn ($p, $s) => "$s $p")->implode(', '),
            ];
        }
        $this->table(['user', 'date', 'order', 'état', 'points', '% goods', 'coupon', 'delivered orders', 'credits before (by source)'], $rows);

        // ── 4. Welcome-bonus exposure ─────────────────────────────────────────────────────────
        if (Schema::hasTable('welcome_bonus_claims')) {
            $claims = DB::table('welcome_bonus_claims')->count();
            $claimsNoOrder = DB::table('welcome_bonus_claims as w')->whereNotExists(fn ($q) => $q->select(DB::raw(1))
                ->from('commandes as c')->whereColumn('c.user_id', 'w.user_id')->whereIn('c.etat', PointsService::DELIVERED_STATUSES))->count();
            $spent = DB::table('welcome_bonus_claims as w')->whereExists(fn ($q) => $q->select(DB::raw(1))
                ->from('user_point_transactions as t')->whereColumn('t.user_id', 'w.user_id')->where('t.type', 'redeem'))->count();
            $this->line('');
            $this->info(sprintf('4) Welcome bonus: %d claimed (%s) · %d never had a delivered order · %d have redeemed points',
                $claims, $dt($claims * \App\Services\PhoneVerificationService::BONUS_POINTS), $claimsNoOrder, $spent));
        }

        $this->line('');
        $this->comment('Read-only: nothing was written.');

        return self::SUCCESS;
    }
}
