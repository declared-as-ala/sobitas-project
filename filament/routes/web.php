<?php

use App\Livewire\Form;
use App\Models\DetailsFacture;
use App\Models\Facture;
use Illuminate\Support\Facades\Route;

Route::get('form', Form::class);

Route::redirect('login-redirect', 'login')->name('login');

Route::middleware(['auth'])->group(function () {
    Route::get('factures/{facture}/print', function (Facture $facture) {
        $details_facture = DetailsFacture::where('facture_id', $facture->id)
            ->with('product:id,designation_fr,cover')
            ->get();

        return view('admin.imprimer_facture', [
            'facture' => $facture,
            'details_facture' => $details_facture,
        ]);
    })->name('factures.print');

    Route::get('tickets/{ticket}/print', function (\App\Models\Ticket $ticket) {
        $details_ticket = \App\Models\DetailsTicket::where('ticket_id', $ticket->id)
            ->with('product:id,designation_fr')
            ->get();

        return view('admin.imprimer_ticket', [
            'ticket' => $ticket,
            'details_ticket' => $details_ticket,
        ]);
    })->name('tickets.print');

    Route::get('facture-tvas/{factureTva}/print', function (\App\Models\FactureTva $factureTva) {
        $factureTva->load('client');
        $details_facture = \App\Models\DetailsFactureTva::where('facture_tva_id', $factureTva->id)
            ->with('product:id,designation_fr')
            ->get();
        $coordonnee = \App\Models\Coordinate::first();

        return view('filament.invoices.print', [
            'facture' => $factureTva,
            'details_facture' => $details_facture,
            'coordonnee' => $coordonnee,
        ]);
    })->name('facture-tvas.print');

    Route::get('quotations/{quotation}/print', function (\App\Models\Quotation $quotation) {
        $details_facture = \App\Models\DetailsQuotation::where('quotation_id', $quotation->id)
            ->with('product:id,designation_fr')
            ->get();

        return view('admin.imprimer_quotation', [
            'facture' => $quotation,
            'details_facture' => $details_facture,
        ]);
    })->name('quotations.print');
});

// Dashboard export route - accessible via Filament auth
Route::middleware(['auth'])->group(function () {
    Route::get('dashboard/export', [\App\Http\Controllers\DashboardExportController::class, 'export'])
        ->name('dashboard.export');
});
