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

    private function productWithGtin(?string $gtin, int $id): Product
    {
        $product = new Product([
            'designation_fr' => 'X',
            'slug' => 'x',
            'prix' => 10,
            'qte' => 1,
            'rupture' => false,
            'gtin' => $gtin,
        ]);
        $product->id = $id;
        $product->syncOriginal();

        return $product;
    }

    public function test_valid_gtin_is_emitted_with_its_length_specific_twin(): void
    {
        // Real EAN-13 recovered from products.code_product (Ostrovit vitamin C).
        $graph = (new ProductSchemaBuilder)->buildGraph(
            $this->productWithGtin('5903246226645', 10),
            'https://example.com/shop/x'
        );

        $this->assertSame('5903246226645', $graph['gtin']);
        $this->assertSame('5903246226645', $graph['gtin13']);
        $this->assertArrayNotHasKey('gtin12', $graph);
    }

    public function test_upc_a_is_declared_as_gtin12_not_gtin13(): void
    {
        // Declaring a 12-digit value as gtin13 is rejected by Google, so the property must follow
        // the value's length rather than being hard-coded.
        $graph = (new ProductSchemaBuilder)->buildGraph(
            $this->productWithGtin('638458699806', 11),
            'https://example.com/shop/x'
        );

        $this->assertSame('638458699806', $graph['gtin12']);
        $this->assertArrayNotHasKey('gtin13', $graph);
    }

    /**
     * A malformed identifier is worse than none — Google reports it as a structured-data error and
     * Merchant Center can disapprove the item. Before validation was added, whatever string sat in
     * the column was published verbatim.
     */
    public function test_gtin_failing_its_check_digit_is_not_published(): void
    {
        $graph = (new ProductSchemaBuilder)->buildGraph(
            $this->productWithGtin('5903246226646', 12), // last digit mutated
            'https://example.com/shop/x'
        );

        $this->assertArrayNotHasKey('gtin', $graph);
        $this->assertArrayNotHasKey('gtin13', $graph);
    }

    /**
     * 297 of 309 products hold a short database id in code_product. If one is ever copied into the
     * gtin column it must not reach the page.
     */
    public function test_database_id_in_the_gtin_column_is_not_published(): void
    {
        $graph = (new ProductSchemaBuilder)->buildGraph(
            $this->productWithGtin('546', 13),
            'https://example.com/shop/x'
        );

        $this->assertArrayNotHasKey('gtin', $graph);

        $facts = (new ProductSchemaBuilder)->buildSchemaFacts(
            $this->productWithGtin('546', 14),
            'https://example.com/shop/x'
        );
        $this->assertArrayNotHasKey('gtin', $facts);
    }

    public function test_separators_from_scanners_are_normalised_before_publishing(): void
    {
        $graph = (new ProductSchemaBuilder)->buildGraph(
            $this->productWithGtin('5-903246-226645', 15),
            'https://example.com/shop/x'
        );

        $this->assertSame('5903246226645', $graph['gtin']);
    }
}
