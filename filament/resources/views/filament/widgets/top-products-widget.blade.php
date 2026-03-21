<x-filament-widgets::widget>
    <x-filament::section>
        <x-slot name="heading">
            Top Produits — Commandes &amp; Ventes ({{ $periodLabel }})
        </x-slot>

        @if (count($topProducts) > 0)
            @php
                $topByQty    = collect($topProducts)->sortByDesc('total_qty')->first();
                $topByRev    = $topProducts[0] ?? null;
                $topByOrders = collect($topProducts)->sortByDesc('total_orders')->first();
                $maxRevenue  = (float) ($topProducts[0]['total_revenue_ht'] ?? 1);
                $maxQty      = collect($topProducts)->max('total_qty') ?: 1;
            @endphp

            {{-- ── Podium: top 3 highlight cards ─────────────────────────────── --}}
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">

                {{-- Best revenue --}}
                @if ($topByRev)
                <div class="relative overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 p-4">
                    <div class="absolute top-0 right-0 w-16 h-16 opacity-10 text-6xl flex items-center justify-center select-none">💰</div>
                    <span class="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-2">
                        🥇 Meilleur revenu
                    </span>
                    <p class="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug truncate" title="{{ $topByRev['name'] }}">
                        {{ $topByRev['name'] }}
                    </p>
                    <p class="mt-1.5 text-xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums leading-none">
                        {{ number_format((float) $topByRev['total_revenue_ht'], 3, ',', ' ') }}
                        <span class="text-xs font-semibold text-amber-500">DT HT</span>
                    </p>
                    <p class="mt-1 text-[11px] text-amber-700/70 dark:text-amber-400/70">
                        {{ number_format((float) $topByRev['total_qty'], 0, ',', ' ') }} unités ·
                        {{ number_format((int) $topByRev['total_orders'], 0, ',', ' ') }} docs
                    </p>
                </div>
                @endif

                {{-- Most sold by qty --}}
                @if ($topByQty)
                <div class="relative overflow-hidden rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 p-4">
                    <div class="absolute top-0 right-0 w-16 h-16 opacity-10 text-6xl flex items-center justify-center select-none">📦</div>
                    <span class="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400 mb-2">
                        📦 Plus vendu (qté)
                    </span>
                    <p class="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug truncate" title="{{ $topByQty['name'] }}">
                        {{ $topByQty['name'] }}
                    </p>
                    <p class="mt-1.5 text-xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums leading-none">
                        {{ number_format((float) $topByQty['total_qty'], 0, ',', ' ') }}
                        <span class="text-xs font-semibold text-blue-500">unités</span>
                    </p>
                    <p class="mt-1 text-[11px] text-blue-700/70 dark:text-blue-400/70">
                        {{ number_format((float) $topByQty['total_revenue_ht'], 3, ',', ' ') }} DT ·
                        {{ number_format((int) $topByQty['total_orders'], 0, ',', ' ') }} docs
                    </p>
                </div>
                @endif

                {{-- Most documents --}}
                @if ($topByOrders)
                <div class="relative overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 p-4">
                    <div class="absolute top-0 right-0 w-16 h-16 opacity-10 text-6xl flex items-center justify-center select-none">📋</div>
                    <span class="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-2">
                        📋 Forte demande
                    </span>
                    <p class="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug truncate" title="{{ $topByOrders['name'] }}">
                        {{ $topByOrders['name'] }}
                    </p>
                    <p class="mt-1.5 text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
                        {{ number_format((int) $topByOrders['total_orders'], 0, ',', ' ') }}
                        <span class="text-xs font-semibold text-emerald-500">documents</span>
                    </p>
                    <p class="mt-1 text-[11px] text-emerald-700/70 dark:text-emerald-400/70">
                        {{ number_format((float) $topByOrders['total_qty'], 0, ',', ' ') }} unités ·
                        {{ number_format((float) $topByOrders['total_revenue_ht'], 3, ',', ' ') }} DT
                    </p>
                </div>
                @endif

            </div>

            {{-- ── Column headers ──────────────────────────────────────────────── --}}
            <div class="hidden sm:grid sm:grid-cols-[2rem_1fr_5rem_5rem_7rem] gap-x-3 px-3 mb-1">
                <div></div>
                <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Produit</p>
                <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 text-right">Qté</p>
                <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 text-right">Docs</p>
                <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 text-right">Revenu HT</p>
            </div>

            {{-- ── Ranked product list ──────────────────────────────────────────── --}}
            <div class="space-y-1.5">
                @foreach ($topProducts as $index => $product)
                    @php
                        $rank     = $index + 1;
                        $barPct   = $maxRevenue > 0 ? round(((float) $product['total_revenue_ht'] / $maxRevenue) * 100) : 0;

                        // Rank styling
                        [$rankRing, $rankNumClass, $rankBg] = match($rank) {
                            1 => ['ring-amber-300 dark:ring-amber-600',  'text-amber-600 dark:text-amber-400 font-extrabold', 'bg-amber-50 dark:bg-amber-900/20'],
                            2 => ['ring-gray-300  dark:ring-gray-500',   'text-gray-500  dark:text-gray-400  font-bold',      'bg-gray-50  dark:bg-gray-800/30'],
                            3 => ['ring-orange-300 dark:ring-orange-600','text-orange-500 dark:text-orange-400 font-bold',    'bg-orange-50 dark:bg-orange-900/20'],
                            default => ['ring-gray-200 dark:ring-gray-700', 'text-gray-400 dark:text-gray-500 font-semibold',''],
                        };

                        $barColor = match($rank) {
                            1 => 'bg-gradient-to-r from-amber-400 to-orange-400',
                            2 => 'bg-gradient-to-r from-gray-400 to-gray-300',
                            3 => 'bg-gradient-to-r from-orange-400 to-orange-300',
                            default => 'bg-gradient-to-r from-primary-400 to-primary-300',
                        };

                        // Smart badges
                        $badges = [];
                        if ($topByRev && $product['name'] === $topByRev['name'])    $badges[] = ['💰', 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'];
                        if ($topByQty && $product['name'] === $topByQty['name'])    $badges[] = ['📦', 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'];
                        if ($topByOrders && $product['name'] === $topByOrders['name']) $badges[] = ['📋', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'];
                    @endphp

                    <div class="group grid grid-cols-[2rem_1fr] sm:grid-cols-[2rem_1fr_5rem_5rem_7rem] items-center gap-x-3 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:bg-white dark:hover:bg-gray-800/50 px-3 py-2.5 transition-all duration-150 {{ $rank <= 3 ? $rankBg : '' }}">

                        {{-- Rank --}}
                        <div class="flex items-center justify-center w-7 h-7 rounded-full ring-2 {{ $rankRing }} bg-white dark:bg-gray-900 flex-shrink-0">
                            <span class="text-xs {{ $rankNumClass }}">{{ $rank }}</span>
                        </div>

                        {{-- Name + bar + badges --}}
                        <div class="min-w-0">
                            <div class="flex items-center gap-1.5 flex-wrap">
                                <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight" title="{{ $product['name'] }}">
                                    {{ $product['name'] }}
                                </p>
                                @foreach ($badges as [$icon, $cls])
                                    <span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold {{ $cls }}">{{ $icon }}</span>
                                @endforeach
                            </div>
                            <div class="mt-1.5 h-1 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                <div class="h-1 rounded-full {{ $barColor }} transition-all duration-300" style="width: {{ $barPct }}%"></div>
                            </div>
                            {{-- Mobile-only stats --}}
                            <div class="flex items-center gap-3 mt-1 sm:hidden text-[11px] text-gray-500 dark:text-gray-400">
                                <span>{{ number_format((float) $product['total_qty'], 0, ',', ' ') }} unités</span>
                                <span>{{ number_format((int) $product['total_orders'], 0, ',', ' ') }} docs</span>
                                <span class="font-bold text-primary-600 dark:text-primary-400">{{ number_format((float) $product['total_revenue_ht'], 3, ',', ' ') }} DT</span>
                            </div>
                        </div>

                        {{-- Qty --}}
                        <div class="hidden sm:block text-right">
                            <span class="text-sm font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                                {{ number_format((float) $product['total_qty'], 0, ',', ' ') }}
                            </span>
                            <span class="text-[10px] text-gray-400 ml-0.5">u.</span>
                        </div>

                        {{-- Docs --}}
                        <div class="hidden sm:flex items-center justify-end gap-1">
                            <x-filament::icon icon="heroicon-o-document-text" class="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            <span class="text-sm font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                                {{ number_format((int) $product['total_orders'], 0, ',', ' ') }}
                            </span>
                        </div>

                        {{-- Revenue --}}
                        <div class="hidden sm:block text-right">
                            <span class="text-sm font-bold tabular-nums {{ $rank === 1 ? 'text-amber-600 dark:text-amber-400' : 'text-primary-600 dark:text-primary-400' }}">
                                {{ number_format((float) $product['total_revenue_ht'], 3, ',', ' ') }}
                            </span>
                            <span class="text-[10px] text-gray-400 ml-0.5">DT</span>
                        </div>

                    </div>
                @endforeach
            </div>

        @else
            <div class="flex flex-col items-center justify-center py-12 text-center gap-3">
                <div class="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl">📊</div>
                <div>
                    <p class="text-sm font-semibold text-gray-600 dark:text-gray-400">Aucune donnée disponible</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Aucun produit vendu sur la période sélectionnée.</p>
                </div>
            </div>
        @endif
    </x-filament::section>
</x-filament-widgets::widget>
