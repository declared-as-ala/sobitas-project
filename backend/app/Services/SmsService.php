<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    public function send(?string $phone, ?string $message): void
    {
        // Validate inputs - handle null values
        if (empty($phone) || empty($message)) {
            Log::warning('SMS: Empty or null phone or message', [
                'phone' => $phone,
                'message' => $message ? 'present' : 'null',
            ]);
            return;
        }

        // Trim and validate after null check
        $phone = trim($phone);
        $message = trim($message);

        if (empty($phone) || empty($message)) {
            Log::warning('SMS: Empty phone or message after trimming', ['phone' => $phone]);
            return;
        }

        $tel = $this->normalizePhone($phone);

        // Validate normalized phone
        if (empty($tel) || strlen($tel) !== 11 || !str_starts_with($tel, '216')) {
            Log::warning('SMS: Invalid phone number format', ['phone' => $phone, 'normalized' => $tel]);
            return;
        }

        $apiKey = config('services.sms.api_key');
        $senderId = config('services.sms.sender_id');

        if (!$apiKey || !$senderId) {
            Log::warning('SMS: Missing API configuration');
            return;
        }

        try {
            Http::get('https://www.winsmspro.com/sms/sms/api', [
                'action' => 'send-sms',
                'api_key' => $apiKey,
                'to' => $tel,
                'from' => $senderId,
                'sms' => $message,
            ]);

            Log::info('SMS sent successfully', ['phone' => $tel]);
        } catch (\Exception $e) {
            Log::error('SMS sending failed', [
                'phone' => $tel,
                'error' => $e->getMessage(),
            ]);
        }
    }

    // Backward compat - handle null values
    public function send_sms(?string $tel, ?string $sms): void
    {
        // Validate inputs before calling send()
        if (empty($tel) || empty($sms)) {
            Log::warning('SMS: send_sms called with empty/null values', [
                'tel' => $tel,
                'sms' => $sms ? 'present' : 'null',
            ]);
            return;
        }

        $this->send($tel, $sms);
    }

    private function normalizePhone(?string $phone): string
    {
        // Handle null or empty phone
        if (empty($phone)) {
            return '';
        }

        $tel = trim($phone);

        // Return empty string if phone is empty after trimming
        if (empty($tel)) {
            return '';
        }

        // Remove leading + if present
        if (strlen($tel) > 0 && str_starts_with($tel, '+')) {
            $tel = substr($tel, 1);
        }

        // Remove leading 00 if present
        if (strlen($tel) >= 2 && str_starts_with($tel, '00')) {
            $tel = substr($tel, 2);
        }

        // Add country code if it's an 8-digit local number
        if (strlen($tel) === 8) {
            $tel = '216' . $tel;
        }

        return $tel;
    }
}
