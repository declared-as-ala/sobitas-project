<?php

namespace Tests\Unit;

use App\Support\AmountInWords;
use App\Support\PrintTaxRecap;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * The amount printed in words under every invoice and quote. It used to be computed in the page by
 * JavaScript — which DomPDF never runs, so the e-mailed PDFs said « calcul… » — and it wrote
 * « Quarante-un mille » and « 500 millimes ». These are the French rules it must hold.
 */
class AmountInWordsTest extends TestCase
{
    /** @return array<string, array{0: float|int, 1: string}> */
    public static function amounts(): array
    {
        return [
            'zero' => [0, 'Zéro dinar'],
            'one' => [1, 'Un dinar'],
            'one millime' => [1.001, 'Un dinar et un millime'],
            'teens' => [17, 'Dix-sept dinars'],
            'vingt et un' => [21, 'Vingt et un dinars'],
            'soixante et onze' => [71, 'Soixante et onze dinars'],
            'quatre-vingts' => [80, 'Quatre-vingts dinars'],
            'quatre-vingt-un' => [81, 'Quatre-vingt-un dinars'],
            'quatre-vingt-onze' => [91, 'Quatre-vingt-onze dinars'],
            'cent un' => [101, 'Cent un dinars'],
            'deux cents' => [200, 'Deux cents dinars'],
            'deux cent un' => [201, 'Deux cent un dinars'],
            'mille' => [1000, 'Mille dinars'],
            'quatre-vingt mille' => [80000, 'Quatre-vingt mille dinars'],
            'deux cent mille' => [200000, 'Deux cent mille dinars'],
            'un million de' => [1000000, 'Un million de dinars'],
            'deux cents millions de' => [200000000, 'Deux cents millions de dinars'],
            'invoice 2026/0071' => [1250.5, 'Mille deux cent cinquante dinars et cinq cents millimes'],
            'quote 2026/0009' => [41651, 'Quarante et un mille six cent cinquante et un dinars'],
            'delivery note BL-2026-0344' => [309, 'Trois cent neuf dinars'],
            'float noise' => [355.81, 'Trois cent cinquante-cinq dinars et huit cent dix millimes'],
            'millimes only' => [0.5, 'Zéro dinar et cinq cents millimes'],
        ];
    }

    #[DataProvider('amounts')]
    public function test_amount_in_words(float|int $amount, string $expected): void
    {
        $this->assertSame($expected, AmountInWords::fr($amount));
    }

    public function test_tax_recap_sums_exactly_to_the_totals_with_a_remise_and_two_rates(): void
    {
        $rows = [
            ['tva' => 19, 'total_ht' => 700.0],
            ['tva' => 19, 'total_ht' => 280.0],
            ['tva' => 7, 'total_ht' => 70.333],
        ];
        // InvoiceCalculator: TVA on the raw lines, then reduced proportionally to the remise.
        $totalHt = 1050.333;
        $remise = 33.333;
        $rawTva = 700 * 0.19 + 280 * 0.19 + 70.333 * 0.07;
        $totalTva = round($rawTva - $rawTva * $remise / $totalHt, 3);

        $buckets = PrintTaxRecap::buckets($rows, $totalHt, $remise, $totalTva);

        $this->assertSame(['7', '19'], array_map('strval', array_keys($buckets)));
        $this->assertEqualsWithDelta(round($totalHt - $remise, 3), array_sum(array_column($buckets, 'base')), 0.0000001);
        $this->assertEqualsWithDelta($totalTva, array_sum(array_column($buckets, 'montant')), 0.0000001);
    }

    public function test_tax_recap_single_rate_is_the_totals_themselves(): void
    {
        $buckets = PrintTaxRecap::buckets([['tva' => 19, 'total_ht' => 35000.0]], 35000.0, 0.0, 6650.0);

        $this->assertSame(['19' => ['base' => 35000.0, 'montant' => 6650.0]], $buckets);
    }
}
