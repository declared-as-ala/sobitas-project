<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('factures', function (Blueprint $table) {
            $table->string('aramex_hawb')->nullable()->after('net_a_payer');
            $table->string('aramex_label_url', 512)->nullable()->after('aramex_hawb');
            $table->string('aramex_status', 20)->nullable()->after('aramex_label_url');
            $table->timestamp('aramex_pushed_at')->nullable()->after('aramex_status');
            $table->text('aramex_error')->nullable()->after('aramex_pushed_at');
        });
    }

    public function down(): void
    {
        Schema::table('factures', function (Blueprint $table) {
            $table->dropColumn([
                'aramex_hawb',
                'aramex_label_url',
                'aramex_status',
                'aramex_pushed_at',
                'aramex_error',
            ]);
        });
    }
};
