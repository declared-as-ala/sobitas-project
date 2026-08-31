<?php

namespace App\Jobs;

use App\Services\SmsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendSmsJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    // A gateway timeout is ambiguous: WinSMS may already have accepted the paid
    // message. Automatic retries can therefore bill duplicates. Business-event
    // idempotency below is the safer recovery boundary.
    public int $tries = 1;

    public function __construct(
        public string $phoneNumber,
        public string $message,
        public ?string $eventKey = null,
    ) {}

    public function handle(): void
    {
        try {
            $sms = app(SmsService::class);
            if ($this->eventKey) {
                $sms->sendOnce($this->eventKey, $this->phoneNumber, $this->message);
            } else {
                $sms->send_sms($this->phoneNumber, $this->message);
            }
        } catch (\Throwable $e) {
            Log::error('SendSmsJob failed', [
                'phone_last4' => strlen($this->phoneNumber) >= 4 ? substr($this->phoneNumber, -4) : '****',
                'error'       => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
