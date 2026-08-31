<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class NewCustomerRegisteredAdminMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $customer) {}

    public function build(): static
    {
        return $this
            ->subject('[Admin] Nouveau client Protein.tn — '.$this->customer->name)
            ->view('emails.admin.new-customer-registered');
    }
}
