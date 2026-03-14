<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use App\Models\Ticket;
use App\Models\Commande;
use App\Models\FactureTva;
use App\Models\Quotation;

/**
 * Performance Benchmark Command
 * 
 * Tests the 5 slowest resources and measures:
 * - Page load time
 * - Query count
 * - DB execution time
 * - Memory usage
 */
class BenchmarkFilamentPerformance extends Command
{
    protected $signature = 'performance:benchmark';

    protected $description = 'Benchmark Filament admin page performance (measure improvements)';

    public function handle(): int
    {
        $this->line('');
        $this->line('╔══════════════════════════════════════════════════════════════╗');
        $this->line('║          FILAMENT PERFORMANCE BENCHMARK TEST                 ║');
        $this->line('╚══════════════════════════════════════════════════════════════╝');
        $this->line('');

        // Run benchmarks for key resources
        $results = [];

        DB::enableQueryLog();

        $resources = [
            'Tickets' => function () {
                return Ticket::query()
                    ->select(['tickets.id', 'tickets.numero', 'tickets.type', 'tickets.client_id', 'tickets.prix_ttc', 'tickets.created_at'])
                    ->with('client:id,name')
                    ->paginate(25);
            },
            'Commandes' => function () {
                return Commande::query()
                    ->select(['commandes.id', 'commandes.numero', 'commandes.nom', 'commandes.prenom', 'commandes.phone', 'commandes.prix_ttc', 'commandes.etat', 'commandes.created_at', 'commandes.client_id'])
                    ->with('client:id,name,phone_1')
                    ->paginate(25);
            },
            'Factures TVA' => function () {
                return FactureTva::query()
                    ->select(['facture_tvas.id', 'facture_tvas.numero', 'facture_tvas.status', 'facture_tvas.client_id', 'facture_tvas.prix_ttc', 'facture_tvas.created_at'])
                    ->with('client:id,name')
                    ->paginate(25);
            },
            'Quotations (Devis)' => function () {
                return Quotation::query()
                    ->select(['quotations.id', 'quotations.numero', 'quotations.client_id', 'quotations.prix_ht', 'quotations.net_a_payer', 'quotations.created_at', 'quotations.statut'])
                    ->with('client:id,name')
                    ->paginate(25);
            },
            'Search/Filter Test' => function () {
                return Commande::query()
                    ->where('etat', 'nouvelle_commande')
                    ->orWhere('nom', 'like', '%a%')
                    ->paginate(25);
            },
        ];

        foreach ($resources as $name => $closure) {
            DB::enableQueryLog();

            $start = microtime(true);
            $result = $closure();
            $time = (microtime(true) - $start) * 1000; // Convert to ms

            $queryLog = DB::getQueryLog();
            $queryCount = count($queryLog);
            
            $dbTime = 0;
            $slowQueries = [];
            foreach ($queryLog as $query) {
                $dbTime += $query['time'] ?? 0;
                if (($query['time'] ?? 0) > 50) {
                    $slowQueries[] = [
                        'time' => $query['time'],
                        'query' => mb_substr($query['query'], 0, 80) . '...',
                    ];
                }
            }

            $results[$name] = [
                'total_time_ms' => round($time, 2),
                'query_count' => $queryCount,
                'db_time_ms' => round($dbTime, 2),
                'app_time_ms' => round($time - $dbTime, 2),
                'slow_queries' => count($slowQueries),
            ];

            $this->line("  <fg=cyan>$name</>");
            $this->line("    ├─ Total Time: <fg=yellow>{$time}ms</> (DB: {$dbTime}ms, App: " . round($time - $dbTime, 2) . "ms)");
            $this->line("    ├─ Query Count: <fg=" . ($queryCount > 15 ? 'red' : 'green') . ">{$queryCount}</>");
            $this->line("    └─ Slow Queries (>50ms): <fg=" . (count($slowQueries) > 0 ? 'red' : 'green') . ">" . count($slowQueries) . "</>");
            $this->line('');
        }

        // Summary table
        $this->line('');
        $this->line('<fg=white;bg=blue> SUMMARY TABLE </>\n');
        
        $table = [];
        $overallSlowQueries = 0;
        
        foreach ($results as $resource => $metrics) {
            $table[] = [
                $resource,
                round($metrics['total_time_ms']) . 'ms',
                $metrics['query_count'],
                round($metrics['db_time_ms']) . 'ms',
                $metrics['slow_queries'],
            ];
            $overallSlowQueries += $metrics['slow_queries'];
        }

        $this->table(
            ['Resource', 'Total Time', 'Queries', 'DB Time', 'Slow (>50ms)'],
            $table
        );

        // Recommendations
        $this->line('');
        $this->line('<fg=white;bg=blue> RECOMMENDATIONS </>\n');

        foreach ($results as $resource => $metrics) {
            if ($metrics['total_time_ms'] > 500) {
                $this->line("<fg=red>✗ $resource is SLOW ({$metrics['total_time_ms']}ms > 500ms target)</>");
            } elseif ($metrics['total_time_ms'] > 300) {
                $this->line("<fg=yellow>⚠ $resource could be faster ({$metrics['total_time_ms']}ms)</>");
            } else {
                $this->line("<fg=green>✓ $resource is FAST ({$metrics['total_time_ms']}ms)</>");
            }

            if ($metrics['query_count'] > 20) {
                $this->line("  → Check eager loading: {$metrics['query_count']} queries is high");
            }

            if ($metrics['slow_queries'] > 0) {
                $this->line("  → {$metrics['slow_queries']} queries >50ms - add indexes or optimize");
            }
        }

        // Cache status
        $this->line('');
        $this->line('<fg=white;bg=blue> CACHE STATUS </>\n');

        try {
            Cache::put('perf_test', 'OK', 60);
            $this->line('<fg=green>✓ Cache driver is working</> (' . config('cache.default') . ')');
        } catch (\Exception $e) {
            $this->line('<fg=red>✗ Cache driver failed:</> ' . $e->getMessage());
        }

        // Final score
        $avgTime = array_sum(array_map(fn ($r) => $r['total_time_ms'], $results)) / count($results);
        $avgQueries = array_sum(array_map(fn ($r) => $r['query_count'], $results)) / count($results);

        $this->line('');
        $this->line('╔══════════════════════════════════════════════════════════════╗');
        $this->line(sprintf('║  Average Load Time: <fg=yellow>%dms</> | Avg Queries: <fg=yellow>%d</>', round($avgTime), round($avgQueries)));
        $this->line('║');
        
        if ($avgTime < 500 && $avgQueries < 15 && $overallSlowQueries < 3) {
            $this->line('<fg=green>║  ✓✓✓ PERFORMANCE OPTIMIZED! ✓✓✓</></>');
        } elseif ($avgTime < 800 && $avgQueries < 25) {
            $this->line('<fg=yellow>║  ⚠ Performance is acceptable, but could be improved</></>');
        } else {
            $this->line('<fg=red>║  ✗✗✗ Performance needs improvement ✗✗✗</></>');
        }

        $this->line('╚══════════════════════════════════════════════════════════════╝');
        $this->line('');

        // Log results
        Log::channel('performance')->info('Benchmark test completed', ['results' => $results, 'avg_time_ms' => round($avgTime)]);

        return 0;
    }
}
