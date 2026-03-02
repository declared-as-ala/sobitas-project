<?php

namespace App\Filament\Resources\CreditNoteResource\Pages;

use App\Enums\CreditNoteStatus;
use App\Filament\Resources\CreditNoteResource;
use App\Models\CreditNote;
use App\Models\FactureTva;
use Filament\Resources\Pages\CreateRecord;

class CreateCreditNote extends CreateRecord
{
    protected static string $resource = CreditNoteResource::class;

    public function mount(): void
    {
        parent::mount();
        $invoiceId = request()->query('facture_tva_id');
        if ($invoiceId && $invoice = FactureTva::find($invoiceId)) {
            $this->form->fill([
                'facture_tva_id' => $invoice->id,
                'total_ht' => (float) ($invoice->prix_ht ?? 0),
                'total_ttc' => (float) ($invoice->prix_ttc ?? $invoice->prix_total ?? 0),
                'status' => CreditNoteStatus::Draft->value,
            ]);
        }
    }
}
