<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SoumissionMail extends Mailable
{
    use Queueable, SerializesModels;

    public $data;
    public $fromAddress;
    
    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct($data, $fromAddress = null)
    {
        $this->data = $data;
        $this->fromAddress = $fromAddress;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        $from = $this->fromAddress ?? 'contact@protein.tn';
        return $this->from($from)->subject('Protein.TN | Suivi de commande')->view('emails.SoumissionMail');
    }
}
