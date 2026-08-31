<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;

/**
 * Report — and optionally repair — the robots directives on published products.
 *
 * ── WHAT THIS WAS WRITTEN TO FIND ─────────────────────────────────────────────────────────────
 * A live audit on 13/08/2026 found published products serving TWO different noindex flavours, and
 * only one of them was intended:
 *
 *   noindex, follow     10,259 imported products. DELIBERATE. CatalogIHerbPromote publishes an
 *                       imported product with seo_robots_index = 0 when its body is below
 *                       catalog.promotion.min_body_words (250), and `--reindex` re-measures and
 *                       flips the ones that have since grown a body. This is a quality gate doing
 *                       its job; removing it wholesale would push ~10,000 thin pages at Google,
 *                       which is how a site earns a thin-content problem rather than rankings.
 *
 *   noindex, NOFOLLOW   49 of the ORIGINAL hand-built catalogue, flag set in Filament. These are
 *                       not imported stubs — the sample included C4 Original Pre-Workout, Gold
 *                       Creatine Kevin Levrone and Mass Gainer Eric Favre. Flagship SKUs.
 *
 * The second one is the bug, and `nofollow` is the part that makes it expensive.
 *
 * ── WHY nofollow IS ALWAYS WRONG ON A PRODUCT PAGE ────────────────────────────────────────────
 * `noindex` says "do not list THIS page". `nofollow` says "and do not follow any link on it" — so
 * the page's links to its category, its brand, its subcategory and its related products all stop
 * carrying signal. A noindexed page that still follows is a normal, useful part of a site: it
 * passes authority through to the pages that DO rank. A noindexed, nofollowed page is a dead end
 * that takes its whole neighbourhood's internal linking down with it.
 *
 * Google's own guidance is `noindex, follow` for pages you want kept out of the index but still
 * crawled. There is no product page for which nofollow is the right answer, which is why this
 * repairs the follow flag unconditionally and leaves the index flag alone.
 *
 * ── WHAT THIS DELIBERATELY DOES NOT DO ────────────────────────────────────────────────────────
 * It never flips `seo_robots_index`. That flag is owned by two decisions this command is not
 * qualified to make: the operator's, in Filament, and the measured body gate in
 * CatalogIHerbPromote. Turning 10,000 products indexable is a real strategic choice with a real
 * downside, and it already has a correct tool:
 *
 *     php artisan catalog:iherb:promote --reindex
 *
 * which re-measures each body and flips only what earns it. This command reports how many are
 * waiting on that, so the decision is made against a number rather than a feeling.
 *
 *   php artisan seo:products-robots-audit           # report only
 *   php artisan seo:products-robots-audit --apply   # repair nofollow
 */
class SeoProductsRobotsAudit extends Command
{
    protected $signature = 'seo:products-robots-audit
                            {--apply : Repair seo_robots_follow (report only without it)}';

    protected $description = 'Audit robots directives on published products; repair nofollow, never touch noindex';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');

        $published = Product::where('publier', 1);

        $total = (clone $published)->count();
        $noindex = (clone $published)->where('seo_robots_index', 0)->count();
        $indexable = $total - $noindex;

        // The repair set: published, and explicitly told not to follow.
        $nofollowQuery = (clone $published)->where('seo_robots_follow', 0);
        $nofollow = (clone $nofollowQuery)->count();

        $this->info('PUBLISHED PRODUCTS');
        $this->line(sprintf('  total                     %d', $total));
        $this->line(sprintf('  indexable                 %d', $indexable));
        $this->line(sprintf('  seo_robots_index = 0      %d', $noindex));
        $this->line('');
        $this->info('ROBOTS DIRECTIVES');
        $this->line(sprintf('  seo_robots_follow = 0     %d   <- nofollow, which is never right here', $nofollow));

        if ($nofollow > 0) {
            $this->line('');
            $this->warn('  These pages do not pass any internal-link signal to their category, brand or');
            $this->warn('  related products. A sample:');

            foreach ((clone $nofollowQuery)->limit(8)->get(['id', 'slug', 'designation_fr', 'seo_robots_index']) as $p) {
                $this->line(sprintf(
                    '    #%-6d %-52s index=%s',
                    $p->id,
                    mb_substr((string) $p->designation_fr, 0, 52),
                    $p->seo_robots_index === null ? 'null' : (string) (int) $p->seo_robots_index
                ));
            }
        }

        if ($nofollow > 0 && $apply) {
            // update() rather than a loop: this touches no other column, fires no model events and
            // cannot half-finish across 10,000 rows. `follow` is a directive, not content, so there
            // is nothing here a per-model observer would need to react to.
            $changed = (clone $nofollowQuery)->update(['seo_robots_follow' => 1]);
            $this->line('');
            $this->info(sprintf('  REPAIRED: %d product(s) now emit `follow`.', $changed));
            $this->line('  Their index flag is unchanged — a noindexed page that follows is correct and useful.');
        } elseif ($nofollow > 0) {
            $this->line('');
            $this->warn('  REPORT ONLY. Re-run with --apply to set seo_robots_follow = 1 on these.');
        } else {
            $this->line('');
            $this->info('  No product is nofollowed. Nothing to repair.');
        }

        if ($noindex > 0) {
            $this->line('');
            $this->info('NOINDEXED PRODUCTS — NOT TOUCHED BY THIS COMMAND');
            $this->line(sprintf(
                '  %d published products are held at seo_robots_index = 0. Most are imported rows whose',
                $noindex
            ));
            $this->line(sprintf(
                '  body is below catalog.promotion.min_body_words (%d). To re-measure them and index',
                (int) config('catalog.promotion.min_body_words', 250)
            ));
            $this->line('  the ones that now earn it:');
            $this->line('');
            $this->line('      php artisan catalog:iherb:promote --reindex');
            $this->line('');
            $this->line('  That flips only what clears the gate. Forcing the rest indexable would publish');
            $this->line('  thin pages at scale, which costs more than it gains.');
        }

        return self::SUCCESS;
    }
}
