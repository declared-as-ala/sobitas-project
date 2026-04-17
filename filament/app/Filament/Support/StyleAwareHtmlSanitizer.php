<?php

namespace App\Filament\Support;

use Illuminate\Support\Str;

/**
 * HTML sanitizer that preserves pasted `<style>` blocks in a bounded way.
 *
 * Non-style segments are passed through {@see Str::sanitizeHtml()}.
 * Style bodies are kept but stripped of known-dangerous CSS constructs
 * (`expression(`, `javascript:` URLs, `-moz-binding`, `behavior:`, `@import`).
 * Only `type` / `media` / `nonce` attributes survive on the opening tag.
 */
final class StyleAwareHtmlSanitizer
{
    /** CSS constructs never kept inside a `<style>` body. */
    private const DANGEROUS_CSS_PATTERNS = [
        '~expression\s*\(~i',
        '~javascript\s*:~i',
        '~-moz-binding\s*:[^;}]*;?~i',
        '~behavior\s*:[^;}]*;?~i',
        '~@import\b[^;]*;?~i',
    ];

    public static function sanitize(string $html): string
    {
        if (trim($html) === '') {
            return '';
        }

        $parts = preg_split(
            '~(<style\b[^>]*>.*?</style>)~is',
            $html,
            -1,
            PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY,
        );

        if ($parts === false) {
            return Str::sanitizeHtml($html);
        }

        $out = '';
        foreach ($parts as $part) {
            if (Str::startsWith(Str::lower(ltrim($part)), '<style')) {
                $out .= self::sanitizeStyleBlock($part);
                continue;
            }

            $out .= Str::sanitizeHtml($part);
        }

        return $out;
    }

    private static function sanitizeStyleBlock(string $styleBlock): string
    {
        if (! preg_match('~^(<style\b[^>]*>)(.*?)(</style\s*>)$~is', $styleBlock, $m)) {
            return '';
        }

        $openTag = self::filterStyleOpenTag($m[1]);
        $css = $m[2];

        foreach (self::DANGEROUS_CSS_PATTERNS as $re) {
            $css = preg_replace($re, '', $css) ?? $css;
        }

        return $openTag.$css.'</style>';
    }

    private static function filterStyleOpenTag(string $openTag): string
    {
        $out = '<style';

        if (preg_match_all(
            '~\b(type|media|nonce)\s*=\s*("([^"]*)"|\'([^\']*)\'|([^\s>]+))~i',
            $openTag,
            $matches,
            PREG_SET_ORDER,
        )) {
            $seen = [];
            foreach ($matches as $match) {
                $name = strtolower($match[1]);
                if (isset($seen[$name])) {
                    continue;
                }
                $seen[$name] = true;

                $raw = $match[3] !== '' ? $match[3] : ($match[4] !== '' ? $match[4] : ($match[5] ?? ''));
                $value = htmlspecialchars((string) $raw, ENT_QUOTES, 'UTF-8');
                $out .= ' '.$name.'="'.$value.'"';
            }
        }

        return $out.'>';
    }
}
