<?php

namespace App\Services;

use App\Models\Commande;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class WelcomeBonusService
{
    public static function pendingPoints(User $user): int
    {
        return (int) DB::table('welcome_bonus_claims')->where('user_id', $user->id)
            ->whereNull('credited_at')->value('points');
    }

    /**
     * Ledger keys for one unlock "slot": a commande id, or 0 for a credit that no order unlocked
     * (kill switch off). Every reversal written for a slot bumps its version, so an order that is
     * returned and then delivered again unlocks again, and a second return reverses that second
     * unlock. Version 0 keeps the original unsuffixed key. Slot 0 credits are never reversed.
     */
    private static function reversalsWritten(int $userId, int $slot): int
    {
        if (! Schema::hasColumn('user_point_transactions', 'idempotency_key')) {
            return 0;
        }
        $base = 'welcome:'.$userId.':unlock-reversal:'.$slot;

        return (int) DB::table('user_point_transactions')
            ->where(fn ($q) => $q->where('idempotency_key', $base)->orWhere('idempotency_key', 'like', $base.':%'))
            ->count();
    }

    private static function versioned(string $base, int $version): string
    {
        return $version === 0 ? $base : $base.':'.$version;
    }

    public static function unlockKey(int $userId, int $slot): string
    {
        return self::versioned('welcome:'.$userId.':unlock:'.$slot, self::reversalsWritten($userId, $slot));
    }

    public static function reversalKey(int $userId, int $slot): string
    {
        return self::versioned('welcome:'.$userId.':unlock-reversal:'.$slot, self::reversalsWritten($userId, $slot));
    }

    private static function creditDescription(int $points): string
    {
        return 'Cadeau de bienvenue — '.round($points / PointsService::pointsPerDt(), 3).' DT en Protinas';
    }

    /** The expiry a welcome gift credited now gets (null = never; pre-v3 claims are grandfathered). */
    public static function giftExpiryFor(bool $grandfathered): ?\Carbon\CarbonInterface
    {
        return $grandfathered ? null : PointsService::giftExpiry();
    }

    /**
     * Credit a reserved (pending) claim now, without a delivered order.
     *
     * This is what turning welcome_bonus.unlock_on_first_delivery OFF means for claims reserved
     * while it was on: claimWelcomeBonus(), a re-verification and `protinas:welcome-release-pending`
     * all come here — and, since v3, the phone verification itself (the gift is credited at once).
     * Idempotent: an already-credited claim is left alone, the ledger key is unique.
     *
     * Since v3 the credit is GIFT Protinas valid loyalty.gift.valid_days. $grandfathered = a claim
     * reserved before v3 (released by the deploy migration): no expiry, as promised at the time.
     */
    public function creditPending(User $user, bool $grandfathered = false): bool
    {
        return DB::transaction(function () use ($user, $grandfathered): bool {
            $claim = DB::table('welcome_bonus_claims')->where('user_id', $user->id)
                ->whereNull('credited_at')->lockForUpdate()->first();
            if (! $claim || (int) $claim->points <= 0) {
                return false;
            }
            $tx = app(PointsService::class)->record($user, 'earn', (int) $claim->points,
                self::creditDescription((int) $claim->points), null, null, self::unlockKey((int) $user->id, 0),
                PointsService::BUCKET_GIFT, self::giftExpiryFor($grandfathered));
            if (! $tx->wasRecentlyCreated) {
                return false;
            }
            DB::table('welcome_bonus_claims')->where('user_id', $user->id)->update([
                'credited_at' => now(), 'unlocked_by_commande_id' => null, 'unlock_phone_hash' => null,
            ]);
            User::whereKey($user->id)->update(['welcome_bonus_awarded_at' => now()]);

            return true;
        });
    }

    /**
     * Credit the pending claim because $commande, an order of this account, is delivered. Also used
     * at phone verification when the account already has a delivered order, so that order is
     * recorded as the unlocking one and returning it sends the bonus back to pending.
     */
    public function unlockOnDelivery(User $user, Commande $commande): bool
    {
        $authenticatedUserId = array_key_exists('authenticated_user_id', $commande->getAttributes())
            ? $commande->authenticated_user_id
            : (Schema::hasColumn('commandes', 'authenticated_user_id')
                ? Commande::whereKey($commande->id)->value('authenticated_user_id') : null);
        if ((int) $authenticatedUserId !== (int) $user->id) {
            return false;
        }

        return DB::transaction(function () use ($user, $commande): bool {
            $claim = DB::table('welcome_bonus_claims')->where('user_id', $user->id)
                ->whereNull('credited_at')->lockForUpdate()->first();
            if (! $claim || (int) $claim->points <= 0) {
                return false;
            }
            try {
                $phoneHash = PhoneVerificationService::fingerprint(PhoneVerificationService::normalize(
                    (string) ($commande->livraison_phone ?: $commande->phone)
                ));
            } catch (ValidationException) {
                Log::warning('Welcome bonus delivery phone invalid', ['commande_id' => $commande->id]);

                return false;
            }
            if (config('welcome_bonus.unique_delivery_phone', true)
                && DB::table('welcome_bonus_claims')->where('user_id', '<>', $user->id)
                    ->whereNotNull('credited_at')
                    ->where(fn ($q) => $q->where('phone_hash', $phoneHash)->orWhere('unlock_phone_hash', $phoneHash))
                    ->exists()) {
                Log::warning('Welcome bonus delivery phone already unlocked', ['commande_id' => $commande->id]);

                return false;
            }
            $tx = app(PointsService::class)->record($user, 'earn', (int) $claim->points,
                self::creditDescription((int) $claim->points), null, null,
                self::unlockKey((int) $user->id, (int) $commande->id), PointsService::BUCKET_GIFT,
                self::giftExpiryFor(false));
            if (! $tx->wasRecentlyCreated) {
                return false;
            }
            DB::table('welcome_bonus_claims')->where('user_id', $user->id)->update([
                'credited_at' => now(), 'unlocked_by_commande_id' => $commande->id,
                'unlock_phone_hash' => $phoneHash,
            ]);
            User::whereKey($user->id)->update(['welcome_bonus_awarded_at' => now()]);

            return true;
        });
    }

    /**
     * The unlocking order was cancelled or returned: take the bonus back and make it pending again.
     *
     * Only what the balance still holds can be taken back (the ledger floors at 0). Resetting the
     * claim to its full value after recovering less would let the next delivery credit the spent
     * part a second time, so:
     *   - nothing recovered (already spent): the claim stays credited and attached to this order;
     *   - part recovered: the claim goes back to pending for exactly the recovered amount.
     */
    public function reverseUnlock(User $user, Commande $commande): void
    {
        DB::transaction(function () use ($user, $commande): void {
            $claim = DB::table('welcome_bonus_claims')->where('user_id', $user->id)
                ->where('unlocked_by_commande_id', $commande->id)->lockForUpdate()->first();
            if (! $claim) {
                return;
            }
            $points = (int) $claim->points;
            $locked = User::whereKey($user->id)->lockForUpdate()->first();
            $balance = (int) ($locked?->points_balance ?? 0);
            // Since v3 the welcome is gift Protinas: only what the gift wallet still holds comes back.
            $recoverable = Schema::hasColumn('users', 'gift_points_balance')
                ? min($balance, (int) ($locked?->gift_points_balance ?? 0)) : $balance;
            $recovered = max(0, min($recoverable, $points));
            if ($recovered === 0) {
                Log::warning('Welcome bonus reversal recovered nothing: bonus already spent, claim kept credited', [
                    'user_id' => $user->id, 'commande_id' => $commande->id, 'points' => $points,
                ]);

                return;
            }
            $tx = app(PointsService::class)->record($user, 'adjustment', -$recovered,
                'Annulation du cadeau de bienvenue', null, null,
                self::reversalKey((int) $user->id, (int) $commande->id), PointsService::BUCKET_GIFT);
            if (! $tx->wasRecentlyCreated) {
                return;
            }
            if ($recovered < $points) {
                Log::warning('Welcome bonus reversal recovered only part of the bonus', [
                    'user_id' => $user->id, 'commande_id' => $commande->id,
                    'points' => $points, 'recovered' => $recovered,
                ]);
            }
            DB::table('welcome_bonus_claims')->where('user_id', $user->id)->update([
                'points' => $recovered,
                'credited_at' => null, 'unlocked_by_commande_id' => null, 'unlock_phone_hash' => null,
            ]);
            User::whereKey($user->id)->update(['welcome_bonus_awarded_at' => null]);
        });
    }
    /**
     * Rule 21 (welcome_bonus.unique_delivery_phone, default OFF): gift Protinas do not apply when the
     * delivery phone belongs to ANOTHER account's welcome claim (its verified phone, the phone that
     * unlocked it, or the phone its gift was first used with). Earned Protinas are never affected.
     */
    public static function deliveryPhoneUsedByAnotherClaim(User $user, ?string $deliveryPhone): bool
    {
        if (! config('welcome_bonus.unique_delivery_phone', false) || trim((string) $deliveryPhone) === ''
            || ! Schema::hasTable('welcome_bonus_claims')) {
            return false;
        }
        try {
            $hash = PhoneVerificationService::fingerprint(PhoneVerificationService::normalize((string) $deliveryPhone));
        } catch (ValidationException) {
            return false;
        }
        $columns = array_values(array_filter(['phone_hash', 'unlock_phone_hash', 'used_phone_hash'],
            fn (string $column) => Schema::hasColumn('welcome_bonus_claims', $column)));
        if ($columns === []) {
            return false;
        }

        return DB::table('welcome_bonus_claims')->where('user_id', '<>', $user->id)
            ->where(function ($q) use ($columns, $hash): void {
                foreach ($columns as $column) {
                    $q->orWhere($column, $hash);
                }
            })
            ->exists();
    }

    /** First use of the gift: remember the delivery phone and the order (audit + rule 21). */
    public static function markGiftUse(User $user, int $commandeId, ?string $deliveryPhone): void
    {
        if (! Schema::hasTable('welcome_bonus_claims') || ! Schema::hasColumn('welcome_bonus_claims', 'used_by_commande_id')) {
            return;
        }
        $hash = null;
        try {
            $hash = trim((string) $deliveryPhone) === '' ? null
                : PhoneVerificationService::fingerprint(PhoneVerificationService::normalize((string) $deliveryPhone));
        } catch (ValidationException) {
            $hash = null;
        }
        $update = ['used_by_commande_id' => $commandeId];
        if (Schema::hasColumn('welcome_bonus_claims', 'used_phone_hash')) {
            $update['used_phone_hash'] = $hash;
        }
        DB::table('welcome_bonus_claims')->where('user_id', $user->id)->whereNotNull('credited_at')
            ->whereNull('used_by_commande_id')->update($update);
    }
}
