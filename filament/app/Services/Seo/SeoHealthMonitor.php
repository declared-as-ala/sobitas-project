<?php

namespace App\Services\Seo;

use App\Models\Product;
use App\Models\Review;
use App\Support\Seo\ProductPublicUrl;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Automated watchdog for the SEO failures that are INVISIBLE without deliberately looking.
 *
 * Every serious problem the audit found had one thing in common: nothing broke. No exception, no
 * failing build, no log line. robots.txt quietly forbade Googlebot from fetching a single product
 * image; four pages named a competitor domain as their canonical; /pack-builder answered 200 to a
 * browser and 404 to Googlebot; category pages served crawlers a tenth of their content; every
 * product asserted a fabricated 4.6-star rating. Each one cost months of ranking and was found
 * only because someone fetched the site with a Googlebot user-agent and compared.
 *
 * This runs those same comparisons on a schedule so the next one is caught in a day, not a quarter.
 *
 * DESIGN NOTES
 *   - Fetches the PUBLIC site over HTTP, exactly as Google would, rather than introspecting the
 *     app. A check that shares assumptions with the code it audits cannot catch a wrong assumption.
 *   - Always compares Googlebot vs browser. Divergence between the two is this project's most
 *     recurrent bug class (five separate production incidents), and it is undetectable otherwise.
 *   - Compares against the PREVIOUS run, not just fixed thresholds — a sitemap that loses 200 URLs
 *     overnight is a catastrophe no absolute threshold would flag.
 *   - Read-only and fail-soft. A monitor that breaks a deploy or a queue worker is worse than the
 *     bug it watches for.
 */
class SeoHealthMonitor
{
    public const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
    public const HUMAN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    /** How many sitemap URLs to fetch per run. Enough to be representative, small enough to be cheap. */
    private const SAMPLE_SIZE = 25;

    private string $site;

    public function __construct()
    {
        $this->site = StorefrontUrl::base();
    }

    /**
     * Run every check. Returns a list of result arrays; never throws.
     *
     * @return list<array{check:string,status:string,summary:string,value:?int,details:array}>
     */
    public function run(): array
    {
        $results = [];

        foreach ([
            'sitemapHealth',
            'sampledUrlHealth',
            'botHumanParity',
            'imageCrawlability',
            'reviewSchemaIntegrity',
            'metadataCompleteness',
        ] as $check) {
            try {
                $results[] = $this->{$check}();
            } catch (\Throwable $e) {
                $results[] = $this->result($check, 'warn', 'check errored: ' . $e->getMessage());
                Log::warning('SeoHealthMonitor check failed', ['check' => $check, 'error' => $e->getMessage()]);
            }
        }

        return $results;
    }

    /** /sitemap.xml is an index; every child must be reachable and the total must not collapse. */
    private function sitemapHealth(): array
    {
        $index = $this->fetch("{$this->site}/sitemap.xml", self::BOT_UA);
        if ($index === null) {
            return $this->result('sitemap_health', 'fail', 'sitemap.xml unreachable');
        }

        preg_match_all('#<loc>([^<]+)</loc>#', $index, $m);
        $children = $m[1] ?? [];
        if ($children === []) {
            return $this->result('sitemap_health', 'fail', 'sitemap index contains no children');
        }

        $total = 0;
        $broken = [];
        foreach ($children as $child) {
            $body = $this->fetch($child, self::BOT_UA);
            if ($body === null) {
                $broken[] = $child;
                continue;
            }
            $total += substr_count($body, '<loc>');
        }

        // Compare with the previous run: a sudden drop is the signal that matters.
        $previous = $this->previousValue('sitemap_health');
        $status = 'pass';
        $summary = "{$total} URLs across " . count($children) . ' child sitemaps';

        if ($broken !== []) {
            $status = 'fail';
            $summary .= '; ' . count($broken) . ' child sitemap(s) unreachable';
        } elseif ($previous !== null && $total < $previous * 0.9) {
            $status = 'fail';
            $summary .= " — DOWN from {$previous} (>10% drop)";
        }

        return $this->result('sitemap_health', $status, $summary, $total, [
            'children' => $children,
            'broken' => $broken,
            'previous' => $previous,
        ]);
    }

    /** Sampled sitemap URLs must answer 200 to Googlebot, be indexable, and self-canonicalise. */
    private function sampledUrlHealth(): array
    {
        $urls = $this->sampleSitemapUrls();
        if ($urls === []) {
            return $this->result('url_health', 'warn', 'no sitemap URLs to sample');
        }

        $problems = [];
        foreach ($urls as $url) {
            $body = $this->fetch($url, self::BOT_UA, $status);
            if ($status !== 200) {
                $problems[] = ['url' => $url, 'issue' => "HTTP {$status}"];
                continue;
            }
            if (preg_match('/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i', (string) $body)) {
                $problems[] = ['url' => $url, 'issue' => 'noindex while in sitemap'];
            }
            if (! preg_match('#<link[^>]+rel="canonical"[^>]+href="([^"]+)"#i', (string) $body, $c)) {
                $problems[] = ['url' => $url, 'issue' => 'missing canonical'];
                continue;
            }
            $host = parse_url($c[1], PHP_URL_HOST);
            if ($host && strtolower(preg_replace('/^www\./', '', $host)) !== StorefrontUrl::CANONICAL_HOST) {
                $problems[] = ['url' => $url, 'issue' => "off-domain canonical: {$c[1]}"];
            }
        }

        $status = $problems === [] ? 'pass' : 'fail';

        return $this->result(
            'url_health',
            $status,
            $problems === [] ? count($urls) . ' sampled URLs healthy' : count($problems) . ' of ' . count($urls) . ' sampled URLs have problems',
            count($problems),
            ['problems' => $problems, 'sampled' => count($urls)]
        );
    }

    /**
     * The same URL must answer the same way to Googlebot and to a browser.
     *
     * Middleware rewrites crawler user-agents to a SEPARATE route implementation, and those two
     * implementations have drifted five times in production. Status and canonical must match
     * exactly; a large word-count gap means the crawler is being served a thinner page.
     */
    private function botHumanParity(): array
    {
        $urls = array_slice($this->sampleSitemapUrls(), 0, 10);
        $problems = [];

        foreach ($urls as $url) {
            $bot = $this->fetch($url, self::BOT_UA, $botStatus);
            $human = $this->fetch($url, self::HUMAN_UA, $humanStatus);

            if ($botStatus !== $humanStatus) {
                $problems[] = ['url' => $url, 'issue' => "status differs: bot {$botStatus} vs human {$humanStatus}"];
                continue;
            }
            if ($bot === null || $human === null) {
                continue;
            }

            $botCanonical = $this->canonicalOf($bot);
            $humanCanonical = $this->canonicalOf($human);
            if ($botCanonical !== $humanCanonical) {
                $problems[] = ['url' => $url, 'issue' => "canonical differs: bot {$botCanonical} vs human {$humanCanonical}"];
            }

            $botWords = $this->wordCount($bot);
            $humanWords = $this->wordCount($human);
            // Crawler view is intentionally leaner (no nav chrome), so only flag a big shortfall.
            if ($humanWords > 200 && $botWords < $humanWords * 0.35) {
                $problems[] = ['url' => $url, 'issue' => "crawler sees {$botWords} words vs {$humanWords} for a browser"];
            }
        }

        return $this->result(
            'bot_human_parity',
            $problems === [] ? 'pass' : 'fail',
            $problems === [] ? count($urls) . ' URLs match across user-agents' : count($problems) . ' divergence(s) found',
            count($problems),
            ['problems' => $problems]
        );
    }

    /**
     * Product images live on the admin host. Its robots.txt must keep allowing /storage/, and the
     * files must actually be fetchable. This exact combination was broken and cost ALL image search.
     */
    private function imageCrawlability(): array
    {
        $robots = $this->fetch('https://admin.protein.tn/robots.txt', self::BOT_UA);
        $problems = [];

        if ($robots === null) {
            $problems[] = 'admin robots.txt unreachable';
        } elseif (! preg_match('#^\s*Allow:\s*/storage/#mi', $robots)) {
            $problems[] = 'admin robots.txt no longer allows /storage/ — ALL product images are blocked from Google Images';
        }

        // Fetch a real product image AS Googlebot-Image. robots.txt allowing /storage/ is
        // necessary but not sufficient — the file itself has to be served.
        $product = Product::query()->where('publier', 1)->whereNotNull('cover')->first();
        if ($product) {
            $url = ProductPublicUrl::fromPath((string) $product->cover);
            if ($url) {
                $this->fetch($url, 'Googlebot-Image/1.0', $imgStatus);
                if ($imgStatus !== 200) {
                    $problems[] = "sample product image returned HTTP {$imgStatus}";
                }
            }
        }

        return $this->result(
            'image_crawlability',
            $problems === [] ? 'pass' : 'fail',
            $problems === [] ? 'product images crawlable' : implode('; ', $problems),
            count($problems),
            ['problems' => $problems]
        );
    }

    /**
     * No page may assert AggregateRating built from reviews with no purchase evidence.
     * Publishing fabricated review markup risks a manual action on the whole domain.
     */
    private function reviewSchemaIntegrity(): array
    {
        $unattested = Review::query()
            ->where('publier', 1)
            ->where(fn ($q) => $q->where('verified', '!=', 1)->orWhereNull('verified'))
            ->whereNull('commande_id')
            ->count();

        if ($unattested > 0) {
            return $this->result(
                'review_schema_integrity',
                'fail',
                "{$unattested} published review(s) have no purchase evidence — they must never reach structured data",
                $unattested,
                ['hint' => 'php artisan seo:audit-reviews']
            );
        }

        return $this->result('review_schema_integrity', 'pass', 'every published review is tied to a real order', 0);
    }

    /** Blank meta on indexable content — the self-healing defaults should keep this at zero. */
    private function metadataCompleteness(): array
    {
        $counts = [
            'products_without_meta_title' => DB::table('products')->where('publier', 1)
                ->where(fn ($q) => $q->whereNull('meta_title')->orWhere('meta_title', ''))->count(),
            'products_without_alt' => DB::table('products')->where('publier', 1)
                ->where(fn ($q) => $q->whereNull('alt_cover')->orWhere('alt_cover', ''))->count(),
        ];

        $total = array_sum($counts);

        return $this->result(
            'metadata_completeness',
            $total === 0 ? 'pass' : 'warn',
            $total === 0 ? 'all published products carry meta title and image alt' : "{$total} gap(s): " . json_encode($counts),
            $total,
            $counts
        );
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /** @return list<string> */
    private function sampleSitemapUrls(): array
    {
        $index = $this->fetch("{$this->site}/sitemap.xml", self::BOT_UA);
        if ($index === null) {
            return [];
        }
        preg_match_all('#<loc>([^<]+)</loc>#', $index, $m);

        $urls = [];
        foreach ($m[1] ?? [] as $child) {
            $body = $this->fetch($child, self::BOT_UA);
            if ($body === null) {
                continue;
            }
            preg_match_all('#<loc>([^<]+)</loc>#', $body, $inner);
            foreach ($inner[1] ?? [] as $u) {
                $urls[] = $u;
            }
        }

        if ($urls === []) {
            return [];
        }

        // Spread the sample across the whole list rather than taking the first N, which would only
        // ever test the static pages at the top of the first child sitemap.
        $step = max(1, intdiv(count($urls), self::SAMPLE_SIZE));
        $sample = [];
        for ($i = 0; $i < count($urls) && count($sample) < self::SAMPLE_SIZE; $i += $step) {
            $sample[] = $urls[$i];
        }

        return $sample;
    }

    private function fetch(string $url, string $userAgent, ?int &$status = null): ?string
    {
        try {
            $res = Http::withHeaders(['User-Agent' => $userAgent])
                ->timeout(15)
                ->connectTimeout(5)
                ->get($url);
            $status = $res->status();

            return $res->body();
        } catch (\Throwable $e) {
            $status = 0;

            return null;
        }
    }

    private function canonicalOf(string $html): ?string
    {
        return preg_match('#<link[^>]+rel="canonical"[^>]+href="([^"]+)"#i', $html, $m) ? $m[1] : null;
    }

    private function wordCount(string $html): int
    {
        $text = preg_replace('#<(script|style)[^>]*>.*?</\1>#is', ' ', $html) ?? $html;
        $text = preg_replace('/<[^>]+>/', ' ', $text) ?? $text;

        return count(preg_split('/\s+/', trim((string) $text), -1, PREG_SPLIT_NO_EMPTY) ?: []);
    }

    /** The numeric value this check produced on its previous run, for trend comparison. */
    private function previousValue(string $check): ?int
    {
        $row = DB::table('seo_health_checks')
            ->where('check', $check)
            ->orderByDesc('id')
            ->first();

        return $row && $row->value !== null ? (int) $row->value : null;
    }

    private function result(string $check, string $status, string $summary, ?int $value = null, array $details = []): array
    {
        return [
            'check' => $check,
            'status' => $status,
            'summary' => mb_substr($summary, 0, 500),
            'value' => $value,
            'details' => $details,
        ];
    }
}
