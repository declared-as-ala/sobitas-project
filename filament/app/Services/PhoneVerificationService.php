<?php

namespace App\Services;

use App\Models\User;
use App\Models\Commande;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class PhoneVerificationService
{
    public const EXPIRY_SECONDS = 180;
    public const RESEND_SECONDS = 60;
    public const BONUS_DT = 15;
    public const BONUS_POINTS = self::BONUS_DT * PointsService::REDEEM_POINTS_PER_DT;
    public const MAX_ATTEMPTS = 5;

    public static function bonusPoints(): int { return (int) config('welcome_bonus.points', self::BONUS_POINTS); }
    public static function bonusValueDt(): float { return round(self::bonusPoints() / PointsService::pointsPerDt(), 3); }

    public static function normalize(string $value): string
    {
        $digits = preg_replace('/\D/', '', $value);
        if (str_starts_with($digits, '00216')) $digits = substr($digits, 5);
        elseif (strlen($digits) === 11 && str_starts_with($digits, '216')) $digits = substr($digits, 3);
        if (! preg_match('/^[2459]\d{7}$/', $digits)) {
            throw ValidationException::withMessages(['phone' => 'Saisissez un mobile tunisien valide à 8 chiffres.']);
        }
        return '+216'.$digits;
    }

    public static function fingerprint(string $value): string
    {
        return hash_hmac('sha256', $value, (string) config('app.key'));
    }

    /** Read-only state shared by the profile, proof response and catch-up action. */
    public function bonusStatus(User $user): string
    {
        $claim = DB::table('welcome_bonus_claims')->where('user_id', $user->id)->first();
        if ($claim) {
            if ($claim->credited_at !== null) return 'awarded';
            // Kill switch off: a claim reserved while it was on is released on request, so the
            // storefront offers 'Recevoir mes 15 DT' instead of an 'en attente' badge.
            return config('welcome_bonus.unlock_on_first_delivery', true) ? 'pending' : 'claimable';
        }
        if ($user->welcome_bonus_awarded_at) return 'awarded';
        if (! config('welcome_bonus.enabled')) return 'paused';
        if ((int) $user->role_id !== 2 || (! config('welcome_bonus.include_existing_customers') && ! $user->welcome_bonus_eligible)) return 'not_eligible';
        if (! $user->phone_verified_at) return 'phone_required';
        try {
            $phoneHash = self::fingerprint(self::normalize((string) $user->phone));
        } catch (ValidationException $e) {
            return 'phone_required';
        }
        $claimed = DB::table('welcome_bonus_claims')->where('phone_hash', $phoneHash)
            ->orWhere('email_hash', self::fingerprint(strtolower(trim((string) $user->email))))->exists();
        return $claimed ? 'already_used' : 'claimable';
    }

    /** Caller holds the user row lock. Claim + ledger + balance commit together. */
    private function awardWelcomeBonus(User $user): bool
    {
        $unlockOnDelivery = (bool) config('welcome_bonus.unlock_on_first_delivery', true);
        $welcome = app(WelcomeBonusService::class);
        // Kill switch off: a claim reserved while it was on is credited now (claim button or
        // re-verification); otherwise nothing but a delivery could ever release it.
        if (! $unlockOnDelivery && DB::table('welcome_bonus_claims')->where('user_id', $user->id)
            ->whereNull('credited_at')->exists()) {
            // Reserved under the delivery-unlock terms (before Protinas v3): grandfathered, no expiry —
            // the same release the deploy migration and protinas:welcome-release-pending perform.
            return $welcome->creditPending($user, true);
        }
        if ($this->bonusStatus($user) !== 'claimable') return false;
        $points = self::bonusPoints();
        $claimed = DB::table('welcome_bonus_claims')->insertOrIgnore([
            'user_id' => $user->id,
            'phone_hash' => self::fingerprint(self::normalize((string) $user->phone)),
            'email_hash' => self::fingerprint(strtolower(trim((string) $user->email))),
            'points' => $points, 'credited_at' => null, 'created_at' => now(),
        ]);
        if ($claimed !== 1) return false;
        $user->forceFill(['welcome_bonus_eligible' => false])->saveQuietly();
        if (! $unlockOnDelivery) {
            return $welcome->creditPending($user);
        }
        // An account that already has a delivered order is credited now, through the same path as
        // a delivery-time unlock: that order is recorded as the unlocking one (so returning it sends
        // the bonus back to pending), the delivery-phone uniqueness rule applies, and the ledger key
        // is versioned per order.
        $delivered = Commande::query()->where('authenticated_user_id', $user->id)
            ->whereIn('etat', PointsService::DELIVERED_STATUSES)->orderBy('id')->first();

        return $delivered ? $welcome->unlockOnDelivery($user, $delivered) : false;
    }

    /** When the account's welcome gift expires (null = never, or no welcome credit yet). */
    public static function welcomeGiftExpiresAt(User $user): ?\Illuminate\Support\Carbon
    {
        if (! \Illuminate\Support\Facades\Schema::hasColumn('user_point_transactions', 'expires_at')
            || ! \Illuminate\Support\Facades\Schema::hasColumn('user_point_transactions', 'idempotency_key')) {
            return null;
        }
        $expires = DB::table('user_point_transactions')->where('user_id', $user->id)
            ->where('idempotency_key', 'like', 'welcome:'.$user->id.':unlock:%')
            ->orderByDesc('id')->value('expires_at');

        return $expires ? \Illuminate\Support\Carbon::parse($expires) : null;
    }

    private function result(User $user, bool $awarded): array
    {
        $points = self::bonusPoints();
        $valueDt = self::bonusValueDt();
        $expiresAt = self::welcomeGiftExpiresAt($user);
        $fullFrom = app(OrderBudget::class)->giftFullFromDt($points);
        $awardedMessage = $points.' Protinas cadeau ajoutées : '.$valueDt.' DT'
            .($expiresAt ? ' à utiliser avant le '.$expiresAt->format('d/m/Y') : ' à utiliser sur votre prochaine commande')
            .($fullFrom ? ', en entier dès '.$fullFrom.' DT d’articles.' : '.');
        return [
            'bonus_expires_at' => $expiresAt?->toIso8601String(),
            'gift_full_from_dt' => $fullFrom,
            'message' => $awarded
                ? $awardedMessage
                : ($this->bonusStatus($user) === 'pending'
                    ? 'Téléphone vérifié. Vos '.$points.' Protinas ('.$valueDt.' DT) seront créditées à la livraison de votre première commande.'
                    : 'Votre téléphone est vérifié.'),
            'phone_verified' => $user->phone_verified_at !== null,
            'phone' => $user->phone,
            'bonus_awarded' => $awarded,
            'bonus_pending' => $this->bonusStatus($user) === 'pending',
            'bonus_status' => $this->bonusStatus($user),
            'bonus_points' => $awarded ? $points : 0,
            'points_balance' => (int) $user->points_balance,
            'points_value_dt' => app(PointsService::class)->pointsToDt((int) $user->points_balance),
        ];
    }

    /** Explicit, idempotent catch-up for a phone already proved before offer expansion. */
    public function claimWelcomeBonus(User $user): array
    {
        return DB::transaction(function () use ($user) {
            $locked = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            if (! $locked->phone_verified_at || $this->bonusStatus($locked) === 'phone_required') {
                throw ValidationException::withMessages(['phone' => 'Vérifiez votre téléphone pour recevoir vos points.']);
            }
            return $this->result($locked, $this->awardWelcomeBonus($locked));
        });
    }

    public function send(User $user, string $phone, string $ip): array
    {
        $phone = self::normalize($phone);

        if ($user->phone_verified_at !== null && hash_equals((string) $user->phone, $phone)) {
            return $this->result($user->refresh(), false) + [
                'already_verified' => true,
                'expires_in' => 0,
                'resend_after' => 0,
                'masked_phone' => $this->mask($phone),
            ];
        }

        $phoneHash = self::fingerprint($phone);
        $ipHash = self::fingerprint($ip);
        $code = (string) random_int(100000, 999999);
        // Serialize the SHORT allocation only, never the gateway round-trip. This protects
        // quotas across accounts/IPs and concurrent requests, including failed paid sends.
        $otpId = Cache::lock('phone-otp:allocation', 10)->block(3, function () use ($user, $phone, $phoneHash, $ipHash, $code) {
            $query = DB::table('phone_verification_otps');
            $recent = (clone $query)->where(function ($q) use ($user, $phoneHash) {
                $q->where('user_id', $user->id)->orWhere('phone_hash', $phoneHash);
            });
            if ((clone $recent)->where('created_at', '>', now()->subSeconds(self::RESEND_SECONDS))->exists()) {
                throw ValidationException::withMessages(['phone' => 'Patientez une minute avant de renvoyer un code.']);
            }
            // Layered spending protection. A bot must pass registration/auth, then still hits
            // per-account, per-phone, per-IP and shop-wide ceilings before a paid gateway call.
            if ((clone $recent)->where('created_at', '>=', now()->subHour())->count() >= 3
                || (clone $recent)->where('created_at', '>=', now()->subDay())->count() >= 5
                || (clone $query)->where('ip_hash', $ipHash)->where('created_at', '>=', now()->subHour())->count() >= 5
                || (clone $query)->where('ip_hash', $ipHash)->where('created_at', '>=', now()->subDay())->count() >= 15
                || (clone $query)->where('created_at', '>=', now()->subDay())->count() >= (int) config('welcome_bonus.daily_sms_limit', 100)) {
                throw ValidationException::withMessages(['phone' => 'Limite d’envoi atteinte. Réessayez plus tard ou contactez-nous.']);
            }
            return DB::transaction(function () use ($user, $phone, $phoneHash, $ipHash, $code) {
                DB::table('phone_verification_otps')->where('user_id', $user->id)->whereNull('consumed_at')->update(['consumed_at' => now()]);
                return DB::table('phone_verification_otps')->insertGetId([
                    'user_id' => $user->id, 'phone' => $phone, 'phone_hash' => $phoneHash,
                    'ip_hash' => $ipHash,
                    'code_hash' => Hash::make($code), 'status' => 'sending', 'attempts' => 0,
                    'expires_at' => now()->addSeconds(self::EXPIRY_SECONDS),
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            });
        });
        try {
            // One short GSM-7 SMS. No automatic retries: an ambiguous gateway timeout may
            // already have purchased a message. Plain OTPs never enter a queue or our logs.
            app(SmsService::class)->send_sms($phone, "Protein.tn : votre code est {$code}. Valable 3 minutes. Ne le partagez avec personne.");
            DB::table('phone_verification_otps')->where('id', $otpId)->update(['status' => 'sent']);
        } catch (\Throwable $e) {
            DB::table('phone_verification_otps')->where('id', $otpId)->update(['status' => 'failed', 'consumed_at' => now()]);
            throw ValidationException::withMessages(['phone' => 'Le SMS n’a pas pu être confirmé. Réessayez dans une minute.']);
        }
        $expiresAt = \Illuminate\Support\Carbon::parse(DB::table('phone_verification_otps')->where('id', $otpId)->value('expires_at'));
        return [
            'message' => 'Code envoyé par SMS.',
            'expires_in' => max(0, (int) ceil(now()->diffInSeconds($expiresAt, false))),
            'resend_after' => self::RESEND_SECONDS,
            'phone' => $phone,
            'masked_phone' => $this->mask($phone),
            'attempts_remaining' => self::MAX_ATTEMPTS,
        ];
    }

    /** Recover the active challenge after refresh without sending another paid SMS. */
    public function status(User $user): array
    {
        if ($user->phone_verified_at !== null) {
            return [
                'active' => false,
                'phone_verified' => true,
                'phone' => $user->phone,
                'masked_phone' => $this->mask((string) $user->phone),
            ];
        }

        $otp = DB::table('phone_verification_otps')
            ->where('user_id', $user->id)
            ->where('status', 'sent')
            ->whereNull('consumed_at')
            ->orderByDesc('id')
            ->first();
        if (! $otp || now()->gte($otp->expires_at) || (int) $otp->attempts >= self::MAX_ATTEMPTS) {
            return ['active' => false, 'phone_verified' => false];
        }

        $createdAt = \Illuminate\Support\Carbon::parse($otp->created_at);
        return [
            'active' => true,
            'phone_verified' => false,
            'phone' => $otp->phone,
            'masked_phone' => $this->mask($otp->phone),
            'expires_in' => max(0, (int) ceil(now()->diffInSeconds(\Illuminate\Support\Carbon::parse($otp->expires_at), false))),
            'resend_after' => max(0, self::RESEND_SECONDS - (int) floor($createdAt->diffInSeconds(now()))),
            'attempts_remaining' => max(0, self::MAX_ATTEMPTS - (int) $otp->attempts),
        ];
    }

    private function mask(string $phone): string
    {
        try {
            $normalized = self::normalize($phone);
        } catch (ValidationException) {
            return 'votre numéro';
        }

        return substr($normalized, 0, 7).' ** *** '.substr($normalized, -2);
    }

    public function verify(User $user, string $code): array
    {
        // Return errors AFTER the transaction, otherwise failed attempts would roll back.
        $result = DB::transaction(function () use ($user, $code) {
            $locked = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $otp = DB::table('phone_verification_otps')->where('user_id', $user->id)
                ->whereNull('consumed_at')->orderByDesc('id')->lockForUpdate()->first();
            if (! $otp || $otp->status !== 'sent' || now()->gte($otp->expires_at)) return ['error' => 'Code expiré. Demandez un nouveau code.'];
            if ($otp->attempts >= self::MAX_ATTEMPTS) return ['error' => 'Trop de tentatives. Demandez un nouveau code.'];
            DB::table('phone_verification_otps')->where('id', $otp->id)->increment('attempts');
            if (! Hash::check($code, $otp->code_hash)) {
                if (((int) $otp->attempts + 1) >= self::MAX_ATTEMPTS) {
                    DB::table('phone_verification_otps')->where('id', $otp->id)->update(['consumed_at' => now()]);
                    return ['error' => 'Trop de tentatives. Demandez un nouveau code.'];
                }
                return ['error' => 'Code incorrect. Vérifiez les 6 chiffres reçus.'];
            }

            DB::table('phone_verification_otps')->where('id', $otp->id)->update(['consumed_at' => now()]);
            $locked->forceFill(['phone' => $otp->phone, 'phone_verified_at' => now()])->saveQuietly();
            return $this->result($locked, $this->awardWelcomeBonus($locked));
        });
        if (isset($result['error'])) throw ValidationException::withMessages(['code' => $result['error']]);
        return $result;
    }
}
