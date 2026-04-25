<?php

namespace App\Console\Commands;

use App\Models\Client;
use App\Services\LoyaltyService;
use Illuminate\Console\Command;

class LoyaltyBackfillClientCards extends Command
{
    protected $signature = 'loyalty:backfill-client-cards {--dry-run : Afficher sans créer}';

    protected $description = 'Crée une carte fidélité pour chaque client CRM qui n’en a pas encore';

    public function handle(LoyaltyService $loyalty): int
    {
        $dry = (bool) $this->option('dry-run');

        $query = Client::query()->whereDoesntHave('loyaltyCard');
        $count = $query->count();
        $this->info("Clients sans carte : {$count}");

        if ($count === 0) {
            return self::SUCCESS;
        }

        $created = 0;
        foreach ($query->cursor() as $client) {
            if ($dry) {
                $this->line("[dry-run] client #{$client->id}");
                $created++;

                continue;
            }
            $loyalty->getOrCreateCard($client);
            $created++;
        }

        $this->info($dry ? "Simulation : {$created} carte(s) seraient créées." : "Cartes créées : {$created}.");

        return self::SUCCESS;
    }
}
