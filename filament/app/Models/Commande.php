<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
// Partner/Loyalty — resolved at runtime; suppress static-analysis warnings

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
        'delivered_at', 'refund_amount', 'discount_amount', 'payment_method', 'is_returning_customer',
        'coupon_id', 'coupon_code_snapshot', 'coupon_type_snapshot', 'coupon_value_snapshot',
        'discount_ht', 'discount_ttc',
        'partner_id', 'commission_base', 'estimated_commission',
        'loyalty_points_redeemed', 'loyalty_discount', 'loyalty_points_earned',
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
        'commission_base' => 'float',
        'estimated_commission' => 'float',
        'loyalty_discount' => 'float',
        'loyalty_points_redeemed' => 'integer',
        'loyalty_points_earned' => 'integer',
        'sms_sent' => 'boolean',
        'is_returning_customer' => 'boolean',
        'delivered_at' => 'datetime',
    ];

    // ── Status Labels (single source of truth) ────────────

    private const STATUS_LABELS = [
        'nouvelle_commande'       => 'Nouvelle',
        'en_cours_de_preparation' => 'Préparation',
        'prete'                   => 'Prête',
        'en_cours_de_livraison'   => 'Livraison',
        'expidee'                 => 'Expédiée',
        'annuler'                 => 'Annulée',
    ];

    private const STATUS_COLORS = [
        'nouvelle_commande'       => 'warning',
        'en_cours_de_preparation' => 'info',
        'prete'                   => 'primary',
        'en_cours_de_livraison'   => 'gray',
        'expidee'                 => 'success',
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
            'annuler'                 => 'Annulée',
        ];
    }

    // ── Relationships ──────────────────────────────────

    /** Client linked to this order. Prefer client_id when set; otherwise user_id (legacy). */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'user_id');
    }

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class, 'quotation_id');
    }

    public function details(): HasMany
    {
        return $this->hasMany(CommandeDetail::class, 'commande_id');
    }

    public function factures(): HasMany
    {
        return $this->hasMany(Facture::class, 'commande_id');
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

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class, 'partner_id');
    }

    public function commissionTransactions(): HasMany
    {
        return $this->hasMany(PartnerCommissionTransaction::class, 'order_id');
    }

    public function loyaltyTransactions(): HasMany
    {
        return $this->hasMany(LoyaltyPointTransaction::class, 'order_id');
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
