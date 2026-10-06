<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Commande;
use App\Models\Coordinate;
use App\Models\DetailsFactureTva;
use App\Models\DetailsQuotation;
use App\Models\Facture;
use App\Models\FactureTva;
use App\Models\Product;
use App\Models\Quotation;
use App\Services\DevisCalculator;
use App\Services\InvoiceCalculator;
use Illuminate\Support\Collection;
use Tests\TestCase;

/**
 * The invoice and the quote in the bon de livraison's classic layout, rendered the two ways they
 * reach people: the browser print (HTML) and the DomPDF file that is downloaded and e-mailed.
 *
 * The data is built exactly as routes/web.php and DocumentPdfController build it, from in-memory
 * models — no database. Fixtures are real documents from the admin (invoice 2026/0071, quote
 * 2026/0009) plus a long, discounted invoice. Set PRINT_PREVIEW_DIR to keep the HTML and PDF files.
 */
class ClassicPrintDocumentsTest extends TestCase
{
    public function test_invoice_2026_0071_renders_in_the_classic_layout_with_the_same_amounts(): void
    {
        $data = $this->invoiceData('2026/0071', [
            ['XTEND BCAA 420G', 5, 140.0],
            ['VICTOR MARTINEZ BREAK-OUT™ PRE-WORKOUT', 2, 140.0],
            ['Magnesium + Vitamin B6 90 Tablets', 1, 70.0],
        ], ['timbre' => 1]);

        $html = $this->html('print.facture-tva', $data, 'facture-2026-0071');

        $this->assertStringContainsString('Facture N° 2026/0071', $html);
        $this->assertStringContainsString('Arrêtée la présente facture à la somme de :', $html);
        $this->assertStringContainsString('Mille deux cent cinquante dinars et cinq cents millimes', $html);
        $this->assertStringContainsString('1 050.000', $html);   // Total H.T.
        $this->assertStringContainsString('199.500', $html);     // T.V.A — totals and recap
        $this->assertStringContainsString('1 249.500', $html);   // Total T.T.C. (before timbre)
        $this->assertStringContainsString('1 250.500', $html);   // Net à payer
        $this->assertStringContainsString('Matricule fiscal', $html);
        $this->assertStringContainsString('0350765011500468753', $html); // RIB kept
        $this->assertStringContainsString('ESZ', $html);
        $this->assertStringNotContainsString('calcul…', $html);
        $this->assertStringNotContainsString('<script', $html);

        $this->assertSame(1, $this->pdfPages('print.facture-tva', $data, 'facture-2026-0071'));
    }

    public function test_long_discounted_invoice_keeps_every_breakdown_row_and_stays_within_two_sheets(): void
    {
        $lines = [];
        foreach (range(1, 18) as $i) {
            $lines[] = ['ISO 100 Hydrolyzed Whey Protein Isolate 2,27 kg (5 lb) - Gourmet Chocolate - Dymatize Nutrition '.$i, 1 + $i % 3, 89.5 + $i];
        }
        $order = (new Commande)->forceFill([
            'id' => 1453, 'numero' => '2026/0453', 'prix_ht' => 2000.0,
            'pack_discount_ht' => 30.32, 'discount_ht' => 0, 'points_discount_ht' => 15.0, 'points_redeemed' => 300,
        ]);
        $bl = (new Facture)->forceFill(['id' => 539, 'numero' => 'BL-2026-0344']);
        $data = $this->invoiceData('2026/0072', $lines, ['timbre' => 1, 'remise' => 50.32, 'facture_id' => 539, 'commande_id' => 1453], $order, $bl);

        $html = $this->html('print.facture-tva', $data, 'facture-long');

        $this->assertStringContainsString('Remise pack', $html);
        $this->assertStringContainsString('Protinas (300 pts)', $html);
        $this->assertStringContainsString('Remise</td>', $html);            // residual 5.000 above the order's amounts
        $this->assertStringContainsString('Net H.T. (base imposable)', $html);
        $this->assertStringContainsString('Réf. bon de livraison : BL-2026-0344', $html);
        $this->assertStringContainsString('N° commande web : 2026/0453', $html);
        $this->assertLessThanOrEqual(2, $this->pdfPages('print.facture-tva', $data, 'facture-long'));
    }

    public function test_invoice_renders_with_the_row_shape_of_the_emailed_pdf(): void
    {
        // FactureTvaSent builds its rows WITHOUT 'montant_tva' (and with total_ttc = pu_ttc × qte).
        // The previous template read 'montant_tva' unconditionally, so the e-mailed PDF could not render.
        $data = $this->invoiceData('2026/0071', [
            ['XTEND BCAA 420G', 5, 140.0],
            ['Magnesium + Vitamin B6 90 Tablets', 1, 70.0],
        ], ['timbre' => 1]);
        $data['invoice_rows'] = array_map(function (array $r) {
            unset($r['montant_tva']);
            $r['total_ttc'] = round($r['pu_ttc'] * $r['qte'], 3);

            return $r;
        }, $data['invoice_rows']);
        $data['paymentTerms'] = 'Paiement à réception. Virement bancaire ou espèces. Merci de préciser le n° de facture.';
        $data['status_label'] = 'Émise';

        $html = $this->html('print.facture-tva', $data, 'facture-email-shape');

        $this->assertStringContainsString('133.000', $html);  // MNT.T.V.A of line 1, derived
        $this->assertStringContainsString('13.300', $html);   // MNT.T.V.A of line 2, derived
        $this->assertSame(1, $this->pdfPages('print.facture-tva', $data, 'facture-email-shape'));
    }

    public function test_quote_2026_0009_renders_with_correct_words_and_no_wrapped_amounts(): void
    {
        $data = $this->quoteData('2026/0009', [['Ring de boxe professionnel', 1, 35000.0]], ['timbre' => 1]);

        $html = $this->html('print.devis', $data, 'devis-2026-0009');

        $this->assertStringContainsString('Devis N° 2026/0009', $html);
        $this->assertStringContainsString('Ce devis n’est pas une facture', $html);
        $this->assertStringContainsString('Arrêté le présent devis à la somme de :', $html);
        $this->assertStringContainsString('Quarante et un mille six cent cinquante et un dinars', $html);
        $this->assertStringContainsString('41 651.000', $html);
        $this->assertStringContainsString('Valable 30 jours', $html);
        $this->assertStringContainsString('Bon pour accord', $html);
        $this->assertStringNotContainsString('<script', $html);

        $this->assertSame(1, $this->pdfPages('print.devis', $data, 'devis-2026-0009'));
    }

    public function test_quote_with_a_remise_and_a_company_note(): void
    {
        $data = $this->quoteData('2026/0010', [
            ['Gold Standard 100% Whey 2,27 kg - Double Rich Chocolate', 4, 318.49],
            ['Micronized Creatine Powder 600 g', 2, 125.21],
            ['Serious Mass 5,45 kg - Chocolate', 1, 251.26],
        ], ['remise' => 120, 'timbre' => 1], 'Prix sous réserve de disponibilité du stock.');

        $html = $this->html('print.devis', $data, 'devis-remise');

        $this->assertStringContainsString('- 120.000', $html);
        $this->assertStringContainsString('Net H.T. (base imposable)', $html);
        $this->assertStringContainsString('Prix sous réserve de disponibilité du stock.', $html);
        $this->assertSame(1, $this->pdfPages('print.devis', $data, 'devis-remise'));
    }

    // ── fixtures, built the way routes/web.php and DocumentPdfController build them ────────────

    private function coordinate(): Coordinate
    {
        return (new Coordinate)->forceFill([
            'abbreviation' => 'Proteine Tunisie',
            'designation_fr' => 'Proteine Tunisie',
            'adresse_fr' => 'Rue Ribat, Sousse 4000',
            'registre_commerce' => 'B91142842015',
            'matricule' => '1411068/Q/A/M/000',
            'phone_1' => '+216 22 464 315',
            'phone_2' => '+216 73 200 169',
            'email' => 'contact@protein.tn',
            'rib' => '0350765011500468753',
            'tva' => 19,
        ]);
    }

    private function client(): Client
    {
        return (new Client)->forceFill([
            'id' => 5126, 'name' => 'ESZ', 'adresse' => 'Route de Djerba, Zarzis', 'ville' => 'Zarzis',
            'matricule' => '1397392N', 'phone_1' => '54029320', 'email' => 'contact@esz.tn',
        ]);
    }

    /** @param list<array{0: string, 1: int, 2: float}> $lines */
    private function details(string $class, array $lines): Collection
    {
        return collect($lines)->map(function (array $l, int $i) use ($class) {
            $product = (new Product)->forceFill(['id' => 100 + $i, 'designation_fr' => $l[0]]);

            return (new $class)->forceFill(['produit_id' => 100 + $i, 'qte' => $l[1], 'prix_unitaire' => $l[2], 'tva' => 19])
                ->setRelation('product', $product);
        });
    }

    private function invoiceData(string $numero, array $lines, array $attrs, ?Commande $order = null, ?Facture $bl = null): array
    {
        $coordonnee = $this->coordinate();
        $client = $this->client();
        $facture = (new FactureTva)->forceFill(['id' => 786, 'numero' => $numero, 'date_facture' => '2026-09-29'] + $attrs);
        $facture->setRelation('client', $client)->setRelation('commande', $order)->setRelation('facture', $bl);
        $details = $this->details(DetailsFactureTva::class, $lines);

        $calcTotals = InvoiceCalculator::calculate($details->toArray(), (float) ($facture->remise ?? 0), (float) ($facture->timbre ?? 0), 19);
        $invoiceRows = $details->map(function ($d, $i) {
            $qte = (int) $d->qte;
            $puHt = (float) $d->prix_unitaire;
            $totalHt = round($puHt * $qte, 3);
            $montantTva = round($totalHt * 19 / 100, 3);

            return [
                'index' => $i + 1, 'produit' => $d->product->designation_fr, 'qte' => $qte, 'pu_ht' => $puHt,
                'pu_ttc' => round($puHt * 1.19, 3), 'total_ht' => $totalHt, 'tva_pct' => 19.0,
                'montant_tva' => $montantTva, 'total_ttc' => round($totalHt + $montantTva, 3),
            ];
        })->all();

        return [
            'facture' => $facture, 'details_facture' => $details, 'invoice_rows' => $invoiceRows,
            'coordonnee' => $coordonnee, 'company' => $coordonnee, 'documentTitle' => 'Facture',
            'documentNumber' => $numero, 'documentDate' => '29/09/2026', 'client' => $client,
            'calcTotals' => $calcTotals, 'footerNote' => null, 'backUrl' => '/facture-tvas',
        ];
    }

    private function quoteData(string $numero, array $lines, array $attrs, ?string $noteDevis = null): array
    {
        $coordonnee = $this->coordinate();
        $client = $this->client()->forceFill(['name' => 'Union Sportive Mourouj', 'adresse' => 'Complexe Sportif Municipal Mourouj 1 2074 – Tunisie']);
        $quotation = (new Quotation)->forceFill(['id' => 15, 'numero' => $numero, 'date_quotation' => '2026-08-25'] + $attrs);
        $quotation->setRelation('client', $client);
        $details = $this->details(DetailsQuotation::class, $lines);

        $calcTotals = InvoiceCalculator::calculate(
            $details->map(fn ($d) => ['produit_id' => $d->produit_id, 'qte' => (int) $d->qte, 'prix_unitaire' => (float) $d->prix_unitaire, 'tva_pct' => 19.0])->toArray(),
            (float) ($quotation->remise ?? 0),
            (float) ($quotation->timbre ?? 0),
            19
        );

        return [
            'facture' => $quotation, 'details_facture' => $details,
            'devis_lines' => DevisCalculator::lines($details, 19)['lines'], 'calcTotals' => $calcTotals,
            'coordonnee' => $coordonnee, 'company' => $coordonnee, 'documentTitle' => 'Devis',
            'documentNumber' => $numero, 'documentDate' => '25/08/2026', 'client' => $client,
            'footerNote' => null, 'noteDevis' => $noteDevis,
            'paymentTerms' => 'Valable 30 jours. Paiement à la commande ou à la livraison.',
            'backUrl' => '/quotations',
        ];
    }

    // ── rendering ───────────────────────────────────────────────────────────────────────────

    private function html(string $view, array $data, string $name): string
    {
        $html = view($view, $data)->render();
        $this->keep($name.'.html', $html);

        return $html;
    }

    private function pdfPages(string $view, array $data, string $name): int
    {
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView($view, $data + ['forPdf' => true])->setPaper('a4', 'portrait')->output();
        $this->assertStringStartsWith('%PDF', $pdf);
        $this->keep($name.'.dompdf.pdf', $pdf);

        return preg_match_all('#/Type\s*/Page(?![a-zA-Z])#', $pdf);
    }

    private function keep(string $file, string $contents): void
    {
        $dir = getenv('PRINT_PREVIEW_DIR') ?: '';
        if ($dir !== '' && is_dir($dir)) {
            file_put_contents(rtrim($dir, '/').'/'.$file, $contents);
        }
    }
}
