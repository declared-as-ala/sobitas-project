<x-dynamic-component
    :component="$getFieldWrapperView()"
    :field="$field"
>
    @php
        $state = $getRecord()?->net_a_payer ?? 0;
        if (is_callable($get)) {
            $state = $get('net_a_payer') ?? $state;
        }
        $formatted = number_format((float) $state, 3, ',', ' ');
    @endphp

    <style>
        .nap-solid-card {
            background-color: #f97316; /* Solid orange matching mockup */
            border-radius: 0.375rem;
            padding: 0.75rem 1rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            box-sizing: border-box;
            color: white;
            box-shadow: 0 4px 6px -1px rgba(249, 115, 22, 0.2);
        }
        :is(.dark .nap-solid-card) {
            background-color: #ea580c;
        }
        
        .nap-left-col {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }
        
        .nap-solid-label {
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 0px;
        }
        
        .nap-solid-currency {
            font-size: 0.75rem;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.8);
            margin-top: 2px;
        }
        
        .nap-solid-amount {
            font-size: 1.4rem;
            font-weight: 800;
            letter-spacing: -0.01em;
            line-height: 1;
            color: white;
            white-space: nowrap;
        }
    </style>

    <div class="nap-solid-card" role="status" aria-label="Net à payer: {{ $formatted }} DT">
        <div class="nap-left-col">
            <div class="nap-solid-label">
                NET À PAYER
            </div>
            <div class="nap-solid-currency">TND</div>
        </div>
        <div>
            <span class="nap-solid-amount">{{ $formatted }} DT</span>
        </div>
    </div>
</x-dynamic-component>
