<x-dynamic-component
    :component="$getFieldWrapperView()"
    :field="$field"
>
    @php
        $net = 0.0;
        if (is_callable($get)) {
            $totals = \App\Filament\Resources\TicketResource::computeTicketTotals($get);
            $net = (float) ($totals[2] ?? 0);
        }
        $formatted = number_format($net, 3, ',', ' ');
    @endphp

    <style>
        .ticket-nap-card {
            background-color: #fff7ed;
            border: 2px solid #fed7aa;
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
        :is(.dark .ticket-nap-card) {
            background-color: rgba(124, 45, 18, 0.25);
            border-color: rgba(234, 88, 12, 0.4);
        }
        .ticket-nap-label {
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: #ea580c;
            text-align: left;
            margin-bottom: 0.5rem;
            white-space: nowrap;
        }
        :is(.dark .ticket-nap-label) {
            color: #fb923c;
        }
        .ticket-nap-amount-container {
            display: flex;
            align-items: baseline;
            justify-content: flex-end;
            gap: 0.35rem;
            min-width: 0;
        }
        .ticket-nap-amount {
            font-size: clamp(1rem, 3vw, 1.5rem);
            font-weight: 800;
            line-height: 1.1;
            color: #111827;
            white-space: nowrap;
            text-align: right;
        }
        :is(.dark .ticket-nap-amount) {
            color: #ffffff;
        }
        .ticket-nap-currency {
            font-size: 0.9rem;
            font-weight: 700;
            color: #ea580c;
            white-space: nowrap;
            flex-shrink: 0;
        }
        :is(.dark .ticket-nap-currency) {
            color: #fb923c;
        }
        .ticket-nap-subtext {
            font-size: 0.72rem;
            color: #6b7280;
            text-align: right;
            margin-top: 0.375rem;
            margin-bottom: 0;
        }
        :is(.dark .ticket-nap-subtext) {
            color: #9ca3af;
        }
    </style>

    <div class="ticket-nap-card" role="status" aria-label="Net à payer: {{ $formatted }} DT">
        <div class="ticket-nap-label">NET À PAYER</div>
        <div class="ticket-nap-amount-container">
            <span class="ticket-nap-amount">{{ $formatted }}</span>
            <span class="ticket-nap-currency">DT</span>
        </div>
        <p class="ticket-nap-subtext">Montant final à régler</p>
    </div>
</x-dynamic-component>
