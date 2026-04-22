<?php

namespace App\Support;

use App\Models\Categ;
use App\Models\SousCategory;
use Illuminate\Support\Facades\Storage;

/**
 * Normalized SEO payload for category/subcategory API consumers (frontend).
 * `meta_title` / `meta_description` map to `title` / `meta_description` in the envelope.
 */
final class CategorySeoEnvelope
{
    /**
     * @return array<string, mixed>
     */
    public static function forSousCategory(SousCategory $s, string $publicBaseUrl): array
    {
        $publicBaseUrl = rtrim($publicBaseUrl, '/');
        $slug = (string) ($s->slug ?? '');
        $defaultCanonical = $publicBaseUrl.'/category/'.rawurlencode($slug);

        $canonical = trim((string) ($s->canonical_url ?? ''));
        if ($canonical === '') {
            $canonical = $defaultCanonical;
        } elseif (! str_starts_with($canonical, 'http')) {
            $canonical = $publicBaseUrl.'/'.ltrim($canonical, '/');
        }

        $ogImage = self::absoluteAssetUrl((string) ($s->og_image ?? ''), $publicBaseUrl);
        if ($ogImage === '' && ! empty($s->cover)) {
            $ogImage = self::absoluteAssetUrl((string) $s->cover, $publicBaseUrl);
        }

        $faq = self::normalizeFaq($s->faq);

        $secondary = $s->secondary_keywords ?? null;
        if (is_array($secondary)) {
            $secondary = array_values(array_filter(array_map(function ($row) {
                if (is_string($row)) {
                    return trim($row);
                }
                if (is_array($row) && isset($row['term'])) {
                    return trim((string) $row['term']);
                }

                return null;
            }, $secondary)));
        } else {
            $secondary = [];
        }

        $h1 = trim((string) ($s->h1_title ?? ''));
        if ($h1 === '') {
            $h1 = trim((string) ($s->designation_fr ?? ''));
        }

        $title = trim((string) ($s->meta_title ?? ''));
        if ($title === '') {
            $title = $h1;
        }

        $metaDescription = trim((string) ($s->meta_description ?? ''));

        $ogTitle = trim((string) ($s->og_title ?? ''));
        if ($ogTitle === '') {
            $ogTitle = $title;
        }
        $ogDescription = trim((string) ($s->og_description ?? ''));
        if ($ogDescription === '') {
            $ogDescription = $metaDescription;
        }
        $ogImageAlt = trim((string) ($s->og_image_alt ?? ''));
        if ($ogImageAlt === '') {
            $ogImageAlt = trim((string) ($s->alt_cover ?? '')) ?: $h1;
        }

        return [
            'enabled' => (bool) ($s->seo_enabled ?? true),
            'title' => $title,
            'meta_description' => $metaDescription,
            'h1' => $h1,
            'canonical_url' => $canonical,
            'robots' => [
                'index' => (bool) ($s->robots_index ?? true),
                'follow' => (bool) ($s->robots_follow ?? true),
            ],
            'og' => [
                'title' => $ogTitle,
                'description' => $ogDescription,
                'image' => $ogImage,
                'image_alt' => $ogImageAlt,
            ],
            'keywords' => [
                'primary' => trim((string) ($s->primary_keyword ?? '')),
                'secondary' => $secondary,
            ],
            'breadcrumb_label' => trim((string) ($s->breadcrumb_label ?? '')),
            'short_intro_html' => (string) ($s->short_intro ?? ''),
            'long_bottom_html' => (string) ($s->long_bottom_content ?? ''),
            'faq' => $faq,
        ];
    }

    /**
     * @param  array<int, mixed>|null  $raw
     * @return array<int, array{question: string, answer: string}>
     */
    public static function normalizeFaq(?array $raw): array
    {
        if (! is_array($raw) || $raw === []) {
            return [];
        }
        $out = [];
        foreach ($raw as $row) {
            if (! is_array($row)) {
                continue;
            }
            $q = trim((string) ($row['question'] ?? $row['q'] ?? ''));
            $a = trim((string) ($row['answer'] ?? $row['a'] ?? ''));
            if ($q !== '' && $a !== '') {
                $out[] = ['question' => $q, 'answer' => $a];
            }
        }

        return $out;
    }

    private static function absoluteAssetUrl(string $pathOrUrl, string $publicBaseUrl): string
    {
        $pathOrUrl = trim($pathOrUrl);
        if ($pathOrUrl === '') {
            return '';
        }
        if (str_starts_with($pathOrUrl, 'http://') || str_starts_with($pathOrUrl, 'https://')) {
            return $pathOrUrl;
        }
        $path = ltrim(str_replace('\\', '/', $pathOrUrl), '/');
        if (str_starts_with($path, 'storage/')) {
            return $publicBaseUrl.'/'.ltrim($path, '/');
        }

        return Storage::disk('public')->url($path);
    }

    /**
     * Parent category (categs): only meta_title / meta_description today — same envelope shape for API consistency.
     *
     * @return array<string, mixed>
     */
    public static function forCateg(Categ $c, string $publicBaseUrl): array
    {
        $publicBaseUrl = rtrim($publicBaseUrl, '/');
        $slug = (string) ($c->slug ?? '');
        $defaultCanonical = $publicBaseUrl.'/category/'.rawurlencode($slug);
        $h1 = trim((string) ($c->designation_fr ?? ''));
        $title = trim((string) ($c->meta_title ?? ''));
        if ($title === '') {
            $title = $h1;
        }
        $metaDescription = trim((string) ($c->meta_description ?? ''));
        $ogImage = self::absoluteAssetUrl((string) ($c->cover ?? ''), $publicBaseUrl);

        return [
            'enabled' => true,
            'title' => $title,
            'meta_description' => $metaDescription,
            'h1' => $h1,
            'canonical_url' => $defaultCanonical,
            'robots' => ['index' => true, 'follow' => true],
            'og' => [
                'title' => $title,
                'description' => $metaDescription,
                'image' => $ogImage,
                'image_alt' => $h1,
            ],
            'keywords' => ['primary' => '', 'secondary' => []],
            'breadcrumb_label' => '',
            'short_intro_html' => '',
            'long_bottom_html' => '',
            'faq' => [],
        ];
    }
}
