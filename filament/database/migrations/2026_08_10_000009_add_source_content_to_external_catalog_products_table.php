<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The columns that hold what the iHerb PRODUCT PAGE carries, as opposed to what its JSON says.
 *
 * ── WHY THERE ARE THIS MANY ───────────────────────────────────────────────────────────────
 * Because the page genuinely carries this much, and the alternative — one `source_content` JSON blob
 * — cannot be queried, cannot be indexed, and turns "how many products actually have a Supplement
 * Facts panel" into a full-table scan with a JSON_EXTRACT in it. Each column below is a field
 * IHerbPageExtractor::FIELDS returns; page-extractor-check.php asserts the two lists agree, so a
 * field added to the extractor and forgotten here is a failing harness rather than an SQL error on a
 * queue worker at 3am.
 *
 * ── WHAT IS DELIBERATELY NOT HERE: THE HTML ITSELF ────────────────────────────────────────
 * Three real product pages measured 2,084,504 / 2,084,214 / 2,046,706 bytes. Across 47,537 products
 * that is about 95 GB against roughly 43 GB free on the VPS, so persisting the response is not a
 * trade-off to weigh — it does not fit. The pass extracts and discards.
 *
 * `source_content_excerpt` is the one bounded exception: 4,000 characters
 * (IHerbPageExtractor::DEBUG_EXCERPT_CHARS) of the region we searched, written ONLY for a page that
 * yielded nothing. That is the difference between "iHerb renamed a class" and "we were served a
 * country splash", and it is unanswerable after the document is gone. If every single row failed it
 * would cost about 190 MB.
 *
 * The consequence has to be said plainly, because it is the one place this differs from hydration:
 * `catalog:iherb:hydrate --renormalize` re-derives every normalised field from `source_payload` with
 * zero HTTP requests, and NO EQUIVALENT IS POSSIBLE HERE. An extractor fix that needs the markup
 * again needs the markup again. `catalog:iherb:content --rederive` re-computes only what can be
 * recomputed from the columns below; `--refetch` re-crawls, and says what that costs before it does.
 *
 * ── WHAT IS DELIBERATELY NOT HERE, PART TWO: REVIEWS ──────────────────────────────────────
 * No rating column, no review count, no review text, no aggregate anything. `source_rating` and
 * `source_rating_count` already exist from migration 2026_08_10_000001 and are internal reference
 * only. Nothing in the content pass writes them and nothing renders them.
 *
 * ── WHY THIS TABLE AND NOT `products` ─────────────────────────────────────────────────────
 * Same reason as 2026_08_10_000001 and _000008: `products` has no create-migration, carries NOT NULL
 * columns with no DEFAULT, and is the single table the business runs on. The 309 hand-made products
 * have no row in `external_catalog_products` at all, so this file cannot reach them.
 *
 * Every guard, deliberately: hasTable, then hasColumn per column, every column nullable, no default
 * that implies a measurement, no backfill, no UPDATE. Re-running is a no-op; down() drops only what
 * up() could have created.
 */
return new class extends Migration
{
    /**
     * mediumtext, not text: MySQL's `text` caps at 65,535 BYTES, and these are utf8mb4 strings full
     * of accented French and, on a tn.iherb.com run, Arabic — where one character costs two to four
     * bytes. A Supplement Facts table for a multivitamin is a large HTML table. Silently truncating
     * a warnings panel mid-sentence is the worst possible failure for this particular column.
     */
    private const HTML_COLUMNS = [
        'source_overview_html',
        'source_suggested_use_html',
        'source_other_ingredients_html',
        'source_warnings_html',
        'source_supplement_facts_html',
    ];

    public function up(): void
    {
        if (! Schema::hasTable('external_catalog_products')) {
            return;
        }

        Schema::table('external_catalog_products', function (Blueprint $table): void {
            foreach (self::HTML_COLUMNS as $column) {
                if (! Schema::hasColumn('external_catalog_products', $column)) {
                    $table->mediumText($column)->nullable();
                }
            }

            // ── Provenance of the transcription ──────────────────────────────────────────
            if (! Schema::hasColumn('external_catalog_products', 'source_content_locale')) {
                // Verbatim `<html lang>`: "fr", "en-CA", "ar-TN". Which language the stored prose is
                // in is a property of the prose, not of our configuration at some later date.
                $table->string('source_content_locale', 12)->nullable();
            }

            if (! Schema::hasColumn('external_catalog_products', 'source_content_translated')) {
                /**
                 * Did iHerb declare the page machine translated?
                 *
                 * fr.iherb.com's disclaimer carries a paragraph the English page does not: "Ce site
                 * web a été traduit automatiquement... iHerb ne garantit pas que les traductions
                 * sont complètes ou exemptes d'erreurs". On a supplement page the transcribed text
                 * includes dosage and contraindications, so whether the words are the manufacturer's
                 * or a translation engine's has to travel WITH the words.
                 *
                 * Nullable and no default, because three states are real: true, false, and "this
                 * locale is not one whose notice we have verified".
                 */
                $table->boolean('source_content_translated')->nullable();
            }

            if (! Schema::hasColumn('external_catalog_products', 'source_content_url')) {
                $table->text('source_content_url')->nullable();
            }

            if (! Schema::hasColumn('external_catalog_products', 'source_manufacturer_url')) {
                // The manufacturer's own site, linked from the page. A primary source for anything
                // that later needs checking, which a retailer listing is not.
                $table->text('source_manufacturer_url')->nullable();
            }

            if (! Schema::hasColumn('external_catalog_products', 'source_gallery_images')) {
                /**
                 * The real image gallery, from the page's og:image run.
                 *
                 * Migration 2026_08_10_000008 recorded that a gallery was impossible, and against
                 * the JSON payload it was: a primary index and no count means probing 1..n and
                 * storing URLs that 404. The HTML page lists them outright — product 1 emits indices
                 * 97, 102 and 105-111, nine images, none guessed. iHerb's own CMS banners are
                 * dropped by the extractor; they are advertising, not product photography.
                 */
                $table->json('source_gallery_images')->nullable();
            }

            // ── The specification list, transcribed per locale ───────────────────────────
            foreach ([
                'source_spec_first_available' => 20,   // "06/2007" (fr/en) · "يونيو 2007" (ar)
                'source_spec_shipping_weight' => 40,   // "0,05 kg"
                'source_spec_package_quantity' => 60,  // "60 Pièce" · "600"
                'source_spec_dimensions' => 80,        // "9,7 x 5,1 x 5,1 cm"
                'source_spec_actual_weight' => 40,     // "0,04 kg"
            ] as $column => $length) {
                if (! Schema::hasColumn('external_catalog_products', $column)) {
                    $table->string($column, $length)->nullable();
                }
            }

            if (! Schema::hasColumn('external_catalog_products', 'source_gtin')) {
                /**
                 * THE BARCODE, and the single most valuable field on this page.
                 *
                 * App\Support\Gtin's own docblock says it: `products:enrich-dsld` and
                 * `seo:enrich-nutrition` have been scheduled for months and enrich nothing, because
                 * they match on a GTIN and no product carries one. The page prints it — "Code CUP:
                 * 753950000773" — and the extractor only accepts it if the GS1 check digit
                 * verifies, so a mis-transcription fails closed rather than becoming a lookup key
                 * for the wrong product.
                 *
                 * 14 chars: GTIN-14 is the longest form. Indexed, because matching against DSLD/OFF
                 * and against `products.gtin` is the entire point of storing it.
                 */
                $table->string('source_gtin', 14)->nullable();
            }

            if (! Schema::hasColumn('external_catalog_products', 'source_content_word_count')) {
                // The number the owner actually asked to move: words of real transcribed copy on a
                // page. NULL means "never measured", which is not 0.
                $table->unsignedInteger('source_content_word_count')->nullable();
            }

            if (! Schema::hasColumn('external_catalog_products', 'source_content_unmapped_sections')) {
                /**
                 * Headings the extractor recognised as sections but could not classify.
                 *
                 * The same contract as `source_unmapped_keys`: what we did not understand is a
                 * stored fact, not a silent discard. Two of the page's sections — suggested use and
                 * warnings — share one CSS class and can only be told apart by their heading text,
                 * which is different in each of iHerb's 101 locales. Pointing the pass at a locale
                 * the extractor has never seen therefore fills this column on the first row instead
                 * of writing NULL into two content fields on 47,537 of them.
                 *
                 * `[]` is a measurement; NULL means the row predates this column.
                 */
                $table->json('source_content_unmapped_sections')->nullable();
            }

            // ── The content state machine. This IS the resume mechanism, exactly like status ──
            if (! Schema::hasColumn('external_catalog_products', 'source_content_status')) {
                /**
                 * NULL/queued → fetching → extracted | empty | blocked | failed
                 *
                 * Separate from `status` on purpose. `status` is the HYDRATION lifecycle and ends at
                 * `promoted`; a promoted product still needs its page read, and folding the two
                 * would mean either re-opening a finished state machine or losing the ability to say
                 * which of the two passes a row is waiting for.
                 *
                 * `blocked` is its own state and not a failure: robots.txt disallows
                 * `/*discontinued`, and a large share of iHerb urlNames end in "-discontinued-item".
                 * Those pages are forbidden to us permanently, and calling that "failed" would put
                 * thousands of rows in a bucket someone would eventually try to retry.
                 */
                $table->string('source_content_status', 24)->nullable();
            }

            if (! Schema::hasColumn('external_catalog_products', 'source_content_reason')) {
                $table->string('source_content_reason', 255)->nullable();
            }

            if (! Schema::hasColumn('external_catalog_products', 'source_content_attempts')) {
                // On the ROW, not on the job: a worker restart loses a job's attempt count with it,
                // and a row would then be retried for ever. Same reasoning as `attempts`.
                $table->unsignedTinyInteger('source_content_attempts')->nullable();
            }

            if (! Schema::hasColumn('external_catalog_products', 'source_content_fetched_at')) {
                $table->timestamp('source_content_fetched_at')->nullable();
            }

            if (! Schema::hasColumn('external_catalog_products', 'source_content_hash')) {
                // sha256 of the response body. The document is discarded, so this is the only way to
                // ever say "the page has not changed since we read it" without diffing prose.
                $table->string('source_content_hash', 64)->nullable();
            }

            if (! Schema::hasColumn('external_catalog_products', 'source_content_bytes')) {
                $table->unsignedInteger('source_content_bytes')->nullable();
            }

            if (! Schema::hasColumn('external_catalog_products', 'source_content_excerpt')) {
                // Bounded at IHerbPageExtractor::DEBUG_EXCERPT_CHARS = 4,000 characters, written
                // only when a fetch succeeded and yielded no prose at all. See the class docblock.
                $table->text('source_content_excerpt')->nullable();
            }
        });

        // Indexes in their own pass: Schema::hasColumn() inside the closure above reads the schema
        // as it was BEFORE the ALTER runs, so an index declared there would reference a column that
        // does not exist yet on a fresh install.
        Schema::table('external_catalog_products', function (Blueprint $table): void {
            if (Schema::hasColumn('external_catalog_products', 'source_content_status')
                && ! Schema::hasIndex('external_catalog_products', 'ecp_content_status_index')) {
                // The pass selects work by state. Without this it is a full scan of 47,537 rows
                // every scheduler window.
                $table->index('source_content_status', 'ecp_content_status_index');
            }

            if (Schema::hasColumn('external_catalog_products', 'source_gtin')
                && ! Schema::hasIndex('external_catalog_products', 'ecp_source_gtin_index')) {
                $table->index('source_gtin', 'ecp_source_gtin_index');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('external_catalog_products')) {
            return;
        }

        Schema::table('external_catalog_products', function (Blueprint $table): void {
            foreach (['ecp_content_status_index', 'ecp_source_gtin_index'] as $index) {
                if (Schema::hasIndex('external_catalog_products', $index)) {
                    $table->dropIndex($index);
                }
            }
        });

        Schema::table('external_catalog_products', function (Blueprint $table): void {
            $columns = array_merge(self::HTML_COLUMNS, [
                'source_content_locale',
                'source_content_translated',
                'source_content_url',
                'source_manufacturer_url',
                'source_gallery_images',
                'source_spec_first_available',
                'source_spec_shipping_weight',
                'source_spec_package_quantity',
                'source_spec_dimensions',
                'source_spec_actual_weight',
                'source_gtin',
                'source_content_word_count',
                'source_content_unmapped_sections',
                'source_content_status',
                'source_content_reason',
                'source_content_attempts',
                'source_content_fetched_at',
                'source_content_hash',
                'source_content_bytes',
                'source_content_excerpt',
            ]);

            foreach ($columns as $column) {
                if (Schema::hasColumn('external_catalog_products', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
