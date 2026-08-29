<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('commandes') || ! Schema::hasColumn('commandes', 'client_id')) {
            return;
        }

        $normalEmail = static fn ($value): string => strtolower(trim((string) $value));
        $normalPhone = static function ($value): string {
            $digits = preg_replace('/\D/', '', (string) $value) ?: '';
            if (str_starts_with($digits, '216') && strlen($digits) >= 11) {
                $digits = substr($digits, 3);
            }
            if (strlen($digits) > 8 && str_starts_with($digits, '0')) {
                $digits = ltrim($digits, '0');
            }

            return $digits;
        };

        $uniqueMap = static function (array $pairs): array {
            $grouped = [];
            foreach ($pairs as [$key, $id]) {
                if ($key !== '') {
                    $grouped[$key][] = (int) $id;
                }
            }

            $result = [];
            foreach ($grouped as $key => $ids) {
                $ids = array_values(array_unique($ids));
                if (count($ids) === 1) {
                    $result[$key] = $ids[0];
                }
            }

            return $result;
        };

        $clients = DB::table('clients')->get(['id', 'email', 'phone_1', 'phone_2']);
        $clientEmails = $uniqueMap($clients->map(
            fn ($client): array => [$normalEmail($client->email), $client->id]
        )->all());
        $clientPhonePairs = [];
        foreach ($clients as $client) {
            $clientPhonePairs[] = [$normalPhone($client->phone_1), $client->id];
            $clientPhonePairs[] = [$normalPhone($client->phone_2), $client->id];
        }
        $clientPhones = $uniqueMap($clientPhonePairs);

        $userEmails = Schema::hasTable('users')
            ? $uniqueMap(DB::table('users')->get(['id', 'email'])->map(
                fn ($user): array => [$normalEmail($user->email), $user->id]
            )->all())
            : [];

        DB::table('commandes')
            ->select(['id', 'email', 'livraison_email', 'phone', 'livraison_phone', 'user_id', 'client_id'])
            ->orderBy('id')
            ->chunkById(250, function ($orders) use ($normalEmail, $normalPhone, $clientEmails, $clientPhones, $userEmails): void {
                foreach ($orders as $order) {
                    $email = $normalEmail($order->livraison_email ?: $order->email);
                    $phone = $normalPhone($order->livraison_phone ?: $order->phone);
                    $changes = [];

                    $matchedClientId = $clientEmails[$email] ?? $clientPhones[$phone] ?? null;
                    if ($matchedClientId && (int) $order->client_id !== $matchedClientId) {
                        $changes['client_id'] = $matchedClientId;
                    }

                    // Exact account-email ownership is a safe way to restore legacy/guest orders to
                    // "Mes commandes". Do not infer a storefront user from a numeric Client id.
                    $matchedUserId = $userEmails[$email] ?? null;
                    if ($matchedUserId && (int) $order->user_id !== $matchedUserId) {
                        $changes['user_id'] = $matchedUserId;
                    }

                    if ($changes !== []) {
                        DB::table('commandes')->where('id', $order->id)->update($changes);
                    }
                }
            }, 'id');
    }

    public function down(): void
    {
        // This is a corrective data migration. The previous cross-table numeric associations were
        // not valid identity data and must not be reconstructed during rollback.
    }
};
