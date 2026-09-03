<?php

use App\Support\ApiResponseCache;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['desktop', 'mobile'] as $format) {
            $filename = "welcome-bonus-{$format}-v1.webp";
            $bytes = file_get_contents(resource_path('slide-assets/2026-09-03/'.$filename));
            if ($bytes === false || ! Storage::disk('public')->put('slides/'.$filename, $bytes, ['visibility' => 'public'])) {
                throw new \RuntimeException('Welcome campaign asset could not be installed.');
            }
        }
        DB::table('slides')->updateOrInsert(['lien' => '/register?offer=welcome-15'], [
            'type' => 'web',
            'image' => 'slides/welcome-bonus-desktop-v1.webp',
            'image_mobile' => 'slides/welcome-bonus-mobile-v1.webp',
            'alt' => 'Créez votre compte Protein.tn : 15 DT offerts en points fidélité après vérification du téléphone, à utiliser sur vos prochains achats.',
            'is_active' => true,
            // Append rather than replacing the existing LCP campaign or other slides.
            'ordre' => ((int) DB::table('slides')->max('ordre')) + 1,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        ApiResponseCache::forget('slides');
    }

    public function down(): void
    {
        DB::table('slides')->where('lien', '/register?offer=welcome-15')->update(['is_active' => false]);
        ApiResponseCache::forget('slides');
    }
};
