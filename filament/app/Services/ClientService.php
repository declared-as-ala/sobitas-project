<?php

namespace App\Services;

use App\Models\Client;

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
     * Uses phone as primary identifier; updates missing name/address/region/ville if client exists.
     *
     * @param  array<string, mixed>  $deliveryData  Keys: livraison_phone|phone, livraison_nom|nom, livraison_prenom|prenom, livraison_adresse1|adresse1, livraison_region|region, livraison_ville|ville, livraison_email|email, etc.
     * @return Client|null  The client, or null if no phone provided.
     */
    public function findOrCreateClientFromDeliveryInfo(array $deliveryData): ?Client
    {
        $phone = $deliveryData['livraison_phone'] ?? $deliveryData['phone'] ?? null;
        $email = $deliveryData['livraison_email'] ?? $deliveryData['email'] ?? null;

        if (($phone === null || trim((string) $phone) === '') && ($email === null || trim((string) $email) === '')) {
            // Require at least phone or email
            return null;
        }

        $phone = $phone !== null ? trim((string) $phone) : null;

        $nom = $deliveryData['livraison_nom'] ?? $deliveryData['nom'] ?? null;
        $prenom = $deliveryData['livraison_prenom'] ?? $deliveryData['prenom'] ?? null;
        $fullName = trim(($nom ?? '') . ' ' . ($prenom ?? ''));
        $adresse1 = $deliveryData['livraison_adresse1'] ?? $deliveryData['adresse1'] ?? null;
        $adresse2 = $deliveryData['livraison_adresse2'] ?? $deliveryData['adresse2'] ?? null;
        $adresse = trim(($adresse1 ?? '') . ($adresse2 ? ' ' . $adresse2 : ''));
        $region = $deliveryData['livraison_region'] ?? $deliveryData['region'] ?? null;
        $ville = $deliveryData['livraison_ville'] ?? $deliveryData['ville'] ?? null;
        $codePostale = $deliveryData['livraison_code_postale'] ?? $deliveryData['code_postale'] ?? null;

        $normalized = $this->normalizePhone($phone);

        $client = null;

        $isQuickOrderEmail = $email && preg_match('/^quickorder-[^@]+@protein\.tn$/i', (string) $email);

        // 1) Real customer emails: try email first
        if ($email && ! $isQuickOrderEmail) {
            $client = Client::where('email', $email)->first();
        }

        // 2) Then phone (primary key when available)
        if (! $client && $normalized !== null) {
            $client = Client::query()
                ->whereNotNull('phone_1')
                ->orWhereNotNull('phone_2')
                ->get()
                ->first(function (Client $c) use ($normalized) {
                    $n1 = $this->normalizePhone($c->phone_1);
                    $n2 = $this->normalizePhone($c->phone_2);
                    return $n1 === $normalized || $n2 === $normalized;
                });
        }

        if ($client) {
            $dirty = false;
            if (($client->name === null || trim($client->name) === '') && $fullName !== '') {
                $client->name = $fullName;
                $dirty = true;
            }
            if (($client->adresse === null || trim($client->adresse) === '') && $adresse !== '') {
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
        $client->name = $fullName !== '' ? $fullName : 'Client ' . substr($normalized, -4);
        $client->phone_1 = $phone;
        if (! $isQuickOrderEmail) {
            $client->email = $email;
        }
        $client->adresse = $adresse ?: null;
        $client->region = $region ?: null;
        $client->ville = $ville ?: null;
        if ($codePostale !== null && trim((string) $codePostale) !== '') {
            $client->code_postale = $codePostale;
        }
        $client->source = self::SOURCE_ONLINE;
        $client->sms = false;
        $client->save();

        return $client;
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
