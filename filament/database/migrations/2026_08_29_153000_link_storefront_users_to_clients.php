<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('clients') || ! Schema::hasTable('users')) {
            return;
        }

        if (! Schema::hasColumn('clients', 'user_id')) {
            Schema::table('clients', function (Blueprint $table): void {
                $table->unsignedBigInteger('user_id')->nullable()->unique('clients_user_id_unique');
            });
        }

        if (! Schema::hasTable('commandes') || ! Schema::hasColumn('commandes', 'client_id')) {
            return;
        }

        DB::table('users')
            ->select(['id', 'name', 'email'])
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->orderBy('id')
            ->chunkById(200, function ($users): void {
                foreach ($users as $user) {
                    $email = strtolower(trim((string) $user->email));
                    if ($email === '') {
                        continue;
                    }

                    // Never infer account ownership from the numeric user_id alone: historically
                    // that column stored Client ids, and cross-table ids routinely collide.
                    $matchingOrders = DB::table('commandes')->where(function ($query) use ($email): void {
                        $query->whereRaw('LOWER(TRIM(email)) = ?', [$email])
                            ->orWhereRaw('LOWER(TRIM(livraison_email)) = ?', [$email]);
                    });

                    $client = DB::table('clients')->where('user_id', $user->id)->first();
                    if (! $client) {
                        $client = DB::table('clients')
                            ->whereRaw('LOWER(TRIM(email)) = ?', [$email])
                            ->where(function ($query) use ($user): void {
                                $query->whereNull('user_id')->orWhere('user_id', $user->id);
                            })
                            ->first();
                    }

                    $latestOrder = (clone $matchingOrders)->latest('id')->first();
                    if (! $client && ! $latestOrder) {
                        continue;
                    }

                    if (! $client) {
                        $name = trim((string) (($latestOrder->livraison_nom ?? $latestOrder->nom ?? '') . ' ' . ($latestOrder->livraison_prenom ?? $latestOrder->prenom ?? '')));
                        $clientId = DB::table('clients')->insertGetId([
                            'user_id' => $user->id,
                            'name' => $name !== '' ? $name : ($user->name ?: strstr($email, '@', true)),
                            'email' => $email,
                            // Do not copy a potentially shared/recycled phone into a unique client
                            // field. The delivery snapshot remains on every order.
                            'phone_1' => null,
                            'adresse' => $latestOrder->livraison_adresse1 ?? $latestOrder->adresse1 ?? null,
                            'region' => $latestOrder->livraison_region ?? $latestOrder->region ?? null,
                            'ville' => $latestOrder->livraison_ville ?? $latestOrder->ville ?? null,
                            'code_postale' => $latestOrder->livraison_code_postale ?? $latestOrder->code_postale ?? null,
                            'source' => 'online',
                            'sms' => false,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    } else {
                        $clientId = (int) $client->id;
                        DB::table('clients')->where('id', $clientId)->update([
                            'user_id' => $user->id,
                            'email' => $client->email ?: $email,
                            'updated_at' => now(),
                        ]);
                    }

                    $matchingOrders->update([
                        'user_id' => $user->id,
                        'client_id' => $clientId,
                    ]);
                }
            }, 'id');
    }

    public function down(): void
    {
        if (Schema::hasColumn('clients', 'user_id')) {
            Schema::table('clients', function (Blueprint $table): void {
                $table->dropUnique('clients_user_id_unique');
                $table->dropColumn('user_id');
            });
        }
    }
};
