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
            padding: 1.25rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            display: flex;
            flex-direction: column;
            width: 100%;
            transition: background-color 0.3s ease, border-color 0.3s ease;
        }
        :is(.dark .nap-card) {
            background-color: rgba(124, 45, 18, 0.25); /* transparent soft orange dark */
            border-color: rgba(234, 88, 12, 0.4);
        }
        
        .nap-label {
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #ea580c; /* orange-600 */
            text-align: left;
            margin-bottom: 0.5rem;
        }
        :is(.dark .nap-label) {
            color: #fb923c; /* orange-400 */
        }
        
        .nap-amount-container {
            display: flex;
            align-items: baseline;
            justify-content: flex-end;
            gap: 0.5rem;
        }
        
        .nap-amount {
            font-size: 2rem;
            font-weight: 800;
            line-height: 1.1;
            color: #111827; /* gray-900 */
            white-space: nowrap;
        }
        @media (min-width: 640px) {
            .nap-amount {
                font-size: 2.25rem;
            }
        }
        :is(.dark .nap-amount) {
            color: #ffffff;
        }
        
        .nap-currency {
            font-size: 1.125rem;
            font-weight: 600;
            color: #ea580c; /* orange-600 */
        }
        :is(.dark .nap-currency) {
            color: #fb923c; /* orange-400 */
        }
        
        .nap-subtext {
            font-size: 0.8rem;
            color: #6b7280; /* gray-500 */
            text-align: right;
            margin-top: 0.375rem;
            margin-bottom: 0;
            line-height: 1.2;
        }
        :is(.dark .nap-subtext) {
            color: #9ca3af; /* gray-400 */
        }
    </style>

    <div class="nap-card" role="status" aria-label="Net à payer: {{ $formatted }} TND">
        <div class="nap-label">
            NET À PAYER
        </div>
        <div class="nap-amount-container">
            <span class="nap-amount">{{ $formatted }}</span>
            <span class="nap-currency">TND</span>
        </div>
        <p class="nap-subtext">
            Montant final à régler (TTC + timbre)
        </p>
    </div>
</x-dynamic-component>
