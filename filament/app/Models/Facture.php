<?php

namespace App\Models;

use App\Enums\BlStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Facture extends Model
{
    protected $table = 'factures';

    protected $fillable = [
        'numero', 'client_id', 'commande_id', 'status', 'prix_ht', 'prix_ttc', 'remise',
        'pourcentage_remise', 'prix_ht_apres_remise', 'tva', 'timbre', 'frais_livraison', 'net_a_payer',
        // Coupon tracking: remise = manual_remise + discount_ht (invariant)
        'discount_ht', 'coupon_code_snapshot', 'coupon_type_snapshot', 'coupon_value_snapshot',
        'nom', 'prenom', 'email', 'phone', 'adresse1', 'adresse2', 'ville', 'region', 'code_postale',
        'livraison_nom', 'livraison_prenom', 'livraison_email', 'livraison_phone',
        'livraison_adresse1', 'livraison_adresse2', 'livraison_ville', 'livraison_region', 'livraison_code_postale',
    ];

    protected $casts = [
        'prix_ht'              => 'decimal:3',
        'remise'               => 'decimal:3',
        'pourcentage_remise'   => 'decimal:3',
        'prix_ht_apres_remise' => 'decimal:3',
        'tva'                  => 'decimal:3',
        'timbre'               => 'decimal:3',
        'frais_livraison'      => 'decimal:3',
        'prix_ttc'             => 'decimal:3',
        'net_a_payer'          => 'decimal:3',
        'discount_ht'          => 'decimal:3',
        'coupon_value_snapshot' => 'decimal:3',
        'status'               => BlStatus::class,
    ];

    /**
     * Coupon discount portion of remise (zero when no coupon was applied).
     */
    public function getCouponDiscountAttribute(): float
    {
        return (float) ($this->discount_ht ?? 0);
    }

    /**
     * Manual (admin-set) portion of remise = total remise minus coupon portion.
     */
    public function getManualRemiseAttribute(): float
    {
        return max(0.0, (float) ($this->remise ?? 0) - (float) ($this->discount_ht ?? 0));
    }

    /**
     * Computed, human-friendly single-line delivery address.
     *
     * Preference order:
     * 1) livraison_adresse1 (already combined for new BLs)
     * 2) combination of livraison_* pieces
     * 3) combination of billing address pieces
     * 4) related client adresse
     */
    public function getFormattedDeliveryAddressAttribute(): string
    {
        // 1) If livraison_adresse1 is already a full line, prefer it.
        $line = trim((string) ($this->livraison_adresse1 ?? ''));
        if ($line !== '') {
            return $line;
        }

        // 2) Build from individual livraison_* pieces.
        $parts = [];
        $streetParts = trim(((string) ($this->livraison_adresse1 ?? '')) . ' ' . ((string) ($this->livraison_adresse2 ?? '')));
        if ($streetParts !== '') {
            $parts[] = $streetParts;
        }
        $cityRegion = trim(((string) ($this->livraison_ville ?? '')) . ' ' . ((string) ($this->livraison_region ?? '')));
        if ($cityRegion !== '') {
            // Use \" - \" to visually separate street from city/region when street exists.
            $parts[] = $cityRegion;
        }
        $cp = trim((string) ($this->livraison_code_postale ?? ''));
        if ($cp !== '') {
            $parts[] = $cp;
        }
        $line = trim(implode(' - ', array_filter($parts, fn ($v) => $v !== '')));
        if ($line !== '') {
            return $line;
        }

        // 3) Fallback to billing address pieces.
        $parts = [];
        $streetParts = trim(((string) ($this->adresse1 ?? '')) . ' ' . ((string) ($this->adresse2 ?? '')));
        if ($streetParts !== '') {
            $parts[] = $streetParts;
        }
        $cityRegion = trim(((string) ($this->ville ?? '')) . ' ' . ((string) ($this->region ?? '')));
        if ($cityRegion !== '') {
            $parts[] = $cityRegion;
        }
        $cp = trim((string) ($this->code_postale ?? ''));
        if ($cp !== '') {
            $parts[] = $cp;
        }
        $line = trim(implode(' - ', array_filter($parts, fn ($v) => $v !== '')));
        if ($line !== '') {
            return $line;
        }

        // 4) Last resort: client adresse field.
        if ($this->relationLoaded('client') || $this->client) {
            $clientAdresse = trim((string) ($this->client->adresse ?? ''));
            if ($clientAdresse !== '') {
                return $clientAdresse;
            }
        }

        return '';
    }

    protected static function booted()
    {
        static::creating(function ($facture) {
            if (empty($facture->status)) {
                $facture->status = BlStatus::Issued;
            }
        });
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function commande(): BelongsTo
    {
        return $this->belongsTo(Commande::class, 'commande_id');
    }

    public function details(): HasMany
    {
        return $this->hasMany(DetailsFacture::class, 'facture_id');
    }

    public function factureTvas(): HasMany
    {
        return $this->hasMany(FactureTva::class, 'facture_id');
    }
}
