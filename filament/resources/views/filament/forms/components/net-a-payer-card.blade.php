<x-dynamic-component
    :component="$getFieldWrapperView()"
    :field="$field"
>
    @php
        $state = $getRecord()?->net_a_payer ?? 0;
        if (is_callable($get)) {
            $state = $get('net_a_payer') ?? $state;
        }
        $formatted = number_format((float) $state, 3, '.', ' ');
    @endphp

    <style>
        .nap-card {
            background-color: #fff7ed; /* orange-50 */
            border: 2px solid #fed7aa; /* orange-200 */
            border-radius: 0.75rem;
            padding: 1rem 1.25rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            display: flex;
            flex-direction: column;
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
            transition: background-color 0.3s ease, border-color 0.3s ease;
        }
        :is(.dark .nap-card) {
            background-color: rgba(124, 45, 18, 0.25);
            border-color: rgba(234, 88, 12, 0.4);
        }
        
        .nap-label {
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: #ea580c;
            text-align: left;
            margin-bottom: 0.5rem;
            white-space: nowrap;
        }
        :is(.dark .nap-label) {
            color: #fb923c;
        }
        
        .nap-amount-container {
            display: flex;
            align-items: baseline;
            justify-content: flex-end;
            gap: 0.35rem;
            min-width: 0;
        }
        
        .nap-amount-wrap {
            min-width: 0;
            flex: 1;
        }
        
        .nap-amount {
            display: block;
            font-size: clamp(1rem, 3vw, 1.5rem);
            font-weight: 800;
            line-height: 1.1;
            color: #111827;
            white-space: nowrap;
            text-align: right;
        }
        :is(.dark .nap-amount) {
            color: #ffffff;
        }
        
        .nap-currency {
            font-size: 0.9rem;
            font-weight: 700;
            color: #ea580c;
            white-space: nowrap;
            flex-shrink: 0;
        }
        :is(.dark .nap-currency) {
            color: #fb923c;
        }
        
        .nap-subtext {
            font-size: 0.72rem;
            color: #6b7280;
            text-align: right;
            margin-top: 0.375rem;
            margin-bottom: 0;
            line-height: 1.2;
            word-wrap: break-word;
        }
        :is(.dark .nap-subtext) {
            color: #9ca3af;
        }
    </style>

    <div class="nap-card" role="status" aria-label="Net à payer: {{ $formatted }} TND">
        <div class="nap-label">
            NET À PAYER
        </div>
        <div class="nap-amount-container">
            <span class="nap-amount-wrap">
                <span class="nap-amount">{{ $formatted }}</span>
            </span>
            <span class="nap-currency">TND</span>
        </div>
        <p class="nap-subtext">
            Montant final à régler (TTC + timbre)
        </p>
    </div>
</x-dynamic-component>

