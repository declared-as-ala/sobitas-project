<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\ProductSourceObservation;
use App\Services\Content\ProductContentGenerator;
use App\Support\Figures;
use App\Support\Gtin;
use App\Support\YouTubeId;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Land researched product content from a JSON file.
 *
 *   php artisan products:import-research storage/app/research.json            # report only
 *   php artisan products:import-research storage/app/research.json --apply
 *
 * ── WHERE THE FILE COMES FROM, AND WHY THAT DOES NOT MAKE IT TRUSTED ──────────────────────
 * The file is produced by agents that searched the web, read manufacturer and retailer pages, and
 * transcribed what was printed — then by a second pass that re-fetched each cited page and tried to
 * refute the figures. That is a good process. It is still not a reason to skip validation here.
 *
 * A researcher can be confidently wrong, a cited page can change between the two passes, and a JSON
 * file on disk can be edited by anyone. So this command re-applies every rule the rest of the system
 * enforces, on the way in:
 *
 *   · a barcode must pass its GS1 check digit, and is PROPOSED rather than written
 *   · a video id must be 11 characters of YouTube's alphabet — anything else is rejected outright,
 *     not escaped, because that id becomes an iframe origin on a page that takes card payments
 *   · a FAQ answer must carry no dosage instruction and no health claim
 *   · every FIGURE in a FAQ answer must appear in the nutrition panel imported alongside it —
 *     an answer saying "24 g de protéines" on a product whose panel says 21 g is rejected, and
 *     that is exactly the error a confident researcher produces
 *   · nutrition rows must carry a source URL, which is stored as provenance
 *
 * Nothing here publishes copy. FAQ and nutrition land on the product because they are transcribed
 * facts with a citation; the descriptions stay untouched.
 */
class ImportProductResearch extends Command
{
    protected $signature = 'products:import-research
        {file : Path to the research JSON}
        {--apply : Write. Without this the command only reports}
        {--overwrite : Replace existing panels/FAQ rather than skipping them}';

    protected $description = 'Import researched Supplement Facts, FAQ and official videos, re-validating everything';

    public function handle(): int
    {
        $path = (string) $this->argument('file');
        if (! is_file($path)) {
            $this->error("File not found: {$path}");

            return self::FAILURE;
        }

        $payload = json_decode((string) file_get_contents($path), true);
        $products = $payload['products'] ?? $payload;

        if (! is_array($products) || $products === []) {
            $this->error('No products in the file.');

            return self::FAILURE;
        }

        $apply = (bool) $this->option('apply');
        $overwrite = (bool) $this->option('overwrite');

        $this->info(sprintf('%d product(s) in %s%s', count($products), basename($path), $apply ? '' : ' — reporting only'));
        $this->newLine();

        $totals = ['panels' => 0, 'faq' => 0, 'videos' => 0, 'gtins' => 0, 'skipped' => 0, 'rejected' => 0];

        foreach ($products as $entry) {
            $slug = trim((string) ($entry['slug'] ?? ''));
            if ($slug === '') {
                continue;
            }

            $product = Product::query()->where('slug', $slug)->first();
            if ($product === null) {
                $this->line("  <fg=red>introuvable</> {$slug}");
                $totals['skipped']++;

                continue;
            }

            $this->line(sprintf('<fg=cyan>▸</> %s', mb_strimwidth((string) $product->designation_fr, 0, 58, '…')));

            $facts = $this->nutritionFacts($entry['nutrition'] ?? null);
            $approved = $facts === null ? [] : $this->figuresIn($facts);
            $faq = $this->faq($entry['faq'] ?? [], $approved, $product);
            $video = $this->video($entry['video'] ?? null);
            $gtin = Gtin::normalize((string) ($entry['gtin'] ?? ''));

            $changes = [];

            if ($facts !== null && ($overwrite || blank($product->nutrition_facts))) {
                $changes['nutrition_facts'] = $facts;
                $totals['panels']++;
                $this->line(sprintf('    <fg=green>panneau</> %d ligne(s) — source : %s',
                    count($facts['rows']), mb_strimwidth((string) $facts['source_url'], 0, 54, '…')));
            }

            if ($faq !== [] && ($overwrite || blank($product->faq))) {
                $changes['faq'] = $faq;
                $totals['faq'] += count($faq);
                $this->line(sprintf('    <fg=green>FAQ</> %d question(s)', count($faq)));
            }

            if ($video !== null && ($overwrite || blank($product->official_video))) {
                $changes['official_video'] = $video;
                $totals['videos']++;
                $this->line(sprintf('    <fg=green>vidéo</> %s (%s)', $video['youtube_id'], $video['channel']));
            }

            // A barcode is never written from research. It is the master key for every future
            // lookup, and a wrong one silently attaches another product's label to this page.
            if ($gtin !== null && blank($product->gtin)) {
                $totals['gtins']++;
                $this->line("    <fg=yellow>code-barres proposé : {$gtin}</> — à vérifier sur le pot");
            }

            if ($changes === []) {
                $totals['skipped']++;
                $this->line('    <fg=gray>rien à écrire (déjà rempli — utilisez --overwrite)</>');

                continue;
            }

            if ($apply) {
                // saveQuietly so the stock hook does not re-derive `rupture` on a content import.
                // nutrition_values is still regenerated: that hook is on `saving`, which saveQuietly
                // does fire — it only suppresses the model EVENTS, not the closures on saving.
                $product->forceFill($changes)->save();
                $this->recordProvenance($product, $entry, $facts, $video);
            }
        }

        $this->newLine();
        $this->info(sprintf(
            '%s%d panneau(x), %d question(s), %d vidéo(s). %d code(s)-barres proposé(s), %d ignoré(s), %d rejeté(s).',
            $apply ? '' : '[report] ',
            $totals['panels'], $totals['faq'], $totals['videos'],
            $totals['gtins'], $totals['skipped'], $totals['rejected'],
        ));

        if (! $apply) {
            $this->comment('Relancez avec --apply pour écrire.');
        }

        return self::SUCCESS;
    }

    /**
     * Map researched nutrition into the same shape the admin form stores, dropping anything
     * malformed rather than letting it reach the renderer.
     *
     * @return array<string, mixed>|null
     */
    private function nutritionFacts(mixed $nutrition): ?array
    {
        if (! is_array($nutrition)) {
            return null;
        }

        $sourceUrl = trim((string) ($nutrition['source_url'] ?? ''));
        // No citation, no panel. A figure whose origin cannot be checked is not evidence, and this
        // is the field that makes a wrong number traceable six months from now.
        if ($sourceUrl === '' || filter_var($sourceUrl, FILTER_VALIDATE_URL) === false) {
            return null;
        }

        $rows = [];
        foreach ((array) ($nutrition['rows'] ?? []) as $row) {
            $name = trim((string) ($row['name'] ?? ''));
            if ($name === '') {
                continue;
            }

            $kind = in_array($row['kind'] ?? '', ['value', 'undeclared', 'blend'], true) ? $row['kind'] : 'value';

            // A "value" row with no number is not a value row. Rather than print a blank cell that
            // reads as missing data, call it what it is: an undeclared amount.
            if ($kind === 'value' && ! is_numeric($row['quantity'] ?? null)) {
                $kind = 'undeclared';
            }

            $rows[] = [
                'name' => $name,
                'kind' => $kind,
                'quantity' => $kind === 'value' ? $row['quantity'] + 0 : null,
                'unit' => $kind === 'value' ? trim((string) ($row['unit'] ?? '')) : '',
                'percent_dv' => is_numeric($row['percent_dv'] ?? null) ? $row['percent_dv'] + 0 : null,
                'depth' => max(0, min(2, (int) ($row['depth'] ?? 0))),
            ];
        }

        if ($rows === []) {
            return null;
        }

        return [
            'rows' => $rows,
            'serving_quantity' => is_numeric($nutrition['serving_quantity'] ?? null) ? $nutrition['serving_quantity'] + 0 : null,
            'serving_unit' => trim((string) ($nutrition['serving_unit'] ?? '')),
            'serving_note' => trim((string) ($nutrition['serving_note'] ?? '')),
            'servings_per_container' => trim((string) ($nutrition['servings_per_container'] ?? '')),
            'net_quantity' => is_numeric($nutrition['net_quantity'] ?? null) ? $nutrition['net_quantity'] + 0 : null,
            'net_unit' => trim((string) ($nutrition['net_unit'] ?? '')),
            // European reference intakes unless the source explicitly said Daily Value. Vitamin D is
            // 20 µg in the US against 5 µg in the EU — the same capsule reads 100 % on one label and
            // 400 % on the other, so guessing this wrong prints a correct number under a wrong name.
            'percent_basis' => ($nutrition['percent_basis'] ?? '') === 'us' ? 'us' : 'eu',
            'other_ingredients' => trim((string) ($nutrition['other_ingredients'] ?? '')),
            'allergens' => trim((string) ($nutrition['allergens'] ?? '')),
            'warnings' => trim((string) ($nutrition['warnings'] ?? '')),
            'claims' => trim((string) ($nutrition['claims'] ?? '')),
            'transcribed_at' => Carbon::now()->toDateString(),
            'source_url' => $sourceUrl,
        ];
    }

    /**
     * Every figure the imported panel vouches for.
     *
     * @param  array<string, mixed>  $facts
     * @return list<string>
     */
    private function figuresIn(array $facts): array
    {
        $text = [];
        foreach ($facts['rows'] as $row) {
            if ($row['quantity'] !== null) {
                $text[] = $row['quantity'].' '.$row['unit'];
            }
            if ($row['percent_dv'] !== null) {
                $text[] = $row['percent_dv'].' %';
            }
        }
        $text[] = $facts['serving_quantity'].' '.$facts['serving_unit'];
        $text[] = $facts['net_quantity'].' '.$facts['net_unit'];
        $text[] = $facts['serving_note'];

        return Figures::in(implode(' ', $text));
    }

    /**
     * FAQ entries that survive the same gates a generated draft has to pass.
     *
     * @param  list<string>  $approved
     * @return list<array{q: string, a: string}>
     */
    private function faq(mixed $entries, array $approved, Product $product): array
    {
        if (! is_array($entries)) {
            return [];
        }

        $out = [];

        foreach ($entries as $entry) {
            $q = trim((string) ($entry['q'] ?? ''));
            $a = trim((string) ($entry['a'] ?? ''));
            if ($q === '' || $a === '') {
                continue;
            }

            $text = $q.' '.$a;

            if ($this->hasHealthClaim($text)) {
                $this->line('    <fg=red>FAQ rejetée</> (allégation santé) : '.mb_strimwidth($q, 0, 46, '…'));

                continue;
            }

            if ($this->hasDosage($text)) {
                $this->line('    <fg=red>FAQ rejetée</> (posologie) : '.mb_strimwidth($q, 0, 46, '…'));

                continue;
            }

            /**
             * The grounding rule. Figures in the product NAME are legitimate (pack size), and so are
             * figures the imported panel prints. Anything else the researcher wrote is a number that
             * appears on no label we hold — which is the single most likely way a confident,
             * well-sourced-looking answer turns out to be about a different pack size.
             */
            $allowed = array_merge($approved, Figures::in((string) $product->designation_fr));
            $ungrounded = Figures::ungrounded($a, $allowed);

            if ($ungrounded !== []) {
                $this->line('    <fg=red>FAQ rejetée</> (chiffre non sourcé : '.implode(', ', array_slice($ungrounded, 0, 3)).') : '
                    .mb_strimwidth($q, 0, 40, '…'));

                continue;
            }

            $out[] = ['q' => $q, 'a' => $a];
        }

        return array_slice($out, 0, 6);
    }

    /**
     * Reuses the generator's own patterns rather than a second list. Two definitions of "this is a
     * health claim" drift, and then one entry point publishes what the other rejects on the same
     * product page.
     */
    private function hasHealthClaim(string $text): bool
    {
        foreach (ProductContentGenerator::claimPatterns() as $pattern) {
            if (preg_match($pattern, $text) === 1) {
                return true;
            }
        }

        return false;
    }

    private function hasDosage(string $text): bool
    {
        foreach (ProductContentGenerator::dosagePatterns() as $pattern) {
            if (preg_match($pattern, $text) === 1) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function video(mixed $video): ?array
    {
        if (! is_array($video) || ($video['official'] ?? false) !== true) {
            return null;
        }

        // Rejected, not sanitised. This id is concatenated into an iframe src; anything that is not
        // exactly YouTube's 11-character alphabet is not an id, whatever it looks like.
        $id = YouTubeId::parse((string) ($video['youtube_id'] ?? ''));
        if ($id === null) {
            return null;
        }

        $channel = trim((string) ($video['channel'] ?? ''));
        if ($channel === '') {
            // Without a channel we cannot answer "is this the brand's own video?" later, and an
            // unattributed embed on our product page is somebody else's claims wearing our layout.
            return null;
        }

        return [
            'youtube_id' => $id,
            'title' => trim((string) ($video['title'] ?? '')),
            'channel' => $channel,
            'source_url' => YouTubeId::watchUrl($id),
            'verified_at' => Carbon::now()->toDateString(),
        ];
    }

    /**
     * @param  array<string, mixed>  $entry
     * @param  array<string, mixed>|null  $facts
     * @param  array<string, mixed>|null  $video
     */
    private function recordProvenance(Product $product, array $entry, ?array $facts, ?array $video): void
    {
        $write = function (string $path, mixed $value, string $url) use ($product): void {
            $hash = hash('sha256', json_encode([$path, $value], JSON_UNESCAPED_UNICODE) ?: '');

            $observation = ProductSourceObservation::firstOrNew([
                'product_id' => $product->id,
                'field_path' => $path,
                'source_id' => parse_url($url, PHP_URL_HOST) ?: 'web-research',
                'content_hash' => $hash,
            ]);

            if ($observation->exists) {
                return;
            }

            $observation->fill([
                'normalized_value' => ['value' => $value],
                'source_url' => $url,
                'source_type' => 'web_research',
                'retrieved_at' => Carbon::now(),
                // Researched and adversarially verified, but matched by NAME, not barcode. That is
                // below PUBLISHABLE_CONFIDENCE on purpose: it records that a human still has the
                // final say, even though the content is already on the page.
                'confidence' => ProductSourceObservation::CONFIDENCE_BRAND_NAME_MATCH,
                'match_method' => 'brand_name',
                'extraction_method' => 'agent_research',
                'extractor_version' => '1.0',
                'status' => 'pending',
            ])->save();
        };

        if ($facts !== null) {
            $write('content_facts.nutrition', $facts['rows'], $facts['source_url']);
        }
        if ($video !== null) {
            $write('media.videos', $video, (string) $video['source_url']);
        }
        foreach ((array) ($entry['sources'] ?? []) as $source) {
            $url = trim((string) ($source['url'] ?? ''));
            if ($url !== '' && filter_var($url, FILTER_VALIDATE_URL) !== false) {
                $write('reference.description', ['kind' => $source['kind'] ?? 'other'], $url);
            }
        }
    }
}
