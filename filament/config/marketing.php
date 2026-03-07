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
    | Absolute logo URL for emails (iframe preview + real emails).
    | Must be absolute so srcdoc iframe and emails display the image.
    | Default points to main site logo so email works when admin.sobitas.tn/logo.png 404s.
    */
    'logo_url' => env('MARKETING_LOGO_URL') ?: (env('FRONTEND_URL', 'https://protein.tn') . '/logo-sobitas.png'),

    /*
    | Logo URL used in the send-email preview iframe (admin panel).
    */
    'preview_logo_url' => env('MARKETING_PREVIEW_LOGO_URL') ?: env('MARKETING_LOGO_URL') ?: (env('FRONTEND_URL', 'https://protein.tn') . '/logo-sobitas.png'),
];
