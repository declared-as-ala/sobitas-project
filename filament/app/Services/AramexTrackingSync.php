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
 */
class AramexTrackingSync
{
    /** Statuses past which an order must never be dragged backwards or forwards by a robot. */
    private const TERMINAL_ORDER_STATES = ['livree', 'livrée', 'livre', 'annuler'];

    public function __construct(private AramexService $aramex)
    {
    }

    /**
     * Poll Aramex for every shipment still in flight and write back what changed.
     *
     * @return array{checked:int, status_changed:int, delivered:int, orders_updated:int, errors:int, rows:array<int, array<string, mixed>>}
     */
    public function sync(int $limit = 200, bool $dryRun = false): array
    {
        $out = ['checked' => 0, 'status_changed' => 0, 'delivered' => 0, 'orders_updated' => 0, 'errors' => 0, 'rows' => []];

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

        return $out;
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
