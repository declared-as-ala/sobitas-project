<?php

namespace App\Mail;


use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Http\Request;
use Illuminate\Mail\Mailables\Address;

use App\Commande;
class OrderShipped extends Mailable
{
    use Queueable, SerializesModels;

    public $commande;
      /**
     * Create a new message instance.
     *
     * @param  Illuminate\Http\Request  $commande
     * @return void
     */
    public function __construct(Request $request)
    {
        //
      //  dd('e');
        $this->commande = $request;
    }




    public function build()
    {


        $from = 'nourhene.amara@gmail.com' ;
        $to = 'nourhene.coding@gmail.com'; // $parameters['destinataire'];
        $subject = 'test';
        $body = 'ok';
        return $this->from($to)
                ->view('commande')
                ->subject('sobitas')
                ->with([
                        'from' => $from,
                        'to' => $to,
                        'subject' =>$subject,
                        'body' =>$body,
                    ]);
    }
}
