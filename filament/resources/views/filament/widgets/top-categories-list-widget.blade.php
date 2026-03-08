<x-filament-widgets::widget>
    <x-filament::section>
        <ul class="space-y-2">
            @forelse($items as $row)
                <li class="flex items-center justify-between gap-2 py-1.5 border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <span class="font-medium text-gray-700 dark:text-gray-300 truncate">{{ $row->category_name ?: 'Sans catégorie' }}</span>
                    <span class="text-sm font-semibold text-primary shrink-0">{{ number_format((float) $row->total_revenue, 0, ',', ' ') }} DT</span>
                </li>
            @empty
                <li class="text-sm text-gray-500 dark:text-gray-400 py-4">Aucune donnée sur la période.</li>
            @endforelse
        </ul>
    </x-filament::section>
</x-filament-widgets::widget>
