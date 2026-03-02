<?php

namespace App\Filament\Resources\FactureTvaResource\Pages;

use App\Filament\Resources\FactureTvaResource;
use App\Models\Coordinate;
use App\Models\DetailsFactureTva;
use App\Models\FactureTva;
use App\Models\Product;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\CreateRecord;

class CreateFactureTva extends CreateRecord
{
    protected static string $resource = FactureTvaResource::class;

    public function addProductByBarcode(string $code): void
    {
        $code = trim($code);
        if ($code === '') {
            return;
        }
        $coordinate = Coordinate::getCached();
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
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
            'tva_pct' => $defaultTva,
        ];
        $this->form->fill(array_merge($state, ['details' => $details]));
        $this->recalculateTotals();
    }

    public function recalculateTotals(): void
    {
        $state = $this->form->getState();
        $details = $state['details'] ?? [];
        $totalHt = 0.0;
        $totalTva = 0.0;
        foreach ($details as $d) {
            if (!empty($d['produit_id'])) {
                $ht = (float) ($d['qte'] ?? 0) * (float) ($d['prix_unitaire'] ?? 0);
                $tvaPct = (float) ($d['tva_pct'] ?? 19);
                $totalHt += $ht;
                $totalTva += $ht * $tvaPct / 100;
            }
        }
        $remise = (float) ($state['remise'] ?? 0);
        $htApresRemise = $totalHt - $remise;
        $tvaApresRemise = $totalHt > 0 ? $totalTva - ($totalTva * $remise / $totalHt) : 0;
        $timbre = (float) ($state['timbre'] ?? 0);
        $net = $htApresRemise + $tvaApresRemise + $timbre;
        $this->form->fill(array_merge($state, [
            'prix_ht' => $totalHt,
            'prix_ht_apres_remise' => $htApresRemise,
            'tva' => $tvaApresRemise,
            'prix_ttc' => $htApresRemise + $tvaApresRemise,
            'net_a_payer' => $net,
        ]));
    }

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $nb = FactureTva::whereYear('created_at', date('Y'))->count() + 1;
        $data['numero'] = date('Y') . '/' . str_pad((string) $nb, 4, '0', STR_PAD_LEFT);

        $details = $data['details'] ?? [];
        $totalHt = 0.0;
        $totalTva = 0.0;
        foreach ($details as $d) {
            if (!empty($d['produit_id'])) {
                $ht = (float) ($d['qte'] ?? 0) * (float) ($d['prix_unitaire'] ?? 0);
                $tvaPct = (float) ($d['tva_pct'] ?? 19);
                $totalHt += $ht;
                $totalTva += $ht * $tvaPct / 100;
            }
        }
        $remise = (float) ($data['remise'] ?? 0);
        $tvaApresRemise = $totalHt > 0 ? $totalTva - ($totalTva * $remise / $totalHt) : 0;
        $timbre = (float) ($data['timbre'] ?? 0);
        $data['prix_ht'] = $totalHt;
        $data['tva'] = $tvaApresRemise;
        $data['prix_ttc'] = $totalHt - $remise + $tvaApresRemise + $timbre;
        unset($data['details'], $data['client_adresse'], $data['client_phone'], $data['prix_ht_apres_remise'], $data['net_a_payer'], $data['pourcentage_remise']);
        return $data;
    }

    protected function afterCreate(): void
    {
        $coordinate = Coordinate::getCached();
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
        $details = $this->form->getState()['details'] ?? [];
        foreach ($details as $row) {
            if (empty($row['produit_id'])) {
                continue;
            }
            $qte = (int) ($row['qte'] ?? 1);
            $prixUnitaire = (float) ($row['prix_unitaire'] ?? 0);
            $tvaPct = (float) ($row['tva_pct'] ?? $defaultTva);
            $prixHt = $qte * $prixUnitaire;
            $tvaAmount = $prixHt * $tvaPct / 100;
            $prixTtc = $prixHt + $tvaAmount;
            DetailsFactureTva::create([
                'facture_tva_id' => $this->record->id,
                'produit_id' => $row['produit_id'],
                'qte' => $qte,
                'prix_unitaire' => $prixUnitaire,
                'prix_ht' => $prixHt,
                'tva' => $tvaPct,
                'prix_ttc' => $prixTtc,
            ]);
            Product::where('id', $row['produit_id'])->decrement('qte', $qte);
        }
    }
}
