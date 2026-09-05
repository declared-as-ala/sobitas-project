<?php

namespace App\Jobs;

use App\Mail\MarketingEmailMailable;
use App\Models\MarketingLog;
use App\Services\MarketingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendMarketingEmailJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;
    public int $backoff = 10;

    public function __construct(
        public string $toEmail,
        public string $subject,
        public string $htmlBody,
        public string $unsubscribeUrl,
        public ?int $templateId = null,
        public ?int $clientId = null,
        public ?string $campaignId = null,
        public ?int $marketingCampaignId = null,
    ) {}

    public function handle(): void
    {
        $idempotencyKey = 'email:'.($this->campaignId ?: 'manual').':'.hash('sha256', strtolower($this->toEmail));
        $log = MarketingLog::firstOrCreate(['idempotency_key' => $idempotencyKey], [
            'channel' => 'email',
            'template_id' => $this->templateId,
            'recipient_type' => 'email',
            'recipient_value' => $this->toEmail,
            'client_id' => $this->clientId,
            'status' => 'queued',
            'campaign_id' => $this->campaignId,
        ]);

        if ($log->status === 'sent' || $log->status === 'skipped') {
            return;
        }

        if (! MarketingService::canEmailRecipient($this->toEmail, $this->clientId)) {
            $log->update(['status' => 'skipped', 'error_message' => 'Recipient unsubscribed before delivery']);
            if ($this->marketingCampaignId) {
                \App\Models\MarketingCampaign::find($this->marketingCampaignId)?->incrementSkipped();
            }

            return;
        }

        // Debug: same mailer/from as order emails (compare with SendOrderEmailJob log)
        Log::info('Campaign email: mailer and from (must match order emails)', [
            'mail_default' => config('mail.default'),
            'mail_from' => config('mail.from'),
            'recipient' => $this->toEmail,
            'campaign_id' => $this->marketingCampaignId,
        ]);

        Log::info('Sending marketing email', [
            'email' => $this->toEmail,
            'campaign_id' => $this->marketingCampaignId,
            'subject' => $this->subject,
        ]);

        try {
            Mail::to($this->toEmail)->send(new MarketingEmailMailable(
                $this->subject,
                $this->htmlBody,
                $this->unsubscribeUrl
            ));

            $log->update(['status' => 'sent', 'sent_at' => now()]);
            if ($this->marketingCampaignId) {
                \App\Models\MarketingCampaign::find($this->marketingCampaignId)?->incrementSent();
            }
            Log::info('Marketing email sent ok', ['email' => $this->toEmail, 'campaign_id' => $this->marketingCampaignId]);
        } catch (\Throwable $e) {
            $message = $e->getMessage();
            Log::error('Marketing email send failed', [
                'email' => $this->toEmail,
                'campaign_id' => $this->marketingCampaignId,
                'error' => $message,
                'exception' => get_class($e),
            ]);
            $log->update(['status' => 'failed', 'error_message' => $message]);
            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        $idempotencyKey = 'email:'.($this->campaignId ?: 'manual').':'.hash('sha256', strtolower($this->toEmail));
        MarketingLog::where('idempotency_key', $idempotencyKey)->update([
            'status' => 'failed',
            'error_message' => $exception->getMessage(),
        ]);
        if ($this->marketingCampaignId) {
            \App\Models\MarketingCampaign::find($this->marketingCampaignId)?->incrementFailed();
        }
    }
}
