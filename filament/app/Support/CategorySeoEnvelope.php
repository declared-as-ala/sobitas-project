<?php

namespace App\Support;

use App\Models\Categ;
use App\Models\SousCategory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

/**
 * Normalized SEO payload for category/subcategory API consumers (frontend).
 * Additive keys — keep backward compatibility for existing consumers.
 */
final class CategorySeoEnvelope
{
    /**
     * @return array<string, mixed>
     */
    public static function forSousCategory(SousCategory $s, string $publicBaseUrl): array
    {
        return self::buildFromModel($s, $publicBaseUrl);
    }

    /**
     * @return array<string, mixed>
     */
    public static function forCateg(Categ $c, string $publicBaseUrl): array
    {
        return self::buildFromModel($c, $publicBaseUrl);
    }

    /**
     * @return array<string, mixed>
     */
    private static function buildFromModel(Model $model, string $publicBaseUrl): array
    {
        $publicBaseUrl = rtrim($publicBaseUrl, '/');
        $slug = (string) ($model->slug ?? '');
        $defaultCanonical = $publicBaseUrl.'/'.rawurlencode($slug);

        $canonical = trim((string) ($model->canonical_url ?? ''));
        if ($canonical === '') {
            $canonical = $defaultCanonical;
        } elseif (str_starts_with($canonical, '/category/')) {
            $canonical = $publicBaseUrl.'/'.ltrim(substr($canonical, strlen('/category/')), '/');
        } elseif (! str_starts_with($canonical, 'http')) {
            $canonical = $publicBaseUrl.'/'.ltrim($canonical, '/');
        } else {
            $parts = parse_url($canonical);
            $path = is_array($parts) ? (string) ($parts['path'] ?? '') : '';
            if (str_starts_with($path, '/category/')) {
                $query = isset($parts['query']) && $parts['query'] !== '' ? '?'.$parts['query'] : '';
                $fragment = isset($parts['fragment']) && $parts['fragment'] !== '' ? '#'.$parts['fragment'] : '';
                $canonical = $publicBaseUrl.'/'.ltrim(substr($path, strlen('/category/')), '/').$query.$fragment;
            }
        }

        $designation = trim((string) ($model->designation_fr ?? ''));

        $h1 = trim((string) ($model->h1_title ?? ''));
        if ($h1 === '') {
            $h1 = $designation;
        }

        $title = trim((string) ($model->meta_title ?? ''));
        if ($title === '') {
            $title = $h1;
        }

        $metaDescription = trim((string) ($model->meta_description ?? ''));
        $metaKeywords = trim((string) ($model->meta_keywords ?? ''));

        $ogTitle = trim((string) ($model->og_title ?? ''));
        if ($ogTitle === '') {
            $ogTitle = $title;
        }
        $ogDescription = trim((string) ($model->og_description ?? ''));
        if ($ogDescription === '') {
            $ogDescription = $metaDescription;
        }

        $ogImage = self::absoluteAssetUrl((string) ($model->og_image ?? ''), $publicBaseUrl);
        if ($ogImage === '' && ! empty($model->cover)) {
            $ogImage = self::absoluteAssetUrl((string) $model->cover, $publicBaseUrl);
        }

        $ogImageAlt = trim((string) ($model->og_image_alt ?? ''));
        if ($ogImageAlt === '') {
            $ogImageAlt = trim((string) ($model->alt_cover ?? '')) ?: $h1;
        }

        $twitterTitle = trim((string) ($model->twitter_title ?? ''));
        if ($twitterTitle === '') {
            $twitterTitle = $ogTitle;
        }
        $twitterDescription = trim((string) ($model->twitter_description ?? ''));
        if ($twitterDescription === '') {
            $twitterDescription = $ogDescription;
        }
        $twitterImageRaw = trim((string) ($model->twitter_image ?? ''));
        $twitterImage = $twitterImageRaw !== ''
            ? self::absoluteAssetUrl($twitterImageRaw, $publicBaseUrl)
            : ($ogImage !== '' ? $ogImage : self::absoluteAssetUrl((string) ($model->cover ?? ''), $publicBaseUrl));

        $faq = self::normalizeFaq(is_array($model->faq ?? null) ? $model->faq : null);

        $secondary = $model->secondary_keywords ?? null;
        $secondary = self::normalizeSecondaryKeywords($secondary);

        $seoTagsList = self::normalizeRepeaterList($model->seo_tags ?? null, 'tag');

        $relatedCategorySlugs = self::normalizeRepeaterList($model->related_category_slugs ?? null, 'slug');

        $extraRaw = $model->extra_json_ld ?? null;
        $extraJsonLd = is_array($extraRaw)
            ? ExtraJsonLdValidator::sanitizedObjectsFromDatabase($extraRaw)
            : [];

        $bannerDesktop = self::absoluteAssetUrl((string) ($model->seo_banner_desktop ?? ''), $publicBaseUrl);
        $bannerMobile = self::absoluteAssetUrl((string) ($model->seo_banner_mobile ?? ''), $publicBaseUrl);

        $descriptionHtml = $model instanceof SousCategory
            ? trim((string) ($model->description_fr ?? ''))
            : '';
        $shortIntroHtml = trim((string) ($model->short_intro ?? ''));
        if ($descriptionHtml !== '') {
            $shortIntroHtml = $descriptionHtml;
        }

        $seoEnabled = $model->seo_enabled ?? true;
        if ($seoEnabled === null) {
            $seoEnabled = true;
        }

        return [
            'enabled' => (bool) $seoEnabled,
            'title' => $title,
            'meta_description' => $metaDescription,
            'meta_keywords' => $metaKeywords,
            'h1' => $h1,
            'canonical_url' => $canonical,
            'robots' => [
                'index' => (bool) ($model->robots_index ?? true),
                'follow' => (bool) ($model->robots_follow ?? true),
            ],
            'og' => [
                'title' => $ogTitle,
                'description' => $ogDescription,
                'image' => $ogImage,
                'image_alt' => $ogImageAlt,
            ],
            'twitter' => [
                'title' => $twitterTitle,
                'description' => $twitterDescription,
                'image' => $twitterImage,
            ],
            'keywords' => [
                'primary' => trim((string) ($model->primary_keyword ?? '')),
                'secondary' => $secondary,
                'tags' => $seoTagsList,
            ],
            'breadcrumb_label' => trim((string) ($model->breadcrumb_label ?? '')),
            'short_intro_html' => $shortIntroHtml,
            'long_bottom_html' => (string) ($model->long_bottom_content ?? ''),
            'faq' => $faq,
            'banners' => [
                'desktop' => $bannerDesktop,
                'mobile' => $bannerMobile,
            ],
            'related_category_slugs' => array_values(array_unique($relatedCategorySlugs)),
            'extra_json_ld' => $extraJsonLd,
            'sitemap' => [
                'include' => (bool) ($model->sitemap_include ?? true),
                'priority' => $model->sitemap_priority !== null ? (float) $model->sitemap_priority : null,
                'changefreq' => $model->sitemap_changefreq !== null && $model->sitemap_changefreq !== ''
                    ? (string) $model->sitemap_changefreq
                    : null,
            ],
        ];
    }

    /**
     * @param  mixed  $secondary
     * @return list<string>
     */
    private static function normalizeSecondaryKeywords(mixed $secondary): array
    {
        return self::normalizeRepeaterList($secondary, 'term');
    }

    /**
     * @param  mixed  $value
     * @return list<string>
     */
    private static function normalizeRepeaterList(mixed $value, string $rowKey): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            $value = is_array($decoded)
                ? $decoded
                : array_values(array_filter(array_map('trim', preg_split('/[,;]/', $value) ?: [])));
        }

        if (! is_array($value)) {
            return [];
        }

        $items = [];
        foreach ($value as $row) {
            if (is_string($row) || is_numeric($row)) {
                $item = trim((string) $row);
            } elseif (is_array($row) && isset($row[$rowKey])) {
                $item = trim((string) $row[$rowKey]);
            } elseif (is_object($row) && isset($row->{$rowKey})) {
                $item = trim((string) $row->{$rowKey});
            } else {
                $item = '';
            }

            if ($item !== '') {
                $items[] = $item;
            }
        }

        return array_values(array_unique($items));
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
}
