<?php

namespace App\Models;

use App\Enums\CreditNoteStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CreditNote extends Model
{
    protected $fillable = [
        'facture_tva_id', 'numero', 'total_ht', 'total_ttc', 'status', 'issued_at',
    ];

    protected $casts = [
        'total_ht' => 'float',
        'total_ttc' => 'float',
        'status' => CreditNoteStatus::class,
        'issued_at' => 'datetime',
    ];

    public function factureTva(): BelongsTo
    {
        return $this->belongsTo(FactureTva::class, 'facture_tva_id');
    }

    public function details(): HasMany
    {
        return $this->hasMany(CreditNoteDetail::class, 'credit_note_id');
    }
}
