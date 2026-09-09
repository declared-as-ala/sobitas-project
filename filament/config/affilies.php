<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Filament role_id for affilie users (must match `users.role_id`)
    |--------------------------------------------------------------------------
    */
    // Reads the legacy PARTNER_ROLE_ID as a fallback: the production .env predates the rename and
    // still carries the old key. Without this, a restored server would silently fall back to 4.
    'affilie_role_id' => (int) env('AFFILIE_ROLE_ID', env('PARTNER_ROLE_ID', 4)),

    /*
    |--------------------------------------------------------------------------
    | Admin roles allowed on `admin` Filament panel (see User::canAccessPanel)
    |--------------------------------------------------------------------------
    */
    'admin_role_ids' => [1, 3],
];
