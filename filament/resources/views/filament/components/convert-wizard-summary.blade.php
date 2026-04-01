@php
    $colorMap = [
        'blue'    => ['bg' => '#eff6ff', 'text' => '#1d4ed8', 'border' => '#bfdbfe', 'icon' => '#3b82f6'],
        'emerald' => ['bg' => '#ecfdf5', 'text' => '#047857', 'border' => '#a7f3d0', 'icon' => '#10b981'],
        'amber'   => ['bg' => '#fffbeb', 'text' => '#92400e', 'border' => '#fde68a', 'icon' => '#f59e0b'],
        'gray'    => ['bg' => '#f9fafb', 'text' => '#374151', 'border' => '#e5e7eb', 'icon' => '#6b7280'],
    ];
    $tc = $colorMap[$targetColor ?? 'gray'] ?? $colorMap['gray'];
@endphp

<div class="cw-root">
    {{-- Source --}}
    <div class="cw-card">
        <div class="cw-card-header">
            <span class="cw-badge cw-badge--source">{{ $sourceType ?? 'Document' }}</span>
            <span class="cw-number">{{ $sourceNumber ?? '—' }}</span>
        </div>
        <dl class="cw-dl">
            <div class="cw-dl-row">
                <dt>Client</dt>
                <dd>{{ $client ?? '—' }}</dd>
            </div>
            <div class="cw-dl-row">
                <dt>Date</dt>
                <dd>{{ $date ?? '—' }}</dd>
            </div>
            <div class="cw-dl-row">
                <dt>Lignes</dt>
                <dd>{{ $itemsCount ?? 0 }} produit(s)</dd>
            </div>
        </dl>

        <div class="cw-totals">
            <div class="cw-totals-row">
                <span>Total HT</span>
                <span>{{ $totalHt ?? '—' }}</span>
            </div>
            @if(($remise ?? 0) > 0)
                <div class="cw-totals-row cw-totals-row--dim">
                    <span>Remise</span>
                    <span>-{{ $remise }}</span>
                </div>
            @endif
            @if(isset($tva) && $tva !== null && $tva !== '—')
                <div class="cw-totals-row">
                    <span>TVA</span>
                    <span>{{ $tva }}</span>
                </div>
            @endif
            <div class="cw-totals-row cw-totals-row--total">
                <span>Net à payer</span>
                <span>{{ $totalTtc ?? '—' }}</span>
            </div>
        </div>
    </div>

    {{-- Arrow --}}
    <div class="cw-arrow">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="22" height="22">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
    </div>

    {{-- Target --}}
    <div class="cw-target" style="background:{{ $tc['bg'] }};border-color:{{ $tc['border'] }};">
        <div class="cw-target-icon" style="background:{{ $tc['icon'] }};">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="18" height="18" style="color:#fff;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
        </div>
        <div>
            <div class="cw-target-label" style="color:{{ $tc['text'] }};">{{ $targetLabel ?? 'Nouveau document' }}</div>
            <div class="cw-target-hint">Sera créé automatiquement</div>
        </div>
    </div>
</div>
