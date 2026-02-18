{{-- Print modal: iframe loads print view; "Imprimer" triggers iframe print (same page, no new tab) --}}
@php
    $sep = str_contains($printUrl, '?') ? '&' : '?';
    $urlWithEmbed = $printUrl . $sep . 'embed=1';
    $urlClassicEmbed = $printUrl . $sep . 'embed=1&style=classic';
    $urlModernEmbed = $printUrl . $sep . 'embed=1&style=modern';
    $showStyleSwitcher = $showStyleSwitcher ?? false;
@endphp
<div class="flex flex-col gap-4" x-data="{ src: '{{ $urlClassicEmbed }}' }">
    <iframe
        :src="src"
        class="print-modal-iframe w-full border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900"
        style="height: 75vh; min-height: 400px;"
        title="{{ $title ?? 'Aperçu' }}"
    ></iframe>
    <div class="flex flex-wrap items-center justify-between gap-2">
        @if ($showStyleSwitcher)
        <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>Style :</span>
            <button type="button" @click="src = '{{ $urlClassicEmbed }}'" class="underline hover:no-underline">Classique</button>
            <span>|</span>
            <button type="button" @click="src = '{{ $urlModernEmbed }}'" class="underline hover:no-underline">Moderne</button>
        </div>
        @else
        <div></div>
        @endif
        <div class="flex flex-wrap items-center gap-2">
        <button
            type="button"
            x-data
            @click="const ifr = document.querySelector('.print-modal-iframe'); if (ifr && ifr.contentWindow) ifr.contentWindow.print();"
            class="inline-flex items-center justify-center gap-2 rounded-xl border border-transparent bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
            <x-filament::icon icon="heroicon-o-printer" class="size-5" />
            Imprimer
        </button>
        </div>
    </div>
</div>
