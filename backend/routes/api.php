<?php

use App\Http\Controllers\AdminCommandeController;
use App\Http\Controllers\ApisController;
use App\Http\Controllers\ClientController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

// ─── Public Routes ───────────────────────────────────────────────────

// Homepage & Navigation
Route::get('/accueil', [ApisController::class, 'accueil']);
Route::get('/home', [ApisController::class, 'home']);
Route::get('/categories', [ApisController::class, 'categories']);
Route::get('/slides', [ApisController::class, 'slides']);
Route::get('/coordonnees', [ApisController::class, 'coordonnees']);
Route::get('/media', [ApisController::class, 'media']);

// Products
Route::get('/latest_products', [ApisController::class, 'latestProducts']);
Route::get('/latest_packs', [ApisController::class, 'latestPacks']);
Route::get('/packs', [ApisController::class, 'packs']);
Route::get('/ventes_flash', [ApisController::class, 'flash']);
Route::get('/all_products', [ApisController::class, 'allProducts']);
Route::get('/product_details/{slug}', [ApisController::class, 'productDetails']);
Route::get('/productsByCategoryId/{slug}', [ApisController::class, 'productsByCategoryId']);
Route::get('/productsByBrandId/{brand_id}', [ApisController::class, 'productsByBrandId']);
Route::get('/productsBySubCategoryId/{slug}', [ApisController::class, 'productsBySubCategoryId']);
Route::get('/similar_products/{sous_categorie_id}', [ApisController::class, 'similar_products']);
Route::get('/searchProduct/{text}', [ApisController::class, 'searchProduct']);
Route::get('/searchProductBySubCategoryText/{slug}/{text}', [ApisController::class, 'searchProductBySubCategoryText']);

// Articles
Route::get('/all_articles', [ApisController::class, 'allArticles']);
Route::get('/article_details/{slug}', [ApisController::class, 'articleDetails']);
Route::get('/latest_articles', [ApisController::class, 'latestArticles']);

// Brands, Aromas, Tags
Route::get('/all_brands', [ApisController::class, 'allBrands']);
Route::get('/aromes', [ApisController::class, 'aromes']);
Route::get('/tags', [ApisController::class, 'tags']);

// Pages & Content
Route::get('/services', [ApisController::class, 'services']);
Route::get('/faqs', [ApisController::class, 'faqs']);
Route::get('/pages', [ApisController::class, 'pages']);
Route::get('/page/{slug}', [ApisController::class, 'getPageBySlug']);
Route::get('/redirections', [ApisController::class, 'redirections']);
Route::get('/seo_page/{name}', [ApisController::class, 'seoPage']);

// Forms
Route::post('/newsletter', [ApisController::class, 'newsLetter']);
Route::post('/contact', [ApisController::class, 'sendContact']);

// Orders (public)
Route::post('/add_commande', [AdminCommandeController::class, 'storeCommandeApi']);
Route::get('/commande/{id}', [AdminCommandeController::class, 'details']);

// Authentication
Route::post('/login', [ClientController::class, 'login']);
Route::post('/register', [ClientController::class, 'register']);

// ─── Authenticated Routes ────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', fn (Request $request) => $request->user());
    Route::get('/profil', [ClientController::class, 'profil']);
    Route::get('/client_commandes', [ClientController::class, 'client_commandes']);
    Route::post('/update_profile', [ClientController::class, 'update_profile']);
    Route::post('/detail_commande/{id}', [ClientController::class, 'detail_commande']);
    Route::post('/add_review', [ApisController::class, 'add_review']);
});
