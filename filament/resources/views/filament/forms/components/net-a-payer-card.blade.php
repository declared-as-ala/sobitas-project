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
        class="fi-fo-net-a-payer rounded-xl border-2 p-4 shadow-sm
               bg-orange-50/80 border-orange-200
               dark:bg-orange-950/25 dark:border-orange-500/40"
        role="status"
        aria-label="Net à payer: {{ $formatted }} TND"
    >
        <div class="flex flex-col gap-2">
            <span class="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">
                NET À PAYER
            </span>
            <div class="flex flex-nowrap items-baseline justify-between gap-3 min-w-0">
                <span class="text-2xl sm:text-3xl font-bold tabular-nums text-gray-900 dark:text-white truncate">
                    {{ $formatted }}
                </span>
                <span class="shrink-0 text-sm font-medium text-orange-600 dark:text-orange-400">TND</span>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Montant final à régler (TTC + timbre)
            </p>
        </div>
    </div>
</x-dynamic-component>
