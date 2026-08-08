<?php

namespace App\Support;

/**
 * A YouTube video id, and nothing else.
 *
 * ── WHY THIS IS ITS OWN CLASS ─────────────────────────────────────────────────────────────
 * The embed URL is built by string concatenation into an `<iframe src>`. Whatever reaches that
 * concatenation IS the frame's origin. If an id can carry `../`, a quote, or a full URL, then a
 * field that looks like "paste the video id here" is really "paste an arbitrary origin into a page
 * that takes card payments".
 *
 * So the id is validated against the exact format YouTube uses — 11 characters of
 * [A-Za-z0-9_-] — and everything else is rejected. Not sanitised, not escaped: rejected. An id
 * that is not eleven characters of that alphabet is not an id.
 *
 * Pasting a whole watch/share/embed URL is the normal human behaviour, so the id is EXTRACTED from
 * those shapes rather than refused — but the result still has to pass the same check.
 */
final class YouTubeId
{
    /** YouTube ids are exactly 11 characters of URL-safe base64. */
    private const PATTERN = '/^[A-Za-z0-9_-]{11}$/';

    /**
     * The id inside anything a person is likely to paste, or null.
     *
     * Accepts a bare id, youtu.be/ID, /watch?v=ID, /embed/ID, /shorts/ID, /live/ID.
     */
    public static function parse(?string $raw): ?string
    {
        $value = trim((string) $raw);
        if ($value === '') {
            return null;
        }

        if (preg_match(self::PATTERN, $value) === 1) {
            return $value;
        }

        // Only look inside things that are actually YouTube. A "video id" hiding in some other
        // host's URL is a sign the input is not what the person thought it was.
        $host = strtolower((string) parse_url($value, PHP_URL_HOST));
        $host = preg_replace('/^www\./', '', $host) ?? $host;

        if (! in_array($host, ['youtube.com', 'youtu.be', 'm.youtube.com', 'youtube-nocookie.com'], true)) {
            return null;
        }

        parse_str((string) parse_url($value, PHP_URL_QUERY), $query);
        $candidates = [$query['v'] ?? null];

        if (preg_match('~/(?:embed|shorts|live|v)/([^/?#]+)~', (string) parse_url($value, PHP_URL_PATH), $m) === 1) {
            $candidates[] = $m[1];
        }
        if ($host === 'youtu.be') {
            $candidates[] = ltrim((string) parse_url($value, PHP_URL_PATH), '/');
        }

        foreach ($candidates as $candidate) {
            $candidate = trim((string) $candidate);
            if ($candidate !== '' && preg_match(self::PATTERN, $candidate) === 1) {
                return $candidate;
            }
        }

        return null;
    }

    public static function isValid(?string $raw): bool
    {
        return self::parse($raw) !== null;
    }

    /**
     * The privacy-preserving embed URL.
     *
     * youtube-nocookie.com does not set tracking cookies until the visitor actually plays the
     * video. On a Tunisian storefront that is both the decent default and one less thing to have to
     * declare in the cookie policy.
     */
    public static function embedUrl(string $id): ?string
    {
        $id = self::parse($id);

        return $id === null ? null : 'https://www.youtube-nocookie.com/embed/'.$id;
    }

    public static function watchUrl(string $id): ?string
    {
        $id = self::parse($id);

        return $id === null ? null : 'https://www.youtube.com/watch?v='.$id;
    }

    /** Still images are served from a separate host that sets no cookies at all. */
    public static function thumbnailUrl(string $id): ?string
    {
        $id = self::parse($id);

        return $id === null ? null : 'https://i.ytimg.com/vi/'.$id.'/hqdefault.jpg';
    }
}
