<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Published Asset Path
    |--------------------------------------------------------------------------
    |
    | Keep Filament's generated assets in a release-specific directory. The
    | admin nginx container serves a persistent public volume, so reusing the
    | default /js/filament URL can leave browsers on an incompatible cached
    | bundle after a package change. Bump this path with a Filament upgrade.
    |
    */

    'assets_path' => env('FILAMENT_ASSETS_PATH', 'filament-assets-v4-2'),

    /*
    |--------------------------------------------------------------------------
    | Broadcasting
    |--------------------------------------------------------------------------
    |
    | By uncommenting the Laravel Echo configuration, you may connect your
    | admin panel to any Pusher-compatible websockets server.
    |
    | This will allow your admin panel to receive real-time notifications.
    |
    */

    'broadcasting' => [

        // 'echo' => [
        //     'broadcaster' => 'pusher',
        //     'key' => env('VITE_PUSHER_APP_KEY'),
        //     'cluster' => env('VITE_PUSHER_APP_CLUSTER'),
        //     'forceTLS' => true,
        // ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | This is the storage disk Filament will use to put media. You may use any
    | of the disks defined in the `config/filesystems.php`.
    |
    */

    'default_filesystem_disk' => env('FILAMENT_FILESYSTEM_DISK', 'public'),

];
