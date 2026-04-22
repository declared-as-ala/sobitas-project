<?php

namespace App\Console\Commands;

use App\Models\SousCategory;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Imports SEO body + FAQ from frontend JSON files into sous_categories (by slug).
 * Paths default to ../frontend/content/categories/ relative to the filament app root.
 */
class ImportCategorySeoFromFrontendJson extends Command
{
    protected $signature = 'categories:import-seo-json
                            {--dry-run : Show what would change without saving}';

    protected $description = 'Import category SEO content from frontend/content/categories/*.json into sous_categories (proteine-whey, creatine)';

    /** @var array<string, string> slug => json filename (no path) */
    private const MAP = [
        'proteine-whey' => 'whey-protein.json',
        'creatine' => 'creatine.json',
    ];

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');
        $dir = $this->resolveContentDir();
        if (! is_dir($dir)) {
            $this->error('Content directory not found: '.$dir);

            return self::FAILURE;
        }

        foreach (self::MAP as $slug => $file) {
            $path = $dir.DIRECTORY_SEPARATOR.$file;
            if (! is_file($path)) {
                $this->warn("Skip {$slug}: missing file {$path}");

                continue;
            }
            $sc = SousCategory::query()->where('slug', $slug)->first();
            if (! $sc) {
                $this->warn("Skip {$slug}: no sous_categories row with this slug");

                continue;
            }

            $json = json_decode((string) File::get($path), true);
            if (! is_array($json)) {
                $this->error("Invalid JSON: {$path}");

                return self::FAILURE;
            }

            $longBottom = $this->buildLongBottom($json);
            $faq = $this->normalizeFaqInput($json['faqs'] ?? []);

            $payload = [
                'meta_title' => trim((string) ($json['metaTitle'] ?? '')),
                'meta_description' => trim((string) ($json['metaDescription'] ?? '')),
                'h1_title' => trim((string) ($json['h1'] ?? '')),
                'short_intro' => (string) ($json['intro'] ?? ''),
                'long_bottom_content' => $longBottom,
                'faq' => $faq,
                'seo_enabled' => true,
                'robots_index' => true,
                'robots_follow' => true,
            ];

            if ($slug === 'proteine-whey') {
                $payload['primary_keyword'] = 'whey tunisie';
                $payload['secondary_keywords'] = ['whey protein tunisie', 'protéine whey', 'isolate whey'];
            } elseif ($slug === 'creatine') {
                $payload['primary_keyword'] = 'créatine tunisie';
                $payload['secondary_keywords'] = ['créatine monohydrate', 'creapure', 'créatine musculation'];
            }

            $og = trim((string) ($json['ogImage'] ?? ''));
            if ($og !== '') {
                $payload['og_image'] = $og;
            }

            $this->info(($dry ? '[dry-run] ' : '')."Update sous_category id={$sc->id} slug={$slug}");

            if ($dry) {
                $this->line('  meta_title: '.mb_substr($payload['meta_title'], 0, 70).'…');
                $this->line('  faq count: '.count($payload['faq']));

                continue;
            }

            $sc->fill($payload);
            $sc->save();
        }

        return self::SUCCESS;
    }

    private function resolveContentDir(): string
    {
        $override = env('FRONTEND_CATEGORY_CONTENT_DIR');
        if (is_string($override) && $override !== '' && is_dir($override)) {
            return rtrim($override, DIRECTORY_SEPARATOR);
        }

        return dirname(base_path()).DIRECTORY_SEPARATOR.'frontend'.DIRECTORY_SEPARATOR.'content'.DIRECTORY_SEPARATOR.'categories';
    }

    /**
     * @param  array<string, mixed>  $json
     */
    private function buildLongBottom(array $json): string
    {
        $title = trim((string) ($json['howToChooseTitle'] ?? ''));
        $body = (string) ($json['howToChooseBody'] ?? '');
        if ($title === '' && trim(strip_tags($body)) === '') {
            return '';
        }
        $bodyHtml = str_contains($body, '<')
            ? $body
            : '<div class="whitespace-pre-line">'.e($body).'</div>';

        return '<section class="category-long-bottom">'
            .($title !== '' ? '<h2>'.e($title).'</h2>' : '')
            .$bodyHtml
            .'</section>';
    }

    /**
     * @param  array<int, mixed>  $faqs
     * @return array<int, array{q: string, a: string}>
     */
    private function normalizeFaqInput(array $faqs): array
    {
        $out = [];
        foreach ($faqs as $row) {
            if (! is_array($row)) {
                continue;
            }
            $q = trim((string) ($row['question'] ?? $row['q'] ?? ''));
            $a = trim((string) ($row['answer'] ?? $row['a'] ?? ''));
            if ($q !== '' && $a !== '') {
                $out[] = ['q' => $q, 'a' => $a];
            }
        }

        return $out;
    }
}
