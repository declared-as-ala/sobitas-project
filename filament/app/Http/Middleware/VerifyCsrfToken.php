<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * The URIs that should be excluded from CSRF verification.
     *
     * @var array<int, string>
     */
    protected $except = [
        // Gmail/RFC 8058 one-click unsubscribe is a server-to-server POST and cannot carry
        // Laravel's browser CSRF token. The signed token in the URL is the authorization.
        'unsubscribe',
    ];
}
