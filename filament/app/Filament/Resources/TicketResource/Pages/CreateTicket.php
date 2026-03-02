<?php

namespace App\Filament\Resources\TicketResource\Pages;

use App\Filament\Resources\TicketResource;
use App\Models\DetailsTicket;
use App\Models\Ticket;
use Filament\Resources\Pages\CreateRecord;
use Filament\Notifications\Notification;

class CreateTicket extends CreateRecord
{
    protected static string $resource = TicketResource::class;

    public function addProductByBarcode(string $code): void
    {
        $code = trim($code);
        if ($code === '') {
            return;
        }

        $product = \App\Models\Product::where(function ($q) use ($code) {
            $q->where('code_product', $code)->orWhere('code_product', '0' . $code);
        })->first();

        if (! $product) {
            Notification::make()->title('Aucun produit trouvé pour ce code')->warning()->send();
            return;
        }

        $state = $this->form->getState();
        $details = $state['details'] ?? [];
        $details[] = [
            'produit_id' => $product->id,
            'qte' => 1,
            'prix_unitaire' => (float) ($product->prix ?? 0),
        ];
        $this->form->fill(array_merge($state, ['details' => $details]));
        $this->recalculateTotals();
    }

    public function recalculateTotals(): void
    {
        $state = $this->form->getState();
        $details = $state['details'] ?? [];
        $total = 0.0;
        foreach ($details as $d) {
            if (! empty($d['produit_id'])) {
                $total += (float) ($d['qte'] ?? 0) * (float) ($d['prix_unitaire'] ?? 0);
            }
        }
        $remiseAmount = (float) ($state['remise'] ?? 0);
        $remisePct = (float) ($state['pourcentage_remise'] ?? 0);
        if ($remisePct > 0 && $total > 0) {
            $remiseAmount = $total * $remisePct / 100;
        }
        $net = max(0, $total - $remiseAmount);
        $this->form->fill(array_merge($state, [
            'prix_ht' => $total,
            'prix_ttc' => $net,
        ]));
    }

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $nb = Ticket::whereYear('created_at', date('Y'))->count() + 1;
        $data['numero'] = date('Y') . '/' . str_pad((string) $nb, 4, '0', STR_PAD_LEFT);

        $type = $data['type'] ?? Ticket::TYPE_TICKET_CAISSE;
        if ($type === Ticket::TYPE_TICKET_CAISSE) {
            $data['commande_id'] = null;
        }
        if ($type === Ticket::TYPE_BON_LIVRAISON && ! empty($data['commande_id'])) {
            $commande = \App\Models\Commande::find($data['commande_id']);
            if ($commande && $commande->user_id) {
                $data['client_id'] = $commande->user_id;
            }
        }

        $details = $data['details'] ?? [];
        $total = 0.0;
        foreach ($details as $d) {
            if (! empty($d['produit_id'])) {
                $total += (float) ($d['qte'] ?? 0) * (float) ($d['prix_unitaire'] ?? 0);
            }
        }
        $remiseAmount = (float) ($data['remise'] ?? 0);
        $remisePct = (float) ($data['pourcentage_remise'] ?? 0);
        if ($remisePct > 0 && $total > 0) {
            $remiseAmount = $total * $remisePct / 100;
        }
        $data['prix_ht'] = $total;
        $data['remise'] = $remiseAmount;
        $data['prix_ttc'] = max(0, $total - $remiseAmount);
        unset($data['details'], $data['client_adresse'], $data['client_phone']);

        return $data;
    }

    protected function afterCreate(): void
    {
        $details = $this->form->getState()['details'] ?? [];
        foreach ($details as $row) {
            if (empty($row['produit_id'])) {
                continue;
            }
            $qte = (float) ($row['qte'] ?? 1);
            $prixUnitaire = (float) ($row['prix_unitaire'] ?? 0);
            $lineTotal = $qte * $prixUnitaire;
            DetailsTicket::create([
                'ticket_id' => $this->record->id,
                'produit_id' => $row['produit_id'],
                'qte' => $qte,
                'prix_unitaire' => $prixUnitaire,
                'prix_ht' => $lineTotal,
                'prix_ttc' => $lineTotal,
            ]);
        }
    }
}
