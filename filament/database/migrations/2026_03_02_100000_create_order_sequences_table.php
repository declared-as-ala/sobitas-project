<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_sequences', function (Blueprint $table) {
            $table->unsignedSmallInteger('year')->primary();
            $table->unsignedInteger('next_num')->default(0);
        });

        // Seed current year from existing commandes (MAX of numeric part of numero)
        $year = (int) date('Y');
        $row = \Illuminate\Support\Facades\DB::selectOne(
            'SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(numero, "/", -1) AS UNSIGNED)), 0) AS n FROM commandes WHERE YEAR(created_at) = ?',
            [$year]
        );
        $next = (int) ($row->n ?? 0);
        \Illuminate\Support\Facades\DB::table('order_sequences')->insertOrIgnore([
            'year' => $year,
            'next_num' => $next,
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('order_sequences');
    }
};
