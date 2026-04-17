<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('articles')) {
            return;
        }

        Schema::table('articles', function (Blueprint $table): void {
            if (! Schema::hasColumn('articles', 'content_text_direction')) {
                $table->string('content_text_direction', 16)
                    ->default('auto')
                    ->after('description');
            }
            if (! Schema::hasColumn('articles', 'content_lang')) {
                $table->string('content_lang', 16)
                    ->nullable()
                    ->after('content_text_direction');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('articles')) {
            return;
        }

        Schema::table('articles', function (Blueprint $table): void {
            foreach (['content_lang', 'content_text_direction'] as $column) {
                if (Schema::hasColumn('articles', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
