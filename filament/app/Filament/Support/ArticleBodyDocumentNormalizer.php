<?php

namespace App\Filament\Support;

use DOMDocument;
use DOMElement;
use Illuminate\Support\Str;

/**
 * Detects pasted full HTML documents and reduces them to a body fragment for CMS storage.
 * Optionally surfaces root {@see https://html.spec.whatwg.org/#the-html-element} lang/dir hints.
 */
final class ArticleBodyDocumentNormalizer
{
    /**
     * @return array{html: string, lang: ?string, dir: ?string}
     */
    public static function normalize(string $html): array
    {
        $trimmed = trim($html);
        if ($trimmed === '') {
            return ['html' => '', 'lang' => null, 'dir' => null];
        }

        if (! self::looksLikeFullDocument($trimmed)) {
            return ['html' => $html, 'lang' => null, 'dir' => null];
        }

        libxml_use_internal_errors(true);

        $dom = new DOMDocument();
        $wrapped = '<?xml encoding="UTF-8">'.$trimmed;
        $loaded = @$dom->loadHTML($wrapped, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        if (! $loaded) {
            @$dom->loadHTML($wrapped);
        }

        libxml_clear_errors();

        $lang = null;
        $dir = null;

        $htmlNodes = $dom->getElementsByTagName('html');
        if ($htmlNodes->length > 0) {
            $root = $htmlNodes->item(0);
            if ($root instanceof DOMElement) {
                $l = trim($root->getAttribute('lang'));
                $d = trim(strtolower($root->getAttribute('dir')));
                $lang = $l !== '' ? Str::limit($l, 16, '') : null;
                $dir = in_array($d, ['rtl', 'ltr'], true) ? $d : null;
            }
        }

        $bodyNodes = $dom->getElementsByTagName('body');
        if ($bodyNodes->length === 0) {
            return ['html' => $html, 'lang' => $lang, 'dir' => $dir];
        }

        $body = $bodyNodes->item(0);
        if (! $body instanceof DOMElement) {
            return ['html' => $html, 'lang' => $lang, 'dir' => $dir];
        }

        $fragment = '';
        foreach ($body->childNodes as $child) {
            $fragment .= $dom->saveHTML($child) ?: '';
        }

        $fragment = trim($fragment);

        return [
            'html' => $fragment !== '' ? $fragment : $html,
            'lang' => $lang,
            'dir' => $dir,
        ];
    }

    private static function looksLikeFullDocument(string $html): bool
    {
        if (Str::startsWith(Str::lower(ltrim($html)), '<!doctype')) {
            return true;
        }

        return (bool) preg_match('/<\s*html[\s>]/i', $html);
    }
}
