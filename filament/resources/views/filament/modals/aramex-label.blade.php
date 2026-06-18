<div class="flex flex-col gap-3">
    <div class="flex items-center justify-between px-1">
        <span class="text-sm font-medium text-gray-600 dark:text-gray-400">
            HAWB : <span class="font-mono font-bold text-gray-900 dark:text-white">{{ $hawb }}</span>
        </span>
        <div class="flex gap-2">
            <a href="{{ $url }}" target="_blank"
               class="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                Ouvrir
            </a>
            <button onclick="document.getElementById('aramex-label-iframe').contentWindow.print()"
                    class="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                </svg>
                Imprimer
            </button>
        </div>
    </div>
    <iframe id="aramex-label-iframe"
            src="{{ $url }}"
            class="w-full rounded-lg border border-gray-200 dark:border-gray-700"
            style="height: 580px; min-height: 400px;"
            allowfullscreen>
    </iframe>
</div>
