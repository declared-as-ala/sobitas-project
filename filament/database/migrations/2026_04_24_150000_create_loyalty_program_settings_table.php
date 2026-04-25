<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('loyalty_program_settings')) {
            return;
        }

        Schema::create('loyalty_program_settings', function (Blueprint $table) {
            $table->id();
            $table->json('options')->nullable();
            $table->timestamps();
        });

        DB::table('loyalty_program_settings')->insert([
            'options'    => json_encode([]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_program_settings');
    }
};
