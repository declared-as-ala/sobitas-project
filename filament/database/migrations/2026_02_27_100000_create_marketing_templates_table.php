<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('marketing_templates')) {
            Schema::create('marketing_templates', function (Blueprint $table) {
                $table->id();
                $table->string('type', 10); // sms | email
                $table->string('name');
                $table->string('subject')->nullable();
                $table->text('content_text')->nullable();
                $table->longText('content_html')->nullable();
                $table->json('variables_schema')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
            return;
        }

        // Add columns that may be missing on existing tables (avoid ->after() so we don't depend on other columns existing)
        if (! Schema::hasColumn('marketing_templates', 'variables_schema')) {
            Schema::table('marketing_templates', function (Blueprint $table) {
                $table->json('variables_schema')->nullable();
            });
        }
        if (! Schema::hasColumn('marketing_templates', 'is_active')) {
            Schema::table('marketing_templates', function (Blueprint $table) {
                $table->boolean('is_active')->default(true);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_templates');
    }
};
