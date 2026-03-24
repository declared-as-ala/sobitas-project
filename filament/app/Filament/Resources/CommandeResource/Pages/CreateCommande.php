<?php

namespace App\Filament\Resources\CommandeResource\Pages;

use App\Filament\Resources\CommandeResource;
use App\Models\Commande;
use App\Services\ClientService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Filament\Resources\Pages\CreateRecord;
use Filament\Support\Enums\Width;

class CreateCommande extends CreateRecord
{
    protected static string $resource = CommandeResource::class;

    public function getMaxContentWidth(): Width | string | null
    {
        return Width::Full;
    }

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        Log::info('filament.commande.create.start', ['source' => 'admin_form', 'data_keys' => array_keys($data)]);

        // If facturation fields are empty (or whitespace), copy from livraison — `??` alone misses '' from the form JS.
        $pick = static function (?string $primary, ?string $fallback): ?string {
            $p = $primary !== null ? trim($primary) : '';
            if ($p !== '') {
                return $primary;
            }
            $f = $fallback !== null ? trim($fallback) : '';

            return $f !== '' ? trim($fallback) : null;
        };

        $data['nom'] = $pick($data['nom'] ?? null, $data['livraison_nom'] ?? null);
        $data['prenom'] = $pick($data['prenom'] ?? null, $data['livraison_prenom'] ?? null);
        $data['phone'] = $pick($data['phone'] ?? null, $data['livraison_phone'] ?? null);
        $data['email'] = $pick($data['email'] ?? null, $data['livraison_email'] ?? null);
        $data['region'] = $pick($data['region'] ?? null, $data['livraison_region'] ?? null);
        $data['ville'] = $pick($data['ville'] ?? null, $data['livraison_ville'] ?? null);
        $data['adresse1'] = $pick($data['adresse1'] ?? null, $data['livraison_adresse1'] ?? null);
        $data['code_postale'] = $pick($data['code_postale'] ?? null, $data['livraison_code_postale'] ?? null);

        // Auto find-or-create client when no client is selected (form sends user_id, not client_id)
        if (empty($data['client_id']) && empty($data['user_id'])) {
            /** @var ClientService $clientService */
            $clientService = app(ClientService::class);
            $client = $clientService->findOrCreateClientFromDeliveryInfo($data);

            if ($client) {
                Log::info('filament.commande.create.client_linked', ['client_id' => $client->id]);
                $data['user_id'] = $client->id;
                if (Schema::hasColumn((new Commande())->getTable(), 'client_id')) {
                    $data['client_id'] = $client->id;
                }
            } else {
                Log::warning('filament.commande.create.no_client_created', ['has_phone' => !empty($data['phone'] ?? $data['livraison_phone'] ?? null), 'has_email' => !empty($data['email'] ?? $data['livraison_email'] ?? null)]);
            }
        }

        // Generate order number — atomic via number_sequences table (lockForUpdate)
        $year = (int) date('Y');
        $nb   = \App\Models\NumberSequence::getNextFor('CMD', $year);
        $data['numero'] = $year . '/' . str_pad((string) $nb, 4, '0', STR_PAD_LEFT);
        $data['etat'] = $data['etat'] ?? 'nouvelle_commande';

        return $data;
    }

    protected function afterCreate(): void
    {
        $details = $this->form->getState()['details'] ?? [];
        $prixHt = 0.0;
        foreach ($details as $row) {
            if (empty($row['produit_id'])) {
                continue;
            }
            $qte          = (float) ($row['qte'] ?? 1);
            $prixUnitaire = (float) ($row['prix_unitaire'] ?? 0);
            
            \App\Models\CommandeDetail::create([
                'commande_id'   => $this->record->id,
                'produit_id'    => $row['produit_id'],
                'qte'           => $qte,
                'prix_unitaire' => $prixUnitaire,
            ]);
            $prixHt += $qte * $prixUnitaire;
        }

        $frais = (float) ($this->form->getState()['frais_livraison'] ?? 0);
        $this->record->update([
            'prix_ht' => round($prixHt, 3),
            'prix_ttc' => round($prixHt + $frais, 3),
        ]);
    }
}
