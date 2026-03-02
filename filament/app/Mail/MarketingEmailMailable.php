<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Symfony\Component\Mime\Email;

/**
 * Marketing campaign email. From/replyTo and List-Unsubscribe for deliverability.
 * Plain-text alternative included.
 */
class MarketingEmailMailable extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public string $subjectLine,
        public string $htmlBody,
        public string $unsubscribeUrl,
    ) {}

    public function build(): static
    {
        $fromAddress = config('mail.from.address');
        $fromName = config('mail.from.name', $fromAddress);
        $replyToAddress = config('mail.reply_to.address', $fromAddress);
        $replyToName = config('mail.reply_to.name', $fromName);

        $mailable = $this->from($fromAddress, $fromName)
            ->replyTo($replyToAddress, $replyToName)
            ->subject($this->subjectLine)
            ->view('emails.marketing-html', [
                'subjectLine' => $this->subjectLine,
                'htmlBody' => $this->htmlBody,
                'unsubscribeUrl' => $this->unsubscribeUrl,
            ])
            ->text('emails.marketing-text', [
                'htmlBody' => $this->htmlBody,
                'unsubscribeUrl' => $this->unsubscribeUrl,
            ]);

        $mailable->withSymfonyMessage(function (Email $message) {
            if ($this->unsubscribeUrl !== '') {
                $message->getHeaders()->addTextHeader('List-Unsubscribe', '<' . $this->unsubscribeUrl . '>');
                $message->getHeaders()->addTextHeader('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click');
            }
        });

        return $mailable;
    }
}
