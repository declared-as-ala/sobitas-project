<?php

namespace App\Services;

use App\Models\Client;
use App\Models\MarketingLog;
use App\Models\MarketingSetting;
use App\Models\MarketingTemplate;
use Illuminate\Support\Str;

class MarketingService
{
    public const SMS_STOP_DEFAULT = 'STOP';

    /**
     * Absolute URL for the orange Protein.tn wordmark used in email templates (public/logo.png).
     */
    public static function logoUrl(): string
    {
        $configured = trim((string) config('marketing.logo_url', ''));

        return $configured !== '' ? $configured : asset('logo.png');
    }

    /**
     * Logo URL for admin send-email / iframe preview (can differ via MARKETING_PREVIEW_LOGO_URL).
     */
    public static function previewLogoUrl(): string
    {
        $configured = trim((string) config('marketing.preview_logo_url', ''));

        return $configured !== '' ? $configured : self::logoUrl();
    }

    public static function unsubscribeUrl(string $channel, string $recipient, ?int $clientId = null): string
    {
        $payload = [
            'c' => $channel,
            'r' => $recipient,
            'id' => $clientId,
            'exp' => now()->addDays(30)->timestamp,
        ];
        $token = base64_encode(json_encode($payload));
        $sign = hash_hmac('sha256', $token, config('app.key'));
        return url('/unsubscribe?t=' . urlencode($token) . '&s=' . $sign);
    }

    public static function resolveUnsubscribe(string $token, string $sign): ?array
    {
        $expected = hash_hmac('sha256', $token, config('app.key'));
        if (!hash_equals($expected, $sign)) {
            return null;
        }
        $data = json_decode(base64_decode($token), true);
        if (!$data || ($data['exp'] ?? 0) < time()) {
            return null;
        }
        return $data;
    }

    public static function smsWithStop(string $body, string $stopText = self::SMS_STOP_DEFAULT): string
    {
        $stopText = trim($stopText) ?: self::SMS_STOP_DEFAULT;
        if (stripos($body, $stopText) !== false) {
            return $body;
        }
        return rtrim($body) . ' ' . $stopText;
    }

    /**
     * Normalize phone for SMS: digits only, optional leading +.
     * Tunisian: ensure 8 digits after country code (216 or 0).
     */
    public static function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);
        if ($digits === '') {
            return $phone;
        }
        if (str_starts_with($digits, '216') && strlen($digits) === 11) {
            return '+' . $digits;
        }
        if (str_starts_with($digits, '0') && strlen($digits) === 9) {
            return '+216' . substr($digits, 1);
        }
        if (strlen($digits) === 8 && !str_starts_with($digits, '216')) {
            return '+216' . $digits;
        }
        return '+' . $digits;
    }

    public static function isValidPhone(string $phone): bool
    {
        $normalized = self::normalizePhone($phone);
        $digits = preg_replace('/\D/', '', $normalized);
        return strlen($digits) >= 8 && strlen($digits) <= 15;
    }

    public static function clientsForSms(string $mode, array $selectedIds = []): \Illuminate\Database\Eloquent\Collection
    {
        $q = Client::whereNotNull('phone_1')
            ->where('phone_1', '!=', '')
            ->whereNull('sms_unsubscribed_at');
        if ($mode === 'all') {
            $q->where('sms', 1);
        } elseif ($mode === 'selected' && !empty($selectedIds)) {
            $q->whereIn('id', $selectedIds);
        } else {
            return collect();
        }
        return $q->select('id', 'name', 'phone_1')->get();
    }

    public static function clientsForEmail(string $mode, array $selectedIds = []): \Illuminate\Database\Eloquent\Collection
    {
        $q = Client::whereNotNull('email')
            ->where('email', '!=', '')
            ->whereNull('email_unsubscribed_at');
        if ($mode === 'all') {
            // all with valid email
        } elseif ($mode === 'selected' && !empty($selectedIds)) {
            $q->whereIn('id', $selectedIds);
        } else {
            return collect();
        }
        return $q->select('id', 'name', 'email')->get();
    }

    public static function renderEmailHtml(MarketingTemplate $template, array $variables, string $unsubscribeUrl): string
    {
        $vars = array_merge($variables, [
            'logo_url' => self::logoUrl(),
            'unsubscribe_url' => $unsubscribeUrl,
        ]);
        $html = $template->content_html ?? '';
        foreach ($vars as $key => $value) {
            if (is_array($value) || is_object($value)) {
                continue;
            }
            $html = str_replace('{{' . $key . '}}', (string) $value, $html);
        }
        return $html;
    }

    public static function createLog(string $channel, ?int $templateId, string $recipientType, string $recipientValue, ?int $clientId, string $status, ?string $campaignId = null, ?string $providerId = null, ?string $error = null): MarketingLog
    {
        return MarketingLog::create([
            'channel' => $channel,
            'template_id' => $templateId,
            'recipient_type' => $recipientType,
            'recipient_value' => $recipientValue,
            'client_id' => $clientId,
            'status' => $status,
            'campaign_id' => $campaignId,
            'provider_message_id' => $providerId,
            'error_message' => $error,
            'sent_at' => $status === 'sent' ? now() : null,
        ]);
    }
}
