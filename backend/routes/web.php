<?php

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
    return redirect()->route('voyager.dashboard'); 
});


Route::group(['prefix' => 'admin'], function () {
    Voyager::routes();
    
    // Override only the media upload route
    Route::post('produits', [CustomVoyagerMediaController::class, 'upload'])
        ->name('voyager.media.upload');
});
