<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasColumn('commandes', 'pack_discount_ht')) {
            Schema::table('commandes', fn (Blueprint $t) => $t->decimal('pack_discount_ht', 10, 3)->default(0));
        }
        if (! Schema::hasColumn('commandes', 'points_discount_ht')) {
            Schema::table('commandes', fn (Blueprint $t) => $t->decimal('points_discount_ht', 10, 3)->default(0));
        }
        if (! Schema::hasColumn('commandes', 'points_redeemed')) {
            Schema::table('commandes', fn (Blueprint $t) => $t->unsignedInteger('points_redeemed')->default(0));
        }
        // NULL = legacy/unknown identity, 0 = new guest, >0 = verified token owner.
        if (! Schema::hasColumn('commandes', 'authenticated_user_id')) {
            Schema::table('commandes', fn (Blueprint $t) => $t->unsignedBigInteger('authenticated_user_id')->nullable());
        }
        if (! collect(Schema::getIndexes('commandes'))
            ->contains(fn ($index) => $index['columns'] === ['authenticated_user_id'])) {
            Schema::table('commandes', fn (Blueprint $t) => $t->index('authenticated_user_id'));
        }
        if (! Schema::hasTable('user_point_transactions')) {
            return;
        }
        /*
         * Only a storefront order can carry a pack. The rest of `remise` on a devis-derived order, an
         * affiliate-desk order, or anything placed before the pack shipped (13/07/2026, Voyager-era
         * manual remises included) is a manual remise: it keeps pack_discount_ht = 0 so documents
         * print a plain 'Remise' line for it, never 'Remise pack'. A storefront order attributed to
         * an affiliate subdomain also has affilie_id, so the checkout payload hash (set only by the
         * storefront API) keeps those eligible. Points are backfilled for every row (ledger facts).
         */
        $hasQuotation = Schema::hasColumn('commandes', 'quotation_id');
        $hasAffilie = Schema::hasColumn('commandes', 'affilie_id');
        $hasPayloadHash = Schema::hasColumn('commandes', 'checkout_payload_hash');
        $hasCreatedAt = Schema::hasColumn('commandes', 'created_at');
        $packLaunch = '2026-07-13';
        DB::table('commandes')->orderBy('id')->chunkById(500, function ($orders) use ($hasQuotation, $hasAffilie, $hasPayloadHash, $hasCreatedAt, $packLaunch): void {
            foreach ($orders as $order) {
                // Backfill display fields only; no order total or account balance changes.
                $points = -(int) DB::table('user_point_transactions')->where('commande_id', $order->id)
                    ->where('type', 'redeem')->sum('points');
                $pointsDt = round($points / 20, 3); // Historic online rate never changed.
                $storefrontCheckout = $hasPayloadHash && $order->checkout_payload_hash !== null;
                $packEligible = (! $hasQuotation || $order->quotation_id === null)
                    && (! $hasAffilie || $order->affilie_id === null || $storefrontCheckout)
                    && (! $hasCreatedAt || ($order->created_at !== null && (string) $order->created_at >= $packLaunch));
                DB::table('commandes')->where('id', $order->id)->update([
                    'points_redeemed' => max(0, $points),
                    'points_discount_ht' => $pointsDt,
                    'pack_discount_ht' => $packEligible ? max(0, round((float) ($order->remise ?? 0) - $pointsDt, 3)) : 0,
                ]);
            }
        });
    }

    public function down(): void {}
};
