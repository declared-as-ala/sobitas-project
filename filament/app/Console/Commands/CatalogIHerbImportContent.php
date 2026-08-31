<?php

namespace App\Console\Commands;

use App\Models\ExternalCatalogProduct;
use App\Services\Catalog\IHerb\IHerbClient;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Load harvested product content into the staging table from a file, instead of over the network.
 *
 *     php artisan catalog:iherb:import-content
 *     php artisan catalog:iherb:import-content --dry-run
 *     php artisan catalog:iherb:import-content --file=database/catalog-content/iherb-content.jsonl.gz
 *
 * ── WHY THIS EXISTS, WHEN catalog:iherb:content ALREADY DOES THIS OVER HTTP ────────────────
 * Because on this deployment it does not. Measured against the live API on 11/08/2026, ten
 * consecutive imported products returned `source_facts.content = null`, and the staging columns
 * behind it (`source_overview_html`, `source_supplement_facts_html`, `source_gallery_images`) were
 * empty on every one. Hydration had clearly worked — those products have prices, covers and
 * subcategories — so the identity pass reaches iHerb from the server and the CONTENT pass does not.
 * The same pages fetch perfectly from a developer machine, which is what this file carries: the
 * extraction was performed elsewhere and only the result is imported here.
 *
 * It is deliberately NOT a replacement for catalog:iherb:content. That command stays scheduled and
 * remains the right mechanism the moment the server can read product pages again. This one exists so
 * that content already in hand can reach customers without waiting for that to be true, and it is
 * written to be safe to run repeatedly while both exist.
 *
 * ── WHAT IT WRITES, AND WHAT IT REFUSES TO ────────────────────────────────────────────────
 * Only `external_catalog_products`. No product row, no price, no stock, no publication state — the
 * staging table is the whole point of the architecture and this command does not leave it. The
 * customer-visible effect is immediate anyway and needs no promotion: ProductDetailResource builds
 * `source_facts.content` from the staging row LIVE on every request, so a row that gains a gallery
 * and a Supplement Facts panel renders them on the next page view. Only the overview folded into
 * `products.description_fr` waits for the promotion pass, which is already scheduled.
 *
 * ── THE LANGUAGE GATE IS APPLIED TWICE, ON PURPOSE ────────────────────────────────────────
 * ImportedSourceContent::publishable() admits French and nothing else, because iHerb serves the same
 * product in 101 locales and an Arabic paragraph on a French product page is the failure that gate
 * exists to prevent. The exporting side already filtered to `locale === "fr"`; this side checks
 * again and skips anything else. A file is an input like any other and is not trusted to have done
 * the right thing.
 *
 * ── IDEMPOTENT, AND HONEST ABOUT WHAT IT SKIPPED ──────────────────────────────────────────
 * A row that already carries an overview or a panel is left alone unless --overwrite is passed, so
 * re-running is free and this can never fight the HTTP pass for the same row. Rows whose id is not
 * in the staging table are counted and reported rather than created: this command imports CONTENT
 * for products discovery already knows about, and inventing staging rows from a file would be a
 * second, unaudited discovery path.
 */
class CatalogIHerbImportContent extends Command
{
    protected $signature = 'catalog:iherb:import-content
        {--file=database/catalog-content/iherb-content.jsonl.gz : JSONL (optionally gzipped) of harvested content}
        {--limit=0 : Stop after this many rows are written (0 = no limit)}
        {--overwrite : Replace content on rows that already have some}
        {--dry-run : Report what would change and write nothing}';

    protected $description = 'Import harvested iHerb product content (overview, Supplement Facts, gallery) into the staging table';

    public function handle(): int
    {
        $path = (string) $this->option('file');
        if (! str_starts_with($path, '/')) {
            $path = base_path($path);
        }

        if (! is_file($path)) {
            $this->error("File not found: {$path}");

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $overwrite = (bool) $this->option('overwrite');
        $limit = max(0, (int) $this->option('limit'));
        $gzipped = str_ends_with($path, '.gz');

        $this->info(sprintf(
            'Reading %s%s',
            $path,
            $dryRun ? ' — DRY RUN, nothing will be written' : ''
        ));

        $handle = $gzipped ? gzopen($path, 'rb') : fopen($path, 'rb');
        if ($handle === false) {
            $this->error('Could not open the file.');

            return self::FAILURE;
        }

        $read = 0;
        $written = 0;
        $skippedLocale = 0;
        $skippedExisting = 0;
        $unknownId = 0;
        $malformed = 0;
        $empty = 0;

        while (! ($gzipped ? gzeof($handle) : feof($handle))) {
            $line = $gzipped ? gzgets($handle) : fgets($handle);
            if ($line === false) {
                break;
            }

            $line = trim($line);
            if ($line === '') {
                continue;
            }

            $read++;
            $record = json_decode($line, true);

            if (! is_array($record) || ($record['id'] ?? null) === null) {
                $malformed++;

                continue;
            }

            // THE GATE, APPLIED AGAIN. See the class docblock: the file is an input, not an authority.
            if (strtolower((string) ($record['locale'] ?? '')) !== 'fr') {
                $skippedLocale++;

                continue;
            }

            $overview = self::html($record['overview_html'] ?? null);
            $facts = self::html($record['supplement_facts_html'] ?? null);
            $gallery = self::gallery($record['gallery'] ?? []);
            $specs = self::html($record['specs_html'] ?? null);

            if ($overview === null && $facts === null && $gallery === []) {
                $empty++;

                continue;
            }

            /** @var ExternalCatalogProduct|null $row */
            $row = ExternalCatalogProduct::query()
                ->where('provider', IHerbClient::PROVIDER)
                ->where('external_product_id', (string) $record['id'])
                ->first();

            if ($row === null) {
                $unknownId++;

                continue;
            }

            $alreadyHasContent = trim((string) $row->source_overview_html) !== ''
                || trim((string) $row->source_supplement_facts_html) !== '';

            if ($alreadyHasContent && ! $overwrite) {
                $skippedExisting++;

                continue;
            }

            if (! $dryRun) {
                $attributes = [
                    'source_overview_html' => $overview,
                    'source_supplement_facts_html' => $facts,
                    'source_gallery_images' => $gallery === [] ? null : $gallery,
                    'source_spec_dimensions' => self::dimensions($specs),
                    'source_gtin' => self::gtin($record['gtin'] ?? null) ?? $row->source_gtin,
                    'source_content_url' => $record['url'] ?? $row->source_content_url,
                    /*
                     * French, and declared as a translation.
                     *
                     * iHerb's source language is English and fr.iherb.com carries its own
                     * machine-translation notice, so `translated = true` is the accurate statement
                     * about this text. ImportedSourceContent::attribution() no longer consults the
                     * flag — it decides from the locale — but the column is a record of what the
                     * page was, and recording it wrongly here would make that record a lie.
                     */
                    'source_content_locale' => 'fr',
                    'source_content_translated' => true,
                    'source_content_status' => ExternalCatalogProduct::CONTENT_EXTRACTED,
                    'source_content_fetched_at' => self::when($record['fetched_at'] ?? null),
                ];

                /*
                 * Nulls are dropped rather than written.
                 *
                 * A record with an overview but no Supplement Facts panel must not blank a panel the
                 * HTTP pass already stored for the same row — this command and catalog:iherb:content
                 * write the same columns, and "I have nothing for this field" is not the same
                 * statement as "this field is empty". array_filter with the default callback would
                 * also drop '0' and false, which is why the test is an explicit !== null.
                 */
                $row->forceFill(array_filter($attributes, static fn ($v) => $v !== null))->save();
            }

            $written++;

            if ($written % 500 === 0) {
                $this->line("  {$written} written…");
            }

            if ($limit > 0 && $written >= $limit) {
                break;
            }
        }

        $gzipped ? gzclose($handle) : fclose($handle);

        $this->newLine();
        $this->info(sprintf(
            '%d line(s) read · %d %s · %d already had content · %d not in staging · %d wrong locale · %d empty · %d malformed',
            $read,
            $written,
            $dryRun ? 'would be written' : 'written',
            $skippedExisting,
            $unknownId,
            $skippedLocale,
            $empty,
            $malformed,
        ));

        if ($dryRun && $written > 0) {
            $this->comment('Re-run without --dry-run to write.');
        }

        return self::SUCCESS;
    }

    /** A stored HTML block, or null when it carries nothing a reader would see. */
    private static function html(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        $plain = trim(html_entity_decode(strip_tags($trimmed), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));

        // Mirrors ImportedSourceContent::html(): a block whose only content is an image or a table
        // still renders; one whose content is whitespace and tags does not.
        return $plain === '' && preg_match('~<(img|table|figure)\b~i', $trimmed) !== 1 ? null : $trimmed;
    }

    /**
     * Only https URLs on the CDN hosts ImportedSourceContent will publish.
     *
     * Filtering here as well as there is not redundant: a URL this command stores that gallery()
     * later drops is a row that looks enriched in the admin and renders nothing on the page, which
     * is the hardest kind of gap to notice.
     *
     * @param  mixed  $value
     * @return list<string>
     */
    private static function gallery(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        $allowed = ['cloudinary.images-iherb.com', 's3.images-iherb.com'];
        $out = [];

        foreach ($value as $url) {
            if (! is_string($url)) {
                continue;
            }

            $url = trim($url);

            if (! str_starts_with(strtolower($url), 'https://')) {
                continue;
            }

            if (! in_array(strtolower((string) parse_url($url, PHP_URL_HOST)), $allowed, true)) {
                continue;
            }

            if (! in_array($url, $out, true)) {
                $out[] = $url;
            }
        }

        return $out;
    }

    /**
     * The one specification row ImportedSourceContent prints, pulled out of the specs block.
     *
     * It publishes `source_spec_dimensions` under the label "Dimensions" and nothing else from the
     * specs — the shipping weight and the first-available date are deliberately not published,
     * because they describe the source retailer's packaging rather than the product. So only the
     * dimensions string is lifted, and only when the block actually states one.
     */
    private static function dimensions(?string $specsHtml): ?string
    {
        if ($specsHtml === null) {
            return null;
        }

        $plain = html_entity_decode(strip_tags($specsHtml), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $plain = preg_replace('~\s+~u', ' ', $plain) ?? $plain;

        if (preg_match('~Dimensions\s*:?\s*([0-9][0-9,.\s x×]*(?:cm|mm|in|po)\b)~iu', $plain, $matches) === 1) {
            return trim($matches[1]);
        }

        return null;
    }

    /** Digits only, and only when it is a plausible GTIN length. */
    private static function gtin(mixed $value): ?string
    {
        $digits = preg_replace('~\D+~', '', (string) $value) ?? '';

        return in_array(strlen($digits), [8, 12, 13, 14], true) ? $digits : null;
    }

    private static function when(mixed $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            return Carbon::parse($value)->toDateTimeString();
        } catch (\Throwable) {
            return null;
        }
    }
}
