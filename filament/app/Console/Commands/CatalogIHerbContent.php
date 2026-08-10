<?php

namespace App\Console\Commands;

use App\Jobs\ExtractExternalProductContentJob;
use App\Models\ExternalCatalogProduct;
use App\Services\Catalog\IHerb\IHerbClient;
use App\Services\Catalog\IHerb\IHerbPageExtractor;
use App\Services\Catalog\ImportedSourceContent;
use App\Services\Enrichment\PoliteFetcher;
use Illuminate\Console\Command;

/**
 * Read the product PAGES. The pass that turns a catalogue card into a page worth indexing.
 *
 * ── WHY THIS IS A SECOND PASS AND NOT PART OF HYDRATION ───────────────────────────────────
 * Hydration is 600 bytes of JSON per product; this is ~2 MB of HTML. Folding them together would
 * mean one failure mode ("iHerb changed the page markup") stalling the pass that only ever needed
 * the identity record, and it would make the ~1,000 rows already hydrated ineligible for content
 * without re-fetching their JSON. Two passes, two state columns, two independent things to resume.
 *
 * ── DISPATCHES A WINDOW AND STOPS, LIKE catalog:iherb:hydrate ─────────────────────────────
 * The database stays authoritative: the queue holds at most `batch` items and everything else is
 * rows in a state, which survives a queue flush, a Redis restart and a worker crash equally.
 * Re-running refills the window. That is the whole of the resume logic, and it is why this is safe
 * to kill at any moment — a row mid-flight is `fetching`, and `--reset-stuck` returns it.
 *
 * ── PACING IS PoliteFetcher'S, AND NOW GENUINELY SHARED ───────────────────────────────────
 * This command adds no throttle of its own. It does introduce a second iHerb hostname though —
 * `fr.iherb.com` for the page, against `tn.iherb.com` for the identity JSON — and per-HOSTNAME
 * token buckets would have given each of them the full 1.5 req/s, i.e. 3 req/s at iHerb. That is
 * why PoliteFetcher now paces on the CONFIGURED HOST PATTERN rather than the hostname: one
 * operator, one bucket, one breaker. Running this pass and hydration in the same hour is therefore
 * safe, and slower, which is the correct trade.
 */
class CatalogIHerbContent extends Command
{
    protected $signature = 'catalog:iherb:content
                            {--limit= : How many product pages to dispatch (default: catalog.content.batch)}
                            {--include-filtered : Also read pages for rows filtered out on category}
                            {--retry-failed : Return transient failures to the queue and stop}
                            {--reset-stuck= : Return rows stuck in `fetching` for N+ minutes to the queue}
                            {--rederive : Recompute what CAN be recomputed with no HTTP (see --help output)}
                            {--refetch= : Re-queue N already-read rows for a fresh crawl. Costs requests}
                            {--allow-unpublishable-locale : Read pages anyway when the configured host serves a language ImportedSourceContent will never publish}
                            {--status : Print the state of the content pass and exit}';

    protected $description = 'Fetch iHerb product pages and transcribe their real content';

    public function handle(): int
    {
        if ($this->option('status')) {
            return $this->printStatus();
        }

        if (! config('catalog.enabled', true)) {
            $this->error('catalog.enabled is false — set CATALOG_IMPORT_ENABLED=true to run this.');

            return self::FAILURE;
        }

        if ($this->option('retry-failed')) {
            return $this->retryFailed();
        }

        if ($this->option('reset-stuck') !== null) {
            return $this->resetStuck((int) $this->option('reset-stuck'));
        }

        if ($this->option('rederive')) {
            return $this->rederive();
        }

        if ($this->option('refetch') !== null) {
            return $this->refetch((int) $this->option('refetch'));
        }

        if (! $this->localeIsPublishable()) {
            return self::FAILURE;
        }

        $limit = (int) ($this->option('limit') ?: config('catalog.content.batch', 900));

        $ids = ExternalCatalogProduct::query()
            ->awaitingContent((bool) $this->option('include-filtered'))
            ->limit($limit)
            ->pluck('id');

        if ($ids->isEmpty()) {
            // Not a failure. A scheduler hitting this every ten minutes finds nothing far more often
            // than it finds work, and an empty window must not look like a broken pass.
            $this->info('No product pages awaiting extraction.');

            return self::SUCCESS;
        }

        foreach ($ids as $id) {
            ExtractExternalProductContentJob::dispatch((int) $id);
        }

        $this->info(sprintf(
            'Dispatched %s page extraction job(s) against %s.',
            number_format($ids->count()),
            IHerbClient::contentHost(),
        ));

        $this->line(sprintf('  %s', $this->paceLine($ids->count())));

        return self::SUCCESS;
    }

    /**
     * Will anything this pass reads ever reach a page? Answered BEFORE spending the crawl.
     *
     * ── THE FAILURE THIS EXISTS TO MAKE IMPOSSIBLE ────────────────────────────────────────
     * Two documents in this repo disagreed, and nothing compared them. config/catalog.php offers
     * `ca.iherb.com` as an owner-level choice ("the manufacturer's exact words, in English"), while
     * ImportedSourceContent::publishable() refuses every locale that is not
     * ImportedSourceContent::PUBLISHABLE_LANGUAGE. Choose the English host — or simply let
     * fr.iherb.com geo-redirect a Tunisian VPS to tn.iherb.com, which serves Arabic — and the pass
     * works perfectly: pages return 200, the extractor fills every column, `unmapped_sections` stays
     * EMPTY (Arabic and English headings ARE in IHerbPageExtractor::HEADINGS, so the only existing
     * warning never fires), `source_content_word_count` is summed into the "N words transcribed"
     * success line, and every single row publishes nothing at all. At 47,537 rows that is ~9 hours
     * of crawling and ~95 GB of transfer for zero publishable bytes, with every status surface
     * reporting success.
     *
     * ── HOW IT DECIDES, AND WHY IT PREFERS MEASUREMENT TO THE HOSTNAME ────────────────────
     * A hostname is not a language: `fr.iherb.com` is a request, and the response is the fact. So
     * when rows have already been read, the answer comes from `source_content_locale` — what the
     * pages actually said — and only when nothing has been read yet does it fall back to comparing
     * the configured host against the default. Both paths refuse rather than warn: a warning in a
     * scheduled command is a line nobody reads, and the cost here is hours of somebody's crawl
     * budget. `--allow-unpublishable-locale` is the way to say "I know, read them anyway" — the
     * columns are stored either way and `catalog:iherb:content --refetch` can re-read them later
     * from a host that does serve French.
     */
    private function localeIsPublishable(): bool
    {
        $language = ImportedSourceContent::PUBLISHABLE_LANGUAGE;
        $host = IHerbClient::contentHost();

        $locales = ExternalCatalogProduct::query()
            ->whereNotNull('source_content_locale')
            ->where('source_content_status', ExternalCatalogProduct::CONTENT_EXTRACTED)
            ->selectRaw('source_content_locale as locale, COUNT(*) as n')
            ->groupBy('source_content_locale')
            ->pluck('n', 'locale');

        $publishable = 0;
        $refused = [];
        foreach ($locales as $locale => $n) {
            if (ImportedSourceContent::publishable(['source_content_locale' => $locale])) {
                $publishable += (int) $n;

                continue;
            }
            $refused[(string) $locale] = (int) $n;
        }

        $refusedTotal = array_sum($refused);

        // Enough evidence to be a fact rather than one odd row: every page read so far is in a
        // language the storefront will not print.
        $measuredFailure = $publishable === 0 && $refusedTotal >= 20;
        // Nothing read yet — the only thing there is to check is the host somebody configured.
        $unreadFailure = $locales->isEmpty() && ! str_starts_with(strtolower($host), $language.'.');

        if (! $measuredFailure && ! $unreadFailure) {
            if ($refusedTotal > 0) {
                $this->warn(sprintf(
                    '%s already-read row(s) are in a language this storefront does not publish (%s) and render '
                    .'NOTHING: %s. Re-read them from a %s host with --refetch.',
                    number_format($refusedTotal),
                    $language,
                    json_encode($refused, JSON_UNESCAPED_UNICODE),
                    $language,
                ));
            }

            return true;
        }

        $allowed = (bool) $this->option('allow-unpublishable-locale');

        $this->{$allowed ? 'warn' : 'error'}(sprintf(
            'The configured content host (%s) does not produce text this storefront can publish. %s',
            $host,
            $measuredFailure
                ? sprintf(
                    'Measured: %s page(s) already read, %s of them in a publishable language — the stored locales are %s.',
                    number_format($refusedTotal),
                    number_format($publishable),
                    json_encode($refused, JSON_UNESCAPED_UNICODE),
                )
                : sprintf('Nothing has been read yet, and the host is not a "%s." host.', $language),
        ));

        $this->line(sprintf(
            '  ImportedSourceContent::publishable() refuses every locale that is not "%s": no sections, no '
            .'Supplement Facts panel, no gallery, no specification rows and no attribution reach either product '
            .'route, and the indexing gate does not move. The pass would spend hours of crawl budget storing '
            .'columns nothing renders.',
            $language,
        ));
        $this->line($allowed
            ? '  --allow-unpublishable-locale was given: reading them anyway. The columns are stored and '
                .'--refetch can re-read them from a French host later.'
            : '  Set CATALOG_IHERB_CONTENT_HOST to a French host (default: fr.iherb.com), or pass '
                .'--allow-unpublishable-locale to read the pages anyway and decide later.');

        return $allowed;
    }

    /**
     * How long a given number of pages takes, at the rate the fetcher actually enforces.
     *
     * The rate is READ from PoliteFetcher's policy, never written into the arithmetic here. Two
     * commands in this codebase have already printed an estimate wrong by 2.5x because a literal in
     * a format string disagreed with config/enrichment.php, in a line an operator uses to decide
     * whether to wait or go to lunch.
     */
    private function paceLine(int $rows): string
    {
        $rps = $this->rate();

        if ($rps <= 0) {
            return 'the configured rate is zero — nothing will move.';
        }

        $hours = $rows / $rps / 3600;

        return sprintf(
            'At the configured %s req/s that is about %s of queue-worker time.',
            rtrim(rtrim(number_format($rps, 2, '.', ''), '0'), '.'),
            $hours < 1 ? round($hours * 60).' minutes' : round($hours, 1).' hours',
        );
    }

    private function rate(): float
    {
        return (float) (app(PoliteFetcher::class)->policy('iherb.com')['rps']
            ?? config('enrichment.fetch.default_requests_per_second', 0.33));
    }

    /**
     * Re-derive everything that CAN be re-derived without asking iHerb again.
     *
     * ── AND SAY OUT LOUD WHAT CANNOT ──────────────────────────────────────────────────────
     * `catalog:iherb:hydrate --renormalize` can rebuild every derived column from `source_payload`
     * because the whole JSON response is on the row. There is no equivalent here and there cannot
     * be: the HTML is ~2 MB a page and 47,537 of them is ~95 GB against ~43 GB free, so the document
     * is discarded by design.
     *
     * What this recomputes is therefore exactly the fields that are functions of the STORED HTML —
     * today the word count. A fix to how a SECTION is located, or to which sections exist, changes
     * the stored HTML itself and needs the page again. `--refetch` is that, and it prints the bill
     * first. Anything else would be implying a recovery path that does not exist.
     */
    private function rederive(): int
    {
        $changed = 0;
        $scanned = 0;

        ExternalCatalogProduct::query()
            ->whereNotNull('source_content_status')
            ->orderBy('id')
            // chunkById, not chunk(): this loop writes to the rows it pages over.
            ->chunkById(200, function ($rows) use (&$changed, &$scanned): void {
                foreach ($rows as $row) {
                    $scanned++;

                    $row->forceFill([
                        'source_content_word_count' => IHerbPageExtractor::wordCount([
                            $row->source_overview_html,
                            $row->source_suggested_use_html,
                            $row->source_other_ingredients_html,
                            $row->source_warnings_html,
                            $row->source_supplement_facts_html,
                        ]),
                    ]);

                    if ($row->isDirty()) {
                        $row->save();
                        $changed++;
                    }
                }
            });

        $this->info(sprintf(
            '%s of %s row(s) re-derived from their stored HTML. No HTTP requests were made.',
            number_format($changed),
            number_format($scanned),
        ));

        $this->warn(
            'This recomputes only fields that are a function of the STORED sections — the word count. '
            .'The page itself was NOT kept (~2 MB x 47,537 = ~95 GB against ~43 GB free), so a fix to '
            .'the extractor\'s section-finding cannot be replayed for free the way '
            .'`catalog:iherb:hydrate --renormalize` replays a normaliser fix. Use --refetch for that, '
            .'and read the cost it prints.'
        );

        return self::SUCCESS;
    }

    /** Re-queue rows that have already been read, after telling the operator what it costs. */
    private function refetch(int $limit): int
    {
        $limit = max(0, $limit);

        if ($limit === 0) {
            $this->error('--refetch needs a row count. There is no "all" here on purpose: re-reading '
                .'the whole catalogue is hours of crawling and should be a number somebody chose.');

            return self::FAILURE;
        }

        $ids = ExternalCatalogProduct::query()
            ->whereIn('source_content_status', [
                ExternalCatalogProduct::CONTENT_EXTRACTED,
                ExternalCatalogProduct::CONTENT_EMPTY,
            ])
            ->orderBy('source_content_fetched_at')
            ->limit($limit)
            ->pluck('id');

        if ($ids->isEmpty()) {
            $this->info('No already-read rows to re-fetch.');

            return self::SUCCESS;
        }

        /*
         * THE BILL IS PRINTED BEFORE THE ROWS MOVE, which is what the option's own docblock promises
         * ("--refetch is that, and it prints the bill first"). It used to run the UPDATE first: an
         * operator who typed --refetch=20000, read "about 3.7 hours" and hit Ctrl-C had already had
         * 20,000 rows moved to `queued`, and the scheduled pass picks those up on its next tick.
         * There is no confirmation prompt here, so the ordering is the only thing that makes reading
         * the cost meaningful.
         */
        $this->line(sprintf('%s row(s) will be returned to the content queue.', number_format($ids->count())));
        $this->line('  '.$this->paceLine($ids->count()));
        $this->line('  Each one is a fresh ~2 MB HTTP request. There is no cheaper path: the HTML was not kept.');

        // Oldest first, so a partial re-crawl refreshes the stalest transcriptions rather than a
        // random slice — and so running it repeatedly walks the catalogue instead of the same head.
        ExternalCatalogProduct::whereIn('id', $ids)->update([
            'source_content_status' => ExternalCatalogProduct::CONTENT_QUEUED,
            'source_content_attempts' => 0,
            'source_content_reason' => 're-queued for a fresh crawl',
            'updated_at' => now(),
        ]);

        $this->info(sprintf('%s row(s) queued.', number_format($ids->count())));

        return self::SUCCESS;
    }

    /** Only transient failures. A 404 will be a 404 tomorrow, and `blocked` is not a failure at all. */
    private function retryFailed(): int
    {
        $reset = ExternalCatalogProduct::where('source_content_status', ExternalCatalogProduct::CONTENT_FAILED)
            ->where('source_content_reason', 'like', '%transient%')
            ->update([
                'source_content_status' => ExternalCatalogProduct::CONTENT_QUEUED,
                'source_content_attempts' => 0,
                'source_content_reason' => null,
                'updated_at' => now(),
            ]);

        $permanent = ExternalCatalogProduct::where('source_content_status', ExternalCatalogProduct::CONTENT_FAILED)->count();
        $blocked = ExternalCatalogProduct::where('source_content_status', ExternalCatalogProduct::CONTENT_BLOCKED)->count();

        $this->info(sprintf('%s transient failure(s) returned to the queue.', number_format($reset)));
        $this->line(sprintf('  %s row(s) remain permanently failed (404/410/422) and were left alone.', number_format($permanent)));
        $this->line(sprintf(
            '  %s row(s) are `blocked` — robots.txt forbids their URL. Those are NOT retried, ever.',
            number_format($blocked),
        ));

        return self::SUCCESS;
    }

    /** Reclaim rows claimed by a worker that then died. Same reasoning as the hydration command. */
    private function resetStuck(int $minutes): int
    {
        $minutes = max(1, $minutes);

        $reset = ExternalCatalogProduct::where('source_content_status', ExternalCatalogProduct::CONTENT_FETCHING)
            ->where('updated_at', '<', now()->subMinutes($minutes))
            ->update([
                'source_content_status' => ExternalCatalogProduct::CONTENT_QUEUED,
                'source_content_reason' => 'reclaimed: worker died mid-fetch',
                'updated_at' => now(),
            ]);

        $this->info(sprintf(
            '%s row(s) stuck in "fetching" for over %d minute(s) returned to the queue.',
            number_format($reset),
            $minutes,
        ));

        return self::SUCCESS;
    }

    /** Progress as counted rows, plus the two numbers that say whether it is working. */
    private function printStatus(): int
    {
        // A bound parameter, not a double-quoted literal: with ANSI_QUOTES enabled MySQL reads
        // "not read" as an IDENTIFIER, and the whole status table becomes an "unknown column" error.
        $counts = ExternalCatalogProduct::query()
            ->selectRaw('COALESCE(source_content_status, ?) as s, COUNT(*) as n', ['not read'])
            ->groupBy('s')
            ->pluck('n', 's');

        $eligible = ExternalCatalogProduct::query()->awaitingContent()->count();

        $order = [
            'not read' => 'never attempted',
            ExternalCatalogProduct::CONTENT_QUEUED => 'awaiting a page fetch',
            ExternalCatalogProduct::CONTENT_FETCHING => 'in flight',
            ExternalCatalogProduct::CONTENT_EXTRACTED => 'content transcribed',
            ExternalCatalogProduct::CONTENT_EMPTY => 'page had no transcribable section',
            ExternalCatalogProduct::CONTENT_BLOCKED => 'robots.txt forbids the URL (permanent)',
            ExternalCatalogProduct::CONTENT_FAILED => 'failed',
        ];

        $rows = [];
        foreach ($order as $status => $label) {
            $rows[] = [$status, $label, number_format((int) ($counts[$status] ?? 0))];
        }

        $this->table(['content status', 'meaning', 'rows'], $rows);

        // What the pass is actually FOR. A run that transcribes 900 pages and adds no words is a
        // run that did nothing, and a row count cannot show that.
        $extracted = (int) ($counts[ExternalCatalogProduct::CONTENT_EXTRACTED] ?? 0);
        if ($extracted > 0) {
            $words = (int) ExternalCatalogProduct::where('source_content_status', ExternalCatalogProduct::CONTENT_EXTRACTED)
                ->sum('source_content_word_count');
            $withFacts = ExternalCatalogProduct::whereNotNull('source_supplement_facts_html')->count();
            $withGtin = ExternalCatalogProduct::whereNotNull('source_gtin')->count();

            $this->line(sprintf(
                '  %s words transcribed across %s pages (%s median-ish per page) · %s carry a Supplement Facts panel · %s carry a valid barcode.',
                number_format($words),
                number_format($extracted),
                number_format((int) round($words / max(1, $extracted))),
                number_format($withFacts),
                number_format($withGtin),
            ));

            /*
             * TRANSCRIBED IS NOT THE SAME STATEMENT AS PUBLISHABLE, and the line above cannot tell
             * them apart. ImportedSourceContent::publishable() refuses every locale that is not
             * French, so a pass run against ca.iherb.com (English) or against tn.iherb.com (what a
             * Tunisian IP is redirected to, Arabic) fills every column, counts every word here, and
             * renders NOTHING on either product route. Nothing else in this command would say so:
             * `unmapped_sections` stays empty, because those two locales' headings are known.
             */
            $unpublishable = 0;
            $byLocale = ExternalCatalogProduct::query()
                ->where('source_content_status', ExternalCatalogProduct::CONTENT_EXTRACTED)
                ->selectRaw('source_content_locale as locale, COUNT(*) as n')
                ->groupBy('source_content_locale')
                ->pluck('n', 'locale');

            $refused = [];
            foreach ($byLocale as $locale => $n) {
                if (ImportedSourceContent::publishable(['source_content_locale' => $locale])) {
                    continue;
                }
                $refused[(string) ($locale ?: 'null')] = (int) $n;
                $unpublishable += (int) $n;
            }

            $this->line(sprintf(
                '  %s of those pages are in a language this storefront publishes (%s); %s render nothing at all.',
                number_format($extracted - $unpublishable),
                ImportedSourceContent::PUBLISHABLE_LANGUAGE,
                number_format($unpublishable),
            ));

            if ($unpublishable > 0) {
                $this->warn(sprintf(
                    '%s row(s) were read in a locale that publishes nothing: %s. Their sections, panel, gallery '
                    .'and specs are stored and rendered NOWHERE, and the indexing gate cannot move for them. '
                    .'Point CATALOG_IHERB_CONTENT_HOST at a French host and re-read them with --refetch.',
                    number_format($unpublishable),
                    json_encode($refused, JSON_UNESCAPED_UNICODE),
                ));
            }
        }

        // The one thing that would make this pass silently useless: a locale whose section headings
        // the extractor does not know. Two fields would be NULL on every row and nothing else would
        // say so.
        // JSON_LENGTH rather than a string comparison against '[]': the column is json, and whether
        // `!= '[]'` compares as JSON or as text depends on the driver's implicit cast. "Is this list
        // empty" is the question, so ask it.
        $unmapped = ExternalCatalogProduct::whereNotNull('source_content_unmapped_sections')
            ->whereRaw('JSON_LENGTH(source_content_unmapped_sections) > 0')
            ->count();

        if ($unmapped > 0) {
            $sample = ExternalCatalogProduct::whereNotNull('source_content_unmapped_sections')
                ->whereRaw('JSON_LENGTH(source_content_unmapped_sections) > 0')
                ->value('source_content_unmapped_sections');

            $this->warn(sprintf(
                '%s row(s) carry sections the extractor could not classify, e.g. %s. Suggested use and '
                .'warnings are told apart by their HEADING TEXT, which differs in each of iHerb\'s 101 '
                .'locales — this is what that looks like when the configured host (%s) renders a locale '
                .'IHerbPageExtractor::HEADINGS does not list. Add the locale WITH A FIXTURE, or those '
                .'two fields stay NULL.',
                number_format($unmapped),
                json_encode($sample, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                IHerbClient::contentHost(),
            ));
        }

        if ($eligible > 0) {
            $this->line(sprintf('  %s row(s) eligible and not yet read. %s', number_format($eligible), $this->paceLine($eligible)));
        }

        $stuck = ExternalCatalogProduct::where('source_content_status', ExternalCatalogProduct::CONTENT_FETCHING)
            ->where('updated_at', '<', now()->subHour())
            ->count();

        if ($stuck > 0) {
            $this->warn(sprintf(
                '%s row(s) have been "fetching" for over an hour — a worker probably died. '
                .'Return them with --reset-stuck=60.',
                number_format($stuck),
            ));
        }

        return self::SUCCESS;
    }
}
