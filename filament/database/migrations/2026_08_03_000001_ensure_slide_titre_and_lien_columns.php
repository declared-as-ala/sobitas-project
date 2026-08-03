<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Guarantee that `slides.titre` and `slides.lien` exist.
 *
 * ── THE BUG THIS CLOSES ───────────────────────────────────────────────────────────────────
 * The owner reports, repeatedly: "I add a badge and a title in the admin, it says saved, and
 * nothing shows on the slide."
 *
 * Half of that was a frontend bug (the badge was saved but never mapped into the hero — see the
 * companion commit). The other half is this. Checked against the LIVE api, twice, with the
 * response cache bypassed via a dummy query param so a stale entry could not be mistaken for the
 * truth:
 *
 *     GET https://admin.protein.tn/api/slides?cb=987
 *       id=6   title=None  link=None  badge='New Products ! '  subtitle=<filled>  cta=<filled>
 *       id=11  title=None  link=None  badge='PRISE DE MASSE'   subtitle=<filled>  cta=<filled>
 *
 * Every field on that form rides ONE submit. Four of the six save. Exactly two come back NULL —
 * and those two, `titre` and `lien`, are precisely the two columns that appear in NO migration.
 * Every column that does have a migration (`sous_titre`, `cta_label`, `alt`, `badge`, `ordre`,
 * `is_active`, `image_mobile`) saves correctly.
 *
 * `slides` is one of the ~29 inherited tables from the deleted legacy app, so its real shape
 * exists only in production MySQL and cannot be read from this repository — see the standing
 * "get the schema into git" item, which this is now the third bug to depend on.
 *
 * ── WHY THIS IS SAFE EITHER WAY ───────────────────────────────────────────────────────────
 * `hasColumn` guards both additions, so:
 *   · if the columns are missing, they are created and the admin form starts working;
 *   · if they already exist, this is a no-op and NOTHING is altered — in particular no
 *     `->change()`, which in Laravel 11+ rewrites a column's full definition from the Blueprint
 *     and would silently discard an unknown legacy type, collation or length.
 * Nullable with no default, so no existing row is touched and no INSERT can start failing.
 *
 * If the columns turn out to already exist, this migration proves it harmlessly and the next
 * place to look is SlideResource's post-save verification, which now reports exactly which
 * attribute failed to persist instead of showing a green "saved" toast regardless.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('slides')) {
            return;
        }

        $added = [];

        Schema::table('slides', function (Blueprint $table) use (&$added) {
            if (! Schema::hasColumn('slides', 'titre')) {
                // 255 to match SlideResource's maxLength(255). A Textarea writes newlines
                // (the hero splits the first line white / the rest accent), which varchar holds
                // fine — TEXT is not needed and would cost an off-page read.
                $table->string('titre', 255)->nullable();
                $added[] = 'titre';
            }

            if (! Schema::hasColumn('slides', 'lien')) {
                $table->string('lien', 500)->nullable();
                $added[] = 'lien';
            }
        });

        Log::info('slides.ensure_editorial_columns', [
            'added' => $added,
            'note'  => $added === []
                ? 'both columns already existed — no schema change; the save failure is elsewhere'
                : 'created; the hero headline and button link can now be saved from the admin',
        ]);
    }

    /**
     * Deliberately NOT dropping the columns.
     *
     * This migration cannot know whether it created them or found them already present, and
     * `titre`/`lien` may be original legacy columns holding live content. A `down()` that drops
     * them would destroy the owner's hero copy on any rollback. Reversing it is a manual,
     * deliberate act.
     */
    public function down(): void
    {
        Log::info('slides.ensure_editorial_columns.down', [
            'note' => 'no-op by design — dropping titre/lien could destroy legacy hero content',
        ]);
    }
};
