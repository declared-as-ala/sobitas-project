<?php

/**
 * Middleware Audit Script
 * 
 * Lists all middleware that run for API routes to identify potential blockers
 * 
 * Run: docker exec sobitas-backend php tests/audit_middleware.php
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Http\Request;
use Illuminate\Routing\Router;

$router = app(Router::class);
$kernel = app(\App\Http\Kernel::class);

echo "🔍 Middleware Audit for API Routes\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

// Get global middleware
echo "📋 Global Middleware (runs on ALL requests):\n";
$globalMiddleware = $kernel->getMiddleware();
foreach ($globalMiddleware as $i => $middleware) {
    echo sprintf("  %d. %s\n", $i + 1, is_string($middleware) ? $middleware : get_class($middleware));
}

echo "\n";

// Get API middleware group
echo "📋 API Middleware Group:\n";
$apiMiddleware = $kernel->getMiddlewareGroups()['api'] ?? [];
foreach ($apiMiddleware as $i => $middleware) {
    $name = is_string($middleware) ? $middleware : get_class($middleware);
    echo sprintf("  %d. %s\n", $i + 1, $name);
    
    // Check if it's a known performance blocker
    $blockers = [
        'StartSession' => 'Session middleware can block on file/redis I/O',
        'Debugbar' => 'Debugbar adds 50-200ms overhead',
        'VerifyCsrfToken' => 'CSRF verification can be slow',
        'EncryptCookies' => 'Cookie encryption overhead',
    ];
    
    foreach ($blockers as $blocker => $reason) {
        if (str_contains($name, $blocker)) {
            echo sprintf("     ⚠️  WARNING: %s\n", $reason);
        }
    }
}

echo "\n";

// Get route-specific middleware for /api/all_products
echo "📋 Route-Specific Middleware for /api/all_products:\n";
try {
    $route = $router->getRoutes()->getByName('api.all_products') 
        ?? $router->getRoutes()->match(Request::create('/api/all_products', 'GET'));
    
    if ($route) {
        $routeMiddleware = $route->middleware();
        if (empty($routeMiddleware)) {
            echo "  (none - uses API middleware group only)\n";
        } else {
            foreach ($routeMiddleware as $i => $middleware) {
                echo sprintf("  %d. %s\n", $i + 1, $middleware);
            }
        }
    } else {
        echo "  Route not found\n";
    }
} catch (\Exception $e) {
    echo "  Error: " . $e->getMessage() . "\n";
}

echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "✅ Middleware audit complete\n";
