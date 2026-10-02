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

        $v3 = (int) config('loyalty.rules_version', 3) >= 3;
        $hasBucket = Schema::hasColumn('user_point_transactions', 'bucket');
        $hasGift = Schema::hasColumn('users', 'gift_points_balance');
        $hasDebt = Schema::hasColumn('users', 'points_debt');
        if ($v3) {
            $this->info(sprintf('Rules v3: earn %d pt/DT (held %d days) · %d pts = 1 DT · earned up to %d %% of goods%s · gift inside the hidden order budget · welcome %d pts',
                PointsService::earnRate(), (int) config('loyalty.points.earn_hold_days', 14), $rate,
                (int) config('loyalty.points.earned_max_percent', 100), config('loyalty.points.cover_shipping', true) ? ' + delivery' : '',
                \App\Services\PhoneVerificationService::bonusPoints()));
        } else {
            $this->info(sprintf('Rules: earn %d pt/DT · %d pts = 1 DT · redeem cap %d%% of goods HT · welcome bonus %d pts',
                PointsService::earnRate(), $rate, (int) config('loyalty.checkout.max_total_discount_percent', 10),
                \App\Services\PhoneVerificationService::bonusPoints()));
        }

        // ── 0. Cash on delivery: prix_ttc must equal prix_ht − code − (pack + Protinas) + delivery ─
        // (spec F0). An order breaking it makes the courier collect a wrong amount; fix each one
        // (open it in the admin and save it) before creating its delivery note.
        $identity = "ABS(COALESCE(prix_ttc,0) - GREATEST(0, COALESCE(prix_ht,0) - COALESCE(discount_ht,0) - COALESCE(remise,0) + COALESCE(frais_livraison,0))) > 0.01";
        $broken = DB::table('commandes')->whereRaw($identity)
            ->whereNotIn('etat', array_merge(PointsService::CANCELLED_STATUSES, PointsService::DELIVERED_STATUSES))
            ->when(Schema::hasColumn('commandes', 'quotation_id'), fn ($q) => $q->whereNull('quotation_id'))
            ->where(fn ($q) => $q->where('authenticated_user_id', '>', 0)->orWhere('points_redeemed', '>', 0)
                ->orWhere('pack_discount_ht', '>', 0)->orWhere('discount_ht', '>', 0)
                ->when(Schema::hasColumn('commandes', 'affilie_id'), fn ($q) => $q->orWhereNotNull('affilie_id'))
                ->when(Schema::hasColumn('commandes', 'pricing_version'), fn ($q) => $q->orWhereNotNull('pricing_version')));
        $brokenCount = (clone $broken)->count();
        $this->line('');
        $this->{$brokenCount > 0 ? 'error' : 'info'}(sprintf('0) Open orders whose total breaks prix_ttc = prix_ht − code − remise + livraison: %d', $brokenCount));
        if ($brokenCount > 0) {
            $this->table(['order', 'date', 'état', 'HT', 'code', 'remise', 'livraison', 'prix_ttc', 'should be'],
                (clone $broken)->orderByDesc('id')->limit($top)
                    ->get(['id', 'numero', 'created_at', 'etat', 'prix_ht', 'discount_ht', 'remise', 'frais_livraison', 'prix_ttc'])
                    ->map(fn ($c) => [$c->numero ?? $c->id, substr((string) $c->created_at, 0, 10), $c->etat, $c->prix_ht,
                        $c->discount_ht, $c->remise, $c->frais_livraison, $c->prix_ttc,
                        \App\Support\OrderCashOnDelivery::amount((float) $c->prix_ht, (float) $c->discount_ht, (float) $c->remise, (float) $c->frais_livraison)])->all());
        }
        if (Schema::hasTable('factures') && Schema::hasColumn('factures', 'net_a_payer')) {
            $blMismatch = DB::table('factures as f')->join('commandes as c', 'c.id', '=', 'f.commande_id')
                ->whereRaw('ABS(COALESCE(f.net_a_payer,0) - COALESCE(c.prix_ttc,0)) > 0.01')
                ->when(Schema::hasColumn('commandes', 'quotation_id'), fn ($q) => $q->whereNull('c.quotation_id'))
                ->where(fn ($q) => $q->where('c.authenticated_user_id', '>', 0)->orWhere('c.points_redeemed', '>', 0)
                    ->orWhere('c.pack_discount_ht', '>', 0)->orWhere('c.discount_ht', '>', 0))
                ->when(Schema::hasColumn('factures', 'aramex_hawb'), fn ($q) => $q->where(fn ($w) => $w->whereNull('f.aramex_hawb')->orWhere('f.aramex_hawb', '')))
                ->count();
            $this->line(sprintf('   delivery notes not yet at Aramex whose net à payer ≠ the order total: %d (« Envoyer vers Aramex » is disabled on them)', $blMismatch));
        }
        if (Schema::hasColumn('commandes', 'requires_phone_confirmation') && Schema::hasColumn('commandes', 'phone_confirmed_at')) {
            $this->line(sprintf('   orders waiting for their phone confirmation (rule 17): %d',
                DB::table('commandes')->where('requires_phone_confirmation', true)->whereNull('phone_confirmed_at')
                    ->whereNotIn('etat', PointsService::CANCELLED_STATUSES)->count()));
        }

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
        if ($hasBucket) {
            $byBucket = DB::table('user_point_transactions')
                ->selectRaw("COALESCE(bucket, 'NULL (not split)') as b, type, COUNT(*) n, SUM(points) pts")
                ->groupBy('b', 'type')->orderBy('b')->orderBy('type')->get();
            $this->info('   by wallet (bucket) and type');
            $this->table(['bucket', 'type', 'rows', 'points', 'value'],
                $byBucket->map(fn ($r) => [$r->b, $r->type, $r->n, $r->pts, $dt($r->pts)])->all());
        }

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

        // Since v3 the ledger is exact: SUM(points) = points_balance − points_debt (the wallet split wrote
        // one hidden migration:wallets:{uid} row per account whose old 0-floor had drifted).
        $drift = DB::table('users as u')
            ->joinSub(DB::table('user_point_transactions')->selectRaw('user_id, SUM(points) s')->groupBy('user_id'), 't', 't.user_id', '=', 'u.id')
            ->whereRaw($hasDebt ? 'u.points_balance - COALESCE(u.points_debt, 0) <> t.s' : 'u.points_balance <> GREATEST(t.s, 0)')->count();
        $noLedger = DB::table('users')->where('points_balance', '>', 0)
            ->whereNotExists(fn ($q) => $q->select(DB::raw(1))->from('user_point_transactions as t')->whereColumn('t.user_id', 'users.id'))->count();
        $this->line(sprintf('   %s: %d customers · balance with NO ledger row: %d',
            $hasDebt ? 'ledger sum ≠ balance − debt' : 'balance ≠ ledger sum', $drift, $noLedger));

        // ── 2b. The two wallets (v3) ─────────────────────────────────────────────────────────────
        if ($hasGift && $hasBucket) {
            $giftTotal = (int) DB::table('users')->sum('gift_points_balance');
            $debtTotal = $hasDebt ? (int) DB::table('users')->sum('points_debt') : 0;
            $earnedTotal = max(0, $total - $giftTotal);
            $pending = Schema::hasColumn('user_point_transactions', 'available_at')
                ? (int) DB::table('user_point_transactions')->where('bucket', 'earned')->where('type', 'earn')
                    ->where('available_at', '>', now())->sum(DB::raw(Schema::hasColumn('user_point_transactions', 'remaining') ? 'COALESCE(remaining, points)' : 'points'))
                : 0;
            $unsplit = DB::table('user_point_transactions')->whereNull('bucket')->distinct()->count('user_id');
            $this->line('');
            $this->info('2b) Wallets (liability at 0,050 DT per Protina)');
            $this->table(['wallet', 'Protinas', 'value'], [
                ['earned (prepaid by cash already delivered)', $earnedTotal, $dt($earnedTotal)],
                ['   of which held (return window)', $pending, $dt($pending)],
                ['gift (shop money, budget-bounded)', $giftTotal, $dt($giftTotal)],
                ['debt (clawbacks not yet repaid)', $debtTotal, $dt($debtTotal)],
            ]);
            if ($unsplit > 0) {
                $this->warn(sprintf('   %d account(s) still have unclassified ledger rows (bucket NULL): run vps-run protinas-split-wallets. Until then their whole balance counts as gift.', $unsplit));
            }
            if (Schema::hasColumn('user_point_transactions', 'remaining')) {
                // Buckets add up: the gift balance is the sum of the open gift lots.
                $lotMismatch = DB::table('users as u')
                    ->leftJoinSub(DB::table('user_point_transactions')->where('bucket', 'gift')->where('remaining', '>', 0)
                        ->selectRaw('user_id, SUM(remaining) r')->groupBy('user_id'), 'l', 'l.user_id', '=', 'u.id')
                    ->whereRaw('COALESCE(u.gift_points_balance, 0) <> COALESCE(l.r, 0)')
                    ->where(fn ($q) => $q->where('u.gift_points_balance', '>', 0)->orWhereNotNull('l.r'))->count();
                $overGift = DB::table('users')->whereColumn('gift_points_balance', '>', 'points_balance')->count();
                $this->line(sprintf('   gift balance ≠ open gift lots: %d accounts · gift > total balance: %d accounts', $lotMismatch, $overGift));
                if (Schema::hasColumn('user_point_transactions', 'expires_at')) {
                    $soon = DB::table('user_point_transactions')->where('bucket', 'gift')->where('remaining', '>', 0)
                        ->whereNotNull('expires_at')->where('expires_at', '<=', now()->addDays(30));
                    $this->line(sprintf('   gift Protinas expiring within 30 days: %d (%s) · without expiry (pre-v3): %d',
                        (int) (clone $soon)->sum('remaining'), $dt((int) (clone $soon)->sum('remaining')),
                        (int) DB::table('user_point_transactions')->where('bucket', 'gift')->where('remaining', '>', 0)->whereNull('expires_at')->sum('remaining')));
                }
            }

            // Monthly movements per wallet (last 6 months).
            $month = DB::connection()->getDriverName() === 'sqlite' ? "strftime('%Y-%m', created_at)" : "DATE_FORMAT(created_at, '%Y-%m')";
            $moves = DB::table('user_point_transactions')->where('created_at', '>=', now()->subMonths(6)->startOfMonth())
                ->selectRaw("$month as m,
                    SUM(CASE WHEN bucket = 'earned' AND points > 0 THEN points ELSE 0 END) earned_in,
                    SUM(CASE WHEN bucket = 'earned' AND points < 0 THEN -points ELSE 0 END) earned_out,
                    SUM(CASE WHEN bucket = 'gift' AND points > 0 THEN points ELSE 0 END) gift_in,
                    SUM(CASE WHEN bucket = 'gift' AND points < 0 AND type <> 'expiry' THEN -points ELSE 0 END) gift_out,
                    SUM(CASE WHEN type = 'expiry' THEN -points ELSE 0 END) expired")
                ->groupBy('m')->orderBy('m')->get();
            $this->info('   monthly movements (Protinas; × 0,050 = DT)');
            $this->table(['month', 'earned +', 'earned −', 'gift +', 'gift used/clawed', 'gift expired', 'net liability change'],
                $moves->map(fn ($r) => [$r->m, (int) $r->earned_in, (int) $r->earned_out, (int) $r->gift_in, (int) $r->gift_out,
                    (int) $r->expired, $dt((int) $r->earned_in - (int) $r->earned_out + (int) $r->gift_in - (int) $r->gift_out - (int) $r->expired)])->all());
        }

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
            $goods = (float) $r->prix_ht; // prix_ht is the GROSS goods (adding remise double-counted it)
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
            if (Schema::hasColumn('welcome_bonus_claims', 'used_phone_hash')) {
                // Rule 21 is off by default: the audit shows when one delivery phone serves several
                // gift accounts (a SIM farm). Turn WELCOME_BONUS_UNIQUE_DELIVERY_PHONE on if it grows.
                $shared = DB::table('welcome_bonus_claims')->whereNotNull('used_phone_hash')
                    ->selectRaw('used_phone_hash, COUNT(DISTINCT user_id) accounts')->groupBy('used_phone_hash')
                    ->havingRaw('COUNT(DISTINCT user_id) > 1')->orderByDesc('accounts')->limit($top)->get();
                $this->line(sprintf('   delivery phones shared by several gift-spending accounts: %d%s', $shared->count(),
                    $shared->isEmpty() ? '' : ' — '.$shared->map(fn ($s) => substr((string) $s->used_phone_hash, 0, 8).'… ×'.$s->accounts)->implode(', ')));
            }
            if (Schema::hasColumn('welcome_bonus_claims', 'credited_at')) {
                $this->line(sprintf('   pending: %d · unlocked: %d',
                    DB::table('welcome_bonus_claims')->whereNull('credited_at')->count(),
                    DB::table('welcome_bonus_claims')->whereNotNull('credited_at')->count()));
            }
        }

        // ── 5. Online orders whose TOTAL discount was large (points + coupon + pack stacked) ───
        $this->line('');
        $hasShipPts = Schema::hasColumn('commandes', 'points_shipping_dt');
        $big = DB::table('commandes')->where('created_at', '>=', now()->subDays(90))
            ->whereRaw('(COALESCE(remise,0) + COALESCE(discount_ht,0)'.($hasShipPts ? ' + COALESCE(points_shipping_dt,0)' : '').') >= 20')
            ->orderByDesc('created_at')->limit($top)
            ->get(array_merge(['id', 'numero', 'created_at', 'etat', 'user_id', 'prix_ht', 'prix_ttc', 'remise', 'discount_ht', 'coupon_code_snapshot'],
                $hasShipPts ? ['points_shipping_dt', 'pricing_version'] : []));
        $this->info(sprintf('5) Online orders with ≥ 20 DT total discount, last 90 days: %d shown', $big->count()));
        $this->table(['order', 'date', 'état', 'v', 'user', 'HT', 'TTC', 'remise (pack+pts)', 'coupon HT', 'coupon', 'points DT', 'delivery by pts'],
            $big->map(function ($c) use ($rate) {
                $pts = (int) DB::table('user_point_transactions')->where('commande_id', $c->id)->where('type', 'redeem')->sum('points');

                return [$c->numero ?? $c->id, substr((string) $c->created_at, 0, 10), $c->etat, $c->pricing_version ?? 'legacy',
                    $c->user_id ? '#'.$c->user_id : 'invité',
                    $c->prix_ht, $c->prix_ttc, $c->remise, $c->discount_ht, $c->coupon_code_snapshot ? 'oui' : '', number_format(abs($pts) / $rate, 2),
                    $c->points_shipping_dt ?? '0'];
            })->all());

        // Delivered after a refund: before v3 such an order kept its Protinas refund (gap 2). Since v3
        // the delivery debits again; the ones still refunded are listed for the owner to decide.
        $refundedDelivered = DB::table('commandes as c')->whereIn('c.etat', PointsService::DELIVERED_STATUSES)
            ->whereExists(fn ($q) => $q->select(DB::raw(1))->from('user_point_transactions as t')->whereColumn('t.commande_id', 'c.id')
                ->where('t.type', 'adjustment')->where('t.points', '>', 0)
                ->where(fn ($w) => $w->where('t.idempotency_key', 'like', 'order:%:redeem-refund%')->orWhereNull('t.idempotency_key')))
            ->whereNotExists(fn ($q) => $q->select(DB::raw(1))->from('user_point_transactions as t2')->whereColumn('t2.commande_id', 'c.id')
                ->where('t2.type', 'adjustment')->where('t2.points', '<', 0)->where('t2.idempotency_key', 'like', 'order:%:redeem%:v%'))
            ->limit($top)->get(['c.id', 'c.numero', 'c.etat']);
        $this->line(sprintf('   delivered orders whose spent Protinas were refunded and never debited again: %d%s', $refundedDelivered->count(),
            $refundedDelivered->isEmpty() ? '' : ' — '.$refundedDelivered->map(fn ($c) => $c->numero ?? $c->id)->implode(', ')));

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
        $average = $orders->avg(fn ($o) => 100 * ((float) $o->remise + (float) $o->discount_ht) / (float) $o->prix_ht);
        if (! $v3) {
            $cap = (float) config('loyalty.checkout.max_total_discount_percent', 10);
            $bound = $orders->filter(fn ($o) => 100 * ((float) $o->remise + (float) $o->discount_ht)
                >= $cap * (float) $o->prix_ht - 0.1)->count();
            $this->info(sprintf('Last 90 days: average discount %.2f%% of goods · ceiling bound %d/%d orders (%.2f%%)',
                $average ?? 0, $bound, $orders->count(), $orders->count() ? 100 * $bound / $orders->count() : 0));
        } else {
            $this->info(sprintf('Last 90 days: average discount (pack + code + Protinas on goods) %.2f%% of goods over %d orders',
                $average ?? 0, $orders->count()));
            if (Schema::hasColumn('commandes', 'pricing_version') && Schema::hasColumn('commandes', 'budget_dt')) {
                $v3Orders = DB::table('commandes')->whereNotNull('pricing_version')->where('created_at', '>=', now()->subDays(90));
                $overBudget = (clone $v3Orders)->where('budget_dt', '<', 0)
                    ->where(fn ($q) => $q->where('pack_discount_ht', '>', 0)->orWhere('discount_ht', '>', 0)->orWhere('points_redeemed_gift', '>', 0))->count();
                $this->line(sprintf('   v3 orders: %d · with a giveaway on a negative budget (only codes with « perte acceptée »): %d · zero cash at the door: %d',
                    (clone $v3Orders)->count(), $overBudget, (clone $v3Orders)->where('prix_ttc', '<=', 0)->count()));
                if (Schema::hasColumn('commandes', 'protinas_forfeited')) {
                    $this->line(sprintf('   refusal deposits kept: %d Protinas on %d orders (%d waived)',
                        (int) (clone $v3Orders)->where('protinas_forfeit_waived', false)->sum('protinas_forfeited'),
                        (clone $v3Orders)->where('protinas_forfeited', '>', 0)->count(),
                        (clone $v3Orders)->where('protinas_forfeit_waived', true)->count()));
                }
            }
        }
        if ($v3 && Schema::hasTable('coupons') && Schema::hasColumn('coupons', 'allow_over_budget')) {
            $overCodes = DB::table('coupons')->where('is_active', true)->where('allow_over_budget', true)->pluck('code');
            $this->info(sprintf('Active codes with « perte acceptée » (honoured above the budget): %d%s — worst cases: vps-run protinas-coupons-review',
                $overCodes->count(), $overCodes->isEmpty() ? '' : ' ('.$overCodes->implode(', ').')'));
        } elseif (Schema::hasTable('coupons')) {
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
