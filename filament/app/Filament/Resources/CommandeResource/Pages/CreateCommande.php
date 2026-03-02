<?php

namespace App\Filament\Resources\CommandeResource\Pages;

use App\Filament\Resources\CommandeResource;
use App\Models\Commande;
use App\Services\ClientService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Filament\Resources\Pages\CreateRecord;

class CreateCommande extends CreateRecord
{
    protected static string $resource = CommandeResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        Log::info('filament.commande.create.start', ['source' => 'admin_form', 'data_keys' => array_keys($data)]);

        // If client fields are empty, copy them from livraison fields
        $data['nom'] = $data['nom'] ?? ($data['livraison_nom'] ?? null);
        $data['prenom'] = $data['prenom'] ?? ($data['livraison_prenom'] ?? null);
        $data['phone'] = $data['phone'] ?? ($data['livraison_phone'] ?? null);
        $data['email'] = $data['email'] ?? ($data['livraison_email'] ?? null);
        $data['region'] = $data['region'] ?? ($data['livraison_region'] ?? null);
        $data['ville'] = $data['ville'] ?? ($data['livraison_ville'] ?? null);
        $data['adresse1'] = $data['adresse1'] ?? ($data['livraison_adresse1'] ?? null);
        $data['code_postale'] = $data['code_postale'] ?? ($data['livraison_code_postale'] ?? null);

        // Auto find-or-create client from livraison data when no client_id provided
        if (empty($data['client_id'])) {
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

        // Generate order number
        $nb = Commande::whereYear('created_at', date('Y'))->count() + 1;
        $nb = str_pad($nb, 4, '0', STR_PAD_LEFT);
        $data['numero'] = date('Y') . '/' . $nb;
        $data['etat'] = $data['etat'] ?? 'nouvelle_commande';

        return $data;
    }
}
