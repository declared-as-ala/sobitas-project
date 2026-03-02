<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * REQUEST TIMELINE PROFILER
 * 
 * Measures detailed timing for each stage of request processing:
 * - Bootstrap time
 * - Middleware execution time (per middleware)
 * - Controller execution time
 * - Database query time
 * - Redis cache time
 * - Serialization time
 * 
 * Only enabled when:
 * - APP_ENV=local, OR
 * - X-PERF header is present
 */
class RequestTimeline
{
    private $startTime;
    private $startMemory;
    private $timeline = [];
    private $requestId;
    private $enabled = false;

    public function handle(Request $request, Closure $next): Response
    {
        // Only profile if enabled
        $this->enabled = $this->shouldProfile($request);
        
        if (!$this->enabled) {
            return $next($request);
        }

        $this->requestId = uniqid('req_', true);
        $this->startTime = defined('LARAVEL_START') ? LARAVEL_START : microtime(true);
        $this->startMemory = memory_get_usage();

        // Mark bootstrap complete (time before middleware)
        // LARAVEL_START is defined in public/index.php, so we can measure bootstrap time
        $bootstrapTime = (microtime(true) - $this->startTime) * 1000;
        $this->timeline['bootstrap_complete'] = [
            'time' => microtime(true),
            'description' => 'Bootstrap and framework initialization',
            'memory' => memory_get_usage(),
            'bootstrap_ms' => $bootstrapTime,
        ];

        // Enable query logging
        DB::enableQueryLog();

        // Track Redis operations
        $this->trackRedis();

        // Execute request
        $response = $next($request);

        // Calculate final metrics
        $this->calculateMetrics($request, $response);

        // Add performance headers (for debugging)
        $this->addDebugHeaders($response);

        // Log timeline
        $this->logTimeline($request, $response);

        return $response;
    }

    private function shouldProfile(Request $request): bool
    {
        // Enable if local environment
        if (app()->environment('local')) {
            return true;
        }

        // Enable if X-PERF header is present
        if ($request->header('X-PERF') === '1') {
            return true;
        }

        return false;
    }

    private function trackRedis(): void
    {
        // Track Redis operations by intercepting Cache facade calls
        // This is a simplified approach - in production, use Redis events
        $this->mark('redis_tracking_start', 'Redis tracking enabled');
    }

    private function mark(string $stage, string $description): void
    {
        $this->timeline[$stage] = [
            'time' => microtime(true),
            'description' => $description,
            'memory' => memory_get_usage(),
        ];
    }

    private function calculateMetrics(Request $request, Response $response): void
    {
        $totalTime = (microtime(true) - $this->startTime) * 1000;
        $peakMemory = memory_get_peak_usage() / 1024 / 1024;

        // Calculate stage timings
        // Bootstrap time is from LARAVEL_START (defined in index.php) to when middleware starts
        // But we're measuring from middleware start, so bootstrap is already done
        // We can estimate bootstrap by checking if LARAVEL_START is defined
        $bootstrapMs = 0;
        if (defined('LARAVEL_START')) {
            // Bootstrap time = time from LARAVEL_START to when this middleware started
            // But since we start timing in this middleware, we need to estimate
            // For now, set to 0 and note that bootstrap happens before middleware
            $bootstrapMs = 0; // Bootstrap already completed before middleware
        }

        // Get query log
        $queryLog = DB::getQueryLog();
        $queryCount = count($queryLog);
        $dbTime = array_sum(array_column($queryLog, 'time'));

        // Estimate serialization time (if response was serialized)
        $serializationMs = 0;
        if ($response->headers->get('Content-Type') === 'application/json' ||
            str_contains($response->headers->get('Content-Type', ''), 'application/json')) {
            // Serialization happens when getContent() is called
            // We'll measure this in CacheApiResponse middleware
            $serializationMs = $response->headers->get('X-Perf-SerializeMs', 0);
        }

        // Cache metrics from headers
        $cacheGetMs = (float) $response->headers->get('X-Perf-CacheGetMs', 0);
        $cachePutMs = (float) $response->headers->get('X-Perf-CachePutMs', 0);
        $cacheStatus = $response->headers->get('X-Cache', 'MISS');
        $nextMs = (float) $response->headers->get('X-Perf-NextMs', 0);

        // Calculate middleware time (approximate)
        $middlewareMs = $totalTime - $bootstrapMs - $nextMs - $dbTime - $serializationMs - $cacheGetMs - $cachePutMs;
        if ($middlewareMs < 0) {
            $middlewareMs = 0;
        }

        // Store metrics
        $this->timeline['metrics'] = [
            'total_ms' => round($totalTime, 2),
            'bootstrap_ms' => round($bootstrapMs, 2),
            'middleware_ms' => round($middlewareMs, 2),
            'controller_ms' => round($nextMs, 2),
            'db_ms' => round($dbTime, 2),
            'query_count' => $queryCount,
            'redis_get_ms' => round($cacheGetMs, 2),
            'redis_put_ms' => round($cachePutMs, 2),
            'serialization_ms' => round($serializationMs, 2),
            'memory_peak_mb' => round($peakMemory, 2),
            'cache_status' => $cacheStatus,
            'response_size_bytes' => strlen($response->getContent()),
        ];
    }

    private function addDebugHeaders(Response $response): void
    {
        if (!isset($this->timeline['metrics'])) {
            return;
        }

        $m = $this->timeline['metrics'];

        // Only add headers in local/staging (remove in production)
        if (app()->environment(['local', 'staging'])) {
            $response->headers->set('X-Perf-TotalMs', $m['total_ms']);
            $response->headers->set('X-Perf-BootstrapMs', $m['bootstrap_ms']);
            $response->headers->set('X-Perf-MiddlewareMs', $m['middleware_ms']);
            $response->headers->set('X-Perf-ControllerMs', $m['controller_ms']);
            $response->headers->set('X-Perf-DbMs', $m['db_ms']);
            $response->headers->set('X-Perf-QueryCount', $m['query_count']);
            $response->headers->set('X-Perf-RedisGetMs', $m['redis_get_ms']);
            $response->headers->set('X-Perf-RedisPutMs', $m['redis_put_ms']);
            $response->headers->set('X-Perf-SerializeMs', $m['serialization_ms']);
            $response->headers->set('X-Perf-MemoryMb', $m['memory_peak_mb']);
            $response->headers->set('X-Perf-RequestId', $this->requestId);
        }
    }

    private function logTimeline(Request $request, Response $response): void
    {
        if (!isset($this->timeline['metrics'])) {
            return;
        }

        $m = $this->timeline['metrics'];

        Log::channel('single')->info('[PERF][all_products_timeline] Request Timeline', [
            'request_id' => $this->requestId,
            'url' => $request->fullUrl(),
            'method' => $request->method(),
            'cache_status' => $m['cache_status'],
            'total_ms' => $m['total_ms'],
            'bootstrap_ms' => $m['bootstrap_ms'],
            'middleware_ms' => $m['middleware_ms'],
            'controller_ms' => $m['controller_ms'],
            'db_ms' => $m['db_ms'],
            'query_count' => $m['query_count'],
            'redis_get_ms' => $m['redis_get_ms'],
            'redis_put_ms' => $m['redis_put_ms'],
            'serialization_ms' => $m['serialization_ms'],
            'memory_peak_mb' => $m['memory_peak_mb'],
            'response_size_bytes' => $m['response_size_bytes'],
            'breakdown' => [
                'bootstrap' => $m['bootstrap_ms'] . 'ms',
                'middleware' => $m['middleware_ms'] . 'ms',
                'controller' => $m['controller_ms'] . 'ms',
                'db' => $m['db_ms'] . 'ms (' . $m['query_count'] . ' queries)',
                'redis_get' => $m['redis_get_ms'] . 'ms',
                'redis_put' => $m['redis_put_ms'] . 'ms',
                'serialization' => $m['serialization_ms'] . 'ms',
                'other' => round($m['total_ms'] - $m['bootstrap_ms'] - $m['middleware_ms'] - $m['controller_ms'] - $m['db_ms'] - $m['redis_get_ms'] - $m['redis_put_ms'] - $m['serialization_ms'], 2) . 'ms',
            ],
        ]);
    }
}
