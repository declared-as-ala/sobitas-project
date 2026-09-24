<?php

namespace App\Services;

use App\Models\Commande;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * WhatsApp order-confirmation sender, on the Meta (Facebook) Cloud API.
 *
 * ── WHY A TEMPLATE, NOT PLAIN TEXT ───────────────────────────────────────────────────────────
 * Meta only lets a business send FREE-FORM text to a user inside a 24-hour "customer service
 * window" that opens when the user messages the business first. An order confirmation is sent
 * BEFORE the customer has written anything, so it must be a pre-approved TEMPLATE message
 * (created and approved in Meta Business Manager). `config('services.whatsapp.template')` names it.
 * A plain-text mode is kept only for testing against a number that has just messaged you.
 *
 * ── INERT BY DEFAULT ─────────────────────────────────────────────────────────────────────────
 * `enabled()` is false until the token and phone-number id are configured, so a deploy without
 * credentials sends nothing. The Filament action and the observer both check `enabled()` first.
 */
class WhatsAppService
{
    public function enabled(): bool
    {
        return filled(config('services.whatsapp.token'))
            && filled(config('services.whatsapp.phone_number_id'));
    }

    /**
     * Send the order-confirmation message to the order's phone.
     * Returns ['ok' => bool, 'message' => string, 'wamid' => ?string].
     */
    public function sendOrderConfirmation(Commande $order): array
    {
        if (! $this->enabled()) {
            return ['ok' => false, 'message' => 'WhatsApp non configuré (token / phone number id manquants).', 'wamid' => null];
        }

        $to = $this->normalizeTunisianPhone((string) ($order->livraison_phone ?: $order->phone));
        if ($to === null) {
            return ['ok' => false, 'message' => 'Numéro de téléphone invalide pour WhatsApp.', 'wamid' => null];
        }

        $version = config('services.whatsapp.api_version', 'v21.0');
        $phoneId = config('services.whatsapp.phone_number_id');
        $endpoint = "https://graph.facebook.com/{$version}/{$phoneId}/messages";

        $payload = $this->buildPayload($order, $to);

        try {
            $response = Http::withToken(config('services.whatsapp.token'))
                ->acceptJson()
                ->timeout(20)
                ->post($endpoint, $payload);

            if ($response->successful()) {
                $wamid = data_get($response->json(), 'messages.0.id');
                Log::channel('daily')->info('WhatsApp confirmation sent', [
                    'commande_id' => $order->id,
                    'phone_last4' => substr($to, -4),
                    'wamid'       => $wamid,
                ]);

                return ['ok' => true, 'message' => 'Message WhatsApp envoyé.', 'wamid' => $wamid];
            }

            // Meta returns a structured error; surface its message so staff see the real reason
            // (unapproved template, number not on WhatsApp, token expired) instead of a generic fail.
            $error = data_get($response->json(), 'error.message', 'Erreur inconnue de l\'API WhatsApp.');
            Log::channel('daily')->warning('WhatsApp send failed', [
                'commande_id' => $order->id,
                'phone_last4' => substr($to, -4),
                'status'      => $response->status(),
                'error'       => $error,
            ]);

            return ['ok' => false, 'message' => $error, 'wamid' => null];
        } catch (\Throwable $e) {
            Log::channel('daily')->error('WhatsApp send exception', [
                'commande_id' => $order->id,
                'error'       => $e->getMessage(),
            ]);

            return ['ok' => false, 'message' => 'Échec de connexion à WhatsApp : ' . $e->getMessage(), 'wamid' => null];
        }
    }

    /**
     * Template message when a template is configured (the only shape Meta allows for a proactive
     * send), otherwise a plain text message (testing only, inside the 24h window).
     */
    private function buildPayload(Commande $order, string $to): array
    {
        $name    = trim(($order->livraison_prenom ?: $order->prenom) . ' ' . ($order->livraison_nom ?: $order->nom));
        $numero  = (string) ($order->numero ?? $order->id);
        $total   = number_format((float) ($order->prix_ttc ?? 0), 3, '.', ' ') . ' DT';

        $template = config('services.whatsapp.template');
        if (filled($template)) {
            // The template must be built in Meta Business Manager with three {{1}} {{2}} {{3}} body
            // parameters in this order: client name, order number, total. Adjust the template there,
            // not here, if the wording changes — the parameters are all this code supplies.
            return [
                'messaging_product' => 'whatsapp',
                'to'                => $to,
                'type'              => 'template',
                'template'          => [
                    'name'     => $template,
                    'language' => ['code' => config('services.whatsapp.template_lang', 'fr')],
                    'components' => [[
                        'type'       => 'body',
                        'parameters' => [
                            ['type' => 'text', 'text' => $name !== '' ? $name : 'Client'],
                            ['type' => 'text', 'text' => $numero],
                            ['type' => 'text', 'text' => $total],
                        ],
                    ]],
                ],
            ];
        }

        // Plain-text fallback (testing only).
        $body = "Bonjour {$name}, merci pour votre commande n°{$numero} d'un montant de {$total}."
            . " Merci de répondre OUI pour confirmer votre commande. — SOBITAS / Protein.tn";

        return [
            'messaging_product' => 'whatsapp',
            'to'                => $to,
            'type'              => 'text',
            'text'              => ['body' => $body],
        ];
    }

    /**
     * Tunisian number → "216XXXXXXXX" (no '+'), the shape the Cloud API wants. Same rule the SMS
     * service uses. Returns null when the number cannot be made valid, so the caller can skip
     * rather than send to a malformed recipient.
     */
    private function normalizeTunisianPhone(string $phone): ?string
    {
        $phone = preg_replace('/\D/', '', $phone) ?? '';

        // Drop a leading 00 international prefix (0021612345678 → 21612345678).
        if (str_starts_with($phone, '00')) {
            $phone = substr($phone, 2);
        }
        if (strlen($phone) === 8) {
            $phone = '216' . $phone;
        }

        if (! preg_match('/^216\d{8}$/', $phone)) {
            return null;
        }

        return $phone;
    }

    /**
     * Convenience for callers that want to hard-fail (e.g. a queued job) rather than inspect a
     * result array.
     */
    public function sendOrConfirmationThrow(Commande $order): void
    {
        $result = $this->sendOrderConfirmation($order);
        if (! $result['ok']) {
            throw new RuntimeException($result['message']);
        }
    }
}
