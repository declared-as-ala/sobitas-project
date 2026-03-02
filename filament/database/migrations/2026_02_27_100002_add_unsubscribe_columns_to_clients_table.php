<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            if (! Schema::hasColumn('clients', 'email_unsubscribed_at')) {
                $table->timestamp('email_unsubscribed_at')->nullable()->after('sms');
            }
            if (! Schema::hasColumn('clients', 'sms_unsubscribed_at')) {
                $table->timestamp('sms_unsubscribed_at')->nullable()->after('email_unsubscribed_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn(['email_unsubscribed_at', 'sms_unsubscribed_at']);
        });
    }
};
