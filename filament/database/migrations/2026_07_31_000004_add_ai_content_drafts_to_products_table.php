<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Draft columns for AI-assisted product copy.
 *
 * Generation writes HERE, never to the live `description_fr` / `faq`. Nothing a model produces
 * reaches a customer or Googlebot until a human approves it in Filament, which is both the
 * quality gate and what keeps this on the right side of Google's scaled-content-abuse policy:
 * the problem there is mass-published low-value pages, not the use of a model.
 *
 * Note the columns deliberately added: there is no place to draft nutrition values. Supplement
 * Facts are numbers people dose themselves on, and no product in this catalogue carries a barcode
 * (gtin/sku/mpn/code_product are empty on all 40 sampled), so there is no reliable external source
 * to join against either — a name-match probe against Open Food Facts returned a plausible hit for
 * 2 of 8 products. Those must be typed from the physical label, so they stay a manual admin field.
 *
 * Uses the repo's guarded-migration convention. Schema::hasColumn is used only to skip work, never
 * to gate correctness — it has proven unreliable in this environment, so every add is also wrapped.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'ai_description_draft')) {
                $table->longText('ai_description_draft')->nullable();
            }
            if (! Schema::hasColumn('products', 'ai_faq_draft')) {
                $table->json('ai_faq_draft')->nullable();
            }
            if (! Schema::hasColumn('products', 'ai_generated_at')) {
                $table->timestamp('ai_generated_at')->nullable();
            }
            if (! Schema::hasColumn('products', 'ai_review_status')) {
                // pending | approved | rejected. Null = never generated.
                $table->string('ai_review_status', 20)->nullable()->index();
            }
            if (! Schema::hasColumn('products', 'ai_model')) {
                // Which model produced the draft — needed to re-run only what an older model wrote.
                $table->string('ai_model', 60)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            foreach (['ai_description_draft', 'ai_faq_draft', 'ai_generated_at', 'ai_review_status', 'ai_model'] as $col) {
                if (Schema::hasColumn('products', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
