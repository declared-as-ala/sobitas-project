<?php

namespace App\Services;

use App\Models\Commande;
use App\Models\User;
use App\Models\UserPointTransaction;
use App\Support\ProtinaWallet;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Reads and moves the two Protinas wallets (earned / gift). Every write goes through
 * PointsService::record(), which owns the balance, the debt and the gift lots.
 *
 *   forUser()        the wallet a checkout prices with (and the account pages show)
 *   consumeGift()    spend gift Protinas on an order, soonest expiry first
 *   creditGift()     add gift Protinas (welcome, reviews, campaigns)
 *   refundGift()     the expiry a refunded gift gets back
 *   expireDue()      write `expiry` rows for gift lots past their date (protinas:expire)
 *   splitWallets()   one-off classification of the pre-v3 ledger (migration + protinas:split-wallets)
 *
 * ── WHEN THE SPLIT HAS NOT RUN ───────────────────────────────────────────────────────────────
 * Before the split, nobody knows which part of a balance was a gift. Such a balance is treated as
 * GIFT (budget-bounded) — never as free earned money. "Not split" = the gift column is missing, or
 * the account still has ledger rows with a NULL bucket, or it has a balance and no ledger at all.
 */
class ProtinaWalletService
{
    public const MIGRATION_KEY_PREFIX = 'migration:wallets:';

    private function points(): PointsService
    {
        return app(PointsService::class); // resolved per call so a test mock is honoured
    }

    /** Re-read the wallet columns when the given model was loaded without them. */
    private function freshAttributes(User $user, array $columns): array
    {
        $attributes = $user->getAttributes();
        $missing = array_values(array_filter($columns, fn (string $c) => ! array_key_exists($c, $attributes)));
        if ($missing !== []) {
            $row = DB::table('users')->where('id', $user->getKey())->first($missing);
            foreach ($missing as $column) {
                $attributes[$column] = $row?->{$column} ?? null;
            }
        }

        return $attributes;
    }

    public function forUser(User $user): ProtinaWallet
    {
        $cols = PointsService::ledgerColumns();
        $existing = array_map('strtolower', Schema::getColumnListing('users'));
        $userColumns = array_values(array_filter(['points_balance', 'gift_points_balance', 'points_debt',
            'gift_frozen_until', 'cod_confirm_until', 'phone', 'phone_verified_at'],
            fn (string $c) => $c === 'points_balance' || in_array($c, $existing, true)));
        $a = $this->freshAttributes($user, $userColumns);
        $total = max(0, (int) ($a['points_balance'] ?? 0));
        $debt = max(0, (int) ($a['points_debt'] ?? 0));
        $frozen = ! empty($a['gift_frozen_until']) ? Carbon::parse($a['gift_frozen_until']) : null;
        $codUntil = ! empty($a['cod_confirm_until']) ? Carbon::parse($a['cod_confirm_until']) : null;
        $now = now();

        $unsplit = ! $cols['gift'] || ! $cols['bucket'] || $this->isUnsplit($user, $total);
        if ($unsplit) {
            $earnedSpendable = 0;
            $earnedPending = 0;
            $next = null;
            $gift = $total;
            $giftExpiresAt = null;
            if ($total > 0 && $cols['gift']) {
                Log::warning('Protinas wallet not split yet: whole balance treated as gift', ['user_id' => $user->getKey()]);
            }
        } else {
            $giftColumn = max(0, min($total, (int) ($a['gift_points_balance'] ?? 0)));
            $expiredLots = 0;
            $giftExpiresAt = null;
            if ($cols['remaining'] && $cols['expires_at']) {
                $expiredLots = (int) UserPointTransaction::query()->where('user_id', $user->getKey())
                    ->where('bucket', PointsService::BUCKET_GIFT)->where('remaining', '>', 0)
                    ->whereNotNull('expires_at')->where('expires_at', '<=', $now)->sum('remaining');
                $soonest = UserPointTransaction::query()->where('user_id', $user->getKey())
                    ->where('bucket', PointsService::BUCKET_GIFT)->where('remaining', '>', 0)
                    ->where('expires_at', '>', $now)->min('expires_at');
                $giftExpiresAt = $soonest ? Carbon::parse($soonest) : null;
            }
            $gift = max(0, $giftColumn - $expiredLots);
            $earnedTotal = $total - $giftColumn;
            $pending = 0;
            $next = null;
            if ($cols['available_at']) {
                $held = UserPointTransaction::query()->where('user_id', $user->getKey())
                    ->where('bucket', PointsService::BUCKET_EARNED)->where('type', 'earn')
                    ->where('available_at', '>', $now);
                $pending = (int) (clone $held)->sum(DB::raw($cols['remaining'] ? 'COALESCE(remaining, points)' : 'points'));
                $nextRaw = (clone $held)->min('available_at');
                $next = $nextRaw ? Carbon::parse($nextRaw) : null;
            }
            $earnedPending = max(0, min($pending, $earnedTotal));
            $earnedSpendable = max(0, $earnedTotal - $earnedPending);
        }

        $reason = null;
        if (! $user->hasVerifiedContact()) {
            $reason = ProtinaWallet::BLOCK_UNVERIFIED;
        } elseif ($debt > 0) {
            $reason = ProtinaWallet::BLOCK_DEBT;
        } elseif ($frozen !== null && $frozen->gt($now)) {
            $reason = ProtinaWallet::BLOCK_GIFT_FROZEN;
        }

        // Rule 17: a phone verified long enough ago that the confirmation call reaches the owner.
        $phoneTrustedFrom = null;
        if (! empty($a['phone_verified_at']) && trim((string) ($a['phone'] ?? '')) !== '') {
            $phoneTrustedFrom = Carbon::parse($a['phone_verified_at'])
                ->addDays(max(0, (int) config('loyalty.cod.trusted_phone_days', 14)));
        }
        $phoneTrusted = $phoneTrustedFrom !== null && $phoneTrustedFrom->lte($now);

        return new ProtinaWallet($total, $earnedSpendable, $earnedPending, $next, $gift, $giftExpiresAt, $debt,
            $frozen !== null && $frozen->gt($now) ? $frozen : null, $reason, $codUntil, $unsplit,
            $phoneTrusted, $phoneTrustedFrom, $gift > 0 && $this->giftHasWelcome($user, $unsplit, $cols));
    }

    /**
     * True when the gift Protinas include a welcome gift (key welcome:… or the « Cadeau de bienvenue »
     * wording). Review rewards and refunded gifts alone are just « Cadeau ».
     */
    private function giftHasWelcome(User $user, bool $unsplit, array $cols): bool
    {
        try {
            $welcome = fn ($q) => $q->where(fn ($w) => $w->where('idempotency_key', 'like', 'welcome:%')
                ->orWhere('description', 'like', 'Cadeau de bienvenue%'));
            $rows = UserPointTransaction::query()->where('user_id', $user->getKey())->where('points', '>', 0)->where($welcome);
            if (! $unsplit && $cols['bucket'] && $cols['remaining']) {
                $rows->where('bucket', PointsService::BUCKET_GIFT)->where('remaining', '>', 0);
                if ($cols['expires_at']) {
                    $rows->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()));
                }
            }

            return $rows->exists();
        } catch (\Throwable) {
            return false;
        }
    }

    /** Ledger rows still unclassified (bucket NULL), or a balance with no ledger at all. */
    private function isUnsplit(User $user, int $total): bool
    {
        $stats = DB::table('user_point_transactions')->where('user_id', $user->getKey())
            ->selectRaw('COUNT(*) AS n, SUM(CASE WHEN bucket IS NULL THEN 1 ELSE 0 END) AS unclassified')->first();
        $rows = (int) ($stats->n ?? 0);

        return (int) ($stats->unclassified ?? 0) > 0 || ($rows === 0 && $total > 0);
    }

    /**
     * Spend gift Protinas on an order: key order:{id}:redeem-gift, soonest-expiring lots first.
     * The returned row's `expires_at` is the latest expiry consumed (null = a never-expiring lot).
     */
    public function consumeGift(User $user, int $points, int $commandeId, string $numero): ?UserPointTransaction
    {
        if ($points <= 0) {
            return null;
        }

        return $this->points()->redeemForOrder($user, $commandeId, $numero, 0, $points)['gift'];
    }

    /** Add gift Protinas. $expiresAt null = never expires; pass PointsService::giftExpiry() for the default validity. */
    public function creditGift(User $user, int $points, string $description, ?string $idempotencyKey,
        ?\DateTimeInterface $expiresAt = null, ?int $reviewId = null): ?UserPointTransaction
    {
        if ($points <= 0) {
            return null;
        }

        return $this->points()->record($user, 'earn', $points, $description, null, $reviewId, $idempotencyKey,
            PointsService::BUCKET_GIFT, $expiresAt);
    }

    /** The expiry refunded gift Protinas get: max(original, now + refund_grace_days); null stays null. */
    public function refundGift(?\DateTimeInterface $originalExpiry): ?CarbonInterface
    {
        return PointsService::refundGiftExpiry($originalExpiry);
    }

    /**
     * Expire every gift lot whose date has passed. Idempotent (key expiry:{lot id}; an expired lot
     * has remaining 0). Never takes earned Protinas: at most the gift balance is debited.
     *
     * @return array{expired_lots: int, points: int, failed: int}
     */
    public function expireDue(int $limit = 5000): array
    {
        $result = ['expired_lots' => 0, 'points' => 0, 'failed' => 0];
        $cols = PointsService::ledgerColumns();
        if (! $cols['bucket'] || ! $cols['remaining'] || ! $cols['expires_at'] || ! $cols['gift']) {
            return $result;
        }
        $lots = UserPointTransaction::query()->where('bucket', PointsService::BUCKET_GIFT)
            ->where('remaining', '>', 0)->whereNotNull('expires_at')->where('expires_at', '<=', now())
            ->orderBy('expires_at')->orderBy('id')->limit(max(1, $limit))->get(['id', 'user_id']);
        foreach ($lots as $lot) {
            try {
                $points = $this->expireLot((int) $lot->id, (int) $lot->user_id);
                if ($points > 0) {
                    $result['expired_lots']++;
                    $result['points'] += $points;
                }
            } catch (\Throwable $e) {
                $result['failed']++;
                Log::error('Protinas gift expiry failed', ['lot_id' => $lot->id, 'error' => $e->getMessage()]);
            }
        }

        return $result;
    }

    /**
     * Expire this customer's gift lots whose date has passed, now rather than at the next 03:30 run.
     * Clawbacks (a re-debit after a refund, an unpublished review) call it under the user lock first:
     * between a lot's expires_at and protinas:expire, the expired lot still sits in the gift balance,
     * the clawback would consume a VALID lot instead, and the expired one would then expire as well
     * (the same Protinas taken twice). Same rows and keys as expireDue(). Never throws.
     *
     * @return int Protinas expired
     */
    public function expireDueForUser(int $userId): int
    {
        $cols = PointsService::ledgerColumns();
        if (! $cols['bucket'] || ! $cols['remaining'] || ! $cols['expires_at'] || ! $cols['gift']) {
            return 0;
        }
        $expired = 0;
        $lotIds = UserPointTransaction::query()->where('user_id', $userId)->where('bucket', PointsService::BUCKET_GIFT)
            ->where('remaining', '>', 0)->whereNotNull('expires_at')->where('expires_at', '<=', now())
            ->orderBy('expires_at')->orderBy('id')->pluck('id');
        foreach ($lotIds as $lotId) {
            try {
                $expired += $this->expireLot((int) $lotId, $userId);
            } catch (\Throwable $e) {
                Log::error('Protinas gift expiry failed', ['lot_id' => $lotId, 'error' => $e->getMessage()]);
            }
        }

        return $expired;
    }

    /** Expire one due lot (key expiry:{lot id}); at most the gift balance, never earned Protinas. */
    private function expireLot(int $lotId, int $userId): int
    {
        return DB::transaction(function () use ($lotId, $userId): int {
            $user = User::query()->whereKey($userId)->lockForUpdate()->first();
            $fresh = UserPointTransaction::query()->whereKey($lotId)->lockForUpdate()->first(['id', 'remaining']);
            if (! $user || ! $fresh || (int) $fresh->remaining <= 0) {
                return 0;
            }
            $amount = min((int) $fresh->remaining, max(0, (int) $user->gift_points_balance));
            $written = 0;
            if ($amount > 0) {
                $tx = $this->points()->record($user, 'expiry', -$amount, 'Protinas cadeau expirées', null, null,
                    'expiry:'.$lotId, PointsService::BUCKET_GIFT);
                $written = $tx->wasRecentlyCreated ? $amount : 0;
            }
            // A lot the gift balance no longer covers (drift) is closed without touching earned Protinas.
            UserPointTransaction::query()->whereKey($lotId)->where('remaining', '>', 0)->update(['remaining' => 0]);

            return $written;
        });
    }

    /**
     * Gift lots that expire in [from, to) and still hold Protinas — the reminder job's input.
     *
     * @return \Illuminate\Support\Collection<int, UserPointTransaction>
     */
    public function giftLotsExpiringBetween(\DateTimeInterface $from, \DateTimeInterface $to)
    {
        $cols = PointsService::ledgerColumns();
        if (! $cols['bucket'] || ! $cols['remaining'] || ! $cols['expires_at']) {
            return collect();
        }

        return UserPointTransaction::query()->where('bucket', PointsService::BUCKET_GIFT)->where('remaining', '>', 0)
            ->where('expires_at', '>=', $from)->where('expires_at', '<', $to)
            ->orderBy('expires_at')->get(['id', 'user_id', 'remaining', 'expires_at']);
    }

    /**
     * What Protinas saved this customer on delivered storefront orders: pack + code + Protinas +
     * free delivery. Crossed-out prices never count (Loi 98-40).
     */
    public function lifetimeSavingsDt(User $user): float
    {
        if (! Schema::hasTable('commandes') || ! Schema::hasColumn('commandes', 'authenticated_user_id')) {
            return 0.0;
        }
        $columns = array_values(array_filter(['id', 'prix_ht', 'frais_livraison', 'pack_discount_ht', 'discount_ht',
            'points_discount_ht', 'points_shipping_dt', 'pricing_version'], fn (string $c) => Schema::hasColumn('commandes', $c)));
        $fee = (float) config('loyalty.checkout.delivery_fee_dt', 10);
        $freeFrom = (float) config('loyalty.checkout.free_delivery_from_dt', 300);
        $total = 0.0;
        foreach (DB::table('commandes')->where('authenticated_user_id', $user->getKey())
            ->whereIn('etat', PointsService::DELIVERED_STATUSES)->get($columns) as $order) {
            $total += (float) ($order->pack_discount_ht ?? 0) + (float) ($order->discount_ht ?? 0)
                + (float) ($order->points_discount_ht ?? 0) + (float) ($order->points_shipping_dt ?? 0);
            $grossShipping = (float) ($order->frais_livraison ?? 0) + (float) ($order->points_shipping_dt ?? 0);
            $isV3 = isset($order->pricing_version) && $order->pricing_version !== null;
            if ($grossShipping <= 0 && ($isV3 || (float) ($order->prix_ht ?? 0) >= $freeFrom)) {
                $total += $fee;
            }
        }

        return round($total, 3);
    }

    /**
     * Protinas on their way: open storefront orders and what each will earn on delivery.
     *
     * @return list<array{commande_id: int, numero: ?string, points: int}>
     */
    public function inTransit(User $user, int $limit = 10): array
    {
        if (! Schema::hasTable('commandes') || ! Schema::hasColumn('commandes', 'authenticated_user_id')) {
            return [];
        }
        $out = [];
        $orders = Commande::query()->where('authenticated_user_id', $user->getKey())
            ->whereNotIn('etat', array_merge(PointsService::DELIVERED_STATUSES, PointsService::CANCELLED_STATUSES))
            ->latest('id')->limit($limit)->get();
        foreach ($orders as $order) {
            $points = $this->points()->earnForSpend($this->points()->earnableSpendFor($order));
            if ($points > 0) {
                $out[] = ['commande_id' => (int) $order->id, 'numero' => $order->numero, 'points' => $points];
            }
        }

        return $out;
    }

    /**
     * The account JSON block shared by /profil, /points/history and /member/dashboard.
     *
     * @return array<string, mixed>
     */
    public function customerPayload(User $user): array
    {
        $ppd = PointsService::pointsPerDt();
        $wallet = $this->forUser($user);

        return $wallet->toArray($ppd) + [
            'hold_days' => max(0, (int) config('loyalty.points.earn_hold_days', 14)),
            'gift_full_from_dt' => app(OrderBudget::class)->giftFullFromDt(),
            'lifetime_savings_dt' => $this->lifetimeSavingsDt($user),
            'en_route' => $this->inTransit($user),
        ];
    }

    // ── One-off split of the pre-v3 ledger ───────────────────────────────────────────────────

    /**
     * Classify every legacy ledger row and set the gift wallet (spec §E).
     *
     *   rows   review_id, a `welcome:` / `review:` key, or a « Cadeau de bienvenue » description → gift;
     *          everything else (orders) → earned.
     *   gift   remaining = the gift already in the wallet + legacy gift credits − legacy spending,
     *          spending charged GIFT FIRST (favours the customer), on the oldest gift lots first.
     *          Pre-v3 gifts never expire (expires_at NULL). The legacy orders that spending paid
     *          (oldest first, whole orders) have their redeem and refund rows filed as gift, so a
     *          later cancellation gives gift back, not earned Protinas.
     *   earned points_balance − gift. No hold on pre-v3 earnings. points_balance stays the truth.
     *   drift  ledger sum ≠ balance − debt (the old 0-floor): one hidden adjustment row, key
     *          migration:wallets:{uid} (":v{n}" on a later pass). Forgiven clawbacks are NOT turned
     *          into debt, and an existing points_debt is kept.
     *
     * Idempotent: an account is processed only while it still has rows with a NULL bucket (or a
     * balance and no ledger). Dry run ($apply false) computes the same report and writes nothing.
     *
     * @return array{status: string, users: int, split: int, skipped: int, gift_points: int, earned_points: int, drift_users: int, drift_points: int, failed: int, failed_user_ids: list<int>, details: list<array<string, int>>}
     */
    public function splitWallets(bool $apply = false): array
    {
        $report = ['status' => 'ok', 'users' => 0, 'split' => 0, 'skipped' => 0, 'gift_points' => 0,
            'earned_points' => 0, 'drift_users' => 0, 'drift_points' => 0, 'failed' => 0,
            'failed_user_ids' => [], 'details' => []];
        $cols = PointsService::ledgerColumns();
        if (! $cols['bucket'] || ! $cols['remaining'] || ! $cols['gift']) {
            $report['status'] = 'missing_columns';

            return $report;
        }

        $ids = DB::table('user_point_transactions')->whereNull('bucket')->distinct()->pluck('user_id')
            ->merge(DB::table('users')->where('points_balance', '>', 0)
                ->whereNotExists(fn ($q) => $q->select(DB::raw(1))->from('user_point_transactions as t')
                    ->whereColumn('t.user_id', 'users.id'))
                ->pluck('id'))
            ->map(fn ($id) => (int) $id)->unique()->sort()->values();

        foreach ($ids as $userId) {
            $report['users']++;
            try {
                $one = DB::transaction(fn () => $this->splitOne($userId, $apply, $cols));
            } catch (\Throwable $e) {
                $report['failed']++;
                $report['failed_user_ids'][] = $userId;
                Log::error('Protinas wallet split failed', ['user_id' => $userId, 'error' => $e->getMessage()]);
                continue;
            }
            if ($one === null) {
                $report['skipped']++;
                continue;
            }
            $report['split']++;
            $report['gift_points'] += $one['gift'];
            $report['earned_points'] += $one['earned'];
            if ($one['drift'] !== 0) {
                $report['drift_users']++;
                $report['drift_points'] += $one['drift'];
            }
            if (count($report['details']) < 500) {
                $report['details'][] = ['user_id' => $userId] + $one;
            }
        }
        if ($report['failed'] > 0) {
            $report['status'] = 'partial';
        }

        return $report;
    }

    /** @return array{balance: int, gift: int, earned: int, drift: int}|null null = nothing to split */
    private function splitOne(int $userId, bool $apply, array $cols): ?array
    {
        $userColumns = ['id', 'points_balance', 'gift_points_balance'];
        if ($cols['debt']) {
            $userColumns[] = 'points_debt';
        }
        $user = DB::table('users')->where('id', $userId)->lockForUpdate()->first($userColumns);
        if (! $user) {
            return null;
        }
        $balance = max(0, (int) $user->points_balance);
        // A debt written by v3 code (a clawback with allowDebt) is never forgiven by a re-run (rule 16).
        $debt = $cols['debt'] ? max(0, (int) ($user->points_debt ?? 0)) : 0;
        // What v3 code already put in the gift wallet (its own lots). 0 on a first run; on a re-run it
        // is the wallet as it stands, and only the rows still unclassified are added to it.
        // NOT clamped to the balance: v3 record() keeps the column ≤ the balance on every write, so
        // only an old-code debit (a NULL-bucket row, counted in $netSpent below) leaves it above. The
        // balance already has that debit taken out; clamping here would charge it to the gift twice.
        // The result is clamped to the balance below.
        $giftBefore = max(0, (int) ($user->gift_points_balance ?? 0));
        $rows = DB::table('user_point_transactions')->where('user_id', $userId)->orderBy('id')->lockForUpdate()->get();
        $unclassified = $rows->whereNull('bucket')->count();
        if ($rows->isNotEmpty() && $unclassified === 0) {
            return null; // already split (or written by v3 code only)
        }
        if ($rows->isEmpty() && $balance === 0) {
            return null;
        }

        $giftIds = [];
        $earnedIds = [];
        $giftCredits = [];
        $legacyGiftNet = 0;
        $looseSpent = 0; // redeem rows without an order
        $ledgerSum = 0;
        /** @var array<int, array{first: int, net: int, ids: list<int>, all_legacy: bool}> $orders legacy spending per order */
        $orders = [];
        foreach ($rows as $row) {
            $ledgerSum += (int) $row->points;
            if ($row->bucket === null && $row->type === 'redeem' && $row->commande_id !== null) {
                $orders[(int) $row->commande_id] ??= ['first' => (int) $row->id, 'net' => 0, 'ids' => [], 'all_legacy' => true];
            }
        }
        foreach ($rows as $row) {
            $points = (int) $row->points;
            $cid = $row->commande_id !== null ? (int) $row->commande_id : null;
            // Refunds of a legacy order net its spending whoever wrote them (a v3 refund of an order
            // placed before the split included), so a refunded order is never charged to the gift.
            if ($cid !== null && isset($orders[$cid]) && $row->type === 'adjustment' && $points > 0) {
                $orders[$cid]['net'] -= $points;
                if ($row->bucket !== null) {
                    $orders[$cid]['all_legacy'] = false;
                }
            }
            if ($row->bucket !== null) {
                continue; // written by v3 code: already in the gift column and its own lots
            }
            $key = (string) ($row->idempotency_key ?? '');
            $description = (string) ($row->description ?? '');
            $isGift = ! empty($row->review_id ?? null)
                || str_starts_with($key, 'welcome:') || str_starts_with($key, 'review:')
                || str_starts_with($description, 'Cadeau de bienvenue')
                || str_starts_with($description, 'Annulation du cadeau de bienvenue');
            if ($isGift) {
                $giftIds[] = (int) $row->id;
                $legacyGiftNet += $points;
                if ($points > 0) {
                    $giftCredits[] = ['id' => (int) $row->id, 'points' => $points];
                }
                continue;
            }
            $earnedIds[] = (int) $row->id;
            if ($row->type === 'redeem') {
                if ($cid !== null) {
                    $orders[$cid]['net'] += -$points;
                    $orders[$cid]['ids'][] = (int) $row->id;
                } else {
                    $looseSpent += -$points;
                }
            } elseif ($cid !== null && isset($orders[$cid]) && $row->type === 'adjustment' && $points > 0) {
                $orders[$cid]['ids'][] = (int) $row->id; // a legacy refund of a legacy redeem
            }
        }
        $netSpent = $looseSpent;
        foreach ($orders as $order) {
            $netSpent += max(0, $order['net']);
        }
        $giftAvailable = $giftBefore + $legacyGiftNet;
        $gift = max(0, min($balance, $giftAvailable - $netSpent));
        $earned = $balance - $gift;
        // Ledger sum = balance − debt from now on. Only the old 0-floor gap is reconciled.
        $drift = ($balance - $debt) - $ledgerSum;

        /*
         * Which legacy orders the gift paid: spending is charged to the gift first, oldest order first.
         * Their redeem rows and legacy refunds are filed in the GIFT bucket, so cancelling such an order
         * after the split gives the gift back as gift (never-expiring, like the lot it came from), not as
         * earned Protinas the order budget never bounds. The order that crosses the limit is SPLIT: its
         * gift part moves to a gift redeem row (key order:{cid}:redeem-gift), the rest stays earned, so
         * its refund gives back each part in its own wallet. Every later order stays earned. The ledger
         * sum and the gift balance computed above are unchanged.
         */
        $chargedToGift = min($netSpent, max(0, $giftAvailable));
        uasort($orders, fn (array $a, array $b): int => $a['first'] <=> $b['first']);
        $cumulative = 0;
        $crossing = null;
        foreach ($orders as $cid => $order) {
            $net = max(0, $order['net']);
            if ($net <= 0) {
                // Fully refunded: it spent nothing net, so the gift paid nothing of it. Its redeem and
                // refund rows stay EARNED (spec §E: order rows → earned) — filed gift, a later
                // re-debit would take a NEW gift and a second cancel would refund never-expiring gift.
                continue;
            }
            $before = $cumulative;
            $cumulative += $net;
            if ($cumulative > $chargedToGift) {
                $giftPart = min($net, $chargedToGift - $before);
                if ($giftPart > 0 && $order['all_legacy'] && $order['ids'] !== []) {
                    $crossing = ['commande_id' => (int) $cid, 'gift' => $giftPart, 'ids' => $order['ids']];
                }
                break;
            }
            if (! $order['all_legacy'] || $order['ids'] === []) {
                continue; // a v3 row already refunded it in the earned bucket: leave the order as it is
            }
            $giftIds = array_merge($giftIds, $order['ids']);
            $earnedIds = array_values(array_diff($earnedIds, $order['ids']));
        }

        if ($apply) {
            $now = now();
            foreach (array_chunk($giftIds, 500) as $chunk) {
                DB::table('user_point_transactions')->whereIn('id', $chunk)->whereNull('bucket')
                    ->update(['bucket' => PointsService::BUCKET_GIFT]);
            }
            foreach (array_chunk($earnedIds, 500) as $chunk) {
                DB::table('user_point_transactions')->whereIn('id', $chunk)->whereNull('bucket')
                    ->update(['bucket' => PointsService::BUCKET_EARNED]);
            }
            if ($crossing !== null) {
                $this->splitCrossingOrder($userId, $crossing, $rows, $cols, $now);
            }
            // Lots: the legacy gift credits hold what the gift gained over the wallet as it stood; the
            // oldest credits were spent first. Pre-v3 gifts never expire.
            $creditTotal = array_sum(array_column($giftCredits, 'points'));
            $consume = max(0, $creditTotal - min($creditTotal, max(0, $gift - $giftBefore)));
            foreach ($giftCredits as $credit) {
                $take = min($credit['points'], $consume);
                $consume -= $take;
                $update = ['remaining' => $credit['points'] - $take];
                if ($cols['expires_at']) {
                    $update['expires_at'] = null;
                }
                DB::table('user_point_transactions')->where('id', $credit['id'])->update($update);
            }
            // Legacy spending larger than the legacy gifts also used the gift v3 code had credited.
            $excess = max(0, $giftBefore - $gift);
            if ($excess > 0) {
                $legacyLotIds = array_column($giftCredits, 'id');
                $lots = DB::table('user_point_transactions')->where('user_id', $userId)
                    ->where('bucket', PointsService::BUCKET_GIFT)->where('remaining', '>', 0)
                    ->when($legacyLotIds !== [], fn ($q) => $q->whereNotIn('id', $legacyLotIds))
                    ->orderBy('id')->get(['id', 'remaining']);
                foreach ($lots as $lot) {
                    if ($excess <= 0) {
                        break;
                    }
                    $take = min((int) $lot->remaining, $excess);
                    $excess -= $take;
                    DB::table('user_point_transactions')->where('id', $lot->id)->update(['remaining' => (int) $lot->remaining - $take]);
                }
            }
            // points_debt is left as it is: a re-run must not forgive a clawback.
            DB::table('users')->where('id', $userId)->update(['gift_points_balance' => $gift]);
            if ($drift !== 0) {
                $base = self::MIGRATION_KEY_PREFIX.$userId;
                $marker = ['user_id' => $userId, 'commande_id' => null, 'type' => 'adjustment', 'points' => $drift,
                    'balance_after' => $balance, 'description' => 'Rapprochement du solde (passage aux deux portefeuilles)',
                    'bucket' => PointsService::BUCKET_EARNED];
                if ($cols['key']) {
                    // Versioned on a re-run: the drift of THIS pass is reconciled, whatever an earlier one wrote.
                    $written = DB::table('user_point_transactions')
                        ->where(fn ($q) => $q->where('idempotency_key', $base)->orWhere('idempotency_key', 'like', $base.':v%'))
                        ->count();
                    $marker['idempotency_key'] = $written === 0 ? $base : $base.':v'.$written;
                }
                foreach (['created_at', 'updated_at'] as $stamp) {
                    if (Schema::hasColumn('user_point_transactions', $stamp)) {
                        $marker[$stamp] = $now;
                    }
                }
                DB::table('user_point_transactions')->insert($marker);
            }
        }

        return ['balance' => $balance, 'gift' => $gift, 'earned' => $earned, 'drift' => $drift];
    }

    /**
     * The legacy order whose spending crosses the gift limit: move its gift part out of its (earned)
     * redeem row into a gift redeem row of its own (key order:{cid}:redeem-gift, never-expiring like
     * the legacy lot it was spent from). The ledger sum is unchanged; a cancellation then refunds the
     * gift part as gift and the rest as earned. Skipped when that key already exists (re-run).
     *
     * @param array{commande_id: int, gift: int, ids: list<int>} $crossing
     */
    private function splitCrossingOrder(int $userId, array $crossing, \Illuminate\Support\Collection $rows, array $cols, CarbonInterface $now): void
    {
        $cid = $crossing['commande_id'];
        $key = 'order:'.$cid.':redeem-gift';
        if ($cols['key'] && DB::table('user_point_transactions')->where('idempotency_key', $key)->exists()) {
            return;
        }
        $left = $crossing['gift'];
        $template = null;
        $redeems = $rows->whereIn('id', $crossing['ids'])->where('type', 'redeem')->sortBy('id');
        foreach ($redeems as $redeem) {
            if ($left <= 0) {
                break;
            }
            $take = min(max(0, -(int) $redeem->points), $left);
            if ($take <= 0) {
                continue;
            }
            DB::table('user_point_transactions')->where('id', $redeem->id)->update(['points' => (int) $redeem->points + $take]);
            $left -= $take;
            $template ??= $redeem;
        }
        $moved = $crossing['gift'] - $left;
        if ($moved <= 0 || $template === null) {
            return;
        }
        $numero = Schema::hasTable('commandes') ? DB::table('commandes')->where('id', $cid)->value('numero') : null;
        $row = ['user_id' => $userId, 'commande_id' => $cid, 'type' => 'redeem', 'points' => -$moved,
            'balance_after' => (int) ($template->balance_after ?? 0),
            'description' => 'Protinas cadeau utilisées sur commande '.($numero ?: $cid),
            'bucket' => PointsService::BUCKET_GIFT];
        if ($cols['key']) {
            $row['idempotency_key'] = $key;
        }
        foreach (['created_at', 'updated_at'] as $stamp) {
            if (Schema::hasColumn('user_point_transactions', $stamp)) {
                $row[$stamp] = $template->{$stamp} ?? $now;
            }
        }
        DB::table('user_point_transactions')->insert($row);
    }
}
