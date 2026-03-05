<x-dynamic-component
    :component="$getFieldWrapperView()"
    :field="$field"
>
    @php
        $state = $getRecord()?->net_a_payer ?? 0;
        // Also check if we have a live state
        if(is_callable($get)) {
            $state = $get('net_a_payer') ?? $state;
        }
        $formatted = number_format((float) $state, 3, '.', ' ');
    @endphp

    <div class="fi-fo-net-a-payer bg-orange-50 border-2 border-orange-500 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
        <span class="text-xs font-bold text-orange-600 uppercase tracking-widest mb-1">NET À PAYER</span>
        <div class="text-3xl font-black text-gray-900 flex items-baseline gap-2">
            <span>{{ $formatted }}</span>
            <span class="text-lg font-bold text-orange-600">TND</span>
        </div>
        <p class="text-xs text-gray-500 mt-2 font-medium">Montant final à régler (TTC + timbre)</p>
    </div>
</x-dynamic-component>
