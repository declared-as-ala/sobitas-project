<!DOCTYPE html>
<html lang="fr" class="h-full">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="<?php echo e(csrf_token()); ?>">
    <title><?php echo $__env->yieldContent('page_title', 'Admin Panel'); ?> - Sobitas</title>

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

    <!-- TailwindCSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
                    colors: {
                        primary: {
                            50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
                            400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
                            800: '#1e40af', 900: '#1e3a8a', 950: '#172554'
                        },
                        sidebar: {
                            bg: '#0f172a',
                            hover: '#1e293b',
                            active: '#1e3a5f',
                            border: '#1e293b',
                            text: '#94a3b8',
                            heading: '#64748b',
                        }
                    }
                }
            }
        }
    </script>

    <!-- DataTables CSS -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.7/css/dataTables.bootstrap5.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/responsive/2.5.0/css/responsive.bootstrap5.min.css">

    <style>
        /* ── Scrollbar Styling ─────────────────────────────── */
        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: #475569; }

        /* ── Dropdown Animation ────────────────────────────── */
        .sidebar-dropdown-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                        opacity 0.2s ease;
            opacity: 0;
        }
        .sidebar-dropdown-content.open {
            max-height: 500px;
            opacity: 1;
        }

        /* ── Chevron Rotation ──────────────────────────────── */
        .dropdown-chevron {
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .dropdown-chevron.rotated {
            transform: rotate(180deg);
        }

        /* ── Sidebar Overlay (Mobile) ──────────────────────── */
        .sidebar-overlay {
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
        }
        .sidebar-overlay.active {
            opacity: 1;
            pointer-events: auto;
        }

        /* ── Sidebar Slide (Mobile) ────────────────────────── */
        @media (max-width: 1023px) {
            .admin-sidebar {
                transform: translateX(-100%);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .admin-sidebar.open {
                transform: translateX(0);
            }
        }

        /* ── Tooltip for collapsed mode ────────────────────── */
        .nav-tooltip {
            display: none;
            position: absolute;
            left: 100%;
            top: 50%;
            transform: translateY(-50%);
            margin-left: 12px;
            padding: 4px 10px;
            background: #1e293b;
            color: #f1f5f9;
            font-size: 12px;
            font-weight: 500;
            border-radius: 6px;
            white-space: nowrap;
            z-index: 100;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .nav-tooltip::before {
            content: '';
            position: absolute;
            right: 100%;
            top: 50%;
            transform: translateY(-50%);
            border: 5px solid transparent;
            border-right-color: #1e293b;
        }

        /* ── Badge Pulse ───────────────────────────────────── */
        @keyframes pulse-badge {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        .badge-pulse { animation: pulse-badge 2s ease-in-out infinite; }

        /* ── Page transitions ──────────────────────────────── */
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up { animation: fadeInUp 0.4s ease-out; }
    </style>
    <?php echo $__env->yieldContent('css'); ?>
</head>
<body class="h-full bg-gray-50 font-sans antialiased">

    <!-- ═══════════════════════════════════════════════════════
         MOBILE OVERLAY
         ═══════════════════════════════════════════════════════ -->
    <div class="sidebar-overlay fixed inset-0 bg-black/50 z-40 lg:hidden" id="sidebarOverlay" onclick="toggleSidebar()"></div>

    <!-- ═══════════════════════════════════════════════════════
         SIDEBAR
         ═══════════════════════════════════════════════════════ -->
    <aside class="admin-sidebar fixed top-0 left-0 z-50 w-[264px] h-screen bg-[#0f172a] flex flex-col" id="adminSidebar" role="navigation" aria-label="Sidebar Navigation">

        <!-- ── Brand Header ────────────────────────────────── -->
        <div class="flex items-center gap-3 px-5 h-16 border-b border-white/[0.06] flex-shrink-0">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
            </div>
            <div class="flex flex-col">
                <span class="text-[15px] font-bold text-white tracking-tight">Sobitas</span>
                <span class="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Admin Panel</span>
            </div>
        </div>

        <!-- ── Scrollable Navigation ───────────────────────── -->
        <nav class="flex-1 overflow-y-auto sidebar-scroll px-3 py-4 space-y-1">

            
            <div class="mb-3">
                <?php echo $__env->make('layouts.partials.sidebar-heading', ['title' => 'Principal'], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>

                
                <?php echo $__env->make('layouts.partials.sidebar-item', [
                    'route' => 'admin.dashboard',
                    'label' => 'Dashboard',
                    'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/>',
                    'badge' => null,
                ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>

                
                <?php echo $__env->make('layouts.partials.sidebar-dropdown', [
                    'id' => 'site-settings',
                    'label' => 'Paramètres Du Site',
                    'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>',
                    'items' => [
                        ['href' => '#', 'label' => 'Coordonnées'],
                        ['href' => '#', 'label' => 'Paramètres'],
                        ['href' => '#', 'label' => 'Redirections'],
                    ],
                    'activePattern' => 'admin.settings*',
                ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>
            </div>

            
            <div class="mb-3">
                <?php echo $__env->make('layouts.partials.sidebar-heading', ['title' => 'Facturation & Ventes'], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>

                
                <?php echo $__env->make('layouts.partials.sidebar-dropdown', [
                    'id' => 'billing',
                    'label' => 'Facturations & Tickets',
                    'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/>',
                    'items' => [
                        ['href' => route('admin.commande'), 'label' => 'Commandes', 'routeIs' => 'admin.commande*'],
                        ['href' => route('admin.facture'), 'label' => 'Factures (BL)', 'routeIs' => 'admin.facture'],
                        ['href' => route('admin.facture_tva'), 'label' => 'Factures TVA', 'routeIs' => 'admin.facture_tva*'],
                        ['href' => route('admin.ticket'), 'label' => 'Tickets', 'routeIs' => 'admin.ticket*'],
                        ['href' => route('admin.quotations'), 'label' => 'Devis', 'routeIs' => 'admin.quotation*'],
                        ['href' => route('admin.pricelists.create'), 'label' => 'Price Lists', 'routeIs' => 'admin.pricelist*'],
                    ],
                    'activePattern' => 'admin.commande*,admin.facture*,admin.ticket*,admin.quotation*,admin.pricelist*',
                    'defaultOpen' => true,
                ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>
            </div>

            
            <div class="mb-3">
                <?php echo $__env->make('layouts.partials.sidebar-heading', ['title' => 'Catalogue'], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>

                
                <?php echo $__env->make('layouts.partials.sidebar-item', [
                    'href' => '#',
                    'label' => 'Clients',
                    'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>',
                    'badge' => null,
                ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>

                
                <?php echo $__env->make('layouts.partials.sidebar-item', [
                    'route' => 'admin.products.index',
                    'label' => 'Produits',
                    'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/>',
                    'badge' => null,
                ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>

                
                <?php echo $__env->make('layouts.partials.sidebar-item', [
                    'href' => '#',
                    'label' => 'Catégories',
                    'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"/>',
                    'badge' => null,
                ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>

                
                <?php echo $__env->make('layouts.partials.sidebar-item', [
                    'href' => '#',
                    'label' => 'Sous Catégories',
                    'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12M8.25 17.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>',
                    'badge' => null,
                ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>

                
                <?php echo $__env->make('layouts.partials.sidebar-item', [
                    'href' => '#',
                    'label' => 'Brands',
                    'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"/><path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z"/>',
                    'badge' => null,
                ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>

                
                <?php echo $__env->make('layouts.partials.sidebar-item', [
                    'href' => '#',
                    'label' => 'Aromas',
                    'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"/>',
                    'badge' => null,
                ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>

                
                <?php echo $__env->make('layouts.partials.sidebar-item', [
                    'href' => '#',
                    'label' => 'Tags',
                    'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5"/>',
                    'badge' => null,
                ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>
            </div>

            
            <div class="mb-3">
                <?php echo $__env->make('layouts.partials.sidebar-heading', ['title' => 'Contenu'], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>

                
                <?php echo $__env->make('layouts.partials.sidebar-item', [
                    'href' => '#',
                    'label' => 'Blogs',
                    'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6V7.5z"/>',
                    'badge' => null,
                ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>

                
                <?php echo $__env->make('layouts.partials.sidebar-item', [
                    'href' => '#',
                    'label' => 'Media',
                    'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21zM10.5 8.25a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>',
                    'badge' => null,
                ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>

                
                <?php echo $__env->make('layouts.partials.sidebar-item', [
                    'href' => '#',
                    'label' => 'Pages',
                    'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>',
                    'badge' => null,
                ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>

                
                <?php echo $__env->make('layouts.partials.sidebar-item', [
                    'href' => '#',
                    'label' => 'Slides',
                    'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"/>',
                    'badge' => null,
                ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>

                
                <?php echo $__env->make('layouts.partials.sidebar-item', [
                    'href' => '#',
                    'label' => 'Services',
                    'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17l-5.384 3.079A1.125 1.125 0 014.5 17.23V6.77a1.125 1.125 0 011.536-1.019l5.384 3.079m0 6.34V8.83m0 6.34L18 18.25a1.125 1.125 0 001.536-1.019V6.77a1.125 1.125 0 00-1.536-1.02L12 8.83"/>',
                    'badge' => null,
                ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>

                
                <?php echo $__env->make('layouts.partials.sidebar-item', [
                    'href' => '#',
                    'label' => 'FAQs',
                    'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/>',
                    'badge' => null,
                ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>
            </div>

            
            <div class="mb-3">
                <?php echo $__env->make('layouts.partials.sidebar-heading', ['title' => 'Communication'], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>

                
                <?php echo $__env->make('layouts.partials.sidebar-item', [
                    'href' => '#',
                    'label' => 'Newsletters',
                    'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>',
                    'badge' => null,
                ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>

                
                <?php echo $__env->make('layouts.partials.sidebar-item', [
                    'href' => '#',
                    'label' => 'Contacts',
                    'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"/>',
                    'badge' => null,
                ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>

                
                <?php echo $__env->make('layouts.partials.sidebar-item', [
                    'href' => '#',
                    'label' => 'SMS',
                    'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"/>',
                    'badge' => null,
                ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>
            </div>

            
            <div class="mb-3">
                <?php echo $__env->make('layouts.partials.sidebar-heading', ['title' => 'SEO & Analytics'], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>

                
                <?php echo $__env->make('layouts.partials.sidebar-item', [
                    'route' => 'admin.statistic',
                    'label' => 'Statistiques',
                    'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>',
                    'badge' => null,
                ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>

                
                <?php echo $__env->make('layouts.partials.sidebar-dropdown', [
                    'id' => 'seo',
                    'label' => 'SEO',
                    'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"/>',
                    'items' => [
                        ['href' => '#', 'label' => 'Pages SEO'],
                        ['href' => '#', 'label' => 'Redirections'],
                    ],
                    'activePattern' => 'admin.seo*',
                ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>
            </div>

            
            <div class="mb-3">
                <?php echo $__env->make('layouts.partials.sidebar-heading', ['title' => 'Outils'], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>

                <?php echo $__env->make('layouts.partials.sidebar-item', [
                    'route' => 'admin.clients.export',
                    'label' => 'Export Clients',
                    'icon' => '<path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>',
                    'badge' => null,
                ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>
            </div>

        </nav>

        <!-- ── Sidebar Footer ──────────────────────────────── -->
        <div class="flex-shrink-0 border-t border-white/[0.06] px-4 py-3">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    <?php echo e(strtoupper(substr(Auth::user()->name ?? 'A', 0, 1))); ?>

                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-slate-200 truncate"><?php echo e(Auth::user()->name ?? 'Admin'); ?></p>
                    <p class="text-[11px] text-slate-500 truncate"><?php echo e(Auth::user()->email ?? ''); ?></p>
                </div>
            </div>
        </div>
    </aside>

    <!-- ═══════════════════════════════════════════════════════
         MAIN CONTENT AREA
         ═══════════════════════════════════════════════════════ -->
    <div class="lg:pl-[264px] min-h-screen flex flex-col">

        <!-- ── Top Bar ─────────────────────────────────────── -->
        <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-200/60">
            <div class="flex items-center justify-between h-14 px-4 lg:px-6">
                <div class="flex items-center gap-3">
                    <!-- Mobile Menu Toggle -->
                    <button
                        class="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        onclick="toggleSidebar()"
                        aria-label="Toggle sidebar"
                    >
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>
                        </svg>
                    </button>

                    <!-- Breadcrumb / Page Title -->
                    <div>
                        <h1 class="text-sm font-semibold text-gray-900"><?php echo $__env->yieldContent('page_title', 'Dashboard'); ?></h1>
                        <p class="text-xs text-gray-500 hidden sm:block"><?php echo $__env->yieldContent('page_subtitle', 'Bienvenue sur le panneau d\'administration'); ?></p>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <!-- Date -->
                    <span class="hidden md:inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
                        </svg>
                        <?php echo e(now()->translatedFormat('d M Y')); ?>

                    </span>

                    <!-- Refresh -->
                    <a href="<?php echo e(url()->current()); ?>" class="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Rafraîchir">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/>
                        </svg>
                    </a>
                </div>
            </div>
        </header>

        <!-- ── Flash Alerts ────────────────────────────────── -->
        <?php if(session('success') || session('error') || session('warning') || session('info') || $errors->any()): ?>
        <div class="px-4 lg:px-6 pt-4 space-y-2">
            <?php if(session('success')): ?>
                <div class="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm" role="alert">
                    <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span><?php echo e(session('success')); ?></span>
                </div>
            <?php endif; ?>
            <?php if(session('error')): ?>
                <div class="flex items-center gap-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm" role="alert">
                    <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
                    <span><?php echo e(session('error')); ?></span>
                </div>
            <?php endif; ?>
            <?php if(session('warning')): ?>
                <div class="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm" role="alert">
                    <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
                    <span><?php echo e(session('warning')); ?></span>
                </div>
            <?php endif; ?>
            <?php if(session('info')): ?>
                <div class="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm" role="alert">
                    <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>
                    <span><?php echo e(session('info')); ?></span>
                </div>
            <?php endif; ?>
            <?php if($errors->any()): ?>
                <div class="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm" role="alert">
                    <ul class="list-disc list-inside space-y-1">
                        <?php $__currentLoopData = $errors->all(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $error): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                            <li><?php echo e($error); ?></li>
                        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                    </ul>
                </div>
            <?php endif; ?>
        </div>
        <?php endif; ?>

        <!-- ── Page Content ────────────────────────────────── -->
        <main class="flex-1 p-4 lg:p-6">
            <?php echo $__env->yieldContent('content'); ?>
        </main>
    </div>

    <!-- ═══════════════════════════════════════════════════════
         SCRIPTS
         ═══════════════════════════════════════════════════════ -->
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/responsive/2.5.0/js/dataTables.responsive.min.js"></script>

    <script>
        // ── Sidebar Toggle (Mobile) ─────────────────────────
        function toggleSidebar() {
            const sidebar = document.getElementById('adminSidebar');
            const overlay = document.getElementById('sidebarOverlay');
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
            document.body.classList.toggle('overflow-hidden');
        }

        // ── Dropdown Toggles ─────────────────────────────────
        function toggleDropdown(id) {
            const content = document.getElementById('dropdown-' + id);
            const chevron = document.getElementById('chevron-' + id);

            content.classList.toggle('open');
            chevron.classList.toggle('rotated');

            // Save state to localStorage
            const isOpen = content.classList.contains('open');
            localStorage.setItem('sidebar-dropdown-' + id, isOpen ? '1' : '0');
        }

        // ── Restore Dropdown States ──────────────────────────
        document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('.sidebar-dropdown-content').forEach(function(el) {
                const id = el.id.replace('dropdown-', '');
                const saved = localStorage.getItem('sidebar-dropdown-' + id);
                const defaultOpen = el.dataset.defaultOpen === '1';

                if (saved === '1' || (saved === null && defaultOpen)) {
                    el.classList.add('open');
                    const chevron = document.getElementById('chevron-' + id);
                    if (chevron) chevron.classList.add('rotated');
                }
            });
        });

        // ── Close sidebar on Escape key ──────────────────────
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const sidebar = document.getElementById('adminSidebar');
                if (sidebar.classList.contains('open')) {
                    toggleSidebar();
                }
            }
        });
    </script>

    <?php echo $__env->yieldContent('javascript'); ?>
</body>
</html>
<?php /**PATH /var/www/html/resources/views/layouts/admin.blade.php ENDPATH**/ ?>