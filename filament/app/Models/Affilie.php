<?php

namespace App\Models;

use App\Enums\AffiliePayoutMethod;
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
        'payment_method_requested',
        'payment_method_requested_at',
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
        /*
         * Admin-assigned vanity hostname (`ali` → ali.protein.tn). Fillable because the admin form
         * is the only thing that writes it — the public application path uses forceFill() with
         * explicit key lists and never touches it, and nothing in the storefront can reach a
         * mass-assign on this model at all. It is a routing label, not a verdict or a file path, so
         * it does not belong in the excluded set above.
         */
        'subdomain',
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
        'payment_method_requested_at' => 'datetime',
    ];

    /**
     * The payout method that actually applies, defaulting to Aramex (the legacy `bank` value, now
     * "Livraison Aramex (colis)") when the affiliate never chose one. Every surface reads through
     * this so an unset method reads as Aramex rather than "Non renseigné", without a data backfill.
     */
    public function effectivePaymentMethod(): AffiliePayoutMethod
    {
        return AffiliePayoutMethod::tryFrom((string) $this->payment_method) ?? AffiliePayoutMethod::Bank;
    }

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

    /*
     * ── VANITY SUBDOMAINS: `ali.protein.tn` IS THE REFERRAL ──────────────────────────────────
     *
     * Owner: "for each affiliate something like x.protein.tn … he sends it, and we detect that this
     * website is opened from an affiliate subdomain."
     *
     * The storefront is SERVED on that hostname (frontend middleware stamps an attribution cookie
     * and next.config.js puts `X-Robots-Tag: noindex, nofollow` on every non-apex host so no
     * duplicate copy of the catalogue is ever indexed). Everything below is the authority half:
     * what a valid label is, which ones are refused, and how a label becomes an affiliate row.
     */

    /**
     * A hostname label: 1–32 characters, lowercase alphanumerics and hyphens, never leading or
     * trailing a hyphen. Deliberately narrower than the DNS spec — no uppercase, no underscore, no
     * punycode — because this string is printed on a poster and read aloud down a phone line.
     */
    public const SUBDOMAIN_PATTERN = '/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/';

    /**
     * Labels that are infrastructure, not affiliates.
     *
     * MIRRORED IN TYPESCRIPT: `frontend/src/util/affiliateHost.ts` → `RESERVED_SUBDOMAINS`. That
     * copy decides whether a live request attributes; this one decides what an admin is allowed to
     * save. If the two disagree, an admin can assign a subdomain that silently never attributes —
     * which looks exactly like a broken feature and is very hard to diagnose from the outside. Add
     * a name to both, or to neither.
     *
     * @var list<string>
     */
    public const RESERVED_SUBDOMAINS = [
        'www', 'admin', 'dev', 'files', 'next', 'api', 'affilie', 'affilies', 'app', 'assets',
        'blog', 'cdn', 'ftp', 'imap', 'img', 'images', 'localhost', 'mail', 'media', 'ns1', 'ns2',
        'pop', 'preview', 'shop', 'smtp', 'staging', 'static', 'store', 'test', 'webmail',
    ];

    /**
     * Fold a hand-typed value into the one canonical form, or null.
     *
     * Admins paste `Coach-Ali.protein.tn`, `https://ali.protein.tn/` and ` ALI ` — all three mean
     * the same affiliate, and storing three spellings in a UNIQUE column means the second one is
     * rejected as a duplicate of nothing. An empty result is null rather than '', because the
     * unique index treats NULLs as distinct and '' as a value: two affiliates with no subdomain
     * would otherwise collide with each other.
     */
    public static function normalizeSubdomain(?string $value): ?string
    {
        $raw = mb_strtolower(trim((string) $value));
        if ($raw === '') {
            return null;
        }
        // Tolerate a pasted URL or a full hostname; keep only the first label.
        $raw = (string) preg_replace('#^[a-z]+://#', '', $raw);
        $raw = explode('/', $raw)[0];
        $raw = explode('.', $raw)[0];

        return $raw === '' ? null : $raw;
    }

    /** Is this a label this shop will attribute on? */
    public static function isValidSubdomain(?string $value): bool
    {
        if (! is_string($value) || $value === '') {
            return false;
        }
        if (str_starts_with($value, 'xn--')) {
            return false;
        }

        return preg_match(self::SUBDOMAIN_PATTERN, $value) === 1
            && ! in_array($value, self::RESERVED_SUBDOMAINS, true);
    }

    /**
     * The ACTIVE affiliate owning a subdomain, or null.
     *
     * Status is part of the question, not a detail: a suspended or still-pending affiliate's
     * hostname must resolve to nothing, exactly as AffilieCodeController refuses to preview their
     * code. Otherwise a suspension would stop the money and leave the traffic attributed.
     */
    public static function resolveActiveBySubdomain(?string $value): ?self
    {
        $sub = static::normalizeSubdomain($value);
        if (! static::isValidSubdomain($sub)) {
            return null;
        }
        if (! \Illuminate\Support\Facades\Schema::hasColumn((new static)->getTable(), 'subdomain')) {
            return null;
        }

        return static::query()
            ->where('subdomain', $sub)
            ->where('status', AffilieStatus::Active->value)
            ->first();
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

    /**
     * ── THIS PERCENTAGE IS A MARKUP NOW, NOT A SHARE OF AN ORDER ─────────────────────────────
     * It used to mean "percent of order value". Under the reseller model it does not: the shop is
     * owed `products.prix_affilie` and the affiliate keeps whatever they charge above it, so a cut
     * of the order total has nothing to divide. What survives is the DEFAULT MARKUP — the one
     * number an affiliate sets once so that a selling price can be suggested for every product at
     * once, instead of pricing ~11,000 of them by hand. Any single line may still be overridden.
     *
     * ── WHY TWO COLUMN NAMES AND ONE NUMBER ──────────────────────────────────────────────────
     * Migration 2026_05_08_160000 renamed `default_commission_rate` to `commission_rate`. A
     * database restored from before that rename still carries the old name, so both are read here
     * and the live one wins. This is also what keeps a SECOND admin field from appearing: exactly
     * one input in AffilieResource writes this value, because two percentages meaning almost the
     * same thing is how the wrong one gets used.
     *
     * Kept under its old name because AffilieTransactionService calls it.
     * New code should prefer defaultMarkupPercent(), which says what the number now means.
     */
    public function effectiveCommissionRate(): float
    {
        $attrs = $this->getAttributes();

        return (float) ($attrs['commission_rate'] ?? $attrs['default_commission_rate'] ?? 10);
    }

    /**
     * The default markup, in percent, applied on top of `products.prix_affilie`.
     *
     * The same stored number as effectiveCommissionRate() — not a second setting — named for what
     * it means under the reseller model.
     */
    public function defaultMarkupPercent(): float
    {
        // Clamped rather than honoured if negative: a negative markup would suggest a price BELOW
        // `prix_affilie`, which validateSellingPrice() then refuses. The form would be proposing a
        // number its own guard rail rejects, and the affiliate would read that as a broken page
        // rather than as a misconfigured rate.
        return max(0.0, $this->effectiveCommissionRate());
    }

    /**
     * The selling price to pre-fill for this product: `prix_affilie` plus the default markup.
     *
     * Null when the product is not sellable by affiliates. That answer comes from
     * Product::affiliateBasePrice() and from nowhere else, so "is this product priced" has one
     * home; re-testing `prix_affilie` here would be a second rule to keep in sync.
     *
     * Rounded to 3 decimals because TND carries three and the ledger it feeds
     * (`affilie_transactions.amount`, decimal(14,3)) rounds the same way. A suggestion carrying a
     * fourth decimal would settle into a spread the affiliate was never shown.
     */
    public function suggestedSellingPrice(Product $product): ?float
    {
        $base = $product->affiliateBasePrice();

        if ($base === null) {
            return null;
        }

        return round($base * (1 + ($this->defaultMarkupPercent() / 100)), 3);
    }

    /**
     * ── GUARD RAIL: A SELLING PRICE MAY NEVER SIT BELOW THE AFFILIATE PRICE ──────────────────
     * The spread IS the earning:
     *
     *     earning = (unit selling price − prix_affilie) × quantity
     *
     * so a selling price under `prix_affilie` does two things at once. It hands the shop less than
     * it is owed for stock already shipped, and it books a NEGATIVE commission that quietly eats
     * the affiliate's balance. Neither is visible on the order; both surface only when the ledger
     * is reconciled, by which time the parcel is gone. Refuse it at the edge instead.
     *
     * Equality is allowed on purpose: selling at exactly `prix_affilie` earns nothing, which an
     * affiliate is entitled to choose. The comparison carries the same 0.0001 epsilon
     * AffilieTransactionService uses throughout, so a value that rounds onto the base price is not
     * rejected by a float artefact.
     *
     * Throws rather than returning a bool, and reports through __() like the service does, so a
     * caller cannot ignore the answer by forgetting to check it.
     *
     * @throws \InvalidArgumentException
     */
    public function validateSellingPrice(Product $product, float $sellingPrice): void
    {
        $base = $product->affiliateBasePrice();

        if ($base === null) {
            throw new \InvalidArgumentException(__('Le produit « :produit » n’a pas de prix affilié : il ne peut pas être vendu par un affilié.', [
                'produit' => (string) ($product->getAttribute('designation_fr') ?: $product->getKey()),
            ]));
        }

        if (round($sellingPrice, 3) + 0.0001 < $base) {
            throw new \InvalidArgumentException(__('Le prix de vente (:vente DT) ne peut pas être inférieur au prix affilié (:base DT).', [
                'vente' => number_format(round($sellingPrice, 3), 3, ',', ' '),
                'base' => number_format($base, 3, ',', ' '),
            ]));
        }
    }

    public static function availableCommissionRoleId(): int
    {
        return (int) config('affilies.affilie_role_id', 4);
    }
}
