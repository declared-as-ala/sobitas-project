<?php

namespace Tests\Unit;

use App\Support\Gtin;
use Tests\TestCase;

final class GtinTest extends TestCase
{
    /**
     * Real barcodes recovered from products.code_product on the live catalogue. Using real values
     * rather than invented ones means a regression in the weighting order is caught against data
     * we actually have to look up.
     */
    public static function realBarcodes(): array
    {
        return [
            'EAN-13 Ostrovit vitamin C' => ['5903246226645', 'gtin13'],
            'EAN-13 Muscle Care Mg+Ca+B6' => ['5902444705105', 'gtin13'],
            'EAN-13 Quamtrax creatine' => ['8435699405584', 'gtin13'],
            'EAN-13 Zumub omega-3' => ['5600985801040', 'gtin13'],
            'EAN-13 Kevin Levrone creatine' => ['5903719231329', 'gtin13'],
            'UPC-A Tantor whey 2.267kg' => ['638458699806', 'gtin12'],
            'UPC-A MuscleTech NitroTech' => ['631656703313', 'gtin12'],
        ];
    }

    /** @dataProvider realBarcodes */
    public function test_accepts_real_barcodes(string $barcode, string $property): void
    {
        $this->assertSame($barcode, Gtin::normalize($barcode));
        $this->assertTrue(Gtin::isValid($barcode));
        $this->assertSame($property, Gtin::schemaProperty($barcode));
    }

    /**
     * The property test from the source report: mutating any single digit of a valid GTIN must break
     * it. Without this, a transposed digit sails through and we send a lookup for someone else's
     * product — which is how a whey protein ends up carrying another item's Supplement Facts.
     */
    public function test_every_single_digit_mutation_is_rejected(): void
    {
        foreach (array_column(self::realBarcodes(), 0) as $barcode) {
            for ($i = 0; $i < strlen($barcode); $i++) {
                for ($d = 0; $d <= 9; $d++) {
                    if ((int) $barcode[$i] === $d) {
                        continue;
                    }
                    $mutated = substr_replace($barcode, (string) $d, $i, 1);
                    $this->assertFalse(
                        Gtin::isValid($mutated),
                        "Mutating position {$i} of {$barcode} to {$d} produced a GTIN that validated."
                    );
                }
            }
        }
    }

    /**
     * 297 of 309 products hold a 2-3 digit database id in code_product. Treating one as a barcode
     * would send a lookup for id "546" and cheerfully attach whatever came back.
     */
    public function test_rejects_database_ids_and_malformed_input(): void
    {
        foreach (['546', '12', '0', '', 'ABC-1000-EU', '12345', '123456789012345', 'null'] as $value) {
            $this->assertNull(Gtin::normalize($value), "Expected {$value} to be rejected.");
        }
        $this->assertNull(Gtin::normalize(null));
    }

    /** Scanners and spreadsheets emit separators; the digits underneath are still the barcode. */
    public function test_strips_separators(): void
    {
        $this->assertSame('5903246226645', Gtin::normalize(' 5903246226645 '));
        $this->assertSame('5903246226645', Gtin::normalize('5-903246-226645'));
        $this->assertSame('5903246226645', Gtin::normalize('5 903246 226645'));
    }

    /**
     * The POS resolves a scan with `where(code_product, $code)->orWhere(code_product, '0'.$code)`
     * precisely because a 12-digit UPC-A and its zero-prefixed 13-digit form are one product.
     * Anything that compares identifiers has to agree with that, or we create duplicates.
     */
    public function test_upc_a_and_its_zero_padded_ean_13_are_the_same_item(): void
    {
        $upcA = '638458699806';
        $ean13 = '0638458699806';

        $this->assertTrue(Gtin::isValid($upcA));
        $this->assertTrue(Gtin::isValid($ean13), 'Zero-padding must not change the check digit.');
        $this->assertTrue(Gtin::sameItem($upcA, $ean13));
        $this->assertSame(Gtin::toGtin14($upcA), Gtin::toGtin14($ean13));
        $this->assertSame('00638458699806', Gtin::toGtin14($upcA));
    }

    public function test_different_products_are_not_the_same_item(): void
    {
        $this->assertFalse(Gtin::sameItem('5903246226645', '5902444705105'));
        $this->assertFalse(Gtin::sameItem('5903246226645', null));
        $this->assertFalse(Gtin::sameItem(null, null));
    }

    public function test_schema_property_follows_the_value_length(): void
    {
        // Google rejects a gtin13 that is 12 digits long, so the property cannot be hard-coded.
        $this->assertSame('gtin12', Gtin::schemaProperty('638458699806'));
        $this->assertSame('gtin13', Gtin::schemaProperty('5903246226645'));
        $this->assertSame('gtin14', Gtin::schemaProperty('00638458699806'));
    }
}
