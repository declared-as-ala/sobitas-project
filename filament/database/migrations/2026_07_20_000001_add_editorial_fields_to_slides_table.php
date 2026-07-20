<?php

use App\Filament\Support\ImagePath;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Make the homepage hero slider fully admin-managed.
 *
 * The Filament SlideResource, the /slides endpoint and the frontend getSlides() fetcher all
 * already existed, but the storefront never called them — app/page.tsx hardcoded two local
 * slides. Wiring it up needs four things the table does not have: an explicit order, an
 * on/off switch, and the editorial text that the hero currently hardcodes in JSX.
 *
 * ALSO changes the content model from "two rows per slide" to "one row per slide".
 * Until now a single campaign needed TWO rows — one `type=mobile`, one `type=web` — which is
 * confusing for a non-technical admin (forget the second row and the phone hero breaks). A
 * slide is now ONE row with a desktop `image` plus an optional `image_mobile` crop. `type` is
 * kept (not dropped) so nothing existing breaks and the column can be retired later.
 *
 * Every step is guarded with hasTable/hasColumn so the migration is safely re-runnable, and
 * the data backfill is idempotent.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('slides')) {
            return;
        }

        Schema::table('slides', function (Blueprint $table) {
            // Explicit display order. The API previously sorted by `id`, and the frontend
            // already sorted by a nonexistent `ordre` field (a no-op) — this makes it real.
            if (! Schema::hasColumn('slides', 'ordre')) {
                $table->unsignedInteger('ordre')->default(0)->index();
            }

            // Lets the owner stage a slide without deleting it. Defaults to TRUE so the
            // existing live slides do NOT vanish the moment this runs.
            if (! Schema::hasColumn('slides', 'is_active')) {
                $table->boolean('is_active')->default(true)->index();
            }

            // Optional phone crop. A 21:9 desktop shot centre-cropped into a 4:5 phone
            // viewport loses the subject, so a dedicated crop matters. Falls back to `image`.
            if (! Schema::hasColumn('slides', 'image_mobile')) {
                $table->string('image_mobile')->nullable();
            }

            // Editorial text, rendered as real HTML over the image (NOT baked into the
            // picture) so it reflows on mobile, is indexable, and is readable by screen
            // readers. All nullable — a blank slide is simply image-only.
            if (! Schema::hasColumn('slides', 'sous_titre')) {
                $table->string('sous_titre', 500)->nullable();
            }
            if (! Schema::hasColumn('slides', 'cta_label')) {
                $table->string('cta_label', 120)->nullable();
            }
            if (! Schema::hasColumn('slides', 'alt')) {
                $table->string('alt', 255)->nullable();
            }
        });

        $this->backfillOrdre();
        $this->mergeLegacyMobileRows();
    }

    /**
     * Seed `ordre` from `id` so the current display order (the API's old orderBy('id')) is
     * preserved exactly. Only touches rows still at the 0 default, so re-running is a no-op
     * and never clobbers an order the owner has since set by hand.
     */
    private function backfillOrdre(): void
    {
        if (! Schema::hasColumn('slides', 'ordre')) {
            return;
        }

        DB::table('slides')->where('ordre', 0)->orderBy('id')->get(['id'])
            ->each(function ($slide, $index) {
                DB::table('slides')->where('id', $slide->id)->update(['ordre' => $index + 1]);
            });
    }

    /**
     * Fold the legacy `type=mobile` rows into their desktop counterparts as `image_mobile`.
     *
     * Deliberately conservative: it only runs for the unambiguous 1-web/1-mobile pairing that
     * exists today, and it DEACTIVATES the legacy row rather than deleting it, so the row is
     * recoverable if this reads the pairing wrong. Anything more complex is left alone for the
     * owner to sort out in the admin, which is safer than guessing.
     *
     * It COPIES the underlying file rather than pointing both rows at the same path. Sharing a
     * path would leave the deactivated legacy row looking like junk in the admin while still
     * owning the live slide's mobile asset — deleting it (a completely reasonable tidy-up)
     * would then purge the file the active slide depends on, unrecoverably. Two rows must
     * never share an asset.
     */
    private function mergeLegacyMobileRows(): void
    {
        // Guards every column the merge writes or reads, not just the ones it keys off — a
        // partially-applied Schema::table above would otherwise abort mid-merge on is_active.
        foreach (['image_mobile', 'type', 'is_active'] as $required) {
            if (! Schema::hasColumn('slides', $required)) {
                return;
            }
        }

        $mobiles = DB::table('slides')->where('type', 'mobile')->orderBy('id')->get();
        $webs    = DB::table('slides')->where('type', 'web')->orderBy('id')->get();

        if ($mobiles->count() !== 1 || $webs->count() !== 1) {
            Log::info('slides.legacy_merge_skipped', [
                'reason'  => 'ambiguous pairing — left untouched for manual review',
                'mobiles' => $mobiles->count(),
                'webs'    => $webs->count(),
            ]);

            return;
        }

        $mobile = $mobiles->first();
        $web    = $webs->first();

        // Idempotent: if the desktop row already carries a mobile crop, there is nothing to do.
        if (! empty($web->image_mobile) || empty($mobile->image)) {
            return;
        }

        // Duplicate the asset so each row owns its own file.
        //
        // The fallback stores the NORMALIZED path, never the raw column value: this table can
        // hold full https://admin.protein.tn/storage/... URLs, DB::table() bypasses the model's
        // setImageMobileAttribute mutator, and the API resolves image_mobile through
        // ImagePath::normalizeExisting() — which would treat an un-normalized URL as a missing
        // file and silently drop the mobile crop.
        $source = ImagePath::normalize($mobile->image);
        $target = $source;

        // A disk failure here must NOT abort the deploy: the migration would half-apply and the
        // whole container start fails. Degrading to the shared path is safe because
        // SlideResource::purgeImages refuses to delete a file another slide still references.
        try {
            if ($source && Storage::disk('public')->exists($source)) {
                $extension = pathinfo($source, PATHINFO_EXTENSION) ?: 'webp';
                $candidate = 'slides/' . Str::uuid() . '.' . $extension;

                if (Storage::disk('public')->copy($source, $candidate)) {
                    $target = $candidate;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('slides.legacy_merge_copy_failed', [
                'source' => $source,
                'error'  => $e->getMessage(),
                'note'   => 'falling back to a shared path — purgeImages reference-guard protects it',
            ]);
        }

        // Deactivate FIRST. The early return above keys off `image_mobile` being set, so if the
        // process died between the two writes with image_mobile written first, every later
        // re-run would short-circuit and the legacy row would stay active forever — serving a
        // portrait crop as a second full-width desktop slide. Ordering it this way makes a
        // partial failure recoverable: the retry still finds the row and completes the merge.
        DB::table('slides')->where('id', $mobile->id)->update(['is_active' => false]);
        DB::table('slides')->where('id', $web->id)->update(['image_mobile' => $target]);

        Log::info('slides.legacy_merge_applied', [
            'web_id'      => $web->id,
            'mobile_id'   => $mobile->id,
            'copied_from' => $source,
            'copied_to'   => $target,
            'note'        => $target === $source
                ? 'copy skipped or failed — path shared; purgeImages reference-guard protects it'
                : 'asset duplicated so the two rows share no file',
        ]);
    }

    public function down(): void
    {
        if (! Schema::hasTable('slides')) {
            return;
        }

        Schema::table('slides', function (Blueprint $table) {
            foreach (['ordre', 'is_active', 'image_mobile', 'sous_titre', 'cta_label', 'alt'] as $column) {
                if (Schema::hasColumn('slides', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
