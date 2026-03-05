{{-- Compact company block for document edit pages: small logo + name + one-line contact, collapsible details --}}
@php
    $logoUrl = asset('logo.png');
    $name = $coordinate->abbreviation ?? 'STE SOBITAS';
    $phone = trim(($coordinate->phone_1 ?? '') . (!empty($coordinate->phone_2) ? ' / ' . $coordinate->phone_2 : ''));
    $adresse = $coordinate->adresse_fr ?? '';
@endphp
<div class="doc-company-compact rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 p-3 text-sm" x-data="{ open: false }">
    <div class="flex items-center gap-3">
        @if($logoUrl)
            <img src="{{ $logoUrl }}" alt="SOBITAS PROTEIN.TN" class="h-8 w-auto object-contain shrink-0" onerror="this.style.display='none'" />
        @endif
        <div class="min-w-0 flex-1">
            <p class="font-semibold text-gray-900 dark:text-white truncate">{{ $name }}</p>
            @if($phone || $adresse)
                <p class="text-gray-600 dark:text-gray-400 truncate text-xs mt-0.5">
                    @if($phone)<span>{{ $phone }}</span>@endif
                    @if($phone && $adresse)<span class="mx-1">·</span>@endif
                    @if($adresse)<span>{{ Str::limit($adresse, 40) }}</span>@endif
                </p>
            @endif
        </div>
        @if($adresse && strlen($adresse) > 40)
            <button type="button" @click="open = !open" class="shrink-0 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline">
                <span x-show="!open">Voir détails</span>
                <span x-show="open" x-cloak>Masquer</span>
            </button>
        @endif
    </div>
    <div x-show="open" x-collapse x-cloak class="pt-2 mt-2 border-t border-gray-200 dark:border-white/10">
        @if(!empty($coordinate->adresse_fr))
            <p class="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <x-filament::icon icon="heroicon-o-map-pin" class="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{{ $coordinate->adresse_fr }}</span>
            </p>
        @endif
    </div>
</div>
