<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const SLUG = 'politique-de-confidentialite';
    private const TITLE = 'Politique de confidentialité';

    public function up(): void
    {
        if (DB::table('pages')->where('slug', self::SLUG)->exists()) {
            echo "[privacy-policy] page already exists — skipped\n";

            return;
        }

        $cookies = DB::table('pages')->where('slug', 'politique-des-cookies')->first();
        if (! $cookies) {
            throw new RuntimeException('Cookie policy page is missing; cannot copy its author convention.');
        }

        $body = file_get_contents(base_path('resources/seo/pages/politique-de-confidentialite.html'));
        if ($body === false) {
            throw new RuntimeException('Privacy policy HTML body is missing.');
        }

        DB::table('pages')->insert([
            'author_id' => $cookies->author_id,
            'title' => self::TITLE,
            'excerpt' => 'Cette politique explique quelles données personnelles Protein.tn collecte lorsque vous visitez le site, créez un compte ou passez une commande, pourquoi nous les utilisons, avec qui elles sont partagées et comment exercer vos droits. Elle complète nos conditions générales de vente et notre politique des cookies.',
            'body' => $body,
            'body_editor_type' => 'html',
            'image' => null,
            'slug' => self::SLUG,
            'meta_title' => 'Politique de confidentialité | Protein.tn — SOBITAS Tunisie',
            'meta_description' => 'Données collectées par Protein.tn, finalités, destinataires, durées de conservation et vos droits (loi n° 2004-63). Contact : contact@protein.tn.',
            'meta_keywords' => null,
            'canonical_url' => null,
            'robots_index' => true,
            'robots_follow' => true,
            'og_title' => null,
            'og_description' => null,
            'og_image' => null,
            'status' => 'ACTIVE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        echo "[privacy-policy] page published\n";
    }

    public function down(): void
    {
        $deleted = DB::table('pages')
            ->where('slug', self::SLUG)
            ->where('title', self::TITLE)
            ->delete();

        echo "[privacy-policy] {$deleted} page(s) removed\n";
    }
};
