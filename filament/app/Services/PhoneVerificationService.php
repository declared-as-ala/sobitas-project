<?php

namespace App\Services;

use App\Models\User;
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

    private static function fingerprint(string $value): string
    {
        return hash_hmac('sha256', $value, (string) config('app.key'));
    }

    /** Read-only state shared by the profile, proof response and catch-up action. */
    public function bonusStatus(User $user): string
    {
        if ($user->welcome_bonus_awarded_at || DB::table('welcome_bonus_claims')->where('user_id', $user->id)->exists()) return 'awarded';
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
        if ($this->bonusStatus($user) !== 'claimable') return false;
        $claimed = DB::table('welcome_bonus_claims')->insertOrIgnore([
            'user_id' => $user->id,
            'phone_hash' => self::fingerprint(self::normalize((string) $user->phone)),
            'email_hash' => self::fingerprint(strtolower(trim((string) $user->email))),
            'points' => self::BONUS_POINTS, 'created_at' => now(),
        ]);
        if ($claimed !== 1) return false;
        app(PointsService::class)->record($user, 'earn', self::BONUS_POINTS, 'Cadeau de bienvenue — 15 DT en points');
        $user->forceFill(['welcome_bonus_awarded_at' => now(), 'welcome_bonus_eligible' => false])->saveQuietly();
        return true;
    }

    private function result(User $user, bool $awarded): array
    {
        return [
            'message' => $awarded ? '300 points ajoutés : 15 DT pour vos prochains achats.' : 'Votre téléphone est vérifié.',
            'phone_verified' => $user->phone_verified_at !== null,
            'phone' => $user->phone,
            'bonus_awarded' => $awarded,
            'bonus_status' => $this->bonusStatus($user),
            'bonus_points' => $awarded ? self::BONUS_POINTS : 0,
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
            if ((clone $recent)->where('created_at', '>=', now()->subHour())->count() >= 5
                || (clone $recent)->where('created_at', '>=', now()->subDay())->count() >= 10
                || (clone $query)->where('ip_hash', $ipHash)->where('created_at', '>=', now()->subHour())->count() >= 10
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
        return ['message' => 'Code envoyé par SMS.', 'expires_in' => max(0, (int) ceil(now()->diffInSeconds($expiresAt, false))), 'resend_after' => self::RESEND_SECONDS, 'phone' => $phone];
    }

    public function verify(User $user, string $code): array
    {
        // Return errors AFTER the transaction, otherwise failed attempts would roll back.
        $result = DB::transaction(function () use ($user, $code) {
            $locked = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $otp = DB::table('phone_verification_otps')->where('user_id', $user->id)
                ->whereNull('consumed_at')->orderByDesc('id')->lockForUpdate()->first();
            if (! $otp || $otp->status !== 'sent' || now()->gte($otp->expires_at)) return ['error' => 'Code expiré. Demandez un nouveau code.'];
            if ($otp->attempts >= 5) return ['error' => 'Trop de tentatives. Demandez un nouveau code.'];
            DB::table('phone_verification_otps')->where('id', $otp->id)->increment('attempts');
            if (! Hash::check($code, $otp->code_hash)) return ['error' => 'Code incorrect. Vérifiez les 6 chiffres reçus.'];

            DB::table('phone_verification_otps')->where('id', $otp->id)->update(['consumed_at' => now()]);
            $locked->forceFill(['phone' => $otp->phone, 'phone_verified_at' => now()])->saveQuietly();
            return $this->result($locked, $this->awardWelcomeBonus($locked));
        });
        if (isset($result['error'])) throw ValidationException::withMessages(['code' => $result['error']]);
        return $result;
    }
}
