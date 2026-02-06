@extends('voyager::master')

@section('css')
@if(file_exists(public_path('css/app.css')))
<link rel="stylesheet" href="{{ asset('css/app.css') }}">
@endif
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
    /* Override Voyager styles for modern look */
    .voyager-modern .page-content {
        background: #f9fafb;
        padding: 1.5rem;
    }
    
    /* Ensure Tailwind works */
    .voyager-modern {
        font-family: 'Inter', system-ui, sans-serif;
    }
    
    /* Stat card styles */
    .stat-card {
        @apply bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all duration-200;
    }
    .stat-card:hover {
        @apply shadow-md border-primary-200;
    }
    .stat-card-primary {
        @apply border-l-4 border-l-primary-500;
    }
    .stat-card-success {
        @apply border-l-4 border-l-green-500;
    }
    .stat-card-info {
        @apply border-l-4 border-l-blue-500;
    }
    .stat-card-warning {
        @apply border-l-4 border-l-yellow-500;
    }
</style>
@endsection

@section('content')
<div class="voyager-modern">
    <div class="page-content">
        @include('voyager::alerts')

        @if (Auth::user()->role_id == 1 || Auth::user()->role_id == 3)
            <!-- Modern Action Buttons Grid -->
            <div class="mb-6">
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <a href="{{ route('voyager.ticket') }}" 
                       class="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all duration-200 group">
                        <div class="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                            <i class="voyager-file-text text-green-600"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900">Ajouter Ticket</p>
                            <p class="text-xs text-gray-500">Créer un nouveau ticket</p>
                        </div>
                        <i class="voyager-arrow-right text-gray-400 group-hover:text-primary-600 transition-colors"></i>
                    </a>

                    <a href="{{ route('voyager.facture') }}" 
                       class="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all duration-200 group">
                        <div class="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                            <i class="voyager-receipt text-blue-600"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900">Ajouter BL</p>
                            <p class="text-xs text-gray-500">Bon de livraison</p>
                        </div>
                        <i class="voyager-arrow-right text-gray-400 group-hover:text-primary-600 transition-colors"></i>
                    </a>

                    <a href="{{ route('voyager.facture_tva') }}" 
                       class="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-red-200 transition-all duration-200 group">
                        <div class="flex-shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors">
                            <i class="voyager-dollar text-red-600"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900">Ajouter Facture (TVA)</p>
                            <p class="text-xs text-gray-500">Facture avec TVA</p>
                        </div>
                        <i class="voyager-arrow-right text-gray-400 group-hover:text-red-600 transition-colors"></i>
                    </a>

                    <a href="{{ route('voyager.clients.create') }}" 
                       class="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-yellow-200 transition-all duration-200 group">
                        <div class="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                            <i class="voyager-person text-yellow-600"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900">Ajouter Client</p>
                            <p class="text-xs text-gray-500">Nouveau client</p>
                        </div>
                        <i class="voyager-arrow-right text-gray-400 group-hover:text-yellow-600 transition-colors"></i>
                    </a>

                    <a href="{{ route('voyager.produits.create') }}" 
                       class="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-amber-200 transition-all duration-200 group">
                        <div class="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                            <i class="voyager-bag text-amber-600"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900">Ajouter Produit</p>
                            <p class="text-xs text-gray-500">Nouveau produit</p>
                        </div>
                        <i class="voyager-arrow-right text-gray-400 group-hover:text-amber-600 transition-colors"></i>
                    </a>

                    <a href="{{ route('voyager.articles.create') }}" 
                       class="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-200 transition-all duration-200 group">
                        <div class="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                            <i class="voyager-news text-emerald-600"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900">Ajouter Blog</p>
                            <p class="text-xs text-gray-500">Nouvel article</p>
                        </div>
                        <i class="voyager-arrow-right text-gray-400 group-hover:text-emerald-600 transition-colors"></i>
                    </a>
                </div>
            </div>

            <!-- Modern Search Form -->
            <form method="POST" action="{{ route('voyager.historique') }}" class="mb-6">
                @csrf
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div class="flex flex-col md:flex-row gap-4 items-end">
                        <div class="flex-1 w-full">
                            <label class="block text-sm font-semibold text-gray-700 mb-2">
                                <i class="voyager-search"></i> Chercher l'historique de votre Client
                            </label>
                            <input 
                                type="number" 
                                min="20000001" 
                                max="99999999" 
                                name="tel" 
                                placeholder="Numéro de téléphone (ex: 20123456)" 
                                required
                                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                            >
                        </div>
                        <button 
                            type="submit" 
                            class="w-full md:w-auto px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            <i class="voyager-search"></i>
                            <span>Chercher</span>
                        </button>
                    </div>
                </div>
            </form>

            <!-- Statistics Cards Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                @php
                    $new_commandes = App\Commande::where('etat', 'nouvelle_commande')->count();
                    $liv_commandes = App\Commande::where('etat', 'en_cours_de_livraison')->count();
                    $prep_commandes = App\Commande::where('etat', 'en_cours_de_preparation')->count();
                    $prep_commandes = App\Commande::where('etat', 'prete')->count();
                    $clients = App\Client::all();
                    $produits = App\Product::all();
                @endphp

                <!-- Nouvelle Commandes Card -->
                <a href="{{ route('voyager.commandes.index') }}" 
                   class="stat-card stat-card-primary group">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600 mb-1">Nouvelle Commandes</p>
                            <h3 class="text-3xl font-bold text-gray-900">{{ $new_commandes }}</h3>
                        </div>
                        <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                            <i class="voyager-file-text text-primary-600 text-2xl"></i>
                        </div>
                    </div>
                    <div class="mt-4 pt-4 border-t border-gray-100">
                        <span class="text-xs text-gray-500 group-hover:text-primary-600 transition-colors">
                            Voir toutes les commandes <i class="voyager-arrow-right"></i>
                        </span>
                    </div>
                </a>

                <!-- Clients Card -->
                <a href="{{ route('voyager.clients.index') }}" 
                   class="stat-card stat-card-success group">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600 mb-1">Clients</p>
                            <h3 class="text-3xl font-bold text-gray-900">{{ $clients->count() }}</h3>
                        </div>
                        <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                            <i class="voyager-group text-green-600 text-2xl"></i>
                        </div>
                    </div>
                    <div class="mt-4 pt-4 border-t border-gray-100">
                        <span class="text-xs text-gray-500 group-hover:text-green-600 transition-colors">
                            Voir tous les clients <i class="voyager-arrow-right"></i>
                        </span>
                    </div>
                </a>

                <!-- Produits Card -->
                <a href="{{ route('voyager.produits.index') }}" 
                   class="stat-card stat-card-info group">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600 mb-1">Produits</p>
                            <h3 class="text-3xl font-bold text-gray-900">{{ $produits->count() }}</h3>
                        </div>
                        <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                            <i class="voyager-archive text-blue-600 text-2xl"></i>
                        </div>
                    </div>
                    <div class="mt-4 pt-4 border-t border-gray-100">
                        <span class="text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                            Voir tous les produits <i class="voyager-arrow-right"></i>
                        </span>
                    </div>
                </a>

                <!-- Additional Stat Card (if needed) -->
                <div class="stat-card stat-card-warning">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600 mb-1">En Préparation</p>
                            <h3 class="text-3xl font-bold text-gray-900">{{ $prep_commandes }}</h3>
                        </div>
                        <div class="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                            <i class="voyager-clock text-yellow-600 text-2xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts Section (if analytics enabled) -->
            @if(isset($google_analytics_client_id) && !empty($google_analytics_client_id))
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                <h2 class="text-xl font-bold text-gray-900 mb-4">Analytics Dashboard</h2>
                <div id="analytics-dashboard" class="min-h-[400px]">
                    <!-- Analytics content will be loaded here -->
                </div>
            </div>
            @endif

            <!-- Statistics Chart Section -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div class="text-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-900">
                        Espace Statistiques
                        @if(@$chart1 != null)
                            : {{ @$chart1->options['chart_title'] }}
                        @endif
                    </h3>
                </div>

                <form id="contact_form" action="{{ route('voyager.chart') }}" method="POST" 
                      class="space-y-6">
                    @csrf
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <!-- Form Section -->
                        <div class="space-y-6">
                            <!-- Module Selection -->
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">
                                    Module : *
                                </label>
                                <?php
                                use TCG\Voyager\Facades\Voyager;
                                use Illuminate\Support\Str;
                                use Illuminate\Support\Facades\DB;
                                use TCG\Voyager\Database\Schema\SchemaManager;
                                $dataTypes = Voyager::model('DataType')
                                    ->select('id', 'name', 'slug', 'model_name', 'display_name_singular')
                                    ->get()
                                    ->keyBy('name')
                                    ->toArray();
                                $specific_tables = array_map(function ($table) use ($dataTypes) {
                                    $table = Str::replaceFirst(DB::getTablePrefix(), '', $table);
                                    $table = [
                                        'prefix' => DB::getTablePrefix(),
                                        'display_name_singular' => $dataTypes[$table]['display_name_singular'] ?? null,
                                        'model_name' => $dataTypes[$table]['model_name'] ?? null,
                                        'name' => $table,
                                        'slug' => $dataTypes[$table]['slug'] ?? null,
                                        'dataTypeId' => $dataTypes[$table]['id'] ?? null,
                                    ];
                                    return (object) $table;
                                }, SchemaManager::listTableNames());

                                $hidden = ['migrations', 'data_rows', 'articles', 'brands', 'categs', 'clients', 
                                          'commande_details', 'details_factures', 'details_tickets', 'tags', 'menus', 
                                          'faqs', 'medias', 'sous_categories', 'services', 'newsletters', 'posts', 
                                          'sous_categories', 'coordinates', 'contacts', 'messages', 'produits', 
                                          'slides', 'roles', 'data_types', 'menu_items', 'password_resets', 
                                          'permission_role', 'personal_access_tokens', 'settings', 'annonces', 
                                          'pages', 'aromas'];
                                ?>
                                <select name="dropdown1" id="dropdown1" onChange="showitems()"
                                        class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200">
                                    @foreach ($specific_tables as $table)
                                        @continue(in_array($table->name, $hidden))
                                        @if (@$table->model_name)
                                            <option value="{{ $table->model_name }}"
                                                @if (@$chart1->options['chart_title'] == $table->display_name_singular) selected @endif>
                                                {{ $table->display_name_singular }}
                                            </option>
                                        @endif
                                    @endforeach
                                </select>
                            </div>

                            <!-- Date Range -->
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">
                                    Sélectionner durée :
                                </label>
                                <div class="grid grid-cols-2 gap-4">
                                    <input type="date" name="date1" id="date1" 
                                           class="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200">
                                    <input type="date" name="date2" id="date2" 
                                           class="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200">
                                </div>
                            </div>

                            <!-- Chart Type -->
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-3">
                                    Type affichage :
                                </label>
                                <div class="grid grid-cols-2 gap-4">
                                    <label class="flex flex-col items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary-300 transition-all duration-200 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50">
                                        <input type="radio" id="Rect_Chart" name="chart" value="bar" checked class="mb-2">
                                        <img src="{{ voyager_asset('images/Rectangular-Chart.JPG') }}" alt="Histogramme" class="w-full h-auto rounded">
                                        <span class="mt-2 text-sm font-medium text-gray-700">Histogramme</span>
                                    </label>
                                    <label class="flex flex-col items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary-300 transition-all duration-200 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50">
                                        <input type="radio" id="Line_Chart" name="chart" value="line" class="mb-2">
                                        <img src="{{ voyager_asset('images/Line-Chart.png') }}" alt="Linéaire" class="w-full h-auto rounded">
                                        <span class="mt-2 text-sm font-medium text-gray-700">Linéaire</span>
                                    </label>
                                </div>
                            </div>

                            <button type="submit" 
                                    class="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200">
                                Exécuter
                            </button>
                        </div>

                        <!-- Chart Display -->
                        @if (@$chart1 != null)
                        <div class="bg-gray-50 rounded-xl p-6">
                            {!! @$chart1->renderHtml() !!}
                        </div>
                        @endif
                    </div>
                </form>
            </div>
        @endif
    </div>
</div>
@endsection

@section('javascript')
@if(file_exists(public_path('js/app.js')))
<script src="{{ asset('js/app.js') }}"></script>
@endif
@if (@$chart1 != null)
    {!! @$chart1->renderChartJsLibrary() !!}
    {!! @$chart1->renderJs() !!}
@endif

<!-- Include existing analytics scripts if needed -->
@if(isset($google_analytics_client_id) && !empty($google_analytics_client_id))
    <!-- Analytics scripts from original dashboard -->
@endif
@endsection
