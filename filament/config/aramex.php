<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Aramex API — Tunisia domestic shipping
    |--------------------------------------------------------------------------
    | ARAMEX_SANDBOX=true  → ws.dev.aramex.net  (test account below)
    | ARAMEX_SANDBOX=false → ws.aramex.net      (live account from sales team)
    */

    'sandbox' => false,

    // Credentials sent inside every API request body (ClientInfo)
    'username'       => 'bitoutawalid@gmail.com',
    'password'       => 'Walid@bitouta@0000',
    'account_number' => '60506486',
    'account_pin'    => '321321',
    'account_entity' => 'TUN',
    'account_country' => 'TN',
    'version'          => '1.0',

    // Shipment defaults for domestic Tunisia
    'product_group'    => 'DOM',   // domestic
    'product_type'     => 'ONP',   // Aramex picks up from shipper
    'payment_type'     => 'P',
    'services'         => 'CODS', // cash on delivery

    // Label format
    'label_report_id'  => 9737,
    'label_report_type' => 'URL',

    // Base URLs
    'url_sandbox'    => 'https://ws.dev.aramex.net',
    'url_production' => 'https://ws.aramex.net',

    /*
    |--------------------------------------------------------------------------
    | Tracking codes that mean something to us
    |--------------------------------------------------------------------------
    | `delivered_codes` is the ONE value in this file that changes a customer's
    | experience if it is wrong. An update code listed here promotes the linked
    | order to "livrée", which stamps delivered_at, awards loyalty points, texts
    | the customer and queues the review-request email (App\Services\
    | AramexTrackingSync).
    |
    | ── WHAT WAS WRONG, AND HOW IT WAS ANSWERED (21/08/2026) ─────────────────────────
    | This defaulted to `['SH006']`, inherited from an admin dashboard widget and never
    | verified. Aramex publishes what its codes mean, and SH006 is not the one:
    |
    |     SH005  Delivered                 <- the delivery event. WAS NEVER CONFIGURED.
    |     SH006  Collected by Consignee    <- the customer went to an Aramex counter.
    |
    | A home-delivery shop was therefore detecting only counter pickups. It found almost
    | none, promoted nothing, and exited 0 — hourly, forever, with no error anywhere.
    | That is the whole explanation for 1,082 orders with not one marked delivered, a
    | loyalty ledger that has never paid out, and a review-request engine that has never
    | sent an email.
    |
    | The default is now App\Support\Aramex\AramexStatusCodes::DELIVERED — the five
    | codes that mean the consignee has the goods (delivered, collected, letter box,
    | locker pickup, drop-off pickup). That file also records the receipts deliberately
    | NOT auto-promoted (partial delivery, handed to a postal service, documents) and
    | why, so the next person does not have to re-derive the decision.
    |
    | ── AND THE MEASUREMENT THAT MISLED US ───────────────────────────────────────────
    | `--codes` against the live account first returned SH239 "Shipment charges paid"
    | x40 and SH014 "Record created." x1, and nothing else. That looked like an account
    | with no delivery events at all.
    |
    | It was an artefact of the question. The tracking call used
    | `GetLastTrackingUpdateOnly`, so it returned the NEWEST row of each history — and
    | on a cash-on-delivery account the COD payment posts after the courier hands the
    | parcel over, so the newest row is a payment and the delivery is the row above it,
    | which was never fetched. The sweep now reads full histories and asks whether a
    | delivery code appears ANYWHERE in one.
    |
    | SH239 is still not in this list, and that is deliberate: "shipment charges paid"
    | is a payment event, and Aramex files payments separately from deliveries (SH074,
    | SH383, SH480, SH505). Those forty parcels are promoted on the SH005 in their
    | history, not on the money.
    |
    | ── VERIFYING IT ON ANY ACCOUNT ──────────────────────────────────────────────────
    |     php artisan aramex:sync-tracking --codes      every code the account returns
    |     php artisan aramex:sync-tracking --history=5  full event lists, oldest first
    |
    | Both write nothing. `--history` is the one that shows a delivery sitting under a
    | payment, which is the shape of the bug above.
    |
    | If a documented delivery code ever turns up that is not listed here, the sweep
    | says so by name in the command output and in the application log, so the silent
    | no-op cannot come back.
    |
    | `settled_codes` is the narrower question of which shipments are finished with, so
    | the sweep stops paying for a request on them. A return to shipper is settled for
    | polling purposes but is NOT delivered. Delivered shipments are no longer parked
    | here at all — `factures.aramex_delivered_at` does that, because a delivered COD
    | parcel's latest code is a payment and would never have matched this list.
    */

    /*
     * Comma-separated in the env, so a per-account correction is a one-line change plus
     * `php artisan config:clear`, rather than a code edit, a review and a release.
     */
    'delivered_codes' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env(
            'ARAMEX_DELIVERED_CODES',
            implode(',', \App\Support\Aramex\AramexStatusCodes::DELIVERED)
        ))
    ))),

    /*
     * Terminal without ever being a delivery: returned to shipper, confiscated by
     * customs. Polling these again can only ever spend money to be told the same thing.
     */
    'settled_codes' => array_merge(
        \App\Support\Aramex\AramexStatusCodes::TERMINAL,
        ['annulé']
    ),

    /*
     * Do not text a customer about a parcel they received weeks ago.
     *
     * The first run after the fix above promotes a backlog months deep. Every promotion
     * fires CommandeObserver, which sends the order-status SMS — so without this, fixing
     * a silent bug would announce itself as a hundred confusing text messages, at cost,
     * in one afternoon. Loyalty points and review requests are NOT suppressed: those are
     * owed, and the review sweep has its own max-age window.
     *
     * 0 disables the guard and texts everybody.
     */
    'status_sms_max_age_days' => (int) env('ARAMEX_STATUS_SMS_MAX_AGE_DAYS', 3),
];
