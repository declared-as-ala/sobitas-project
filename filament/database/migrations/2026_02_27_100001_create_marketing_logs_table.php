<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('marketing_logs')) {
            return;
        }

        Schema::create('marketing_logs', function (Blueprint $table) {
            $table->id();
            $table->string('channel', 10); // sms | email
            $table->foreignId('template_id')->nullable()->constrained('marketing_templates')->nullOnDelete();
            $table->string('recipient_type', 20)->nullable(); // phone | email
            $table->string('recipient_value');
            $table->unsignedBigInteger('client_id')->nullable();
            $table->string('status', 20); // queued | sent | failed
            $table->string('provider_message_id')->nullable();
            $table->text('error_message')->nullable();
            $table->string('campaign_id', 64)->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['channel', 'status']);
            $table->index(['campaign_id']);
            $table->index('sent_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_logs');
    }
};
