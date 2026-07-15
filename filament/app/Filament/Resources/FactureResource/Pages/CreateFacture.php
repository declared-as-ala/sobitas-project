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

    public function getMaxContentWidth(): \Filament\Support\Enums\Width | string | null
    {
        return \Filament\Support\Enums\Width::Full;
    }

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
            'prix_unitaire' => $product->getEffectivePriceHt(),
        ];
        $this->form->fill(array_merge($state, ['details' => $details]));
        $this->recalculateTotals();
    }

    public function recalculateTotals(): void
    {
        $state = $this->form->getState();
        $details = $state['details'] ?? [];
        $remise = (float) ($state['remise'] ?? 0);
        $timbre = 0.0;
        $fraisLivraison = (float) ($state['frais_livraison'] ?? 0);

        $calc = \App\Services\InvoiceCalculator::calculate($details, $remise, $timbre, 0, $fraisLivraison);

        $this->form->fill(array_merge($state, [
            'prix_ht' => $calc['total_ht_brut'],
            'pourcentage_remise' => $calc['pourcentage_remise'],
            'prix_ht_apres_remise' => $calc['prix_ht_apres_remise'],
            'tva' => $calc['tva'],
            'prix_ttc' => $calc['prix_ttc'],
            'net_a_payer' => $calc['net_a_payer'],
        ]));
    }

    public function save(bool $shouldRedirect = true, bool $shouldSendSavedNotification = true): void
    {
        $this->create();
    }

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $year = (int) date('Y');
        $nb   = \App\Models\NumberSequence::getNextFor('BL', $year);
        $data['numero'] = $year . '/' . str_pad((string) $nb, 4, '0', STR_PAD_LEFT);

        $details = $data['details'] ?? [];
        $remise = (float) ($data['remise'] ?? 0);
        $timbre = 0.0;
        $fraisLivraison = (float) ($data['frais_livraison'] ?? 0);

        $calc = \App\Services\InvoiceCalculator::calculate($details, $remise, $timbre, 0, $fraisLivraison);

        $data['prix_ht'] = $calc['total_ht_brut'];
        $data['remise'] = $calc['remise'];
        $data['pourcentage_remise'] = $calc['pourcentage_remise'];
        $data['prix_ht_apres_remise'] = $calc['prix_ht_apres_remise'];
        $data['tva'] = $calc['tva'];
        $data['timbre'] = $calc['timbre'];
        $data['frais_livraison'] = $calc['frais_livraison'];
        $data['prix_ttc'] = $calc['prix_ttc'];
        $data['net_a_payer'] = $calc['net_a_payer'];

        unset($data['details'], $data['client_adresse'], $data['client_phone']);

        return $data;
    }

    protected function afterCreate(): void
    {
        $details = $this->form->getState()['details'] ?? [];
        $touchedProductIds = [];
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
            $touchedProductIds[] = $row['produit_id'];
        }

        // Floor any qte driven below zero by over-invoicing back to 0 BEFORE deriving rupture, so an
        // impossible negative stock can't permanently stick a product OUT OF STOCK. Only raises
        // negatives to 0; never inflates valid stock.
        Product::whereIn('id', $touchedProductIds)->where('qte', '<', 0)->update(['qte' => 0]);
        // Raw decrement() bypasses the Product saving() hook; re-derive rupture flags.
        Product::syncRuptureFlags($touchedProductIds);

        $state = $this->form->getState();
        $remise = (float) ($state['remise'] ?? 0);
        $timbre = 0.0;
        $fraisLivraison = (float) ($state['frais_livraison'] ?? 0);

        $calcTotals = \App\Services\InvoiceCalculator::calculate($details, $remise, $timbre, 0, $fraisLivraison);

        $this->record->update([
            'prix_ht' => $calcTotals['total_ht_brut'],
            'remise' => $calcTotals['remise'],
            'pourcentage_remise' => $calcTotals['pourcentage_remise'],
            'prix_ht_apres_remise' => $calcTotals['prix_ht_apres_remise'],
            'tva' => $calcTotals['tva'],
            'timbre' => $calcTotals['timbre'],
            'frais_livraison' => $calcTotals['frais_livraison'],
            'prix_ttc' => $calcTotals['prix_ttc'],
            'net_a_payer' => $calcTotals['net_a_payer'],
        ]);

        $this->dispatch('open-url-new-tab', url: route('factures.print', ['facture' => $this->record->id]));
    }

    /**
     * Custom BL view has its own Enregistrer — avoid duplicate Filament footer button.
     */
    protected function getFormActions(): array
    {
        return [
            $this->getCancelFormAction()->label('Annuler'),
        ];
    }
}
