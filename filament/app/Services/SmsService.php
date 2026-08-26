<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class SmsService
{
    private const ENDPOINT = 'https://www.winsmspro.com/sms/sms/api';

    private const ERROR_MESSAGES = [
        '100' => 'passerelle indisponible',
        '101' => 'action WinSMS invalide',
        '102' => 'authentification WinSMS refusée',
        '103' => 'numéro de téléphone invalide',
        '105' => 'solde SMS insuffisant',
        '106' => 'expéditeur SMS invalide',
        '107' => 'type de SMS invalide',
        '108' => 'passerelle SMS inactive',
        '109' => 'programmation SMS invalide',
        '110' => 'paramètre WinSMS manquant ou invalide',
        '111' => 'message refusé comme spam',
        '112' => 'numéro sur liste noire',
        '113' => 'limite de débit WinSMS atteinte',
        '429' => 'limite de débit WinSMS atteinte',
        '555' => 'licence WinSMS expirée',
        '888' => 'expéditeur SMS indisponible',
        '999' => 'référence WinSMS invalide',
    ];

    /**
     * ── WHAT ONE SMS COSTS, AND WHY THE ALPHABET DECIDES IT ─────────────────────────────────
     * A GSM-7 message carries 160 characters per segment. A single character outside that
     * alphabet — one emoji, one curly apostrophe, one "ô" — switches the WHOLE message to UCS-2,
     * where a segment is 70 characters. So a 150-character order confirmation is one segment as
     * plain text and THREE segments with a tick mark in it: the same message, billed three times,
     * on every order this shop takes.
     *
     * The order-confirmation SMS shipped with "confirmée ✅" and "confiriance 🙌" in it.
     *
     * `toGsm7()` is not censorship of the copy: it transliterates what has a GSM-7 equivalent
     * (curly quotes, dashes, "œ") and drops what does not (emoji). The message reads the same and
     * costs what it should. `é è à ù ì ò ç Ä Ö Ñ Ü §` and friends are IN the GSM-7 default
     * alphabet and are deliberately left alone — French does not need mangling to be cheap.
     */
    private const GSM7_TRANSLIT = [
        // Curly quotes and dashes, which word processors and our own copy insert silently.
        '’' => "'", '‘' => "'", '‚' => "'", '“' => '"', '”' => '"', '„' => '"',
        '–' => '-', '—' => '-', '…' => '...', '·' => '.', ' ' => ' ', ' ' => ' ',
        // Latin letters with accents that GSM-7 does NOT carry. French uses all of these.
        'â' => 'a', 'ä' => 'a', 'á' => 'a', 'ã' => 'a', 'å' => 'a',
        'ê' => 'e', 'ë' => 'e', 'é' => 'é', 'è' => 'è',
        'î' => 'i', 'ï' => 'i', 'í' => 'i',
        'ô' => 'o', 'ö' => 'ö', 'ó' => 'o', 'õ' => 'o',
        'û' => 'u', 'ü' => 'ü', 'ú' => 'u',
        'ÿ' => 'y', 'œ' => 'oe', 'Œ' => 'OE', 'æ' => 'ae', 'Æ' => 'AE',
        'Â' => 'A', 'Ê' => 'E', 'É' => 'É', 'È' => 'E', 'Î' => 'I', 'Ô' => 'O', 'Û' => 'U',
        'Ç' => 'Ç', 'ç' => 'c',
    ];

    /**
     * Make a message safe (and cheap) for a GSM-7 gateway.
     *
     * Anything still outside the alphabet after transliteration — emoji, Arabic, CJK — is dropped
     * rather than sent, because a single stray glyph triples the bill for the entire message. The
     * one exception a Tunisian shop might want is an Arabic SMS, which is genuinely UCS-2 and
     * cannot be anything else; that is a deliberate decision for a different message, not
     * something to reach by accident through a stray emoji in a French one.
     */
    public static function toGsm7(string $text): string
    {
        $text = strtr($text, self::GSM7_TRANSLIT);

        // The GSM 03.38 default alphabet plus its extension table, as a character class.
        $allowed = '/[^'
            . 'A-Za-z0-9'
            . preg_quote('@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\[~]|€', '/')
            . '\r\n'
            . ']/u';

        $clean = preg_replace($allowed, '', $text);

        // Collapse the runs of spaces a dropped emoji leaves behind ("confiance  ." -> "confiance.")
        $clean = preg_replace('/[ \t]{2,}/', ' ', (string) $clean);
        $clean = preg_replace('/ +([.,;:!?])/', '$1', (string) $clean);

        return trim((string) $clean);
    }

    /**
     * Send SMS to a phone number using WinSMS Pro API.
     *
     * ⚠️ LEGACY CODE — phone formatting is replicated from backend.
     * The original code uses string indexing for prefix detection.
     */
    public function send_sms(string $tel, string $sms): string
    {
        $tel = $this->normalizeTunisianPhone($tel);

        $apiKey = config('services.sms.api_key');
        $senderId = config('services.sms.sender_id');

        if (! $apiKey || ! $senderId) {
            Log::error('SMS API key or sender ID not configured');
            throw new RuntimeException('SMS_API_KEY ou SMS_SENDER_ID non configuré.');
        }

        $sms = self::toGsm7($sms);
        if ($sms === '') {
            Log::warning('SMS skipped: message empty after encoding');
            throw new RuntimeException('Le SMS est vide après normalisation GSM-7.');
        }

        try {
            $response = Http::acceptJson()->timeout(15)->get(self::ENDPOINT, [
                'action'  => 'send-sms',
                'api_key' => $apiKey,
                'to'      => $tel,
                'from'    => $senderId,
                'sms'     => $sms,
            ]);

            // Do not discard the gateway response. HTTP failures and explicit refusal payloads
            // must reach the queue as exceptions so Laravel can retry and operators can diagnose
            // the actual failure instead of logging a false successful send.
            $body = trim((string) $response->body());

            if (! $response->successful()) {
                throw new RuntimeException(sprintf(
                    'WinSMS HTTP %d: %s',
                    $response->status(),
                    mb_substr($body, 0, 180)
                ));
            }

            $json = $response->json();
            if (! is_array($json)) {
                throw new RuntimeException('Réponse WinSMS illisible.');
            }

            $code = strtolower(trim((string) ($json['code'] ?? $json['status'] ?? '')));
            if (! in_array($code, ['ok', 'success', '0', '200'], true)) {
                $reason = self::ERROR_MESSAGES[$code]
                    ?? trim((string) ($json['message'] ?? 'message refusé'));
                throw new RuntimeException("WinSMS a refusé le message ({$code}): {$reason}");
            }

            $reference = trim((string) ($json['reference'] ?? $json['ref'] ?? ''));

            Log::info('SMS sent', [
                'phone_last4' => substr($tel, -4),
                'length'      => mb_strlen($sms),
                'segments'    => (int) ceil(mb_strlen($sms) / 160),
                'reference'   => $reference !== '' ? $reference : null,
            ]);

            return $reference;
        } catch (\Exception $e) {
            Log::error('SMS sending failed', [
                'phone_last4' => substr($tel, -4),
                'error'       => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Confirm the configured account can reach WinSMS without sending a message.
     * WinSMS documents a 30-second rate limit for this balance endpoint, so callers
     * should use it only as an explicit diagnostic (for example during a deploy).
     */
    public function probe(): array
    {
        $apiKey = (string) config('services.sms.api_key', '');
        if ($apiKey === '') {
            throw new RuntimeException('SMS_API_KEY non configuré.');
        }

        $response = Http::acceptJson()->timeout(15)->get(self::ENDPOINT, [
            'action' => 'check-balance',
            'api_key' => $apiKey,
            'response' => 'json',
        ]);

        if (! $response->successful()) {
            throw new RuntimeException('WinSMS est inaccessible (HTTP '.$response->status().').');
        }

        $json = $response->json();
        if (! is_array($json)) {
            throw new RuntimeException('Réponse WinSMS illisible.');
        }

        $code = strtolower(trim((string) ($json['code'] ?? $json['status'] ?? 'ok')));
        if (! in_array($code, ['ok', 'success', '0', '200'], true)) {
            $reason = self::ERROR_MESSAGES[$code]
                ?? trim((string) ($json['message'] ?? 'connexion refusée'));
            throw new RuntimeException("Connexion WinSMS refusée ({$code}): {$reason}");
        }

        return [
            'balance' => $json['balance'] ?? $json['credit'] ?? null,
            'license' => $json['license'] ?? $json['licence'] ?? $json['expiration'] ?? null,
        ];
    }

    private function normalizeTunisianPhone(string $phone): string
    {
        $phone = preg_replace('/\D/', '', $phone) ?? '';

        if (strlen($phone) === 8) {
            $phone = '216'.$phone;
        }

        if (! preg_match('/^216\d{8}$/', $phone)) {
            Log::warning('SMS skipped: invalid phone format', [
                'phone_length' => strlen($phone),
                'phone_last4' => strlen($phone) >= 4 ? substr($phone, -4) : '****',
            ]);
            throw new RuntimeException('Numéro SMS tunisien invalide.');
        }

        return $phone;
    }
}
