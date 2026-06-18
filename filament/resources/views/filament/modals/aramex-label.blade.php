<div class="space-y-4">
    {{-- Header bar: HAWB + actions --}}
    <div class="flex flex-col gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-amber-900/40 dark:from-amber-950/30 dark:to-orange-950/20 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8l2-2z"/>
                </svg>
            </div>
            <div>
                <p class="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">Numéro de suivi Aramex</p>
                <p class="font-mono text-lg font-bold text-gray-900 dark:text-white">{{ $hawb }}</p>
            </div>
        </div>

        <div class="flex items-center gap-2">
            <button type="button"
                    onclick="document.getElementById('aramex-label-iframe').contentWindow.focus(); document.getElementById('aramex-label-iframe').contentWindow.print();"
                    class="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                </svg>
                Imprimer
            </button>
            <a href="{{ $url }}" target="_blank"
               class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                Nouvel onglet
            </a>
        </div>
    </div>

    {{-- PDF preview --}}
    <div class="overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-inner dark:border-gray-700 dark:bg-gray-900">
        <iframe id="aramex-label-iframe"
                src="{{ $url }}"
                class="w-full bg-white"
                style="height: 70vh; min-height: 480px;"
                title="Bordereau Aramex {{ $hawb }}">
        </iframe>
    </div>

    <p class="text-center text-xs text-gray-400">
        Le bordereau est généré par Aramex. Imprimez-le et collez-le sur le colis.
    </p>
</div>
