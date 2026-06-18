<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Aramex API — Tunisia domestic shipping
    |--------------------------------------------------------------------------
    | ARAMEX_SANDBOX=true  → ws.dev.aramex.net  (test account below)
    | ARAMEX_SANDBOX=false → ws.aramex.net      (live account from sales team)
    */

    'sandbox' => (bool) env('ARAMEX_SANDBOX', true),

    // Credentials sent inside every API request body (ClientInfo)
    'username'         => env('ARAMEX_USERNAME', 'bitoutawalid@gmail.com'),
    'password'         => env('ARAMEX_PASSWORD', 'Walid@bitouta@0000'),
    'account_number'   => env('ARAMEX_ACCOUNT_NUMBER', '60506486'),
    'account_pin'      => env('ARAMEX_ACCOUNT_PIN', ''),  // request from Aramex: +216 71 160 800
    'account_entity'   => env('ARAMEX_ACCOUNT_ENTITY', 'TUN'),
    'account_country'  => env('ARAMEX_ACCOUNT_COUNTRY', 'TN'),
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
];
