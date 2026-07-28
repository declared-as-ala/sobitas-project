<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Clear every stored canonical_url that points AWAY from protein.tn.
 *
 * A canonical pointing at another host tells Google "that other page owns this content — do not
 * rank this one". Four live CMS pages were doing exactly that:
 *
 *   pages id=2 conditions-generale-de-ventes-protein -> https://sobitas.tn/...
 *   pages id=7 politique-de-remboursement            -> https://sobitas.tn/...
 *   pages id=8 politique-des-cookies                 -> https://sobitas.tn/...
 *   pages id=9 proteine-tunisie                      -> https://sobitas.tn/...
 *
 * They are leftovers from the sobitas.tn -> protein.tn rebrand. The frontend already refuses to
 * emit them (util/canonical.ts resolveCanonicalUrl falls back to the self canonical), but that
 * guard is a safety net, not a fix: the wrong value is still what the admin UI shows, still what
 * any new consumer of the API would read, and the guard's admin-redirect check fails open during
 * `next build` — so a build-time bake could still emit the bad value until the first runtime
 * revalidation. Deleting the data is the durable fix.
 *
 * SCOPE — deliberately host-based, not an id list. Every table below can feed a rel=canonical, and
 * the same rebrand could have left the same residue in any of them. A NULL canonical_url makes the
 * app fall back to `https://protein.tn/{slug}`, which is what these rows should have said all along
 * (the field's own helper text in Filament says "Laissez vide pour utiliser https://protein.tn/{slug}").
 *
 * SAFETY:
 *   • Only rows whose canonical host is NOT protein.tn are touched. A row that already self-
 *     canonicalises, or points to another protein.tn page on purpose, is left exactly as it is.
 *   • Relative values ('/whey-proteine') have no host, so they are NOT touched here — they are a
 *     different problem and the frontend guard handles them.
 *   • Idempotent: re-running matches nothing once cleared.
 *   • Every affected row is dumped to the migration log BEFORE the update, so the change is
 *     auditable and reversible by hand if a value turns out to have been intentional.
 */
return new class extends Migration
{
    /** table => the column holding the row's own slug, used only for the audit log. */
    private const TARGETS = [
        'pages' => 'slug',
        'categs' => 'slug',
        'sous_categories' => 'slug',
        'products' => 'slug',
        'blog_categories' => 'slug',
        'blog_tags' => 'slug',
        'articles' => 'slug',
    ];

    public function up(): void
    {
        foreach (self::TARGETS as $table => $slugColumn) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'canonical_url')) {
                continue;
            }

            $select = ['id', 'canonical_url'];
            if (Schema::hasColumn($table, $slugColumn)) {
                $select[] = $slugColumn;
            }

            // Pull candidates and decide in PHP: parse_url is far more trustworthy than trying to
            // express "host is not protein.tn" in portable SQL across MySQL versions.
            $rows = DB::table($table)
                ->select($select)
                ->whereNotNull('canonical_url')
                ->where('canonical_url', '<>', '')
                ->get();

            $offDomainIds = [];
            foreach ($rows as $row) {
                $host = parse_url(trim((string) $row->canonical_url), PHP_URL_HOST);
                if (! $host) {
                    continue; // relative or unparseable — out of scope, see the note above
                }
                $host = strtolower(preg_replace('/^www\./i', '', $host));
                if ($host === 'protein.tn') {
                    continue;
                }
                $offDomainIds[] = $row->id;
                echo sprintf(
                    "[canonical-cleanup] %s#%d (%s): clearing %s\n",
                    $table,
                    $row->id,
                    $row->{$slugColumn} ?? '?',
                    $row->canonical_url
                );
            }

            if ($offDomainIds !== []) {
                DB::table($table)->whereIn('id', $offDomainIds)->update(['canonical_url' => null]);
                echo sprintf("[canonical-cleanup] %s: cleared %d row(s)\n", $table, count($offDomainIds));
            }
        }
    }

    public function down(): void
    {
        // Not reversible: the old values were wrong by definition (they pointed off-domain) and
        // restoring them would re-break the canonicals. The pre-update values are in the migration
        // log above, and every deploy takes an automatic mysqldump first.
    }
};
