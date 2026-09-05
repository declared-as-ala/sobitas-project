<?php

namespace Tests\Unit;

use App\Services\Enrichment\ResearchValidator;
use App\Support\PopularProductNutrition20260905;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PopularProductNutrition20260905Test extends TestCase
{
    #[Test]
    public function it_contains_twenty_traceable_and_validated_product_panels(): void
    {
        $records = PopularProductNutrition20260905::records();

        $this->assertCount(20, $records);
        $this->assertArrayHasKey('anabolic-whey-80-2-25kg-proactive', $records);

        $validator = app(ResearchValidator::class);
        foreach ($records as $slug => $record) {
            $this->assertNotNull($validator->nutritionFacts($record), $slug.' has an invalid nutrition panel');
            $this->assertMatchesRegularExpression('#^https://#', $record['source_url'], $slug.' has no traceable HTTPS source');
            $this->assertNotEmpty($record['rows'], $slug.' has no comparison facts');
        }
    }
}
