<?php

namespace App\Console\Commands;

use App\Models\ExternalCatalogProduct;
use App\Services\Catalog\IHerb\IHerbNormalizer;
use Illuminate\Console\Command;

/**
 * What does the source ACTUALLY send? Counted, over every stored payload. Zero HTTP requests.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────────────────────
 * "The iHerb product endpoint returns fifteen keys" was a sentence in a docblock, written on
 * 10/08/2026 against three product ids. Every decision about what an imported product page can show
 * rests on it, and nothing re-checked it — so the day iHerb adds a `description` or a `media` array,
 * the pipeline keeps mapping the same fourteen fields and discards the new one on every row, in
 * silence, with the payload sitting unread in `source_payload` the whole time.
 *
 * This command reads that column. It reports, for every key any payload carries:
 *
 *   · how many rows carry it, and on how many of those it is non-empty (a key present on 100 % of
 *     rows and null on 99 % of them is not a field you can build a page on, and a bare key list
 *     cannot tell the two apart)
 *   · whether IHerbNormalizer reads it (KNOWN_PAYLOAD_KEYS is the authority — the same constant the
 *     normaliser derives `source_unmapped_keys` from, never a second list maintained here)
 *   · one real example value, truncated, so "we have that field" can be checked rather than assumed
 *
 * ── WHAT IT IS FOR, PRACTICALLY ───────────────────────────────────────────────────────────
 * The owner asked for "the full rich data". The honest answer depends on a measurement nobody had
 * taken: if this prints no description key, no ingredient key and no video key, then that data does
 * not exist upstream and no amount of mapping will produce it — and the page has to be built from
 * what we do hold. If it prints one, it is a column to add and a section to render, and the
 * `--renormalize` path lands it on every existing row for free.
 *
 * NESTED ONE LEVEL DEEP, no further. A payload that turns out to nest its interesting data (an
 * `attributes` object, say) would otherwise report one useless key called `attributes`; going deeper
 * than that would report array indices as if they were field names.
 */
class CatalogIHerbPayloadAudit extends Command
{
    protected $signature = 'catalog:iherb:payload-audit
                            {--limit=0 : Stop after N rows (0 = every hydrated row)}
                            {--unmapped-only : Print only the keys the normaliser does not read}
                            {--sample-width=48 : Characters of the example value to print}';

    protected $description = 'Count every key present in the stored iHerb payloads and say which ones we read';

    public function handle(): int
    {
        $limit = max(0, (int) $this->option('limit'));
        $width = max(12, (int) $this->option('sample-width'));

        /** @var array<string, array{rows: int, filled: int, mapped: bool, sample: ?string}> $keys */
        $keys = [];
        $rows = 0;
        $undecodable = 0;

        $query = ExternalCatalogProduct::query()
            ->whereNotNull('source_payload')
            ->orderBy('id');

        // chunkById: this loop writes nothing, but the table is being written to by hydration
        // workers while it runs, and an offset paginator over a growing table skips rows.
        $query->chunkById(200, function ($chunk) use (&$keys, &$rows, &$undecodable, $limit, $width): bool {
            foreach ($chunk as $row) {
                if ($limit > 0 && $rows >= $limit) {
                    return false;
                }

                $payload = $row->source_payload;
                if (is_string($payload)) {
                    $payload = json_decode($payload, true);
                }

                if (! is_array($payload) || $payload === []) {
                    $undecodable++;

                    continue;
                }

                $rows++;

                foreach ($this->flatten($payload) as $key => $value) {
                    if (! isset($keys[$key])) {
                        $keys[$key] = [
                            'rows' => 0,
                            'filled' => 0,
                            // A nested key is never in KNOWN_PAYLOAD_KEYS, and that is the correct
                            // answer: the normaliser reads top-level keys only, so `foo.bar` being
                            // reported as unmapped is a fact about the mapping, not a false alarm.
                            'mapped' => in_array($key, IHerbNormalizer::KNOWN_PAYLOAD_KEYS, true),
                            'sample' => null,
                        ];
                    }

                    $keys[$key]['rows']++;

                    if ($this->isFilled($value)) {
                        $keys[$key]['filled']++;
                        $keys[$key]['sample'] ??= $this->sample($value, $width);
                    }
                }
            }

            return true;
        });

        if ($rows === 0) {
            $this->warn('No stored payloads to audit — run catalog:iherb:hydrate first.');

            if ($undecodable > 0) {
                $this->line(sprintf('  %s row(s) had a source_payload that would not decode.', number_format($undecodable)));
            }

            return self::SUCCESS;
        }

        ksort($keys);

        $unmappedOnly = (bool) $this->option('unmapped-only');
        $table = [];
        $unmapped = 0;

        foreach ($keys as $key => $stat) {
            if (! $stat['mapped']) {
                $unmapped++;
            }

            if ($unmappedOnly && $stat['mapped']) {
                continue;
            }

            $table[] = [
                $key,
                $stat['mapped'] ? 'read' : 'IGNORED',
                sprintf('%s (%.1f%%)', number_format($stat['rows']), $stat['rows'] / $rows * 100),
                sprintf('%s (%.1f%%)', number_format($stat['filled']), $stat['filled'] / $rows * 100),
                $stat['sample'] ?? '—',
            ];
        }

        $this->line('');
        $this->line(sprintf('%s payload(s) read. No HTTP requests were made.', number_format($rows)));
        $this->line('');
        $this->table(['key', 'normaliser', 'present on', 'non-empty on', 'example value'], $table);

        // The whole point of the run, stated rather than left to be read off a table.
        if ($unmapped === 0) {
            $this->info('Every key the source sent is read by IHerbNormalizer. There is no unread data in source_payload.');
        } else {
            $this->warn(sprintf(
                '%d key(s) are present in the payloads and read by nothing. Decide for each one: map it '
                .'(add it to IHerbNormalizer + a nullable column, then run catalog:iherb:hydrate '
                .'--renormalize, which costs no request), or record why it stays in staging.',
                $unmapped,
            ));
        }

        // Absence is the finding people actually need, so it is asserted here rather than inferred
        // from a table that does not contain the row you were looking for.
        $wanted = ['description', 'ingredients', 'supplementFacts', 'nutrition', 'video', 'videos', 'media', 'images', 'imageCount'];
        $missing = array_values(array_filter($wanted, static fn (string $w): bool => ! isset($keys[$w])));

        if ($missing !== []) {
            $this->line('');
            $this->line(
                'Absent from EVERY payload read: '.implode(', ', $missing).'.'
            );
            $this->line(
                '  These are the fields a "rich" product page would need. They are not in this source, '
                .'so they cannot be mapped — they have to be transcribed from a label or entered by hand.'
            );
        }

        if ($undecodable > 0) {
            $this->line('');
            $this->warn(sprintf('%s row(s) had a source_payload that would not decode and were skipped.', number_format($undecodable)));
        }

        return self::SUCCESS;
    }

    /**
     * Top-level keys, plus one level of nesting as `parent.child`.
     *
     * A list value is reported under its parent key only — an `images` array must show up as
     * "images", present on N rows, not as images.0, images.1, images.2 pretending to be fields.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function flatten(array $payload): array
    {
        $out = [];

        foreach ($payload as $key => $value) {
            $key = (string) $key;
            $out[$key] = $value;

            if (is_array($value) && $value !== [] && ! array_is_list($value)) {
                foreach ($value as $childKey => $childValue) {
                    $out[$key.'.'.$childKey] = $childValue;
                }
            }
        }

        return $out;
    }

    /** Present-and-blank is not present. An empty string is what a missing field usually looks like. */
    private function isFilled(mixed $value): bool
    {
        if ($value === null || $value === [] || $value === false) {
            return false;
        }

        return ! (is_string($value) && trim($value) === '');
    }

    private function sample(mixed $value, int $width): string
    {
        $text = match (true) {
            is_bool($value) => $value ? 'true' : 'false',
            is_array($value) => 'array('.count($value).')',
            default => (string) $value,
        };

        $text = trim(preg_replace('~\s+~u', ' ', $text) ?? $text);

        return mb_strlen($text) <= $width ? $text : mb_substr($text, 0, $width - 1).'…';
    }
}
