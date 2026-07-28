<?php

use App\Models\Page;
use App\Services\Seo\PageSeoDefaults;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * Fill meta_title / meta_description on the CMS pages that already exist.
 *
 * PageSeoObserver covers every page saved from now on; this closes the historical gap in the same
 * deploy. The page that matters most is /proteine-tunisie — 1,163 words of genuine guide content
 * aimed at the "protéine tunisie" query, shipping with meta_title NULL and meta_description NULL.
 *
 * Blanks only, saveQuietly (no revalidation storm), idempotent, and wrapped so an SEO nicety can
 * never abort a deploy.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('pages')) {
            return;
        }

        try {
            $filled = 0;
            $scanned = 0;

            Page::query()->chunkById(100, function ($pages) use (&$filled, &$scanned) {
                foreach ($pages as $page) {
                    $scanned++;
                    if (PageSeoDefaults::apply($page)) {
                        $page->saveQuietly();
                        $filled++;
                        echo sprintf(
                            "[page-seo-backfill]   %s -> title=%s\n",
                            $page->slug,
                            mb_substr((string) $page->meta_title, 0, 70)
                        );
                    }
                }
            });

            echo sprintf("[page-seo-backfill] filled %d of %d page(s)\n", $filled, $scanned);
        } catch (\Throwable $e) {
            echo '[page-seo-backfill] skipped: ' . $e->getMessage() . "\n";
        }
    }

    public function down(): void
    {
        // Not reversible: filled values are indistinguishable from admin-authored ones by design.
    }
};
