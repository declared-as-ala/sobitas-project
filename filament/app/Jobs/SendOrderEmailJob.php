<?php

namespace App\Jobs;

use App\Mail\SoumissionMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendOrderEmailJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(
        public array $mailData,
        public string $recipientEmail,
        public string $fromLabel,
    ) {}

    public function handle(): void
    {
        try {
            Mail::to($this->recipientEmail)->send(new SoumissionMail($this->mailData, $this->fromLabel));
        } catch (\Exception $e) {
            Log::error('SendOrderEmailJob failed', [
                'recipient' => $this->recipientEmail,
                'error'     => $e->getMessage(),
            ]);

            throw $e; // Re-throw so the queue retries
        }
    }
}
