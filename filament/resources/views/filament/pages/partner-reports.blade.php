<x-filament-panels::page>
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Partenaires</h3>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Total : <strong>{{ $this->partnersTotal }}</strong></p>
            <p class="text-sm text-gray-600 dark:text-gray-400">Actifs : <strong>{{ $this->partnersActive }}</strong></p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Ventes boutique</h3>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Tickets attribués : <strong>{{ $this->ticketsAttributed }}</strong></p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Commissions</h3>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Confirmées (somme lignes) : <strong>{{ number_format($this->commissionsConfirmed, 3, '.', ' ') }} DT</strong></p>
            <p class="text-sm text-gray-600 dark:text-gray-400">Paiements ledger en attente : <strong>{{ number_format($this->payoutsPending, 3, '.', ' ') }} DT</strong></p>
        </div>
    </div>
</x-filament-panels::page>
