<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Rebrand: replace the legacy "SOBITAS" brand token with "Protein.tn" in the
 * ONLINE-facing company text on the coordinates (company info) record.
 *
 * Scope is deliberate — the store owner's rule is: online identity = Protein.tn,
 * but SOBITAS stays for the legal entity / local shop.
 *
 *   Rebranded (online marketing text):
 *     - short_description_fr   "PROTEINE TUNISIE - SOBITAS …"  -> "… Protein.tn …"
 *     - store_text_fr          "SOBITAS App …"                 -> "Protein.tn App …"
 *
 *   Left untouched ON PURPOSE:
 *     - short_description_ticket / footer_ticket — printed on the LOCAL shop's POS
 *       receipts (print/ticket.blade.php); SOBITAS is the correct legal/local name there.
 *     - *_link / playstore_link / appstore_link / maps embed — social handles + the
 *       real published Android package (io.abdelbari.sobitas). The owner confirms these
 *       separately; the app id cannot change without republishing.
 *     - designation_fr — company/legal display name (not part of the leak).
 *
 * Idempotent: only rows still containing the exact token are updated; MySQL REPLACE()
 * is case-sensitive so re-running (or running on already-clean data) is a no-op.
 */
return new class extends Migration
{
    private const COLUMNS = ['short_description_fr', 'store_text_fr'];

    public function up(): void
    {
        if (! Schema::hasTable('coordinates')) {
            return;
        }

        $changed = false;
        foreach (self::COLUMNS as $col) {
            if (! Schema::hasColumn('coordinates', $col)) {
                continue;
            }
            try {
                $affected = DB::table('coordinates')
                    ->where($col, 'like', '%SOBITAS%')
                    ->update([
                        $col => DB::raw(
                            "REPLACE(REPLACE(`{$col}`, 'SOBITAS', 'Protein.tn'), 'Sobitas', 'Protein.tn')"
                        ),
                    ]);
                $changed = $changed || $affected > 0;
            } catch (\Throwable $e) {
                Log::error("rebrand coordinates.{$col} failed (continuing)", ['error' => $e->getMessage()]);
            }
        }

        // The Coordinate singleton is cached for 1h and a raw UPDATE does not fire the
        // model's saved() event that clears it — forget it so the change surfaces at once.
        if ($changed) {
            Cache::forget('coordinate:singleton');
        }
    }

    public function down(): void
    {
        // No safe automatic rollback: we cannot know which "Protein.tn" tokens were
        // originally "SOBITAS". Intentionally a no-op.
    }
};
