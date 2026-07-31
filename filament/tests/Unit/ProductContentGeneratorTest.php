<?php

namespace Tests\Unit;

use App\Models\Product;
use App\Services\Content\ProductContentGenerator;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

/**
 * The guardrails, not the happy path.
 *
 * The realistic failure mode here is not a broken API call — it is a plausible-looking draft full
 * of invented Supplement Facts getting approved by a busy owner and published to customers who
 * dose themselves on those numbers. So the validator has to actually reject that, and these tests
 * exist to prove it does rather than to prove the prompt asked nicely.
 */
class ProductContentGeneratorTest extends TestCase
{
    private function validate(array $parsed, Product $product): ?array
    {
        $m = new ReflectionMethod(ProductContentGenerator::class, 'validate');
        $m->setAccessible(true);

        return $m->invoke(new ProductContentGenerator(), $parsed, $product);
    }

    private function product(array $attributes = []): Product
    {
        $p = new Product();
        $p->forceFill(array_merge([
            'id' => 1,
            'designation_fr' => 'WHEY GOLD STANDARD 2.27KG',
            'prix' => 250.000,
            'nutrition_values' => null,
        ], $attributes));

        return $p;
    }

    private function longBody(string $extra = ''): string
    {
        // Comfortably over the 120-word floor so length never masks the assertion under test.
        return '<p>' . str_repeat('Cette whey convient aux sportifs qui cherchent une source pratique après la séance. ', 22) . $extra . '</p>';
    }

    public function test_it_accepts_a_clean_draft(): void
    {
        $out = $this->validate(
            ['description_html' => $this->longBody(), 'faq' => [['q' => 'Quand la prendre ?', 'a' => 'Après la séance.']]],
            $this->product()
        );

        $this->assertNotNull($out);
        $this->assertCount(1, $out['faq']);
    }

    public function test_it_rejects_invented_nutrition_figures(): void
    {
        $this->assertNull($this->validate(
            ['description_html' => $this->longBody('Chaque dose apporte 24 g de protéines.')],
            $this->product()
        ), 'A draft inventing grams of protein must be discarded.');

        $this->assertNull($this->validate(
            ['description_html' => $this->longBody('Protéines : 24 par portion.')],
            $this->product()
        ), 'The "Protéines: N" shape must also be caught.');
    }

    public function test_it_allows_nutrition_figures_when_the_admin_supplied_them(): void
    {
        $out = $this->validate(
            ['description_html' => $this->longBody('Chaque dose apporte 24 g de protéines.')],
            $this->product(['nutrition_values' => 'Protéines 24 g par dose de 30 g'])
        );

        $this->assertNotNull($out, 'Real label data typed by an admin may be quoted.');
    }

    public function test_it_rejects_health_claims(): void
    {
        foreach ([
            'Ce produit guérit les douleurs articulaires.',
            'Cliniquement prouvé pour la performance.',
            'Approuvé par la FDA.',
        ] as $claim) {
            $this->assertNull(
                $this->validate(['description_html' => $this->longBody($claim)], $this->product()),
                "Health claim should be rejected: {$claim}"
            );
        }
    }

    public function test_it_strips_h1_so_the_page_keeps_exactly_one(): void
    {
        $out = $this->validate(
            ['description_html' => '<h1>Whey</h1>' . $this->longBody()],
            $this->product()
        );

        $this->assertNotNull($out);
        $this->assertStringNotContainsStringIgnoringCase('<h1', $out['description']);
    }

    public function test_it_rejects_drafts_that_are_too_short(): void
    {
        $this->assertNull($this->validate(['description_html' => '<p>Bonne whey.</p>'], $this->product()));
        $this->assertNull($this->validate(['description_html' => ''], $this->product()));
    }

    public function test_the_price_is_not_mistaken_for_an_invented_figure(): void
    {
        $out = $this->validate(
            ['description_html' => $this->longBody('Disponible à 250.000 DT avec paiement à la livraison.')],
            $this->product()
        );

        $this->assertNotNull($out, 'A known price must not trip the invented-numbers guard.');
    }

    public function test_it_drops_malformed_faq_entries(): void
    {
        $out = $this->validate([
            'description_html' => $this->longBody(),
            'faq' => [
                ['q' => 'Bonne question ?', 'a' => 'Bonne réponse.'],
                ['q' => '', 'a' => 'Sans question'],
                ['q' => 'Sans réponse ?', 'a' => ''],
            ],
        ], $this->product());

        $this->assertNotNull($out);
        $this->assertCount(1, $out['faq']);
    }
}
