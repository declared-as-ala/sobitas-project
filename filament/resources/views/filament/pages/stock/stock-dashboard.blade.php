@php
    $metrics    = $this->getMetrics();
    $report     = $this->getReportData();
    $alerts     = $this->getAlertProducts();
    $movements  = $this->getRecentMovements();
    $kpis       = $report['kpis'];
    $valByCat   = $report['value_by_category'];
    $totalValue = $report['total_value'];
    $maxBar     = $valByCat ? max(array_map(fn ($r) => $r->value, $valByCat)) : 1;
    $total      = max(1, $metrics['total_products']);
    $pctStock   = round($metrics['in_stock'] / $total * 100);
    $pctLow     = round($metrics['low_stock']  / $total * 100);
    $pctRupture = round($metrics['out_of_stock'] / $total * 100);
    $nbPublished = \App\Models\Product::where('publier', 1)->count();
    $pctPublished = round($nbPublished / $total * 100);
@endphp

<x-filament-panels::page>
<style>
/* ── CSS Variables ── */
.st {
    --st-bg:#ffffff; --st-bg2:#f8fafc; --st-border:#e2e8f0; --st-text:#0f172a; --st-muted:#64748b;
    --st-r:14px; --st-sh:0 1px 3px rgba(0,0,0,.06);
    --ok:#16a34a; --ok-bg:#f0fdf4; --ok-b:#bbf7d0;
    --warn:#d97706; --warn-bg:#fffbeb; --warn-b:#fde68a;
    --danger:#dc2626; --danger-bg:#fef2f2; --danger-b:#fecaca;
    --info:#2563eb; --info-bg:#eff6ff; --info-b:#bfdbfe;
    --purple:#9333ea; --purple-bg:#faf5ff; --purple-b:#e9d5ff;
    --sky:#0ea5e9; --sky-bg:#f0f9ff; --sky-b:#bae6fd;
    color:var(--st-text);
}
.dark .st {
    --st-bg:#1e293b; --st-bg2:#0f172a; --st-border:#334155; --st-text:#f1f5f9; --st-muted:#94a3b8;
    --ok:#4ade80; --ok-bg:rgba(22,163,74,.15); --ok-b:rgba(74,222,128,.3);
    --warn:#fcd34d; --warn-bg:rgba(217,119,6,.2); --warn-b:rgba(252,211,77,.3);
    --danger:#f87171; --danger-bg:rgba(220,38,38,.18); --danger-b:rgba(248,113,113,.3);
    --info:#60a5fa; --info-bg:rgba(37,99,235,.18); --info-b:rgba(96,165,250,.3);
    --purple:#c084fc; --purple-bg:rgba(147,51,234,.18); --purple-b:rgba(192,132,252,.3);
    --sky:#38bdf8; --sky-bg:rgba(14,165,233,.15); --sky-b:rgba(56,189,248,.3);
}

/* ── Sub-navigation ── */
.st-nav {
    display:flex; align-items:center; gap:.25rem;
    padding:.3rem; background:var(--st-bg2); border:1px solid var(--st-border);
    border-radius:12px; margin-bottom:1.5rem; overflow-x:auto;
}
.st-nav-a {
    display:flex; align-items:center; gap:.375rem;
    padding:.4375rem 1rem; border-radius:9px;
    font-size:.8125rem; font-weight:500; color:var(--st-muted);
    text-decoration:none; white-space:nowrap; transition:all .15s;
}
.st-nav-a:hover { color:var(--st-text); background:var(--st-bg); }
.st-nav-a--on { background:#2563eb; color:#fff; font-weight:700; box-shadow:0 2px 8px rgba(37,99,235,.3); }
.st-nav-a svg { width:14px; height:14px; flex-shrink:0; }
.st-nav-badge {
    display:inline-flex; align-items:center;
    padding:.1rem .4rem; border-radius:999px;
    font-size:.6875rem; font-weight:700;
    background:var(--danger-bg); color:var(--danger);
}
.st-nav-a--on .st-nav-badge { background:rgba(255,255,255,.25); color:#fff; }

/* ── Export bar ── */
.st-ebar {
    display:flex; align-items:center; gap:.5rem;
    padding:.75rem 1.125rem; background:var(--st-bg);
    border:1px solid var(--st-border); border-radius:var(--st-r);
    margin-bottom:1.5rem; flex-wrap:wrap;
}
.st-ebar-lbl { font-size:.8125rem; font-weight:600; color:var(--st-muted); white-space:nowrap; margin-right:.25rem; }
.st-ebtn {
    display:inline-flex; align-items:center; gap:.375rem;
    padding:.375rem .875rem; border-radius:8px;
    font-size:.8125rem; font-weight:600; border:1.5px solid;
    text-decoration:none; transition:all .15s; cursor:pointer;
}
.st-ebtn svg { width:14px; height:14px; }
.st-ebtn--pdf   { background:var(--danger-bg); border-color:var(--danger-b); color:var(--danger); }
.st-ebtn--pdf:hover   { background:var(--danger); color:#fff; border-color:var(--danger); }
.st-ebtn--csv   { background:var(--ok-bg); border-color:var(--ok-b); color:var(--ok); }
.st-ebtn--csv:hover   { background:var(--ok); color:#fff; border-color:var(--ok); }
.st-ebtn--xl    { background:var(--ok-bg); border-color:var(--ok-b); color:#059669; }
.st-ebtn--xl:hover    { background:#059669; color:#fff; border-color:#059669; }
.st-ebar-sep { width:1px; height:20px; background:var(--st-border); }
.st-rbtn {
    margin-left:auto; display:inline-flex; align-items:center; gap:.375rem;
    padding:.375rem .875rem; border-radius:8px;
    font-size:.8125rem; font-weight:500; border:1.5px solid var(--st-border);
    background:var(--st-bg2); color:var(--st-muted); text-decoration:none;
    cursor:pointer; transition:all .15s;
}
.st-rbtn:hover { border-color:var(--info); color:var(--info); background:var(--info-bg); }
.st-rbtn svg { width:13px; height:13px; }

/* ── KPI Grid ── */
.st-kpis {
    display:grid; grid-template-columns:repeat(6,1fr); gap:.875rem; margin-bottom:1.5rem;
}
@media(max-width:1280px){ .st-kpis{grid-template-columns:repeat(3,1fr);} }
@media(max-width:720px) { .st-kpis{grid-template-columns:repeat(2,1fr);} }
@media(max-width:420px) { .st-kpis{grid-template-columns:1fr;} }

.st-kpi {
    background:var(--st-bg); border:1px solid var(--st-border);
    border-top:3px solid var(--_a,var(--st-border));
    border-radius:var(--st-r);
    padding:1.125rem 1.125rem .875rem;
    transition:box-shadow .2s, transform .18s;
    text-decoration:none; color:inherit;
    display:block;
}
.st-kpi:hover { box-shadow:0 6px 20px rgba(0,0,0,.1); transform:translateY(-2px); }
.dark .st-kpi:hover { box-shadow:0 6px 20px rgba(0,0,0,.4); }
.st-kpi-head { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:.75rem; }
.st-kpi-ico {
    width:36px; height:36px; border-radius:9px; display:flex;
    align-items:center; justify-content:center; background:var(--_ibg,var(--st-bg2));
    flex-shrink:0;
}
.st-kpi-ico svg { width:18px; height:18px; }
.st-kpi-pct {
    font-size:.75rem; font-weight:700; color:var(--st-muted);
    background:var(--st-bg2); padding:.15rem .45rem; border-radius:6px;
}
.st-kpi-num { font-size:2rem; font-weight:800; line-height:1; font-variant-numeric:tabular-nums; }
.st-kpi-num--sm { font-size:1.35rem; }
.st-kpi-lbl { font-size:.8125rem; font-weight:500; color:var(--st-muted); margin-top:.2rem; }
.st-kpi-bar { margin-top:.75rem; height:4px; background:var(--st-bg2); border-radius:4px; overflow:hidden; }
.st-kpi-bar-fill { height:100%; background:var(--_a,var(--st-muted)); border-radius:4px; min-width:2px; transition:width .6s ease; }

/* ── Alert Banner ── */
.st-banner {
    display:flex; align-items:center; gap:.875rem;
    padding:.875rem 1.25rem;
    background:var(--danger-bg); border:1px solid var(--danger-b);
    border-left:4px solid var(--danger);
    border-radius:var(--st-r); margin-bottom:1.5rem;
}
.st-banner-dot {
    width:10px; height:10px; border-radius:50%;
    background:var(--danger); flex-shrink:0;
    animation:bpulse 1.5s infinite;
}
@keyframes bpulse {
    0%,100% { box-shadow:0 0 0 0 rgba(220,38,38,.5); }
    50%      { box-shadow:0 0 0 7px rgba(220,38,38,0); }
}
.dark .st-banner-dot { animation-name:bpulse-d; }
@keyframes bpulse-d {
    0%,100% { box-shadow:0 0 0 0 rgba(248,113,113,.4); }
    50%      { box-shadow:0 0 0 7px rgba(248,113,113,0); }
}
.st-banner-body { flex:1; min-width:0; }
.st-banner-ttl { font-size:.9375rem; font-weight:700; color:var(--danger); margin:0; }
.st-banner-sub { font-size:.8125rem; color:var(--st-muted); margin:.1rem 0 0; }
.st-banner-cta {
    display:inline-flex; align-items:center; gap:.375rem;
    padding:.4375rem 1.125rem; background:var(--danger); color:#fff;
    border-radius:9px; font-size:.8125rem; font-weight:700;
    text-decoration:none; white-space:nowrap; transition:opacity .15s;
}
.st-banner-cta:hover { opacity:.88; }
.st-banner-cta svg { width:14px; height:14px; }

/* ── Charts Row ── */
.st-charts { display:grid; grid-template-columns:1fr 310px; gap:1rem; margin-bottom:1.5rem; }
@media(max-width:900px){ .st-charts{grid-template-columns:1fr;} }

/* ── Card ── */
.st-card { background:var(--st-bg); border:1px solid var(--st-border); border-radius:var(--st-r); overflow:hidden; }
.st-card-hd {
    display:flex; align-items:center; justify-content:space-between;
    padding:.875rem 1.125rem; border-bottom:1px solid var(--st-border);
}
.st-card-ttl {
    font-size:.9375rem; font-weight:700; color:var(--st-text);
    display:flex; align-items:center; gap:.5rem; margin:0;
}
.st-card-ttl svg { width:16px; height:16px; color:var(--st-muted); }
.st-card-bd { padding:1.125rem; }
.st-card-meta { font-size:.8125rem; color:var(--st-muted); }

/* ── Bar chart ── */
.st-bar-item { margin-bottom:.5rem; }
.st-bar-item:last-child { margin-bottom:0; }
.st-bar-row { display:flex; align-items:center; gap:.625rem; }
.st-bar-rank { flex:0 0 18px; font-size:.75rem; font-weight:700; color:var(--st-muted); text-align:right; }
.st-bar-lbl { flex:0 0 115px; font-size:.8rem; color:var(--st-text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.st-bar-track { flex:1; height:22px; background:var(--st-bg2); border-radius:6px; overflow:hidden; }
.st-bar-fill {
    height:100%; border-radius:6px; min-width:4px;
    display:flex; align-items:center; padding-left:6px;
    transition:width .5s ease;
}
.st-bar-fill-lbl { font-size:.7rem; font-weight:600; color:rgba(255,255,255,.9); white-space:nowrap; overflow:hidden; }
.st-bar-val { flex:0 0 88px; font-size:.8rem; font-weight:600; text-align:right; color:var(--st-muted); white-space:nowrap; }
.bc0{background:#3b82f6}.bc1{background:#10b981}.bc2{background:#f59e0b}.bc3{background:#ef4444}
.bc4{background:#8b5cf6}.bc5{background:#ec4899}.bc6{background:#0ea5e9}.bc7{background:#14b8a6}
.bc8{background:#f97316}.bc9{background:#6b7280}

/* ── Summary panel ── */
.st-sum-total {
    background:linear-gradient(135deg,#1e3a5f,#2563eb);
    border-radius:10px; padding:1.125rem; margin-bottom:1rem; color:#fff;
}
.st-sum-total-lbl { font-size:.8125rem; font-weight:500; opacity:.8; margin:0; }
.st-sum-total-val { font-size:1.6rem; font-weight:800; margin:.25rem 0 0; letter-spacing:-.02em; line-height:1; }
.st-sum-total-sub { font-size:.75rem; opacity:.65; margin:.25rem 0 0; }
.st-sum-row { display:flex; align-items:center; justify-content:space-between; padding:.5625rem 0; border-bottom:1px solid var(--st-border); }
.st-sum-row:last-child { border-bottom:none; }
.st-sum-row-l { display:flex; align-items:center; gap:.5rem; }
.st-sum-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.st-sum-name { font-size:.875rem; color:var(--st-muted); }
.st-sum-val { font-size:.9375rem; font-weight:700; }
.st-view-all { display:inline-flex; align-items:center; gap:.375rem; font-size:.8125rem; font-weight:600; color:var(--info); text-decoration:none; }
.st-view-all:hover { text-decoration:underline; }
.st-view-all svg { width:14px; height:14px; }

/* ── Tables ── */
.st-twrap { overflow-x:auto; }
.st-t { width:100%; border-collapse:collapse; font-size:.875rem; }
.st-t th {
    padding:.5625rem .875rem; background:var(--st-bg2);
    color:var(--st-muted); font-weight:600; font-size:.6875rem;
    text-transform:uppercase; letter-spacing:.05em;
    border-bottom:1px solid var(--st-border); text-align:left; white-space:nowrap;
}
.st-t th.ar { text-align:right; }
.st-t td { padding:.5625rem .875rem; border-bottom:1px solid var(--st-border); vertical-align:middle; }
.st-t td.ar { text-align:right; }
.st-t tbody tr:last-child td { border-bottom:none; }
.st-t tbody tr:hover { background:var(--st-bg2); }

/* Badges */
.st-bdg {
    display:inline-flex; align-items:center; gap:.25rem;
    padding:.2rem .625rem; border-radius:999px;
    font-size:.75rem; font-weight:600; border:1px solid;
}
.st-bdg svg { width:11px; height:11px; }
.st-bdg--rupture  { background:var(--danger-bg); color:var(--danger); border-color:var(--danger-b); }
.st-bdg--low      { background:var(--warn-bg);   color:var(--warn);   border-color:var(--warn-b); }
.st-bdg--ok       { background:var(--ok-bg);     color:var(--ok);     border-color:var(--ok-b); }
.st-bdg--inco     { background:var(--purple-bg);  color:var(--purple);  border-color:var(--purple-b); }
.st-bdg--entry    { background:var(--ok-bg);     color:var(--ok);     border-color:var(--ok-b); }
.st-bdg--exit     { background:var(--danger-bg); color:var(--danger); border-color:var(--danger-b); }
.st-bdg--adj      { background:var(--warn-bg);   color:var(--warn);   border-color:var(--warn-b); }
.st-bdg--sale     { background:var(--info-bg);   color:var(--info);   border-color:var(--info-b); }
.st-bdg--neu      { background:var(--st-bg2);    color:var(--st-muted); border-color:var(--st-border); }

/* Qty badge */
.st-qty {
    display:inline-flex; align-items:center; justify-content:center;
    min-width:38px; padding:.2rem .5rem; border-radius:7px;
    font-size:.875rem; font-weight:800; font-variant-numeric:tabular-nums;
}
.st-qty--zero { background:var(--danger-bg); color:var(--danger); }
.st-qty--low  { background:var(--warn-bg);   color:var(--warn); }
.st-qty--ok   { background:var(--ok-bg);     color:var(--ok); }

/* Action link */
.st-alink {
    display:inline-flex; align-items:center; gap:.25rem;
    padding:.3rem .65rem; border-radius:7px;
    font-size:.75rem; font-weight:600; color:var(--info);
    background:var(--info-bg); border:1px solid var(--info-b);
    text-decoration:none; transition:all .15s;
}
.st-alink:hover { background:var(--info); color:#fff; border-color:var(--info); }
.st-alink svg { width:12px; height:12px; }

/* Qty change */
.qty-pos { color:var(--ok); font-weight:700; }
.qty-neg { color:var(--danger); font-weight:700; }

/* Section wrap */
.st-section { margin-bottom:1.5rem; }

/* Main table card */
.st-main-card { background:var(--st-bg); border:1px solid var(--st-border); border-radius:var(--st-r); overflow:hidden; margin-bottom:1.5rem; }
.st-main-hd {
    display:flex; align-items:center; justify-content:space-between;
    padding:1rem 1.25rem; border-bottom:1px solid var(--st-border); flex-wrap:wrap; gap:.75rem;
}
.st-main-ttl { font-size:1rem; font-weight:700; color:var(--st-text); display:flex; align-items:center; gap:.5rem; margin:0; }
.st-main-ttl svg { width:18px; height:18px; color:var(--st-muted); }

@media(max-width:640px){
    .st-banner { flex-direction:column; align-items:flex-start; }
    .st-banner-cta { width:100%; justify-content:center; }
}
</style>

<div class="st">

    {{-- ══ Sub Navigation ══ --}}
    <div class="st-nav">
        <a href="{{ \App\Filament\Pages\Stock\StockDashboard::getUrl() }}" class="st-nav-a st-nav-a--on">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" /></svg>
            Dashboard
        </a>
        <a href="{{ \App\Filament\Resources\ProductResource::getUrl('index') }}" class="st-nav-a">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>
            Tous les produits
        </a>
        <a href="#st-alerts" class="st-nav-a">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            Alertes
            @if($metrics['out_of_stock'] + $metrics['low_stock'] > 0)
                <span class="st-nav-badge">{{ $metrics['out_of_stock'] + $metrics['low_stock'] }}</span>
            @endif
        </a>
        <a href="#st-reports" class="st-nav-a">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>
            Rapports
        </a>
    </div>

    {{-- ══ Export / Refresh Bar ══ --}}
    <div class="st-ebar">
        <span class="st-ebar-lbl">Exporter :</span>
        <a href="{{ route('stock.reports.export.pdf') }}" target="_blank" class="st-ebtn st-ebtn--pdf">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
            PDF
        </a>
        <a href="{{ route('stock.reports.export.csv') }}" target="_blank" class="st-ebtn st-ebtn--csv">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25" /></svg>
            CSV
        </a>
        <a href="{{ route('stock.reports.export.excel') }}" target="_blank" class="st-ebtn st-ebtn--xl">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" /></svg>
            Excel
        </a>
        <span class="st-ebar-sep"></span>
        <button type="button" wire:click="refreshData" class="st-rbtn">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
                wire:loading.class="animate-spin" wire:target="refreshData">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span wire:loading.remove wire:target="refreshData">Actualiser</span>
            <span wire:loading wire:target="refreshData" style="display:none">…</span>
        </button>
    </div>

    {{-- ══ KPI Cards ══ --}}
    <div class="st-kpis">

        {{-- Total produits --}}
        <div class="st-kpi" style="--_a:#6b7280;--_ibg:#f1f5f9;">
            <div class="st-kpi-head">
                <div class="st-kpi-ico">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="#6b7280"><path stroke-linecap="round" stroke-linejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>
                </div>
            </div>
            <div class="st-kpi-num">{{ number_format($metrics['total_products']) }}</div>
            <div class="st-kpi-lbl">Total produits</div>
            <div class="st-kpi-bar"><div class="st-kpi-bar-fill" style="width:100%"></div></div>
        </div>

        {{-- En stock --}}
        <a href="{{ \App\Filament\Resources\ProductResource::getUrl('index') }}" class="st-kpi" style="--_a:#16a34a;--_ibg:#f0fdf4;">
            <div class="st-kpi-head">
                <div class="st-kpi-ico">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="#16a34a"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <span class="st-kpi-pct">{{ $pctStock }}%</span>
            </div>
            <div class="st-kpi-num" style="color:#16a34a">{{ number_format($metrics['in_stock']) }}</div>
            <div class="st-kpi-lbl">En stock</div>
            <div class="st-kpi-bar"><div class="st-kpi-bar-fill" style="width:{{ $pctStock }}%;background:#16a34a"></div></div>
        </a>

        {{-- Stock faible --}}
        <a href="#st-alerts" class="st-kpi" style="--_a:#d97706;--_ibg:#fffbeb;">
            <div class="st-kpi-head">
                <div class="st-kpi-ico">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="#d97706"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                </div>
                <span class="st-kpi-pct">{{ $pctLow }}%</span>
            </div>
            <div class="st-kpi-num" style="color:#d97706">{{ number_format($metrics['low_stock']) }}</div>
            <div class="st-kpi-lbl">Stock faible</div>
            <div class="st-kpi-bar"><div class="st-kpi-bar-fill" style="width:{{ $pctLow }}%;background:#d97706"></div></div>
        </a>

        {{-- Rupture --}}
        <a href="#st-alerts" class="st-kpi" style="--_a:#dc2626;--_ibg:#fef2f2;">
            <div class="st-kpi-head">
                <div class="st-kpi-ico">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="#dc2626"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                </div>
                <span class="st-kpi-pct">{{ $pctRupture }}%</span>
            </div>
            <div class="st-kpi-num" style="color:#dc2626">{{ number_format($metrics['out_of_stock']) }}</div>
            <div class="st-kpi-lbl">Rupture de stock</div>
            <div class="st-kpi-bar"><div class="st-kpi-bar-fill" style="width:{{ $pctRupture }}%;background:#dc2626"></div></div>
        </a>

        {{-- Valeur du stock --}}
        <div class="st-kpi" style="--_a:#2563eb;--_ibg:#eff6ff;">
            <div class="st-kpi-head">
                <div class="st-kpi-ico">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="#2563eb"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
            </div>
            <div class="st-kpi-num st-kpi-num--sm" style="color:#2563eb">{{ number_format($metrics['total_stock_value'], 0, ',', ' ') }}</div>
            <div class="st-kpi-lbl">Valeur stock HT (DT)</div>
            <div class="st-kpi-bar"><div class="st-kpi-bar-fill" style="width:100%;background:#2563eb"></div></div>
        </div>

        {{-- Publiés / Incohérences --}}
        @if($metrics['inconsistent'] > 0)
        <a href="#st-alerts" class="st-kpi" style="--_a:#9333ea;--_ibg:#faf5ff;">
            <div class="st-kpi-head">
                <div class="st-kpi-ico">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="#9333ea"><path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>
                </div>
            </div>
            <div class="st-kpi-num" style="color:#9333ea">{{ number_format($metrics['inconsistent']) }}</div>
            <div class="st-kpi-lbl">Incohérences</div>
            <div class="st-kpi-bar"><div class="st-kpi-bar-fill" style="width:100%;background:#9333ea"></div></div>
        </a>
        @else
        <div class="st-kpi" style="--_a:#0ea5e9;--_ibg:#f0f9ff;">
            <div class="st-kpi-head">
                <div class="st-kpi-ico">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="#0ea5e9"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <span class="st-kpi-pct">{{ $pctPublished }}%</span>
            </div>
            <div class="st-kpi-num" style="color:#0ea5e9">{{ number_format($nbPublished) }}</div>
            <div class="st-kpi-lbl">Produits publiés</div>
            <div class="st-kpi-bar"><div class="st-kpi-bar-fill" style="width:{{ $pctPublished }}%;background:#0ea5e9"></div></div>
        </div>
        @endif

    </div>

    {{-- ══ Rupture Alert Banner ══ --}}
    @if($metrics['out_of_stock'] > 0)
    <div class="st-banner">
        <span class="st-banner-dot"></span>
        <div class="st-banner-body">
            <p class="st-banner-ttl">
                {{ $metrics['out_of_stock'] }} produit{{ $metrics['out_of_stock'] > 1 ? 's' : '' }} en rupture de stock
            </p>
            <p class="st-banner-sub">Ces produits sont indisponibles à la vente. Réapprovisionnez-les dès que possible.</p>
        </div>
        <a href="#st-alerts" class="st-banner-cta">
            Voir les alertes
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
        </a>
    </div>
    @elseif($metrics['low_stock'] > 0)
    <div class="st-banner" style="background:var(--warn-bg);border-color:var(--warn-b);border-left-color:var(--warn);">
        <span class="st-banner-dot" style="background:var(--warn);animation-name:none;"></span>
        <div class="st-banner-body">
            <p class="st-banner-ttl" style="color:var(--warn)">{{ $metrics['low_stock'] }} produit{{ $metrics['low_stock'] > 1 ? 's' : '' }} en stock faible</p>
            <p class="st-banner-sub">Ces produits approchent du seuil d'alerte. Anticipez le réapprovisionnement.</p>
        </div>
        <a href="#st-alerts" class="st-banner-cta" style="background:var(--warn)">
            Voir les alertes
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
        </a>
    </div>
    @endif

    {{-- ══ Charts Row ══ --}}
    <div class="st-charts st-section">

        {{-- Bar: Value by category --}}
        <div class="st-card">
            <div class="st-card-hd">
                <h3 class="st-card-ttl">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                    Valeur du stock par catégorie (Top 10)
                </h3>
                <span class="st-card-meta">HT en DT</span>
            </div>
            <div class="st-card-bd">
                @forelse($valByCat as $i => $row)
                    @php $pct = $maxBar > 0 ? round(($row->value / $maxBar) * 100, 1) : 0; @endphp
                    <div class="st-bar-item">
                        <div class="st-bar-row">
                            <span class="st-bar-rank">{{ $i + 1 }}</span>
                            <span class="st-bar-lbl" title="{{ $row->name }}">{{ $row->name }}</span>
                            <div class="st-bar-track">
                                <div class="st-bar-fill bc{{ $i % 10 }}" style="width:{{ $pct }}%">
                                    @if($pct > 22)<span class="st-bar-fill-lbl">{{ number_format($row->value, 0, ',', ' ') }} DT</span>@endif
                                </div>
                            </div>
                            <span class="st-bar-val">{{ number_format($row->value, 0, ',', ' ') }} DT</span>
                        </div>
                    </div>
                @empty
                    <p style="color:var(--st-muted);font-size:.875rem;text-align:center;padding:1.5rem 0">Aucune donnée disponible</p>
                @endforelse
            </div>
        </div>

        {{-- Summary panel --}}
        <div class="st-card">
            <div class="st-card-hd">
                <h3 class="st-card-ttl">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>
                    Résumé
                </h3>
            </div>
            <div class="st-card-bd">
                <div class="st-sum-total">
                    <p class="st-sum-total-lbl">Valeur totale du stock HT</p>
                    <p class="st-sum-total-val">{{ number_format($totalValue, 2, ',', ' ') }} DT</p>
                    <p class="st-sum-total-sub">Mis à jour {{ now()->format('d/m/Y à H:i') }}</p>
                </div>
                <div class="st-sum-row">
                    <div class="st-sum-row-l"><span class="st-sum-dot" style="background:#16a34a"></span><span class="st-sum-name">En stock</span></div>
                    <span class="st-sum-val" style="color:#16a34a">{{ number_format($kpis['in_stock']) }}</span>
                </div>
                <div class="st-sum-row">
                    <div class="st-sum-row-l"><span class="st-sum-dot" style="background:#d97706"></span><span class="st-sum-name">Stock faible</span></div>
                    <span class="st-sum-val" style="color:#d97706">{{ number_format($kpis['low_stock']) }}</span>
                </div>
                <div class="st-sum-row">
                    <div class="st-sum-row-l"><span class="st-sum-dot" style="background:#dc2626"></span><span class="st-sum-name">Rupture</span></div>
                    <span class="st-sum-val" style="color:#dc2626">{{ number_format($kpis['rupture']) }}</span>
                </div>
                @if($metrics['inconsistent'] > 0)
                <div class="st-sum-row">
                    <div class="st-sum-row-l"><span class="st-sum-dot" style="background:#9333ea"></span><span class="st-sum-name">Incohérences</span></div>
                    <span class="st-sum-val" style="color:#9333ea">{{ number_format($metrics['inconsistent']) }}</span>
                </div>
                @endif
                <div class="st-sum-row" style="padding-top:.75rem">
                    <a href="{{ route('stock.reports.export.pdf') }}" target="_blank" class="st-view-all">
                        Rapport complet
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                    </a>
                </div>
            </div>
        </div>

    </div>

    {{-- ══ Critical Products Table ══ --}}
    @if($alerts->isNotEmpty())
    <div class="st-section" id="st-alerts">
        <div class="st-card">
            <div class="st-card-hd">
                <h3 class="st-card-ttl" style="color:var(--danger)">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.75a6 6 0 00-12 0v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.715 0" /></svg>
                    Produits critiques
                    <span style="font-size:.75rem;font-weight:400;color:var(--st-muted);margin-left:.375rem">{{ $alerts->count() }} à traiter</span>
                </h3>
                <a href="{{ \App\Filament\Resources\ProductResource::getUrl('index') }}" class="st-view-all">
                    Tout voir
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                </a>
            </div>
            <div class="st-twrap">
                <table class="st-t">
                    <thead>
                        <tr>
                            <th>Produit</th>
                            <th class="ar">Qté</th>
                            <th class="ar">Seuil</th>
                            <th>Catégorie</th>
                            <th>État</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($alerts as $p)
                            @php
                                $qte = (int) $p->qte;
                                $threshold = (int) ($p->low_stock_threshold ?: 10);
                                if ((bool)$p->rupture && $qte > 0) {
                                    $bc = 'st-bdg--inco'; $bl = 'Incohérence';
                                } elseif ($qte <= 0) {
                                    $bc = 'st-bdg--rupture'; $bl = 'Rupture';
                                } else {
                                    $bc = 'st-bdg--low'; $bl = 'Stock faible';
                                }
                                $qc = $qte <= 0 ? 'st-qty--zero' : ($qte < $threshold ? 'st-qty--low' : 'st-qty--ok');
                            @endphp
                            <tr>
                                <td style="font-weight:600">{{ \Illuminate\Support\Str::limit($p->designation_fr, 50) }}</td>
                                <td class="ar"><span class="st-qty {{ $qc }}">{{ $qte }}</span></td>
                                <td class="ar" style="color:var(--st-muted);font-size:.8125rem">{{ $threshold }}</td>
                                <td style="color:var(--st-muted);font-size:.8125rem">{{ $p->sousCategorie?->designation_fr ?? '—' }}</td>
                                <td><span class="st-bdg {{ $bc }}">{{ $bl }}</span></td>
                                <td>
                                    <a href="{{ \App\Filament\Resources\ProductResource::getUrl('edit', ['record' => $p->id]) }}" class="st-alink">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                                        Modifier
                                    </a>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    @endif

    {{-- ══ Recent Stock Movements ══ --}}
    @if($movements->isNotEmpty())
    <div class="st-section">
        <div class="st-card">
            <div class="st-card-hd">
                <h3 class="st-card-ttl">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" /></svg>
                    Derniers mouvements de stock
                </h3>
                <span class="st-card-meta">10 derniers enregistrements</span>
            </div>
            <div class="st-twrap">
                <table class="st-t">
                    <thead>
                        <tr>
                            <th>Produit</th>
                            <th>Type</th>
                            <th class="ar">Avant</th>
                            <th class="ar">Variation</th>
                            <th class="ar">Après</th>
                            <th>Raison</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($movements as $m)
                            @php
                                $typeMap = [
                                    'entry'        => ['st-bdg--entry', 'Entrée'],
                                    'exit'         => ['st-bdg--exit',  'Sortie'],
                                    'adjustment'   => ['st-bdg--adj',   'Ajustement'],
                                    'sale'         => ['st-bdg--sale',  'Vente'],
                                    'return'       => ['st-bdg--ok',    'Retour'],
                                    'reservation'  => ['st-bdg--neu',   'Réservation'],
                                    'release'      => ['st-bdg--neu',   'Libération'],
                                    'cancellation' => ['st-bdg--neu',   'Annulation'],
                                ];
                                [$tc, $tl] = $typeMap[$m->movement_type] ?? ['st-bdg--neu', $m->movement_type];
                                $reasonMap = [
                                    'manual_correction' => 'Correction',
                                    'purchase'          => 'Achat',
                                    'damaged'           => 'Endommagé',
                                    'expired'           => 'Expiré',
                                    'inventory_count'   => 'Inventaire',
                                    'order_shipped'     => 'Expédition',
                                    'order_canceled'    => 'Annulation',
                                    'return'            => 'Retour',
                                    'admin_manual'      => 'Admin',
                                ];
                                $qtyChange = (int) $m->qty_change;
                            @endphp
                            <tr>
                                <td style="font-weight:600">{{ \Illuminate\Support\Str::limit($m->product?->designation_fr ?? '—', 40) }}</td>
                                <td><span class="st-bdg {{ $tc }}">{{ $tl }}</span></td>
                                <td class="ar" style="color:var(--st-muted);font-size:.8125rem">{{ number_format((int)$m->qty_before) }}</td>
                                <td class="ar"><span class="{{ $qtyChange >= 0 ? 'qty-pos' : 'qty-neg' }}">{{ $qtyChange >= 0 ? '+' : '' }}{{ number_format($qtyChange) }}</span></td>
                                <td class="ar" style="font-weight:700">{{ number_format((int)$m->qty_after) }}</td>
                                <td style="font-size:.8125rem;color:var(--st-muted)">{{ $reasonMap[$m->reason] ?? ($m->reason ?? '—') }}</td>
                                <td style="font-size:.8125rem;color:var(--st-muted);white-space:nowrap">{{ \Carbon\Carbon::parse($m->created_at)->format('d/m H:i') }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    @endif

    {{-- ══ Main Filament Table ══ --}}
    <div class="st-main-card">
        <div class="st-main-hd">
            <h3 class="st-main-ttl">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25" /></svg>
                Tableau complet du stock
            </h3>
            <span class="st-card-meta">Recherche · Filtres · Actions par ligne · Exports en masse</span>
        </div>
        <div>{{ $this->table }}</div>
    </div>

</div>
</x-filament-panels::page>
