<?php

namespace App\Console\Commands;

use App\Models\Client;
use App\Models\Commande;
use App\Models\User;
use App\Services\CustomerUserLinkService;
use App\Services\LoyaltyService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class LinkCustomersToUsers extends Command
{
    protected $signature = 'crm:link-customers-to-users
                            {--dry-run : Log actions without writing}';

    protected $description = 'Link users↔clients, ensure loyalty cards, and fix commandes.client_id from linked CRM client.';

    public function handle(CustomerUserLinkService $linkService, LoyaltyService $loyalty): int
    {
        $dry = (bool) $this->option('dry-run');
        if ($dry) {
            $this->warn('DRY RUN — no database writes.');
        }

        $linked = 0;
        $cards = 0;
        $orders = 0;

        foreach (User::query()->orderBy('id')->cursor() as $user) {
            if (Client::where('user_id', $user->id)->exists()) {
                continue;
            }

            $this->line("Link user #{$user->id} {$user->email}");

            if ($dry) {
                $linked++;

                continue;
            }

            DB::transaction(function () use ($user, $linkService, $loyalty, &$linked, &$cards): void {
                $client = $linkService->linkOrCreateClientForUser($user);
                $linked++;
                $loyalty->getOrCreateCard($client);
                $cards++;
            });
        }

        if (! $dry) {
            foreach (Client::query()->whereDoesntHave('loyaltyCard')->cursor() as $client) {
                $loyalty->getOrCreateCard($client);
                $cards++;
            }
        }

        foreach (User::query()->whereHas('client')->cursor() as $user) {
            $clientId = $user->client?->id;
            if (! $clientId) {
                continue;
            }

            $q = Commande::query()
                ->where('user_id', $user->id)
                ->where(function ($q2) use ($clientId) {
                    $q2->whereNull('client_id')
                        ->orWhereColumn('client_id', 'user_id')
                        ->orWhere('client_id', '!=', $clientId);
                });

            $count = (clone $q)->count();
            if ($count === 0) {
                continue;
            }

            $this->line("Fix {$count} commande(s) for user #{$user->id} → client_id={$clientId}");

            if (! $dry) {
                $q->update(['client_id' => $clientId]);
            }
            $orders += $count;
        }

        $this->info("Done. New user↔client links: {$linked}, loyalty cards ensured: {$cards}, commandes updated: {$orders}");

        return self::SUCCESS;
    }
}
