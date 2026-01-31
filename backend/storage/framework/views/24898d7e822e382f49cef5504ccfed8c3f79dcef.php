

<?php $__env->startSection('page_title', __('voyager::generic.dashboard')); ?>

<?php $__env->startSection('head'); ?>
    <link rel="stylesheet" href="<?php echo e(asset('css/dashboard-modern.css')); ?>">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<?php $__env->stopSection(); ?>

<?php $__env->startSection('page_header'); ?>
    <div class="container-fluid">
        <h1 class="page-title">
            <i class="voyager-boat"></i> <?php echo e(__('voyager::generic.dashboard')); ?>

        </h1>
    </div>
<?php $__env->stopSection(); ?>

<?php $__env->startSection('content'); ?>
    <div class="dashboard-modern" id="statisticsContent">
        
        <div class="period-filter-section">
            <div class="period-card">
                <p class="period-label"><i class="voyager-calendar"></i> Période</p>
                <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 15px;">
                    <div>
                        <label for="startDate" style="margin-right: 8px;">Du</label>
                        <input type="date" id="startDate" class="form-control" style="display: inline-block; width: auto;">
                    </div>
                    <div>
                        <label for="endDate" style="margin-right: 8px;">Au</label>
                        <input type="date" id="endDate" class="form-control" style="display: inline-block; width: auto;">
                    </div>
                    <button type="button" id="applyCustomDates" class="btn btn-primary">Appliquer</button>
                </div>
                <div id="dateError" style="display: none; color: #ef4444; margin-top: 10px;">
                    <span id="dateErrorMessage"></span>
                </div>
            </div>
        </div>

        
        <div id="loadingSpinner" class="loading-spinner" style="display: none;">
            <div class="spinner"></div>
            <p>Chargement des statistiques...</p>
        </div>

        
        <div class="overview-section">
            <div class="stat-card stat-card-primary">
                <div class="stat-icon"><i class="voyager-dollar"></i></div>
                <div class="stat-content">
                    <h4 id="totalRevenue">0.00 TND</h4>
                    <p>Chiffre d'affaires total</p>
                </div>
            </div>
            <div class="stat-card stat-card-success">
                <div class="stat-icon"><i class="voyager-list"></i></div>
                <div class="stat-content">
                    <h4 id="totalOrders">0</h4>
                    <p>Nombre de commandes</p>
                </div>
            </div>
            <div class="stat-card stat-card-info">
                <div class="stat-icon"><i class="voyager-people"></i></div>
                <div class="stat-content">
                    <h4 id="newClients">0</h4>
                    <p>Nouveaux clients</p>
                </div>
            </div>
            <div class="stat-card stat-card-warning">
                <div class="stat-icon"><i class="voyager-treasure"></i></div>
                <div class="stat-content">
                    <h4 id="avgOrderValue">0.00 TND</h4>
                    <p>Panier moyen</p>
                </div>
            </div>
        </div>

        
        <div class="charts-section">
            <div class="chart-card">
                <div class="chart-header">
                    <h3><i class="voyager-bar-chart"></i> Évolution du chiffre d'affaires</h3>
                </div>
                <div class="chart-body">
                    <canvas id="salesChart" height="300"></canvas>
                </div>
            </div>
            <div class="chart-card">
                <div class="chart-header">
                    <h3><i class="voyager-pie-chart"></i> Répartition par type</h3>
                </div>
                <div class="chart-body">
                    <canvas id="revenueSourceChart" height="300"></canvas>
                </div>
            </div>
        </div>

        
        <div class="top-products-section">
            <div class="section-header">
                <h2><i class="voyager-list"></i> Top 5 produits</h2>
            </div>
            <div id="topProductsGrid" class="top-products-grid">
                <div style="text-align: center; padding: 40px; color: #6b7280;">Chargement...</div>
            </div>
        </div>
    </div>

    <?php $__env->startPush('javascript'); ?>
    <script>
        window.dashboardStatisticsUrl = <?php echo json_encode(route('voyager.dashboard.statistics'), 15, 512) ?>;
    </script>
    <script src="<?php echo e(asset('js/dashboard-modern.js')); ?>"></script>
    <?php $__env->stopPush(); ?>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('voyager::master', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/html/resources/views/dashboard/index.blade.php ENDPATH**/ ?>