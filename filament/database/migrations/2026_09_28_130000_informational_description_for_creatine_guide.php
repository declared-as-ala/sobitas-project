<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Finish retargeting /creatine-monohydrate-tunisie away from the /creatine category's intent.
 *
 * commercialSeoMap marks this CMS page `retarget`: /creatine owns "créatine (monohydrate) tunisie".
 * Its title and H1 were already made informational (cmsPageSeoConfig), and its footer anchor reads
 * "Guide : la créatine monohydrate" — but the stored meta description still sold the category's
 * query: "Créatine monohydrate en Tunisie : guide expert 2026, … comparatif des marques et prix TND".
 * Search Console (3 months to 22/09/2026): this guide at position 13.4 vs /creatine at 24.1 — the
 * guide was out-ranking the page that should own the term.
 *
 * The replacement describes only what the page's own title promises. Guarded on the old text so a
 * description the owner rewrote by hand is never overwritten.
 */
return new class extends Migration
{
    private const SLUG = 'creatine-monohydrate-tunisie';

    private const OLD_PREFIX = 'Créatine monohydrate en Tunisie : guide expert 2026';

    private const NEW = 'Comprendre les formes de créatine monohydrate et savoir lire une étiquette : le guide Protein.tn pour bien choisir avant d\'acheter.';

    public function up(): void
    {
        if (! Schema::hasTable('pages') || ! Schema::hasColumn('pages', 'meta_description')) {
            return;
        }

        $n = DB::table('pages')
            ->where('slug', self::SLUG)
            ->where('meta_description', 'like', self::OLD_PREFIX.'%')
            ->update(['meta_description' => self::NEW, 'updated_at' => now()]);

        echo "[creatine-guide-description] {$n} row(s) updated\n";
    }

    public function down(): void
    {
        // Not restored: the old text is the cannibalising one.
    }
};
