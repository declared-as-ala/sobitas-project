<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('products')) {
            return;
        }

        Schema::table('products', function (Blueprint $table): void {
            if (! Schema::hasColumn('products', 'seo_title')) {
                $table->string('seo_title', 255)->nullable()->after('meta_title');
            }
            if (! Schema::hasColumn('products', 'seo_description')) {
                $table->string('seo_description', 500)->nullable()->after('meta_description');
            }
            if (! Schema::hasColumn('products', 'seo_excerpt')) {
                $table->text('seo_excerpt')->nullable()->after('seo_description');
            }
            if (! Schema::hasColumn('products', 'seo_canonical_url')) {
                $table->string('seo_canonical_url', 1024)->nullable()->after('seo_excerpt');
            }
            if (! Schema::hasColumn('products', 'seo_robots_index')) {
                $table->boolean('seo_robots_index')->nullable()->after('seo_canonical_url');
            }
            if (! Schema::hasColumn('products', 'seo_robots_follow')) {
                $table->boolean('seo_robots_follow')->nullable()->after('seo_robots_index');
            }

            if (! Schema::hasColumn('products', 'og_title')) {
                $table->string('og_title', 255)->nullable()->after('seo_robots_follow');
            }
            if (! Schema::hasColumn('products', 'og_description')) {
                $table->string('og_description', 500)->nullable()->after('og_title');
            }
            if (! Schema::hasColumn('products', 'og_image')) {
                $table->string('og_image', 1024)->nullable()->after('og_description');
            }

            if (! Schema::hasColumn('products', 'twitter_title')) {
                $table->string('twitter_title', 255)->nullable()->after('og_image');
            }
            if (! Schema::hasColumn('products', 'twitter_description')) {
                $table->string('twitter_description', 500)->nullable()->after('twitter_title');
            }
            if (! Schema::hasColumn('products', 'twitter_image')) {
                $table->string('twitter_image', 1024)->nullable()->after('twitter_description');
            }
            if (! Schema::hasColumn('products', 'twitter_card')) {
                $table->string('twitter_card', 32)->nullable()->after('twitter_image');
            }

            if (! Schema::hasColumn('products', 'sku')) {
                $table->string('sku', 120)->nullable()->after('code_product');
            }
            if (! Schema::hasColumn('products', 'gtin')) {
                $table->string('gtin', 64)->nullable()->after('sku');
            }
            if (! Schema::hasColumn('products', 'mpn')) {
                $table->string('mpn', 120)->nullable()->after('gtin');
            }
            if (! Schema::hasColumn('products', 'item_condition')) {
                $table->string('item_condition', 64)->nullable()->after('mpn');
            }
            if (! Schema::hasColumn('products', 'availability_override')) {
                $table->string('availability_override', 64)->nullable()->after('item_condition');
            }
            if (! Schema::hasColumn('products', 'price_valid_until')) {
                $table->date('price_valid_until')->nullable()->after('availability_override');
            }
            if (! Schema::hasColumn('products', 'seo_image_alt')) {
                $table->string('seo_image_alt', 255)->nullable()->after('price_valid_until');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('products')) {
            return;
        }

        Schema::table('products', function (Blueprint $table): void {
            foreach ([
                'seo_title',
                'seo_description',
                'seo_excerpt',
                'seo_canonical_url',
                'seo_robots_index',
                'seo_robots_follow',
                'og_title',
                'og_description',
                'og_image',
                'twitter_title',
                'twitter_description',
                'twitter_image',
                'twitter_card',
                'sku',
                'gtin',
                'mpn',
                'item_condition',
                'availability_override',
                'price_valid_until',
                'seo_image_alt',
            ] as $column) {
                if (Schema::hasColumn('products', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

