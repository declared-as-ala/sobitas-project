<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The columns a PUBLIC application needs — and which the admin-only Partner module never had.
 *
 * `affilies` was designed for rows an administrator typed in: name, email, commission rate, RIB.
 * Nothing in it can hold what a stranger actually submits through /partenaires. The frontend has
 * been POSTing `city`, `audience_size`, `message` and `referred_by_code` since the form shipped;
 * there was no route to receive them and no column to put them in, so every field was lost twice
 * over.
 *
 * ── WHY `audience_size` IS A STRING ──────────────────────────────────────────────────────────
 * It is the answer to "combien de personnes suivez-vous ?" and people write "~200 adhérents",
 * "40 clients réguliers", "3k sur Insta". An integer column would reject most honest answers and
 * silently truncate the rest. The frontend type has always been `string`; the column matches it.
 *
 * ── WHY APPLICATION REVIEW IS SEPARATE FROM KYC REVIEW ───────────────────────────────────────
 * `2026_09_09_120100` already added `kyc_reviewed_at / kyc_reviewed_by / kyc_reject_reason`. Those
 * answer "is this identity document acceptable". They are NOT the same decision as "do we want
 * this affiliate", which can be refused with perfectly valid papers and can be granted before the
 * documents are even looked at. Collapsing the two would make a rejected application look like a
 * rejected ID card in the audit trail, which is the kind of ambiguity that ends in a wrong reply
 * to a real person. Hence `reviewed_at / reviewed_by / application_reject_reason`.
 *
 * ── WHY A `reference` COLUMN RATHER THAN A DERIVED ONE ───────────────────────────────────────
 * The applicant is shown this string and quotes it back to support. Deriving it from the primary
 * key ("AFF-000412") publishes how many affiliates exist and lets anyone enumerate neighbours by
 * arithmetic. A random, unique token costs one column and leaks nothing.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('affilies')) {
            return;
        }

        Schema::table('affilies', function (Blueprint $t): void {
            if (! Schema::hasColumn('affilies', 'city')) {
                $t->string('city')->nullable();
            }
            if (! Schema::hasColumn('affilies', 'audience_size')) {
                // Free text on purpose — see the class docblock.
                $t->string('audience_size')->nullable();
            }
            if (! Schema::hasColumn('affilies', 'application_message')) {
                $t->text('application_message')->nullable();
            }
            if (! Schema::hasColumn('affilies', 'referred_by_code')) {
                // Set from the attribution cookie when one affiliate refers another.
                $t->string('referred_by_code', 64)->nullable()->index();
            }
            if (! Schema::hasColumn('affilies', 'reference')) {
                $t->string('reference', 32)->nullable();
            }
            if (! Schema::hasColumn('affilies', 'applied_at')) {
                $t->timestamp('applied_at')->nullable();
            }
            if (! Schema::hasColumn('affilies', 'application_reject_reason')) {
                $t->text('application_reject_reason')->nullable();
            }
            if (! Schema::hasColumn('affilies', 'reviewed_at')) {
                $t->timestamp('reviewed_at')->nullable();
            }
            if (! Schema::hasColumn('affilies', 'reviewed_by')) {
                $t->unsignedBigInteger('reviewed_by')->nullable();
            }
        });

        // Unique only where present: existing admin-created rows have no reference and MySQL
        // treats NULLs as distinct in a unique index, so this is safe to add after the fact.
        if (Schema::hasColumn('affilies', 'reference')) {
            try {
                Schema::table('affilies', fn (Blueprint $t) => $t->unique('reference', 'affilies_reference_unique'));
            } catch (\Throwable) {
                // Index already exists — re-running is a no-op, not a failure.
            }
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('affilies')) {
            return;
        }

        try {
            Schema::table('affilies', fn (Blueprint $t) => $t->dropUnique('affilies_reference_unique'));
        } catch (\Throwable) {
            // Never existed — nothing to drop.
        }

        Schema::table('affilies', function (Blueprint $t): void {
            foreach ([
                'city', 'audience_size', 'application_message', 'referred_by_code', 'reference',
                'applied_at', 'application_reject_reason', 'reviewed_at', 'reviewed_by',
            ] as $c) {
                if (Schema::hasColumn('affilies', $c)) {
                    $t->dropColumn($c);
                }
            }
        });
    }
};
