<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const INSANE_LABZ = 'Insane Labz';

    public function up(): void
    {
        $insaneLabzId = $this->insaneLabzId();
        if ($insaneLabzId === null) {
            $insaneLabzId = DB::table('brands')->insertGetId([
                'designation_fr' => self::INSANE_LABZ,
                'slug' => 'insane-labz',
                'match_key' => 'insane labz',
                'external_code' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            echo "[brand-refile] created Insane Labz brand {$insaneLabzId}\n";
        }

        $this->move(391, 'psychotic-pre-workout', 27, $insaneLabzId);
        $this->move(491, 'best-zma-120-caps-scenit-nutrition', 23, 37);
        $this->move(527, 'magnesium-vitamin-b6-90-tablets', 26, 62);
    }

    public function down(): void
    {
        $insaneLabzId = $this->insaneLabzId();
        if ($insaneLabzId !== null) {
            $this->move(391, 'psychotic-pre-workout', $insaneLabzId, 27);
        }
        $this->move(491, 'best-zma-120-caps-scenit-nutrition', 37, 23);
        $this->move(527, 'magnesium-vitamin-b6-90-tablets', 62, 26);
    }

    private function insaneLabzId(): ?int
    {
        $brand = DB::table('brands')
            ->select('id', 'designation_fr')
            ->get()
            ->first(fn ($brand): bool => preg_match('/insane\s*labz/i', (string) $brand->designation_fr) === 1);

        return $brand ? (int) $brand->id : null;
    }

    private function move(int $id, string $slug, int $from, int $to): void
    {
        $moved = DB::table('products')
            ->where('id', $id)
            ->where('slug', $slug)
            ->where('brand_id', $from)
            ->update(['brand_id' => $to, 'updated_at' => now()]);

        echo "[brand-refile] product {$id}: {$moved} row(s) moved from {$from} to {$to}\n";
    }
};
