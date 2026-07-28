<?php

namespace App\Services\Seo;

use App\Models\Product;
use App\Models\Review;
use App\Support\Seo\ProductPublicUrl;
use Illuminate\Support\Str;

/**
 * Builds honest schema.org Product JSON-LD from the Product model and published reviews.
 * No fake ratings, no placeholder priceValidUntil, no manual seo_review / seo_aggregate_rating strings.
 */
final class ProductSchemaBuilder
{
    private const SELLER_NAME = 'Protein.tn';

    /**
     * @return array<string, mixed>|null null when price is invalid for rich results
     */
    public function buildGraph(Product $product, string $canonicalProductUrl): ?array
    {
        $price = (float) $product->getEffectiveUnitPrice();
        if (! is_finite($price) || $price < 0) {
            return null;
        }

        $name = trim((string) ($product->designation_fr ?? '')) ?: 'Produit';
        $description = $this->plainDescription($product);
        $images = $this->collectImageUrls($product);

        $sku = trim((string) $product->effective_sku);
        if ($sku === '') {
            $sku = $product->id ? (string) $product->id : 'product';
        }

        $offers = [
            '@type' => 'Offer',
            'url' => $canonicalProductUrl,
            'priceCurrency' => 'TND',
            'price' => $this->formatPrice($price),
            'availability' => $product->effective_availability_schema,
            'itemCondition' => $product->effective_item_condition_schema,
            'seller' => [
                '@type' => 'Organization',
                'name' => self::SELLER_NAME,
            ],
        ];

        $until = $product->effective_price_valid_until;
        if (is_string($until) && $until !== '') {
            $offers['priceValidUntil'] = $until;
        }

        $graph = [
            '@context' => 'https://schema.org',
            '@type' => 'Product',
            'name' => $name,
            'sku' => $sku,
            'productID' => $sku,
            'offers' => $offers,
        ];

        if ($description !== '') {
            $graph['description'] = $description;
        }

        if ($images !== []) {
            $graph['image'] = count($images) === 1 ? $images[0] : $images;
        }

        $gtin = trim((string) ($product->gtin ?? ''));
        if ($gtin !== '') {
            $graph['gtin'] = $gtin;
        }

        $mpn = trim((string) ($product->mpn ?? ''));
        if ($mpn !== '') {
            $graph['mpn'] = $mpn;
        }

        $brandName = trim((string) ($product->brand?->designation_fr ?? ''));
        if ($brandName !== '') {
            $graph['brand'] = [
                '@type' => 'Brand',
                'name' => $brandName,
            ];
        }

        $this->mergeReviewSchema($graph, $product);

        return $graph;
    }

    /**
     * Slim schema facts for API consumers (no manual SEO rating strings).
     *
     * @return array<string, mixed>
     */
    public function buildSchemaFacts(Product $product, string $canonicalProductUrl): array
    {
        $reviews = $this->publishedReviews($product);
        $ratingValues = $reviews->map(fn (Review $r) => $this->reviewStarValue($r))->filter(fn (int $n) => $n >= 1 && $n <= 5);

        $out = [
            'sku' => trim((string) $product->effective_sku) ?: ($product->id ? (string) $product->id : null),
            'gtin' => filled(trim((string) ($product->gtin ?? ''))) ? trim((string) $product->gtin) : null,
            'mpn' => filled(trim((string) ($product->mpn ?? ''))) ? trim((string) $product->mpn) : null,
            'brand' => $product->brand?->designation_fr,
            'price' => (float) $product->getEffectiveUnitPrice(),
            'price_currency' => 'TND',
            'availability' => $product->effective_availability_schema,
            'item_condition' => $product->effective_item_condition_schema,
            'price_valid_until' => $product->effective_price_valid_until,
            'image' => ProductPublicUrl::fromPath($product->effective_seo_image_path),
            'image_alt' => $product->effective_seo_image_alt,
            'canonical_url' => $canonicalProductUrl,
            'rating_value' => $ratingValues->isNotEmpty() ? round($ratingValues->avg(), 1) : null,
            'review_count' => $reviews->count(),
        ];

        return array_filter(
            $out,
            static fn ($v) => $v !== null && $v !== ''
        );
    }

    private function plainDescription(Product $product): string
    {
        $raw = trim((string) ($product->seo_schema_description ?? ''));
        if ($raw === '') {
            $raw = (string) ($product->effectiveSeoDescription() ?? '');
        }
        if ($raw === '' && filled($product->description_fr)) {
            $raw = (string) $product->description_fr;
        }

        return Str::of($raw)->replaceMatches('/<[^>]*>/', ' ')->squish()->limit(5000, '')->toString();
    }

    /**
     * @return list<string>
     */
    private function collectImageUrls(Product $product): array
    {
        $paths = [];
        $cover = trim((string) ($product->effective_seo_image_path ?? ''));
        if ($cover !== '') {
            $paths[] = $cover;
        }

        $images = $product->images;
        if (is_array($images)) {
            foreach ($images as $item) {
                if (is_string($item) && $item !== '' && $item !== $cover) {
                    $paths[] = $item;
                }
                if (is_array($item) && isset($item['path']) && is_string($item['path'])) {
                    $p = $item['path'];
                    if ($p !== '' && $p !== $cover) {
                        $paths[] = $p;
                    }
                }
            }
        }

        $urls = [];
        foreach (array_slice(array_unique($paths), 0, 12) as $path) {
            $url = ProductPublicUrl::fromPath($path);
            if ($url !== null && ! str_contains($url, ' ')) {
                $urls[] = $url;
            }
        }

        return $urls;
    }

    /**
     * @param  array<string, mixed>  $graph
     */
    private function mergeReviewSchema(array &$graph, Product $product): void
    {
        $reviews = $this->publishedReviews($product);
        if ($reviews->isEmpty()) {
            return;
        }

        $values = $reviews->map(fn (Review $r) => $this->reviewStarValue($r))->filter(fn (int $n) => $n >= 1 && $n <= 5);
        if ($values->isEmpty()) {
            return;
        }

        $ratingValue = max(1.0, min(5.0, round($values->avg() * 10) / 10));
        $reviewCount = $reviews->count();

        $graph['aggregateRating'] = [
            '@type' => 'AggregateRating',
            'ratingValue' => (string) $ratingValue,
            'bestRating' => 5,
            'worstRating' => 1,
            'reviewCount' => $reviewCount,
        ];

        $reviewNodes = [];
        foreach ($reviews as $review) {
            $body = trim((string) ($review->comment ?? ''));
            if ($body === '') {
                continue;
            }
            $stars = $this->reviewStarValue($review);
            if ($stars < 1) {
                continue;
            }

            $authorName = trim((string) ($review->user?->name ?? ''));
            if ($authorName === '') {
                $authorName = 'Client';
            }

            $node = [
                '@type' => 'Review',
                'author' => ['@type' => 'Person', 'name' => $authorName],
                'reviewRating' => [
                    '@type' => 'Rating',
                    'ratingValue' => $stars,
                    'bestRating' => 5,
                    'worstRating' => 1,
                ],
                'reviewBody' => Str::limit($body, 1000, ''),
            ];

            if ($review->created_at) {
                $node['datePublished'] = $review->created_at->toIso8601String();
            }

            $reviewNodes[] = $node;
        }

        if ($reviewNodes !== []) {
            $graph['review'] = count($reviewNodes) === 1 ? $reviewNodes[0] : $reviewNodes;
        }
    }

    /**
     * Reviews eligible to appear in STRUCTURED DATA — i.e. reviews we can attest to.
     *
     * "Published" is not the same as "real", and on this catalogue the difference is total. An
     * audit of the live API found every sampled product carrying ~200 published reviews with
     * verified = 0 and commande_id = NULL on every single row, drawn from a shared pool: a
     * lateral-pulldown machine and a shoulder press share 72 byte-identical comments, and the
     * shoulder press carries "Vanilla طعمها هايل" ("the vanilla tastes great"). Those reviews were
     * seeded, not written by customers, and this builder was feeding them to Google as
     * AggregateRating 4.6 / reviewCount 203.
     *
     * Publishing review rich results that are not genuine customer reviews is a Google spam policy
     * violation and risks a manual action against the whole domain — a far larger downside than
     * any star-rating uplift. So structured data now requires evidence the review came from a real
     * purchase: `verified = 1`, or a `commande_id` linking it to an order.
     *
     * This does NOT hide anything from shoppers: the site still renders whatever the admin has
     * published. It only stops us ASSERTING those ratings to search engines.
     *
     * Once the review-request flow (BackfillReviewRequests + the post-delivery email) starts
     * producing genuine verified reviews, they satisfy this gate automatically and the stars come
     * back on their own — earned rather than asserted.
     */
    private function publishedReviews(Product $product): \Illuminate\Support\Collection
    {
        $rel = $product->relationLoaded('reviews')
            ? $product->reviews
            : $product->reviews()->where('publier', 1)->get();

        return $rel
            ->filter(fn ($r) => $r instanceof Review && (int) ($r->publier ?? 0) === 1)
            ->filter(fn (Review $r) => self::isAttestedPurchase($r))
            ->values();
    }

    /** True when the review is tied to a real order, the only evidence we have that it is genuine. */
    public static function isAttestedPurchase(Review $review): bool
    {
        if ((int) ($review->verified ?? 0) === 1) {
            return true;
        }

        return ($review->commande_id ?? null) !== null;
    }

    private function reviewStarValue(Review $review): int
    {
        $s = $review->stars ?? $review->note ?? null;
        $n = is_numeric($s) ? (int) $s : 0;

        return max(0, min(5, $n));
    }

    private function formatPrice(float $price): string
    {
        $rounded = round($price, 2);

        return fmod($rounded, 1.0) === 0.0 ? (string) (int) $rounded : number_format($rounded, 2, '.', '');
    }
}
