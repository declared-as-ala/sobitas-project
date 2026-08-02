<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Supply values for legacy NOT NULL columns that have no default, so an INSERT cannot be rejected.
 *
 * ── THE FAILURE THIS PREVENTS ─────────────────────────────────────────────────────────────
 * The commercial tables — products, commandes, clients, factures, reviews, slides, articles,
 * categs — are NOT in version control. 151 migrations create 44 tables and none of them are these;
 * every one is inherited from the deleted legacy application and only ever `Schema::table`-altered.
 * So their column definitions are whatever the old app left in production MySQL, including columns
 * that are NOT NULL with no DEFAULT and no form field anywhere in Filament.
 *
 * config/database.php sets `'strict' => true`. Under strict mode an INSERT that omits such a column
 * fails with:
 *
 *     SQLSTATE[HY000]: General error: 1364 Field 'xxx' doesn't have a default value
 *
 * That is a QueryException, so Laravel's handler renders its styled 500 page — and Livewire, which
 * expects JSON, reports it to the admin as "Erreur lors du chargement de la page". It affects
 * CREATE only: an UPDATE writes just the dirty columns, so editing an existing row keeps working,
 * which is exactly the shape of the bug the owner reported ("the client is trying to ADD new
 * products").
 *
 * The `Slide` model already documents this exact trap and hard-codes one column's way around it:
 *
 *     protected $attributes = ['type' => 'web'];
 *     // "…if it is NOT NULL with no default, MySQL strict mode would throw SQLSTATE[HY000] 1364
 *     //  on every insert and no slide could be created from the admin again."
 *
 * That fix required someone to already know which column was at fault. This one does not: it asks
 * the database which columns are mandatory and fills the ones nobody supplied. Same outcome as
 * MySQL's own non-strict behaviour, without turning strict mode off globally — which would also
 * silence genuine truncation and type errors that we DO want to hear about.
 *
 * ── WHAT IT DELIBERATELY DOES NOT DO ──────────────────────────────────────────────────────
 * • It never overwrites a value that was supplied. Only absent-or-null keys are touched.
 * • It never touches the primary key, auto-increment columns, or generated columns.
 * • It never touches a NULLABLE column — a null there is a real, intended value.
 * • It swallows every failure. If introspection breaks, the save proceeds exactly as before; a
 *   broken safety net must not become a broken save.
 *
 * This is a mitigation, not the cure. The cure is getting these tables into migrations
 * (`mysqldump --no-data`), after which this class should stop finding anything to fill — and the
 * log line below is how you confirm that.
 */
final class LegacyColumnDefaults
{
    /** Column metadata rarely changes; one query per table per hour is plenty. */
    private const CACHE_TTL = 3600;

    /**
     * Laravel manages these itself, or they are meaningless to default.
     * `deleted_at` is excluded because a NOT NULL soft-delete column would be a schema bug we must
     * not paper over by writing an epoch date into it.
     */
    private const NEVER_FILL = ['created_at', 'updated_at', 'deleted_at'];

    /**
     * Fill mandatory columns missing from an attribute array.
     *
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    public static function fill(string $table, array $attributes): array
    {
        try {
            $required = self::requiredColumns($table);
        } catch (Throwable $e) {
            Log::warning('legacy_defaults.introspection_failed', [
                'table' => $table,
                'error' => $e->getMessage(),
            ]);

            return $attributes;
        }

        $filled = [];

        foreach ($required as $column => $default) {
            // Absent OR explicitly null: both are rejected by a NOT NULL column, and neither can
            // be what the user meant, because the column offers no way to express "nothing".
            if (! array_key_exists($column, $attributes) || $attributes[$column] === null) {
                $attributes[$column] = $default;
                $filled[$column] = $default;
            }
        }

        if ($filled !== []) {
            // Logged at info, always. This is the only visibility into which legacy columns are
            // still mandatory-without-a-default, and it is what tells you the schema has been
            // brought under migration control: when this stops appearing, the mitigation is dead
            // weight and can be removed.
            Log::info('legacy_defaults.filled', [
                'table' => $table,
                'columns' => array_keys($filled),
            ]);
        }

        return $attributes;
    }

    /** Convenience for a model instance — fills straight onto the model before it is saved. */
    public static function fillModel(Model $model): void
    {
        $filled = self::fill($model->getTable(), $model->getAttributes());

        foreach ($filled as $key => $value) {
            if (! array_key_exists($key, $model->getAttributes()) || $model->getAttributes()[$key] === null) {
                $model->setAttribute($key, $value);
            }
        }
    }

    /**
     * Mandatory columns for a table, mapped to a type-appropriate zero value.
     *
     * @return array<string, mixed>
     */
    private static function requiredColumns(string $table): array
    {
        return Cache::remember(
            "legacy_required_columns:{$table}",
            self::CACHE_TTL,
            static function () use ($table): array {
                $rows = DB::select(
                    'SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, EXTRA, COLUMN_KEY
                       FROM information_schema.COLUMNS
                      WHERE TABLE_SCHEMA = DATABASE()
                        AND TABLE_NAME = ?
                        AND IS_NULLABLE = \'NO\'
                        AND COLUMN_DEFAULT IS NULL',
                    [$table]
                );

                $required = [];

                foreach ($rows as $row) {
                    $name = (string) $row->COLUMN_NAME;
                    $extra = strtolower((string) ($row->EXTRA ?? ''));

                    // The PK and anything the database generates for us must never be written.
                    if (
                        in_array($name, self::NEVER_FILL, true)
                        || str_contains($extra, 'auto_increment')
                        || str_contains($extra, 'generated')
                        || (string) ($row->COLUMN_KEY ?? '') === 'PRI'
                    ) {
                        continue;
                    }

                    $required[$name] = self::zeroValueFor(
                        strtolower((string) $row->DATA_TYPE),
                        (string) ($row->COLUMN_TYPE ?? '')
                    );
                }

                return $required;
            }
        );
    }

    /**
     * The value MySQL itself would have inserted with strict mode off — nothing more inventive.
     * Anything unrecognised falls back to the empty string, which every string-ish type accepts.
     */
    private static function zeroValueFor(string $dataType, string $columnType): mixed
    {
        return match ($dataType) {
            'tinyint', 'smallint', 'mediumint', 'int', 'integer', 'bigint', 'bit' => 0,
            'decimal', 'numeric', 'float', 'double', 'real' => 0,
            'year' => (int) date('Y'),
            'date' => date('Y-m-d'),
            'datetime', 'timestamp' => date('Y-m-d H:i:s'),
            'time' => '00:00:00',
            // An ENUM rejects '' unless '' is one of its members, so take the first declared value.
            'enum', 'set' => self::firstEnumMember($columnType),
            // MySQL 5.7+ rejects '' as invalid JSON; the empty object is the valid analogue.
            'json' => '{}',
            default => '',
        };
    }

    /** `enum('web','mobile')` → `web`. Returns '' when the definition cannot be parsed. */
    private static function firstEnumMember(string $columnType): string
    {
        if (preg_match("/^(?:enum|set)\(\s*'((?:[^'\\\\]|\\\\.)*)'/i", $columnType, $m) === 1) {
            return stripslashes($m[1]);
        }

        return '';
    }
}
