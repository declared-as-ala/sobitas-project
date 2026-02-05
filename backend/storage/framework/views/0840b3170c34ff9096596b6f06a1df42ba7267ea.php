<?php $__env->startSection('content'); ?>
<div class="page-content dashboard-modern">

    <!-- Action Buttons Section -->
    <?php if(Auth::user()->role_id == 1 || Auth::user()->role_id == 3): ?>
    <div class="action-buttons-section">
        <div class="action-grid">
            <?php if(Route::has('voyager.ticket')): ?>
            <a href="<?php echo e(route('voyager.ticket')); ?>" class="action-btn action-btn-success">
                <i class="voyager-file-text"></i>
                <span>Ajouter Ticket</span>
            </a>
            <?php endif; ?>
            <?php if(Route::has('voyager.facture')): ?>
            <a href="<?php echo e(route('voyager.facture')); ?>" class="action-btn action-btn-primary">
                <i class="voyager-receipt"></i>
                <span>Ajouter BC</span>
            </a>
            <?php endif; ?>
            <?php if(Route::has('voyager.facture_tva')): ?>
            <a href="<?php echo e(route('voyager.facture_tva')); ?>" class="action-btn action-btn-danger">
                <i class="voyager-dollar"></i>
                <span>Ajouter Facture (TVA)</span>
            </a>
            <?php endif; ?>
            <?php if(Route::has('voyager.clients.create')): ?>
            <a href="<?php echo e(route('voyager.clients.create')); ?>" class="action-btn action-btn-warning">
                <i class="voyager-person"></i>
                <span>Ajouter Client</span>
            </a>
            <?php endif; ?>
            <?php if(Route::has('voyager.produits.create')): ?>
            <a href="<?php echo e(route('voyager.produits.create')); ?>" class="action-btn action-btn-info">
                <i class="voyager-bag"></i>
                <span>Ajouter Produit</span>
            </a>
            <?php endif; ?>
            <?php if(Route::has('voyager.articles.create')): ?>
            <a href="<?php echo e(route('voyager.articles.create')); ?>" class="action-btn action-btn-teal">
                <i class="voyager-news"></i>
                <span>Ajouter Blog</span>
            </a>
            <?php endif; ?>
            <?php if(Route::has('voyager.quotations')): ?>
            <a href="<?php echo e(route('voyager.quotations')); ?>" class="action-btn action-btn-teal2">
                <i class="voyager-news"></i>
                <span>Ajouter Devis</span>
            </a>
            <?php endif; ?>
            <?php if(Route::has('voyager.pricelists.create')): ?>
            <a href="<?php echo e(route('voyager.pricelists.create')); ?>" class="action-btn action-btn-teal3">
                <i class="voyager-news"></i>
                <span>Ajouter Liste de Prix</span>
            </a>
            <?php endif; ?>
        </div>
    </div>

    <!-- Search Client History -->
    <?php if(Route::has('voyager.historique')): ?>
    <div class="search-section">
        <form method="POST" action="<?php echo e(route('voyager.historique')); ?>">
            <?php echo csrf_field(); ?>
            <div class="search-card">
                <div class="search-header">
                    <i class="voyager-search"></i>
                    <h3>Chercher l'historique de votre Client</h3>
                </div>
                <div class="search-body">
                    <input
                        class="search-input"
                        type="number"
                        min="20000001"
                        max="99999999"
                        name="tel"
                        placeholder="Numéro de téléphone (ex: 20123456)"
                        required
                    >
                    <button type="submit" class="search-btn">
                        <i class="voyager-search"></i>
                        Chercher
                    </button>
                </div>
            </div>
        </form>
    </div>
    <?php endif; ?>

    <!-- Custom Date Range Filter (Always Visible) -->
    <div class="period-filter-section">
        <div class="period-card">
            <div id="customDateRange" class="custom-date-range">
                <div class="date-inputs">
                    <div class="date-input-group">
                        <label for="startDate" class="date-label">
                            <i class="voyager-calendar"></i>
                            Date de début
                        </label>
                        <input
                            type="date"
                            id="startDate"
                            class="date-input"
                            max="<?php echo e(date('Y-m-d')); ?>"
                        >
                    </div>
                    <div class="date-separator">
                        <i class="voyager-forward"></i>
                    </div>
                    <div class="date-input-group">
                        <label for="endDate" class="date-label">
                            <i class="voyager-calendar"></i>
                            Date de fin
                        </label>
                        <input
                            type="date"
                            id="endDate"
                            class="date-input"
                            max="<?php echo e(date('Y-m-d')); ?>"
                        >
                    </div>
                    <button type="button" id="applyCustomDates" class="apply-dates-btn">
                        <i class="voyager-check"></i>
                        Appliquer
                    </button>
                </div>
                <div id="dateError" class="date-error" style="display: none;">
                    <i class="voyager-warning"></i>
                    <span id="dateErrorMessage"></span>
                </div>
            </div>
        </div>
    </div>

    <!-- Loading Spinner -->
    <div id="loadingSpinner" class="loading-spinner" style="display: none;">
        <div class="spinner"></div>
        <p>Chargement des statistiques...</p>
    </div>

    <!-- Statistics Dashboard -->
    <div id="statisticsContent" class="statistics-content">

        <!-- Overview Cards -->
        <div class="overview-section">
            <div class="stat-card stat-card-primary">
                <div class="stat-icon">
                    <i class="voyager-dollar"></i>
                </div>
                <div class="stat-content">
                    <h4 id="totalRevenue">0.00 TND</h4>
                    <p>Chiffre d'affaires</p>
                </div>
            </div>

            <div class="stat-card stat-card-success">
                <div class="stat-icon">
                    <i class="voyager-file-text"></i>
                </div>
                <div class="stat-content">
                    <h4 id="totalOrders">0</h4>
                    <p>Total Commandes</p>
                </div>
            </div>

            <div class="stat-card stat-card-info">
                <div class="stat-icon">
                    <i class="voyager-group"></i>
                </div>
                <div class="stat-content">
                    <h4 id="newClients">0</h4>
                    <p>Nouveaux Clients</p>
                </div>
            </div>

            <div class="stat-card stat-card-warning">
                <div class="stat-icon">
                    <i class="voyager-bag"></i>
                </div>
                <div class="stat-content">
                    <h4 id="avgOrderValue">0.00 TND</h4>
                    <p>Panier Moyen</p>
                </div>
            </div>
        </div>

        <!-- Charts Section -->
        <div class="charts-section">
            <!-- Sales Chart -->
            <div class="chart-card chart-card-large">
                <div class="chart-header">
                    <h3>
                        <i class="voyager-bar-chart"></i>
                        Évolution des ventes
                    </h3>
                </div>
                <div class="chart-body">
                    <canvas id="salesChart"></canvas>
                </div>
            </div>

            <!-- Revenue by Source -->
            <div class="chart-card chart-card-medium">
                <div class="chart-header">
                    <h3>
                        <i class="voyager-pie-chart"></i>
                        Répartition par source
                    </h3>
                </div>
                <div class="chart-body">
                    <canvas id="revenueSourceChart"></canvas>
                </div>
            </div>
        </div>

        <!-- Top Products Section -->
        <div class="top-products-section">
            <div class="section-header">
                <h2>
                    <i class="voyager-trophy"></i>
                    Top 5 Produits les plus vendus
                </h2>
            </div>
            <div class="products-grid" id="topProductsGrid">
                <!-- Products will be loaded here via JavaScript -->
            </div>
        </div>

        <!-- Quick Stats Widgets -->
        <div class="widgets-section">
            <?php
                $new_commandes = App\Commande::where('etat', 'nouvelle_commande')->count();
                $clients = App\Client::count();
                $produits = App\Product::count();
            ?>

            <?php if(Route::has('voyager.commandes.index')): ?>
            <div class="widget-card widget-primary">
                <div class="widget-icon">
                    <i class="voyager-file-text"></i>
                </div>
                <div class="widget-content">
                    <h3><?php echo e($new_commandes); ?></h3>
                    <p>Nouvelles Commandes</p>
                    <a href="<?php echo e(route('voyager.commandes.index')); ?>" class="widget-link">
                        Voir tout <i class="voyager-forward"></i>
                    </a>
                </div>
            </div>
            <?php endif; ?>

            <?php if(Route::has('voyager.clients.index')): ?>
            <div class="widget-card widget-success">
                <div class="widget-icon">
                    <i class="voyager-group"></i>
                </div>
                <div class="widget-content">
                    <h3><?php echo e($clients); ?></h3>
                    <p>Total Clients</p>
                    <a href="<?php echo e(route('voyager.clients.index')); ?>" class="widget-link">
                        Voir tout <i class="voyager-forward"></i>
                    </a>
                </div>
            </div>
            <?php endif; ?>

            <?php if(Route::has('voyager.produits.index')): ?>
            <div class="widget-card widget-info">
                <div class="widget-icon">
                    <i class="voyager-archive"></i>
                </div>
                <div class="widget-content">
                    <h3><?php echo e($produits); ?></h3>
                    <p>Total Produits</p>
                    <a href="<?php echo e(route('voyager.produits.index')); ?>" class="widget-link">
                        Voir tout <i class="voyager-forward"></i>
                    </a>
                </div>
            </div>
            <?php endif; ?>
        </div>

    </div>
    <?php endif; ?>

</div>
<?php $__env->stopSection(); ?>

<?php $__env->startSection('css'); ?>
<link rel="stylesheet" href="<?php echo e(asset('css/dashboard-modern.css')); ?>">
<style>
    /* Custom Date Range Styles */
    .custom-date-range {
        padding: 20px;
        background: #ffffff;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
    }

    .date-inputs {
        display: flex;
        align-items: flex-end;
        gap: 15px;
        flex-wrap: wrap;
    }

    .date-input-group {
        flex: 1;
        min-width: 200px;
    }

    .date-label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 8px;
    }

    .date-label i {
        margin-right: 5px;
        color: #6b7280;
    }

    .date-input {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        color: #1f2937;
        transition: all 0.3s ease;
    }

    .date-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .date-separator {
        display: flex;
        align-items: center;
        padding-bottom: 10px;
        color: #6b7280;
        font-size: 18px;
    }

    .apply-dates-btn {
        padding: 10px 24px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
    }

    .apply-dates-btn:hover {
        background: #2563eb;
        transform: translateY(-2px);
        box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
    }

    .apply-dates-btn:active {
        transform: translateY(0);
    }

    .date-error {
        margin-top: 12px;
        padding: 10px 12px;
        background: #fee2e2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        color: #dc2626;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    @media (max-width: 768px) {
        .date-inputs {
            flex-direction: column;
        }

        .date-separator {
            transform: rotate(90deg);
            padding: 0;
        }

        .date-input-group {
            min-width: 100%;
        }

        .apply-dates-btn {
            width: 100%;
            justify-content: center;
        }
    }
</style>
<?php $__env->stopSection(); ?>

<?php $__env->startSection('javascript'); ?>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="<?php echo e(asset('js/dashboard-modern.js')); ?>"></script>
<?php if(Route::has('voyager.dashboard.statistics')): ?>
<script>
      window.dashboardStatisticsUrl = "<?php echo e(route('voyager.dashboard.statistics')); ?>";
</script>
<?php endif; ?>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('voyager::master', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/html/resources/views/vendor/voyager/index.blade.php ENDPATH**/ ?>