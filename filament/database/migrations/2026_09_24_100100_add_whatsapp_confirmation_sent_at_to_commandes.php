<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * When the WhatsApp order-confirmation was sent for this order.
 *
 * It is the idempotency boundary for the send: the job and the auto-send observer both refuse to
 * message a customer twice for the same order while this is set, and the admin shows a "confirmé"
 * badge from it. Additive, nullable and idempotent — an INSTANT add in MySQL 8.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('commandes', 'whatsapp_confirmation_sent_at')) {
            Schema::table('commandes', function (Blueprint $table) {
                $table->timestamp('whatsapp_confirmation_sent_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('commandes', 'whatsapp_confirmation_sent_at')) {
            Schema::table('commandes', function (Blueprint $table) {
                $table->dropColumn('whatsapp_confirmation_sent_at');
            });
        }
    }
};
