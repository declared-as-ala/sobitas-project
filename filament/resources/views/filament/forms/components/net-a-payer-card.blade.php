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

    <div
        class="fi-fo-net-a-payer"
        role="status"
        aria-label="Net à payer: {{ $formatted }} TND"
    >
        <div class="doc-total-net-block">
            <div class="doc-total-net-prefix">
                <span class="doc-total-net-label">NET À PAYER</span>
                <span class="doc-total-net-subtext">Montant final à régler (TTC + timbre)</span>
            </div>
            <div class="doc-total-net-amount">
                {{ $formatted }} <span class="doc-total-net-currency">TND</span>
            </div>
        </div>
    </div>
</x-dynamic-component>
