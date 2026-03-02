<?php

namespace App\Jobs;

use App\Models\MarketingCampaign;
use App\Services\DefaultEmailTemplates;
use App\Services\DefaultSmsTemplates;
use App\Services\MarketingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessCampaignJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 1;
    public int $timeout = 3600;

    public const CHUNK_SIZE = 50;
    public const BATCH_DELAY_SECONDS = 2;

    public function __construct(
        public int $campaignId,
        public bool $sync = false,
    ) {}

    public function handle(): void
    {
        $campaign = MarketingCampaign::find($this->campaignId);
        if (!$campaign || $campaign->status === MarketingCampaign::STATUS_CANCELLED) {
            return;
        }

        try {
            $campaign->markSending();
            $recipients = $campaign->recipients ?? [];
            $campaignIdStr = (string) $campaign->id;

            if ($campaign->type === 'email') {
                $this->processEmailCampaign($campaign, $recipients, $campaignIdStr, $this->sync);
            } else {
                $this->processSmsCampaign($campaign, $recipients, $campaignIdStr, $this->sync);
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('ProcessCampaignJob failed', ['campaign_id' => $this->campaignId, 'error' => $e->getMessage()]);
            $campaign->update(['status' => MarketingCampaign::STATUS_FAILED, 'finished_at' => now()]);
            throw $e;
        }
    }

    protected function processEmailCampaign(MarketingCampaign $campaign, array $recipients, string $campaignIdStr, bool $sync): void
    {
        $vars = array_merge(
            DefaultEmailTemplates::getDefaultVariables($campaign->template_key ?? ''),
            $campaign->template_vars ?? []
        );
        $subject = DefaultEmailTemplates::renderSubject($campaign->template_key ?? '', $vars);

        $chunks = array_chunk($recipients, self::CHUNK_SIZE);
        $delaySeconds = 0;

        foreach ($chunks as $chunk) {
            if ($campaign->fresh()->status === MarketingCampaign::STATUS_CANCELLED) {
                break;
            }
            foreach ($chunk as $r) {
                $email = $r['email'] ?? '';
                $clientId = $r['client_id'] ?? null;
                if ($email === '') {
                    continue;
                }
                $vars['logo_url'] = MarketingService::logoUrl();
                $unsub = MarketingService::unsubscribeUrl('email', $email, $clientId);
                $vars['unsubscribe_url'] = $unsub;
                $html = DefaultEmailTemplates::renderHtml($campaign->template_key ?? '', $vars);

                if ($sync) {
                    SendMarketingEmailJob::dispatchSync(
                        $email,
                        $subject,
                        $html,
                        $unsub,
                        null,
                        $clientId,
                        $campaignIdStr,
                        $campaign->id
                    );
                } else {
                    SendMarketingEmailJob::dispatch(
                        $email,
                        $subject,
                        $html,
                        $unsub,
                        null,
                        $clientId,
                        $campaignIdStr,
                        $campaign->id
                    )->delay(now()->addSeconds($delaySeconds));
                    $delaySeconds += self::BATCH_DELAY_SECONDS;
                }
            }
        }
    }

    protected function processSmsCampaign(MarketingCampaign $campaign, array $recipients, string $campaignIdStr, bool $sync): void
    {
        $body = $campaign->body_override ?? '';
        if ($body === '' && $campaign->template_key) {
            $vars = array_merge(
                DefaultSmsTemplates::getDefaultVariables($campaign->template_key),
                $campaign->template_vars ?? []
            );
            $body = DefaultSmsTemplates::renderText($campaign->template_key, $vars);
        }
        $stopText = $campaign->template_vars['stop_text'] ?? MarketingService::SMS_STOP_DEFAULT;
        $body = MarketingService::smsWithStop($body, $stopText);

        $chunks = array_chunk($recipients, self::CHUNK_SIZE);
        $delaySeconds = 0;

        foreach ($chunks as $chunk) {
            if ($campaign->fresh()->status === MarketingCampaign::STATUS_CANCELLED) {
                break;
            }
            foreach ($chunk as $r) {
                $phone = $r['phone_1'] ?? $r['phone'] ?? '';
                $clientId = $r['client_id'] ?? null;
                if ($phone === '') {
                    continue;
                }
                $phone = MarketingService::normalizePhone($phone);
                if (!MarketingService::isValidPhone($phone)) {
                    MarketingCampaign::find($campaign->id)?->incrementFailed();
                    continue;
                }
                if ($sync) {
                    SendMarketingSmsJob::dispatchSync(
                        $phone,
                        $body,
                        null,
                        $clientId,
                        $campaignIdStr,
                        $campaign->id
                    );
                } else {
                    SendMarketingSmsJob::dispatch(
                        $phone,
                        $body,
                        null,
                        $clientId,
                        $campaignIdStr,
                        $campaign->id
                    )->delay(now()->addSeconds($delaySeconds));
                    $delaySeconds += 1;
                }
            }
        }
    }
}
