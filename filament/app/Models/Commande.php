<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Commande extends Model
{
    protected $table = 'commandes';

    public const STATUS_NEW = 'nouvelle_commande';

    protected $fillable = [
        'numero', 'order_token', 'nom', 'prenom', 'email', 'phone', 'pays', 'region', 'ville',
        'code_postale', 'adresse1', 'adresse2', 'etat', 'prix_ht', 'prix_ttc',
        'frais_livraison', 'remise', 'note', 'user_id', 'client_id', 'quotation_id', 'livraison',
        'livraison_nom', 'livraison_prenom', 'livraison_email', 'livraison_phone',
        'livraison_region', 'livraison_ville', 'livraison_code_postale',
        'livraison_adresse1', 'livraison_adresse2', 'sms_sent',
        'checkout_idempotency_key', 'checkout_payload_hash',
        'delivered_at', 'refund_amount', 'discount_amount', 'payment_method', 'is_returning_customer',
        'coupon_id', 'coupon_code_snapshot', 'coupon_type_snapshot', 'coupon_value_snapshot',
        'discount_ht', 'discount_ttc', 'stock_restored_at',
    ];

    protected $casts = [
        'prix_ht' => 'float',
        'prix_ttc' => 'float',
        'frais_livraison' => 'float',
        'remise' => 'float',
        'refund_amount' => 'float',
        'discount_amount' => 'float',
        'discount_ht' => 'float',
        'discount_ttc' => 'float',
        'sms_sent' => 'boolean',
        'is_returning_customer' => 'boolean',
        'delivered_at' => 'datetime',
        'stock_restored_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        // Every order gets a token, no matter which door it came in through.
        //
        // Only the storefront checkout generated one (CommandeController), so orders created in the
        // admin panel, by the POS, or by any import had none. Live count: 92 of 1,057. The token is
        // the ONLY way to build the login-free /avis/{token} review link, so ~91% of customers
        // could never have been asked for a review even once orders start being marked delivered.
        //
        // Set on creating() rather than in each controller so there is one place it can be missed:
        // none.
        static::creating(function (Commande $commande): void {
            if (empty($commande->order_token)) {
                try {
                    $commande->order_token = bin2hex(random_bytes(32));
                } catch (\Throwable $e) {
                    // Never block an order over a review link.
                    \Illuminate\Support\Facades\Log::warning('order_token generation failed', [
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // The short alias the SMS link uses. Same rule: never block an order over it, and
            // never assume the column exists — this runs on installs where the migration has not
            // been applied yet.
            if (empty($commande->review_code) && \Illuminate\Support\Facades\Schema::hasColumn('commandes', 'review_code')) {
                $commande->review_code = self::generateReviewCode();
            }
        });

        // Give stock back when an order is DELETED (unless a prior cancel already restored it —
        // guarded by stock_restored_at so cancel-then-delete can't restore twice). Hooked on the
        // Commande (parent), NOT CommandeDetail, because EditCommande already restores per line on
        // edit; a detail-level hook would double-restore. Best-effort: never block the delete.
        static::deleting(function (Commande $commande): void {
            if (! \Illuminate\Support\Facades\Schema::hasColumn('commandes', 'stock_restored_at')
                || $commande->stock_restored_at) {
                return;
            }
            try {
                \Illuminate\Support\Facades\DB::transaction(function () use ($commande): void {
                    $commande->loadMissing('details');
                    $ids = [];
                    foreach ($commande->details as $line) {
                        $q = (float) ($line->qte ?? 0);
                        if ($q <= 0) {
                            continue;
                        }
                        Product::where('id', $line->produit_id)->increment('qte', $q);
                        $ids[] = $line->produit_id;
                    }
                    if (! empty($ids)) {
                        Product::syncRuptureFlags($ids);
                    }
                });
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Stock restore on order delete failed', [
                    'commande_id' => $commande->id,
                    'error'       => $e->getMessage(),
                ]);
            }
        });
    }

    /**
     * A 10-character review code, from an alphabet with no 0/O/1/I/l.
     *
     * The excluded characters are not superstition: this code is read off a phone screen and
     * occasionally typed by hand, and a "0" that is really an "O" turns a review request into a
     * 404 with no way for the customer to tell which character betrayed them.
     *
     * Collision is checked rather than assumed. At 32^10 the birthday bound is astronomically far
     * from this shop's order count, but a unique index that throws on insert would abort the
     * ORDER, and no review link is worth losing a sale over.
     */
    public static function generateReviewCode(): string
    {
        $alphabet = '23456789abcdefghjkmnpqrstuvwxyz';

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $code = '';
            for ($i = 0; $i < 10; $i++) {
                $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
            if (! static::where('review_code', $code)->exists()) {
                return $code;
            }
        }

        // Five collisions in a row is not chance, it is a broken RNG. Fall back to something
        // guaranteed unique rather than looping forever.
        return substr(bin2hex(random_bytes(8)), 0, 10);
    }

    /**
     * Find an order from whatever the review link carried — the 64-character `order_token` from an
     * email, or the 10-character `review_code` from an SMS.
     *
     * One method, so the two review endpoints cannot come to disagree about which references are
     * valid. Length is the discriminator and the two spaces cannot overlap: a review code is 10
     * characters and a token is 64.
     */
    public static function findByReviewRef(?string $ref): ?self
    {
        $ref = trim((string) $ref);
        if ($ref === '') {
            return null;
        }

        if (strlen($ref) <= 16) {
            return \Illuminate\Support\Facades\Schema::hasColumn('commandes', 'review_code')
                ? static::where('review_code', $ref)->first()
                : null;
        }

        return static::where('order_token', $ref)->first();
    }

    // ── Status Labels (single source of truth) ────────────

    /**
     * THE 'livree' STATUS WAS MISSING, AND THAT IS WHY THIS SHOP HAS NO REVIEWS.
     *
     * The vocabulary ended at 'expidee'. There was no way to mark an order delivered — so nobody
     * ever did. Live database: 1,057 of 1,082 orders sit at 'nouvelle_commande' and not a single
     * one has ever been 'livree'.
     *
     * Two features wait on that status and have therefore never once run:
     *   - the post-delivery review request (CommandeObserver -> SendDueReviewRequests), which is
     *     the only source of purchase-attested reviews, which are the only thing that can put a
     *     star rating on a product page;
     *   - loyalty points, which PointsService awards on the transition to delivered.
     *
     * PointsService::DELIVERED_STATUSES has always been ['livree','livrée','livre'] — it was
     * waiting for a value the interface could not produce. Adding it here makes the option real
     * everywhere, because this list is the single source of truth for labels, colours and the
     * admin dropdown.
     */
    private const STATUS_LABELS = [
        'nouvelle_commande'       => 'Nouvelle',
        'en_cours_de_preparation' => 'Préparation',
        'prete'                   => 'Prête',
        'en_cours_de_livraison'   => 'Livraison',
        'expidee'                 => 'Expédiée',
        'livree'                  => 'Livrée',
        'annuler'                 => 'Annulée',
    ];

    private const STATUS_COLORS = [
        'nouvelle_commande'       => 'warning',
        'en_cours_de_preparation' => 'info',
        'prete'                   => 'primary',
        'en_cours_de_livraison'   => 'gray',
        'expidee'                 => 'info',
        'livree'                  => 'success',
        'annuler'                 => 'danger',
    ];

    public static function getStatusLabel(string $status): string
    {
        return self::STATUS_LABELS[$status] ?? $status;
    }

    public static function getStatusColor(string $status): string
    {
        return self::STATUS_COLORS[$status] ?? 'gray';
    }

    public static function getStatusOptions(): array
    {
        return [
            'nouvelle_commande'       => 'Nouvelle Commande',
            'en_cours_de_preparation' => 'En cours de préparation',
            'prete'                   => 'Prête',
            'en_cours_de_livraison'   => 'En cours de livraison',
            'expidee'                 => 'Expédiée',
            'livree'                  => 'Livrée',
            'annuler'                 => 'Annulée',
        ];
    }

    // ── Relationships ──────────────────────────────────

    /** Back-office customer linked through commandes.client_id. */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    /** Historical orders stored a Client id in user_id before client_id existed. */
    public function legacyClient(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'user_id');
    }

    /**
     * Orders visible to an authenticated storefront account.
     *
     * Verified email or phone matching restores guest/legacy purchases while keeping unrelated
     * numeric Client/User ids from leaking another customer's order.
     */
    public function scopeVisibleToStorefrontUser(Builder $query, User $user): Builder
    {
        $email = $user->hasVerifiedEmail() ? strtolower(trim((string) $user->email)) : '';
        $digits = preg_replace('/\D+/', '', (string) $user->phone) ?? '';
        if (str_starts_with($digits, '216') && strlen($digits) === 11) {
            $digits = substr($digits, 3);
        }
        $phones = $user->phone_verified_at !== null && strlen($digits) === 8
            ? [$digits, '216'.$digits]
            : [];
        $mappedClientId = \Illuminate\Support\Facades\Schema::hasColumn('clients', 'user_id')
            ? Client::query()->where('user_id', $user->getKey())->value('id')
            : null;

        if (! $mappedClientId && $email === '' && $phones === []) {
            return $query->whereRaw('1 = 0');
        }

        return $query->where(function (Builder $orders) use ($user, $email, $phones, $mappedClientId): void {
            // `commandes.user_id` historically stored a Client id. It is safe as an account
            // identity only when the same order is linked to the Client explicitly mapped to
            // this User; otherwise equal integers from different tables could leak an order.
            if ($mappedClientId) {
                $orders->where(function (Builder $owned) use ($user, $mappedClientId): void {
                    $owned->where('user_id', $user->getKey())->where('client_id', $mappedClientId);
                });
            }
            if ($email !== '') {
                $method = $mappedClientId ? 'orWhereRaw' : 'whereRaw';
                $orders->{$method}('LOWER(TRIM(email)) = ?', [$email])
                    ->orWhereRaw('LOWER(TRIM(livraison_email)) = ?', [$email]);
            }
            if ($phones !== []) {
                $normalise = static fn (string $column): string =>
                    "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE({$column}, ''), ' ', ''), '+', ''), '-', ''), '(', ''), ')', ''), '.', '')";
                $orders->orWhereIn(\Illuminate\Support\Facades\DB::raw($normalise('phone')), $phones)
                    ->orWhereIn(\Illuminate\Support\Facades\DB::raw($normalise('livraison_phone')), $phones);
            }
        });
    }

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class, 'quotation_id');
    }

    public function details(): HasMany
    {
        return $this->hasMany(CommandeDetail::class, 'commande_id');
    }

    /** Auditable Protina movements attached to this order. */
    public function pointTransactions(): HasMany
    {
        return $this->hasMany(UserPointTransaction::class, 'commande_id');
    }

    public function factures(): HasMany
    {
        return $this->hasMany(Facture::class, 'commande_id');
    }

    /** Latest Aramex shipment created for this order, when one exists. */
    public function latestShipment(): HasOne
    {
        return $this->hasOne(Facture::class, 'commande_id')
            ->ofMany(['id' => 'max'], function ($query): void {
                $query->whereNotNull('aramex_hawb')->where('aramex_hawb', '!=', '');
            });
    }

    /** Tickets used as BL (bon de livraison) for this order. */
    public function ticketsBl(): HasMany
    {
        return $this->hasMany(Ticket::class, 'commande_id');
    }

    /** Facture TVA created "on request" for this order (linked, no double CA). */
    public function factureTvas(): HasMany
    {
        return $this->hasMany(FactureTva::class, 'commande_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'commande_id');
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class, 'coupon_id');
    }

    public function couponRedemption(): HasOne
    {
        return $this->hasOne(CouponRedemption::class, 'order_id');
    }

    // ── Scopes ──────────────────────────────────────────

    public function scopePending($query)
    {
        return $query->whereIn('etat', ['nouvelle_commande', 'en_cours_de_preparation']);
    }

    public function scopeShipped($query)
    {
        return $query->where('etat', 'expidee');
    }

    public function scopeCancelled($query)
    {
        return $query->where('etat', 'annuler');
    }

    public function scopePaid($query)
    {
        return $query->whereNotIn('etat', ['annuler']);
    }

    public function scopeRefunded($query)
    {
        return $query->where('refund_amount', '>', 0);
    }

    // ── Accessors ─────────────────────────────────────

    public function getFullNameAttribute(): string
    {
        return trim(($this->nom ?? '') . ' ' . ($this->prenom ?? ''));
    }

    /**
     * Get fulfillment time in hours.
     */
    public function getFulfillmentTimeAttribute(): ?float
    {
        if (! $this->delivered_at || ! $this->created_at) {
            return null;
        }

        return round($this->created_at->diffInHours($this->delivered_at), 1);
    }
}
