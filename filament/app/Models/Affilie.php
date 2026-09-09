<?php

namespace App\Models;

use App\Enums\AffilieStatus;
use App\Enums\AffilieType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Affilie extends Model
{
    /**
     * KYC review states. Mirrors the comment on `kyc_status` in migration 2026_09_09_120100.
     *
     * `pending`   — nothing uploaded yet.
     * `submitted` — both sides uploaded, waiting for a human.
     * `approved` / `rejected` — a human decided.
     */
    public const KYC_PENDING = 'pending';

    public const KYC_SUBMITTED = 'submitted';

    public const KYC_APPROVED = 'approved';

    public const KYC_REJECTED = 'rejected';

    /**
     * ── WHAT IS DELIBERATELY ABSENT FROM THIS LIST ───────────────────────────────────────────
     * `kyc_id_front`, `kyc_id_back`, `kyc_status` and every `*_reviewed_*` column are NOT
     * fillable. They are file paths and review verdicts; a mass-assignable path column means a
     * crafted request can point an affiliate's identity document at any file the disk can read,
     * and a mass-assignable verdict means an applicant approves themselves. They are written only
     * through AffilieKycService and the admin actions, with forceFill.
     *
     * Balances (`current_balance`, `total_earned`, `total_paid`) stay fillable because the legacy
     * admin forms already rely on it — but nothing in the public application path touches them.
     */
    protected $fillable = [
        'user_id',
        'type',
        'name',
        'business_name',
        'email',
        'phone',
        'address',
        'city',
        'avatar',
        'status',
        'commission_rate',
        'default_commission_rate',
        'current_balance',
        'total_earned',
        'total_paid',
        'payment_method',
        'bank_name',
        'rib_or_iban',
        'payout_notes',
        'admin_notes',
        'notes',
        // Public application intake — see migration 2026_09_09_130000.
        'audience_size',
        'application_message',
        'referred_by_code',
        'reference',
        'applied_at',
    ];

    protected $casts = [
        'type' => AffilieType::class,
        'status' => AffilieStatus::class,
        'commission_rate' => 'float',
        'default_commission_rate' => 'float',
        'current_balance' => 'float',
        'total_earned' => 'float',
        'total_paid' => 'float',
        'applied_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'kyc_submitted_at' => 'datetime',
        'kyc_reviewed_at' => 'datetime',
        'phone_verified_at' => 'datetime',
        'email_verified_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function codes(): HasMany
    {
        return $this->hasMany(AffilieCode::class);
    }

    /** @deprecated Use codes() — alias for older relation name */
    public function coupons(): HasMany
    {
        return $this->codes();
    }

    public function affilieTransactions(): HasMany
    {
        return $this->hasMany(AffilieTransaction::class);
    }

    /** @deprecated Prefer affilieTransactions() */
    public function commissionTransactions(): HasMany
    {
        return $this->affilieTransactions();
    }

    public function payouts(): HasMany
    {
        return $this->hasMany(AffiliePayout::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'affilie_id');
    }

    public function isActive(): bool
    {
        return $this->status === AffilieStatus::Active;
    }

    public function isPending(): bool
    {
        return $this->status === AffilieStatus::Pending;
    }

    /** Both sides of the identity card are on file. */
    public function hasKycDocuments(): bool
    {
        return filled($this->getAttribute('kyc_id_front')) && filled($this->getAttribute('kyc_id_back'));
    }

    /** @param Builder<self> $query */
    public function scopeForEmail(Builder $query, string $email): Builder
    {
        return $query->whereRaw('LOWER(email) = ?', [mb_strtolower(trim($email))]);
    }

    /**
     * A public reference the applicant can quote to support.
     *
     * Random rather than derived from the id: see migration 2026_09_09_130000. The alphabet drops
     * I, O, 0 and 1 because this string gets read aloud down a phone line.
     */
    public static function generateReference(): string
    {
        do {
            // Str::random(64) then filtered: 64 raw characters always leave far more than the 8
            // wanted after the ambiguous ones are dropped, so the loop never spins on a short draw.
            $token = 'AFF-'.substr((string) preg_replace('/[^A-HJ-NP-Z2-9]/', '', Str::upper(Str::random(64))), 0, 8);
        } while (strlen($token) !== 12 || static::query()->where('reference', $token)->exists());

        return $token;
    }

    public function effectiveCommissionRate(): float
    {
        $attrs = $this->getAttributes();

        return (float) ($attrs['commission_rate'] ?? $attrs['default_commission_rate'] ?? 10);
    }

    public static function availableCommissionRoleId(): int
    {
        return (int) config('affilies.affilie_role_id', 4);
    }
}
