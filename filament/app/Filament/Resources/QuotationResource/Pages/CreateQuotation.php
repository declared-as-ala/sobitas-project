<?php

namespace App\Filament\Resources\QuotationResource\Pages;

use App\Filament\Resources\QuotationResource;
use App\Models\DetailsQuotation;
use App\Models\Product;
use App\Models\Quotation;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\CreateRecord;

class CreateQuotation extends CreateRecord
{
    protected static string $resource = QuotationResource::class;

    public function addProductByBarcode(string $code): void
    {
        $code = trim($code);
        if ($code === '') {
            return;
        }
        $product = Product::where('qte', '>', 0)
            ->where(function ($q) use ($code) {
                $q->where('code_product', $code)->orWhere('code_product', '0' . $code);
            })
            ->first();

        if (!$product) {
            Notification::make()->title('Aucun produit trouvé')->warning()->send();
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
            if (!empty($d['produit_id'])) {
                $total += (float) ($d['qte'] ?? 0) * (float) ($d['prix_unitaire'] ?? 0);
            }
        }
        $remise = (float) ($state['remise'] ?? 0);
        $this->form->fill(array_merge($state, [
            'prix_ht' => $total,
            'prix_ttc' => $total - $remise,
        ]));
    }

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $nb = Quotation::whereYear('created_at', date('Y'))->count() + 1;
        $data['numero'] = date('Y') . '/' . str_pad((string) $nb, 4, '0', STR_PAD_LEFT);

        $details = $data['details'] ?? [];
        $total = 0.0;
        foreach ($details as $d) {
            if (!empty($d['produit_id'])) {
                $total += (float) ($d['qte'] ?? 0) * (float) ($d['prix_unitaire'] ?? 0);
            }
        }
        $data['prix_ht'] = $total;
        $data['prix_ttc'] = $total - (float) ($data['remise'] ?? 0);
        $data['prix_total'] = $data['prix_ttc'];
        unset($data['details'], $data['client_adresse'], $data['client_phone'], $data['pourcentage_remise']);
        return $data;
    }

    protected function afterCreate(): void
    {
        $details = $this->form->getState()['details'] ?? [];
        foreach ($details as $row) {
            if (empty($row['produit_id'])) {
                continue;
            }
            $qte = (int) ($row['qte'] ?? 1);
            $prixUnitaire = (float) ($row['prix_unitaire'] ?? 0);
            $prixTtc = $qte * $prixUnitaire;
            DetailsQuotation::create([
                'quotation_id' => $this->record->id,
                'produit_id' => $row['produit_id'],
                'qte' => $qte,
                'quantite' => $qte,
                'prix_unitaire' => $prixUnitaire,
                'prix_ttc' => $prixTtc,
            ]);
            Product::where('id', $row['produit_id'])->decrement('qte', $qte);
        }
    }
}
