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
        $rate = PointsService::pointsPerDt();
        $dt = fn ($p) => number_format(((int) $p) / $rate, 2, ',', ' ').' DT';
        $hasReview = Schema::hasColumn('user_point_transactions', 'review_id');

        $this->info(sprintf('Rules: earn %d pt/DT · %d pts = 1 DT · redeem cap %d%% of goods HT · welcome bonus %d pts',
            PointsService::earnRate(), $rate, (int) config('loyalty.checkout.max_total_discount_percent', 10),
            \App\Services\PhoneVerificationService::bonusPoints()));

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
                $claims, $dt($claims * \App\Services\PhoneVerificationService::bonusPoints()), $claimsNoOrder, $spent));
            if (Schema::hasColumn('welcome_bonus_claims', 'credited_at')) {
                $this->line(sprintf('   pending: %d · unlocked: %d',
                    DB::table('welcome_bonus_claims')->whereNull('credited_at')->count(),
                    DB::table('welcome_bonus_claims')->whereNotNull('credited_at')->count()));
            }
        }

        // ── 5. Online orders whose TOTAL discount was large (points + coupon + pack stacked) ───
        $this->line('');
        $big = DB::table('commandes')->where('created_at', '>=', now()->subDays(90))
            ->whereRaw('(COALESCE(remise,0) + COALESCE(discount_ht,0)) >= 20')
            ->orderByDesc('created_at')->limit($top)
            ->get(['id', 'numero', 'created_at', 'etat', 'user_id', 'prix_ht', 'prix_ttc', 'remise', 'discount_ht', 'coupon_code_snapshot']);
        $this->info(sprintf('5) Online orders with ≥ 20 DT total discount, last 90 days: %d shown', $big->count()));
        $this->table(['order', 'date', 'état', 'user', 'HT', 'TTC', 'remise (pack+pts)', 'coupon HT', 'coupon', 'points DT'],
            $big->map(function ($c) use ($rate) {
                $pts = (int) DB::table('user_point_transactions')->where('commande_id', $c->id)->where('type', 'redeem')->sum('points');

                return [$c->numero ?? $c->id, substr((string) $c->created_at, 0, 10), $c->etat, $c->user_id ? '#'.$c->user_id : 'invité',
                    $c->prix_ht, $c->prix_ttc, $c->remise, $c->discount_ht, $c->coupon_code_snapshot ? 'oui' : '', number_format(abs($pts) / $rate, 2)];
            })->all());

        // ── 6. The SHOP TILL card (clients.loyalty_points_balance) — a separate programme ───────
        if (Schema::hasTable('loyalty_point_transactions') && Schema::hasColumn('clients', 'loyalty_points_balance')) {
            $svc = \App\Services\LoyaltyService::class;
            $storeRate = $svc::pointsPerDt();
            $sdt = fn ($p) => number_format(((int) $p) / $storeRate, 2, ',', ' ').' DT';
            $this->line('');
            $this->info(sprintf('6) Shop-till card: earn %d pt/DT · %d pts = 1 DT (= %d%% back) · min %d pts · cap = %d%%',
                $svc::earnRate(), $storeRate, (int) round(100 * $svc::earnRate() / $storeRate),
                $svc::minRedeemPoints(), (int) config('loyalty.till.max_total_discount_percent', 10)));
            $types = DB::table('loyalty_point_transactions')
                ->selectRaw('type, COUNT(*) n, COUNT(DISTINCT client_id) clients, SUM(points) pts')->groupBy('type')->get();
            $this->table(['type', 'rows', 'clients', 'points', 'value'],
                $types->map(fn ($r) => [$r->type, $r->n, $r->clients, $r->pts, $sdt($r->pts)])->all());
            $owed = (int) DB::table('clients')->where('loyalty_points_balance', '>', 0)->sum('loyalty_points_balance');
            $holders = DB::table('clients')->where('loyalty_points_balance', '>', 0)->count();
            $this->line(sprintf('   outstanding: %d clients hold %d pts = %s', $holders, $owed, $sdt($owed)));
            $sdrift = DB::table('clients as c')
                ->leftJoinSub(DB::table('loyalty_point_transactions')->selectRaw('client_id, SUM(points) s')->groupBy('client_id'), 't', 't.client_id', '=', 'c.id')
                ->whereRaw('COALESCE(c.loyalty_points_balance,0) <> GREATEST(COALESCE(t.s,0),0)')
                ->selectRaw('COUNT(*) n, SUM(COALESCE(c.loyalty_points_balance,0) - GREATEST(COALESCE(t.s,0),0)) extra')->first();
            $this->line(sprintf('   balance ≠ ledger (typed by hand or legacy import): %d clients, %+d pts = %s not backed by any transaction',
                (int) ($sdrift->n ?? 0), (int) ($sdrift->extra ?? 0), $sdt((int) ($sdrift->extra ?? 0))));
            if ($storeRate === 20) {
                // The 20 pts = 1 DT scale is live: a card that was never doubled lost half its value.
                $unconverted = \App\Services\TillPointsConversion::unconvertedClientIds($top);
                if ($unconverted === []) {
                    $this->line('   conversion to 20 pts = 1 DT: every card holding points was doubled');
                } else {
                    $this->warn(sprintf('   NOT converted to 20 pts = 1 DT (balance held, no conversion row): %s — run vps-run till-points-convert-apply',
                        implode(', ', array_map(fn ($id) => '#'.$id, $unconverted))));
                }
            }

            $hasMoney = Schema::hasColumn('loyalty_point_transactions', 'monetary_value');
            $red = DB::table('loyalty_point_transactions as t')
                ->where('t.type', 'redeem')->where('t.created_at', '>=', now()->subDays($days))
                ->orderByDesc(DB::raw('ABS(t.points)'))->limit($top)
                ->get(['t.client_id', 't.ticket_id', 't.points', 't.created_at']);
            $tCols = collect(['numero', 'prix_ht', 'prix_ttc', 'remise', 'loyalty_discount_dt', 'loyalty_old_balance_points'])
                ->filter(fn ($c) => Schema::hasColumn('tickets', $c))->values()->all();
            $this->info(sprintf('   till redemptions, last %d days (largest first)', $days));
            $this->table(['client', 'date', 'ticket', 'points', 'DT', 'ticket TTC', '% of ticket', 'earned before', 'hand-typed before'],
                $red->map(function ($r) use ($sdt, $storeRate, $tCols) {
                    $t = $r->ticket_id && $tCols ? DB::table('tickets')->where('id', $r->ticket_id)->first($tCols) : null;
                    $ttc = (float) ($t->prix_ttc ?? 0);
                    $dtv = abs($r->points) / $storeRate;
                    $earned = (int) DB::table('loyalty_point_transactions')->where('client_id', $r->client_id)
                        ->where('type', 'earn')->where('created_at', '<', $r->created_at)->sum('points');
                    $adj = (int) DB::table('loyalty_point_transactions')->where('client_id', $r->client_id)
                        ->where('type', 'adjustment')->where('points', '>', 0)->where('created_at', '<', $r->created_at)->sum('points');

                    return ['#'.$r->client_id, substr((string) $r->created_at, 0, 10), $t->numero ?? $r->ticket_id, abs($r->points),
                        number_format($dtv, 2, ',', ' '), $ttc ?: '—', $ttc > 0 ? round($dtv / ($ttc + $dtv) * 100).'%' : '—', $earned, $adj];
                })->all());
        }

        $this->line('');
        if (Schema::hasColumn('commandes', 'delivered_at')) {
            foreach ([30, 90] as $period) {
                $this->info(sprintf('Orders reaching delivered status in last %d days: %d', $period,
                    DB::table('commandes')->whereNotNull('delivered_at')
                        ->where('delivered_at', '>=', now()->subDays($period))->count()));
            }
        }
        $orders = DB::table('commandes')->where('created_at', '>=', now()->subDays(90))
            ->where('prix_ht', '>', 0)->get(['prix_ht', 'remise', 'discount_ht']);
        $cap = (float) config('loyalty.checkout.max_total_discount_percent', 10);
        $average = $orders->avg(fn ($o) => 100 * ((float) $o->remise + (float) $o->discount_ht) / (float) $o->prix_ht);
        $bound = $orders->filter(fn ($o) => 100 * ((float) $o->remise + (float) $o->discount_ht)
            >= $cap * (float) $o->prix_ht - 0.1)->count();
        $this->info(sprintf('Last 90 days: average discount %.2f%% of goods · ceiling bound %d/%d orders (%.2f%%)',
            $average ?? 0, $bound, $orders->count(), $orders->count() ? 100 * $bound / $orders->count() : 0));
        if (Schema::hasTable('coupons')) {
            $warn = (float) config('loyalty.coupons.warn_above_percent', 10);
            $coupons = DB::table('coupons')->where('is_active', true)
                ->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
                ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', now()))
                ->get(['code', 'type', 'value', 'min_order_amount'])
                ->filter(fn ($c) => ($c->type === 'percent' && (float) $c->value > $warn)
                    || ($c->type === 'fixed' && (float) $c->value > (float) $c->min_order_amount * $warn / 100));
            $this->info('Active coupons above '.$warn.'%: '.$coupons->count());
            $this->table(['code', 'type', 'value', 'minimum goods'],
                $coupons->map(fn ($c) => [$c->code, $c->type, $c->value, $c->min_order_amount])->all());
        }
        $this->comment('Read-only: nothing was written.');

        return self::SUCCESS;
    }
}
