<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Services\Enrichment\NutritionPanelBuilder;
use App\Services\Enrichment\TranscribedLabel;
use Illuminate\Console\Command;

/**
 * Re-render every stored Supplement Facts panel from its structured facts.
 *
 *   php artisan products:rebuild-nutrition-panels --dry-run
 *   php artisan products:rebuild-nutrition-panels
 *
 * The panel HTML in `nutrition_values` is derived, never authored. That is the whole reason the
 * facts live in `nutrition_facts` as JSON: when the renderer improves — a nutrient gains a French
 * name, a footnote is corrected, the markup changes to suit a new stylesheet — every product picks
 * up the fix without anyone retyping a label.
 *
 * Two real examples this command exists to propagate: French nutrient names arrived after the first
 * panels were written, and the percentage footnote had to learn the difference between American
 * Daily Values and European reference intakes. Without this, both fixes would apply only to products
 * edited afterwards, leaving the catalogue split between two vocabularies.
 *
 * Products with no structured facts are untouched: a panel someone typed by hand into
 * nutrition_values is their text, not ours to regenerate.
 */
class RebuildNutritionPanels extends Command
{
    protected $signature = 'products:rebuild-nutrition-panels
        {--dry-run : Report what would change, write nothing}
        {--id= : One product id}';

    protected $description = 'Re-render nutrition_values from the structured nutrition_facts';

    public function handle(NutritionPanelBuilder $builder): int
    {
        $dry = (bool) $this->option('dry-run');

        $query = Product::query()->whereNotNull('nutrition_facts');
        if ($id = $this->option('id')) {
            $query->where('id', (int) $id);
        }

        $changed = 0;
        $same = 0;
        $emptied = 0;
        $skipped = 0;

        $query->orderBy('id')->chunkById(100, function ($products) use ($builder, $dry, &$changed, &$same, &$emptied, &$skipped): void {
            foreach ($products as $product) {
                $facts = $product->nutrition_facts;
                if (! is_array($facts) || $facts === []) {
                    $skipped++;

                    continue;
                }

                $label = TranscribedLabel::fromStored($facts);
                $panel = $label === null ? null : $builder->build($label);
                $next = $panel['html'] ?? null;

                if ($next === null) {
                    $emptied++;
                    $this->line(sprintf('  <fg=yellow>vide</>  #%d %s — facts présents mais aucune ligne exploitable',
                        $product->id, mb_strimwidth((string) $product->designation_fr, 0, 46, '…')));

                    continue;
                }

                if ($next === $product->nutrition_values) {
                    $same++;

                    continue;
                }

                $changed++;
                $this->line(sprintf('  <fg=green>maj</>   #%d %s (%d lignes)',
                    $product->id, mb_strimwidth((string) $product->designation_fr, 0, 46, '…'), $panel['rows']));

                if (! $dry) {
                    // Only this column, and quietly: regenerating a panel must never re-derive
                    // `rupture` from `qte` and move stock on a maintenance run.
                    $product->forceFill(['nutrition_values' => $next])->saveQuietly();
                }
            }
        });

        $this->newLine();
        $this->info(sprintf(
            '%s%d panneau(x) régénéré(s), %d inchangé(s), %d sans lignes exploitables, %d ignoré(s).',
            $dry ? '[dry-run] ' : '',
            $changed,
            $same,
            $emptied,
            $skipped,
        ));

        if ($dry && $changed > 0) {
            $this->comment('Relancez sans --dry-run pour écrire.');
        }

        return self::SUCCESS;
    }
}
