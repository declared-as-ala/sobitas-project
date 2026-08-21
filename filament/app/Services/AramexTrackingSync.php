<?php

namespace App\Services;

use App\Models\Commande;
use App\Models\Facture;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * ── ARAMEX SAYS DELIVERED; THE SHOP FINDS OUT ───────────────────────────────────────────────
 * Owner, 20/08/2026: *"check the Aramex API so that when Aramex marks a command delivered we
 * update it automatically in our DB."*
 *
 * ── WHAT WAS THERE, AND WHY IT WAS NOT ENOUGH ───────────────────────────────────────────────
 * `AramexService::trackShipment()` has always worked. What called it was a single "Actualiser"
 * button on a dashboard widget, and all that button did was copy the update code onto
 * `factures.aramex_status`. Two consequences:
 *
 *   IT ONLY RAN WHEN SOMEBODY PRESSED IT. Nothing was scheduled. A parcel delivered on Saturday
 *   was "en transit" in our database until an admin happened to open the dashboard.
 *
 *   IT NEVER TOUCHED THE ORDER. The BL got a status; `commandes.etat` did not move. And
 *   `commandes.etat` is the value the entire post-delivery half of this shop hangs off:
 *
 *       etat -> 'livree'  ->  CommandeObserver
 *                             ├── delivered_at stamped
 *                             ├── PointsService awards loyalty points
 *                             ├── the status SMS goes to the customer
 *                             └── reviews:send-due-requests can finally see the order
 *
 * That is the whole explanation for a live database with 1,082 orders, not one of them marked
 * delivered, zero loyalty points ever awarded, and a review-request engine that has never sent a
 * single email since the day it was written. The missing piece was never the review code. It was
 * that nothing ever said an order had arrived.
 *
 * ── THE SAFETY THIS NEEDS, AND WHY ──────────────────────────────────────────────────────────
 * Marking an order delivered is not a cosmetic write. It mails the customer, texts the customer,
 * and moves real loyalty balance. Getting it wrong in the direction of "too eager" means asking
 * somebody to review a parcel they have not received.
 *
 *   - Only codes in `aramex.delivered_codes` promote an order. It is a CONFIG list, not a literal,
 *     because Aramex's update codes vary by account and product and this is the one value that
 *     must be verified against the real account before it is trusted (see config/aramex.php).
 *   - An order already `livree` or `annuler` is never touched.
 *   - `dryRun` reports the exact same set without writing, so the first run on production can be
 *     read before it is believed.
 *   - Every promotion is logged with the order, the HAWB and the code that caused it.
 *
 * ── AND THE FAILURE MODE THAT IS NOT AN ERROR (owner, 21/08/2026) ───────────────────────────
 * *"make the aramex async automated."* It already is: `aramex:sync-tracking` has been on the
 * schedule since 248daeb2, hourly between 08:00 and 20:00. So the interesting question is not why
 * it is not running — it is why orders are still not being marked delivered while it runs.
 *
 * There is exactly one way for this class to do nothing while looking perfectly healthy: a
 * `delivered_codes` list that does not contain the code this Aramex ACCOUNT actually uses. The
 * sweep then polls every shipment, records every status change, promotes nothing, exits 0, and
 * reports "0 orders marked livrée" — which is indistinguishable from "nothing was delivered today".
 * Repeat hourly, forever. Nobody gets loyalty points, nobody is asked for a review, and no alert
 * fires anywhere because nothing failed.
 *
 * `SH006` was inherited from the dashboard widget and has never been verified against the live
 * account (config/aramex.php says so out loud). So the sweep now watches for its own blind spot:
 * it collects the DISTINCT update codes it sees, and when a code's own description reads like a
 * delivery while that code is not configured as one, it says so — in the command output and in the
 * log. That converts a permanent silent no-op into a sentence naming the code to add.
 */
class AramexTrackingSync
{
    /** Statuses past which an order must never be dragged backwards or forwards by a robot. */
    private const TERMINAL_ORDER_STATES = ['livree', 'livrée', 'livre', 'annuler'];

    /**
     * Words that make an Aramex update description read like a delivery.
     *
     * Used ONLY to raise a question, never to promote an order — a description is free text from a
     * courier system and is not something to hang a customer's loyalty balance on. `delivered_codes`
     * stays the single authority for what promotes; this list decides whether to point at a code
     * and ask whether it belongs there.
     *
     * Both languages, because this account's descriptions arrive in either. "Delivered to consignee"
     * and "Livré au destinataire" are the same event.
     *
     * ── AND THE MONEY WORDS, WHICH THE FIRST VERSION MISSED ─────────────────────────────────
     * Run against the live account on 21/08/2026, this detector found NOTHING — while the account
     * was returning `SH239 "Shipment charges paid"` forty times and `delivered_codes` was `SH006`,
     * which never appeared at all. The blind-spot detector had a blind spot, and it was the one
     * that mattered.
     *
     * The lesson is specific to what this shop is: on a CASH-ON-DELIVERY account the money is
     * collected at the door, so a payment event and a delivery event are the same moment. A
     * vocabulary that knows "delivered" and not "paid" is a vocabulary written for a prepaid shop.
     *
     * These only ever raise a question in a log — `delivered_codes` remains the sole authority for
     * what promotes an order, and SH239 is deliberately still not in it: "shipment charges paid"
     * also reads as the shipper's own freight being billed, and this account is `payment_type => P`
     * (prepaid by shipper). See config/aramex.php for the question to put to Aramex.
     */
    private const DELIVERY_HINTS = [
        'delivered', 'livré', 'livre au', 'livree', 'consignee', 'destinataire', 'remis',
        'charges paid', 'payment collected', 'cod collected', 'amount collected',
        'encaiss', 'contre remboursement', 'montant perçu',
    ];

    public function __construct(private AramexService $aramex)
    {
    }

    /**
     * Poll Aramex for every shipment still in flight and write back what changed.
     *
     * @return array{checked:int, status_changed:int, delivered:int, orders_updated:int, errors:int, rows:array<int, array<string, mixed>>, codes:array<string, array<string, mixed>>, unrecognised_delivery:array<int, string>}
     */
    public function sync(int $limit = 200, bool $dryRun = false): array
    {
        $out = [
            'checked' => 0, 'status_changed' => 0, 'delivered' => 0, 'orders_updated' => 0, 'errors' => 0,
            'rows' => [],
            // Every distinct update code this pass saw, with a count and one sample description.
            // This is the table that answers "is SH006 the right code for this account?" without
            // anybody having to find a parcel they know was delivered and read a dashboard.
            'codes' => [],
            'unrecognised_delivery' => [],
        ];

        if (! Schema::hasColumn('factures', 'aramex_hawb')) {
            return $out;
        }

        $deliveredCodes = array_map('strtoupper', (array) config('aramex.delivered_codes', ['SH006']));
        $settledCodes   = array_map('strtoupper', (array) config('aramex.settled_codes', ['SH006', 'SH069']));

        /*
         * Which shipments are worth a request.
         *
         * The widget's version of this query used `->orWhere(...)` after a `whereNotIn`, which in
         * Eloquent binds as `(A AND B) OR (C AND D)` — so it also pulled in rows the first half had
         * just excluded. Written as one closure here so the intent survives the next edit: has a
         * HAWB, and is not already in a state Aramex will never move it out of.
         */
        $shipments = Facture::query()
            ->whereNotNull('aramex_hawb')
            ->where('aramex_hawb', '!=', '')
            ->where(function ($q) use ($settledCodes) {
                $q->whereNull('aramex_status')->orWhereNotIn('aramex_status', $settledCodes);
            })
            ->orderByDesc('aramex_pushed_at')
            ->limit($limit)
            ->get(['id', 'numero', 'commande_id', 'aramex_hawb', 'aramex_status']);

        foreach ($shipments as $bl) {
            $result = $this->aramex->trackShipment((string) $bl->aramex_hawb);
            $out['checked']++;

            if (! empty($result['error'])) {
                $out['errors']++;
                continue;
            }

            $code = strtoupper((string) ($result['update_code'] ?? ''));
            if ($code === '') {
                continue; // Aramex has no update for this HAWB yet — normal for a fresh shipment.
            }

            $isDelivered = in_array($code, $deliveredCodes, true);
            $changed     = $code !== strtoupper((string) ($bl->aramex_status ?? ''));
            $description = (string) ($result['description'] ?? '');

            if (! isset($out['codes'][$code])) {
                $out['codes'][$code] = ['count' => 0, 'description' => $description, 'delivered' => $isDelivered];
            }
            $out['codes'][$code]['count']++;
            if ($out['codes'][$code]['description'] === '' && $description !== '') {
                $out['codes'][$code]['description'] = $description;
            }

            /*
             * The blind-spot check. A code whose description reads like a delivery but which is not
             * in `delivered_codes` is the exact shape of the bug that keeps this whole pipeline
             * dormant, and it is invisible in every other output this class produces.
             */
            if (! $isDelivered && $description !== '' && $this->looksLikeDelivery($description)) {
                if (! in_array($code, $out['unrecognised_delivery'], true)) {
                    $out['unrecognised_delivery'][] = $code;
                }
            }

            $row = [
                'bl'          => $bl->numero ?? $bl->id,
                'hawb'        => $bl->aramex_hawb,
                'from'        => $bl->aramex_status,
                'to'          => $code,
                'description' => $result['description'] ?? null,
                'commande_id' => $bl->commande_id,
                'promotes'    => false,
            ];

            if ($changed) {
                $out['status_changed']++;
                if (! $dryRun) {
                    $bl->forceFill(['aramex_status' => $code])->saveQuietly();
                }
            }

            if ($isDelivered) {
                $out['delivered']++;
                $order = $this->orderFor($bl);

                if ($order && ! in_array((string) $order->etat, self::TERMINAL_ORDER_STATES, true)) {
                    $row['promotes'] = true;
                    $out['orders_updated']++;

                    if (! $dryRun) {
                        /*
                         * `save()`, NOT `saveQuietly()`. The observer is the entire point: this one
                         * write is what stamps delivered_at, awards the loyalty points, sends the
                         * status SMS and makes the order visible to the review sweep. Saving
                         * quietly here would reproduce the exact bug this class exists to fix.
                         */
                        $order->etat = 'livree';
                        $order->save();

                        Log::info('Aramex: order marked delivered from tracking', [
                            'commande_id' => $order->id,
                            'numero'      => $order->numero,
                            'hawb'        => $bl->aramex_hawb,
                            'update_code' => $code,
                        ]);
                    }
                }
            }

            $out['rows'][] = $row;
        }

        /*
         * Said out loud, every run, in the application log — not only in a command's stdout.
         *
         * The schedule runs unattended in a container. If the one sentence that explains why this
         * pipeline is dormant only ever appears in a terminal somebody has to open, it is the same
         * silence it is meant to break.
         */
        if (! empty($out['unrecognised_delivery'])) {
            Log::warning('Aramex: update code(s) that look like a delivery are NOT in aramex.delivered_codes', [
                'codes'           => $out['unrecognised_delivery'],
                'configured'      => $deliveredCodes,
                'orders_updated'  => $out['orders_updated'],
                'action'          => 'Add the code to config/aramex.php delivered_codes after confirming it against the account.',
            ]);
        }

        return $out;
    }

    /**
     * Does this Aramex description read like a delivery?
     *
     * Deliberately generous — its only consequence is a warning asking a human to look. Being wrong
     * in the "too eager" direction costs one line of log; being wrong the other way is the failure
     * this method exists to catch, and that one costs the loyalty programme and every review
     * request the shop would have sent.
     */
    private function looksLikeDelivery(string $description): bool
    {
        $haystack = mb_strtolower($description);

        foreach (self::DELIVERY_HINTS as $hint) {
            if (str_contains($haystack, $hint)) {
                return true;
            }
        }

        return false;
    }

    /**
     * The order behind a BL.
     *
     * `commande_id` is set by OrderToBlService whenever the BL was converted from an order, which
     * is the normal path. A BL typed by hand in the admin has none, and there is deliberately no
     * fuzzy fallback (matching on client + total would eventually mark the wrong order delivered).
     */
    private function orderFor(Facture $bl): ?Commande
    {
        if (empty($bl->commande_id)) {
            return null;
        }

        return Commande::find($bl->commande_id);
    }
}
