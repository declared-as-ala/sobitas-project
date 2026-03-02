<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * PERFORMANCE PROFILER - Scoped instrumentation for /api/all_products
 * 
 * This middleware adds detailed timing and query profiling ONLY for specific endpoints.
 * Remove or disable after diagnostics complete.
 */
class PerformanceProfiler
{
    private $startTime;
    private $startMemory;
    private $queries = [];

    public function handle(Request $request, Closure $next): Response
    {
        // Only profile /api/all_products endpoint
        if (!$request->is('api/all_products')) {
            return $next($request);
        }

        $this->startTime = microtime(true);
        $this->startMemory = memory_get_usage();

        // Enable query logging
        DB::enableQueryLog();

        // Listen to all queries
        DB::listen(function ($query) {
            $this->queries[] = [
                'sql' => $query->sql,
                'bindings' => $query->bindings,
                'time' => $query->time,
            ];
        });

        // Execute request
        $response = $next($request);

        // Calculate metrics
        $totalTime = (microtime(true) - $this->startTime) * 1000; // ms
        $memoryUsed = (memory_get_usage() - $this->startMemory) / 1024 / 1024; // MB
        $peakMemory = memory_get_peak_usage() / 1024 / 1024; // MB
        $queryLog = DB::getQueryLog();
        $totalQueryTime = array_sum(array_column($queryLog, 'time'));
        $queryCount = count($queryLog);

        // Sort queries by time (slowest first)
        usort($this->queries, fn($a, $b) => $b['time'] <=> $a['time']);

        // Log detailed performance data
        Log::channel('single')->info('[PERF][all_products] Performance Profile', [
            'url' => $request->fullUrl(),
            'method' => $request->method(),
            'total_time_ms' => round($totalTime, 2),
            'memory_used_mb' => round($memoryUsed, 2),
            'peak_memory_mb' => round($peakMemory, 2),
            'query_count' => $queryCount,
            'total_query_time_ms' => round($totalQueryTime, 2),
            'time_outside_queries_ms' => round($totalTime - $totalQueryTime, 2),
            'response_size_bytes' => strlen($response->getContent()),
            'top_10_slowest_queries' => array_slice($this->queries, 0, 10),
            'all_queries' => $queryLog,
        ]);

        // Also output to console for immediate visibility
        if (app()->runningInConsole() === false) {
            error_log(sprintf(
                "[PERF][all_products] Total: %.2fms | Queries: %d (%.2fms) | Memory: %.2fMB | Response: %d bytes",
                $totalTime,
                $queryCount,
                $totalQueryTime,
                $peakMemory,
                strlen($response->getContent())
            ));
        }

        return $response;
    }
}
