<?php

namespace App\Filament\Resources\FactureResource\Pages;

use App\Filament\Resources\FactureResource;
use App\Models\DetailsFacture;
use App\Models\Facture;
use App\Models\Product;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\CreateRecord;

class CreateFacture extends CreateRecord
{
    protected static string $resource = FactureResource::class;

    public function addProductByBarcode(string $code): void
    {
        $code = trim($code);
        if ($code === '') {
            return;
        }
        $product = Product::where('qte', '>', 0)
            ->where(function ($q) use ($code) {
                $q->where('code_product', $code)
                    ->orWhere('code_product', '0' . $code);
            })
            ->first();

        if (!$product) {
            Notification::make()
                ->title('Aucun produit trouvé')
                ->warning()
                ->send();
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
        $remise = (float) ($state['remise'] ?? 0);
        $timbre = (float) ($state['timbre'] ?? 0);
        
        $coordinate = \App\Models\Coordinate::getCached();
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
        
        $calc = \App\Services\InvoiceCalculator::calculate($details, $remise, $timbre, $defaultTva);
        
        $this->form->fill(array_merge($state, [
            'prix_ht' => $calc['total_ht_brut'],
            'pourcentage_remise' => $calc['pourcentage_remise'],
            'prix_ht_apres_remise' => $calc['prix_ht_apres_remise'],
            'tva' => $calc['tva'],
            'prix_ttc' => $calc['prix_ttc'],
            'net_a_payer' => $calc['net_a_payer'],
        ]));
    }

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $nb = Facture::whereYear('created_at', date('Y'))->count() + 1;
        $nb = str_pad((string) $nb, 4, '0', STR_PAD_LEFT);
        $data['numero'] = date('Y') . '/' . $nb;

        $details = $data['details'] ?? [];
        $remise = (float) ($data['remise'] ?? 0);
        $timbre = (float) ($data['timbre'] ?? 0);

        $coordinate = \App\Models\Coordinate::getCached();
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;

        $calc = \App\Services\InvoiceCalculator::calculate($details, $remise, $timbre, $defaultTva);

        $data['prix_ht'] = $calc['total_ht_brut'];
        $data['remise'] = $calc['remise'];
        $data['pourcentage_remise'] = $calc['pourcentage_remise'];
        $data['prix_ht_apres_remise'] = $calc['prix_ht_apres_remise'];
        $data['tva'] = $calc['tva'];
        $data['timbre'] = $calc['timbre'];
        $data['prix_ttc'] = $calc['prix_ttc'];
        $data['net_a_payer'] = $calc['net_a_payer'];

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
            $qte = (int) ($row['qte'] ?? 1);
            $prixUnitaire = (float) ($row['prix_unitaire'] ?? 0);
            DetailsFacture::create([
                'facture_id' => $this->record->id,
                'produit_id' => $row['produit_id'],
                'qte' => $qte,
                'prix_unitaire' => $prixUnitaire,
                'prix_ttc' => $qte * $prixUnitaire,
            ]);
            Product::where('id', $row['produit_id'])->decrement('qte', $qte);
        }

        $state = $this->form->getState();
        $remise = (float) ($state['remise'] ?? 0);
        $timbre = (float) ($state['timbre'] ?? 0);
        
        $coordinate = \App\Models\Coordinate::getCached();
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
        
        $calcTotals = \App\Services\InvoiceCalculator::calculate($details, $remise, $timbre, $defaultTva);
        
        $this->record->update([
            'prix_ht' => $calcTotals['total_ht_brut'],
            'remise' => $calcTotals['remise'],
            'pourcentage_remise' => $calcTotals['pourcentage_remise'],
            'prix_ht_apres_remise' => $calcTotals['prix_ht_apres_remise'],
            'tva' => $calcTotals['tva'],
            'timbre' => $calcTotals['timbre'],
            'prix_ttc' => $calcTotals['prix_ttc'],
            'net_a_payer' => $calcTotals['net_a_payer'],
        ]);
    }
}
