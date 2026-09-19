<?php

namespace App\Mail;

use App\Models\Commande;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class AffilieOrderStatusMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Commande $commande, public string $statusKind)
    {
    }

    public function build(): static
    {
        $statusLabel = match ($this->statusKind) {
            'cancelled' => 'Commande annulée, commission retirée',
            'delivered' => 'Commande livrée, commission confirmée',
        };

        return $this
            ->subject('Commande #' . ($this->commande->numero ?? $this->commande->id) . ' — ' . $statusLabel . ' | Protein.tn')
            ->view('emails.affilie.order-status')
            ->with(['statusLabel' => $statusLabel]);
    }
}
