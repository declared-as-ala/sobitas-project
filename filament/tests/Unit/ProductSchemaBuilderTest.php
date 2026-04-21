<?php

namespace Tests\Unit;

use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use App\Services\Seo\ProductSchemaBuilder;
use Tests\TestCase;

final class ProductSchemaBuilderTest extends TestCase
{
    public function test_build_graph_returns_null_when_price_is_negative(): void
    {
        $product = new Product([
            'designation_fr' => 'X',
            'slug' => 'x',
            'prix' => -1,
            'qte' => 1,
            'rupture' => false,
        ]);
        $product->id = 1;
        $product->syncOriginal();

        $graph = (new ProductSchemaBuilder)->buildGraph($product, 'https://example.com/shop/x');

        $this->assertNull($graph);
    }

    public function test_offers_availability_out_of_stock_when_quantity_zero(): void
    {
        $product = new Product([
            'designation_fr' => 'X',
            'slug' => 'x',
            'prix' => 10,
            'qte' => 0,
            'rupture' => true,
        ]);
        $product->id = 2;
        $product->syncOriginal();

        $graph = (new ProductSchemaBuilder)->buildGraph($product, 'https://example.com/shop/x');

        $this->assertIsArray($graph);
        $this->assertSame('https://schema.org/OutOfStock', $graph['offers']['availability']);
    }

    public function test_price_valid_until_not_set_without_promo_or_explicit_date(): void
    {
        $product = new Product([
            'designation_fr' => 'X',
            'slug' => 'x',
            'prix' => 10,
            'qte' => 2,
            'rupture' => false,
            'promo' => null,
            'promo_expiration_date' => null,
            'price_valid_until' => null,
        ]);
        $product->id = 3;
        $product->syncOriginal();

        $graph = (new ProductSchemaBuilder)->buildGraph($product, 'https://example.com/shop/x');

        $this->assertIsArray($graph);
        $this->assertArrayNotHasKey('priceValidUntil', $graph['offers']);
    }

    public function test_aggregate_rating_and_review_from_real_reviews_only(): void
    {
        $product = new Product([
            'designation_fr' => 'X',
            'slug' => 'x',
            'prix' => 10,
            'qte' => 1,
            'rupture' => false,
        ]);
        $product->id = 4;
        $product->syncOriginal();

        $user = new User(['name' => 'Jane']);
        $user->id = 1;

        $review = new Review([
            'stars' => 5,
            'comment' => 'Excellent produit',
            'publier' => 1,
            'product_id' => 4,
            'user_id' => 1,
        ]);
        $review->setRelation('user', $user);

        $product->setRelation('reviews', collect([$review]));

        $graph = (new ProductSchemaBuilder)->buildGraph($product, 'https://example.com/shop/x');

        $this->assertIsArray($graph);
        $this->assertArrayHasKey('aggregateRating', $graph);
        $this->assertSame(1, $graph['aggregateRating']['reviewCount']);
        $this->assertArrayHasKey('review', $graph);
    }

    public function test_no_aggregate_rating_when_star_values_are_invalid(): void
    {
        $product = new Product([
            'designation_fr' => 'X',
            'slug' => 'x',
            'prix' => 10,
            'qte' => 1,
            'rupture' => false,
        ]);
        $product->id = 5;
        $product->syncOriginal();

        $review = new Review([
            'stars' => 0,
            'comment' => 'No rating',
            'publier' => 1,
        ]);
        $product->setRelation('reviews', collect([$review]));

        $graph = (new ProductSchemaBuilder)->buildGraph($product, 'https://example.com/shop/x');

        $this->assertIsArray($graph);
        $this->assertArrayNotHasKey('aggregateRating', $graph);
    }

    public function test_schema_facts_excludes_nulls(): void
    {
        $product = new Product([
            'designation_fr' => 'X',
            'slug' => 'x',
            'prix' => 10,
            'qte' => 1,
            'rupture' => false,
        ]);
        $product->id = 6;
        $product->syncOriginal();

        $facts = (new ProductSchemaBuilder)->buildSchemaFacts($product, 'https://example.com/shop/x');

        $this->assertArrayNotHasKey('gtin', $facts);
        $this->assertArrayNotHasKey('mpn', $facts);
        $this->assertSame('https://example.com/shop/x', $facts['canonical_url']);
    }
}
