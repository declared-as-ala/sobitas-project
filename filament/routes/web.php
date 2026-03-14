<?php

use App\Livewire\Form;
use App\Models\Client;
use App\Models\DetailsFacture;
use App\Services\MarketingService;
use App\Models\Facture;
use Illuminate\Support\Facades\Route;

Route::get('form', Form::class);

Route::get('unsubscribe', function () {
    $token = request('t');
    $sign = request('s');
    if (!$token || !$sign) {
        return response()->view('marketing.unsubscribe', ['success' => false, 'message' => 'Lien invalide.'], 400);
    }
    $data = MarketingService::resolveUnsubscribe($token, $sign);
    if (!$data) {
        return response()->view('marketing.unsubscribe', ['success' => false, 'message' => 'Lien expiré ou invalide.'], 400);
    }
    $channel = $data['c'] ?? '';
    $recipient = $data['r'] ?? '';
    $clientId = $data['id'] ?? null;
    $query = $clientId ? Client::where('id', $clientId) : null;
    if (!$query && $recipient) {
        if ($channel === 'email') {
            $query = Client::where('email', $recipient);
        } elseif ($channel === 'sms') {
            $query = Client::where('phone_1', $recipient);
        }
    }
    if ($query && $channel === 'email') {
        $query->update(['email_unsubscribed_at' => now()]);
    } elseif ($query && $channel === 'sms') {
        $query->update(['sms_unsubscribed_at' => now()]);
    }
    return view('marketing.unsubscribe', ['success' => true, 'message' => 'Vous êtes désinscrit.']);
})->name('unsubscribe');

Route::redirect('login-redirect', 'login')->name('login');

Route::middleware(['auth'])->group(function () {
    Route::get('factures/{facture}/print', function (Facture $facture) {
        $facture->load('client');
        $details_facture = DetailsFacture::where('facture_id', $facture->id)
            ->with('product:id,designation_fr,cover')
            ->get();
        $coordonnee = \App\Models\Coordinate::first();
        $totalHt = $details_facture->sum(fn($d) => ($d->qte ?? $d->quantite ?? 1) * ($d->prix_unitaire ?? $d->prix_ht ?? 0));
        $remise = (float) ($facture->remise ?? 0);
        $frais = (float) ($facture->frais_livraison ?? 0);
        // Assuming no TVA for BL based on current logic, so TTC = HT. 
        // If the system has prix_ttc per line, we sum that. If not, it falls back to HT.
        $totalTtc = $details_facture->sum(fn($d) => ($d->qte ?? $d->quantite ?? 1) * ($d->prix_ttc ?? $d->prix_unitaire ?? $d->prix_ht ?? 0));
        $netAPayer = max($totalTtc - $remise + $frais, 0);

        return view('print.bon-de-livraison', [
            'facture' => $facture,
            'details_facture' => $details_facture,
            'coordonnee' => $coordonnee,
            'company' => $coordonnee,
            'documentTitle' => 'Bon de Livraison',
            'documentNumber' => $facture->numero,
            'documentDate' => $facture->created_at?->format('d/m/Y'),
            'client' => $facture->client,
            'calc_total_ht' => $totalHt,
            'calc_remise' => $remise,
            'calc_frais' => $frais,
            'calc_net_a_payer' => $netAPayer,
            'calc_pourcentage_remise' => (float) ($facture->pourcentage_remise ?? 0),
            'footerNote' => $coordonnee && !empty($coordonnee->note) ? $coordonnee->note : null,
            'paymentTerms' => 'Paiement à la livraison ou par virement.',
        ]);
    })->name('factures.print');

    Route::get('tickets/{ticket}/print', function (\App\Models\Ticket $ticket) {
        $ticket->load('client');
        $details_ticket = \App\Models\DetailsTicket::where('ticket_id', $ticket->id)
            ->with('product:id,designation_fr')
            ->get();
        $coordonnee = \App\Models\Coordinate::getCached();

        return view('print.ticket', [
            'ticket'         => $ticket,
            'details_ticket' => $details_ticket,
            'coordonnee'     => $coordonnee,
            'company'        => $coordonnee,
            'documentDate'   => $ticket->date_ticket
                ? \Carbon\Carbon::parse($ticket->date_ticket)->format('d/m/Y')
                : ($ticket->created_at?->format('d/m/Y') ?? ''),
            'documentTime'   => $ticket->created_at?->format('H:i') ?? '',
        ]);
    })->name('tickets.print');

    Route::get('facture-tvas/{factureTva}/print', function (\App\Models\FactureTva $factureTva) {
        $factureTva->load('client');
        $details_facture = \App\Models\DetailsFactureTva::where('facture_tva_id', $factureTva->id)
            ->with('product:id,designation_fr')
            ->get();
        $coordonnee = \App\Models\Coordinate::first();
        $defaultTva = (float) ($factureTva->tva ?? 19);
        $calcTotals = \App\Services\InvoiceCalculator::calculate(
            $details_facture->toArray(),
            (float) ($factureTva->remise ?? 0),
            (float) ($factureTva->timbre ?? 0),
            $defaultTva
        );

        $invoice_rows = $details_facture->map(function ($d, $i) use ($defaultTva) {
            $qte = (int) ($d->qte ?? $d->quantite ?? 0);
            $pu_ht = (float) ($d->prix_unitaire ?? 0);
            $tva_pct = (float) ($d->tva ?? $defaultTva);
            $pu_ttc = round($pu_ht * (1 + $tva_pct / 100), 3);
            $total_ht = round($pu_ht * $qte, 3);
            $total_ttc = round($pu_ttc * $qte, 3);
            return [
                'index' => $i + 1,
                'produit' => $d->product->designation_fr ?? '—',
                'qte' => $qte,
                'pu_ht' => $pu_ht,
                'tva_pct' => $tva_pct,
                'pu_ttc' => $pu_ttc,
                'total_ht' => $total_ht,
                'total_ttc' => $total_ttc,
            ];
        })->all();

        return view('print.facture-tva', [
            'facture' => $factureTva,
            'details_facture' => $details_facture,
            'invoice_rows' => $invoice_rows,
            'coordonnee' => $coordonnee,
            'company' => $coordonnee,
            'documentTitle' => 'Facture',
            'documentNumber' => $factureTva->numero ?? '',
            'documentDate' => $factureTva->date_facture ? \Carbon\Carbon::parse($factureTva->date_facture)->format('d/m/Y') : ($factureTva->created_at?->format('d/m/Y') ?? ''),
            'client' => $factureTva->client,
            'status' => $factureTva->status ? $factureTva->status->value : null,
            'status_label' => $factureTva->status ? $factureTva->status->label() : null,
            'totals' => [
                ['label' => 'Total HT', 'value' => number_format($calcTotals['total_ht_brut'], 3, ',', ' ') . ' DT'],
                ['label' => 'Remise', 'value' => number_format($calcTotals['remise'], 3, ',', ' ') . ' DT'],
                ['label' => 'TVA', 'value' => number_format($calcTotals['tva'], 3, ',', ' ') . ' DT'],
                ['label' => 'Timbre', 'value' => number_format($calcTotals['timbre'], 3, ',', ' ') . ' DT'],
                ['label' => 'TOTAL TTC', 'value' => number_format($calcTotals['prix_ttc'], 3, ',', ' ') . ' DT'],
                ['label' => 'NET À PAYER', 'value' => number_format($calcTotals['net_a_payer'], 3, ',', ' ') . ' DT', 'class' => 'net-a-payer'],
            ],
            'footerNote' => $coordonnee && ! empty($coordonnee->note) ? $coordonnee->note : null,
            'paymentTerms' => 'Paiement à réception. Virement bancaire ou espèces. Merci de préciser le n° de facture.',
        ]);
    })->name('facture-tvas.print');

    Route::get('product-price-lists/{productPriceList}/print', function (\App\Models\ProductPriceList $productPriceList) {
        $productPriceList->load(['details' => fn ($q) => $q->with('product:id,designation_fr')]);
        $coordonnee = \App\Models\Coordinate::first();
        $price_list_rows = $productPriceList->details->map(function ($d, $i) {
            return [
                'index' => $i + 1,
                'designation' => $d->product->designation_fr ?? '—',
                'prix_unitaire' => (float) ($d->prix_unitaire ?? 0),
                'prix_gros' => (float) ($d->prix_gros ?? 0),
            ];
        })->all();

        return view('print.liste-de-prix', [
            'pricelist' => $productPriceList,
            'company' => $coordonnee,
            'documentTitle' => 'Liste de Prix',
            'documentNumber' => $productPriceList->designation ?? ('LP-' . $productPriceList->id),
            'documentDate' => $productPriceList->created_at?->format('d/m/Y'),
            'client' => null,
            'price_list_rows' => $price_list_rows,
            'totals' => [
                ['label' => 'Nombre de références', 'value' => (string) count($price_list_rows)],
            ],
            'footerNote' => $coordonnee && !empty($coordonnee->note) ? $coordonnee->note : null,
            'paymentTerms' => 'Prix valables à la date d\'édition. Sous réserve de disponibilité.',
        ]);
    })->name('product-price-lists.print');

    Route::get('quotations/{quotation}/print', function (\App\Models\Quotation $quotation) {
        $quotation->load('client');
        $details_facture = \App\Models\DetailsQuotation::where('quotation_id', $quotation->id)
            ->with('product:id,designation_fr')
            ->get();
        $coordonnee = \App\Models\Coordinate::first();
        $defaultTva = $coordonnee && isset($coordonnee->tva) ? (float) $coordonnee->tva : 19;
        $devis_lines = \App\Services\DevisCalculator::lines($details_facture, $defaultTva)['lines'];

        return view('print.devis', [
            'facture' => $quotation,
            'details_facture' => $details_facture,
            'devis_lines' => $devis_lines,
            'coordonnee' => $coordonnee,
            'company' => $coordonnee,
            'documentTitle' => 'Devis',
            'documentNumber' => $quotation->numero ?? '',
            'documentDate' => $quotation->date_quotation ? \Carbon\Carbon::parse($quotation->date_quotation)->format('d/m/Y') : ($quotation->created_at?->format('d/m/Y') ?? ''),
            'client' => $quotation->client,
            'totals' => [
                ['label' => 'Total HT', 'value' => number_format((float)($quotation->prix_ht ?? $quotation->prix_total ?? 0), 3, ',', ' ') . ' DT'],
                ['label' => 'TVA', 'value' => number_format((float)($quotation->tva ?? 0), 3, ',', ' ') . ' DT'],
                ['label' => 'Net à payer TTC', 'value' => number_format((float)($quotation->prix_ttc ?? $quotation->prix_total ?? 0), 3, ',', ' ') . ' DT', 'class' => 'ttc'],
            ],
            'footerNote' => $coordonnee && !empty($coordonnee->note) ? $coordonnee->note : null,
            'paymentTerms' => 'Valable 30 jours. Paiement à la commande ou à la livraison.',
        ]);
    })->name('quotations.print');

    // PDF download (attachment, no print preview)
    Route::get('factures/{facture}/download', [\App\Http\Controllers\DocumentPdfController::class, 'downloadFacture'])->name('factures.download');
    Route::get('facture-tvas/{factureTva}/download', [\App\Http\Controllers\DocumentPdfController::class, 'downloadFactureTva'])->name('facture-tvas.download');
    Route::get('quotations/{quotation}/download', [\App\Http\Controllers\DocumentPdfController::class, 'downloadQuotation'])->name('quotations.download');
    Route::get('tickets/{ticket}/download', [\App\Http\Controllers\DocumentPdfController::class, 'downloadTicket'])->name('tickets.download');
});

// Dashboard export + email preview - accessible via Filament auth
Route::middleware(['auth'])->group(function () {
    Route::get('admin/global-search', \App\Http\Controllers\GlobalSearchController::class)
        ->name('admin.global-search');
    Route::get('email-campaign-preview', \App\Http\Controllers\EmailPreviewController::class)
        ->name('email-campaign.preview');
    Route::get('dashboard/export', [\App\Http\Controllers\DashboardExportController::class, 'export'])
        ->name('dashboard.export');
    Route::get('stock/reports/export/pdf', [\App\Http\Controllers\StockReportExportController::class, 'pdf'])
        ->name('stock.reports.export.pdf');
    Route::get('stock/reports/export/csv', [\App\Http\Controllers\StockReportExportController::class, 'csv'])
        ->name('stock.reports.export.csv');
    Route::get('stock/reports/export/excel', [\App\Http\Controllers\StockReportExportController::class, 'excel'])
        ->name('stock.reports.export.excel');

    // POS Native AJAX endpoints
    Route::get('/api/pos-products', function() {
        $search = request('q', '');
        $products = \App\Models\Product::query()
            ->select('id', 'designation_fr', 'prix', 'promo', 'promo_expiration_date', 'qte', 'code_product')
            ->where('designation_fr', 'like', "%{$search}%")
            ->orWhere('code_product', 'like', "%{$search}%")
            ->limit(30)
            ->get();
        return response()->json(['results' => $products->map(fn($p) => [
            'id' => $p->id,
            'text' => $p->designation_fr . ' (' . ($p->qte ?? 0) . ') - ' . $p->code_product,
            'prix' => $p->getEffectiveUnitPrice(),
            'qte' => $p->qte,
            'code_product' => $p->code_product
        ])]);
    })->name('api.pos-products');

    Route::get('/api/pos-barcode', function() {
        $code = trim(request('code', ''));
        if (!$code) return response()->json(null);
        $p = \App\Models\Product::query()
            ->select('id', 'designation_fr', 'prix', 'promo', 'promo_expiration_date', 'qte', 'code_product')
            ->where('code_product', $code)
            ->orWhere('code_product', '0' . $code)
            ->first();
        if (!$p) return response()->json(null);
        return response()->json([
            'id' => $p->id,
            'designation' => $p->designation_fr,
            'prix_unitaire' => $p->getEffectiveUnitPrice(),
            'qte' => $p->qte,
        ]);
    })->name('api.pos-barcode');
});
