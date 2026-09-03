<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            // No retroactive credits: only new storefront registrations opt in server-side.
            $table->boolean('welcome_bonus_eligible')->default(false);
            $table->timestamp('welcome_bonus_awarded_at')->nullable();
        });
        Schema::create('phone_verification_otps', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('phone', 16);
            $table->string('phone_hash', 64)->index();
            $table->string('ip_hash', 64)->index();
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->string('status', 16)->default('sending');
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });
        Schema::create('welcome_bonus_claims', function (Blueprint $table): void {
            $table->id();
            // Intentionally no cascading FK: deleting/recreating an account must not pay again.
            $table->unsignedBigInteger('user_id')->unique();
            $table->string('phone_hash', 64)->unique();
            $table->string('email_hash', 64)->unique();
            $table->unsignedInteger('points');
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        // Financial deduplication records must survive rollback. Disable the campaign in config.
    }
};
