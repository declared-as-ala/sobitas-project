<?php

namespace App\Services;

use App\Models\Client;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Links Laravel {@see User} accounts to CRM {@see Client} records (loyalty / commandes.client_id).
 */
class CustomerUserLinkService
{
    public function __construct(private readonly ClientService $clientService) {}

    /**
     * Find or create the Client for this user and set clients.user_id.
     */
    public function linkOrCreateClientForUser(User $user): Client
    {
        $existing = Client::where('user_id', $user->id)->first();
        if ($existing) {
            return $existing;
        }

        $email = $user->email ? Str::lower(trim($user->email)) : null;
        $phone = $user->phone ? trim((string) $user->phone) : null;

        $client = null;
        if ($email) {
            $client = Client::whereRaw('LOWER(email) = ?', [$email])->first();
        }
        if (! $client && $phone) {
            $normalized = $this->clientService->normalizePhone($phone);
            if ($normalized) {
                $client = Client::query()
                    ->where(function ($q) {
                        $q->whereNotNull('phone_1')->orWhereNotNull('phone_2');
                    })
                    ->get()
                    ->first(function (Client $c) use ($normalized) {
                        $n1 = $this->clientService->normalizePhone($c->phone_1);
                        $n2 = $this->clientService->normalizePhone($c->phone_2);

                        return $n1 === $normalized || $n2 === $normalized;
                    });
            }
        }

        return DB::transaction(function () use ($client, $user) {
            if ($client) {
                if ($client->user_id === null) {
                    $client->user_id = $user->id;
                    $this->mergeUserIntoClient($client, $user);
                    $client->save();
                } elseif ((int) $client->user_id !== (int) $user->id) {
                    return $this->createClientFromUser($user);
                }

                return $client;
            }

            return $this->createClientFromUser($user);
        });
    }

    private function createClientFromUser(User $user): Client
    {
        return Client::create([
            'name'    => trim((string) $user->name) !== '' ? $user->name : 'Client',
            'email'   => $user->email,
            'phone_1' => $user->phone,
            'source'  => ClientService::SOURCE_ONLINE,
            'sms'     => false,
            'user_id' => $user->id,
        ]);
    }

    private function mergeUserIntoClient(Client $client, User $user): void
    {
        if (($client->email === null || trim((string) $client->email) === '') && $user->email) {
            $client->email = $user->email;
        }
        if (($client->phone_1 === null || trim((string) $client->phone_1) === '') && $user->phone) {
            $client->phone_1 = $user->phone;
        }
        if (($client->name === null || trim((string) $client->name) === '') && $user->name) {
            $client->name = $user->name;
        }
    }
}
