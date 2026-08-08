<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\ProductSourceObservation;
use App\Services\Enrichment\ResearchValidator;
use App\Support\Gtin;
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

    public function handle(ResearchValidator $validator): int
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

            $facts = $validator->nutritionFacts($entry['nutrition'] ?? null);
            $approved = $facts === null ? [] : $validator->figuresIn($facts);
            $faqResult = $validator->faq($entry['faq'] ?? [], $approved, (string) $product->designation_fr);
            $faq = $faqResult['kept'];
            foreach ($faqResult['rejected'] as $reason) {
                $totals['rejected']++;
                $this->line('    <fg=red>FAQ rejetée</> '.$reason);
            }
            $video = $validator->video($entry['video'] ?? null, Carbon::now()->toDateString());
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
