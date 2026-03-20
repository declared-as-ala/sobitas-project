@php
    $metrics    = $this->getMetrics();
    $report     = $this->getReportData();
    $alerts     = $this->getAlertProducts();
    $kpis       = $report['kpis'];
    $valByCat   = $report['value_by_category'];
    $dist       = $report['distribution'];
    $totalValue = $report['total_value'];
    $maxBar     = $valByCat ? max(array_map(fn ($r) => $r->value, $valByCat)) : 1;
    $distTotal  = $dist     ? array_sum(array_map(fn ($r) => $r->value, $dist))  : 1;
@endphp

<x-filament-panels::page>
<style>
    .gds { --gds-bg:#fff; --gds-bg-alt:#f8fafc; --gds-border:#e2e8f0; --gds-text:#1e293b; --gds-muted:#64748b; --gds-r:12px; --gds-sh:0 1px 3px rgba(0,0,0,.08); --gds-danger-bg:#fef2f2; --gds-danger:#b91c1c; --gds-warn-bg:#fffbeb; --gds-warn:#b45309; --gds-ok-bg:#f0fdf4; --gds-ok:#15803d; --gds-info-bg:#eff6ff; --gds-info:#1d4ed8; color:var(--gds-text); font-family:inherit; }
    .dark .gds { --gds-bg:#1e293b; --gds-bg-alt:#0f172a; --gds-border:#334155; --gds-text:#f1f5f9; --gds-muted:#94a3b8; --gds-sh:0 1px 3px rgba(0,0,0,.3); --gds-danger-bg:rgba(185,28,28,.15); --gds-danger:#fca5a5; --gds-warn-bg:rgba(180,83,9,.2); --gds-warn:#fcd34d; --gds-ok-bg:rgba(21,128,61,.2); --gds-ok:#86efac; --gds-info-bg:rgba(29,78,216,.2); --gds-info:#93c5fd; }

    /* ── KPI grid ── */
    .gds-kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:1rem; margin-bottom:1.5rem; }
    .gds-kpi  { background:var(--gds-bg); border:1px solid var(--gds-border); border-radius:var(--gds-r); box-shadow:var(--gds-sh); padding:1.125rem 1.25rem; display:flex; align-items:center; gap:.875rem; transition:box-shadow .2s,transform .15s; text-decoration:none; color:inherit; }
    .gds-kpi:hover { box-shadow:0 4px 14px rgba(0,0,0,.1); transform:translateY(-1px); }
    .dark .gds-kpi:hover { box-shadow:0 4px 14px rgba(0,0,0,.35); }
    .gds-kpi-icon { width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .gds-kpi-icon svg { width:24px; height:24px; }
    .gds-kpi-icon.ok      { background:var(--gds-ok-bg);      color:var(--gds-ok); }
    .gds-kpi-icon.warn    { background:var(--gds-warn-bg);    color:var(--gds-warn); }
    .gds-kpi-icon.danger  { background:var(--gds-danger-bg);  color:var(--gds-danger); }
    .gds-kpi-icon.info    { background:var(--gds-info-bg);    color:var(--gds-info); }
    .gds-kpi-icon.neutral { background:var(--gds-bg-alt);     color:var(--gds-muted); }
    .gds-kpi-label { font-size:.8125rem; color:var(--gds-muted); font-weight:500; margin-bottom:.15rem; }
    .gds-kpi-value { font-size:1.5rem; font-weight:700; line-height:1.15; }
    .gds-kpi-sub   { font-size:.75rem; color:var(--gds-muted); margin-top:.1rem; }

    /* ── Section card ── */
    .gds-section { background:var(--gds-bg); border:1px solid var(--gds-border); border-radius:var(--gds-r); box-shadow:var(--gds-sh); overflow:hidden; margin-bottom:1.5rem; }
    .gds-section-head { padding:.875rem 1.25rem; border-bottom:1px solid var(--gds-border); font-weight:600; font-size:.9375rem; display:flex; align-items:center; gap:.5rem; }
    .gds-section-head svg { width:18px; height:18px; flex-shrink:0; opacity:.7; }
    .gds-section-body { padding:1.25rem; }

    /* ── Alerts table ── */
    .gds-alert-table { width:100%; border-collapse:collapse; font-size:.875rem; }
    .gds-alert-table th { padding:.625rem 1rem; background:var(--gds-bg-alt); color:var(--gds-text); font-weight:600; border-bottom:1px solid var(--gds-border); text-align:left; }
    .gds-alert-table th.te { text-align:right; }
    .gds-alert-table td { padding:.625rem 1rem; border-bottom:1px solid var(--gds-border); color:var(--gds-text); vertical-align:middle; }
    .gds-alert-table tbody tr:last-child td { border-bottom:none; }
    .gds-alert-table tbody tr:hover { background:var(--gds-bg-alt); }
    .gds-alert-table .te { text-align:right; }
    .gds-alert-badge { display:inline-flex; align-items:center; padding:.25rem .625rem; border-radius:999px; font-size:.75rem; font-weight:600; }
    .gds-alert-badge.rupture    { background:var(--gds-danger-bg); color:var(--gds-danger); }
    .gds-alert-badge.low        { background:var(--gds-warn-bg);   color:var(--gds-warn); }
    .gds-alert-badge.incoherence{ background:var(--gds-warn-bg);   color:var(--gds-warn); }
    .gds-btn-link { display:inline-flex; align-items:center; padding:.3rem .75rem; font-size:.8125rem; font-weight:600; color:#fff; background:#2563eb; border-radius:6px; text-decoration:none; transition:background .2s; }
    .gds-btn-link:hover { background:#1d4ed8; }

    /* ── Charts row ── */
    .gds-charts-row { display:grid; grid-template-columns:1fr 1fr 280px; gap:1.25rem; margin-bottom:1.5rem; }
    @media (max-width:1100px) { .gds-charts-row { grid-template-columns:1fr 1fr; } .gds-summary-card { grid-column:1/-1; } }
    @media (max-width:700px)  { .gds-charts-row { grid-template-columns:1fr; } }
    .gds-chart-card { background:var(--gds-bg); border:1px solid var(--gds-border); border-radius:var(--gds-r); box-shadow:var(--gds-sh); padding:1.125rem 1.25rem; }
    .gds-chart-title { font-size:.9375rem; font-weight:600; margin-bottom:1rem; color:var(--gds-text); }

    /* bar chart */
    .gds-bar-item { margin-bottom:.625rem; }
    .gds-bar-item:last-child { margin-bottom:0; }
    .gds-bar-row  { display:flex; align-items:center; gap:.625rem; margin-top:.2rem; }
    .gds-bar-label{ flex:0 0 130px; font-size:.8rem; color:var(--gds-text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .gds-bar-track{ flex:1; min-width:0; height:20px; background:var(--gds-bg-alt); border-radius:6px; overflow:hidden; }
    .gds-bar-fill { height:100%; border-radius:6px; min-width:4px; transition:width .4s ease; }
    .gds-bar-val  { flex:0 0 80px; font-size:.8rem; font-weight:600; text-align:right; color:var(--gds-muted); }

    /* distribution list */
    .gds-dist-item { display:flex; align-items:center; gap:.5rem; margin-bottom:.45rem; font-size:.8rem; }
    .gds-dist-bar  { width:56px; height:11px; background:var(--gds-bg-alt); border-radius:4px; overflow:hidden; flex-shrink:0; }
    .gds-dist-fill { height:100%; border-radius:4px; min-width:2px; }
    .gds-dist-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--gds-text); }
    .gds-dist-pct  { flex-shrink:0; color:var(--gds-muted); font-weight:500; }

    /* summary card */
    .gds-summary-box { background:var(--gds-bg-alt); border:1px solid var(--gds-border); border-radius:8px; padding:1rem 1.125rem; }
    .gds-summary-title { font-weight:600; font-size:.875rem; margin-bottom:.35rem; color:var(--gds-text); }
    .gds-summary-big   { font-size:1.35rem; font-weight:700; }
    .gds-summary-meta  { font-size:.75rem; color:var(--gds-muted); margin-top:.35rem; }
    .gds-kpi-row  { display:flex; justify-content:space-between; align-items:center; padding:.5rem 0; border-bottom:1px solid var(--gds-border); font-size:.875rem; }
    .gds-kpi-row:last-child { border-bottom:none; padding-bottom:0; }
    .gds-kpi-row-label { color:var(--gds-muted); }
    .gds-kpi-row-val { font-weight:600; }
    .gds-kpi-row-val.ok      { color:var(--gds-ok); }
    .gds-kpi-row-val.warn    { color:var(--gds-warn); }
    .gds-kpi-row-val.danger  { color:var(--gds-danger); }

    /* bar colors */
    .bc0{background:#3b82f6}.bc1{background:#10b981}.bc2{background:#f59e0b}.bc3{background:#ef4444}.bc4{background:#8b5cf6}.bc5{background:#ec4899}.bc6{background:#0ea5e9}.bc7{background:#14b8a6}.bc8{background:#f97316}.bc9{background:#6b7280}

    /* ── Table section label ── */
    .gds-table-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:.75rem; }
    .gds-table-title  { font-size:1rem; font-weight:600; color:var(--gds-text); display:flex; align-items:center; gap:.5rem; }
    .gds-table-title svg { width:18px; height:18px; opacity:.7; }
</style>

<div class="gds">

    {{-- ════ KPI Cards ════ --}}
    <div class="gds-kpis">
        <div class="gds-kpi">
            <div class="gds-kpi-icon neutral">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>
            </div>
            <div>
                <p class="gds-kpi-label">Total produits</p>
                <p class="gds-kpi-value">{{ number_format($metrics['total_products']) }}</p>
                <p class="gds-kpi-sub">dans le catalogue</p>
            </div>
        </div>

        <div class="gds-kpi">
            <div class="gds-kpi-icon ok">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            </div>
            <div>
                <p class="gds-kpi-label">En stock</p>
                <p class="gds-kpi-value">{{ number_format($metrics['in_stock']) }}</p>
                <p class="gds-kpi-sub">produits disponibles</p>
            </div>
        </div>

        <div class="gds-kpi">
            <div class="gds-kpi-icon warn">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>
            </div>
            <div>
                <p class="gds-kpi-label">Stock faible</p>
                <p class="gds-kpi-value">{{ number_format($metrics['low_stock']) }}</p>
                <p class="gds-kpi-sub">sous le seuil</p>
            </div>
        </div>

        <div class="gds-kpi">
            <div class="gds-kpi-icon danger">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            </div>
            <div>
                <p class="gds-kpi-label">Rupture</p>
                <p class="gds-kpi-value">{{ number_format($metrics['out_of_stock']) }}</p>
                <p class="gds-kpi-sub">produits épuisés</p>
            </div>
        </div>

        @if($metrics['inconsistent'] > 0)
        <div class="gds-kpi">
            <div class="gds-kpi-icon warn">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
            </div>
            <div>
                <p class="gds-kpi-label">Incohérences</p>
                <p class="gds-kpi-value">{{ number_format($metrics['inconsistent']) }}</p>
                <p class="gds-kpi-sub">à corriger</p>
            </div>
        </div>
        @endif

        <div class="gds-kpi">
            <div class="gds-kpi-icon info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            </div>
            <div>
                <p class="gds-kpi-label">Valeur du stock</p>
                <p class="gds-kpi-value" style="font-size:1.2rem">{{ number_format($metrics['total_stock_value'], 0, ',', ' ') }} DT</p>
                <p class="gds-kpi-sub">valeur totale HT</p>
            </div>
        </div>
    </div>

    {{-- ════ Charts row ════ --}}
    <div class="gds-charts-row">
        {{-- Bar chart: value by category --}}
        <div class="gds-chart-card">
            <h3 class="gds-chart-title">Valeur du stock par catégorie (Top 10)</h3>
            @forelse($valByCat as $i => $row)
                @php $pct = $maxBar > 0 ? round(($row->value / $maxBar) * 100, 1) : 0; @endphp
                <div class="gds-bar-item">
                    <div class="gds-bar-row">
                        <span class="gds-bar-label" title="{{ $row->name }}">{{ $row->name }}</span>
                        <div class="gds-bar-track">
                            <div class="gds-bar-fill bc{{ $i % 10 }}" style="width:{{ $pct }}%"></div>
                        </div>
                        <span class="gds-bar-val">{{ number_format($row->value, 0, ',', ' ') }} DT</span>
                    </div>
                </div>
            @empty
                <p style="color:var(--gds-muted);font-size:.875rem">Aucune donnée disponible.</p>
            @endforelse
        </div>

        {{-- Distribution by category --}}
        <div class="gds-chart-card">
            <h3 class="gds-chart-title">Répartition par catégorie</h3>
            @foreach(array_slice($dist, 0, 10) as $j => $row)
                @php $pct = $distTotal > 0 ? round(($row->value / $distTotal) * 100, 1) : 0; @endphp
                <div class="gds-dist-item">
                    <div class="gds-dist-bar">
                        <div class="gds-dist-fill bc{{ $j % 10 }}" style="width:{{ $pct }}%"></div>
                    </div>
                    <span class="gds-dist-name" title="{{ $row->name }}">{{ $row->name }}</span>
                    <span class="gds-dist-pct">{{ $pct }}%</span>
                </div>
            @endforeach
        </div>

        {{-- Summary card --}}
        <div class="gds-chart-card gds-summary-card">
            <h3 class="gds-chart-title">Résumé</h3>
            <div class="gds-summary-box" style="margin-bottom:.875rem">
                <p class="gds-summary-title">Valeur totale du stock</p>
                <p class="gds-summary-big">{{ number_format($totalValue, 2, ',', ' ') }} DT</p>
                <p class="gds-summary-meta">Mise à jour : {{ now()->format('d/m/Y H:i') }}</p>
            </div>
            <div class="gds-kpi-row">
                <span class="gds-kpi-row-label">En stock</span>
                <span class="gds-kpi-row-val ok">{{ $kpis['in_stock'] }}</span>
            </div>
            <div class="gds-kpi-row">
                <span class="gds-kpi-row-label">Stock faible</span>
                <span class="gds-kpi-row-val warn">{{ $kpis['low_stock'] }}</span>
            </div>
            <div class="gds-kpi-row">
                <span class="gds-kpi-row-label">Rupture</span>
                <span class="gds-kpi-row-val danger">{{ $kpis['rupture'] }}</span>
            </div>
        </div>
    </div>

    {{-- ════ Alert section ════ --}}
    @if($alerts->isNotEmpty())
    <div class="gds-section" style="margin-bottom:1.5rem">
        <div class="gds-section-head" style="color:var(--gds-danger)">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.715 0M3.124 7.5A8.969 8.969 0 0 1 5.292 3m13.416 0a8.969 8.969 0 0 1 2.168 4.5" /></svg>
            Alertes &amp; ruptures
            <span style="font-size:.8125rem;font-weight:400;margin-left:auto;color:var(--gds-muted)">{{ $alerts->count() }} produit(s) à traiter</span>
        </div>
        <div style="overflow-x:auto">
            <table class="gds-alert-table">
                <thead>
                    <tr>
                        <th>Produit</th>
                        <th class="te">Quantité</th>
                        <th class="te">Seuil</th>
                        <th>Catégorie</th>
                        <th>Alerte</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($alerts as $p)
                        @php
                            $qte = (int) $p->qte;
                            $rupture = (bool) $p->rupture;
                            $threshold = (int) ($p->low_stock_threshold ?: 10);
                            if ($rupture && $qte > 0) {
                                $badge = 'incoherence'; $label = 'Incohérence';
                            } elseif ($qte <= 0) {
                                $badge = 'rupture'; $label = 'Rupture';
                            } else {
                                $badge = 'low'; $label = 'Stock faible';
                            }
                        @endphp
                        <tr>
                            <td>{{ \Illuminate\Support\Str::limit($p->designation_fr, 45) }}</td>
                            <td class="te" style="{{ $qte <= 0 ? 'color:var(--gds-danger);font-weight:700' : '' }}">{{ $qte }}</td>
                            <td class="te" style="color:var(--gds-muted)">{{ $threshold }}</td>
                            <td style="color:var(--gds-muted);font-size:.8125rem">{{ $p->sousCategorie?->designation_fr ?? '—' }}</td>
                            <td><span class="gds-alert-badge {{ $badge }}">{{ $label }}</span></td>
                            <td>
                                <a href="{{ \App\Filament\Resources\ProductResource::getUrl('edit', ['record' => $p->id]) }}" class="gds-btn-link">Modifier</a>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>
    @endif

    {{-- ════ Main stock table ════ --}}
    <div class="gds-section">
        <div class="gds-section-head">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125v1.5m2.25-2.625c.621 0 1.125.504 1.125 1.125v1.5m-1.125 0c-.621 0-1.125.504-1.125 1.125" /></svg>
            Tableau de stock complet
            <span style="font-size:.8125rem;font-weight:400;margin-left:auto;color:var(--gds-muted)">Recherche, filtres, actions et exports par ligne ou en masse</span>
        </div>
        <div>
            {{ $this->table }}
        </div>
    </div>

</div>
</x-filament-panels::page>
