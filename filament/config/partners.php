<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Filament role_id for partner users (must match `users.role_id`)
    |--------------------------------------------------------------------------
    */
    'partner_role_id' => (int) env('PARTNER_ROLE_ID', 4),

    /*
    |--------------------------------------------------------------------------
    | Admin roles allowed on `admin` Filament panel (see User::canAccessPanel)
    |--------------------------------------------------------------------------
    */
    'admin_role_ids' => [1, 3],
];
