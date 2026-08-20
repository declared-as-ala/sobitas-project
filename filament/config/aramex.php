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
    |     php artisan aramex:sync-tracking --dry-run
    |
    | and compare the "Vers" column against a parcel you know was delivered. Add
    | codes here rather than editing the service.
    |
    | `settled_codes` is the narrower question of which shipments are finished
    | with, so the sweep stops paying for a request on them. A failed delivery
    | attempt (SH069) is settled for polling purposes but is NOT delivered.
    */
    'delivered_codes' => ['SH006'],
    'settled_codes'   => ['SH006', 'SH069', 'annulé'],
];
