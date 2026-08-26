<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commandes', function (Blueprint $table): void {
            if (! Schema::hasColumn('commandes', 'checkout_idempotency_key')) {
                $table->string('checkout_idempotency_key', 100)->nullable()->unique();
            }
            if (! Schema::hasColumn('commandes', 'checkout_payload_hash')) {
                $table->char('checkout_payload_hash', 64)->nullable();
            }
        });

        if (! Schema::hasTable('notification_deliveries')) {
            Schema::create('notification_deliveries', function (Blueprint $table): void {
                $table->id();
                $table->string('event_key', 190)->unique();
                $table->string('channel', 16)->index();
                $table->string('recipient_hash', 64);
                $table->enum('status', ['sending', 'sent', 'failed', 'uncertain'])->default('sending')->index();
                $table->unsignedTinyInteger('attempts')->default(1);
                $table->string('provider_reference', 190)->nullable();
                $table->text('last_error')->nullable();
                $table->timestamp('sent_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_deliveries');

        Schema::table('commandes', function (Blueprint $table): void {
            if (Schema::hasColumn('commandes', 'checkout_idempotency_key')) {
                $table->dropUnique(['checkout_idempotency_key']);
                $table->dropColumn('checkout_idempotency_key');
            }
            if (Schema::hasColumn('commandes', 'checkout_payload_hash')) {
                $table->dropColumn('checkout_payload_hash');
            }
        });
    }
};
