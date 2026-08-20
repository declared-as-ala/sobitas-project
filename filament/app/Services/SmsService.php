<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
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
    public function send_sms(string $tel, string $sms): void
    {
        $tel = preg_replace('/\D/', '', (string) $tel);

        if (strlen($tel) === 8) {
            $tel = '216' . $tel;
        }

        if (strlen($tel) !== 11 || $tel[0] !== '2' || $tel[1] !== '1' || $tel[2] !== '6') {
            Log::warning('SMS skipped: invalid phone format', [
                'phone_length' => strlen($tel),
                'phone_last4'  => strlen($tel) >= 4 ? substr($tel, -4) : '****',
            ]);
            return;
        }

        $apiKey = config('services.sms.api_key');
        $senderId = config('services.sms.sender_id');

        if (! $apiKey || ! $senderId) {
            Log::warning('SMS API key or sender ID not configured');
            return;
        }

        $sms = self::toGsm7($sms);
        if ($sms === '') {
            Log::warning('SMS skipped: message empty after encoding');

            return;
        }

        $apiUrl = 'https://www.winsmspro.com/sms/sms/api?' . http_build_query([
            'action'  => 'send-sms',
            'api_key' => $apiKey,
            'to'      => $tel,
            'from'    => $senderId,
            'sms'     => $sms,
        ]);

        try {
            $response = Http::timeout(15)->get($apiUrl);

            /*
             * ── THE RESPONSE USED TO BE THROWN AWAY ─────────────────────────────────────────
             * `Http::get($apiUrl);` with the return value discarded. So an exhausted credit
             * balance, a revoked API key, a blocked sender id or a 500 from WinSMS all looked
             * exactly like a successful send — and the only symptom anywhere was customers not
             * receiving anything, with nothing in the log to find.
             *
             * WinSMS answers 200 with a body that says what happened, so the STATUS CODE alone is
             * not enough: the body has to be read. `code: ok` is success; anything else is logged
             * with the payload so the reason is in the log rather than inferred.
             */
            $body = trim((string) $response->body());

            if (! $response->successful()) {
                Log::error('SMS gateway returned an error status', [
                    'status'      => $response->status(),
                    'phone_last4' => substr($tel, -4),
                    'body'        => mb_substr($body, 0, 300),
                ]);

                return;
            }

            $json = $response->json();
            $code = is_array($json) ? strtolower((string) ($json['code'] ?? $json['status'] ?? '')) : '';
            $ok   = $code === ''
                ? ! preg_match('/error|failed|invalid|insufficient|denied/i', $body)
                : in_array($code, ['ok', 'success', '0', '200'], true);

            if (! $ok) {
                Log::error('SMS gateway refused the message', [
                    'phone_last4' => substr($tel, -4),
                    'body'        => mb_substr($body, 0, 300),
                ]);

                return;
            }

            Log::info('SMS sent', [
                'phone_last4' => substr($tel, -4),
                'length'      => mb_strlen($sms),
                'segments'    => (int) ceil(mb_strlen($sms) / 160),
            ]);
        } catch (\Exception $e) {
            Log::error('SMS sending failed', [
                'phone_last4' => substr($tel, -4),
                'error'       => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
