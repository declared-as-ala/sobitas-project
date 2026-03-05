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
        class="fi-fo-net-a-payer rounded-2xl border-2 p-5 shadow-sm
               bg-orange-50/80 border-orange-400/60
               dark:bg-amber-900/20 dark:border-amber-500/50"
        role="status"
        aria-label="Net à payer: {{ $formatted }} TND"
    >
        <div class="flex flex-col gap-1">
            <span class="text-xs font-bold uppercase tracking-widest text-orange-600 dark:text-amber-500">
                NET À PAYER
            </span>
            <div class="flex items-baseline justify-between gap-3 mt-1">
                <span class="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white whitespace-nowrap">
                    {{ $formatted }}
                </span>
                <span class="shrink-0 text-lg font-bold text-orange-600/80 dark:text-amber-500/80">TND</span>
            </div>
            <p class="text-[13px] font-medium text-gray-500 dark:text-gray-400 mt-2">
                Montant final à régler (TTC + timbre)
            </p>
        </div>
    </div>
</x-dynamic-component>
