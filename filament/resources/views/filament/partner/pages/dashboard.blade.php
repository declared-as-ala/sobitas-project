<x-filament-panels::page>

    {{-- Stats Cards --}}
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">

        <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-200 dark:border-gray-700">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total des gains</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ number_format($totalEarned, 3, '.', ' ') }} DT</p>
        </div>

        <div class="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl shadow p-5 border border-emerald-200 dark:border-emerald-700">
            <p class="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Solde disponible</p>
            <p class="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{{ number_format($availableBalance, 3, '.', ' ') }} DT</p>
        </div>

        <div class="bg-amber-50 dark:bg-amber-900/30 rounded-xl shadow p-5 border border-amber-200 dark:border-amber-700">
            <p class="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">En attente</p>
            <p class="text-2xl font-bold text-amber-700 dark:text-amber-400">{{ number_format($pendingEarnings, 3, '.', ' ') }} DT</p>
        </div>

        <div class="bg-blue-50 dark:bg-blue-900/30 rounded-xl shadow p-5 border border-blue-200 dark:border-blue-700">
            <p class="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Total payé</p>
            <p class="text-2xl font-bold text-blue-700 dark:text-blue-400">{{ number_format($totalPaid, 3, '.', ' ') }} DT</p>
        </div>

    </div>

    {{-- Partner Info --}}
    @if($partner)
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Informations du compte</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
                <span class="text-gray-400">Nom :</span>
                <span class="font-medium text-gray-900 dark:text-white ml-1">{{ $partner->name }}</span>
            </div>
            <div>
                <span class="text-gray-400">Type :</span>
                <span class="font-medium text-gray-900 dark:text-white ml-1">{{ $partner->type instanceof \App\Enums\PartnerType ? $partner->type->label() : $partner->type }}</span>
            </div>
            <div>
                <span class="text-gray-400">Taux :</span>
                <span class="font-medium text-gray-900 dark:text-white ml-1">{{ $partner->commission_rate }}%</span>
            </div>
            <div>
                <span class="text-gray-400">Statut :</span>
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 ml-1">Actif</span>
            </div>
            <div>
                <span class="text-gray-400">Commandes générées :</span>
                <span class="font-medium text-gray-900 dark:text-white ml-1">{{ $totalOrders }}</span>
            </div>
        </div>
    </div>

    {{-- Promo codes --}}
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Mes codes promo</h2>
        @forelse($partner->coupons as $coupon)
        <div class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <span class="font-mono text-base font-bold text-emerald-600">{{ $coupon->code }}</span>
            <div class="text-sm text-gray-500 space-x-3">
                <span>{{ $coupon->type === 'percent' ? $coupon->value . '%' : number_format($coupon->value, 3) . ' DT' }}</span>
                <span class="{{ $coupon->is_active ? 'text-emerald-500' : 'text-red-400' }}">
                    {{ $coupon->is_active ? 'Actif' : 'Inactif' }}
                </span>
            </div>
        </div>
        @empty
        <p class="text-gray-400 text-sm">Aucun code promo assigné pour le moment.</p>
        @endforelse
    </div>
    @endif

</x-filament-panels::page>
