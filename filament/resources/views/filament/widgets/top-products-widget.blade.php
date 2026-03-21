<x-filament-widgets::widget>
    <x-filament::section>
        <x-slot name="heading">
            Top Produits — Commandes &amp; Ventes ({{ $periodLabel }})
        </x-slot>

        @if (count($topProducts) > 0)

            {{-- Insight cards --}}
            @php
                $topByQty    = collect($topProducts)->sortByDesc('total_qty')->first();
                $topByRev    = $topProducts[0] ?? null;
                $topByOrders = collect($topProducts)->sortByDesc('total_orders')->first();
            @endphp

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                @if ($topByRev)
                    <div class="flex items-center gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
                        <div class="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-lg">💰</div>
                        <div class="min-w-0">
                            <p class="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Meilleur revenu</p>
                            <p class="font-semibold text-gray-800 dark:text-gray-100 truncate text-sm leading-tight">{{ $topByRev['name'] }}</p>
                            <p class="text-xs text-amber-700 dark:text-amber-300 font-mono">{{ number_format((float) $topByRev['total_revenue_ht'], 3, ',', ' ') }} DT</p>
                        </div>
                    </div>
                @endif

                @if ($topByQty)
                    <div class="flex items-center gap-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3">
                        <div class="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-lg">📦</div>
                        <div class="min-w-0">
                            <p class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Plus vendu (qté)</p>
                            <p class="font-semibold text-gray-800 dark:text-gray-100 truncate text-sm leading-tight">{{ $topByQty['name'] }}</p>
                            <p class="text-xs text-blue-700 dark:text-blue-300 font-mono">{{ number_format((int) $topByQty['total_qty'], 0, ',', ' ') }} unités</p>
                        </div>
                    </div>
                @endif

                @if ($topByOrders)
                    <div class="flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
                        <div class="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-lg">📋</div>
                        <div class="min-w-0">
                            <p class="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Forte demande</p>
                            <p class="font-semibold text-gray-800 dark:text-gray-100 truncate text-sm leading-tight">{{ $topByOrders['name'] }}</p>
                            <p class="text-xs text-emerald-700 dark:text-emerald-300 font-mono">{{ number_format((int) $topByOrders['total_orders'], 0, ',', ' ') }} documents</p>
                        </div>
                    </div>
                @endif
            </div>

            {{-- Product list --}}
            <div class="space-y-2">
                @php $maxRevenue = (float) ($topProducts[0]['total_revenue_ht'] ?? 1); @endphp

                @foreach ($topProducts as $index => $product)
                    @php
                        $rank     = $index + 1;
                        $barWidth = $maxRevenue > 0 ? round(((float) $product['total_revenue_ht'] / $maxRevenue) * 100) : 0;
                        [$rankBg, $rankText] = match($rank) {
                            1 => ['bg-amber-100 dark:bg-amber-900/40', 'text-amber-600 dark:text-amber-400'],
                            2 => ['bg-gray-100 dark:bg-gray-700', 'text-gray-500 dark:text-gray-300'],
                            3 => ['bg-orange-100 dark:bg-orange-900/40', 'text-orange-500 dark:text-orange-400'],
                            default => ['bg-gray-50 dark:bg-gray-800', 'text-gray-400 dark:text-gray-500'],
                        };
                        $barColor = match($rank) {
                            1 => 'bg-amber-400',
                            2 => 'bg-gray-400',
                            3 => 'bg-orange-400',
                            default => 'bg-primary-400',
                        };
                    @endphp

                    <div class="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800/40 px-4 py-3 hover:shadow-sm transition-shadow">

                        {{-- Rank badge --}}
                        <div class="flex-shrink-0 w-7 h-7 rounded-full {{ $rankBg }} flex items-center justify-center">
                            <span class="text-xs font-bold {{ $rankText }}">{{ $rank }}</span>
                        </div>

                        {{-- Name + bar --}}
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight">
                                {{ $product['name'] }}
                            </p>
                            <div class="mt-1.5 h-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                <div class="h-1 rounded-full {{ $barColor }} transition-all" style="width: {{ $barWidth }}%"></div>
                            </div>
                        </div>

                        {{-- Stats --}}
                        <div class="flex-shrink-0 flex items-center gap-4 text-right">
                            <div class="hidden sm:block">
                                <p class="text-[10px] text-gray-400 uppercase tracking-wide">Qté</p>
                                <p class="text-sm font-semibold text-gray-700 dark:text-gray-200 font-mono">
                                    {{ number_format((float) $product['total_qty'], 0, ',', ' ') }}
                                </p>
                            </div>
                            <div class="hidden sm:block">
                                <p class="text-[10px] text-gray-400 uppercase tracking-wide">Docs</p>
                                <p class="text-sm font-semibold text-gray-700 dark:text-gray-200 font-mono">
                                    {{ number_format((int) $product['total_orders'], 0, ',', ' ') }}
                                </p>
                            </div>
                            <div>
                                <p class="text-[10px] text-gray-400 uppercase tracking-wide">Revenu HT</p>
                                <p class="text-sm font-bold text-primary-600 dark:text-primary-400 font-mono whitespace-nowrap">
                                    {{ number_format((float) $product['total_revenue_ht'], 3, ',', ' ') }} <span class="text-xs font-normal text-gray-400">DT</span>
                                </p>
                            </div>
                        </div>
                    </div>
                @endforeach
            </div>

        @else
            <div class="flex flex-col items-center justify-center py-10 text-center">
                <div class="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3 text-2xl">📊</div>
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Aucune donnée produit sur la période sélectionnée.</p>
            </div>
        @endif
    </x-filament::section>
</x-filament-widgets::widget>
