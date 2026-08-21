<?php

namespace App\Services;

use App\Models\Commande;
use App\Models\Facture;
use App\Support\Aramex\AramexStatusCodes;
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
 * ── THE ANSWER, 21/08/2026: TWO BUGS, NOT ONE ──────────────────────────────────────────────
 * `SH006` was inherited from the dashboard widget and had never been verified. Aramex's own status
 * table says what it means, and it is not what this codebase assumed:
 *
 *     SH005  Delivered                 <- the delivery event. NEVER CONFIGURED.
 *     SH006  Collected by Consignee    <- the customer went to an Aramex counter. Configured.
 *
 * So a home-delivery shop was detecting only counter pickups, correctly finding almost none, and
 * reporting success. That was the first bug. `AramexStatusCodes` now holds the real table and
 * `delivered_codes` defaults to the five codes that actually mean the consignee has the goods.
 *
 * The second bug was worse, because it would have survived fixing the first. `trackShipment()`
 * asked Aramex for `GetLastTrackingUpdateOnly` and read the newest row — so the sweep was asking
 * "what is the latest news?" when the question it needed answered was "was this EVER delivered?".
 * Those differ for every cash-on-delivery parcel in the account: the courier hands the parcel over,
 * and the COD payment posts afterwards, so the newest row is a payment (`SH239 "Shipment charges
 * paid"`, forty of them) and the delivery is the row above it, which was never fetched.
 *
 * Both are fixed here. The sweep reads the FULL history and looks for a delivery code anywhere in
 * it. The blind-spot detector remains, now backed by Aramex's documented table rather than by
 * guessing at words, so the next unconfigured delivery code names itself instead of hiding.
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
     * ── DEMOTED TO A SECOND NET, AND WHY ────────────────────────────────────────────────────
     * This word list used to be the ONLY blind-spot detector, and on 21/08/2026 it found nothing
     * while the account returned `SH239 "Shipment charges paid"` forty times — so the money words
     * were added to it. That was treating the symptom.
     *
     * The real detector is `AramexStatusCodes::isDeliveryClass()`: Aramex publishes what its codes
     * mean, so "is this a delivery code we have not configured?" is a lookup, not a guess about
     * English and French prose. That runs first.
     *
     * The words stay as a second net for codes the table has never seen — SH239 is exactly that,
     * absent from the table entirely — where prose is the only evidence available. Both only ever
     * raise a question in a log; `delivered_codes` remains the sole authority for what promotes an
     * order, and SH239 is still not in it, because "charges paid" is a payment event and Aramex
     * files payments separately from deliveries (SH074, SH383, SH480, SH505). The parcels behind
     * those forty payments are promoted on the SH005 in their history, not on the payment.
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
     * @return array{checked:int, status_changed:int, delivered:int, orders_updated:int, errors:int, rows:array<int, array<string, mixed>>, codes:array<string, array<string, mixed>>, unrecognised_delivery:array<int, string>, possible_delivery:array<int, string>, histories:array<int, array<string, mixed>>}
     */
    public function sync(int $limit = 200, bool $dryRun = false, bool $collectHistory = false): array
    {
        $out = [
            'checked' => 0, 'status_changed' => 0, 'delivered' => 0, 'orders_updated' => 0, 'errors' => 0,
            'rows' => [],
            // Every distinct update code this pass saw ANYWHERE in a history, with a count and one
            // sample description. Built from full histories rather than from latest-events-only,
            // which is why it can now show SH005 sitting under a payment.
            'codes' => [],
            // Codes Aramex documents as a delivery that `delivered_codes` does not list.
            'unrecognised_delivery' => [],
            // Codes the table has never seen whose description merely reads like a delivery.
            'possible_delivery' => [],
            // Full event lists, only when asked for: this is the diagnostic that answers
            // "what does Aramex actually hold for this waybill?" without a support ticket.
            'histories' => [],
        ];

        if (! Schema::hasColumn('factures', 'aramex_hawb')) {
            return $out;
        }

        $deliveredCodes = array_map('strtoupper', (array) config('aramex.delivered_codes', AramexStatusCodes::DELIVERED));
        $settledCodes   = array_map('strtoupper', (array) config('aramex.settled_codes', ['SH006', 'SH069']));
        $hasDeliveredAt = Schema::hasColumn('factures', 'aramex_delivered_at');

        /*
         * Which shipments are worth a request.
         *
         * The widget's version of this query used `->orWhere(...)` after a `whereNotIn`, which in
         * Eloquent binds as `(A AND B) OR (C AND D)` — so it also pulled in rows the first half had
         * just excluded. Written as one closure here so the intent survives the next edit: has a
         * HAWB, and is not already in a state Aramex will never move it out of.
         *
         * `aramex_delivered_at` is the newer half of that, and it exists because the latest code is
         * no longer a reliable stopping condition: a delivered COD parcel's newest event is a
         * PAYMENT, which is not in `settled_codes` and never will be, so without this the sweep
         * would keep paying for a request on every parcel it had already promoted, forever.
         */
        $shipments = Facture::query()
            ->whereNotNull('aramex_hawb')
            ->where('aramex_hawb', '!=', '')
            ->when($hasDeliveredAt, fn ($q) => $q->whereNull('aramex_delivered_at'))
            ->where(function ($q) use ($settledCodes) {
                $q->whereNull('aramex_status')->orWhereNotIn('aramex_status', $settledCodes);
            })
            ->orderByDesc('aramex_pushed_at')
            ->limit($limit)
            ->get(['id', 'numero', 'commande_id', 'aramex_hawb', 'aramex_status']);

        foreach ($shipments as $bl) {
            $history = $this->aramex->trackShipmentHistory((string) $bl->aramex_hawb);
            $out['checked']++;

            if (! empty($history['error'])) {
                $out['errors']++;
                continue;
            }

            $events = $history['events'];
            if (empty($events)) {
                continue; // Aramex has no update for this HAWB yet — normal for a fresh shipment.
            }

            if ($collectHistory) {
                $out['histories'][] = [
                    'bl'     => $bl->numero ?? $bl->id,
                    'hawb'   => $bl->aramex_hawb,
                    'events' => array_map(fn (array $e) => [
                        'code'        => $e['code'],
                        'description' => $e['description'],
                        'at'          => $e['at']?->format('Y-m-d H:i'),
                        'delivered'   => in_array($e['code'], $deliveredCodes, true),
                    ], $events),
                ];
            }

            /*
             * ── THE DELIVERY QUESTION, ASKED OF THE WHOLE HISTORY ────────────────────────────
             * Not "is the newest event a delivery?" but "is there a delivery anywhere in here?".
             * They are different questions for every COD parcel in this account, and the old code
             * asked the wrong one. The FIRST match wins, chronologically, because that is the
             * moment the customer actually received the goods — which is the date the loyalty
             * clock and the review-request delay both have to be measured from.
             */
            $deliveryEvent = null;
            foreach ($events as $event) {
                if (in_array($event['code'], $deliveredCodes, true)) {
                    $deliveryEvent = $event;
                    break;
                }
            }

            $latest      = $events[count($events) - 1];
            $code        = $latest['code'];
            $description = $latest['description'];
            $isDelivered = $deliveryEvent !== null;
            $changed     = $code !== strtoupper((string) ($bl->aramex_status ?? ''));

            /*
             * Tally EVERY code in the history, not only the latest. This is the table that answers
             * "which code does this account use for delivery?" — and it could never have answered
             * it while it only ever saw the newest row of each shipment.
             */
            foreach ($events as $event) {
                $c = $event['code'];
                if (! isset($out['codes'][$c])) {
                    $out['codes'][$c] = [
                        'count'       => 0,
                        'description' => AramexStatusCodes::describe($c, $event['description']) ?? '',
                        'delivered'   => in_array($c, $deliveredCodes, true),
                    ];
                }
                $out['codes'][$c]['count']++;
                if ($out['codes'][$c]['description'] === '' && $event['description'] !== '') {
                    $out['codes'][$c]['description'] = $event['description'];
                }

                if (in_array($c, $deliveredCodes, true)) {
                    continue;
                }

                /*
                 * The blind-spot check, in two tiers. Tier one is a lookup against Aramex's own
                 * documented meanings and is the one that would have caught this bug on day one.
                 * Tier two is prose, for codes the table has never seen.
                 */
                if (AramexStatusCodes::isDeliveryClass($c)) {
                    if (! in_array($c, $out['unrecognised_delivery'], true)) {
                        $out['unrecognised_delivery'][] = $c;
                    }
                } elseif ($event['description'] !== '' && $this->looksLikeDelivery($event['description'])) {
                    if (! in_array($c, $out['possible_delivery'], true)) {
                        $out['possible_delivery'][] = $c;
                    }
                }
            }

            $row = [
                'bl'           => $bl->numero ?? $bl->id,
                'hawb'         => $bl->aramex_hawb,
                'from'         => $bl->aramex_status,
                'to'           => $code,
                'description'  => $description,
                'commande_id'  => $bl->commande_id,
                'promotes'     => false,
                // `?->` guards the METHOD CALL, not the array access before it. A shipment with no
                // delivery event has $deliveryEvent === null, and `null['at']` is a fatal in PHP 8
                // no matter what follows it. Line 299 onward is safe because it sits inside
                // `if ($isDelivered)`; this row is built for every shipment, delivered or not.
                'delivered_at' => $deliveryEvent ? $deliveryEvent['at']?->format('Y-m-d H:i') : null,
                'delivered_by' => $deliveryEvent['code'] ?? null,
            ];

            if ($changed) {
                $out['status_changed']++;
                if (! $dryRun) {
                    $bl->forceFill(['aramex_status' => $code])->saveQuietly();
                }
            }

            if ($isDelivered) {
                $out['delivered']++;

                /*
                 * Stamped on the BL whether or not there is an order behind it. A BL typed by hand
                 * in the admin has no `commande_id` and can never promote anything, but it is still
                 * finished, and without this the sweep would re-poll it on every run for the rest
                 * of its life.
                 */
                if (! $dryRun && $hasDeliveredAt) {
                    $bl->forceFill(['aramex_delivered_at' => $deliveryEvent['at'] ?? now()])->saveQuietly();
                }

                $order = $this->orderFor($bl);

                if ($order && ! in_array((string) $order->etat, self::TERMINAL_ORDER_STATES, true)) {
                    $row['promotes'] = true;
                    $out['orders_updated']++;

                    if (! $dryRun) {
                        /*
                         * The REAL delivery moment, from Aramex, not the moment this sweep noticed.
                         *
                         * It is set here rather than left to CommandeObserver (which stamps `now()`
                         * when the field is empty) because the whole post-delivery pipeline measures
                         * from this timestamp. On the first run after this fix, the backlog is
                         * months deep — stamping it all as "today" would tell the loyalty ledger and
                         * the review sweep that a hundred parcels arrived this afternoon.
                         *
                         * Only when empty: an operator who set a delivery date by hand knows
                         * something the courier's feed does not, and is not overruled by a robot.
                         */
                        if (empty($order->delivered_at) && $deliveryEvent['at']) {
                            $order->delivered_at = $deliveryEvent['at'];
                        }

                        /*
                         * `save()`, NOT `saveQuietly()`. The observer is the entire point: this one
                         * write is what stamps delivered_at, awards the loyalty points, sends the
                         * status SMS and makes the order visible to the review sweep. Saving
                         * quietly here would reproduce the exact bug this class exists to fix.
                         */
                        $order->etat = 'livree';
                        $order->save();

                        Log::info('Aramex: order marked delivered from tracking', [
                            'commande_id'  => $order->id,
                            'numero'       => $order->numero,
                            'hawb'         => $bl->aramex_hawb,
                            'update_code'  => $deliveryEvent['code'],
                            'delivered_at' => $deliveryEvent['at']?->toDateTimeString(),
                            'latest_code'  => $code,
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
            Log::warning('Aramex: documented DELIVERY codes are missing from aramex.delivered_codes', [
                'codes'          => $out['unrecognised_delivery'],
                'configured'     => $deliveredCodes,
                'orders_updated' => $out['orders_updated'],
                'action'         => 'Add them to ARAMEX_DELIVERED_CODES in the environment, then php artisan config:clear.',
            ]);
        }
        if (! empty($out['possible_delivery'])) {
            Log::info('Aramex: unknown code(s) whose description reads like a delivery', [
                'codes'  => $out['possible_delivery'],
                'action' => 'Check them against Aramex before adding — a payment event is not a delivery.',
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
