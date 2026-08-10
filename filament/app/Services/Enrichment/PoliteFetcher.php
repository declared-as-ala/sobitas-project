<?php

namespace App\Services\Enrichment;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * One HTTP client for every external host, with a separate pace for each.
 *
 * ── WHY PER-HOST AND NOT ONE GLOBAL LIMIT ─────────────────────────────────────────────────
 * The services we read from publish wildly different constraints — USDA allows 1,000 requests an
 * hour, Open Food Facts 15 a minute, DuckDuckGo starts returning empty 202s after about two
 * queries in a row. A single global limiter is simultaneously too slow for one and far too fast
 * for another. Each host gets its own token bucket in Redis, so parallel workers share the pace
 * rather than each keeping their own private idea of it.
 *
 * ── THE CIRCUIT BREAKER IS FOR US, NOT FOR THEM ───────────────────────────────────────────
 * A run of 401/403/429 from a host means it has decided it does not want this traffic. Continuing
 * turns a temporary throttle into a permanent block, and a permanently blocked host yields zero
 * facts forever. So the breaker opens and we come back in half an hour. Changing identity, proxy
 * or fingerprint to get through would work exactly once and cost the source for good.
 *
 * Everything here identifies itself: a host that wants to reach us can, and a host that wants us
 * gone can say so.
 */
class PoliteFetcher
{
    /** @var array<string, bool> robots.txt disallow cache, per host */
    private array $robotsCache = [];

    /**
     * @return array{status:int, body:string, url:string, host:string, hash:string}|null
     *         null when the fetch was refused, blocked, or failed after retries
     */
    public function get(string $url, array $headers = []): ?array
    {
        $host = $this->host($url);
        if ($host === null) {
            return null;
        }

        if ($this->breakerIsOpen($host)) {
            return null;
        }

        if (! $this->mayFetch($url, $host)) {
            return null;
        }

        $this->pace($host);

        try {
            $response = Http::withHeaders(array_merge([
                'User-Agent' => (string) config('enrichment.fetch.user_agent'),
                'Accept' => 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
                'Accept-Language' => 'fr,en;q=0.8',
            ], $headers))
                ->connectTimeout(8)
                ->timeout((int) config('enrichment.fetch.timeout_seconds', 25))
                ->withOptions(['allow_redirects' => ['max' => 5]])
                ->get($url);

            $status = $response->status();

            // The host is pushing back. Record it; enough of these and we stop asking.
            if (in_array($status, [401, 403, 429], true)) {
                $this->recordFailure($host, $status);

                return null;
            }

            if (! $response->successful()) {
                return null;
            }

            $body = (string) $response->body();
            $max = (int) config('enrichment.fetch.max_bytes', 4194304);
            if (strlen($body) > $max) {
                // A page this large is a category listing or a bundled app payload, not a product
                // page worth parsing. Truncating would corrupt the JSON-LD we came for.
                Log::info('[PoliteFetcher] response over size limit, skipped', ['url' => $url, 'bytes' => strlen($body)]);

                return null;
            }

            $this->clearFailures($host);

            return [
                'status' => $status,
                'body' => $body,
                'url' => (string) ($response->effectiveUri() ?? $url),
                'host' => $host,
                // Re-fetching an unchanged page must not create a second observation.
                'hash' => hash('sha256', $body),
            ];
        } catch (\Throwable $e) {
            Log::info('[PoliteFetcher] request failed', ['url' => $url, 'error' => $e->getMessage()]);
            $this->recordFailure($host, 0);

            return null;
        }
    }

    /** Per-host policy from config/enrichment.php, with sane defaults for an unlisted host. */
    public function policy(string $host): array
    {
        $hosts = (array) config('enrichment.hosts', []);

        foreach ($hosts as $pattern => $policy) {
            if ($host === $pattern || str_ends_with($host, '.'.$pattern)) {
                return $policy + ['trust' => 0.5, 'rps' => null, 'store_text' => false, 'type' => 'unknown'];
            }
        }

        return [
            'trust' => 0.4,          // an unlisted host is a lead, not an authority
            'rps' => null,
            'store_text' => false,
            'type' => 'unknown',
        ];
    }

    private function mayFetch(string $url, string $host): bool
    {
        if (! config('enrichment.fetch.respect_robots', true)) {
            return true;
        }

        $path = parse_url($url, PHP_URL_PATH) ?: '/';

        return ! $this->robotsDisallows($host, $path);
    }

    /**
     * A deliberately small robots.txt reader: the `Disallow` lines under `*` or our own agent.
     *
     * It is not a full RFC 9309 implementation and does not need to be — the job is to avoid
     * hammering paths a host has asked crawlers to leave alone, and the practical benefit is
     * staying out of infinite calendars, search endpoints and login walls that would burn the
     * budget without yielding a single product fact.
     */
    private function robotsDisallows(string $host, string $path): bool
    {
        $rules = $this->robotsCache[$host] ??= Cache::remember(
            "enrichment:robots:{$host}",
            86400,
            function () use ($host): array {
                try {
                    $response = Http::withHeaders(['User-Agent' => (string) config('enrichment.fetch.user_agent')])
                        ->connectTimeout(5)->timeout(10)->get("https://{$host}/robots.txt");

                    if (! $response->successful()) {
                        return [];   // no robots.txt is not a prohibition
                    }

                    $disallow = [];
                    $applies = false;
                    foreach (preg_split('/\R/', (string) $response->body()) ?: [] as $line) {
                        $line = trim(preg_replace('/#.*$/', '', $line) ?? '');
                        if ($line === '') {
                            continue;
                        }
                        if (preg_match('/^user-agent:\s*(.+)$/i', $line, $m)) {
                            $agent = strtolower(trim($m[1]));
                            $applies = $agent === '*' || str_contains($agent, 'protein-tn');

                            continue;
                        }
                        if ($applies && preg_match('/^disallow:\s*(.*)$/i', $line, $m)) {
                            $rule = trim($m[1]);
                            if ($rule !== '') {
                                $disallow[] = $rule;
                            }
                        }
                    }

                    return $disallow;
                } catch (\Throwable) {
                    return [];
                }
            }
        );

        foreach ($rules as $rule) {
            if ($rule === '/' || self::pathMatchesRule($path, $rule)) {
                return true;
            }
        }

        return false;
    }

    /**
     * robots.txt path matching, including the `*` and `$` wildcards.
     *
     * This was `str_starts_with($path, $rule)`, which silently ignores wildcards — and wildcards in
     * the MIDDLE of a rule are common. iHerb, for instance, publishes:
     *
     *     Disallow: /ugc/api/product/&#42;/review/summarization
     *
     * A prefix match never fires on that, because the literal rule text is not a prefix of
     * `/ugc/api/product/27509/review/summarization`. So the fetcher believed it was honouring
     * robots.txt while being structurally incapable of enforcing that particular line — the worst
     * kind of safety check, one that reports success without doing the work.
     *
     * `$` anchors the end of the path, per the de-facto standard both Google and Bing implement.
     */
    private static function pathMatchesRule(string $path, string $rule): bool
    {
        if ($rule === '') {
            return false;
        }

        if (! str_contains($rule, '*') && ! str_ends_with($rule, '$')) {
            return str_starts_with($path, $rule);
        }

        $anchored = str_ends_with($rule, '$');
        $body = $anchored ? substr($rule, 0, -1) : $rule;

        // Escape everything, then re-open only the wildcard.
        $pattern = str_replace('\*', '.*', preg_quote($body, '~'));

        return preg_match('~^'.$pattern.($anchored ? '$' : '').'~', $path) === 1;
    }

    /**
     * Token bucket in the cache, so concurrent queue workers share one pace per host instead of
     * each politely waiting its own three seconds and collectively arriving all at once.
     */
    private function pace(string $host): void
    {
        $rps = $this->policy($host)['rps']
            ?? (float) config('enrichment.fetch.default_requests_per_second', 0.33);
        $interval = 1.0 / max($rps, 0.01);

        $key = "enrichment:pace:{$host}";
        $last = (float) (Cache::get($key) ?? 0);
        $wait = ($last + $interval) - microtime(true);

        if ($wait > 0) {
            // The cast must wrap the WHOLE product, not just min(). `(int) min($wait, 30) * 1e6`
            // truncates the seconds first, so a 3.03 s wait slept 3.00 s and — worse at low rates —
            // a computed 1.97 s wait slept 1.00 s. Every request was up to a second faster than
            // configured, i.e. roughly double the intended rate at rps 0.5.
            //
            // Invisible at a handful of requests. Across a 61,500-product catalogue run it is the
            // difference between the pace we promised a host and the pace we actually took.
            usleep((int) (min($wait, 30) * 1_000_000));
        }

        Cache::put($key, microtime(true), (int) ceil($interval) + 60);
    }

    private function breakerIsOpen(string $host): bool
    {
        return (bool) Cache::get("enrichment:breaker:{$host}");
    }

    private function recordFailure(string $host, int $status): void
    {
        $key = "enrichment:failures:{$host}";
        $failures = (int) Cache::get($key, 0) + 1;
        Cache::put($key, $failures, 3600);

        if ($failures >= (int) config('enrichment.fetch.circuit_breaker_failures', 5)) {
            $cooldown = (int) config('enrichment.fetch.circuit_breaker_cooldown_seconds', 1800);
            Cache::put("enrichment:breaker:{$host}", true, $cooldown);
            Cache::forget($key);

            // Deliberately loud. This is the host telling us to stop, and the correct response is
            // to stop and look at why — not to find a way around it.
            Log::warning('[PoliteFetcher] circuit breaker opened', [
                'host' => $host,
                'last_status' => $status,
                'cooldown_seconds' => $cooldown,
            ]);
        }
    }

    private function clearFailures(string $host): void
    {
        Cache::forget("enrichment:failures:{$host}");
    }

    private function host(string $url): ?string
    {
        $host = parse_url($url, PHP_URL_HOST);

        return is_string($host) ? strtolower(preg_replace('/^www\./', '', $host) ?? $host) : null;
    }
}
