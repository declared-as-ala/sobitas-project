<?php

namespace App\Models;

use App\Enums\InvoiceStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FactureTva extends Model
{
    protected $table = 'facture_tvas';

    protected $guarded = ['id'];

    protected $casts = [
        'date_facture' => 'date',
        'prix_total' => 'float',
        'tva' => 'float',
        'timbre' => 'float',
        'status' => InvoiceStatus::class,
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function facture(): BelongsTo
    {
        return $this->belongsTo(Facture::class, 'facture_id');
    }

    public function sourceTicket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class, 'source_ticket_id');
    }

    public function commande(): BelongsTo
    {
        return $this->belongsTo(Commande::class, 'commande_id');
    }

    public function details(): HasMany
    {
        return $this->hasMany(DetailsFactureTva::class, 'facture_tva_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'facture_tva_id');
    }

    public function creditNotes(): HasMany
    {
        return $this->hasMany(CreditNote::class, 'facture_tva_id');
    }

    /** Facture TVA is "linked" (on request) when it has a source ticket or commande — does NOT add to CA. */
    public function isLinked(): bool
    {
        return $this->source_ticket_id !== null || $this->commande_id !== null;
    }

    /**
     * TVA amount in TND (stored in facture_tvas.tva).
     * Backend/Filament store the amount here, not the rate.
     */
    public function getTvaAmount(): float
    {
        return (float) ($this->tva ?? 0);
    }

    /**
     * TVA rate as percentage, derived from amount and HT.
     * Formula: (tva_amount / prix_ht) * 100. Rounded to 1 decimal; capped at 100% for display.
     */
    public function getTvaRatePercent(): ?float
    {
        $prixHt = (float) ($this->prix_ht ?? 0);
        if ($prixHt <= 0) {
            return null;
        }
        $amount = $this->getTvaAmount();
        $percent = round(($amount / $prixHt) * 100, 1);
        if ($percent > 100) {
            \Illuminate\Support\Facades\Log::warning('FactureTva: TVA rate > 100%', [
                'facture_tva_id' => $this->id,
                'prix_ht' => $prixHt,
                'tva_amount' => $amount,
                'computed_percent' => $percent,
            ]);
            $percent = 100.0;
        }
        return $percent;
    }

    /**
     * Format TVA for list: "19% (95,000 DT)".
     * Money uses 3 decimals and space as thousands separator (TND convention).
     */
    public function getTvaDisplayForList(): string
    {
        $amount = $this->getTvaAmount();
        $rate = $this->getTvaRatePercent();
        $rateStr = $rate !== null ? (round($rate) == $rate ? (int) $rate : $rate) . '%' : '—';
        $amountStr = number_format($amount, 3, '.', ' ') . ' DT';
        return $rateStr . ' (' . $amountStr . ')';
    }
}
