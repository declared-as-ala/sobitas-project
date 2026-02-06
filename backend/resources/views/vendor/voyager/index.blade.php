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
    
    .voyager-modern {
        font-family: 'Inter', system-ui, sans-serif;
    }
    
    /* Stat card styles */
    .stat-card {
        @apply bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all duration-200;
    }
    .stat-card:hover {
        @apply shadow-md border-primary-200;
        transform: translateY(-2px);
    }
    .stat-card-primary { @apply border-l-4 border-l-primary-500; }
    .stat-card-success { @apply border-l-4 border-l-green-500; }
    .stat-card-info { @apply border-l-4 border-l-blue-500; }
    .stat-card-warning { @apply border-l-4 border-l-yellow-500; }
    .stat-card-danger { @apply border-l-4 border-l-red-500; }
    .stat-card-purple { @apply border-l-4 border-l-purple-500; }
    
    /* Activity item */
    .activity-item {
        @apply flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer;
    }
    
    /* Fade in animation */
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .fade-in-up {
        animation: fadeInUp 0.5s ease-out;
    }
    
    /* Mini chart bar */
    .mini-chart-bar {
        @apply bg-primary-200 rounded-t transition-all duration-300;
        min-height: 4px;
    }
    .mini-chart-bar:hover {
        @apply bg-primary-400;
    }
    
    /* Status badge */
    .status-badge {
        @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
    }
    .status-nouvelle { @apply bg-blue-100 text-blue-800; }
    .status-preparation { @apply bg-yellow-100 text-yellow-800; }
    .status-prete { @apply bg-green-100 text-green-800; }
    .status-livraison { @apply bg-purple-100 text-purple-800; }
    .status-expidee { @apply bg-gray-100 text-gray-800; }
    
    /* Table row hover */
    .table-row-modern {
        @apply border-b border-gray-100 hover:bg-gray-50 transition-colors;
    }
    
    /* Revenue trend indicator */
    .trend-up { @apply text-green-600; }
    .trend-down { @apply text-red-600; }
</style>
@endsection

@section('content')
@php
    // Get dashboard data (same as DashboardController)
    use App\Commande;
    use App\Client;
    use App\Product;
    use App\Facture;
    use App\FactureTva;
    use App\Ticket;
    use Carbon\Carbon;
    
    // Get recent activity data
    $recentCommandes = Commande::latest('created_at')->limit(10)->get();
    $recentFactures = Facture::with('client')->latest('created_at')->limit(10)->get();
    try {
        $recentTickets = Ticket::with('client')->latest('created_at')->limit(10)->get();
    } catch (\Exception $e) {
        $recentTickets = Ticket::latest('created_at')->limit(10)->get();
    }
    $recentClients = Client::latest('created_at')->limit(10)->get();
    
    // Today's stats
    $todayRevenue = Facture::whereDate('created_at', today())
        ->sum('prix_ttc') + 
        FactureTva::whereDate('created_at', today())
        ->sum('prix_ttc') +
        Ticket::whereDate('created_at', today())
        ->sum('prix_ttc');
    
    $todayOrders = Commande::whereDate('created_at', today())->count() +
                  Facture::whereDate('created_at', today())->count() +
                  FactureTva::whereDate('created_at', today())->count() +
                  Ticket::whereDate('created_at', today())->count();
    
    // This week stats
    $weekStart = Carbon::now()->startOfWeek();
    $weekRevenue = Facture::where('created_at', '>=', $weekStart)
        ->sum('prix_ttc') + 
        FactureTva::where('created_at', '>=', $weekStart)
        ->sum('prix_ttc') +
        Ticket::where('created_at', '>=', $weekStart)
        ->sum('prix_ttc');
    
    // This month stats
    $monthStart = Carbon::now()->startOfMonth();
    $monthRevenue = Facture::where('created_at', '>=', $monthStart)
        ->sum('prix_ttc') + 
        FactureTva::where('created_at', '>=', $monthStart)
        ->sum('prix_ttc') +
        Ticket::where('created_at', '>=', $monthStart)
        ->sum('prix_ttc');
    
    // Last month for comparison
    $lastMonthStart = Carbon::now()->subMonth()->startOfMonth();
    $lastMonthEnd = Carbon::now()->subMonth()->endOfMonth();
    $lastMonthRevenue = Facture::whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])
        ->sum('prix_ttc') + 
        FactureTva::whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])
        ->sum('prix_ttc') +
        Ticket::whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])
        ->sum('prix_ttc');
    
    // Revenue growth percentage
    $revenueGrowth = $lastMonthRevenue > 0 
        ? round((($monthRevenue - $lastMonthRevenue) / $lastMonthRevenue) * 100, 1)
        : 0;
    
    // Pending orders
    $pendingCommandes = Commande::whereIn('etat', ['nouvelle_commande', 'en_cours_de_preparation'])->count();
    
    // Order status breakdown
    $orderStatuses = [
        'nouvelle' => Commande::where('etat', 'nouvelle_commande')->count(),
        'preparation' => Commande::where('etat', 'en_cours_de_preparation')->count(),
        'prete' => Commande::where('etat', 'prete')->count(),
        'livraison' => Commande::where('etat', 'en_cours_de_livraison')->count(),
        'expidee' => Commande::where('etat', 'expidee')->count(),
    ];
    
    // Top products (last 30 days) - with error handling
    $start = Carbon::now()->subDays(30);
    $productSales = [];
    $topProducts = [];
    
    try {
        // Try to get products from factures - check if table exists first
        $tableExists = DB::select("SHOW TABLES LIKE 'produits'");
        if (count($tableExists) > 0) {
            // Table is 'produits' (French)
            $factureProducts = DB::table('details_factures')
                ->join('factures', 'details_factures.facture_id', '=', 'factures.id')
                ->join('produits', 'details_factures.produit_id', '=', 'produits.id')
                ->where('factures.created_at', '>=', $start)
                ->select('produits.id', 'produits.designation_fr', DB::raw('SUM(details_factures.qte) as total_quantity'), DB::raw('SUM(details_factures.prix_ttc) as total_revenue'))
                ->groupBy('produits.id', 'produits.designation_fr')
                ->get();
        } else {
            // Try 'products' table (English)
            $tableExists = DB::select("SHOW TABLES LIKE 'products'");
            if (count($tableExists) > 0) {
                $factureProducts = DB::table('details_factures')
                    ->join('factures', 'details_factures.facture_id', '=', 'factures.id')
                    ->join('products', 'details_factures.produit_id', '=', 'products.id')
                    ->where('factures.created_at', '>=', $start)
                    ->select('products.id', 'products.designation_fr', DB::raw('SUM(details_factures.qte) as total_quantity'), DB::raw('SUM(details_factures.prix_ttc) as total_revenue'))
                    ->groupBy('products.id', 'products.designation_fr')
                    ->get();
            } else {
                $factureProducts = collect([]);
            }
        }
        
        foreach ($factureProducts as $item) {
            if (!isset($productSales[$item->id])) {
                $productSales[$item->id] = [
                    'name' => $item->designation_fr ?? 'Produit #' . $item->id,
                    'quantity' => 0,
                    'revenue' => 0
                ];
            }
            $productSales[$item->id]['quantity'] += $item->total_quantity ?? 0;
            $productSales[$item->id]['revenue'] += $item->total_revenue ?? 0;
        }
        
        // Sort by revenue and get top 5
        usort($productSales, function($a, $b) {
            return $b['revenue'] <=> $a['revenue'];
        });
        $topProducts = array_slice($productSales, 0, 5);
    } catch (\Exception $e) {
        // If query fails, just set empty array
        $topProducts = [];
    }
    
    // Revenue by source (this month)
    $revenueBySource = [
        'factures' => Facture::where('created_at', '>=', $monthStart)->sum('prix_ttc'),
        'factures_tva' => FactureTva::where('created_at', '>=', $monthStart)->sum('prix_ttc'),
        'tickets' => Ticket::where('created_at', '>=', $monthStart)->sum('prix_ttc'),
        'commandes' => Commande::where('etat', 'expidee')->where('created_at', '>=', $monthStart)->sum('prix_ttc'),
    ];
    
    // Daily revenue for last 7 days
    $dailyRevenue = [];
    for ($i = 6; $i >= 0; $i--) {
        $date = Carbon::now()->subDays($i);
        $dayRevenue = Facture::whereDate('created_at', $date)->sum('prix_ttc') +
                     FactureTva::whereDate('created_at', $date)->sum('prix_ttc') +
                     Ticket::whereDate('created_at', $date)->sum('prix_ttc');
        $dailyRevenue[] = [
            'date' => $date->format('d M'),
            'revenue' => $dayRevenue
        ];
    }
    
    // Total stats - with error handling
    try {
        $totalClients = Client::count();
    } catch (\Exception $e) {
        $totalClients = 0;
    }
    
    try {
        $totalProducts = Product::count();
    } catch (\Exception $e) {
        $totalProducts = 0;
    }
    
    try {
        $totalFactures = Facture::count();
    } catch (\Exception $e) {
        $totalFactures = 0;
    }
    
    try {
        $totalTickets = Ticket::count();
    } catch (\Exception $e) {
        $totalTickets = 0;
    }
    
    try {
        $totalCommandes = Commande::count();
    } catch (\Exception $e) {
        $totalCommandes = 0;
    }
    
    try {
        $new_commandes = Commande::where('etat', 'nouvelle_commande')->count();
    } catch (\Exception $e) {
        $new_commandes = 0;
    }
    
    try {
        $prep_commandes = Commande::where('etat', 'prete')->count();
    } catch (\Exception $e) {
        $prep_commandes = 0;
    }
    
    try {
        $clients = Client::all();
    } catch (\Exception $e) {
        $clients = collect([]);
    }
    
    try {
        $produits = Product::all();
    } catch (\Exception $e) {
        $produits = collect([]);
    }
@endphp

<div class="voyager-modern">
    <div class="page-content">
        @include('voyager::alerts')

    @if (Auth::user()->role_id == 1 || Auth::user()->role_id == 3)
            @php
                $hour = (int)date('H');
                $greeting = $hour < 12 ? 'Bonjour' : ($hour < 18 ? 'Bon après-midi' : 'Bonsoir');
            @endphp

            <!-- Enhanced Welcome Header -->
            <div class="mb-6 fade-in-up">
                <div class="bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
                    <div class="relative z-10">
                        <h1 class="text-3xl font-bold mb-2">{{ $greeting }}, {{ Auth::user()->name }}! 👋</h1>
                        <p class="text-primary-100 text-lg mb-4">Voici un aperçu complet de votre activité</p>
                        <div class="flex flex-wrap gap-4 text-sm">
                            <div class="flex items-center gap-2">
                                <i class="voyager-calendar"></i>
                                <span>{{ now()->translatedFormat('l, d F Y') }}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <i class="voyager-clock"></i>
                                <span>{{ now()->format('H:i') }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
                </div>
            </div>

            <!-- Enhanced Quick Stats Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 fade-in-up">
                <!-- Today Revenue -->
                <div class="stat-card stat-card-success group">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                            <i class="voyager-dollar text-green-600 text-2xl"></i>
                        </div>
                        <span class="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">Aujourd'hui</span>
                    </div>
                    <h3 class="text-3xl font-bold text-gray-900 mb-1">{{ number_format($todayRevenue ?? 0, 2) }} TND</h3>
                    <p class="text-sm text-gray-600">Revenus du jour</p>
                </div>

                <!-- Week Revenue -->
                <div class="stat-card stat-card-info group">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                            <i class="voyager-treasure text-blue-600 text-2xl"></i>
                        </div>
                        <span class="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">Cette Semaine</span>
                    </div>
                    <h3 class="text-3xl font-bold text-gray-900 mb-1">{{ number_format($weekRevenue ?? 0, 2) }} TND</h3>
                    <p class="text-sm text-gray-600">Revenus hebdomadaires</p>
                </div>

                <!-- Month Revenue with Growth -->
                <div class="stat-card stat-card-primary group">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                            <i class="voyager-bar-chart text-primary-600 text-2xl"></i>
                        </div>
                        <span class="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded">Ce Mois</span>
                    </div>
                    <h3 class="text-3xl font-bold text-gray-900 mb-1">{{ number_format($monthRevenue ?? 0, 2) }} TND</h3>
                    <div class="flex items-center gap-2 mt-2">
                        @if($revenueGrowth > 0)
                            <span class="text-sm font-medium trend-up">
                                <i class="voyager-arrow-up"></i> {{ abs($revenueGrowth) }}%
                            </span>
                        @elseif($revenueGrowth < 0)
                            <span class="text-sm font-medium trend-down">
                                <i class="voyager-arrow-down"></i> {{ abs($revenueGrowth) }}%
                            </span>
                        @else
                            <span class="text-sm text-gray-500">Stable</span>
            @endif
                        <span class="text-xs text-gray-500">vs mois dernier</span>
                    </div>
                </div>

                <!-- Today Orders -->
                <div class="stat-card stat-card-purple group">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                            <i class="voyager-file-text text-purple-600 text-2xl"></i>
                        </div>
                        <span class="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">Aujourd'hui</span>
                    </div>
                    <h3 class="text-3xl font-bold text-gray-900 mb-1">{{ $todayOrders ?? 0 }}</h3>
                    <p class="text-sm text-gray-600">Commandes du jour</p>
                </div>
            </div>

            <!-- Daily Revenue Mini Chart -->
            @if(isset($dailyRevenue) && count($dailyRevenue) > 0)
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 fade-in-up">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-semibold text-gray-900">Revenus des 7 Derniers Jours</h2>
                    <span class="text-sm text-gray-500">Tendance hebdomadaire</span>
                </div>
                <div class="flex items-end justify-between gap-2 h-32">
                    @php
                        $maxRevenue = max(array_column($dailyRevenue, 'revenue'));
                        $maxRevenue = $maxRevenue > 0 ? $maxRevenue : 1;
                    @endphp
                    @foreach($dailyRevenue as $day)
                        <div class="flex-1 flex flex-col items-center gap-2 group">
                            <div class="w-full flex items-end justify-center" style="height: 100px;">
                                <div 
                                    class="mini-chart-bar w-full rounded-t group-hover:opacity-80 transition-opacity"
                                    style="height: {{ ($day['revenue'] / $maxRevenue) * 100 }}%"
                                    title="{{ number_format($day['revenue'], 2) }} TND"
                                ></div>
                            </div>
                            <span class="text-xs font-medium text-gray-600">{{ $day['date'] }}</span>
                            <span class="text-xs text-gray-500">{{ number_format($day['revenue'], 0) }} TND</span>
                        </div>
                    @endforeach
                </div>
            </div>
            @endif

            <!-- Main Content Grid -->
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                <!-- Left Column: Stats & Actions -->
                <div class="xl:col-span-2 space-y-6">
                    <!-- Action Buttons Grid -->
                    <div class="fade-in-up">
                        <h2 class="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            <a href="{{ route('voyager.ticket') }}" 
                               class="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-green-200 transition-all duration-200 group">
                                <div class="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                                    <i class="voyager-file-text text-green-600 text-xl"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium text-gray-900">Ajouter Ticket</p>
                                    <p class="text-xs text-gray-500">Créer un nouveau ticket</p>
                                </div>
                                <i class="voyager-arrow-right text-gray-400 group-hover:text-green-600 transition-colors"></i>
                            </a>

                            <a href="{{ route('voyager.facture') }}" 
                               class="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all duration-200 group">
                                <div class="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                    <i class="voyager-receipt text-blue-600 text-xl"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium text-gray-900">Ajouter BL</p>
                                    <p class="text-xs text-gray-500">Bon de livraison</p>
                                </div>
                                <i class="voyager-arrow-right text-gray-400 group-hover:text-blue-600 transition-colors"></i>
                            </a>

                            <a href="{{ route('voyager.facture_tva') }}" 
                               class="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-red-200 transition-all duration-200 group">
                                <div class="flex-shrink-0 w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors">
                                    <i class="voyager-dollar text-red-600 text-xl"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium text-gray-900">Facture TVA</p>
                                    <p class="text-xs text-gray-500">Facture avec TVA</p>
                                </div>
                                <i class="voyager-arrow-right text-gray-400 group-hover:text-red-600 transition-colors"></i>
                            </a>

                            <a href="{{ route('voyager.clients.create') }}" 
                               class="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-yellow-200 transition-all duration-200 group">
                                <div class="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                                    <i class="voyager-person text-yellow-600 text-xl"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium text-gray-900">Ajouter Client</p>
                                    <p class="text-xs text-gray-500">Nouveau client</p>
                                </div>
                                <i class="voyager-arrow-right text-gray-400 group-hover:text-yellow-600 transition-colors"></i>
                            </a>

                            <a href="{{ route('voyager.produits.create') }}" 
                               class="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-amber-200 transition-all duration-200 group">
                                <div class="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                                    <i class="voyager-bag text-amber-600 text-xl"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium text-gray-900">Ajouter Produit</p>
                                    <p class="text-xs text-gray-500">Nouveau produit</p>
                                </div>
                                <i class="voyager-arrow-right text-gray-400 group-hover:text-amber-600 transition-colors"></i>
                            </a>

                            <a href="{{ route('voyager.articles.create') }}" 
                               class="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-200 transition-all duration-200 group">
                                <div class="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                                    <i class="voyager-news text-emerald-600 text-xl"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium text-gray-900">Ajouter Blog</p>
                                    <p class="text-xs text-gray-500">Nouvel article</p>
                                </div>
                                <i class="voyager-arrow-right text-gray-400 group-hover:text-emerald-600 transition-colors"></i>
                            </a>
        </div>
    </div>

                    <!-- Search Form -->
                    <form method="POST" action="{{ route('voyager.historique') }}" class="fade-in-up">
            @csrf
                        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <label class="block text-sm font-semibold text-gray-700 mb-3">
                                <i class="voyager-search"></i> Chercher l'historique de votre Client
                            </label>
                            <div class="flex flex-col md:flex-row gap-3">
                    <input
                        type="number"
                        min="20000001"
                        max="99999999"
                        name="tel"
                        placeholder="Numéro de téléphone (ex: 20123456)"
                        required
                                    class="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                                >
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

                    <!-- Main Statistics Cards -->
                    <div class="fade-in-up">
                        <h2 class="text-lg font-semibold text-gray-900 mb-4">Statistiques Principales</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <a href="{{ route('voyager.commandes.index') }}" 
                               class="stat-card stat-card-primary group">
                                <div class="flex items-center justify-between">
                                    <div class="flex-1">
                                        <p class="text-sm font-medium text-gray-600 mb-1">Nouvelle Commandes</p>
                                        <h3 class="text-3xl font-bold text-gray-900 mb-2">{{ $new_commandes }}</h3>
                                        @if($pendingCommandes > 0)
                                            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                {{ $pendingCommandes }} en attente
                                            </span>
                                        @endif
                                    </div>
                                    <div class="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                                        <i class="voyager-file-text text-primary-600 text-3xl"></i>
                                    </div>
                                </div>
                                <div class="mt-4 pt-4 border-t border-gray-100">
                                    <span class="text-xs text-gray-500 group-hover:text-primary-600 transition-colors">
                                        Voir toutes les commandes <i class="voyager-arrow-right"></i>
                                    </span>
    </div>
                            </a>

                            <a href="{{ route('voyager.clients.index') }}" 
                               class="stat-card stat-card-success group">
                                <div class="flex items-center justify-between">
                                    <div class="flex-1">
                                        <p class="text-sm font-medium text-gray-600 mb-1">Total Clients</p>
                                        <h3 class="text-3xl font-bold text-gray-900 mb-2">{{ $totalClients }}</h3>
                                        @if($recentClients->where('created_at', '>=', now()->startOfDay())->count() > 0)
                                            <span class="text-xs text-gray-500">
                                                {{ $recentClients->where('created_at', '>=', now()->startOfDay())->count() }} nouveaux aujourd'hui
                                            </span>
    @endif
                                    </div>
                                    <div class="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                                        <i class="voyager-group text-green-600 text-3xl"></i>
                                    </div>
                                </div>
                                <div class="mt-4 pt-4 border-t border-gray-100">
                                    <span class="text-xs text-gray-500 group-hover:text-green-600 transition-colors">
                                        Voir tous les clients <i class="voyager-arrow-right"></i>
                                    </span>
                                </div>
                            </a>

                            <a href="{{ route('voyager.produits.index') }}" 
                               class="stat-card stat-card-info group">
                                <div class="flex items-center justify-between">
                                    <div class="flex-1">
                                        <p class="text-sm font-medium text-gray-600 mb-1">Total Produits</p>
                                        <h3 class="text-3xl font-bold text-gray-900 mb-2">{{ $totalProducts }}</h3>
                                        <span class="text-xs text-gray-500">En catalogue</span>
                                    </div>
                                    <div class="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                        <i class="voyager-archive text-blue-600 text-3xl"></i>
                                    </div>
                    </div>
                                <div class="mt-4 pt-4 border-t border-gray-100">
                                    <span class="text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                                        Voir tous les produits <i class="voyager-arrow-right"></i>
                                    </span>
                    </div>
                            </a>

                            <div class="stat-card stat-card-warning">
                                <div class="flex items-center justify-between">
                                    <div class="flex-1">
                                        <p class="text-sm font-medium text-gray-600 mb-1">En Préparation</p>
                                        <h3 class="text-3xl font-bold text-gray-900 mb-2">{{ $prep_commandes }}</h3>
                                        <span class="text-xs text-gray-500">Commandes prêtes</span>
                    </div>
                                    <div class="w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center">
                                        <i class="voyager-clock text-yellow-600 text-3xl"></i>
                </div>
                </div>
            </div>
        </div>
    </div>

                    <!-- Order Status Breakdown -->
                    @if(isset($orderStatuses))
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 fade-in-up">
                        <h2 class="text-lg font-semibold text-gray-900 mb-4">Répartition des Commandes</h2>
                        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div class="text-center p-4 bg-blue-50 rounded-lg">
                                <div class="text-2xl font-bold text-blue-600 mb-1">{{ $orderStatuses['nouvelle'] ?? 0 }}</div>
                                <div class="text-xs text-blue-700 font-medium">Nouvelle</div>
                            </div>
                            <div class="text-center p-4 bg-yellow-50 rounded-lg">
                                <div class="text-2xl font-bold text-yellow-600 mb-1">{{ $orderStatuses['preparation'] ?? 0 }}</div>
                                <div class="text-xs text-yellow-700 font-medium">Préparation</div>
                            </div>
                            <div class="text-center p-4 bg-green-50 rounded-lg">
                                <div class="text-2xl font-bold text-green-600 mb-1">{{ $orderStatuses['prete'] ?? 0 }}</div>
                                <div class="text-xs text-green-700 font-medium">Prête</div>
                            </div>
                            <div class="text-center p-4 bg-purple-50 rounded-lg">
                                <div class="text-2xl font-bold text-purple-600 mb-1">{{ $orderStatuses['livraison'] ?? 0 }}</div>
                                <div class="text-xs text-purple-700 font-medium">Livraison</div>
    </div>
                            <div class="text-center p-4 bg-gray-50 rounded-lg">
                                <div class="text-2xl font-bold text-gray-600 mb-1">{{ $orderStatuses['expidee'] ?? 0 }}</div>
                                <div class="text-xs text-gray-700 font-medium">Expédiée</div>
                </div>
                </div>
            </div>
                    @endif

                    <!-- Top Products Widget -->
                    @if(isset($topProducts) && count($topProducts) > 0)
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 fade-in-up">
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="text-lg font-semibold text-gray-900">Top Produits (30 derniers jours)</h2>
                            <a href="{{ route('voyager.produits.index') }}" class="text-sm text-primary-600 hover:text-primary-700">
                                Voir tout <i class="voyager-arrow-right"></i>
                            </a>
                        </div>
                        <div class="space-y-3">
                            @foreach($topProducts as $index => $product)
                                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div class="flex items-center gap-3 flex-1">
                                        <div class="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center font-bold text-primary-600">
                                            {{ $index + 1 }}
                </div>
                                        <div class="flex-1 min-w-0">
                                            <p class="text-sm font-medium text-gray-900 truncate">{{ $product['name'] ?? 'Produit' }}</p>
                                            <p class="text-xs text-gray-500">{{ number_format($product['quantity'] ?? 0, 0) }} unités vendues</p>
                </div>
            </div>
                                    <div class="text-right">
                                        <p class="text-sm font-bold text-gray-900">{{ number_format($product['revenue'] ?? 0, 2) }} TND</p>
                                        <p class="text-xs text-gray-500">Revenus</p>
                                    </div>
                </div>
                            @endforeach
                </div>
            </div>
                    @endif

                    <!-- Recent Orders Table -->
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 fade-in-up">
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="text-lg font-semibold text-gray-900">Commandes Récentes</h2>
                            <a href="{{ route('voyager.commandes.index') }}" class="text-sm text-primary-600 hover:text-primary-700">
                                Voir toutes <i class="voyager-arrow-right"></i>
                            </a>
                </div>
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead>
                                    <tr class="border-b border-gray-200">
                                        <th class="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">ID</th>
                                        <th class="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Client</th>
                                        <th class="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Montant</th>
                                        <th class="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">État</th>
                                        <th class="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @if(isset($recentCommandes) && $recentCommandes->count() > 0)
                                        @foreach($recentCommandes->take(8) as $commande)
                                            <tr class="table-row-modern">
                                                <td class="py-3 px-4">
                                                    <a href="{{ route('voyager.commandes.show', $commande->id) }}" class="text-sm font-medium text-primary-600 hover:text-primary-700">
                                                        #{{ $commande->id }}
                                                    </a>
                                                </td>
                                                <td class="py-3 px-4">
                                                    <p class="text-sm text-gray-900">
                                                        {{ ($commande->nom ?? '') . ' ' . ($commande->prenom ?? '') ?: 'N/A' }}
                                                    </p>
                                                    @if($commande->phone)
                                                        <p class="text-xs text-gray-500">{{ $commande->phone }}</p>
                                                    @endif
                                                </td>
                                                <td class="py-3 px-4">
                                                    <p class="text-sm font-semibold text-gray-900">{{ number_format($commande->prix_ttc ?? 0, 2) }} TND</p>
                                                </td>
                                                <td class="py-3 px-4">
                                                    @php
                                                        $statusMap = [
                                                            'nouvelle_commande' => ['class' => 'status-nouvelle', 'label' => 'Nouvelle'],
                                                            'en_cours_de_preparation' => ['class' => 'status-preparation', 'label' => 'Préparation'],
                                                            'prete' => ['class' => 'status-prete', 'label' => 'Prête'],
                                                            'en_cours_de_livraison' => ['class' => 'status-livraison', 'label' => 'Livraison'],
                                                            'expidee' => ['class' => 'status-expidee', 'label' => 'Expédiée'],
                                                        ];
                                                        $status = $statusMap[$commande->etat ?? 'nouvelle_commande'] ?? $statusMap['nouvelle_commande'];
                                                    @endphp
                                                    <span class="status-badge {{ $status['class'] }}">
                                                        {{ $status['label'] }}
                                                    </span>
                                                </td>
                                                <td class="py-3 px-4">
                                                    <p class="text-sm text-gray-600">{{ $commande->created_at->format('d/m/Y') }}</p>
                                                    <p class="text-xs text-gray-500">{{ $commande->created_at->format('H:i') }}</p>
                                                </td>
                                            </tr>
                                        @endforeach
                                    @else
                                        <tr>
                                            <td colspan="5" class="py-8 text-center text-gray-500">
                                                <i class="voyager-info-circled text-3xl mb-2 block"></i>
                                                <p>Aucune commande récente</p>
                                            </td>
                                        </tr>
                                    @endif
                                </tbody>
                            </table>
                </div>
            </div>
        </div>

                <!-- Right Sidebar -->
                <div class="space-y-6">
                    <!-- Recent Activity -->
                    <div class="fade-in-up">
                        <h2 class="text-lg font-semibold text-gray-900 mb-4">Activité Récente</h2>
                        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <div class="space-y-3 max-h-[600px] overflow-y-auto">
                                @if(isset($recentCommandes) && $recentCommandes->count() > 0)
                                    @foreach($recentCommandes->take(5) as $commande)
                                        <div class="activity-item">
                                            <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <i class="voyager-file-text text-blue-600"></i>
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <p class="text-sm font-medium text-gray-900 truncate">Nouvelle Commande #{{ $commande->id }}</p>
                                                <p class="text-xs text-gray-500">{{ $commande->created_at->diffForHumans() }}</p>
                                            </div>
                                        </div>
                                    @endforeach
                                @endif
                                
                                @if(isset($recentFactures) && $recentFactures->count() > 0)
                                    @foreach($recentFactures->take(3) as $facture)
                                        <div class="activity-item">
                                            <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <i class="voyager-receipt text-green-600"></i>
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <p class="text-sm font-medium text-gray-900 truncate">Facture #{{ $facture->id }}</p>
                                                <p class="text-xs text-gray-500">{{ $facture->created_at->diffForHumans() }}</p>
                                            </div>
                                        </div>
                                    @endforeach
                                @endif
                                
                                @if(isset($recentClients) && $recentClients->count() > 0)
                                    @foreach($recentClients->take(3) as $client)
                                        <div class="activity-item">
                                            <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <i class="voyager-person text-purple-600"></i>
                </div>
                                            <div class="flex-1 min-w-0">
                                                <p class="text-sm font-medium text-gray-900 truncate">{{ $client->nom ?? 'Nouveau Client' }}</p>
                                                <p class="text-xs text-gray-500">{{ $client->created_at->diffForHumans() }}</p>
                </div>
            </div>
                                    @endforeach
                                @endif
                                
                                @if((!isset($recentCommandes) || $recentCommandes->count() == 0) && 
                                    (!isset($recentFactures) || $recentFactures->count() == 0) &&
                                    (!isset($recentClients) || $recentClients->count() == 0))
                                    <div class="text-center py-8 text-gray-500">
                                        <i class="voyager-info-circled text-4xl mb-2"></i>
                                        <p class="text-sm">Aucune activité récente</p>
                </div>
                                @endif
                </div>
            </div>
        </div>

                    <!-- Revenue by Source -->
                    @if(isset($revenueBySource))
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 fade-in-up">
                        <h2 class="text-lg font-semibold text-gray-900 mb-4">Revenus par Source (Mois)</h2>
                        <div class="space-y-3">
                            @php
                                $totalSource = array_sum($revenueBySource);
                                $totalSource = $totalSource > 0 ? $totalSource : 1;
                            @endphp
                            <div>
                                <div class="flex items-center justify-between mb-1">
                                    <span class="text-sm font-medium text-gray-700">Bon de Livraison</span>
                                    <span class="text-sm font-bold text-gray-900">{{ number_format($revenueBySource['factures'] ?? 0, 2) }} TND</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div class="bg-blue-600 h-2 rounded-full" style="width: {{ (($revenueBySource['factures'] ?? 0) / $totalSource) * 100 }}%"></div>
                                </div>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1">
                                    <span class="text-sm font-medium text-gray-700">Factures TVA</span>
                                    <span class="text-sm font-bold text-gray-900">{{ number_format($revenueBySource['factures_tva'] ?? 0, 2) }} TND</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div class="bg-red-600 h-2 rounded-full" style="width: {{ (($revenueBySource['factures_tva'] ?? 0) / $totalSource) * 100 }}%"></div>
                                </div>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1">
                                    <span class="text-sm font-medium text-gray-700">Tickets</span>
                                    <span class="text-sm font-bold text-gray-900">{{ number_format($revenueBySource['tickets'] ?? 0, 2) }} TND</span>
            </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div class="bg-green-600 h-2 rounded-full" style="width: {{ (($revenueBySource['tickets'] ?? 0) / $totalSource) * 100 }}%"></div>
            </div>
        </div>
                            <div>
                                <div class="flex items-center justify-between mb-1">
                                    <span class="text-sm font-medium text-gray-700">Commandes</span>
                                    <span class="text-sm font-bold text-gray-900">{{ number_format($revenueBySource['commandes'] ?? 0, 2) }} TND</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div class="bg-purple-600 h-2 rounded-full" style="width: {{ (($revenueBySource['commandes'] ?? 0) / $totalSource) * 100 }}%"></div>
                                </div>
                </div>
                </div>
            </div>
            @endif

                    <!-- Quick Stats Summary -->
                    <div class="bg-gradient-to-br from-primary-50 to-purple-50 rounded-xl border border-primary-100 p-5 fade-in-up">
                        <h2 class="text-lg font-semibold text-gray-900 mb-4">Résumé Global</h2>
                        <div class="space-y-3">
                            <div class="flex items-center justify-between">
                                <span class="text-sm text-gray-600">Total Factures</span>
                                <span class="text-sm font-bold text-gray-900">{{ $totalFactures ?? 0 }}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-sm text-gray-600">Total Tickets</span>
                                <span class="text-sm font-bold text-gray-900">{{ $totalTickets ?? 0 }}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-sm text-gray-600">Total Commandes</span>
                                <span class="text-sm font-bold text-gray-900">{{ $totalCommandes ?? 0 }}</span>
                            </div>
                            <div class="pt-3 border-t border-primary-200">
                                <div class="flex items-center justify-between">
                                    <span class="text-sm font-semibold text-gray-900">Revenus Total (Mois)</span>
                                    <span class="text-lg font-bold text-primary-600">{{ number_format($monthRevenue ?? 0, 2) }} TND</span>
                </div>
                </div>
            </div>
                </div>
                </div>
            </div>
            @endif
        </div>
</div>
@endsection

@section('javascript')
@if(file_exists(public_path('js/app.js')))
<script src="{{ asset('js/app.js') }}"></script>
@endif
@endsection
