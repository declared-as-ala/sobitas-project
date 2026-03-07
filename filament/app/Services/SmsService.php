<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
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

        $apiUrl = 'https://www.winsmspro.com/sms/sms/api?' . http_build_query([
            'action'  => 'send-sms',
            'api_key' => $apiKey,
            'to'      => $tel,
            'from'    => $senderId,
            'sms'     => $sms,
        ]);

        try {
            Http::get($apiUrl);
        } catch (\Exception $e) {
            Log::error('SMS sending failed', [
                'tel'   => $tel,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
