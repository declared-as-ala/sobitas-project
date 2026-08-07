<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\ProductSourceObservation;
use App\Services\Enrichment\DsldClient;
use App\Services\Enrichment\NutritionPanelBuilder;
use App\Support\Gtin;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Put real Supplement Facts on product pages, transcribed from the printed label.
 *
 *   php artisan products:enrich-dsld                  # report only
 *   php artisan products:enrich-dsld --apply
 *   php artisan products:enrich-dsld --id=1234 --apply --overwrite
 *
 * ── THE BARCODE DECIDES WHETHER ANYTHING IS PUBLISHED ─────────────────────────────────────
 * A GTIN match writes the panel. A brand+name match writes nothing to the product — it records the
 * label as a pending observation and, when the product has no barcode, proposes the label's own UPC
 * for someone to check against the tub.
 *
 * That asymmetry is the whole safety model. "Gold Standard 100% Whey" exists in US and EU
 * formulations, across flavours and formula revisions, and their panels differ. A name match that
 * looks right 90% of the time still means roughly one product page in ten showing numbers off a tub
 * nobody can buy here — and the customer measuring a scoop has no way to tell which page they got.
 *
 * Nothing here calls a model. Every figure that reaches a page was transcribed by NIH from a
 * physical label and is reproduced with its source, its label number and its transcription date.
 */
class EnrichProductsFromDsld extends Command
{
    protected $signature = 'products:enrich-dsld
        {--limit=25 : How many products to process}
        {--id= : One product id}
        {--apply : Write. Without this the command only reports}
        {--overwrite : Replace an existing nutrition panel}
        {--include-off-market : Also consider labels DSLD marks as no longer on the market}';

    protected $description = 'Fill Supplement Facts from the NIH label database, matched by barcode';

    /**
     * Labels older than this are still written when the barcode matches — a barcode identifies a
     * trade item, and that does not expire — but the age is called out, because a decade-old
     * transcription is the most likely way for a correct-looking panel to be out of date.
     */
    private const STALE_AFTER_YEARS = 8;

    public function handle(DsldClient $dsld, NutritionPanelBuilder $builder): int
    {
        $apply = (bool) $this->option('apply');
        $overwrite = (bool) $this->option('overwrite');

        $query = Product::query()->with('brand')->where('publier', 1);

        if ($id = $this->option('id')) {
            $query->where('id', (int) $id);
        } elseif (! $overwrite) {
            // A product that already has a panel does not need another one, and every skipped
            // product is search budget spent on one that does.
            $query->where(fn ($q) => $q->whereNull('nutrition_values')->orWhere('nutrition_values', ''));
        }

        $products = $query->orderBy('id')->limit($this->option('id') ? 1 : max(1, (int) $this->option('limit')))->get();

        if ($products->isEmpty()) {
            $this->info('No products matched.');

            return self::SUCCESS;
        }

        $this->info(sprintf('%d product(s)%s', $products->count(), $apply ? '' : ' — reporting only, use --apply to write'));
        $this->newLine();

        $written = 0;
        $proposed = 0;
        $candidates = 0;
        $missed = 0;

        foreach ($products as $product) {
            $this->line(sprintf('<fg=cyan>▸</> #%d %s', $product->id, mb_strimwidth((string) $product->designation_fr, 0, 60, '…')));

            $gtin = Gtin::normalize((string) ($product->gtin ?? ''));

            $found = $dsld->findFor(
                (string) ($product->brand?->designation_fr ?? ''),
                (string) $product->designation_fr,
                $gtin,
            );

            if ($found === null) {
                $missed++;
                $this->line('    <fg=gray>aucune étiquette</>');

                continue;
            }

            $label = $found['label'];

            if (($label['off_market'] ?? false) === true && ! $this->option('include-off-market')) {
                $missed++;
                $this->line('    <fg=gray>étiquette retirée du marché — ignorée</>');

                continue;
            }

            $panel = $builder->build($label);

            if ($apply) {
                $this->recordObservations($product, $label, $found['match_method'], $found['confidence']);
            }

            // ── A name match is a lead for a human, never a publication ──────────────────────
            if ($found['match_method'] !== 'gtin') {
                $candidates++;
                $this->line(sprintf(
                    '    <fg=yellow>candidat</> « %s » — correspondance par nom seulement, rien publié',
                    mb_strimwidth((string) ($label['full_name'] ?? ''), 0, 50, '…')
                ));

                if ($gtin === null && ! empty($label['upc'])) {
                    $proposed++;
                    $this->line(sprintf(
                        '    <fg=yellow>code-barres proposé : %s</> — à vérifier sur le pot',
                        $label['upc']
                    ));
                }

                continue;
            }

            if ($panel === null) {
                $missed++;
                $this->line('    <fg=gray>étiquette trouvée mais sans lignes nutritionnelles</>');

                continue;
            }

            $this->warnIfStale($label);

            $this->line(sprintf(
                '    <fg=green>panneau</> %d ligne(s), %d chiffre(s) sourcé(s) — étiquette n° %s',
                $panel['rows'],
                count($panel['facts']),
                $label['dsld_id'] ?? '?',
            ));

            if ($apply) {
                // Only this column. saveQuietly() so the Product::saving() hook does not fire and
                // re-derive `rupture` from `qte` — enriching content must never move stock.
                $product->forceFill(['nutrition_values' => $panel['html']])->saveQuietly();
                $written++;
            } else {
                $written++;
            }
        }

        $this->newLine();
        $this->info(sprintf(
            '%d panneau(x)%s · %d candidat(s) à confirmer · %d code(s)-barres proposé(s) · %d sans données',
            $written,
            $apply ? ' écrit(s)' : ' prêt(s) (non écrits)',
            $candidates,
            $proposed,
            $missed,
        ));

        if (! $apply && $written > 0) {
            $this->comment('Relancez avec --apply pour écrire.');
        }

        return self::SUCCESS;
    }

    /**
     * One observation per fact, so "where did this number come from?" has an answer that survives
     * the person who ran the command.
     *
     * @param  array<string, mixed>  $label
     */
    private function recordObservations(Product $product, array $label, string $matchMethod, float $confidence): void
    {
        // The label as fetched. A changed hash on a later run is the signal that the upstream
        // transcription moved and the panel needs looking at again.
        $hash = hash('sha256', json_encode($label, JSON_UNESCAPED_UNICODE) ?: '');

        $facts = [
            'identity.official_name' => $label['full_name'] ?? null,
            'identity.brand' => $label['brand_name'] ?? null,
            'identity.gtin' => $label['upc'] ?? null,
            'content_facts.nutrition' => $label['nutrients'] ?? null,
            'content_facts.serving_size' => $label['serving_sizes'] ?? null,
            'content_facts.servings_per_container' => $label['servings_per_container'] ?? null,
            'content_facts.net_content' => $label['net_contents'] ?? null,
            'content_facts.ingredients' => $label['other_ingredients'] ?? null,
            'content_facts.allergens' => $label['allergen_statements'] ?? null,
            'content_facts.warnings' => $label['warning_statements'] ?? null,
        ];

        foreach ($facts as $path => $value) {
            if ($value === null || $value === '' || $value === []) {
                continue;
            }

            $observation = ProductSourceObservation::firstOrNew([
                'product_id' => $product->id,
                'field_path' => $path,
                'source_id' => DsldClient::SOURCE_ID,
                'content_hash' => $hash,
            ]);

            if ($observation->exists) {
                continue;
            }

            $observation->fill([
                'normalized_value' => ['value' => $value],
                'source_record_id' => (string) ($label['dsld_id'] ?? ''),
                'source_url' => (string) ($label['source_url'] ?? ''),
                'source_type' => DsldClient::SOURCE_TYPE,
                'retrieved_at' => Carbon::now(),
                // The label's own date, not ours. A panel is only as current as the transcription
                // behind it, and dropping this would hide exactly that.
                'source_published_at' => $label['entry_date'] ?? null,
                'license_id' => DsldClient::LICENSE_ID,
                'attribution' => DsldClient::ATTRIBUTION,
                'confidence' => $confidence,
                'match_method' => $matchMethod,
                'extraction_method' => 'api',
                'extractor_version' => '1.0',
                'status' => 'pending',
            ])->save();
        }
    }

    /** @param  array<string, mixed>  $label */
    private function warnIfStale(array $label): void
    {
        $date = $label['entry_date'] ?? null;
        if (! is_string($date) || $date === '') {
            $this->line('    <fg=yellow>étiquette sans date de saisie</>');

            return;
        }

        $years = Carbon::parse($date)->diffInYears(Carbon::now());
        if ($years >= self::STALE_AFTER_YEARS) {
            $this->line(sprintf(
                '    <fg=yellow>étiquette saisie il y a %d ans (%s)</> — à revoir si le produit a été reformulé',
                $years,
                $date
            ));
        }
    }
}
