<?php

namespace App\Services;

use App\Mail\EmailVerificationOtpMail;
use App\Models\EmailVerificationOtp;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class EmailVerificationOtpService
{
    public const EXPIRY_MINUTES = 10;
    public const RESEND_SECONDS = 60;
    public const MAX_SENDS_PER_HOUR = 5;
    public const MAX_ATTEMPTS = 5;

    public function send(User $user): void
    {
        if ($user->hasVerifiedEmail()) {
            return;
        }

        $latest = EmailVerificationOtp::where('user_id', $user->id)->whereNull('consumed_at')->latest()->first();
        if ($latest && $latest->created_at->gt(now()->subSeconds(self::RESEND_SECONDS))) {
            throw ValidationException::withMessages([
                'email' => 'Un code vient déjà d’être envoyé. Patientez une minute avant de réessayer.',
            ]);
        }
        if (EmailVerificationOtp::where('user_id', $user->id)->where('created_at', '>=', now()->subHour())->count() >= self::MAX_SENDS_PER_HOUR) {
            throw ValidationException::withMessages([
                'email' => 'Trop de codes demandés. Réessayez dans une heure.',
            ]);
        }

        $code = (string) random_int(100000, 999999);
        $otp = DB::transaction(function () use ($user, $code): EmailVerificationOtp {
            EmailVerificationOtp::where('user_id', $user->id)
                ->whereNull('consumed_at')
                ->update(['consumed_at' => now()]);
            return EmailVerificationOtp::create([
                'user_id' => $user->id,
                'code_hash' => Hash::make($code),
                'expires_at' => now()->addMinutes(self::EXPIRY_MINUTES),
            ]);
        });

        try {
            // The production stack has a dedicated Redis queue worker. Queueing removes the SMTP
            // round-trip from registration/resend. Authentication mail is processed first.
            Mail::to($user->email)->queue((new EmailVerificationOtpMail($user, $code))->onQueue('auth'));
        } catch (\Throwable $e) {
            // Do not make a transport failure consume the resend cooldown.
            $otp->delete();
            throw $e;
        }
    }

    public function verify(User $user, string $code): bool
    {
        if ($user->hasVerifiedEmail()) {
            return true;
        }

        $result = DB::transaction(function () use ($user, $code): string {
            $otp = EmailVerificationOtp::where('user_id', $user->id)
                ->whereNull('consumed_at')
                ->latest()
                ->lockForUpdate()
                ->first();

            if (! $otp || $otp->expires_at->isPast()) {
                return 'expired';
            }
            if ($otp->attempts >= self::MAX_ATTEMPTS) {
                return 'attempts';
            }

            $otp->increment('attempts');
            if (! Hash::check($code, $otp->code_hash)) {
                return 'invalid';
            }

            $otp->forceFill(['consumed_at' => now()])->save();
            $user->forceFill(['email_verified_at' => now()])->saveQuietly();

            return 'verified';
        });

        if ($result === 'expired') {
            throw ValidationException::withMessages(['code' => 'Ce code a expiré. Demandez-en un nouveau.']);
        }
        if ($result === 'attempts') {
            throw ValidationException::withMessages(['code' => 'Trop de tentatives. Demandez un nouveau code.']);
        }
        if ($result === 'invalid') {
            throw ValidationException::withMessages(['code' => 'Code incorrect.']);
        }

        // Verification must succeed even if legacy data is temporarily unavailable. Reconciliation
        // is repeated by the authenticated "Mes avis" endpoint, so this is safely retryable.
        try {
            app(VerifiedCustomerReviewService::class)->reconcile($user->fresh());
        } catch (\Throwable $e) {
            Log::warning('Verified customer review reconciliation failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }

        return true;
    }
}
