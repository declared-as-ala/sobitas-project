@extends('voyager::master')

@section('content')
<div class="page-content dashboard-modern p-6">
    @include('voyager::alerts')

    @if (Auth::user()->role_id == 1 || Auth::user()->role_id == 3)
    
    <!-- Modern Action Buttons Grid -->
    <div class="mb-8">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            @if(Route::has('voyager.ticket'))
            <a href="{{ route('voyager.ticket') }}" 
               class="action-card bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                <div class="flex items-center space-x-3">
                    <div class="bg-white bg-opacity-20 p-3 rounded-lg">
                        <i class="voyager-file-text text-2xl"></i>
                    </div>
                    <div>
                        <div class="font-semibold">Ticket</div>
                        <div class="text-sm opacity-90">Ajouter</div>
                    </div>
                </div>
            </a>
            @endif

            @if(Route::has('voyager.facture'))
            <a href="{{ route('voyager.facture') }}" 
               class="action-card bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                <div class="flex items-center space-x-3">
                    <div class="bg-white bg-opacity-20 p-3 rounded-lg">
                        <i class="voyager-receipt text-2xl"></i>
                    </div>
                    <div>
                        <div class="font-semibold">Bon Livraison</div>
                        <div class="text-sm opacity-90">Ajouter</div>
                    </div>
                </div>
            </a>
            @endif

            @if(Route::has('voyager.facture_tva'))
            <a href="{{ route('voyager.facture_tva') }}" 
               class="action-card bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                <div class="flex items-center space-x-3">
                    <div class="bg-white bg-opacity-20 p-3 rounded-lg">
                        <i class="voyager-dollar text-2xl"></i>
                    </div>
                    <div>
                        <div class="font-semibold">Facture TVA</div>
                        <div class="text-sm opacity-90">Ajouter</div>
                    </div>
                </div>
            </a>
            @endif

            @if(Route::has('voyager.clients.create'))
            <a href="{{ route('voyager.clients.create') }}" 
               class="action-card bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                <div class="flex items-center space-x-3">
                    <div class="bg-white bg-opacity-20 p-3 rounded-lg">
                        <i class="voyager-person text-2xl"></i>
                    </div>
                    <div>
                        <div class="font-semibold">Client</div>
                        <div class="text-sm opacity-90">Ajouter</div>
                    </div>
                </div>
            </a>
            @endif

            @if(Route::has('voyager.produits.create'))
            <a href="{{ route('voyager.produits.create') }}" 
               class="action-card bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                <div class="flex items-center space-x-3">
                    <div class="bg-white bg-opacity-20 p-3 rounded-lg">
                        <i class="voyager-bag text-2xl"></i>
                    </div>
                    <div>
                        <div class="font-semibold">Produit</div>
                        <div class="text-sm opacity-90">Ajouter</div>
                    </div>
                </div>
            </a>
            @endif

            @if(Route::has('voyager.articles.create'))
            <a href="{{ route('voyager.articles.create') }}" 
               class="action-card bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                <div class="flex items-center space-x-3">
                    <div class="bg-white bg-opacity-20 p-3 rounded-lg">
                        <i class="voyager-news text-2xl"></i>
                    </div>
                    <div>
                        <div class="font-semibold">Article</div>
                        <div class="text-sm opacity-90">Ajouter</div>
                    </div>
                </div>
            </a>
            @endif
        </div>
    </div>

    <!-- Search Client History - Modern Card -->
    @if(Route::has('voyager.historique'))
    <div class="mb-8">
        <form method="POST" action="{{ route('voyager.historique') }}">
            @csrf
            <div class="bg-white rounded-xl shadow-lg p-6">
                <div class="flex items-center space-x-3 mb-4">
                    <div class="bg-blue-100 p-3 rounded-lg">
                        <i class="voyager-search text-blue-600 text-xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold text-gray-800">Chercher l'historique de votre Client</h3>
                </div>
                <div class="flex flex-col md:flex-row gap-4">
                    <div class="flex-1">
                        <input 
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            type="number" 
                            min="20000001" 
                            max="99999999" 
                            name="tel" 
                            placeholder="Numéro de téléphone (ex: 20123456)" 
                            required
                        >
                    </div>
                    <button type="submit" 
                            class="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105">
                        <i class="voyager-search"></i> Chercher
                    </button>
                </div>
            </div>
        </form>
    </div>
    @endif

    <!-- Statistics Cards - Modern Design -->
    @php
        $new_commandes = App\Commande::where('etat', 'nouvelle_commande')->count();
        $clients = App\Client::count();
        $produits = App\Product::count();
        $revenue = App\Commande::whereMonth('created_at', now()->month)->sum('prix_ttc');
    @endphp

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- New Commandes Card -->
        <div class="stat-card bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div class="flex items-center justify-between mb-4">
                <div class="bg-white bg-opacity-20 p-3 rounded-lg">
                    <i class="voyager-file-text text-3xl"></i>
                </div>
                <div class="text-right">
                    <div class="text-3xl font-bold">{{ $new_commandes }}</div>
                    <div class="text-blue-100 text-sm">Nouvelles Commandes</div>
                </div>
            </div>
            <a href="{{ route('voyager.commandes.index') }}" 
               class="inline-flex items-center text-white hover:text-blue-100 font-medium text-sm mt-4">
                Voir toutes <i class="voyager-angle-right ml-1"></i>
            </a>
        </div>

        <!-- Clients Card -->
        <div class="stat-card bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div class="flex items-center justify-between mb-4">
                <div class="bg-white bg-opacity-20 p-3 rounded-lg">
                    <i class="voyager-group text-3xl"></i>
                </div>
                <div class="text-right">
                    <div class="text-3xl font-bold">{{ $clients }}</div>
                    <div class="text-green-100 text-sm">Total Clients</div>
                </div>
            </div>
            <a href="{{ route('voyager.clients.index') }}" 
               class="inline-flex items-center text-white hover:text-green-100 font-medium text-sm mt-4">
                Voir toutes <i class="voyager-angle-right ml-1"></i>
            </a>
        </div>

        <!-- Products Card -->
        <div class="stat-card bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div class="flex items-center justify-between mb-4">
                <div class="bg-white bg-opacity-20 p-3 rounded-lg">
                    <i class="voyager-archive text-3xl"></i>
                </div>
                <div class="text-right">
                    <div class="text-3xl font-bold">{{ $produits }}</div>
                    <div class="text-purple-100 text-sm">Total Produits</div>
                </div>
            </div>
            <a href="{{ route('voyager.produits.index') }}" 
               class="inline-flex items-center text-white hover:text-purple-100 font-medium text-sm mt-4">
                Voir toutes <i class="voyager-angle-right ml-1"></i>
            </a>
        </div>

        <!-- Revenue Card -->
        <div class="stat-card bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div class="flex items-center justify-between mb-4">
                <div class="bg-white bg-opacity-20 p-3 rounded-lg">
                    <i class="voyager-dollar text-3xl"></i>
                </div>
                <div class="text-right">
                    <div class="text-3xl font-bold">{{ number_format($revenue, 0) }}</div>
                    <div class="text-orange-100 text-sm">Revenus (Mois)</div>
                </div>
            </div>
            <div class="text-orange-100 text-xs mt-4">TND</div>
        </div>
    </div>

    @endif
</div>

@push('styles')
<style>
    .dashboard-modern {
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        min-height: 100vh;
    }

    .stat-card {
        position: relative;
        overflow: hidden;
    }

    .stat-card::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
        animation: pulse 3s ease-in-out infinite;
    }

    @keyframes pulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.6; }
    }

    .action-card {
        display: block;
        text-decoration: none;
    }

    .action-card:hover {
        text-decoration: none;
    }
</style>
@endpush

@endsection
