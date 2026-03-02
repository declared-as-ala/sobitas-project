<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentStatus;
use App\Models\FactureTva;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;

class PaymentService
{
    /**
     * Record a payment for an invoice. Updates invoice status to paid or partially_paid.
     */
    public function recordPayment(
        FactureTva $invoice,
        float $amount,
        string $method = 'COD',
        ?string $providerRef = null,
        ?\DateTimeInterface $paidAt = null
    ): Payment {
        return DB::transaction(function () use ($invoice, $amount, $method, $providerRef, $paidAt) {
            $payment = new Payment();
            $payment->facture_tva_id = $invoice->id;
            $payment->method = $method;
            $payment->amount = $amount;
            $payment->currency = 'TND';
            $payment->status = PaymentStatus::Succeeded;
            $payment->provider_ref = $providerRef;
            $payment->paid_at = $paidAt ?? now();
            $payment->save();

            $totalPaid = (float) $invoice->payments()->where('status', PaymentStatus::Succeeded)->sum('amount');
            $totalTtc = (float) ($invoice->prix_ttc ?? $invoice->prix_total ?? 0);

            if ($totalPaid >= $totalTtc) {
                $invoice->status = InvoiceStatus::Paid;
            } else {
                $invoice->status = InvoiceStatus::PartiallyPaid;
            }
            $invoice->save();

            return $payment;
        });
    }
}
