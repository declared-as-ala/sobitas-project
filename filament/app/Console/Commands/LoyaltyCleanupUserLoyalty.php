<?php

namespace App\Console\Commands;

use App\Models\LoyaltyCard;
use App\Models\LoyaltyPointTransaction;
use App\Models\User;
use Illuminate\Console\Command;

/**
 * Rapport sur la fidélité liée aux comptes web (User) — aucune suppression.
 * Comportement dry-run par défaut : aucune écriture (rapport seulement).
 * Option --migrate-matched : affiche le nombre de correspondances user↔client (email) ; ne déplace pas de données.
 */
class LoyaltyCleanupUserLoyalty extends Command
{
    protected $signature = 'loyalty:cleanup-user-loyalty {--migrate-matched : Afficher les correspondances user↔client (email)}';

    protected $description = 'Rapport diagnostic fidélité / comptes web (aucune suppression, aucune écriture par défaut)';

    public function handle(): int
    {
        $migrate = (bool) $this->option('migrate-matched');

        $this->info('Mode : rapport uniquement (aucune écriture, aucune suppression).');

        $usersWithClient = User::query()->whereNotNull('client_id')->count();
        $this->line("Utilisateurs avec client_id CRM : {$usersWithClient}");

        $cards = LoyaltyCard::query()->count();
        $this->line("Cartes fidélité : {$cards}");

        $tx = LoyaltyPointTransaction::query()->whereNotNull('order_id')->count();
        $this->line('Transactions liées à une commande en ligne (order_id non null) : ' . $tx);

        if ($migrate) {
            $matches = User::query()
                ->whereNotNull('client_id')
                ->whereHas('client', function ($q) {
                    $q->whereColumn('clients.email', 'users.email');
                })
                ->count();
            $this->warn("Correspondances user↔client (email identique) : {$matches} (le ledger utilise déjà client_id ; aucune migration automatique).");
        }

        $this->info('Terminé.');

        return self::SUCCESS;
    }
}
