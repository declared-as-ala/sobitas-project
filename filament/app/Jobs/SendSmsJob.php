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

    public int $tries = 3;

    public int $backoff = 10;

    public function __construct(
        public string $phoneNumber,
        public string $message,
    ) {}

    public function handle(): void
    {
        try {
            (new SmsService())->send_sms($this->phoneNumber, $this->message);
        } catch (\Throwable $e) {
            Log::error('SendSmsJob failed', [
                'phone_last4' => strlen($this->phoneNumber) >= 4 ? substr($this->phoneNumber, -4) : '****',
                'error'       => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
