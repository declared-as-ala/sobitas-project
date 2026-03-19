<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('products')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'questions')) {
                $table->longText('questions')->nullable()->after('description_fr');
            }
            if (! Schema::hasColumn('products', 'nutrition_values')) {
                $table->longText('nutrition_values')->nullable()->after('questions');
            }
            if (! Schema::hasColumn('products', 'meta_name_content')) {
                $table->longText('meta_name_content')->nullable()->after('meta_description');
            }
            if (! Schema::hasColumn('products', 'schema_description')) {
                $table->longText('schema_description')->nullable()->after('meta_name_content');
            }
            if (! Schema::hasColumn('products', 'schema_review')) {
                $table->longText('schema_review')->nullable()->after('schema_description');
            }
            if (! Schema::hasColumn('products', 'schema_aggregate_rating')) {
                $table->longText('schema_aggregate_rating')->nullable()->after('schema_review');
            }
            if (! Schema::hasColumn('products', 'tab1_title')) {
                $table->string('tab1_title')->nullable()->after('schema_aggregate_rating');
            }
            if (! Schema::hasColumn('products', 'tab1_content')) {
                $table->longText('tab1_content')->nullable()->after('tab1_title');
            }
            if (! Schema::hasColumn('products', 'tab2_title')) {
                $table->string('tab2_title')->nullable()->after('tab1_content');
            }
            if (! Schema::hasColumn('products', 'tab2_content')) {
                $table->longText('tab2_content')->nullable()->after('tab2_title');
            }
            if (! Schema::hasColumn('products', 'tab3_title')) {
                $table->string('tab3_title')->nullable()->after('tab2_content');
            }
            if (! Schema::hasColumn('products', 'tab3_content')) {
                $table->longText('tab3_content')->nullable()->after('tab3_title');
            }
            if (! Schema::hasColumn('products', 'tab4_title')) {
                $table->string('tab4_title')->nullable()->after('tab3_content');
            }
            if (! Schema::hasColumn('products', 'tab4_content')) {
                $table->longText('tab4_content')->nullable()->after('tab4_title');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('products')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            $columns = [
                'questions',
                'nutrition_values',
                'meta_name_content',
                'schema_description',
                'schema_review',
                'schema_aggregate_rating',
                'tab1_title',
                'tab1_content',
                'tab2_title',
                'tab2_content',
                'tab3_title',
                'tab3_content',
                'tab4_title',
                'tab4_content',
            ];

            $existing = array_values(array_filter($columns, fn (string $col) => Schema::hasColumn('products', $col)));
            if (! empty($existing)) {
                $table->dropColumn($existing);
            }
        });
    }
};

