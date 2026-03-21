<x-filament-panels::page>
@php
    $metrics = $this->getMetrics();
    $tabs = [
        'all'          => ['label' => 'Tous les produits', 'count' => $metrics['total_products'], 'color' => 'gray'],
        'in_stock'     => ['label' => 'En stock',          'count' => $metrics['in_stock'],        'color' => 'green'],
        'rupture'      => ['label' => 'Rupture',           'count' => $metrics['out_of_stock'],    'color' => 'red'],
        'low_stock'    => ['label' => 'Stock faible',      'count' => $metrics['low_stock'],       'color' => 'amber'],
        'inconsistent' => ['label' => 'Incohérences',      'count' => $metrics['inconsistent'],    'color' => 'purple'],
    ];
    $activeTab = $this->activeTab;
@endphp

<style>
.sk-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
}
.sk-kpi {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: 0 1px 3px rgba(0,0,0,.05);
}
.dark .sk-kpi { background: #1f2937; border-color: #374151; }
.sk-kpi-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; }
.dark .sk-kpi-label { color: #9ca3af; }
.sk-kpi-value { font-size: 26px; font-weight: 800; color: #111827; line-height: 1.1; }
.dark .sk-kpi-value { color: #f9fafb; }
.sk-kpi-value.green  { color: #16a34a; }
.sk-kpi-value.red    { color: #dc2626; }
.sk-kpi-value.amber  { color: #d97706; }
.sk-kpi-value.purple { color: #9333ea; }
.sk-kpi-value.blue   { color: #2563eb; font-size: 18px; }

.sk-tabs-wrap {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 12px 16px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    box-shadow: 0 1px 3px rgba(0,0,0,.05);
}
.dark .sk-tabs-wrap { background: #1f2937; border-color: #374151; }

.sk-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.sk-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    border: 1.5px solid transparent;
    cursor: pointer;
    background: none;
    color: #6b7280;
    transition: all .15s;
    white-space: nowrap;
}
.dark .sk-tab { color: #9ca3af; }
.sk-tab:hover { background: #f3f4f6; color: #111827; }
.dark .sk-tab:hover { background: #374151; color: #f9fafb; }
.sk-tab.active {
    background: #fff7ed;
    border-color: #ff4a00;
    color: #ff4a00;
    font-weight: 700;
}
.dark .sk-tab.active { background: rgba(255,74,0,.15); border-color: #ff4a00; color: #ff6b3d; }
.sk-tab-badge {
    display: inline-block;
    padding: 1px 7px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    background: #f3f4f6;
    color: #374151;
}
.dark .sk-tab-badge { background: #374151; color: #d1d5db; }
.sk-tab.active .sk-tab-badge { background: #ff4a00; color: #fff; }

.sk-exports { display: flex; align-items: center; gap: 8px; }
.sk-export-label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing:.05em; }
.dark .sk-export-label { color: #9ca3af; }
.sk-btn-export {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 600;
    border: 1.5px solid #e5e7eb;
    background: #fff;
    color: #374151;
    cursor: pointer;
    text-decoration: none;
    transition: all .15s;
    white-space: nowrap;
}
.dark .sk-btn-export { background: #374151; border-color: #4b5563; color: #d1d5db; }
.sk-btn-export:hover { background: #f3f4f6; border-color: #d1d5db; }
.sk-btn-export.pdf { border-color: #fca5a5; color: #dc2626; }
.dark .sk-btn-export.pdf { border-color: #7f1d1d; color: #f87171; }
.sk-btn-export.pdf:hover { background: #fef2f2; }
.sk-btn-export.csv { border-color: #86efac; color: #16a34a; }
.dark .sk-btn-export.csv { border-color: #14532d; color: #4ade80; }
.sk-btn-export.csv:hover { background: #f0fdf4; }
</style>

{{-- KPI Cards --}}
<div class="sk-kpi-grid">
    <div class="sk-kpi">
        <div class="sk-kpi-label">Total produits</div>
        <div class="sk-kpi-value">{{ number_format($metrics['total_products']) }}</div>
    </div>
    <div class="sk-kpi">
        <div class="sk-kpi-label">En stock</div>
        <div class="sk-kpi-value green">{{ number_format($metrics['in_stock']) }}</div>
    </div>
    <div class="sk-kpi">
        <div class="sk-kpi-label">Rupture</div>
        <div class="sk-kpi-value red">{{ number_format($metrics['out_of_stock']) }}</div>
    </div>
    <div class="sk-kpi">
        <div class="sk-kpi-label">Stock faible</div>
        <div class="sk-kpi-value amber">{{ number_format($metrics['low_stock']) }}</div>
    </div>
    <div class="sk-kpi">
        <div class="sk-kpi-label">Incohérences</div>
        <div class="sk-kpi-value purple">{{ number_format($metrics['inconsistent']) }}</div>
    </div>
    <div class="sk-kpi">
        <div class="sk-kpi-label">Valeur stock HT</div>
        <div class="sk-kpi-value blue">{{ number_format($metrics['total_stock_value'], 0, ',', ' ') }} DT</div>
    </div>
</div>

{{-- Tabs + Export bar --}}
<div class="sk-tabs-wrap">
    <div class="sk-tabs">
        @foreach($tabs as $key => $tab)
            <button
                type="button"
                wire:click="setTab('{{ $key }}')"
                class="sk-tab {{ $activeTab === $key ? 'active' : '' }}"
            >
                {{ $tab['label'] }}
                <span class="sk-tab-badge">{{ $tab['count'] }}</span>
            </button>
        @endforeach
    </div>

    <div class="sk-exports">
        <span class="sk-export-label">Exporter :</span>
        <a href="{{ $this->exportUrl('pdf') }}" target="_blank" class="sk-btn-export pdf">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:14px;height:14px;"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
            PDF
        </a>
        <a href="{{ $this->exportUrl('csv') }}" target="_blank" class="sk-btn-export csv">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:14px;height:14px;"><path stroke-linecap="round" stroke-linejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75.125V5.625A2.25 2.25 0 014.5 3.375h8.25M3.375 19.5V18.375M6 18.375V6.75m0 11.625h13.5M6 6.75h12a1.5 1.5 0 011.5 1.5v10.125" /></svg>
            CSV
        </a>
    </div>
</div>

{{-- Filament product table --}}
{{ $this->table }}

</x-filament-panels::page>
