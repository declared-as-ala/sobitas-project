<?php

namespace App\Observers;

use App\Filament\Resources\CommandeResource;
use App\Jobs\SendSmsJob;
use App\Mail\ReviewRequestMail;
use App\Models\Commande;
use App\Models\Message;
use App\Models\User;
use App\Services\PointsService;
use Filament\Actions\Action;
use Filament\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

class CommandeObserver
{
    /**
     * Notify all panel users when a new commande is created.
     */
    public function created(Commande $commande): void
    {
        $recipients = User::all();
        if ($recipients->isEmpty()) {
            return;
        }

        $url = CommandeResource::getUrl('edit', ['record' => $commande]);
        $title = 'Nouvelle commande';
        $body = 'Commande #' . ($commande->numero ?? $commande->id) . ' – ' . trim(($commande->nom ?? '') . ' ' . ($commande->prenom ?? ''));

        foreach ($recipients as $user) {
            Notification::make()
                ->title($title)
                ->body($body)
                ->success()
                ->actions([
                    Action::make('open')
                        ->label('Ouvrir')
                        ->url($url),
                ])
                ->sendToDatabase($user);
        }
    }

    /**
     * When order status (etat) changes, send SMS to client with status update (unless cancelled).
     */
    public function updated(Commande $commande): void
    {
        if (! $commande->wasChanged('etat')) {
            return;
        }

        // Loyalty points lifecycle (earn on delivery / refund+clawback on cancel).
        // Best-effort: a points failure must never block an admin status change.
        try {
            app(PointsService::class)->syncOnStatusChange($commande);
        } catch (\Throwable $e) {
            Log::error('Loyalty status sync failed', [
                'commande_id' => $commande->id,
                'etat'        => $commande->etat,
                'error'       => $e->getMessage(),
            ]);
        }

        // Post-delivery review-request email (once per order, best-effort).
        try {
            $this->sendReviewRequestIfDelivered($commande);
        } catch (\Throwable $e) {
            Log::error('Review request email failed', [
                'commande_id' => $commande->id,
                'error'       => $e->getMessage(),
            ]);
        }

        if ($commande->etat === 'annuler') {
            return;
        }

        $phone = $commande->livraison_phone ?? $commande->phone ?? null;
        if (empty(trim((string) $phone))) {
            return;
        }

        $msg = Message::getCached();
        $commande->loadMissing('details.product:id,designation_fr');
        $products = $commande->details
            ->take(4)
            ->map(fn ($d) => $d->product->designation_fr ?? 'Produit')
            ->filter()
            ->implode(', ');
        $more = $commande->details->count() > 4 ? ' (+' . ($commande->details->count() - 4) . ')' : '';
        $productsText = trim($products . $more);
        $total = number_format((float) ($commande->prix_ttc ?? 0), 3, '.', ' ');

        if ($msg && ! empty(trim((string) $msg->msg_etat_commande))) {
            $sms = str_replace(
                ['[nom]', '[prenom]', '[num_commande]', '[etat]', '[produits]', '[total]'],
                [
                    $commande->nom ?? '',
                    $commande->prenom ?? '',
                    $commande->numero ?? '',
                    Commande::getStatusLabel($commande->etat),
                    $productsText,
                    $total,
                ],
                $msg->msg_etat_commande
            );
        } else {
            $greeting = trim(($commande->prenom ?? '') . ' ' . ($commande->nom ?? ''));
            $greeting = $greeting !== '' ? "Bonjour {$greeting}," : 'Bonjour,';
            $status = Commande::getStatusLabel($commande->etat);
            $sms = $greeting
                . " votre commande {$commande->numero} est {$status}.\n"
                . "Produits: {$productsText}\n"
                . "Total: {$total} TND.\n"
                . 'Merci pour votre confiance.';
        }

        SendSmsJob::dispatch($phone, $sms);

        Log::info('Order status SMS dispatched', [
            'commande_id' => $commande->id,
            'etat'        => $commande->etat,
        ]);
    }

    /**
     * Send the post-delivery "leave a review" email exactly once, when an order
     * reaches a delivered status. Guarded by config kill-switch + a
     * review_request_sent_at marker + a valid customer email + an order_token.
     * Synchronous send (mirrors the order-confirmation email) so it is delivered
     * regardless of queue-worker state; the caller wraps this best-effort.
     */
    private function sendReviewRequestIfDelivered(Commande $commande): void
    {
        if (! in_array($commande->etat, PointsService::DELIVERED_STATUSES, true)) {
            return;
        }
        if (! (bool) config('reviews.request_emails_enabled', true)) {
            return;
        }
        if (! Schema::hasColumn('commandes', 'review_request_sent_at') || $commande->review_request_sent_at) {
            return; // send at most once per order
        }
        if (empty($commande->order_token)) {
            return; // no token -> cannot build a no-login review link
        }
        $email = $commande->livraison_email ?? $commande->email;
        if (empty($email) || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return;
        }

        Mail::to($email)->send(new ReviewRequestMail($commande));

        // saveQuietly so this write does not re-fire observer events.
        $commande->forceFill(['review_request_sent_at' => now()])->saveQuietly();
    }
}
