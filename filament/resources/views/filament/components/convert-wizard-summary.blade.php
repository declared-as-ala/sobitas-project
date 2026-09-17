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
    {{-- Source: the order being converted --}}
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
                <dt>Produits</dt>
                <dd>{{ $itemsCount ?? 0 }} ligne(s)</dd>
            </div>
        </dl>

        <div class="cw-totals">
            <div class="cw-totals-row">
                <span>Total HT</span>
                <span>{{ $totalHt ?? '—' }}</span>
            </div>

            @if(!empty($frais))
                <div class="cw-totals-row">
                    <span>Livraison</span>
                    <span>{{ $frais }}</span>
                </div>
            @endif

            @if(!empty($remise))
                <div class="cw-totals-row cw-totals-row--remise">
                    <span>Remise</span>
                    <span>- {{ $remise }}</span>
                </div>
                @if(!empty($remiseReason))
                    {{-- WHY the remise exists — so staff aren't guessing where the discount came from. --}}
                    <div class="cw-remise-reason">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                            <path fill-rule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5z" clip-rule="evenodd" />
                        </svg>
                        <span>{{ $remiseReason }}</span>
                    </div>
                @endif
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

    {{-- Flow arrow (points down: this order becomes the document below) --}}
    <div class="cw-arrow">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="20" height="20">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
        </svg>
    </div>

    {{-- Target: the document that will be created --}}
    <div class="cw-target" style="background:{{ $tc['bg'] }};border-color:{{ $tc['border'] }};">
        <div class="cw-target-icon" style="background:{{ $tc['icon'] }};">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="18" height="18" style="color:#fff;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
        </div>
        <div>
            <div class="cw-target-label" style="color:{{ $tc['text'] }};">{{ $targetLabel ?? 'Nouveau document' }}</div>
            <div class="cw-target-hint">Sera créé automatiquement à la confirmation</div>
        </div>
    </div>
</div>
