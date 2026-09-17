@php
    $colorMap = [
        'blue'    => ['bg' => '#eff6ff', 'text' => '#1d4ed8', 'border' => '#bfdbfe', 'icon' => '#3b82f6'],
        'emerald' => ['bg' => '#ecfdf5', 'text' => '#047857', 'border' => '#a7f3d0', 'icon' => '#10b981'],
        'amber'   => ['bg' => '#fffbeb', 'text' => '#92400e', 'border' => '#fde68a', 'icon' => '#f59e0b'],
        'gray'    => ['bg' => '#f9fafb', 'text' => '#374151', 'border' => '#e5e7eb', 'icon' => '#6b7280'],
    ];
    $tc = $colorMap[$targetColor ?? 'gray'] ?? $colorMap['gray'];

    // A loyalty remise carries the branded Protina callout; a plain commercial discount gets the
    // quiet note. Both flags are optional so the shared Quotation modal (which passes neither)
    // simply renders no explanation.
    $isLoyaltyRemise = ! empty($remiseIsLoyalty);
    $protinas        = (int) ($protinasUsed ?? 0);
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

        {{-- WHY there is a remise — so staff never have to guess where a discount came from. --}}
        @if(!empty($remise) && $isLoyaltyRemise)
            <div class="cw-loyalty">
                <img
                    class="cw-loyalty__coin"
                    src="{{ asset('images/protina-coin.webp') }}"
                    alt="Protina"
                    width="38"
                    height="38"
                    loading="lazy"
                />
                <div>
                    <div class="cw-loyalty__amount">{{ number_format($protinas, 0, ',', ' ') }} Protinas utilisées</div>
                    <div class="cw-loyalty__hint">Le client a échangé ses points de fidélité — c’est l’origine de la remise.</div>
                </div>
            </div>
        @elseif(!empty($remise) && !empty($remiseReason))
            <div class="cw-remise-reason">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path fill-rule="evenodd" d="M5.25 2.25h3.879a1.5 1.5 0 011.06.44l11.122 11.12a1.5 1.5 0 010 2.122l-3.879 3.879a1.5 1.5 0 01-2.121 0L3.31 10.81a1.5 1.5 0 01-.44-1.061V5.872A3.622 3.622 0 015.25 2.25zM6 6a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd" />
                </svg>
                <span>{{ $remiseReason }}</span>
            </div>
        @endif
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
