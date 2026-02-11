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
        $tel = $tel . '';

        if (isset($tel[0]) && $tel[0] === '+') {
            $tel = substr($tel, 1, strlen($tel) - 1);
        }

        if (isset($tel[0], $tel[1]) && $tel[0] === '0' && $tel[1] === '0') {
            $tel = substr($tel, 2, strlen($tel) - 2);
        }

        if (strlen($tel) === 8) {
            $tel = '216' . $tel;
        }

        if (strlen($tel) === 11 && $tel[0] === '2' && $tel[1] === '1' && $tel[2] === '6') {
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
            }
        }
    }
}
