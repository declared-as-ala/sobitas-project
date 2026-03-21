<x-filament-widgets::widget>
<style>
/* ── Top Régions & Clients Widget ───────────────────────────── */
.tr-wrap {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
}
@media (max-width: 900px) { .tr-wrap { grid-template-columns: 1fr; } }

.tr-panel {
    background: #fff;
    border: 1px solid rgba(0,0,0,.055);
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,.05), 0 6px 20px rgba(0,0,0,.04);
}
.dark .tr-panel {
    background: #1e2433;
    border-color: rgba(255,255,255,.07);
}

/* Panel header */
.tr-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.1rem 1.25rem .85rem;
    border-bottom: 1px solid rgba(0,0,0,.055);
}
.dark .tr-panel-header { border-color: rgba(255,255,255,.07); }

.tr-panel-title {
    display: flex;
    align-items: center;
    gap: .55rem;
    font-size: .9rem;
    font-weight: 700;
    color: #111827;
    letter-spacing: -.01em;
}
.dark .tr-panel-title { color: #f3f4f6; }

.tr-panel-icon {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.tr-panel-icon.indigo  { background: rgba(99,102,241,.12); color: #4f46e5; }
.tr-panel-icon.emerald { background: rgba(16,185,129,.12); color: #059669; }

.tr-badge {
    font-size: .7rem;
    font-weight: 600;
    padding: .18rem .6rem;
    border-radius: 999px;
    background: #f3f4f6;
    color: #6b7280;
}
.dark .tr-badge { background: rgba(255,255,255,.08); color: #9ca3af; }

/* Rows */
.tr-list { padding: .4rem 0; }

.tr-row {
    display: flex;
    align-items: center;
    gap: .85rem;
    padding: .7rem 1.25rem;
    transition: background .15s ease;
    cursor: default;
}
.tr-row:hover { background: rgba(99,102,241,.04); }
.dark .tr-row:hover { background: rgba(255,255,255,.04); }

/* ── Rank badge ── */
.tr-rank {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: .65rem;
    font-weight: 800;
    flex-shrink: 0;
    letter-spacing: 0;
}
.tr-rank.r1 { background: linear-gradient(135deg,#f59e0b,#fbbf24); color: #fff; }
.tr-rank.r2 { background: linear-gradient(135deg,#9ca3af,#d1d5db); color: #fff; }
.tr-rank.r3 { background: linear-gradient(135deg,#cd7c2f,#e8a96a); color: #fff; }
.tr-rank.rn { background: #f3f4f6; color: #9ca3af; }
.dark .tr-rank.rn { background: rgba(255,255,255,.08); color: #6b7280; }

/* ── Region info ── */
.tr-region-info { flex: 1; min-width: 0; }

.tr-region-name {
    font-size: .84rem;
    font-weight: 600;
    color: #1f2937;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: .3rem;
}
.dark .tr-region-name { color: #e5e7eb; }

.tr-bar-wrap {
    height: 5px;
    border-radius: 999px;
    background: #f3f4f6;
    overflow: hidden;
}
.dark .tr-bar-wrap { background: rgba(255,255,255,.08); }

.tr-bar-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #6366f1, #818cf8);
    transition: width .6s ease;
}

/* ── Region stats ── */
.tr-region-stats {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: .15rem;
    flex-shrink: 0;
    text-align: right;
}
.tr-stat-main {
    font-size: .82rem;
    font-weight: 700;
    color: #111827;
    white-space: nowrap;
}
.dark .tr-stat-main { color: #f3f4f6; }
.tr-stat-sub {
    font-size: .72rem;
    color: #9ca3af;
    white-space: nowrap;
}

/* ── Client avatar ── */
.tr-avatar {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: .75rem;
    font-weight: 800;
    flex-shrink: 0;
    letter-spacing: .02em;
}

/* Cycle through palette per index */
.av-0 { background: rgba(99,102,241,.14); color: #4f46e5; }
.av-1 { background: rgba(16,185,129,.14); color: #059669; }
.av-2 { background: rgba(245,158,11,.14); color: #d97706; }
.av-3 { background: rgba(239,68,68,.14);  color: #dc2626; }
.av-4 { background: rgba(59,130,246,.14); color: #2563eb; }
.av-5 { background: rgba(168,85,247,.14); color: #7c3aed; }
.av-6 { background: rgba(20,184,166,.14); color: #0d9488; }
.av-7 { background: rgba(249,115,22,.14); color: #ea580c; }

/* ── Client info ── */
.tr-client-info { flex: 1; min-width: 0; }

.tr-client-name {
    font-size: .84rem;
    font-weight: 600;
    color: #1f2937;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.dark .tr-client-name { color: #e5e7eb; }

.tr-client-meta {
    display: flex;
    align-items: center;
    gap: .4rem;
    margin-top: .15rem;
}
.tr-client-region {
    font-size: .7rem;
    color: #9ca3af;
    display: flex;
    align-items: center;
    gap: .2rem;
}
.tr-client-orders {
    font-size: .68rem;
    font-weight: 600;
    padding: .1rem .45rem;
    border-radius: 999px;
    background: rgba(99,102,241,.1);
    color: #4f46e5;
}
.dark .tr-client-orders { background: rgba(99,102,241,.2); }

/* ── Client right ── */
.tr-client-right { flex-shrink: 0; text-align: right; }
.tr-client-ttc {
    font-size: .84rem;
    font-weight: 700;
    color: #111827;
    white-space: nowrap;
}
.dark .tr-client-ttc { color: #f3f4f6; }
.tr-client-last {
    font-size: .7rem;
    color: #9ca3af;
    margin-top: .15rem;
}

/* Empty state */
.tr-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2.5rem 1rem;
    color: #d1d5db;
    gap: .5rem;
    font-size: .82rem;
}
.dark .tr-empty { color: #4b5563; }
</style>

@php
    $regions = $this->getTopRegions();
    $clients = $this->getTopClients();
    $label   = $this->getPeriodLabel();
@endphp

<div class="tr-wrap">

    {{-- ── Left panel : Top Régions ─────────────────────────── --}}
    <div class="tr-panel">
        <div class="tr-panel-header">
            <div class="tr-panel-title">
                <div class="tr-panel-icon indigo">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                         stroke-width="2" stroke="currentColor" width="17" height="17">
                        <path stroke-linecap="round" stroke-linejoin="round"
                              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                        <path stroke-linecap="round" stroke-linejoin="round"
                              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/>
                    </svg>
                </div>
                Top Régions
            </div>
            <span class="tr-badge">{{ $label }}</span>
        </div>

        <div class="tr-list">
            @forelse ($regions as $i => $r)
                <div class="tr-row">
                    <div class="tr-rank {{ match($i) { 0 => 'r1', 1 => 'r2', 2 => 'r3', default => 'rn' } }}">
                        {{ $i + 1 }}
                    </div>

                    <div class="tr-region-info">
                        <div class="tr-region-name">{{ $r['region'] }}</div>
                        <div class="tr-bar-wrap">
                            <div class="tr-bar-fill" style="width: {{ $r['pct'] }}%"></div>
                        </div>
                    </div>

                    <div class="tr-region-stats">
                        <span class="tr-stat-main">{{ number_format($r['total_ht'], 3, ',', ' ') }} DT</span>
                        <span class="tr-stat-sub">
                            {{ $r['total_commandes'] }} cmd
                            · {{ $r['total_clients'] }} client{{ $r['total_clients'] > 1 ? 's' : '' }}
                        </span>
                    </div>
                </div>
            @empty
                <div class="tr-empty">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                         stroke-width="1.5" stroke="currentColor" width="36" height="36">
                        <path stroke-linecap="round" stroke-linejoin="round"
                              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                        <path stroke-linecap="round" stroke-linejoin="round"
                              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/>
                    </svg>
                    <span>Aucune donnée régionale pour cette période</span>
                </div>
            @endforelse
        </div>
    </div>

    {{-- ── Right panel : Top Clients ────────────────────────── --}}
    <div class="tr-panel">
        <div class="tr-panel-header">
            <div class="tr-panel-title">
                <div class="tr-panel-icon emerald">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                         stroke-width="2" stroke="currentColor" width="17" height="17">
                        <path stroke-linecap="round" stroke-linejoin="round"
                              d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"/>
                    </svg>
                </div>
                Top Clients
            </div>
            <span class="tr-badge">{{ $label }}</span>
        </div>

        <div class="tr-list">
            @forelse ($clients as $i => $c)
                <div class="tr-row">
                    <div class="tr-avatar av-{{ $i % 8 }}">{{ $c['initials'] }}</div>

                    <div class="tr-client-info">
                        <div class="tr-client-name">{{ $c['name'] }}</div>
                        <div class="tr-client-meta">
                            @if ($c['region'] && $c['region'] !== 'N/A')
                                <span class="tr-client-region">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                         stroke-width="2" stroke="currentColor" width="11" height="11">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/>
                                    </svg>
                                    {{ $c['region'] }}
                                </span>
                            @endif
                            <span class="tr-client-orders">{{ $c['total_commandes'] }} cmd</span>
                        </div>
                    </div>

                    <div class="tr-client-right">
                        <div class="tr-client-ttc">{{ number_format($c['total_ttc'], 3, ',', ' ') }} DT</div>
                        <div class="tr-client-last">{{ $c['last_order'] }}</div>
                    </div>
                </div>
            @empty
                <div class="tr-empty">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                         stroke-width="1.5" stroke="currentColor" width="36" height="36">
                        <path stroke-linecap="round" stroke-linejoin="round"
                              d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"/>
                    </svg>
                    <span>Aucun client pour cette période</span>
                </div>
            @endforelse
        </div>
    </div>

</div>
</x-filament-widgets::widget>
