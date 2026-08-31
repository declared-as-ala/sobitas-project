<?php

namespace App\Services;

use App\Mail\OrderStatusCustomerMail;
use App\Models\Commande;
use App\Models\NotificationDelivery;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class CustomerOrderStatusMailer
{
    /**
     * Send at most one email for one order/status milestone.
     */
    public function sendOnce(Commande $commande): bool
    {
        $status = strtolower(trim((string) $commande->etat));
        if (! in_array($status, config('customer_notifications.email_order_statuses', []), true)) {
            return false;
        }

        // A newly-corrected Aramex history can legitimately promote an old order.
        // Do not surprise customers with a delivery email months after receipt.
        $maxAgeDays = (int) config('aramex.status_sms_max_age_days', 3);
        if (
            $maxAgeDays > 0
            && in_array($status, PointsService::DELIVERED_STATUSES, true)
            && $commande->delivered_at
            && $commande->delivered_at->lt(now()->subDays($maxAgeDays))
        ) {
            Log::info('Order status email suppressed: delivery is older than the notify window', [
                'commande_id' => $commande->id,
                'delivered_at' => (string) $commande->delivered_at,
            ]);

            return false;
        }

        $email = trim((string) ($commande->livraison_email ?: $commande->email));
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Log::warning('Order status email skipped: invalid or missing address', [
                'commande_id' => $commande->id,
            ]);

            return false;
        }

        $eventKey = 'email:order:' . $commande->id . ':status:' . $status;

        try {
            $delivery = NotificationDelivery::create([
                'event_key' => $eventKey,
                'channel' => 'email',
                'recipient_hash' => hash('sha256', strtolower($email)),
                'status' => 'sending',
                'attempts' => 1,
            ]);
        } catch (QueryException $e) {
            if (NotificationDelivery::where('event_key', $eventKey)->exists()) {
                Log::info('Order status email suppressed: milestone already claimed', [
                    'commande_id' => $commande->id,
                    'etat' => $status,
                ]);

                return false;
            }

            throw $e;
        }

        try {
            Mail::to($email)->send(new OrderStatusCustomerMail($commande));
            $delivery->forceFill(['status' => 'sent', 'sent_at' => now()])->save();

            return true;
        } catch (\Throwable $e) {
            $delivery->forceFill([
                'status' => 'failed',
                'last_error' => mb_substr($e->getMessage(), 0, 2000),
            ])->save();

            throw $e;
        }
    }
}
