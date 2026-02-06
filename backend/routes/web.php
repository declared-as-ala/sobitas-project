<?php

use App\Http\Controllers\AdminChartController;
use App\Http\Controllers\AdminCommandeController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AdminFacturationController;
use App\Http\Controllers\AdminFacturationTvaController;
use App\Http\Controllers\AdminTicketController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\ClientExportController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ImportExportController;
use App\Http\Controllers\SmsController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use TCG\Voyager\Facades\Voyager;

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
    return redirect()->route('dashboard');
});


Route::group(['prefix' => 'admin', 'middleware' => ['web', 'admin.user']], function () {
    // CRITICAL: Override Voyager's default dashboard route BEFORE Voyager::routes()
    // This ensures /admin uses our modern dashboard
    // Voyager uses 'dashboard' as the route name (not 'voyager.dashboard')
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
    
    // Register Voyager routes AFTER our custom dashboard route
    // Our route will take precedence because it's registered first
    Voyager::routes();
});
Route::group(['prefix' => 'admin' , 'as' => 'voyager.'], function () {

        Route::get('statistic', [AdminChartController::class , 'statistic'])->name('statistic');
        Route::POST('statistic', [ AdminChartController::class , 'chart' ])->name('chart');


        Route::post('/import/{slug}' , [ImportExportController::class, 'Import'])->name('import');
        Route::post('/send_sms' , [SmsController::class, 'sendSms'])->name('send_sms');
        Route::post('/specific_sms' , [SmsController::class, 'sendSmsSpecific'])->name('specific_sms');


        Route::post('/historique' , [ClientController::class , 'historique'])->name('historique');
        Route::get('/admin/clients/export', [ClientExportController::class, 'export'])
            ->name('clients.export');
        // Facture
        Route::get('/facture' , [AdminFacturationController::class, 'showFacture'])->name('facture');
        Route::post('/store_facture' , [AdminFacturationController::class, 'storeFacture'])->name('store_facture');
        Route::get('/edit_facture/{id}' , [AdminFacturationController::class, 'editFacture'])->name('edit_facture');
        Route::put('/update_facture/{id}' , [AdminFacturationController::class, 'updateFacture'])->name('update_facture');
        Route::get('/imprimer_facture/{id}' , [AdminFacturationController::class, 'imprimerFacture'])->name('imprimer_facture');


        /* Tickets */
        Route::get('/ticket' , [AdminTicketController::class, 'showTicket'])->name('ticket');
        Route::post('/store_ticket' , [AdminTicketController::class, 'storeTicket'])->name('store_ticket');
        Route::get('/edit_ticket/{id}' , [AdminTicketController::class, 'editTicket'])->name('edit_ticket');
        Route::put('/update_ticket/{id}' , [AdminTicketController::class, 'updateTicket'])->name('update_ticket');
        Route::get('/imprimer_ticket/{id}' , [AdminTicketController::class, 'imprimerTicket'])->name('imprimer_ticket');


         // Facture
         Route::get('/facture_tva' , [AdminFacturationTvaController::class, 'showFacture'])->name('facture_tva');
         Route::post('/store_facture_tva' , [AdminFacturationTvaController::class, 'storeFacture'])->name('store_facture_tva');
         Route::get('/edit_facture_tva/{id}' , [AdminFacturationTvaController::class, 'editFacture'])->name('edit_facture_tva');
         Route::put('/update_facture_tva/{id}' , [AdminFacturationTvaController::class, 'updateFacture'])->name('update_facture_tva');
         Route::get('/imprimer_facture_tva/{id}' , [AdminFacturationTvaController::class, 'imprimerFacture'])->name('imprimer_facture_tva');

        //devis , Quotations

         Route::get('/quotation' , [AdminFacturationTvaController::class, 'showQuotations'])->name('quotations');
         Route::post('/store_quotation' , [AdminFacturationTvaController::class, 'storeQuotations'])->name('store_quotation');
         Route::get('/edit_quotation/{id}' , [AdminFacturationTvaController::class, 'editQuotations'])->name('edit_quotation');
         Route::put('/update_quotation/{id}' , [AdminFacturationTvaController::class, 'updateQuotations'])->name('update_quotation');
         Route::get('/imprimer_quotation/{id}' , [AdminFacturationTvaController::class, 'imprimerQuotations'])->name('imprimer_quotations');
        // price lists routes :
         // Price List Management
        Route::get('/pricelists/create', [
            'uses' => 'App\Http\Controllers\PriceListController@create',
            'as' => 'pricelists.create'
        ]);

        Route::post('/pricelists/store', [
            'uses' => 'App\Http\Controllers\PriceListController@store',
            'as' => 'pricelist.store'
        ]);

        Route::get('/pricelists/{id}/edit', [
            'uses' => 'App\Http\Controllers\PriceListController@edit',
            'as' => 'pricelists.edit'
        ]);

        Route::put('/pricelists/{id}', [
            'uses' => 'App\Http\Controllers\PriceListController@update',
            'as' => 'pricelist.update'
        ]);
          Route::get('/pricelists/{id}/print', [
        'uses' => 'App\Http\Controllers\PriceListController@print',
        'as' => 'pricelists.print'
    ]);
         // Commande
        Route::get('/commande' , [AdminCommandeController::class, 'showFacture'])->name('commande');
        Route::post('/store_commande' , [AdminCommandeController::class, 'storeFacture'])->name('store_commande');
        Route::get('/edit_commande/{id}' , [AdminCommandeController::class, 'editFacture'])->name('edit_commande');
        Route::put('/update_commande/{id}' , [AdminCommandeController::class, 'updateFacture'])->name('update_commande');
        Route::get('/imprimer_commande/{id}' , [AdminCommandeController::class, 'imprimerFacture'])->name('imprimer_commande');
        // $namespacePrefix = '\\'.config('voyager.controllers.namespace').'\\';

        //dashboard
         // Dashboard routes (backup route, main one is above)
        Route::get('/dashboard', [DashboardController::class, 'index'])
            ->name('voyager.dashboard.backup');

        Route::post('/dashboard/statistics', [DashboardController::class, 'getStatistics'])
            ->name('dashboard.statistics');



});
