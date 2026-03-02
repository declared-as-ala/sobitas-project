<?php

namespace App\Jobs;

use App\Models\MarketingLog;
use App\Services\MarketingService;
use App\Services\SmsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendMarketingSmsJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;
    public int $backoff = 10;

    public function __construct(
        public string $phoneNumber,
        public string $message,
        public ?int $templateId = null,
        public ?int $clientId = null,
        public ?string $campaignId = null,
        public ?int $marketingCampaignId = null,
    ) {}

    public function handle(): void
    {
        $log = MarketingService::createLog(
            'sms',
            $this->templateId,
            'phone',
            $this->phoneNumber,
            $this->clientId,
            'queued',
            $this->campaignId
        );

        try {
            (new SmsService())->send_sms($this->phoneNumber, $this->message);
            $log->update(['status' => 'sent', 'sent_at' => now()]);
            if ($this->marketingCampaignId) {
                \App\Models\MarketingCampaign::find($this->marketingCampaignId)?->incrementSent();
            }
        } catch (\Throwable $e) {
            Log::error('Marketing SMS failed', ['phone' => $this->phoneNumber, 'error' => $e->getMessage()]);
            $log->update(['status' => 'failed', 'error_message' => $e->getMessage()]);
            if ($this->marketingCampaignId) {
                \App\Models\MarketingCampaign::find($this->marketingCampaignId)?->incrementFailed();
            }
            throw $e;
        }
    }
}
