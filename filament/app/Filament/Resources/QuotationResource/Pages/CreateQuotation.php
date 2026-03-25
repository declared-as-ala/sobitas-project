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
                $q->where('code_product', $code)->orWhere('code_product', '0' . $code);
            })
            ->first();

        if (!$product) {
            Notification::make()->title('Aucun produit trouvé')->warning()->send();
            return;
        }

        $state = $this->form->getState();
        $details = $state['details'] ?? [];
        $coordinate = \App\Models\Coordinate::getCached();
        
        $details[] = [
            'produit_id' => $product->id,
            'qte' => 1,
            'prix_unitaire' => $product->getEffectivePriceHt(),
            'tva_pct' => $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19,
        ];
        
        $this->form->fill(array_merge($state, ['details' => $details]));
        $this->recalculateTotals();
    }

    protected function getFormActions(): array
    {
        return [];
    }

    public function recalculateTotals(): void
    {
        $state = $this->form->getState();
        $details = $state['details'] ?? [];
        
        $coordinate = \App\Models\Coordinate::getCached();
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
        
        $calcTotals = \App\Services\InvoiceCalculator::calculate(
            $details, 
            (float) ($state['remise'] ?? 0), 
            (float) ($state['timbre'] ?? 0), 
            $defaultTva
        );
        
        $this->form->fill(array_merge($state, [
            'prix_ht' => $calcTotals['total_ht_brut'],
            'pourcentage_remise' => $calcTotals['pourcentage_remise'],
            'prix_ht_apres_remise' => $calcTotals['prix_ht_apres_remise'],
            'tva' => $calcTotals['tva'],
            'prix_ttc' => $calcTotals['prix_ttc'],
            'net_a_payer' => $calcTotals['net_a_payer'],
        ]));
    }

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $year = (int) date('Y');
        $nb   = \App\Models\NumberSequence::getNextFor('DV', $year);
        $data['numero'] = $year . '/' . str_pad((string) $nb, 4, '0', STR_PAD_LEFT);

        $details = $data['details'] ?? [];
        
        $coordinate = \App\Models\Coordinate::getCached();
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
        
        $calcTotals = \App\Services\InvoiceCalculator::calculate(
            $details, 
            (float) ($data['remise'] ?? 0), 
            (float) ($data['timbre'] ?? 0), 
            $defaultTva
        );

        $data['prix_ht'] = $calcTotals['total_ht_brut'];
        $data['pourcentage_remise'] = $calcTotals['pourcentage_remise'];
        $data['prix_ht_apres_remise'] = $calcTotals['prix_ht_apres_remise'];
        $data['tva'] = $calcTotals['tva'];
        $data['prix_ttc'] = $calcTotals['prix_ttc'];
        $data['net_a_payer'] = $calcTotals['net_a_payer'];
        $data['prix_total'] = $calcTotals['prix_ttc'];
        
        unset($data['details'], $data['client_adresse'], $data['client_phone'], $data['css_injector']);
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

    /**
     * Public save method callable from JavaScript via Livewire.
     * This ensures form data is validated and properly persisted.
     */
    public function save(): null
    {
        // Get the current form state from Livewire
        $data = $this->form->getState();

        // Validate required fields
        if (empty($data['client_id'])) {
            \Filament\Notifications\Notification::make()
                ->title('Erreur de validation')
                ->body('Veuillez sélectionner un client')
                ->danger()
                ->send();
            return null;
        }

        if (empty($data['details']) || !is_array($data['details']) || count($data['details']) === 0) {
            \Filament\Notifications\Notification::make()
                ->title('Erreur de validation')
                ->body('Ajoutez au moins un produit')
                ->danger()
                ->send();
            return null;
        }

        try {
            // Mutate the form data before creation
            $mutatedData = $this->mutateFormDataBeforeCreate($data);

            // Create the quotation record
            $this->record = $this->getModel()::create($mutatedData);
            
            // Call the afterCreate hook to create related details
            $this->afterCreate();

            // Show success notification
            \Filament\Notifications\Notification::make()
                ->title('Devis créé avec succès!')
                ->body('Le devis #' . $this->record->numero . ' a été créé.')
                ->success()
                ->send();

            $this->dispatch('open-url-new-tab', url: route('quotations.print', ['quotation' => $this->record->id]));
            
            return null;
        } catch (\Illuminate\Database\QueryException $e) {
            \Filament\Notifications\Notification::make()
                ->title('Erreur base de données')
                ->body('Erreur lors de la création: ' . $e->getMessage())
                ->danger()
                ->send();
            return null;
        } catch (\Exception $e) {
            \Filament\Notifications\Notification::make()
                ->title('Erreur lors de la création')
                ->body($e->getMessage())
                ->danger()
                ->send();
            return null;
        }
    }
}
