<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // MySQL DDL can survive a failed migration. Resume without overwriting any records.
        if (! Schema::hasColumn('users', 'welcome_bonus_eligible')) {
            Schema::table('users', fn (Blueprint $table) => $table->boolean('welcome_bonus_eligible')->default(false));
        }
        if (! Schema::hasColumn('users', 'welcome_bonus_awarded_at')) {
            Schema::table('users', fn (Blueprint $table) => $table->timestamp('welcome_bonus_awarded_at')->nullable());
        }
        if (! Schema::hasTable('phone_verification_otps')) {
        Schema::create('phone_verification_otps', function (Blueprint $table): void {
            $table->id();
            // Legacy production users have INT ids; fresh databases may use BIGINT.
            // No FK type assumption. OTPs (including deleted users') expire and are pruned.
            $table->unsignedBigInteger('user_id');
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
        }
        // A failed MySQL FK statement may have prevented the subsequent index statement.
        if (! collect(Schema::getIndexes('phone_verification_otps'))->contains(fn ($index) => $index['columns'] === ['user_id', 'created_at'])) {
            Schema::table('phone_verification_otps', fn (Blueprint $table) => $table->index(['user_id', 'created_at']));
        }
        if (! Schema::hasTable('welcome_bonus_claims')) {
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
    }

    public function down(): void
    {
        // Financial deduplication records must survive rollback. Disable the campaign in config.
    }
};
