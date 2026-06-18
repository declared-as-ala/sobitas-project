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
    'password'       => 'Aspire123@',
    'account_number' => '60506486',
    'account_pin'    => '0000',   // TODO: replace with real PIN from Aramex (+216 71 160 800)
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
];
