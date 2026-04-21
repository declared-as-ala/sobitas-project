<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Marketing send mode
    |--------------------------------------------------------------------------
    | auto: if recipients <= sync_threshold send synchronously, else queue
    | sync: always send synchronously (no queue)
    | queue: always dispatch to queue (requires queue worker)
    */
    'send_mode' => env('MARKETING_SEND_MODE', 'auto'),

    /*
    | When send_mode is 'auto', use sync for recipient count <= this value.
    */
    'sync_threshold' => (int) env('MARKETING_SYNC_THRESHOLD', 20),

    /*
    | Absolute logo URL for marketing emails (Send Email, campaigns, preview iframe).
    | Leave empty to use this app’s public/logo.png (filament/public/logo.png).
    | Set MARKETING_LOGO_URL only if you host the asset elsewhere (CDN, etc.).
    */
    'logo_url' => env('MARKETING_LOGO_URL', ''),

    /*
    | Logo URL for the send-email preview iframe only. Empty = same as logo_url / public logo.
    */
    'preview_logo_url' => env('MARKETING_PREVIEW_LOGO_URL', ''),
];
