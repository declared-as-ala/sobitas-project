<?php

namespace App\Filament\Support;

use Filament\Forms\Components\RichEditor\RichContentRenderer;
use Illuminate\Support\Str;

/**
 * TipTap / RichContent round-trip and SEO metrics for the blog body (`description`).
 * HTML mode saves are passed through {@see Str::sanitizeHtml()} (Filament / Symfony sanitizer).
 */
final class ArticleDescriptionHtml
{
    public const FIELD_EDITOR_MODE = 'description_editor_mode';

    public const FIELD_HTML_STAGING = 'description_html_staging';

    public const MODE_VISUAL = 'visual';

    public const MODE_HTML = 'html';

    private const WORDS_PER_MINUTE = 200;

    /**
     * @param  array<string, mixed>|string|null  $state  TipTap document array, HTML string, or null
     */
    public static function toStoredHtml(mixed $state): string
    {
        if ($state === null || $state === '') {
            return '';
        }

        return RichContentRenderer::make($state)->toHtml();
    }

    /**
     * @return array<string, mixed> TipTap document suitable for RichEditor Livewire state
     */
    public static function tipTapDocumentFromHtml(string $html): array
    {
        $trimmed = trim($html);
        if ($trimmed === '') {
            return [
                'type' => 'doc',
                'content' => [
                    [
                        'type' => 'paragraph',
                        'content' => [],
                    ],
                ],
            ];
        }

        $document = RichContentRenderer::make($html)->getEditor()->getDocument();

        if (is_array($document)) {
            return $document;
        }

        $encoded = json_encode($document, JSON_THROW_ON_ERROR);

        return json_decode($encoded, true, 512, JSON_THROW_ON_ERROR);
    }

    public static function sanitizeStoredHtml(string $html): string
    {
        return Str::sanitizeHtml($html);
    }

    /**
     * @return array{
     *     words: int,
     *     h2: int,
     *     h3: int,
     *     links: int,
     *     minutes: int,
     *     plain_sample: string
     * }
     */
    public static function seoMetricsFromHtml(string $html): array
    {
        $plain = trim(preg_replace('/\s+/u', ' ', strip_tags($html)) ?? '');
        $words = $plain === '' ? 0 : count(preg_split('/\s+/u', $plain, -1, PREG_SPLIT_NO_EMPTY));

        $h2 = self::countOpeningTags($html, 'h2');
        $h3 = self::countOpeningTags($html, 'h3');
        $links = self::countOpeningTags($html, 'a');

        $minutes = max(1, (int) ceil($words / self::WORDS_PER_MINUTE));

        return [
            'words' => $words,
            'h2' => $h2,
            'h3' => $h3,
            'links' => $links,
            'minutes' => $minutes,
            'plain_sample' => Str::limit($plain, 120),
        ];
    }

    /**
     * @return array{
     *     words: int,
     *     h2: int,
     *     h3: int,
     *     links: int,
     *     minutes: int,
     *     plain_sample: string
     * }
     */
    /**
     * @param  callable(string $path = null, bool $isAbsolute = false): mixed  $get
     */
    public static function seoMetricsFromFormState(callable $get): array
    {
        $mode = $get(self::FIELD_EDITOR_MODE) ?? self::MODE_VISUAL;

        if ($mode === self::MODE_HTML) {
            return self::seoMetricsFromHtml((string) ($get(self::FIELD_HTML_STAGING) ?? ''));
        }

        $desc = $get('description');

        return self::seoMetricsFromHtml(self::toStoredHtml($desc));
    }

    private static function countOpeningTags(string $html, string $tag): int
    {
        if ($html === '') {
            return 0;
        }

        $n = preg_match_all('/<'.$tag.'\b[^>]*>/i', $html);

        return $n === false ? 0 : $n;
    }
}


