<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class EmailVerificationOtpMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 30;

    public function __construct(public User $user, public string $code) {}

    public function build(): static
    {
        return $this
            ->subject($this->code . ' — votre code Protein.tn')
            ->view('emails.auth.verify-email-otp');
    }
}
