<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Warm API cache by hitting endpoints internally
 * 
 * This command primes:
 * - Config cache
 * - Route cache
 * - View cache
 * - OPcache (by loading classes)
 * - Redis cache for API endpoints
 */
class WarmApiCache extends Command
{
    protected $signature = 'api:warm {--endpoint=all_products : Endpoint to warm}';
    protected $description = 'Warm API cache and OPcache by hitting endpoints';

    public function handle(): int
    {
        $this->info('🔥 Warming API cache...');

        // 1. Optimize Laravel caches
        $this->info('📦 Optimizing Laravel caches...');
        Artisan::call('config:cache');
        $this->info('  ✓ Config cached');

        // Check if routes can be cached (no closures)
        try {
            Artisan::call('route:cache');
            $this->info('  ✓ Routes cached');
        } catch (\Exception $e) {
            $this->warn('  ⚠ Routes not cached (may contain closures)');
        }

        Artisan::call('view:cache');
        $this->info('  ✓ Views cached');

        // 2. Warm OPcache by loading main classes
        $this->info('⚡ Warming OPcache...');
        $this->warmOpcache();
        $this->info('  ✓ OPcache warmed');

        // 3. Warm Redis cache by hitting endpoints
        $this->info('💾 Warming Redis cache...');
        $endpoint = $this->option('endpoint');
        
        if ($endpoint === 'all_products' || $endpoint === 'all') {
            $this->warmEndpoint('/api/all_products');
        }

        $this->info('✅ Cache warming complete!');
        return 0;
    }

    private function warmOpcache(): void
    {
        // Load main application classes to warm OPcache
        $classes = [
            \App\Http\Controllers\Api\ApisController::class,
            \App\Models\Product::class,
            \App\Models\Brand::class,
            \App\Models\Categ::class,
            \App\Models\SousCategory::class,
            \Illuminate\Support\Facades\Cache::class,
            \Illuminate\Support\Facades\DB::class,
        ];

        foreach ($classes as $class) {
            if (class_exists($class)) {
                class_exists($class); // Trigger autoload
            }
        }
    }

    private function warmEndpoint(string $path): void
    {
        $url = config('app.url') . $path;
        
        try {
            $start = microtime(true);
            $response = Http::timeout(30)->get($url);
            $time = (microtime(true) - $start) * 1000;

            if ($response->successful()) {
                $this->info("  ✓ {$path} warmed ({$time}ms)");
            } else {
                $this->warn("  ⚠ {$path} returned {$response->status()}");
            }
        } catch (\Exception $e) {
            $this->error("  ✗ {$path} failed: " . $e->getMessage());
        }
    }
}
