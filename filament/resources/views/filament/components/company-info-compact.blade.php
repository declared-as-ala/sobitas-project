{{-- Compact premium company block for document edit pages --}}
@php
    $logoUrl = null;
    if (!empty($coordinate->logo_facture)) {
        $logoUrl = filter_var($coordinate->logo_facture, FILTER_VALIDATE_URL)
            ? $coordinate->logo_facture
            : \Illuminate\Support\Facades\Storage::url($coordinate->logo_facture);
    }
    $name = $coordinate->abbreviation ?? 'STE SOBITAS';
    $phone = trim(($coordinate->phone_1 ?? '') . (!empty($coordinate->phone_2) ? ' / ' . $coordinate->phone_2 : ''));
    $adresse = $coordinate->adresse_fr ?? '';
@endphp
<div class="doc-company-compact rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-4 flex items-center gap-5">
    @if($logoUrl)
        <img src="{{ $logoUrl }}" alt="Logo" class="h-12 w-auto max-w-[120px] object-contain shrink-0" onerror="this.style.display='none'" />
    @endif
    <div class="flex flex-col min-w-0">
        <h3 class="font-bold text-gray-900 dark:text-gray-100 text-base leading-tight truncate">{{ $name }}</h3>
        @if($phone || $adresse)
            <div class="text-gray-500 dark:text-gray-400 text-xs mt-1.5 flex flex-col gap-1">
                @if($phone)
                    <span class="flex items-center gap-1.5 truncate">
                        <x-filament::icon icon="heroicon-m-phone" class="w-3.5 h-3.5 shrink-0" />
                        {{ $phone }}
                    </span>
                @endif
                @if((string)$adresse !== '')
                    <span class="flex items-start gap-1.5">
                        <x-filament::icon icon="heroicon-m-map-pin" class="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span class="truncate whitespace-normal line-clamp-2 leading-relaxed">{{ $adresse }}</span>
                    </span>
                @endif
            </div>
        @endif
    </div>
</div>
