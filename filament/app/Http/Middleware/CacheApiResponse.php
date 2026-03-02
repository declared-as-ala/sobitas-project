<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * PERFORMANCE FIX: Cache API responses to reduce database load
 * 
 * OPTIMIZED: Caches serialized response content to avoid re-serialization overhead
 */
class CacheApiResponse
{
    /**
     * Cache GET API responses for a configurable TTL.
     * Skips caching for authenticated requests or non-GET methods.
     */
    public function handle(Request $request, Closure $next, int $ttl = 300): Response
    {
        // Only cache GET requests for unauthenticated users
        if ($request->method() !== 'GET' || $request->user()) {
            return $next($request);
        }

        $cacheKey = 'api_cache:' . md5($request->fullUrl());
        $lockKey = 'api_cache_lock:' . md5($request->fullUrl());

        // ── MEASURE Cache::get time ──
        $cacheGetStart = microtime(true);
        $cached = Cache::get($cacheKey);
        $cacheGetMs = (microtime(true) - $cacheGetStart) * 1000;
        
        if ($cached !== null && is_array($cached)) {
            // CRITICAL FIX: Return pre-serialized JSON string directly (fastest)
            // This avoids any serialization overhead
            if (isset($cached['content'])) {
                $response = response($cached['content'], $cached['status'] ?? 200);
                $response->headers->set('Content-Type', $cached['headers']['Content-Type'] ?? 'application/json');
                // Mark as cached so CompressResponse can skip compression if needed
                $response->headers->set('X-Cache', 'HIT');
                $response->headers->set('X-Perf-CacheGetMs', round($cacheGetMs, 2));
                $response->headers->set('X-Perf-CachePutMs', 0);
                $response->headers->set('X-Perf-SerializeMs', 0);
                $response->headers->set('X-Perf-NextMs', 0);
                return $response;
            }
            // Fallback for old cache format
            if (isset($cached['data'])) {
                $response = response()->json($cached['data'], $cached['status'] ?? 200);
                foreach ($cached['headers'] ?? [] as $key => $value) {
                    $response->headers->set($key, $value);
                }
                $response->headers->set('X-Cache', 'HIT');
                $response->headers->set('X-Perf-CacheGetMs', round($cacheGetMs, 2));
                return $response;
            }
        }

        // ── CACHE STAMPEDE PROTECTION ──
        // If cache is empty, use a lock to prevent multiple requests from recomputing
        $lock = null;
        $lockAcquired = false;
        
        if ($cached === null) {
            $lock = Cache::lock($lockKey, 10); // 10 second lock
            $lockAcquired = $lock->block(2); // Wait up to 2 seconds for lock
            
            if ($lockAcquired) {
                // We got the lock - check cache again (another request might have filled it)
                $cached = Cache::get($cacheKey);
                if ($cached !== null && is_array($cached) && isset($cached['content'])) {
                    // Another request filled the cache while we waited
                    $lock->release();
                    $response = response($cached['content'], $cached['status'] ?? 200);
                    $response->headers->set('Content-Type', $cached['headers']['Content-Type'] ?? 'application/json');
                    $response->headers->set('X-Cache', 'HIT');
                    $response->headers->set('X-Perf-CacheGetMs', round($cacheGetMs, 2));
                    $response->headers->set('X-Perf-CachePutMs', 0);
                    $response->headers->set('X-Perf-SerializeMs', 0);
                    $response->headers->set('X-Perf-NextMs', 0);
                    return $response;
                }
            } else {
                // Couldn't get lock - another request is computing, wait and retry
                usleep(100000); // Wait 100ms
                $cached = Cache::get($cacheKey);
                if ($cached !== null && is_array($cached) && isset($cached['content'])) {
                    $response = response($cached['content'], $cached['status'] ?? 200);
                    $response->headers->set('Content-Type', $cached['headers']['Content-Type'] ?? 'application/json');
                    $response->headers->set('X-Cache', 'HIT');
                    $response->headers->set('X-Perf-CacheGetMs', round($cacheGetMs, 2));
                    $response->headers->set('X-Perf-CachePutMs', 0);
                    $response->headers->set('X-Perf-SerializeMs', 0);
                    $response->headers->set('X-Perf-NextMs', 0);
                    return $response;
                }
            }
        }

        // ── MEASURE $next($request) time (controller execution) ──
        $nextStart = microtime(true);
        $response = $next($request);
        $nextMs = (microtime(true) - $nextStart) * 1000;
        
        // Only cache JSON responses
        if ($response->headers->get('Content-Type') === 'application/json' ||
            str_contains($response->headers->get('Content-Type', ''), 'application/json')) {
            
            try {
                // ── MEASURE getContent() time (serialization) ──
                $serializeStart = microtime(true);
                $content = $response->getContent();
                $serializeMs = (microtime(true) - $serializeStart) * 1000;
                
                // Verify it's valid JSON
                $data = json_decode($content, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    // ── MEASURE Cache::put time ──
                    $cachePutStart = microtime(true);
                    Cache::put($cacheKey, [
                        'content' => $content, // Pre-serialized JSON string
                        'status' => $response->getStatusCode(),
                        'headers' => [
                            'Content-Type' => $response->headers->get('Content-Type'),
                        ],
                    ], $ttl);
                    $cachePutMs = (microtime(true) - $cachePutStart) * 1000;
                    
                    // Release lock if we acquired it
                    if ($lockAcquired && $lock) {
                        $lock->release();
                    }
                    
                    // Add performance headers
                    $response->headers->set('X-Cache', 'MISS');
                    $response->headers->set('X-Perf-CacheGetMs', round($cacheGetMs, 2));
                    $response->headers->set('X-Perf-CachePutMs', round($cachePutMs, 2));
                    $response->headers->set('X-Perf-SerializeMs', round($serializeMs, 2));
                    $response->headers->set('X-Perf-NextMs', round($nextMs, 2));
                }
            } catch (\Exception $e) {
                // Release lock on error
                if ($lockAcquired && $lock) {
                    $lock->release();
                }
                // If serialization fails, don't cache (let it fail naturally)
                // Log error for debugging
                \Log::warning('[CacheApiResponse] Failed to cache response', [
                    'url' => $request->fullUrl(),
                    'error' => $e->getMessage(),
                ]);
            }
        } else {
            // Release lock if we acquired it
            if ($lockAcquired && $lock) {
                $lock->release();
            }
            // Not JSON - still add timing headers
            $response->headers->set('X-Cache', 'MISS');
            $response->headers->set('X-Perf-CacheGetMs', round($cacheGetMs, 2));
            $response->headers->set('X-Perf-CachePutMs', 0);
            $response->headers->set('X-Perf-SerializeMs', 0);
            $response->headers->set('X-Perf-NextMs', round($nextMs, 2));
        }

        return $response;
    }
}
