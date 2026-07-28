<?php

namespace App\Services\Seo;

use App\Models\Page;

/**
 * Default meta title + description for CMS pages, mirroring ProductSeoDefaults.
 *
 * /proteine-tunisie is the page that should own the "protéine tunisie" query — 1,163 words of
 * genuine guide content — and it was shipping with meta_title NULL and meta_description NULL. With
 * no description Google writes its own snippet from whatever text it likes, and the <title> fell
 * back to the bare page title ("Proteine Tunisie", 16 characters, unaccented, no brand). The best
 * content on the site was being presented in search with its worst possible packaging.
 *
 * Rules, same as products:
 *   • Blanks only — never overwrite anything an admin wrote.
 *   • Derived from the page's OWN content. The description is the real opening prose, not a
 *     template: a generic sentence repeated across pages is worth less than no description.
 */
class PageSeoDefaults
{
    private const BRAND_SUFFIX = ' | Protéine Tunisie';

    public static function apply(Page $page): bool
    {
        $title = trim((string) $page->title);
        if ($title === '') {
            return false;
        }

        $changed = false;

        if (trim((string) $page->meta_title) === '') {
            // Prefer the body's own <h1>: on guide pages it is far richer than the short admin
            // title ("Protéine Tunisie : Guide complet pour bien choisir sa protéine en Tunisie"
            // vs "Proteine Tunisie"), and it is what the page visibly leads with.
            $heading = self::firstHeading((string) $page->body) ?: $title;
            $heading = self::squash($heading);

            // Keep the whole thing near the ~60 char SERP limit: only append the brand when the
            // heading leaves room, otherwise the brand is what gets truncated away anyway.
            $meta = mb_strlen($heading) + mb_strlen(self::BRAND_SUFFIX) <= 62
                ? $heading . self::BRAND_SUFFIX
                : $heading;

            $page->meta_title = mb_substr($meta, 0, 255);
            $changed = true;
        }

        if (trim((string) $page->meta_description) === '') {
            // Prefer the excerpt, then the first real PARAGRAPH of the body. Not the raw body:
            // its first text is the heading we just used for the title, so the description would
            // simply repeat it — and a description that echoes the title tells a searcher nothing
            // new about the page.
            $source = self::plainText((string) $page->excerpt)
                ?: self::firstParagraph((string) $page->body)
                ?: self::plainText((string) $page->body);

            if ($source !== '') {
                $page->meta_description = mb_substr(self::trimToSentence($source, 155), 0, 500);
                $changed = true;
            }
        }

        return $changed;
    }

    /** Text of the first <h1>/<h2> in the body, if any. */
    private static function firstHeading(string $html): string
    {
        if (preg_match('/<h[12][^>]*>(.*?)<\/h[12]>/is', $html, $m)) {
            return self::plainText($m[1]);
        }

        return '';
    }

    /**
     * Text of the first substantial <p> in the body — the page's actual opening prose.
     * "Substantial" filters out one-word paragraphs, stray &nbsp; and image-only wrappers.
     */
    private static function firstParagraph(string $html): string
    {
        if (! preg_match_all('/<p[^>]*>(.*?)<\/p>/is', $html, $matches)) {
            return '';
        }
        foreach ($matches[1] as $candidate) {
            $text = self::plainText($candidate);
            if (mb_strlen($text) >= 60) {
                return $text;
            }
        }

        return '';
    }

    /** Strip tags + entities + collapse whitespace. */
    private static function plainText(string $html): string
    {
        $text = preg_replace('/<(script|style)[^>]*>.*?<\/\1>/is', ' ', $html) ?? $html;
        // Replace tags with a SPACE rather than strip_tags(), which deletes them and glues the
        // surrounding text together: "</h1><h2>" became "…en TunisieProtéines en Tunisie…".
        $text = preg_replace('/<[^>]+>/', ' ', $text) ?? $text;
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        // Non-breaking spaces survive entity decoding as U+00A0 and are not matched by \s in some
        // PCRE builds; normalise them so the squash below actually collapses them.
        $text = str_replace("\xc2\xa0", ' ', $text);

        return self::squash($text);
    }

    private static function squash(string $text): string
    {
        return trim(preg_replace('/\s+/u', ' ', $text) ?? $text);
    }

    /**
     * Cut to a limit on a sentence boundary where possible, else on a word boundary. A description
     * chopped mid-word looks broken in the SERP and costs clicks.
     */
    private static function trimToSentence(string $text, int $limit): string
    {
        if (mb_strlen($text) <= $limit) {
            return $text;
        }

        $cut = mb_substr($text, 0, $limit);

        $lastStop = max(mb_strrpos($cut, '. ') ?: 0, mb_strrpos($cut, ' ! ') ?: 0, mb_strrpos($cut, ' ? ') ?: 0);
        if ($lastStop > $limit * 0.5) {
            return trim(mb_substr($cut, 0, $lastStop + 1));
        }

        $lastSpace = mb_strrpos($cut, ' ');

        return trim($lastSpace ? mb_substr($cut, 0, $lastSpace) : $cut) . '…';
    }
}
