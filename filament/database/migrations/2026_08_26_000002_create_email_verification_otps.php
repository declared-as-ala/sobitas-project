<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'phone_verified_at')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->timestamp('phone_verified_at')->nullable()->after('email_verified_at');
            });
        }

        if (! Schema::hasTable('email_verification_otps')) {
            Schema::create('email_verification_otps', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('code_hash');
                $table->unsignedTinyInteger('attempts')->default(0);
                $table->timestamp('expires_at');
                $table->timestamp('consumed_at')->nullable();
                $table->timestamps();
                $table->index(['user_id', 'consumed_at', 'created_at'], 'email_otp_active_lookup');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('email_verification_otps');
        if (Schema::hasColumn('users', 'phone_verified_at')) {
            Schema::table('users', fn (Blueprint $table) => $table->dropColumn('phone_verified_at'));
        }
    }
};
