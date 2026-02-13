

<?php $__env->startSection('page_title', 'Dashboard'); ?>
<?php $__env->startSection('page_subtitle', 'Vue d\'ensemble de votre activité'); ?>

<?php $__env->startSection('css'); ?>
<style>
    /* ── Animations ─────────────────────────────────────── */
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .fade-in { animation: fadeInUp 0.45s ease-out both; }
    .fade-in-d1 { animation-delay: 0.05s; }
    .fade-in-d2 { animation-delay: 0.10s; }
    .fade-in-d3 { animation-delay: 0.15s; }
    .fade-in-d4 { animation-delay: 0.20s; }

    /* ── KPI Card ───────────────────────────────────────── */
    .kpi-card {
        transition: all 0.2s ease;
    }
    .kpi-card:hover {
        box-shadow: 0 8px 25px -5px rgb(0 0 0 / 0.08);
        transform: translateY(-2px);
    }

    /* ── Status Pipeline ────────────────────────────────── */
    .pipeline-step {
        position: relative;
        transition: all 0.2s ease;
    }
    .pipeline-step:hover { transform: scale(1.04); }
    .pipeline-connector {
        position: absolute;
        top: 50%;
        right: -14px;
        transform: translateY(-50%);
        color: #d1d5db;
    }

    /* ── Product Row ────────────────────────────────────── */
    .product-row { transition: all 0.15s ease; }
    .product-row:hover { background: #f8fafc; transform: translateX(4px); }

    /* ── Scrollbar in activity feed ──────────────────────── */
    .activity-scroll::-webkit-scrollbar { width: 3px; }
    .activity-scroll::-webkit-scrollbar-track { background: transparent; }
    .activity-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 3px; }

    /* ── Chart canvas responsive ─────────────────────────── */
    .chart-container { position: relative; width: 100%; }
</style>
<?php $__env->stopSection(); ?>

<?php $__env->startSection('content'); ?>
<?php if(Auth::user()->role_id == 1 || Auth::user()->role_id == 3): ?>
<?php
    $hour = (int)date('H');
    $greeting = $hour < 12 ? 'Bonjour' : ($hour < 18 ? 'Bon après-midi' : 'Bonsoir');
?>


<div class="mb-6 fade-in">
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 p-6 lg:p-8">
        
        <div class="absolute inset-0 opacity-10">
            <div class="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl -mr-48 -mt-48"></div>
            <div class="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400 rounded-full blur-3xl -ml-32 -mb-32"></div>
        </div>
        <div class="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
                <h1 class="text-2xl lg:text-3xl font-bold text-white mb-1"><?php echo e($greeting); ?>, <?php echo e(Auth::user()->name); ?>!</h1>
                <p class="text-blue-200 text-sm lg:text-base">Voici un aperçu complet de votre activité commerciale</p>
            </div>
            <div class="flex items-center gap-3">
                <span class="inline-flex items-center gap-1.5 text-xs font-medium text-blue-200 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg>
                    <?php echo e(now()->translatedFormat('l, d F Y')); ?>

                </span>
                <span class="inline-flex items-center gap-1.5 text-xs font-medium text-blue-200 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <?php echo e(now()->format('H:i')); ?>

                </span>
            </div>
        </div>
    </div>
</div>


<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
    
    <div class="kpi-card bg-white rounded-xl border border-gray-100 p-5 fade-in fade-in-d1">
        <div class="flex items-center justify-between mb-3">
            <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <span class="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Aujourd'hui</span>
        </div>
        <p class="text-2xl font-bold text-gray-900 mb-0.5"><?php echo e(number_format($todayRevenue ?? 0, 2)); ?> <span class="text-sm font-medium text-gray-400">TND</span></p>
        <p class="text-xs text-gray-500">Revenus du jour</p>
    </div>

    
    <div class="kpi-card bg-white rounded-xl border border-gray-100 p-5 fade-in fade-in-d2">
        <div class="flex items-center justify-between mb-3">
            <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg>
            </div>
            <span class="text-[10px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Semaine</span>
        </div>
        <p class="text-2xl font-bold text-gray-900 mb-0.5"><?php echo e(number_format($weekRevenue ?? 0, 2)); ?> <span class="text-sm font-medium text-gray-400">TND</span></p>
        <p class="text-xs text-gray-500">Revenus hebdomadaires</p>
    </div>

    
    <div class="kpi-card bg-white rounded-xl border border-gray-100 p-5 fade-in fade-in-d3">
        <div class="flex items-center justify-between mb-3">
            <div class="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <svg class="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>
            </div>
            <?php if(($revenueGrowth ?? 0) > 0): ?>
                <span class="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"/></svg>
                    +<?php echo e(abs($revenueGrowth)); ?>%
                </span>
            <?php elseif(($revenueGrowth ?? 0) < 0): ?>
                <span class="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25"/></svg>
                    <?php echo e($revenueGrowth); ?>%
                </span>
            <?php else: ?>
                <span class="text-[10px] font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">Stable</span>
            <?php endif; ?>
        </div>
        <p class="text-2xl font-bold text-gray-900 mb-0.5"><?php echo e(number_format($monthRevenue ?? 0, 2)); ?> <span class="text-sm font-medium text-gray-400">TND</span></p>
        <p class="text-xs text-gray-500">Ce mois vs <?php echo e(number_format($lastMonthRevenue ?? 0, 0)); ?> TND dernier</p>
    </div>

    
    <div class="kpi-card bg-white rounded-xl border border-gray-100 p-5 fade-in fade-in-d4">
        <div class="flex items-center justify-between mb-3">
            <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <svg class="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>
            </div>
            <?php if(($pendingCommandes ?? 0) > 0): ?>
                <span class="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                    <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    <?php echo e($pendingCommandes); ?> en attente
                </span>
            <?php else: ?>
                <span class="text-[10px] font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Aujourd'hui</span>
            <?php endif; ?>
        </div>
        <p class="text-2xl font-bold text-gray-900 mb-0.5"><?php echo e($todayOrders ?? 0); ?></p>
        <p class="text-xs text-gray-500">Commandes du jour</p>
    </div>
</div>


<div class="mb-6 fade-in fade-in-d2">
    <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <a href="<?php echo e(route('admin.ticket')); ?>" class="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all whitespace-nowrap group">
            <svg class="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"/></svg>
            Ticket
        </a>
        <a href="<?php echo e(route('admin.facture')); ?>" class="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all whitespace-nowrap group">
            <svg class="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
            Bon de Livraison
        </a>
        <a href="<?php echo e(route('admin.facture_tva')); ?>" class="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all whitespace-nowrap group">
            <svg class="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg>
            Facture TVA
        </a>
        <a href="<?php echo e(route('admin.quotations')); ?>" class="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-all whitespace-nowrap group">
            <svg class="w-4 h-4 text-gray-400 group-hover:text-violet-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"/></svg>
            Devis
        </a>
        <a href="<?php echo e(route('admin.commande')); ?>" class="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-all whitespace-nowrap group">
            <svg class="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>
            Commandes
        </a>
        <a href="<?php echo e(route('admin.pricelists.create')); ?>" class="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 transition-all whitespace-nowrap group">
            <svg class="w-4 h-4 text-gray-400 group-hover:text-teal-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"/></svg>
            Price List
        </a>
        <a href="<?php echo e(route('admin.statistic')); ?>" class="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all whitespace-nowrap group">
            <svg class="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>
            Statistiques
        </a>
    </div>
</div>


<?php if(isset($orderStatuses)): ?>
<div class="mb-6 fade-in fade-in-d3">
    <div class="bg-white rounded-xl border border-gray-100 p-5">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-semibold text-gray-900">Pipeline des Commandes</h2>
            <a href="<?php echo e(route('admin.commande')); ?>" class="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors">
                Voir tout →
            </a>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <?php
                $statuses = [
                    ['key' => 'nouvelle', 'label' => 'Nouvelle', 'color' => 'blue', 'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/>'],
                    ['key' => 'preparation', 'label' => 'Préparation', 'color' => 'amber', 'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/>'],
                    ['key' => 'prete', 'label' => 'Prête', 'color' => 'green', 'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>'],
                    ['key' => 'livraison', 'label' => 'Livraison', 'color' => 'violet', 'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.122-.504 1.089-1.124a25.85 25.85 0 00-4.573-12.627 1.125 1.125 0 00-.924-.492H14.25M8.25 18.75V6.375c0-.621.504-1.125 1.125-1.125h3.5"/>'],
                    ['key' => 'expediee', 'label' => 'Expédiée', 'color' => 'slate', 'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/>'],
                    ['key' => 'annulee', 'label' => 'Annulée', 'color' => 'red', 'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>'],
                ];
            ?>
            <?php $__currentLoopData = $statuses; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $s): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <div class="pipeline-step text-center p-3 bg-<?php echo e($s['color']); ?>-50/60 rounded-lg border border-<?php echo e($s['color']); ?>-100/50">
                    <svg class="w-5 h-5 text-<?php echo e($s['color']); ?>-500 mx-auto mb-1.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><?php echo $s['icon']; ?></svg>
                    <div class="text-xl font-bold text-<?php echo e($s['color']); ?>-700"><?php echo e($orderStatuses[$s['key']] ?? 0); ?></div>
                    <div class="text-[10px] font-medium text-<?php echo e($s['color']); ?>-600 mt-0.5"><?php echo e($s['label']); ?></div>
                </div>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </div>
    </div>
</div>
<?php endif; ?>


<div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
    
    <div class="xl:col-span-2 bg-white rounded-xl border border-gray-100 p-5 fade-in fade-in-d2">
        <div class="flex items-center justify-between mb-4">
            <div>
                <h2 class="text-sm font-semibold text-gray-900">Revenus — 7 Derniers Jours</h2>
                <p class="text-xs text-gray-500 mt-0.5">Tendance hebdomadaire des ventes</p>
            </div>
            <?php
                $revenueValues = isset($dailyRevenue) ? array_column($dailyRevenue, 'revenue') : [];
                $weekTotal = array_sum($revenueValues);
            ?>
            <span class="text-lg font-bold text-gray-900"><?php echo e(number_format($weekTotal, 0)); ?> <span class="text-xs font-medium text-gray-400">TND</span></span>
        </div>
        <div class="chart-container" style="height: 260px;">
            <canvas id="revenueLineChart"></canvas>
        </div>
    </div>

    
    <?php if(isset($revenueBySource)): ?>
    <div class="bg-white rounded-xl border border-gray-100 p-5 fade-in fade-in-d3">
        <div class="mb-4">
            <h2 class="text-sm font-semibold text-gray-900">Revenus par Source</h2>
            <p class="text-xs text-gray-500 mt-0.5">Répartition ce mois</p>
        </div>
        <div class="chart-container flex items-center justify-center" style="height: 180px;">
            <canvas id="revenueDonutChart"></canvas>
        </div>
        
        <div class="mt-4 space-y-2">
            <?php
                $sourceColors = [
                    'factures' => ['label' => 'Bon de Livraison', 'dot' => 'bg-blue-500'],
                    'factures_tva' => ['label' => 'Factures TVA', 'dot' => 'bg-red-500'],
                    'tickets' => ['label' => 'Tickets', 'dot' => 'bg-emerald-500'],
                    'commandes' => ['label' => 'Commandes', 'dot' => 'bg-violet-500'],
                ];
                $totalSource = array_sum($revenueBySource);
                $totalSource = $totalSource > 0 ? $totalSource : 1;
            ?>
            <?php $__currentLoopData = $sourceColors; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key => $meta): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full <?php echo e($meta['dot']); ?>"></span>
                        <span class="text-xs text-gray-600"><?php echo e($meta['label']); ?></span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-semibold text-gray-900"><?php echo e(number_format($revenueBySource[$key] ?? 0, 0)); ?></span>
                        <span class="text-[10px] text-gray-400"><?php echo e(round((($revenueBySource[$key] ?? 0) / $totalSource) * 100)); ?>%</span>
                    </div>
                </div>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </div>
    </div>
    <?php endif; ?>
</div>


<div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">

    
    <div class="bg-white rounded-xl border border-gray-100 p-5 fade-in fade-in-d2">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-semibold text-gray-900">Top Produits</h2>
            <span class="text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">30 jours</span>
        </div>
        <?php if(isset($topProducts) && count($topProducts) > 0): ?>
            <div class="space-y-2">
                <?php $__currentLoopData = $topProducts; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $index => $product): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <div class="product-row flex items-center gap-3 p-2.5 rounded-lg cursor-default">
                        
                        <?php
                            $rankColors = ['bg-amber-100 text-amber-700', 'bg-gray-100 text-gray-600', 'bg-orange-100 text-orange-700'];
                            $rankColor = $rankColors[$index] ?? 'bg-gray-50 text-gray-500';
                        ?>
                        <div class="w-7 h-7 rounded-md <?php echo e($rankColor); ?> flex items-center justify-center text-xs font-bold flex-shrink-0">
                            <?php echo e($index + 1); ?>

                        </div>
                        
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900 truncate"><?php echo e($product['name'] ?? 'Produit'); ?></p>
                            <p class="text-[11px] text-gray-500"><?php echo e(number_format($product['quantity'] ?? 0, 0)); ?> vendus</p>
                        </div>
                        
                        <div class="text-right flex-shrink-0">
                            <p class="text-sm font-semibold text-gray-900"><?php echo e(number_format($product['revenue'] ?? 0, 0)); ?></p>
                            <p class="text-[10px] text-gray-400">TND</p>
                        </div>
                    </div>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            </div>
        <?php else: ?>
            <div class="text-center py-10">
                <svg class="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/></svg>
                <p class="text-xs text-gray-400">Aucune donnée disponible</p>
            </div>
        <?php endif; ?>
    </div>

    
    <div class="bg-white rounded-xl border border-gray-100 p-5 fade-in fade-in-d3">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-semibold text-gray-900">Commandes Récentes</h2>
            <a href="<?php echo e(route('admin.commande')); ?>" class="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors">Voir tout →</a>
        </div>
        <div class="space-y-2 max-h-[380px] overflow-y-auto activity-scroll">
            <?php if(isset($recentCommandes) && $recentCommandes->count() > 0): ?>
                <?php $__currentLoopData = $recentCommandes->take(8); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $commande): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <?php
                        $statusMap = [
                            'nouvelle_commande' => ['bg' => 'bg-blue-100', 'text' => 'text-blue-700', 'label' => 'Nouvelle'],
                            'en_cours_de_preparation' => ['bg' => 'bg-amber-100', 'text' => 'text-amber-700', 'label' => 'Prép.'],
                            'prete' => ['bg' => 'bg-green-100', 'text' => 'text-green-700', 'label' => 'Prête'],
                            'en_cours_de_livraison' => ['bg' => 'bg-violet-100', 'text' => 'text-violet-700', 'label' => 'Livr.'],
                            'expidee' => ['bg' => 'bg-gray-100', 'text' => 'text-gray-600', 'label' => 'Expéd.'],
                        ];
                        $st = $statusMap[$commande->etat ?? 'nouvelle_commande'] ?? $statusMap['nouvelle_commande'];
                    ?>
                    <div class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                        <div class="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                            <span class="text-xs font-bold text-primary-600">#<?php echo e($commande->id); ?></span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900 truncate"><?php echo e(($commande->nom ?? '') . ' ' . ($commande->prenom ?? '') ?: 'N/A'); ?></p>
                            <p class="text-[11px] text-gray-500"><?php echo e($commande->created_at->format('d/m H:i')); ?> · <?php echo e(number_format($commande->prix_ttc ?? 0, 2)); ?> TND</p>
                        </div>
                        <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold <?php echo e($st['bg']); ?> <?php echo e($st['text']); ?>"><?php echo e($st['label']); ?></span>
                    </div>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            <?php else: ?>
                <div class="text-center py-10">
                    <svg class="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>
                    <p class="text-xs text-gray-400">Aucune commande récente</p>
                </div>
            <?php endif; ?>
        </div>
    </div>

    
    <div class="space-y-6">
        
        <div class="bg-white rounded-xl border border-gray-100 p-5 fade-in fade-in-d4">
            <h2 class="text-sm font-semibold text-gray-900 mb-3">Activité Récente</h2>
            <div class="space-y-2 max-h-[220px] overflow-y-auto activity-scroll">
                <?php $hasActivity = false; ?>
                <?php if(isset($recentCommandes) && $recentCommandes->count() > 0): ?>
                    <?php $hasActivity = true; ?>
                    <?php $__currentLoopData = $recentCommandes->take(3); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $commande): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                        <div class="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <div class="w-7 h-7 bg-blue-100 rounded-md flex items-center justify-center flex-shrink-0">
                                <svg class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-xs font-medium text-gray-900 truncate">Commande #<?php echo e($commande->id); ?></p>
                                <p class="text-[10px] text-gray-500"><?php echo e($commande->created_at->diffForHumans()); ?></p>
                            </div>
                        </div>
                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                <?php endif; ?>
                <?php if(isset($recentFactures) && $recentFactures->count() > 0): ?>
                    <?php $hasActivity = true; ?>
                    <?php $__currentLoopData = $recentFactures->take(2); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $facture): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                        <div class="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <div class="w-7 h-7 bg-emerald-100 rounded-md flex items-center justify-center flex-shrink-0">
                                <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-xs font-medium text-gray-900 truncate">Facture #<?php echo e($facture->id); ?></p>
                                <p class="text-[10px] text-gray-500"><?php echo e($facture->created_at->diffForHumans()); ?></p>
                            </div>
                        </div>
                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                <?php endif; ?>
                <?php if(isset($recentClients) && $recentClients->count() > 0): ?>
                    <?php $hasActivity = true; ?>
                    <?php $__currentLoopData = $recentClients->take(2); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $client): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                        <div class="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <div class="w-7 h-7 bg-violet-100 rounded-md flex items-center justify-center flex-shrink-0">
                                <svg class="w-3.5 h-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-xs font-medium text-gray-900 truncate"><?php echo e($client->nom ?? 'Nouveau Client'); ?></p>
                                <p class="text-[10px] text-gray-500"><?php echo e($client->created_at->diffForHumans()); ?></p>
                            </div>
                        </div>
                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                <?php endif; ?>
                <?php if(!$hasActivity): ?>
                    <div class="text-center py-6">
                        <p class="text-xs text-gray-400">Aucune activité récente</p>
                    </div>
                <?php endif; ?>
            </div>
        </div>

        
        <div class="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-blue-100/50 p-5 fade-in fade-in-d4">
            <h2 class="text-sm font-semibold text-gray-900 mb-3">Résumé Global</h2>
            <div class="space-y-2.5">
                <div class="flex items-center justify-between">
                    <span class="text-xs text-gray-600 flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>
                        Clients
                    </span>
                    <span class="text-xs font-bold text-gray-900"><?php echo e(number_format($totalClients ?? 0)); ?></span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs text-gray-600 flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/></svg>
                        Produits
                    </span>
                    <span class="text-xs font-bold text-gray-900"><?php echo e(number_format($totalProducts ?? 0)); ?></span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs text-gray-600 flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
                        Factures
                    </span>
                    <span class="text-xs font-bold text-gray-900"><?php echo e(number_format($totalFactures ?? 0)); ?></span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs text-gray-600 flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"/></svg>
                        Tickets
                    </span>
                    <span class="text-xs font-bold text-gray-900"><?php echo e(number_format($totalTickets ?? 0)); ?></span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs text-gray-600 flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>
                        Commandes
                    </span>
                    <span class="text-xs font-bold text-gray-900"><?php echo e(number_format($totalCommandes ?? 0)); ?></span>
                </div>
                <div class="pt-2 mt-1 border-t border-blue-200/50">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-gray-900">Total Mois</span>
                        <span class="text-base font-bold text-primary-600"><?php echo e(number_format($monthRevenue ?? 0, 2)); ?> TND</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>


<div class="mb-6 fade-in fade-in-d3">
    <form method="POST" action="<?php echo e(route('admin.historique')); ?>">
        <?php echo csrf_field(); ?>
        <div class="bg-white rounded-xl border border-gray-100 p-5">
            <div class="flex flex-col sm:flex-row sm:items-end gap-3">
                <div class="flex-1">
                    <label class="block text-xs font-semibold text-gray-700 mb-1.5">Historique Client</label>
                    <div class="relative">
                        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
                        <input
                            type="number"
                            min="20000001"
                            max="99999999"
                            name="tel"
                            placeholder="Numéro de téléphone (ex: 20123456)"
                            required
                            class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white transition-all"
                        >
                    </div>
                </div>
                <button
                    type="submit"
                    class="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all"
                >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
                    Chercher
                </button>
            </div>
        </div>
    </form>
</div>


<div class="bg-white rounded-xl border border-gray-100 p-5 fade-in fade-in-d4">
    <div class="flex items-center gap-2 mb-5">
        <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>
        <h2 class="text-sm font-semibold text-gray-900">Espace Statistiques Avancées</h2>
    </div>
    <form id="contact_form" action="<?php echo e(route('admin.chart')); ?>" method="POST">
        <?php echo csrf_field(); ?>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1.5">Module</label>
                    <select name="dropdown1" id="dropdown1"
                            class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white transition-all">
                        <option value="App\Models\Commande">Commandes</option>
                        <option value="App\Models\Facture">Factures</option>
                        <option value="App\Models\FactureTva">Factures TVA</option>
                        <option value="App\Models\Ticket">Tickets</option>
                        <option value="App\Models\Quotation">Devis</option>
                        <option value="App\Models\User">Utilisateurs</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1.5">Période</label>
                    <div class="grid grid-cols-2 gap-3">
                        <input type="date" name="date1" id="date1" class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white transition-all">
                        <input type="date" name="date2" id="date2" class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white transition-all">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1.5">Type d'affichage</label>
                    <div class="flex gap-3">
                        <label class="flex-1 flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:border-primary-300 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 transition-all">
                            <input type="radio" name="chart" value="bar" checked class="text-primary-600 focus:ring-primary-500">
                            <span class="text-sm font-medium text-gray-700">📊 Histogramme</span>
                        </label>
                        <label class="flex-1 flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:border-primary-300 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 transition-all">
                            <input type="radio" name="chart" value="line" class="text-primary-600 focus:ring-primary-500">
                            <span class="text-sm font-medium text-gray-700">📈 Linéaire</span>
                        </label>
                    </div>
                </div>
                <button type="submit" class="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"/></svg>
                    Exécuter
                </button>
            </div>
            <?php if(@$chart1 != null): ?>
            <div class="bg-gray-50 rounded-xl p-5 flex items-center justify-center">
                <?php echo @$chart1->renderHtml(); ?>

            </div>
            <?php else: ?>
            <div class="bg-gray-50 rounded-xl p-5 flex items-center justify-center min-h-[200px]">
                <div class="text-center">
                    <svg class="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>
                    <p class="text-xs text-gray-400">Sélectionnez un module et une période puis cliquez Exécuter</p>
                </div>
            </div>
            <?php endif; ?>
        </div>
    </form>
</div>

<?php endif; ?>
<?php $__env->stopSection(); ?>

<?php $__env->startSection('javascript'); ?>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>

<script>
document.addEventListener('DOMContentLoaded', function() {
    // ── Revenue Line Chart ─────────────────────────────────────
    <?php if(isset($dailyRevenue) && count($dailyRevenue) > 0): ?>
    const lineCtx = document.getElementById('revenueLineChart');
    if (lineCtx) {
        const lineGradient = lineCtx.getContext('2d').createLinearGradient(0, 0, 0, 260);
        lineGradient.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
        lineGradient.addColorStop(1, 'rgba(59, 130, 246, 0.01)');

        new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: <?php echo json_encode(array_column($dailyRevenue, 'date')); ?>,
                datasets: [{
                    label: 'Revenus (TND)',
                    data: <?php echo json_encode(array_column($dailyRevenue, 'revenue')); ?>,
                    borderColor: '#3b82f6',
                    backgroundColor: lineGradient,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointHoverBorderWidth: 3,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleFont: { size: 12, weight: '600' },
                        bodyFont: { size: 12 },
                        padding: 10,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: (ctx) => ctx.parsed.y.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' TND'
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 11, weight: '500' }, color: '#94a3b8' },
                        border: { display: false }
                    },
                    y: {
                        grid: { color: '#f1f5f9', drawBorder: false },
                        ticks: {
                            font: { size: 11 },
                            color: '#94a3b8',
                            callback: (v) => v.toLocaleString('fr-FR') + ' TND',
                            maxTicksLimit: 5,
                        },
                        border: { display: false },
                        beginAtZero: true,
                    }
                }
            }
        });
    }
    <?php endif; ?>

    // ── Revenue Donut Chart ────────────────────────────────────
    <?php if(isset($revenueBySource)): ?>
    const donutCtx = document.getElementById('revenueDonutChart');
    if (donutCtx) {
        new Chart(donutCtx, {
            type: 'doughnut',
            data: {
                labels: ['Bon de Livraison', 'Factures TVA', 'Tickets', 'Commandes'],
                datasets: [{
                    data: [
                        <?php echo e($revenueBySource['factures'] ?? 0); ?>,
                        <?php echo e($revenueBySource['factures_tva'] ?? 0); ?>,
                        <?php echo e($revenueBySource['tickets'] ?? 0); ?>,
                        <?php echo e($revenueBySource['commandes'] ?? 0); ?>

                    ],
                    backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#8b5cf6'],
                    borderWidth: 0,
                    hoverOffset: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleFont: { size: 12, weight: '600' },
                        bodyFont: { size: 12 },
                        padding: 10,
                        cornerRadius: 8,
                        callbacks: {
                            label: (ctx) => ctx.label + ': ' + ctx.parsed.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' TND'
                        }
                    }
                }
            }
        });
    }
    <?php endif; ?>
});
</script>


<?php if(@$chart1 != null): ?>
    <?php echo @$chart1->renderChartJsLibrary(); ?>

    <?php echo @$chart1->renderJs(); ?>

<?php endif; ?>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.admin', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/html/resources/views/admin/index.blade.php ENDPATH**/ ?>