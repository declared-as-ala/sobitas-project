<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `contacts` has held name, email and message since the table was created, so /contact's phone
 * field had nowhere to go — the storefront form appended it to the bottom of the message body as
 * a line of text. That worked, and it meant the one piece of information the shop actually acts on
 * (a Tunisian customer expects to be called back) was unsearchable, unsortable and invisible as a
 * column in the Filament list.
 *
 * `subject` comes with it because the redesigned form asks for one, and a routing field buried in
 * prose is the same problem a second time.
 *
 * Both nullable, both additive, no backfill: every existing row stays exactly as it is, and
 * ApisController::sendContact() guards on Schema::hasColumn() so the endpoint keeps working
 * whether or not this has run.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            if (! Schema::hasColumn('contacts', 'phone')) {
                $table->string('phone', 40)->nullable()->after('email');
            }
            if (! Schema::hasColumn('contacts', 'subject')) {
                $table->string('subject', 150)->nullable()->after('phone');
            }
        });
    }

    public function down(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            foreach (['phone', 'subject'] as $column) {
                if (Schema::hasColumn('contacts', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
