<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Everything the affiliate ecosystem needs that the Partner module never had.
 *
 * Three groups, and the reasons matter:
 *
 * 1. ORDER ATTRIBUTION. `affilie_transactions` links only to `ticket_id` — the POS ticket. There is
 *    no `commande_id` anywhere, and `commandes` has no affiliate column, which is why commission
 *    has always been boutique-only. These columns are the bridge. `affilie_commission_processed_at`
 *    mirrors `tickets.affilie_commission_processed_at` and is the idempotency marker: the accrual
 *    service checks it under a row lock before writing money.
 *
 * 2. KYC. ID documents are stored as PATHS on a PRIVATE disk, never on `public`. Every existing
 *    FileUpload in this app writes to `disk('public')`, which is world-readable by URL — fine for a
 *    product photo, unacceptable for a national identity card. The disk is defined in
 *    config/filesystems.php as `affilie-kyc`, rooted OUTSIDE storage/app/public so it cannot be
 *    reached through the storage symlink even by guessing the filename.
 *
 * 3. THE COD MONEY GATES. `delivered_at` alone does not mean the cash exists: these are
 *    cash-on-delivery orders, so the courier holds the money until it remits. `remitted_at`
 *    is the second gate. Commission becomes payable only when BOTH have passed, which is the
 *    difference between "the affiliate is owed money" and "the money exists to pay them".
 *    Collapsing them into one date is the mistake that pays commission out of the shop's pocket.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Order attribution ────────────────────────────────────────────────────────────
        if (Schema::hasTable('commandes')) {
            Schema::table('commandes', function (Blueprint $t): void {
                if (! Schema::hasColumn('commandes', 'affilie_id')) {
                    $t->unsignedBigInteger('affilie_id')->nullable()->index();
                }
                if (! Schema::hasColumn('commandes', 'affilie_code_id')) {
                    $t->unsignedBigInteger('affilie_code_id')->nullable()->index();
                }
                if (! Schema::hasColumn('commandes', 'affilie_commission_processed_at')) {
                    $t->timestamp('affilie_commission_processed_at')->nullable();
                }
                // Second COD gate. Set when the courier's money for THIS order is reconciled.
                if (! Schema::hasColumn('commandes', 'cod_remitted_at')) {
                    $t->timestamp('cod_remitted_at')->nullable()->index();
                }
            });
        }

        if (Schema::hasTable('affilie_transactions')) {
            Schema::table('affilie_transactions', function (Blueprint $t): void {
                if (! Schema::hasColumn('affilie_transactions', 'commande_id')) {
                    $t->unsignedBigInteger('commande_id')->nullable()->index();
                }
            });
        }

        // ── 2. KYC + contact verification + payout identity ─────────────────────────────────
        if (Schema::hasTable('affilies')) {
            Schema::table('affilies', function (Blueprint $t): void {
                foreach ([
                    'kyc_id_front' => 'string',
                    'kyc_id_back' => 'string',
                    'kyc_cin' => 'string',
                    'kyc_reject_reason' => 'string',
                    'subdomain' => 'string',
                ] as $col => $_) {
                    if (! Schema::hasColumn('affilies', $col)) {
                        $t->string($col)->nullable();
                    }
                }
                if (! Schema::hasColumn('affilies', 'kyc_status')) {
                    // pending | submitted | approved | rejected
                    $t->string('kyc_status', 20)->default('pending')->index();
                }
                foreach (['kyc_submitted_at', 'kyc_reviewed_at', 'phone_verified_at', 'email_verified_at'] as $col) {
                    if (! Schema::hasColumn('affilies', $col)) {
                        $t->timestamp($col)->nullable();
                    }
                }
                if (! Schema::hasColumn('affilies', 'kyc_reviewed_by')) {
                    $t->unsignedBigInteger('kyc_reviewed_by')->nullable();
                }
                // Per-affiliate override of the shop-wide return fee. Null = use the config default.
                if (! Schema::hasColumn('affilies', 'return_fee_override')) {
                    $t->decimal('return_fee_override', 14, 3)->nullable();
                }
                /*
                 * Withholding rate is per-affiliate and NOT a constant. Tunisian sources disagree on
                 * whether commissions to individuals are withheld at 3% or 10%, and the trigger
                 * depends on the recipient's own tax regime (auto-entrepreneur with a matricule
                 * fiscal vs. an individual with no accounts). The rate must be set per affiliate on
                 * an accountant's instruction, never hard-coded.
                 */
                if (! Schema::hasColumn('affilies', 'withholding_rate')) {
                    $t->decimal('withholding_rate', 5, 2)->nullable();
                }
                if (! Schema::hasColumn('affilies', 'matricule_fiscal')) {
                    $t->string('matricule_fiscal')->nullable();
                }
            });

            // Unique only where present: one affiliate per subdomain, but many may have none.
            // MySQL treats NULLs as distinct in a unique index, so this is safe.
            if (Schema::hasColumn('affilies', 'subdomain')) {
                try {
                    Schema::table('affilies', fn (Blueprint $t) => $t->unique('subdomain', 'affilies_subdomain_unique'));
                } catch (\Throwable) {
                    // Index already exists — re-running is a no-op, not a failure.
                }
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('affilie_transactions') && Schema::hasColumn('affilie_transactions', 'commande_id')) {
            Schema::table('affilie_transactions', fn (Blueprint $t) => $t->dropColumn('commande_id'));
        }

        if (Schema::hasTable('commandes')) {
            Schema::table('commandes', function (Blueprint $t): void {
                foreach (['affilie_id', 'affilie_code_id', 'affilie_commission_processed_at', 'cod_remitted_at'] as $c) {
                    if (Schema::hasColumn('commandes', $c)) {
                        $t->dropColumn($c);
                    }
                }
            });
        }

        if (Schema::hasTable('affilies')) {
            Schema::table('affilies', function (Blueprint $t): void {
                foreach ([
                    'kyc_id_front', 'kyc_id_back', 'kyc_cin', 'kyc_status', 'kyc_submitted_at',
                    'kyc_reviewed_at', 'kyc_reviewed_by', 'kyc_reject_reason', 'phone_verified_at',
                    'email_verified_at', 'subdomain', 'return_fee_override', 'withholding_rate',
                    'matricule_fiscal',
                ] as $c) {
                    if (Schema::hasColumn('affilies', $c)) {
                        $t->dropColumn($c);
                    }
                }
            });
        }
    }
};
