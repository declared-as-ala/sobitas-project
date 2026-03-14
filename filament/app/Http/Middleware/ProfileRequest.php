<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Performance Profiling Middleware: Log detailed timing data for slow pages.
 * In development, tracks and logs query counts, DB time, and request time.
 * Targets Filament admin panel requests (/admin) for optimization.
 */
class ProfileRequest
{
    private float $startTime;
    private int $startQueryCount;
    private float $startDbTime;

    public function handle(Request $request, Closure $next): Response
    {
        if (!app()->isLocal()) {
            return $next($request);
        }

        // Start monitoring
        $this->startTime = microtime(true);
        $this->startQueryCount = count(DB::getQueryLog());
        $this->startDbTime = 0;

        DB::enableQueryLog();

        $response = $next($request);

        // Collect timing data
        $queryLog = DB::getQueryLog();
        $totalTime = (microtime(true) - $this->startTime) * 1000; // ms
        $queryCount = count($queryLog);
        $dbTime = $this->calculateDbTime($queryLog);

        // Log slow admin pages (threshold: 500ms for admin)
        if ($request->is('admin/*') && $totalTime > 500) {
            $this->logSlowRequest($request, $totalTime, $queryCount, $dbTime, $queryLog);
        }

        // Log slow API pages (threshold: 200ms)
        if ($request->is('api/*') && $totalTime > 200) {
            $this->logSlowRequest($request, $totalTime, $queryCount, $dbTime, $queryLog);
        }

        return $response;
    }

    private function calculateDbTime(array $queryLog): float
    {
        $total = 0;
        foreach ($queryLog as $query) {
            $total += ($query['time'] ?? 0);
        }
        return $total;
    }

    private function logSlowRequest(Request $request, float $totalTime, int $queryCount, float $dbTime, array $queryLog): void
    {
        $logData = [
            'timestamp' => now()->toIso8601String(),
            'method' => $request->getMethod(),
            'path' => $request->path(),
            'total_time_ms' => round($totalTime, 2),
            'query_count' => $queryCount,
            'db_time_ms' => round($dbTime, 2),
            'app_time_ms' => round($totalTime - $dbTime, 2),
            'slow_queries' => $this->extractSlowQueries($queryLog),
        ];

        \Illuminate\Support\Facades\Log::channel('performance')->info(
            "SLOW REQUEST: {$request->getMethod()} {$request->path()} - {$totalTime}ms",
            $logData
        );
    }

    private function extractSlowQueries(array $queryLog, int $threshold = 50): array
    {
        $slow = [];
        foreach ($queryLog as $query) {
            if (($query['time'] ?? 0) > $threshold) {
                $slow[] = [
                    'time_ms' => $query['time'],
                    'query' => $this->sanitizeQuery($query['query']),
                ];
            }
        }
        return array_slice($slow, 0, 5); // Top 5 slow queries
    }

    private function sanitizeQuery(string $query): string
    {
        // Remove sensitive data and truncate
        $query = preg_replace("/'[^']*'/", "'***'", $query);
        return mb_strlen($query) > 200 ? mb_substr($query, 0, 200) . '...' : $query;
    }
}
