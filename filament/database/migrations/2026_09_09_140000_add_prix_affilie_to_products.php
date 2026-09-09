<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `products.prix_affilie` — the price the SHOP must receive when an affiliate sells this product.
 *
 * ── THE MODEL, IN ONE LINE ──────────────────────────────────────────────────────────────────
 * The affiliate sells at whatever price they choose; everything above `prix_affilie` is theirs.
 * Commission is therefore a SPREAD, not a percentage of the order:
 *
 *     earning = (unit selling price − prix_affilie) × quantity
 *
 * The owner's words: "we need to put for each product now affiliate price. It's the price that
 * affiliates need to sell. And for that price they can add on them anything they want, and the
 * additional money on that they can earn it."
 *
 * ── WHY NULL MUST MEAN "NOT SELLABLE BY AFFILIATES" ─────────────────────────────────────────
 * This column is nullable because it has to be — it is added to a live catalogue of ~11,000
 * products that nobody has priced yet. But a null must never fall back to `prix`, `prix_ht` or a
 * percentage of them. Every one of those fallbacks silently invents the number that decides how
 * much money an affiliate keeps, on a product an administrator never reviewed.
 *
 * Fail closed: a product without `prix_affilie` cannot be added to an affiliate order. An affiliate
 * seeing fewer products is a support question. An affiliate earning a margin off a guessed base
 * price is a loss nobody notices until the ledger is reconciled.
 *
 * Stored HT-agnostic and compared against the same basis as the selling price the affiliate
 * enters, so the spread is never computed across two different tax bases.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('products') || Schema::hasColumn('products', 'prix_affilie')) {
            return;
        }

        Schema::table('products', function (Blueprint $t): void {
            // decimal(14,3): TND carries three decimals, and every money column in this codebase
            // (affilie_transactions.amount, return_fee_override) uses the same precision. A float
            // here would round differently from the ledger it feeds.
            $t->decimal('prix_affilie', 14, 3)->nullable()->after('promo');
            // Filtering the catalogue down to "what can an affiliate actually sell" is the single
            // most frequent query the affiliate order form will make.
            $t->index('prix_affilie');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('products') || ! Schema::hasColumn('products', 'prix_affilie')) {
            return;
        }

        Schema::table('products', function (Blueprint $t): void {
            $t->dropIndex(['prix_affilie']);
            $t->dropColumn('prix_affilie');
        });
    }
};
