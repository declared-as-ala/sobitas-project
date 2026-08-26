<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class EmailVerificationOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user, public string $code) {}

    public function build(): static
    {
        return $this
            ->subject('Votre code de vérification Protein.tn')
            ->view('emails.auth.verify-email-otp');
    }
}
