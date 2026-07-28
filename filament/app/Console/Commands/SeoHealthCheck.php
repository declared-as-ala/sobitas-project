<?php

namespace App\Console\Commands;

use App\Services\Seo\SeoHealthMonitor;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Run the automated SEO watchdog and record the result.
 *
 *   php artisan seo:health-check           # run, persist, print
 *   php artisan seo:health-check --quiet-pass  # only print checks that are not passing
 *
 * Scheduled daily (routes/console.php). Exits non-zero when any check FAILS, so it also works as
 * a smoke test in a pipeline.
 */
class SeoHealthCheck extends Command
{
    protected $signature = 'seo:health-check {--quiet-pass : Only output checks that are not passing}';

    protected $description = 'Fetch the live site as Googlebot and verify the SEO invariants that silently broke before';

    public function handle(SeoHealthMonitor $monitor): int
    {
        $results = $monitor->run();
        $failed = 0;

        foreach ($results as $r) {
            try {
                DB::table('seo_health_checks')->insert([
                    'check' => $r['check'],
                    'status' => $r['status'],
                    'summary' => $r['summary'],
                    'value' => $r['value'],
                    'details' => json_encode($r['details'], JSON_UNESCAPED_UNICODE),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } catch (\Throwable $e) {
                // Persisting is a nice-to-have; never let it stop the report being seen.
                Log::warning('seo:health-check could not persist result', ['check' => $r['check'], 'error' => $e->getMessage()]);
            }

            $isFail = $r['status'] === 'fail';
            if ($isFail) {
                $failed++;
            }

            if ($this->option('quiet-pass') && $r['status'] === 'pass') {
                continue;
            }

            $line = sprintf('%-24s %-5s %s', $r['check'], strtoupper($r['status']), $r['summary']);
            match ($r['status']) {
                'fail' => $this->error($line),
                'warn' => $this->warn($line),
                default => $this->info($line),
            };

            // Failing checks are worth a log line too — the schedule runs unattended.
            if ($isFail) {
                Log::error('SEO health check failed', ['check' => $r['check'], 'summary' => $r['summary'], 'details' => $r['details']]);
            }
        }

        if ($failed > 0) {
            $this->newLine();
            $this->error("{$failed} SEO check(s) FAILED — see storage/logs for detail.");

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
