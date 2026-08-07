<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Support\Gtin;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Promote barcodes that are already in the database into the dedicated `gtin` column.
 *
 * ── WHY THERE IS ANYTHING TO RECOVER ──────────────────────────────────────────────────────
 * `products.code_product` is the de-facto barcode field: the POS (`TicketPosPage::525`), the BL
 * (`CreateFacture::addProductByBarcode`) and the Facture TVA pages all resolve a physical scan
 * against it. But it doubles as a free-text reference, and on the live catalogue 297 of 309 rows
 * hold a 2-3 digit database id rather than a barcode. The handful of real barcodes in there have
 * never been recognised as such, so `gtin` is empty everywhere.
 *
 * The cost of that: `seo:enrich-nutrition` filters on `whereNotNull('gtin')` and has therefore
 * enriched nothing on every scheduled Tuesday run since it was written, and no product page emits a
 * gtin property to Google.
 *
 * This is the free half of the barcode programme — it needs nobody to walk the warehouse. Run it
 * before the scanning exercise so that effort is spent only on what is genuinely missing.
 *
 *   php artisan products:recover-gtin            # report only, changes nothing
 *   php artisan products:recover-gtin --apply
 *   php artisan products:recover-gtin --apply --overwrite
 */
class RecoverProductGtin extends Command
{
    protected $signature = 'products:recover-gtin
                            {--apply : Write the recovered barcodes (without this the command only reports)}
                            {--overwrite : Replace an existing gtin when a source column disagrees}';

    protected $description = 'Promote valid barcodes already stored in code_product/sku/mpn into the gtin column';

    /** Checked in order; the first column holding a well-formed GTIN wins. */
    private const SOURCE_COLUMNS = ['gtin', 'code_product', 'sku', 'mpn'];

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');
        $overwrite = (bool) $this->option('overwrite');

        $products = Product::query()
            ->select(array_merge(['id', 'designation_fr', 'slug'], self::SOURCE_COLUMNS))
            ->orderBy('id')
            ->get();

        if ($products->isEmpty()) {
            $this->warn('No products found.');

            return self::SUCCESS;
        }

        $recovered = [];
        $conflicts = [];
        $alreadySet = 0;
        $noBarcode = 0;
        /** @var array<string, array<int, string>> $seen gtin14 => product ids, for duplicate detection */
        $seen = [];

        foreach ($products as $product) {
            $found = null;
            $foundIn = null;

            foreach (self::SOURCE_COLUMNS as $column) {
                $candidate = Gtin::normalize((string) ($product->{$column} ?? ''));
                if ($candidate !== null) {
                    $found = $candidate;
                    $foundIn = $column;
                    break;
                }
            }

            if ($found === null) {
                $noBarcode++;

                continue;
            }

            $seen[Gtin::toGtin14($found)][] = $product->id;

            $existing = Gtin::normalize((string) ($product->gtin ?? ''));

            if ($existing !== null && Gtin::sameItem($existing, $found)) {
                $alreadySet++;

                continue;
            }

            // A stored gtin that disagrees with code_product is a data conflict, not a migration.
            // Overwriting silently could attach another product's Supplement Facts, so it is
            // reported for a human and skipped unless --overwrite is explicit.
            if ($existing !== null) {
                $conflicts[] = [$product->id, $product->designation_fr, $existing, $found, $foundIn];
                if (! $overwrite) {
                    continue;
                }
            }

            $recovered[] = [$product->id, $product->designation_fr, $found, $foundIn];
        }

        $duplicates = array_filter($seen, static fn (array $ids): bool => count($ids) > 1);

        $this->newLine();
        $this->line(sprintf('  scanned            %d products', $products->count()));
        $this->line(sprintf('  gtin already set   %d', $alreadySet));
        $this->line(sprintf('  no barcode found   %d  (these need the warehouse scan)', $noBarcode));
        $this->line(sprintf('  recoverable        %d', count($recovered)));

        if ($recovered) {
            $this->newLine();
            $this->table(['id', 'produit', 'gtin', 'trouvé dans'], array_map(
                static fn (array $r): array => [$r[0], mb_strimwidth((string) $r[1], 0, 46, '…'), $r[2], $r[3]],
                $recovered
            ));
        }

        if ($conflicts) {
            $this->newLine();
            $this->warn(sprintf('%d product(s) have a gtin that disagrees with their source column:', count($conflicts)));
            $this->table(['id', 'produit', 'gtin actuel', 'candidat', 'source'], array_map(
                static fn (array $r): array => [$r[0], mb_strimwidth((string) $r[1], 0, 34, '…'), $r[2], $r[3], $r[4]],
                $conflicts
            ));
            $this->line('  Left untouched. Re-run with --overwrite once a human has decided which is right.');
        }

        if ($duplicates) {
            $this->newLine();
            $this->warn(sprintf('%d barcode(s) appear on more than one product:', count($duplicates)));
            foreach ($duplicates as $gtin14 => $ids) {
                $this->line(sprintf('    %s -> products %s', ltrim($gtin14, '0'), implode(', ', $ids)));
            }
            // Two products sharing a barcode means one of them is mislabelled, or they are genuinely
            // the same item listed twice. Either way an enrichment run would give both the same
            // Supplement Facts, so it is worth knowing before that happens.
            $this->line('  Same barcode = same trade item. Check whether one is a duplicate listing.');
        }

        if (! $apply) {
            $this->newLine();
            $this->info('Report only. Re-run with --apply to write these values.');

            return self::SUCCESS;
        }

        if (! $recovered) {
            $this->newLine();
            $this->info('Nothing to write.');

            return self::SUCCESS;
        }

        // A query-builder update touches exactly the gtin column: it skips the model's `saving` hook
        // (which re-derives `rupture` from qte) and leaves `updated_at` alone, so a metadata backfill
        // does not churn every product's <lastmod> in the sitemap.
        $written = 0;
        foreach ($recovered as [$id, , $gtin]) {
            $written += DB::table('products')->where('id', $id)->update(['gtin' => $gtin]);
        }

        $this->newLine();
        $this->info(sprintf('Wrote %d gtin value(s).', $written));
        $this->line('  Next: php artisan seo:enrich-nutrition --dry-run   (it filters on gtin and has been a no-op until now)');

        return self::SUCCESS;
    }
}
