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

// QR code image — public but token-secured (no auth required, no sensitive data)
Route::get('loyalty/qr/{token}', [\App\Http\Controllers\Api\LoyaltyController::class, 'qrImage'])
    ->name('loyalty.qr')
    ->where('token', '[a-zA-Z0-9]+');

Route::middleware(['auth', 'no.cache.print'])->group(function () {
    Route::get('factures/{facture}/print', function (Facture $facture) {
        $facture->load('client');
        $details_facture = DetailsFacture::where('facture_id', $facture->id)
            ->with('product:id,designation_fr,cover')
            ->get();
        $coordonnee = \App\Models\Coordinate::getCached();
        $toFloat = static fn ($value): float => (float) str_replace(' ', '', (string) ($value ?? 0));
        $totalHt = $details_facture->sum(function ($d) use ($toFloat) {
            $qte = (float) ($d->qte ?? $d->quantite ?? 1);
            $pu = $toFloat($d->prix_unitaire ?? $d->prix_ht ?? 0);
            return $qte * $pu;
        });
        $remise = (float) ($facture->remise ?? 0);
        $frais = (float) ($facture->frais_livraison ?? 0);
        // BL is HT-only in this app, so TTC line total must stay qte * prix_unitaire.
        // This avoids multiplying an already-aggregated prix_ttc by quantity again.
        $totalTtc = $totalHt;
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
            'backUrl' => route('filament.admin.resources.factures.index'),
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
            'backUrl'        => route('filament.admin.resources.tickets.index'),
        ]);
    })->name('tickets.print');

    Route::get('facture-tvas/{factureTva}/print', function (\App\Models\FactureTva $factureTva) {
        $factureTva->load('client');
        $details_facture = \App\Models\DetailsFactureTva::where('facture_tva_id', $factureTva->id)
            ->with('product:id,designation_fr')
            ->get();
        $coordonnee = \App\Models\Coordinate::getCached();
        $defaultTva = $coordonnee && isset($coordonnee->tva) ? (float) $coordonnee->tva : 19;
        $calcTotals = \App\Services\InvoiceCalculator::calculate(
            $details_facture->toArray(),
            (float) ($factureTva->remise ?? 0),
            (float) ($factureTva->timbre ?? 0),
            $defaultTva
        );

        $invoice_rows = $details_facture->map(function ($d, $i) use ($defaultTva) {
            $qte      = (int) ($d->qte ?? $d->quantite ?? 0);
            $pu_ht    = (float) ($d->prix_unitaire ?? 0);
            $tva_pct  = (float) ($d->tva ?? $defaultTva);
            $pu_ttc   = round($pu_ht * (1 + $tva_pct / 100), 3);
            $total_ht = round($pu_ht * $qte, 3);
            $montant_tva = round($total_ht * $tva_pct / 100, 3);
            $total_ttc   = round($total_ht + $montant_tva, 3);
            return [
                'index'       => $i + 1,
                'produit'     => $d->product->designation_fr ?? '—',
                'qte'         => $qte,
                'pu_ht'       => $pu_ht,
                'pu_ttc'      => $pu_ttc,
                'total_ht'    => $total_ht,
                'tva_pct'     => $tva_pct,
                'montant_tva' => $montant_tva,
                'total_ttc'   => $total_ttc,
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
            'calcTotals' => $calcTotals,
            'footerNote' => $coordonnee && ! empty($coordonnee->note) ? $coordonnee->note : null,
            'backUrl' => route('filament.admin.resources.facture-tvas.index'),
        ]);
    })->name('facture-tvas.print');

    Route::get('product-price-lists/{productPriceList}/print', function (\App\Models\ProductPriceList $productPriceList) {
        $productPriceList->load(['details' => fn ($q) => $q->with('product:id,designation_fr')]);
        $coordonnee = \App\Models\Coordinate::getCached();
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
            'backUrl' => route('filament.admin.resources.product-price-lists.index'),
        ]);
    })->name('product-price-lists.print');

    Route::get('quotations/{quotation}/print', function (\App\Models\Quotation $quotation) {
        $quotation->load('client');
        $details_facture = \App\Models\DetailsQuotation::where('quotation_id', $quotation->id)
            ->with('product:id,designation_fr')
            ->get();
        $coordonnee = \App\Models\Coordinate::getCached();
        $defaultTva = $coordonnee && isset($coordonnee->tva) ? (float) $coordonnee->tva : 19;
        $devis_lines = \App\Services\DevisCalculator::lines($details_facture, $defaultTva)['lines'];

        $detailsForCalc = $details_facture->map(fn ($d) => [
            'produit_id' => $d->produit_id,
            'qte' => (int) ($d->qte ?? $d->quantite ?? 1),
            'prix_unitaire' => (float) ($d->prix_unitaire ?? 0),
            'tva_pct' => (float) ($d->tva ?? $defaultTva),
        ])->toArray();
        $calcTotals = \App\Services\InvoiceCalculator::calculate(
            $detailsForCalc,
            (float) ($quotation->remise ?? 0),
            (float) ($quotation->timbre ?? 0),
            $defaultTva
        );

        $totals = [
            ['label' => 'Total HT', 'value' => number_format($calcTotals['total_ht_brut'], 3, ',', ' ') . ' DT'],
        ];
        if ($calcTotals['remise'] > 0) {
            $totals[] = ['label' => 'Remise', 'value' => number_format($calcTotals['remise'], 3, ',', ' ') . ' DT'];
        }
        $totals[] = ['label' => 'TVA', 'value' => number_format($calcTotals['tva'], 3, ',', ' ') . ' DT'];
        if ($calcTotals['timbre'] > 0) {
            $totals[] = ['label' => 'Timbre fiscal', 'value' => number_format($calcTotals['timbre'], 3, ',', ' ') . ' DT'];
        }
        // Total à payer = TTC lignes + timbre (aligné sur net_a_payer / écran devis)
        $totals[] = ['label' => 'TOTAL TTC (Net à payer)', 'value' => number_format($calcTotals['net_a_payer'], 3, ',', ' ') . ' DT', 'class' => 'ttc'];

        return view('print.devis', [
            'facture' => $quotation,
            'details_facture' => $details_facture,
            'devis_lines' => $devis_lines,
            'calcTotals' => $calcTotals,
            'coordonnee' => $coordonnee,
            'company' => $coordonnee,
            'documentTitle' => 'Devis',
            'documentNumber' => $quotation->numero ?? '',
            'documentDate' => $quotation->date_quotation ? \Carbon\Carbon::parse($quotation->date_quotation)->format('d/m/Y') : ($quotation->created_at?->format('d/m/Y') ?? ''),
            'client' => $quotation->client,
            'totals' => $totals,
            'footerNote' => $coordonnee && !empty($coordonnee->note) ? $coordonnee->note : null,
            'noteDevis' => $coordonnee ? ($coordonnee->note_devis ?? null) : null,
            'paymentTerms' => 'Valable 30 jours. Paiement à la commande ou à la livraison.',
            'backUrl' => route('filament.admin.resources.quotations.index'),
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
    // Stock product-list export (tab-aware: ?tab=all|in_stock|rupture|low_stock|inconsistent)
    Route::get('stock/export/pdf', [\App\Http\Controllers\StockExportController::class, 'pdf'])
        ->name('stock.export.pdf');
    Route::get('stock/export/csv', [\App\Http\Controllers\StockExportController::class, 'csv'])
        ->name('stock.export.csv');

    // Legacy aggregate report exports (kept for backward compat)
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

    Route::get('/api/pos-clients', function() {
        $search = request('q', '');
        $clients = \App\Models\Client::query()
            ->select('id', 'name', 'phone_1', 'adresse', 'email', 'ville', 'code_postale')
            ->where('name', 'like', "%{$search}%")
            ->orWhere('phone_1', 'like', "%{$search}%")
            ->limit(30)
            ->get();
        return response()->json(['results' => $clients->map(fn($c) => [
            'id' => $c->id,
            'text' => $c->name . ' (' . ($c->phone_1 ?? '') . ')',
            'phone_1' => $c->phone_1,
            'adresse' => $c->adresse,
            'email' => $c->email,
            'ville' => $c->ville,
            'code_postale' => $c->code_postale
        ])]);
    })->name('api.pos-clients');

    // ── Loyalty card print (admin-only) ──────────────────
    Route::get('loyalty/cards/{card}/print', function (\App\Models\LoyaltyCard $card) {
        $card->load('client');
        $coordonnee = \App\Models\Coordinate::getCached();
        $loyaltyService = app(\App\Services\LoyaltyService::class);
        $points = $loyaltyService->getBalance($card->client_id);
        $value  = $loyaltyService->getMonetaryValue($card->client_id);
        return view('print.loyalty-card', compact('card', 'coordonnee', 'points', 'value'));
    })->name('loyalty.card.print');

    Route::post('/api/pos-clients', function() {
        $data = request()->validate([
            'name'      => 'required|string|max:255',
            'phone_1'   => 'nullable|string|max:50',
            'adresse'   => 'nullable|string|max:500',
            'email'     => 'nullable|email|max:255',
            'matricule' => 'nullable|string|max:255',
        ]);
        $client = \App\Models\Client::create($data);
        return response()->json([
            'id'      => $client->id,
            'text'    => $client->name . ' (' . ($client->phone_1 ?? '') . ')',
            'phone_1' => $client->phone_1,
            'adresse' => $client->adresse,
            'email'   => $client->email,
        ]);
    })->name('api.pos-clients.store');
});
