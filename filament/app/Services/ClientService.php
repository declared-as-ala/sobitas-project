<?php

namespace App\Services;

use App\Models\Client;
use App\Models\User;
use Illuminate\Support\Facades\Schema;

/**
 * Client lookup/creation by phone for online orders.
 * Phone is normalized: trim, digits only, +216 prefix handled.
 */
class ClientService
{
    public const SOURCE_ONLINE = 'online';

    /**
     * Normalize phone for lookup: trim, keep digits, optional +216 prefix.
     * E.g. "+216 12 345 678", "12345678" -> 8 digits (Tunisian).
     */
    public function normalizePhone(?string $phone): ?string
    {
        if ($phone === null || $phone === '') {
            return null;
        }
        $digits = preg_replace('/\D/', '', $phone);
        if ($digits === '') {
            return null;
        }
        if (str_starts_with($digits, '216') && strlen($digits) >= 11) {
            $digits = substr($digits, 3);
        }
        if (strlen($digits) > 8 && str_starts_with($digits, '0')) {
            $digits = ltrim($digits, '0');
        }
        return $digits ?: null;
    }

    /**
     * Find or create client from online order delivery data.
     * An authenticated storefront account is resolved by its stable user mapping or canonical
     * email only. Phone matching is deliberately skipped for accounts: recycled/shared phone
     * numbers must never attach an order to somebody else's back-office client.
     *
     * @param  array<string, mixed>  $deliveryData  Keys: livraison_phone|phone, livraison_nom|nom, livraison_prenom|prenom, livraison_adresse1|adresse1, livraison_region|region, livraison_ville|ville, livraison_email|email, etc.
     * @return Client|null  The client, or null if no phone provided.
     */
    public function findOrCreateClientFromDeliveryInfo(array $deliveryData, ?User $account = null): ?Client
    {
        $phone = $deliveryData['livraison_phone'] ?? $deliveryData['phone'] ?? null;
        $email = $deliveryData['livraison_email'] ?? $deliveryData['email'] ?? null;
        $accountEmail = $account ? strtolower(trim((string) $account->email)) : '';
        if ($accountEmail !== '') {
            // The token owner is authoritative. Checkout form fields are delivery snapshots,
            // not an identity source.
            $email = $accountEmail;
        }

        if (($phone === null || trim((string) $phone) === '') && ($email === null || trim((string) $email) === '')) {
            // Require at least phone or email
            return null;
        }

        $phone = $phone !== null ? trim((string) $phone) : null;

        $nom = $deliveryData['livraison_nom'] ?? $deliveryData['nom'] ?? null;
        $prenom = $deliveryData['livraison_prenom'] ?? $deliveryData['prenom'] ?? null;
        $fullName = trim(($nom ?? '') . ' ' . ($prenom ?? ''));
        $region = $deliveryData['livraison_region'] ?? $deliveryData['region'] ?? null;
        $ville = $deliveryData['livraison_ville'] ?? $deliveryData['ville'] ?? null;
        $codePostale = $deliveryData['livraison_code_postale'] ?? $deliveryData['code_postale'] ?? null;

        // Fiche client `adresse` = adresse de livraison réelle (rue + ville + région + CP), pas seulement facturation vide.
        $adresse = $this->composeDeliveryAddressLine($deliveryData);

        $normalized = $this->normalizePhone($phone);

        $client = null;

        $isQuickOrderEmail = $email && preg_match('/^quickorder-[^@]+@protein\.tn$/i', (string) $email);

        $hasUserMapping = Schema::hasColumn((new Client())->getTable(), 'user_id');

        // 1) Stable storefront-account mapping, then canonical email. Restrict an email match to
        // an unclaimed client (or the same account) so one account can never steal another's row.
        if ($account && $hasUserMapping) {
            $client = Client::query()->where('user_id', $account->getKey())->first();
        }
        if (! $client && $email && ! $isQuickOrderEmail) {
            $client = Client::query()
                ->whereRaw('LOWER(TRIM(email)) = ?', [strtolower(trim((string) $email))])
                ->when($account && $hasUserMapping, function ($query) use ($account): void {
                    $query->where(function ($ownership) use ($account): void {
                        $ownership->whereNull('user_id')->orWhere('user_id', $account->getKey());
                    });
                })
                ->first();
        }

        // 2) Guests may be identified by phone. Authenticated accounts may not: the same phone
        // can exist as phone_2 on an older client and was the cause of the production mix-up.
        if (! $client && ! $account && $normalized !== null) {
            $client = $this->findByNormalizedPhone($normalized);
        }

        if ($client) {
            $dirty = false;
            if (($client->name === null || trim($client->name) === '') && $fullName !== '') {
                $client->name = $fullName;
                $dirty = true;
            }
            if (($client->adresse === null || trim((string) $client->adresse) === '') && $adresse !== null && $adresse !== '') {
                $client->adresse = $adresse;
                $dirty = true;
            }
            if (($client->region === null || trim((string) $client->region) === '') && $region !== null && trim((string) $region) !== '') {
                $client->region = $region;
                $dirty = true;
            }
            if (($client->ville === null || trim((string) $client->ville) === '') && $ville !== null && trim((string) $ville) !== '') {
                $client->ville = $ville;
                $dirty = true;
            }
            if (! $isQuickOrderEmail && ($client->email === null || trim($client->email) === '') && $email !== null && trim((string) $email) !== '') {
                $client->email = $email;
                $dirty = true;
            }
            if ($account && $hasUserMapping && (int) ($client->user_id ?? 0) !== (int) $account->getKey()) {
                $client->user_id = $account->getKey();
                $dirty = true;
            }
            if (property_exists($client, 'code_postale') && ($client->code_postale === null || trim((string) $client->code_postale) === '') && $codePostale !== null && trim((string) $codePostale) !== '') {
                $client->code_postale = $codePostale;
                $dirty = true;
            }
            if ($dirty) {
                $client->save();
            }
            return $client;
        }

        $client = new Client();
        $fallbackName = $account?->name ?: (($email && str_contains((string) $email, '@')) ? strstr((string) $email, '@', true) : 'Client');
        $client->name = $fullName !== '' ? $fullName : $fallbackName;

        // Keep the account/client relationship correct even if the entered phone already belongs
        // to a legacy client. The order snapshot retains the delivery number regardless.
        $phoneOwner = $normalized !== null ? $this->findByNormalizedPhone($normalized) : null;
        $client->phone_1 = ($account && $phoneOwner) ? null : $phone;
        if (! $isQuickOrderEmail) {
            $client->email = $email;
        }
        $client->adresse = ($adresse !== null && $adresse !== '') ? $adresse : null;
        $client->region = $region ?: null;
        $client->ville = $ville ?: null;
        if ($codePostale !== null && trim((string) $codePostale) !== '') {
            $client->code_postale = $codePostale;
        }
        $client->source = self::SOURCE_ONLINE;
        $client->sms = false;
        if ($account && $hasUserMapping) {
            $client->user_id = $account->getKey();
        }
        $client->save();

        return $client;
    }

    private function findByNormalizedPhone(string $normalized): ?Client
    {
        return Client::query()
            ->where(function ($query): void {
                $query->whereNotNull('phone_1')->orWhereNotNull('phone_2');
            })
            ->get()
            ->first(function (Client $client) use ($normalized): bool {
                return $this->normalizePhone($client->phone_1) === $normalized
                    || $this->normalizePhone($client->phone_2) === $normalized;
            });
    }

    /**
     * Ligne d’adresse pour `clients.adresse` : priorité livraison, puis facturation ; concat ville / région / CP.
     *
     * @param  array<string, mixed>  $deliveryData
     */
    private function composeDeliveryAddressLine(array $deliveryData): ?string
    {
        $street = trim((string) ($deliveryData['livraison_adresse1'] ?? ''));
        if ($street === '') {
            $street = trim((string) ($deliveryData['livraison_adresse2'] ?? ''));
        }
        if ($street === '') {
            $street = trim((string) ($deliveryData['adresse1'] ?? ''));
        }
        if ($street === '') {
            $street = trim((string) ($deliveryData['adresse2'] ?? ''));
        }

        $ville = trim((string) ($deliveryData['livraison_ville'] ?? $deliveryData['ville'] ?? ''));
        $region = trim((string) ($deliveryData['livraison_region'] ?? $deliveryData['region'] ?? ''));
        $cp = trim((string) ($deliveryData['livraison_code_postale'] ?? $deliveryData['code_postale'] ?? ''));

        $parts = array_values(array_filter([$street, $ville, $region, $cp], static fn (string $p): bool => $p !== ''));

        if ($parts === []) {
            return null;
        }

        return implode(', ', $parts);
    }

    /**
     * Find client by phone (phone_1 or phone_2 normalized), or create minimal client.
     * Prefer findOrCreateClientFromDeliveryInfo for full delivery data.
     */
    public function findOrCreateClientByPhone(
        string $phone,
        ?string $name = null,
        ?string $email = null,
        ?string $address = null,
        ?string $region = null
    ): ?Client {
        return $this->findOrCreateClientFromDeliveryInfo([
            'phone' => $phone,
            'livraison_nom' => $name,
            'nom' => $name,
            'email' => $email,
            'livraison_email' => $email,
            'livraison_adresse1' => $address,
            'adresse1' => $address,
            'livraison_region' => $region,
            'region' => $region,
        ]);
    }
}
