<?php

use App\Http\Controllers\AdminChartController;
use App\Http\Controllers\AdminCommandeController;
use App\Http\Controllers\AdminFacturationController;
use App\Http\Controllers\AdminFacturationTvaController;
use App\Http\Controllers\AdminProductController;
use App\Http\Controllers\AdminTicketController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\ClientExportController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ImportExportController;
use App\Http\Controllers\PriceListController;
use App\Http\Controllers\SmsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function () {
    return redirect('/admin');
});

// ─── Admin Routes ────────────────────────────────────────────────────
// These routes will be replaced by Filament once installed.
// For now, they maintain backward compatibility with existing views.
Route::group(['prefix' => 'admin', 'as' => 'admin.'], function () {

    // Dashboard
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
    Route::post('/dashboard/statistics', [DashboardController::class, 'getStatistics'])->name('dashboard.statistics');

    // Statistics/Charts
    Route::get('statistic', [AdminChartController::class, 'statistic'])->name('statistic');
    Route::post('statistic', [AdminChartController::class, 'chart'])->name('chart');

    // Import/Export
    Route::post('/import/{slug}', [ImportExportController::class, 'Import'])->name('import');
    Route::get('/clients/export', [ClientExportController::class, 'export'])->name('clients.export');

    // SMS
    Route::post('/send_sms', [SmsController::class, 'sendSms'])->name('send_sms');
    Route::post('/specific_sms', [SmsController::class, 'sendSmsSpecific'])->name('specific_sms');

    // Client History
    Route::post('/historique', [ClientController::class, 'historique'])->name('historique');

    // ─── Factures (Bon de livraison) ─────────────────────────────
    Route::get('/facture', [AdminFacturationController::class, 'showFacture'])->name('facture');
    Route::post('/store_facture', [AdminFacturationController::class, 'storeFacture'])->name('store_facture');
    Route::get('/edit_facture/{id}', [AdminFacturationController::class, 'editFacture'])->name('edit_facture');
    Route::put('/update_facture/{id}', [AdminFacturationController::class, 'updateFacture'])->name('update_facture');
    Route::get('/imprimer_facture/{id}', [AdminFacturationController::class, 'imprimerFacture'])->name('imprimer_facture');

    // ─── Tickets ─────────────────────────────────────────────────
    Route::get('/ticket', [AdminTicketController::class, 'showTicket'])->name('ticket');
    Route::post('/store_ticket', [AdminTicketController::class, 'storeTicket'])->name('store_ticket');
    Route::get('/edit_ticket/{id}', [AdminTicketController::class, 'editTicket'])->name('edit_ticket');
    Route::put('/update_ticket/{id}', [AdminTicketController::class, 'updateTicket'])->name('update_ticket');
    Route::get('/imprimer_ticket/{id}', [AdminTicketController::class, 'imprimerTicket'])->name('imprimer_ticket');

    // ─── Factures TVA ────────────────────────────────────────────
    Route::get('/facture_tva', [AdminFacturationTvaController::class, 'showFacture'])->name('facture_tva');
    Route::post('/store_facture_tva', [AdminFacturationTvaController::class, 'storeFacture'])->name('store_facture_tva');
    Route::get('/edit_facture_tva/{id}', [AdminFacturationTvaController::class, 'editFacture'])->name('edit_facture_tva');
    Route::put('/update_facture_tva/{id}', [AdminFacturationTvaController::class, 'updateFacture'])->name('update_facture_tva');
    Route::get('/imprimer_facture_tva/{id}', [AdminFacturationTvaController::class, 'imprimerFacture'])->name('imprimer_facture_tva');

    // ─── Quotations (Devis) ──────────────────────────────────────
    Route::get('/quotation', [AdminFacturationTvaController::class, 'showQuotations'])->name('quotations');
    Route::post('/store_quotation', [AdminFacturationTvaController::class, 'storeQuotations'])->name('store_quotation');
    Route::get('/edit_quotation/{id}', [AdminFacturationTvaController::class, 'editQuotations'])->name('edit_quotation');
    Route::put('/update_quotation/{id}', [AdminFacturationTvaController::class, 'updateQuotations'])->name('update_quotation');
    Route::get('/imprimer_quotation/{id}', [AdminFacturationTvaController::class, 'imprimerQuotations'])->name('imprimer_quotations');

    // ─── Price Lists ─────────────────────────────────────────────
    Route::get('/pricelists/create', [PriceListController::class, 'create'])->name('pricelists.create');
    Route::post('/pricelists/store', [PriceListController::class, 'store'])->name('pricelist.store');
    Route::get('/pricelists/{id}/edit', [PriceListController::class, 'edit'])->name('pricelists.edit');
    Route::put('/pricelists/{id}', [PriceListController::class, 'update'])->name('pricelist.update');
    Route::get('/pricelists/{id}/print', [PriceListController::class, 'print'])->name('pricelists.print');

    // ─── Commandes ───────────────────────────────────────────────
    Route::get('/commande', [AdminCommandeController::class, 'showFacture'])->name('commande');
    Route::post('/store_commande', [AdminCommandeController::class, 'storeFacture'])->name('store_commande');
    Route::get('/edit_commande/{id}', [AdminCommandeController::class, 'editFacture'])->name('edit_commande');
    Route::put('/update_commande/{id}', [AdminCommandeController::class, 'updateFacture'])->name('update_commande');
    Route::get('/imprimer_commande/{id}', [AdminCommandeController::class, 'imprimerFacture'])->name('imprimer_commande');

    // ─── Produits ────────────────────────────────────────────────
    Route::get('/produits', [AdminProductController::class, 'index'])->name('products.index');
    Route::post('/produits', [AdminProductController::class, 'store'])->name('products.store');
    Route::get('/produits/{id}/edit', [AdminProductController::class, 'edit'])->name('products.edit');
    Route::put('/produits/{id}', [AdminProductController::class, 'update'])->name('products.update');
    Route::delete('/produits/{id}', [AdminProductController::class, 'destroy'])->name('products.destroy');
});
