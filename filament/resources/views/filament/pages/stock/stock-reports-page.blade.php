<x-filament-panels::page>
    @php
        $reports = $this->getReports();
        $kpis = $reports['kpis'];
        $valueByCat = $reports['value_by_category'];
        $distribution = $reports['distribution'];
        $totalValue = $reports['total_value'];
        $maxBarValue = $valueByCat ? max(array_map(fn ($r) => $r->value, $valueByCat)) : 1;
        $distTotal = $distribution ? array_sum(array_map(fn ($r) => $r->value, $distribution)) : 1;
    @endphp

    <style>
        .reports-page {
            --rp-bg: #fff;
            --rp-bg-alt: #f8fafc;
            --rp-border: #e2e8f0;
            --rp-text: #1e293b;
            --rp-text-muted: #64748b;
            --rp-radius: 12px;
            --rp-shadow: 0 1px 3px rgba(0,0,0,.08);
            --rp-danger-bg: #fef2f2;
            --rp-danger-text: #b91c1c;
            --rp-warning-bg: #fffbeb;
            --rp-warning-text: #b45309;
            --rp-success-bg: #f0fdf4;
            --rp-success-text: #15803d;
            font-family: inherit;
            color: var(--rp-text);
        }
        .reports-page.dark,
        .dark .reports-page {
            --rp-bg: #1e293b;
            --rp-bg-alt: #0f172a;
            --rp-border: #334155;
            --rp-text: #f1f5f9;
            --rp-text-muted: #94a3b8;
            --rp-shadow: 0 1px 3px rgba(0,0,0,.3);
            --rp-danger-bg: rgba(185,28,28,.15);
            --rp-danger-text: #fca5a5;
            --rp-warning-bg: rgba(180,83,9,.2);
            --rp-warning-text: #fcd34d;
            --rp-success-bg: rgba(21,128,61,.2);
            --rp-success-text: #86efac;
        }

        .reports-page .reports-kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 1.75rem;
        }
        .reports-page .reports-kpi-card {
            display: block;
            background: var(--rp-bg);
            border: 1px solid var(--rp-border);
            border-radius: var(--rp-radius);
            box-shadow: var(--rp-shadow);
            padding: 1.25rem 1.25rem;
            text-decoration: none;
            color: inherit;
            transition: box-shadow .2s, transform .15s;
        }
        .reports-page .reports-kpi-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,.1);
            transform: translateY(-1px);
        }
        .dark .reports-page .reports-kpi-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.35); }
        .reports-page .reports-kpi-card-inner {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .reports-page .reports-kpi-icon {
            width: 48px;
            height: 48px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .reports-page .reports-kpi-icon svg { width: 28px; height: 28px; }
        .reports-page .reports-kpi-icon.danger { background: var(--rp-danger-bg); color: var(--rp-danger-text); }
        .reports-page .reports-kpi-icon.warning { background: var(--rp-warning-bg); color: var(--rp-warning-text); }
        .reports-page .reports-kpi-icon.success { background: var(--rp-success-bg); color: var(--rp-success-text); }
        .reports-page .reports-kpi-label { font-size: 0.875rem; color: var(--rp-text-muted); font-weight: 500; margin-bottom: 0.2rem; }
        .reports-page .reports-kpi-value { font-size: 1.5rem; font-weight: 700; line-height: 1.2; }
        .reports-page .reports-kpi-sublabel { font-size: 0.75rem; color: var(--rp-text-muted); }

        .reports-page .reports-charts-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
            margin-bottom: 1.75rem;
        }
        @media (max-width: 900px) {
            .reports-page .reports-charts-row { grid-template-columns: 1fr; }
        }
        .reports-page .reports-chart-card {
            background: var(--rp-bg);
            border: 1px solid var(--rp-border);
            border-radius: var(--rp-radius);
            box-shadow: var(--rp-shadow);
            padding: 1.25rem 1.5rem;
        }
        .reports-page .reports-chart-card.full-width { grid-column: 1 / -1; }
        .reports-page .reports-chart-title {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: var(--rp-text);
        }
        .reports-page .reports-bar-chart { margin-top: 0.5rem; }
        .reports-page .reports-bar-item {
            margin-bottom: 0.75rem;
        }
        .reports-page .reports-bar-item:last-child { margin-bottom: 0; }
        .reports-page .reports-bar-row {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-top: 0.25rem;
        }
        .reports-page .reports-bar-label {
            flex: 0 0 140px;
            font-size: 0.8125rem;
            color: var(--rp-text);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .reports-page .reports-bar-track {
            flex: 1;
            min-width: 0;
            height: 22px;
            background: var(--rp-bg-alt);
            border-radius: 6px;
            overflow: hidden;
        }
        .reports-page .reports-bar-fill {
            height: 100%;
            border-radius: 6px;
            min-width: 4px;
            transition: width .4s ease;
        }
        .reports-page .reports-bar-value {
            flex: 0 0 70px;
            font-size: 0.8125rem;
            font-weight: 600;
            text-align: right;
            color: var(--rp-text-muted);
        }
        .reports-page .reports-dist-list { margin-top: 0.5rem; }
        .reports-page .reports-dist-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
            font-size: 0.8125rem;
        }
        .reports-page .reports-dist-bar {
            width: 60px;
            height: 12px;
            background: var(--rp-bg-alt);
            border-radius: 4px;
            overflow: hidden;
        }
        .reports-page .reports-dist-fill {
            height: 100%;
            border-radius: 4px;
            min-width: 2px;
        }
        .reports-page .reports-dist-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--rp-text); }
        .reports-page .reports-dist-pct { flex-shrink: 0; color: var(--rp-text-muted); font-weight: 500; }

        .reports-page .reports-summary-box {
            background: var(--rp-bg-alt);
            border: 1px solid var(--rp-border);
            border-radius: var(--rp-radius);
            padding: 1rem 1.25rem;
        }
        .reports-page .reports-summary-title { font-weight: 600; margin-bottom: 0.5rem; color: var(--rp-text); }
        .reports-page .reports-summary-value { font-size: 1.25rem; font-weight: 700; color: var(--rp-text); }
        .reports-page .reports-summary-meta { font-size: 0.75rem; color: var(--rp-text-muted); margin-top: 0.5rem; }

        .reports-page .reports-section {
            background: var(--rp-bg);
            border: 1px solid var(--rp-border);
            border-radius: var(--rp-radius);
            box-shadow: var(--rp-shadow);
            overflow: hidden;
            margin-bottom: 1.75rem;
        }
        .reports-page .reports-section-head {
            padding: 1rem 1.25rem;
            border-bottom: 1px solid var(--rp-border);
            font-size: 1rem;
            font-weight: 600;
            color: var(--rp-text);
        }
        .reports-page .reports-section-desc {
            font-size: 0.8125rem;
            color: var(--rp-text-muted);
            margin-top: 0.25rem;
            font-weight: 400;
        }
        .reports-page .reports-table-wrap { overflow-x: auto; }
        .reports-page .reports-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
        }
        .reports-page .reports-table th {
            text-align: left;
            padding: 0.75rem 1rem;
            background: var(--rp-bg-alt);
            color: var(--rp-text);
            font-weight: 600;
            border-bottom: 1px solid var(--rp-border);
        }
        .reports-page .reports-table th.text-end { text-align: right; }
        .reports-page .reports-table td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid var(--rp-border);
            color: var(--rp-text);
        }
        .reports-page .reports-table tbody tr:nth-child(even) { background: var(--rp-bg-alt); }
        .reports-page .reports-table tbody tr.critical { background: var(--rp-danger-bg); }
        .reports-page .reports-table tbody tr.critical td { color: var(--rp-danger-text); }
        .reports-page .reports-table tbody tr:hover { background: var(--rp-border); }
        .reports-page .reports-table .text-end { text-align: right; }
        .reports-page .reports-table .btn-link {
            display: inline-block;
            padding: 0.35rem 0.75rem;
            font-size: 0.8125rem;
            font-weight: 600;
            color: #fff;
            background: #2563eb;
            border-radius: 6px;
            text-decoration: none;
            transition: background .2s;
        }
        .reports-page .reports-table .btn-link:hover { background: #1d4ed8; }
        .reports-page .reports-table .empty-cell {
            text-align: center;
            padding: 2rem 1rem;
            color: var(--rp-text-muted);
        }

        .reports-page .bar-color-0 { background: #3b82f6; }
        .reports-page .bar-color-1 { background: #10b981; }
        .reports-page .bar-color-2 { background: #f59e0b; }
        .reports-page .bar-color-3 { background: #ef4444; }
        .reports-page .bar-color-4 { background: #8b5cf6; }
        .reports-page .bar-color-5 { background: #ec4899; }
        .reports-page .bar-color-6 { background: #0ea5e9; }
        .reports-page .bar-color-7 { background: #14b8a6; }
        .reports-page .bar-color-8 { background: #f59e0b; }
        .reports-page .bar-color-9 { background: #6b7280; }
    </style>

    <div class="reports-page">
        {{-- KPI Cards --}}
        <div class="reports-kpi-grid">
            <a href="{{ $this->getProductsUrl('out_of_stock') }}" class="reports-kpi-card">
                <div class="reports-kpi-card-inner">
                    <div class="reports-kpi-icon danger">
                        <x-filament::icon icon="heroicon-o-exclamation-triangle" />
                    </div>
                    <div>
                        <p class="reports-kpi-label">Rupture</p>
                        <p class="reports-kpi-value">{{ $kpis['rupture'] }}</p>
                        <p class="reports-kpi-sublabel">produits</p>
                    </div>
                </div>
            </a>
            <a href="{{ $this->getProductsUrl('low_stock') }}" class="reports-kpi-card">
                <div class="reports-kpi-card-inner">
                    <div class="reports-kpi-icon warning">
                        <x-filament::icon icon="heroicon-o-arrow-trending-down" />
                    </div>
                    <div>
                        <p class="reports-kpi-label">Stock faible</p>
                        <p class="reports-kpi-value">{{ $kpis['low_stock'] }}</p>
                        <p class="reports-kpi-sublabel">produits</p>
                    </div>
                </div>
            </a>
            <a href="{{ $this->getProductsUrl('in_stock') }}" class="reports-kpi-card">
                <div class="reports-kpi-card-inner">
                    <div class="reports-kpi-icon success">
                        <x-filament::icon icon="heroicon-o-check-circle" />
                    </div>
                    <div>
                        <p class="reports-kpi-label">Stock normal</p>
                        <p class="reports-kpi-value">{{ $kpis['in_stock'] }}</p>
                        <p class="reports-kpi-sublabel">produits · {{ number_format($totalValue, 0, ',', ' ') }} DT</p>
                    </div>
                </div>
            </a>
        </div>

        {{-- Charts row: bar chart (full width) + distribution + summary --}}
        <div class="reports-charts-row">
            <div class="reports-chart-card full-width">
                <h3 class="reports-chart-title">Valeur du stock par catégorie (Top 10)</h3>
                <div class="reports-bar-chart">
                    @forelse($valueByCat as $i => $row)
                        @php $pct = $maxBarValue > 0 ? round(($row->value / $maxBarValue) * 100, 1) : 0; @endphp
                        <div class="reports-bar-item">
                            <div class="reports-bar-row">
                                <span class="reports-bar-label" title="{{ $row->name }}">{{ $row->name }}</span>
                                <div class="reports-bar-track">
                                    <div class="reports-bar-fill bar-color-{{ $i % 10 }}" style="width: {{ $pct }}%;"></div>
                                </div>
                                <span class="reports-bar-value">{{ number_format($row->value, 0, ',', ' ') }} DT</span>
                            </div>
                        </div>
                    @empty
                        <p class="reports-kpi-sublabel">Aucune donnée</p>
                    @endforelse
                </div>
            </div>
            <div class="reports-chart-card">
                <h3 class="reports-chart-title">Répartition par catégorie</h3>
                <div class="reports-dist-list">
                    @foreach(array_slice($distribution, 0, 8) as $j => $row)
                        @php $pct = $distTotal > 0 ? round(($row->value / $distTotal) * 100, 1) : 0; @endphp
                        <div class="reports-dist-item">
                            <div class="reports-dist-bar">
                                <div class="reports-dist-fill bar-color-{{ $j % 10 }}" style="width: {{ $pct }}%;"></div>
                            </div>
                            <span class="reports-dist-name" title="{{ $row->name }}">{{ $row->name }}</span>
                            <span class="reports-dist-pct">{{ $pct }}%</span>
                        </div>
                    @endforeach
                </div>
            </div>
            <div class="reports-chart-card">
                <h3 class="reports-chart-title">Résumé</h3>
                <div class="reports-summary-box">
                    <p class="reports-summary-title">Valeur totale du stock</p>
                    <p class="reports-summary-value">{{ number_format($totalValue, 2, ',', ' ') }} DT</p>
                    <p class="reports-summary-meta">Dernière mise à jour : {{ now()->format('d/m/Y H:i') }}</p>
                </div>
            </div>
        </div>

        {{-- Low stock table --}}
        <div class="reports-section">
            <div class="reports-section-head">
                Produits en stock faible
                <p class="reports-section-desc">Quantité inférieure au seuil minimum. Les lignes en rouge sont critiques.</p>
            </div>
            <div class="reports-table-wrap">
                <table class="reports-table">
                    <thead>
                        <tr>
                            <th>Désignation</th>
                            <th class="text-end">Quantité</th>
                            <th class="text-end">Seuil min.</th>
                            <th>Catégorie</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse($reports['low_stock'] as $row)
                            <tr class="{{ $row->critical ? 'critical' : '' }}">
                                <td>{{ \Illuminate\Support\Str::limit($row->designation_fr, 45) }}</td>
                                <td class="text-end">{{ $row->qte }}</td>
                                <td class="text-end">{{ $row->seuil }}</td>
                                <td>{{ $row->category }}</td>
                                <td>
                                    <a href="{{ \App\Filament\Resources\ProductResource::getUrl('edit', ['record' => $row->id]) }}" class="btn-link">Voir</a>
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="5" class="empty-cell">Aucun produit en stock faible</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</x-filament-panels::page>
