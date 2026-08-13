<?php

namespace App\Console\Commands;

use App\Models\Categ;
use App\Models\SousCategory;
use Illuminate\Console\Command;

/**
 * Rewrite title + meta description on the pages that ALREADY RANK and take no clicks.
 *
 * ── WHY THIS IS THE HIGHEST-VALUE SEO WORK AVAILABLE ──────────────────────────────────────
 * protein.tn does not have an indexing problem. Over the last full 3-month window it took 4,833
 * clicks from 115,000 impressions at an average position of 11.4 — Google shows the site
 * constantly and nobody clicks. The blog alone carries 43,400 impressions for 650 clicks
 * (CTR 1.5%): 38% of the site's impressions, 13% of its clicks.
 *
 * The extreme cases are page-one queries with LITERALLY ZERO clicks. "omega 3 fish oil" is 3,331
 * impressions at position 7.5 and not one visit. No amount of new content or new links moves that
 * number; it is decided entirely by the title and the description Google prints.
 *
 * So this command changes no rankings, no content and no structure. It rewrites the two strings a
 * searcher actually reads, on pages Google has already decided to show.
 *
 * ── WHY A DEDICATED COMMAND AND NOT CategorySeoSeeder ────────────────────────────────────
 * The existing seeders carry baseline copy for the whole taxonomy. Editing them to change six
 * pages would bury the change among hundreds of unrelated rows and make it unreviewable. Here each
 * entry carries the Search Console figures that justify it, so a reader can check the decision
 * instead of taking it on faith — and in 28 days can tell whether it worked.
 *
 * ── THE COPY RULES, FROM _SPEC-REDACTION.md ─────────────────────────────────────────────
 * Tunisian buying triggers belong in the SERP snippet, not only on the page: livraison 24-72h,
 * PAIEMENT À LA LIVRAISON (the strongest one in this market), livraison gratuite dès 300 DT, 100%
 * authentique. Titles stay near 60 characters and descriptions near 150, because past that Google
 * truncates and the trigger is never read.
 *
 * Queries stay in the language they are SEARCHED in. "omega 3 fish oil" and "protein powder whey"
 * are English queries against a French storefront, and a title that answers only in French is a
 * title the searcher does not recognise as their own words.
 *
 *   php artisan seo:ctr-pass --dry-run
 *   php artisan seo:ctr-pass
 */
class SeoCtrPass extends Command
{
    protected $signature = 'seo:ctr-pass
                            {--dry-run : Print what would change and write nothing}';

    protected $description = 'Rewrite title/meta on page-one pages that take zero clicks (GSC-driven)';

    /**
     * slug => [meta_title, meta_description, why]
     *
     * `why` is not decoration. It records the measurement the change is answering, so the same
     * numbers can be pulled again later and the decision judged rather than re-argued.
     *
     * @var array<string, array{0: string, 1: string, 2: string}>
     */
    private const TARGETS = [
        'omega-3' => [
            'Oméga 3 Fish Oil Tunisie | EPA DHA - Livraison 24h',
            'Oméga 3 fish oil en Tunisie : capsules EPA & DHA, marques testées en laboratoire. Paiement à la livraison, livraison 24-72h, gratuite dès 300 DT.',
            'omega 3 fish oil — 3,331 impressions, 0 clicks, position 7.5. The largest pool of wasted visibility on the site. The query is English; the old title answered only in French.',
        ],
        'whey-proteine' => [
            'Whey Protein Tunisie | Protein Powder Whey dès 89 DT',
            'Whey protein en Tunisie : isolate, concentré, hydrolysée. 100% authentique, importation officielle. Paiement à la livraison, expédition 24-72h.',
            'protein powder whey — 1,105 impressions, 0 clicks, position 8.8. Also an English query. The old title carried no price and no trust trigger.',
        ],
        'pre-workout' => [
            'Pre Workout Tunisie | Booster Énergie - Prix 2026',
            'Pre workout en Tunisie : booster énergie, focus et congestion. Marques authentiques, prix 2026. Paiement à la livraison, livraison 24-72h partout.',
            'pre workout — 589 impressions, 0 clicks, position 9.3. No price signal in the old snippet.',
        ],
        'creatine' => [
            'Créatine Tunisie | Monohydrate Creapure - Prix 2026',
            'Créatine monohydrate en Tunisie : Creapure et micronisée, dosage 3-5 g/jour. 100% authentique, paiement à la livraison, livraison 24-72h.',
            'creatine tunisie — 604 impressions, 45 clicks, CTR 7.5% at position 17.4; creatine monohydrate — 657 impressions, 0 clicks at 11.8. The best-converting term on the site is still leaving clicks behind.',
        ],
        'gainers' => [
            'Mass Gainer Tunisie | Serious Mass & Prise de Masse',
            'Mass gainer en Tunisie : Serious Mass, Hard Mass et gainers riches en calories. Paiement à la livraison, livraison 24-72h, gratuite dès 300 DT.',
            'serious mass tunisie — 631 impressions, 17 clicks, CTR 2.7% at position 10.0; mass gainer tunisie sits at position 47.2 on 155 impressions, so the head term is barely attached to this page.',
        ],
        'proteines' => [
            'Compléments Alimentaires Tunisie | Protéines & Whey',
            'Compléments alimentaires en Tunisie : whey, créatine, vitamines et oméga 3. Importation officielle, paiement à la livraison, livraison 24-72h.',
            'complément alimentaire tunisie — 268 impressions, 1 click, position 7.3. /complements-alimentaires canonicalises HERE, so this page is what Google prints for that query — and its title said only "Protéines", a narrower term the searcher never typed.',
        ],
    ];

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');

        if ($dry) {
            $this->warn('DRY RUN — nothing will be written.');
        }

        $changed = 0;
        $missing = 0;
        $unchanged = 0;

        foreach (self::TARGETS as $slug => $entry) {
            [$title, $description, $why] = $entry;

            /*
             * A slug can sit at either level of the taxonomy — `proteines` is a top-level Categ
             * while `omega-3` and `whey-proteine` are rayons — and the storefront resolves
             * `/{slug}` across both. Looking in only one table would silently skip half the targets
             * and still report success, so both are tried and a genuine miss is reported loudly.
             */
            $entity = SousCategory::where('slug', $slug)->first()
                ?? Categ::where('slug', $slug)->first();

            if (! $entity) {
                $this->error(sprintf('  MISSING  %-22s no Categ or SousCategory with this slug', $slug));
                $missing++;

                continue;
            }

            $type = $entity instanceof Categ ? 'Categ' : 'SousCategory';
            $before = (string) $entity->meta_title;

            if ($before === $title && (string) $entity->meta_description === $description) {
                $this->line(sprintf('  SAME     %-22s already carries this copy', $slug));
                $unchanged++;

                continue;
            }

            $this->info(sprintf('  %s  %s (%s)', $dry ? 'WOULD  ' : 'UPDATED', $slug, $type));
            $this->line(sprintf('      was: %s', $before !== '' ? $before : '(empty)'));
            $this->line(sprintf('      now: %s', $title));
            $this->line(sprintf('      why: %s', $why));

            if (! $dry) {
                $entity->meta_title = $title;
                $entity->meta_description = $description;
                $entity->save();
            }

            $changed++;
        }

        $this->info('');
        $this->info(sprintf(
            '%s %d page(s) - %d already correct - %d missing.',
            $dry ? 'Would update' : 'Updated',
            $changed,
            $unchanged,
            $missing
        ));

        if (! $dry && $changed > 0) {
            $this->warn('The storefront caches these for its ISR window; allow ~5 minutes before re-crawling.');
        }

        return $missing > 0 ? self::FAILURE : self::SUCCESS;
    }
}
