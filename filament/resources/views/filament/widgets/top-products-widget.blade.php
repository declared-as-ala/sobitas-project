<x-filament-widgets::widget>
    <x-filament::section>
        <x-slot name="heading">
            Top Produits — Commandes &amp; Ventes ({{ $periodLabel }})
        </x-slot>

        @if (count($topProducts) > 0)
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b border-gray-200 dark:border-gray-700">
                            <th class="py-2 px-3 text-left font-semibold text-gray-500 dark:text-gray-400 w-8">#</th>
                            <th class="py-2 px-3 text-left font-semibold text-gray-500 dark:text-gray-400">Produit</th>
                            <th class="py-2 px-3 text-right font-semibold text-gray-500 dark:text-gray-400">Qté vendue</th>
                            <th class="py-2 px-3 text-right font-semibold text-gray-500 dark:text-gray-400">Revenu HT</th>
                            <th class="py-2 px-3 text-right font-semibold text-gray-500 dark:text-gray-400">Nbre documents</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                        @foreach ($topProducts as $index => $product)
                            @php
                                $rank = $index + 1;
                                $badgeColor = match($rank) {
                                    1 => 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400',
                                    2 => 'text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-300',
                                    3 => 'text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400',
                                    default => 'text-gray-400 bg-gray-50 dark:bg-gray-800 dark:text-gray-500',
                                };
                                $maxRevenue = (float) ($topProducts[0]['total_revenue_ht'] ?? 1);
                                $barWidth = $maxRevenue > 0 ? round(((float) $product['total_revenue_ht'] / $maxRevenue) * 100) : 0;
                            @endphp
                            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td class="py-3 px-3">
                                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold {{ $badgeColor }}">
                                        {{ $rank }}
                                    </span>
                                </td>
                                <td class="py-3 px-3">
                                    <div class="font-medium text-gray-800 dark:text-gray-200 truncate max-w-xs">
                                        {{ $product['name'] }}
                                    </div>
                                    <div class="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden w-full max-w-xs">
                                        <div
                                            class="h-1.5 rounded-full bg-primary-500"
                                            style="width: {{ $barWidth }}%"
                                        ></div>
                                    </div>
                                </td>
                                <td class="py-3 px-3 text-right">
                                    <span class="font-semibold text-gray-700 dark:text-gray-300">
                                        {{ number_format((float) $product['total_qty'], 0, ',', ' ') }}
                                    </span>
                                    <span class="text-xs text-gray-400 ml-1">unités</span>
                                </td>
                                <td class="py-3 px-3 text-right">
                                    <span class="font-bold text-primary-600 dark:text-primary-400">
                                        {{ number_format((float) $product['total_revenue_ht'], 3, ',', ' ') }}
                                    </span>
                                    <span class="text-xs text-gray-400 ml-1">DT</span>
                                </td>
                                <td class="py-3 px-3 text-right">
                                    <span class="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                        <x-filament::icon icon="heroicon-o-document-text" class="h-3.5 w-3.5" />
                                        {{ number_format((int) $product['total_orders'], 0, ',', ' ') }}
                                    </span>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>

            {{-- Business insight callouts --}}
            @php
                $topByQty   = collect($topProducts)->sortByDesc('total_qty')->first();
                $topByRev   = $topProducts[0] ?? null;   // already sorted by revenue
                $topByOrders = collect($topProducts)->sortByDesc('total_orders')->first();
            @endphp

            <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                @if ($topByRev)
                    <div class="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                        <p class="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">
                            💰 Plus de revenu
                        </p>
                        <p class="font-bold text-gray-800 dark:text-gray-200 truncate">{{ $topByRev['name'] }}</p>
                        <p class="text-sm text-amber-700 dark:text-amber-300">
                            {{ number_format((float) $topByRev['total_revenue_ht'], 3, ',', ' ') }} DT HT
                        </p>
                    </div>
                @endif

                @if ($topByQty)
                    <div class="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                        <p class="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                            📦 Plus commandé (qté)
                        </p>
                        <p class="font-bold text-gray-800 dark:text-gray-200 truncate">{{ $topByQty['name'] }}</p>
                        <p class="text-sm text-blue-700 dark:text-blue-300">
                            {{ number_format((int) $topByQty['total_qty'], 0, ',', ' ') }} unités vendues
                        </p>
                    </div>
                @endif

                @if ($topByOrders)
                    <div class="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3">
                        <p class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">
                            📋 Forte demande (documents)
                        </p>
                        <p class="font-bold text-gray-800 dark:text-gray-200 truncate">{{ $topByOrders['name'] }}</p>
                        <p class="text-sm text-emerald-700 dark:text-emerald-300">
                            {{ number_format((int) $topByOrders['total_orders'], 0, ',', ' ') }} documents
                        </p>
                    </div>
                @endif
            </div>

        @else
            <p class="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
                Aucune donnée produit sur la période sélectionnée.
            </p>
        @endif
    </x-filament::section>
</x-filament-widgets::widget>
