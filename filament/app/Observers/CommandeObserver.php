<?php

namespace App\Observers;

use App\Filament\Resources\CommandeResource;
use App\Jobs\SendSmsJob;
use App\Mail\ReviewRequestMail;
use App\Models\Commande;
use App\Models\Message;
use App\Models\Product;
use App\Models\User;
use App\Services\PointsService;
use Filament\Actions\Action;
use Filament\Notifications\Notification;
use Illuminate\Support\Facades\DB;
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
            $this->restoreStockForCancelledOrder($commande);

            return;
        }

        $phone = $commande->livraison_phone ?? $commande->phone ?? null;
        if (empty(trim((string) $phone))) {
            return;
        }

        /*
         * ── THE BACKFILL GUARD ──────────────────────────────────────────────────────────────
         * A status change is normally something an admin just did, so texting about it is the
         * point. But `AramexTrackingSync` also flips orders to "livrée" from the courier's own
         * history, and on the run that follows a fix to the delivery codes that history is months
         * deep — so this same line would send a hundred people "votre commande est livrée" about
         * parcels they unpacked in June. Confusing, and billed per message.
         *
         * The test is the DELIVERY date, not the row's age: an order created long ago and
         * delivered this morning is exactly the case that must still send. `delivered_at` is set
         * by the sync from Aramex's own timestamp before it saves, so it is already correct here.
         *
         * Only delivery statuses are gated. A cancellation or a status an operator sets by hand
         * carries no such timestamp and is always sent.
         */
        $smsMaxAgeDays = (int) config('aramex.status_sms_max_age_days', 3);
        if (
            $smsMaxAgeDays > 0
            && in_array($commande->etat, PointsService::DELIVERED_STATUSES, true)
            && ! empty($commande->delivered_at)
            && $commande->delivered_at->lt(now()->subDays($smsMaxAgeDays))
        ) {
            Log::info('Order status SMS suppressed: delivery is older than the notify window', [
                'commande_id'  => $commande->id,
                'delivered_at' => (string) $commande->delivered_at,
                'max_age_days' => $smsMaxAgeDays,
            ]);

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
    /**
     * Give stock back exactly once when an order is cancelled (etat -> 'annuler'). Guarded by the
     * stock_restored_at marker so a re-save while already cancelled can never restore twice.
     * Best-effort: a restore failure must never block the admin status change.
     */
    private function restoreStockForCancelledOrder(Commande $commande): void
    {
        if (! Schema::hasColumn('commandes', 'stock_restored_at') || $commande->stock_restored_at) {
            return;
        }

        try {
            DB::transaction(function () use ($commande): void {
                $commande->loadMissing('details');
                $ids = [];
                foreach ($commande->details as $line) {
                    $q = (float) ($line->qte ?? 0);
                    if ($q <= 0) {
                        continue;
                    }
                    Product::where('id', $line->produit_id)->increment('qte', $q);
                    $ids[] = $line->produit_id;
                }
                if (! empty($ids)) {
                    Product::syncRuptureFlags($ids);
                }
                $commande->forceFill(['stock_restored_at' => now()])->saveQuietly();
            });
        } catch (\Throwable $e) {
            Log::error('Stock restore on order cancel failed', [
                'commande_id' => $commande->id,
                'error'       => $e->getMessage(),
            ]);
        }
    }

    private function sendReviewRequestIfDelivered(Commande $commande): void
    {
        if (! in_array($commande->etat, PointsService::DELIVERED_STATUSES, true)) {
            return;
        }

        // Stamp the delivery moment FIRST, and unconditionally. This is the clock the delayed
        // sweep measures against, so it has to be recorded even when the request itself is
        // switched off, already sent, or unsendable for want of an email — otherwise turning the
        // feature on later would find a history of delivered orders with no delivery time.
        // Wrapped separately so a missing column (migration not yet run) cannot take the send
        // path down with it.
        if (empty($commande->delivered_at)) {
            try {
                $commande->forceFill(['delivered_at' => now()])->saveQuietly();
            } catch (\Throwable $e) {
                Log::warning('Could not stamp delivered_at', [
                    'commande_id' => $commande->id,
                    'error'       => $e->getMessage(),
                ]);
            }
        }

        if (! (bool) config('reviews.request_emails_enabled', true)) {
            return;
        }

        // A non-zero delay hands the send to reviews:send-due-requests. Asking for a review the
        // second an admin flips the status means asking about a product still in its box.
        if ((int) config('reviews.request_delay_days', 3) > 0) {
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
