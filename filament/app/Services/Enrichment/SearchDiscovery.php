<?php

namespace App\Services\Enrichment;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Find the pages on the open web that describe one of our products.
 *
 * ── THE BARCODE IS THE QUERY ──────────────────────────────────────────────────────────────
 * Measured against the live catalogue: searching the barcode "5903246226645" returned the
 * manufacturer's own site, three independent retailers, AND our own product page — which is itself
 * the confirmation that the code identifies the right item. Searching the same product by name
 * ("Ostrovit Vitamin C 110 tabletek") returned nothing usable.
 *
 * A barcode is a globally unique string that only ever appears next to one product. A product name
 * is ambiguous by construction: "Vitamin C 110 tablets" belongs to a dozen brands, and "Gold
 * Standard Whey" exists in several formulations. So barcode queries run first and their results are
 * trusted; name queries are a fallback whose results are treated as leads.
 *
 * ── AND THE BARCODE CAN COME BACK OUT ─────────────────────────────────────────────────────
 * The reverse also works. Eurofit — a retailer nobody planned for — publishes gtin13 in its
 * JSON-LD, so a name search can RECOVER a barcode we never had. When two independent hosts agree
 * on the same code for the same product, that is real evidence, and it is proposed to a human
 * rather than being taken on trust. Every barcode recovered this way is one less tub someone has
 * to find in the warehouse.
 */
class SearchDiscovery
{
    public function __construct(private PoliteFetcher $fetcher) {}

    /**
     * Candidate URLs for a product, best first.
     *
     * @return list<array{url:string, host:string, query:string, trust:float, via:string}>
     */
    public function discover(string $productName, ?string $brand = null, ?string $gtin = null): array
    {
        $queries = [];

        if ($gtin !== null && $gtin !== '') {
            // Unambiguous. Nothing else on the web carries this string by coincidence.
            $queries[] = ['q' => $gtin, 'via' => 'gtin'];
            $queries[] = ['q' => '"'.$gtin.'"'.($brand ? ' '.$brand : ''), 'via' => 'gtin'];
        }

        $name = trim(($brand ? $brand.' ' : '').$productName);
        if ($name !== '') {
            $queries[] = ['q' => $name, 'via' => 'name'];
        }

        $seen = [];
        $results = [];
        $ignored = array_map('strtolower', (array) config('enrichment.discovery.ignore_hosts', []));

        foreach ($queries as $query) {
            foreach ($this->search($query['q']) as $url) {
                $host = $this->host($url);
                if ($host === null || isset($seen[$url])) {
                    continue;
                }

                // Our own site is in these results, and re-reading our own thin page to enrich it
                // would be a closed loop that adds nothing.
                foreach ($ignored as $skip) {
                    if ($host === $skip || str_ends_with($host, '.'.$skip)) {
                        continue 2;
                    }
                }

                $seen[$url] = true;
                $policy = $this->fetcher->policy($host);

                $results[] = [
                    'url' => $url,
                    'host' => $host,
                    'query' => $query['q'],
                    // A barcode hit on a known manufacturer outranks a name hit on a host we have
                    // never heard of, and the ordering decides what gets fetched within budget.
                    'trust' => (float) $policy['trust'] * ($query['via'] === 'gtin' ? 1.0 : 0.75),
                    'via' => $query['via'],
                ];
            }

            // A confident barcode hit on a manufacturer makes further queries unnecessary; every
            // extra search is a request against a rate limit we would rather spend elsewhere.
            if ($query['via'] === 'gtin' && $this->hasStrongHit($results)) {
                break;
            }
        }

        usort($results, static fn (array $a, array $b): int => $b['trust'] <=> $a['trust']);

        return $results;
    }

    /** @return list<string> */
    public function search(string $query): array
    {
        // Search results for a given query barely change day to day, and every repeat costs a
        // request against a limiter that is the scarcest resource in this pipeline.
        return Cache::remember(
            'enrichment:search:'.md5($query),
            86400 * 7,
            function () use ($query): array {
                foreach ((array) config('enrichment.discovery.providers', []) as $provider) {
                    $results = match ($provider) {
                        'google_cse' => $this->googleCse($query),
                        'brave_api' => $this->braveApi($query),
                        'brave_html' => $this->braveHtml($query),
                        'duckduckgo' => $this->duckDuckGo($query),
                        default => [],
                    };

                    if ($results !== []) {
                        return $results;
                    }
                }

                return [];
            }
        );
    }

    /**
     * Google Programmable Search — a supported, keyed API rather than a scraped results page, so it
     * does not break when a layout changes. 100 queries/day free.
     *
     * @return list<string>
     */
    private function googleCse(string $query): array
    {
        $key = config('enrichment.discovery.google_cse.key');
        $cx = config('enrichment.discovery.google_cse.cx');

        if (blank($key) || blank($cx)) {
            return [];
        }

        try {
            $response = Http::timeout(15)->get('https://www.googleapis.com/customsearch/v1', [
                'key' => $key,
                'cx' => $cx,
                'q' => $query,
                'num' => min(10, (int) config('enrichment.discovery.max_results_per_query', 10)),
            ]);

            if (! $response->successful()) {
                // 429 here means the daily quota is spent — normal, not an error worth shouting about.
                Log::info('[SearchDiscovery] Google CSE unavailable', ['status' => $response->status()]);

                return [];
            }

            return array_values(array_filter(array_map(
                static fn (array $item): ?string => is_string($item['link'] ?? null) ? $item['link'] : null,
                (array) $response->json('items', [])
            )));
        } catch (\Throwable $e) {
            Log::info('[SearchDiscovery] Google CSE failed', ['error' => $e->getMessage()]);

            return [];
        }
    }

    /**
     * Brave Search API — 2,000 queries/month free, and the best-behaved of the keyed options for
     * this workload.
     *
     * @return list<string>
     */
    private function braveApi(string $query): array
    {
        $key = config('enrichment.discovery.brave_api.key');
        if (blank($key)) {
            return [];
        }

        try {
            $response = Http::withHeaders([
                'X-Subscription-Token' => (string) $key,
                'Accept' => 'application/json',
            ])->timeout(15)->get('https://api.search.brave.com/res/v1/web/search', [
                'q' => $query,
                'count' => min(20, (int) config('enrichment.discovery.max_results_per_query', 10)),
            ]);

            if (! $response->successful()) {
                return [];
            }

            return array_values(array_filter(array_map(
                static fn ($r): ?string => is_string($r['url'] ?? null) ? $r['url'] : null,
                (array) $response->json('web.results', [])
            )));
        } catch (\Throwable $e) {
            Log::info('[SearchDiscovery] Brave API failed', ['error' => $e->getMessage()]);

            return [];
        }
    }

    /**
     * Brave's public results page. Keyless fallback; measured as the only one of the keyless
     * options that returns usable hosts for a barcode query.
     *
     * @return list<string>
     */
    private function braveHtml(string $query): array
    {
        $this->space('brave', (int) config('enrichment.discovery.brave_html.min_interval_seconds', 3));

        try {
            $response = Http::withHeaders([
                'User-Agent' => (string) config('enrichment.fetch.user_agent'),
                'Accept' => 'text/html',
            ])->timeout(20)->get('https://search.brave.com/search', ['q' => $query]);

            if (! $response->successful()) {
                return [];
            }

            preg_match_all('~href="(https?://[^"]+)"~i', (string) $response->body(), $m);

            $urls = [];
            $seenHosts = [];
            foreach ($m[1] ?? [] as $href) {
                $host = parse_url($href, PHP_URL_HOST);
                if (! is_string($host)) {
                    continue;
                }
                $host = strtolower(preg_replace('/^www\./', '', $host) ?? $host);

                // The results page links to itself and to assets; and one result per host is
                // plenty, since a second page from the same shop repeats the same facts.
                if (str_contains($host, 'brave.') || preg_match('~\.(png|jpe?g|svg|css|js|ico|woff2?)($|\?)~i', $href)) {
                    continue;
                }
                if (isset($seenHosts[$host])) {
                    continue;
                }
                $seenHosts[$host] = true;
                $urls[] = $href;
            }

            return array_slice($urls, 0, (int) config('enrichment.discovery.max_results_per_query', 10));
        } catch (\Throwable $e) {
            Log::info('[SearchDiscovery] Brave HTML failed', ['error' => $e->getMessage()]);

            return [];
        }
    }

    /**
     * DuckDuckGo's HTML endpoint. Last resort: it works for about two queries, then answers "202
     * with zero results" and keeps doing so — observed on the third consecutive query, and again
     * across a whole five-product run where every query came back empty.
     *
     * @return list<string>
     */
    private function duckDuckGo(string $query): array
    {
        $this->space('ddg', (int) config('enrichment.discovery.duckduckgo.min_interval_seconds', 4));
        try {
            $response = Http::asForm()
                ->withHeaders([
                    'User-Agent' => (string) config('enrichment.fetch.user_agent'),
                    'Accept' => 'text/html',
                ])
                ->timeout(20)
                ->post('https://html.duckduckgo.com/html/', ['q' => $query]);

            if (! $response->successful()) {
                return [];
            }

            preg_match_all('~<a[^>]+class="result__a"[^>]*href="([^"]+)"~i', (string) $response->body(), $m);

            $urls = [];
            foreach ($m[1] ?? [] as $href) {
                // Results are wrapped in a redirector: /l/?uddg=<encoded target>
                if (preg_match('~[?&]uddg=([^&]+)~', $href, $u)) {
                    $href = urldecode($u[1]);
                }
                if (str_starts_with($href, 'http')) {
                    $urls[] = $href;
                }
            }

            return array_slice(array_values(array_unique($urls)),
                0, (int) config('enrichment.discovery.max_results_per_query', 10));
        } catch (\Throwable $e) {
            Log::info('[SearchDiscovery] DuckDuckGo failed', ['error' => $e->getMessage()]);

            return [];
        }
    }

    /**
     * Keep consecutive queries to one provider apart. Cache-backed rather than a local property so
     * parallel queue workers share the interval instead of each keeping a private idea of it and
     * collectively arriving at once — which is how a keyless provider starts refusing us.
     */
    private function space(string $provider, int $seconds): void
    {
        $key = "enrichment:search-pace:{$provider}";
        $last = (float) (Cache::get($key) ?? 0);
        $wait = ($last + $seconds) - microtime(true);

        if ($wait > 0) {
            usleep((int) (min($wait, 30) * 1_000_000));
        }

        Cache::put($key, microtime(true), $seconds + 60);
    }

    /** @param list<array{trust:float, via:string}> $results */
    private function hasStrongHit(array $results): bool
    {
        foreach ($results as $result) {
            if ($result['via'] === 'gtin' && $result['trust'] >= 0.9) {
                return true;
            }
        }

        return false;
    }

    private function host(string $url): ?string
    {
        $host = parse_url($url, PHP_URL_HOST);

        return is_string($host) ? strtolower(preg_replace('/^www\./', '', $host) ?? $host) : null;
    }
}
