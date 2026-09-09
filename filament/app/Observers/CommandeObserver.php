<?php

namespace App\Observers;

use App\Filament\Resources\CommandeResource;
use App\Jobs\SendSmsJob;
use App\Mail\ReviewRequestMail;
use App\Models\Affilie;
use App\Models\Commande;
use App\Models\Product;
use App\Models\User;
use App\Services\AffilieTransactionService;
use App\Services\PointsService;
use App\Services\CustomerOrderStatusMailer;
use App\Services\TransactionalSmsText;
use Filament\Actions\Action;
use Filament\Notifications\Notification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

class CommandeObserver
{
    /**
     * Notify only panel administrators when a new order is created.
     *
     * ── BEST-EFFORT, AND IT HAS TO BE ────────────────────────────────────────────────────────
     * This runs inside the caller's transaction — `CommandeController::storeCommandeApi()` wraps
     * checkout in one, and so does the affiliate order desk. An uncaught throw here does not just
     * lose a notification, it ABORTS THE ORDER: stock already decremented is rolled back, the
     * customer sees a 500, and nothing records why. Every other side-effect in this file is
     * wrapped for exactly that reason; this one was not, and the route-name bug fixed below is
     * precisely the kind of failure that made it matter.
     */
    public function created(Commande $commande): void
    {
        try {
            $recipients = User::whereIn('role_id', config('affilies.admin_role_ids', [1, 3]))->get();
            if ($recipients->isEmpty()) {
                return;
            }

            /*
             * ── `panel: 'admin'` IS LOAD-BEARING, NOT TIDINESS ──────────────────────────────
             * `Resource::getUrl()` falls through to `Filament::getCurrentOrDefaultPanel()`. From
             * the storefront API there is no current panel, so it picked the DEFAULT one (admin)
             * and the link happened to be right. From inside the `affilie` panel the current panel
             * IS `affilie`, so this resolved the route name `filament.affilie.resources.commandes.edit`
             * — a route that does not exist, because the admin CommandeResource is registered only
             * in AffiliePanelProvider's sibling. `route()` throws RouteNotFoundException, inside
             * the order transaction, and no affiliate could ever have created an order.
             *
             * Naming the panel explicitly is also simply correct: the recipients are
             * administrators and the link must open in the admin panel regardless of where the
             * order was typed.
             */
            $url = CommandeResource::getUrl('edit', ['record' => $commande], panel: 'admin');

            /*
             * An affiliate order needs a different sentence, because it needs a different action:
             * it arrives already sold and paid-for-on-delivery, so nobody has to call the customer
             * to confirm it — it goes straight to preparation. Saying "affilié" and naming them is
             * what tells the person reading the notification that.
             */
            $affilieName = null;
            if (! empty($commande->affilie_id)) {
                $affilieName = Affilie::query()->whereKey($commande->affilie_id)->value('name');
            }

            $customer = trim(($commande->nom ?? '') . ' ' . ($commande->prenom ?? ''));

            if (! empty($commande->affilie_id)) {
                $title = 'Nouvelle commande affilié';
                $body = 'Commande #' . ($commande->numero ?? $commande->id)
                    . ' – ' . ($customer !== '' ? $customer : 'client')
                    . ' – vendue par ' . ($affilieName ?: ('affilié #' . $commande->affilie_id))
                    . ' – à préparer et expédier.';
            } else {
                $title = 'Nouvelle commande';
                $body = 'Commande #' . ($commande->numero ?? $commande->id) . ' – ' . $customer;
            }

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
        } catch (\Throwable $e) {
            Log::error('New order admin notification failed', [
                'commande_id' => $commande->id,
                'error' => $e->getMessage(),
            ]);
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

        /*
         * ── AFFILIATE COMMISSION LIFECYCLE ──────────────────────────────────────────────────
         * Accrue on delivery, reverse + charge the return fee on cancellation/return. Driven from
         * the same `wasChanged('etat')` gate as loyalty points and reading the SAME two constants
         * (PointsService::DELIVERED_STATUSES / CANCELLED_STATUSES), because a shop with two
         * definitions of "delivered" will eventually pay on one and not the other.
         *
         * ORDERED DELIBERATELY, between two neighbours that both constrain it:
         *   AFTER  the review-request block, because THAT is what stamps `commandes.delivered_at`
         *          (unconditionally, first thing, even when the email itself is switched off).
         *          Accruing before it would write a commission row whose ledger metadata claims
         *          the order has no delivery date.
         *   BEFORE the `annuler` early-return further down, which exits this method entirely for
         *          cancelled orders. A return fee placed after it would never fire at all.
         *
         * Best-effort, and this one matters most. The service already swallows its own errors;
         * this is the second net. An admin marking a parcel delivered must never see a 500 because
         * an affiliate's balance could not be written.
         */
        try {
            app(AffilieTransactionService::class)->syncOrderCommissionOnStatusChange($commande);
        } catch (\Throwable $e) {
            Log::error('Affilie commission status sync failed', [
                'commande_id' => $commande->id,
                'etat'        => $commande->etat,
                'error'       => $e->getMessage(),
            ]);
        }

        // Delivery/tracking email is independent from SMS. A mail outage must not
        // prevent the status update, points credit or stock transition.
        try {
            app(CustomerOrderStatusMailer::class)->sendOnce($commande);
        } catch (\Throwable $e) {
            Log::error('Order status customer email failed', [
                'commande_id' => $commande->id,
                'etat' => $commande->etat,
                'error' => $e->getMessage(),
            ]);
        }

        if ($commande->etat === 'annuler') {
            $this->restoreStockForCancelledOrder($commande);

            return;
        }

        if (! in_array((string) $commande->etat, config('customer_notifications.sms_order_statuses', []), true)) {
            Log::info('Order status SMS suppressed: milestone is not customer-useful', [
                'commande_id' => $commande->id,
                'etat' => $commande->etat,
            ]);

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

        $sms = TransactionalSmsText::status($commande);

        SendSmsJob::dispatch(
            $phone,
            $sms,
            'order:'.$commande->id.':status:'.strtolower((string) $commande->etat)
        );

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
