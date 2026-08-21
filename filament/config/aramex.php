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
    | SH006 is what this codebase has always mapped to "Livré" in the dashboard
    | widget, and it is the default here for that reason — but Aramex update
    | codes vary by account and product group, so VERIFY IT ONCE against the real
    | account before trusting the automation:
    |
    |     php artisan aramex:sync-tracking --codes
    |
    | which lists every distinct update code the account is actually returning, with
    | a sample description and whether it currently counts as a delivery. It writes
    | nothing. That replaced "--dry-run and compare the Vers column against a parcel
    | you know was delivered", which required already knowing the answer.
    |
    | If this list is WRONG the failure is silent, not loud: the hourly sweep polls
    | every shipment, promotes nothing, and exits 0 — while loyalty points and review
    | requests stay dormant. AramexTrackingSync now watches for that specific case and
    | warns when a code whose description reads like a delivery is missing from here.
    |
    | ── MEASURED ON THE LIVE ACCOUNT, 21/08/2026 ─────────────────────────────────────
    | `aramex:sync-tracking --codes` against production returned:
    |
    |     SH239  x40   "Shipment charges paid"
    |     SH014  x1    "Record created."
    |
    | SH006 does not appear AT ALL. That is the whole explanation for 1,082 orders and
    | not one marked delivered: the sweep polls 54 shipments, matches nothing, and exits
    | successfully, hourly, forever.
    |
    | SH239 is NOT added here, and that is a decision rather than an oversight. It has
    | two readings and only Aramex can settle which applies to this account:
    |
    |   COD collected   the courier took the customer's money, which happens at the
    |                   door. Then SH239 IS delivery and belongs in this list.
    |   freight billed  the shipper's own charges were applied. `payment_type => 'P'`
    |                   above means prepaid-by-shipper, so this reading is plausible —
    |                   and under it, promoting on SH239 would text 40 customers that
    |                   their order arrived, credit loyalty points and request reviews
    |                   for parcels still in a van.
    |
    | Ask Aramex which one SH239 is for account 60506486. Then set it WITHOUT a deploy:
    |
    |     ARAMEX_DELIVERED_CODES=SH006,SH239
    |
    | in the VPS .env, then `php artisan config:clear`. The env override exists so that
    | answering this question is a one-line change by whoever gets the answer, rather
    | than a code edit, a review and a release.
    |
    | Add codes via the env var rather than editing the service.
    |
    | `settled_codes` is the narrower question of which shipments are finished
    | with, so the sweep stops paying for a request on them. A failed delivery
    | attempt (SH069) is settled for polling purposes but is NOT delivered.
    */
    /*
     * Comma-separated in the env, so the answer to "which code means delivered?" can be
     * applied by whoever obtains it, without a deploy. Falls back to the historical
     * default when unset — which is what is running today, and is why nothing promotes.
     */
    'delivered_codes' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('ARAMEX_DELIVERED_CODES', 'SH006'))
    ))),
    'settled_codes'   => ['SH006', 'SH069', 'annulé'],
];
