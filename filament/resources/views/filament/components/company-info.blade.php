<div class="rounded-xl bg-gray-50 dark:bg-white/5 p-4 text-sm text-gray-700 dark:text-gray-300 space-y-2 border border-gray-200/60 dark:border-white/10">
    <img src="https://admin.protein.tn/storage/coordonnees/March2026/Z2S2Ct4CwucOAWmNFzTy.png" alt="Protein.tn" class="h-14 object-contain mb-2" />
    <p class="font-semibold text-gray-900 dark:text-white text-base">{{ $coordinate->abbreviation ?? 'STE PROTEIN.TN' }}</p>
    @if(!empty($coordinate->phone_1) || !empty($coordinate->phone_2))
        <p class="flex items-center gap-1.5">
            <x-filament::icon icon="heroicon-o-phone" class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" />
            {{ $coordinate->phone_1 ?? '' }}@if(!empty($coordinate->phone_2)) / {{ $coordinate->phone_2 }}@endif
        </p>
    @endif
    @if(!empty($coordinate->adresse_fr))
        <p class="flex items-start gap-1.5">
            <x-filament::icon icon="heroicon-o-map-pin" class="w-4 h-4 shrink-0 mt-0.5 text-gray-500 dark:text-gray-400" />
            <span>{{ $coordinate->adresse_fr }}</span>
        </p>
    @endif
</div>
