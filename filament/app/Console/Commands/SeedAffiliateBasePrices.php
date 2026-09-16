<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Populate products.prix_affilie so the affiliate order desk actually has a catalogue to sell.
 *
 * The affiliate reseller model needs a per-product base price (what the shop wants to receive);
 * AffilieCommandeResource hides every product whose prix_affilie is NULL or <= 0, so with none set
 * the picker is empty and no affiliate can create an order. This sets
 *
 *     prix_affilie = ROUND(prix × (1 − markup/100), 3)
 *
 * i.e. the shop's retail price minus the affiliate's margin. Selling at retail then earns the
 * affiliate that margin per unit; they may set a higher price and keep the extra.
 *
 * SAFE BY DEFAULT: prints a preview and writes NOTHING unless --apply is passed. Fills only empty
 * prices unless --overwrite, and only published products unless --all — so a price an admin set by
 * hand is never silently rewritten.
 */
class SeedAffiliateBasePrices extends Command
{
    protected $signature = 'affilie:seed-base-prices
        {--markup=10 : Affiliate margin as a percentage OFF retail (base = prix × (1 − markup/100))}
        {--apply : Actually write. Without this the command only previews.}
        {--overwrite : Also recompute products that already have an affiliate price}
        {--all : Include unpublished products (default: publier = 1 only)}';

    protected $description = 'Set products.prix_affilie = retail minus an affiliate margin, so affiliates can sell the catalogue.';

    public function handle(): int
    {
        $markup = (float) $this->option('markup');
        if ($markup < 0 || $markup >= 100) {
            $this->error("--markup must be between 0 and 99. Got {$markup}.");

            return self::FAILURE;
        }

        $factor = round(1 - ($markup / 100), 6);
        $apply = (bool) $this->option('apply');
        $overwrite = (bool) $this->option('overwrite');
        $all = (bool) $this->option('all');

        $base = Product::query()->where('prix', '>', 0);
        if (! $all && Schema::hasColumn('products', 'publier')) {
            $base->where('publier', 1);
        }
        if (! $overwrite) {
            $base->where(function ($q) {
                $q->whereNull('prix_affilie')->orWhere('prix_affilie', '<=', 0);
            });
        }

        $eligible = (clone $base)->count();

        $this->info("Affiliate margin: {$markup}%   →   base = retail × {$factor}");
        $this->info(($overwrite ? 'Overwrite ON (recompute priced too)' : 'Fill-only (skip already-priced)')
            . ' · ' . ($all ? 'all products' : 'published only')
            . " · eligible: {$eligible}");

        if ($eligible === 0) {
            $this->warn('Nothing to update — every targeted product already has an affiliate price.');

            return self::SUCCESS;
        }

        (clone $base)->orderBy('id')->limit(6)->get(['id', 'designation_fr', 'prix', 'prix_affilie'])
            ->each(function ($p) use ($factor): void {
                $this->line(sprintf(
                    '  #%-6d %-42s retail %9.3f → base %9.3f',
                    $p->id,
                    mb_strimwidth((string) ($p->designation_fr ?? ''), 0, 40, '…'),
                    (float) $p->prix,
                    round((float) $p->prix * $factor, 3),
                ));
            });

        if (! $apply) {
            $this->warn("PREVIEW ONLY — nothing written. Re-run with --apply to update {$eligible} product(s).");

            return self::SUCCESS;
        }

        // One UPDATE ... SET, TND-rounded. $factor is a validated numeric literal we control.
        $updated = (clone $base)->update([
            'prix_affilie' => DB::raw("ROUND(prix * {$factor}, 3)"),
        ]);

        $this->info("✅ Updated {$updated} product(s). Affiliates can now sell them at a {$markup}% margin.");

        return self::SUCCESS;
    }
}
