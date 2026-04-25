<x-filament-panels::page>
    <div class="max-w-3xl space-y-6">
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Recherche / token QR / n° carte / téléphone</label>
            <div class="flex gap-2">
                <input type="text" wire:model="scan" wire:keydown.enter="$wire.search()"
                    class="fi-input block w-full rounded-lg border-0 bg-white px-3 py-2 text-gray-900 shadow-sm ring-1 ring-gray-950/10 dark:bg-white/5 dark:text-white dark:ring-white/20"
                    placeholder="Collez ou scannez…" autocomplete="off">
                <x-filament::button type="button" wire:click="search" color="primary">Chercher</x-filament::button>
            </div>
        </div>

        @if($result)
            @if(isset($result['error']))
                <div class="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-4 text-amber-900 dark:text-amber-100">
                    {{ $result['error'] }}
                </div>
            @else
                <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                    <h3 class="text-lg font-semibold">{{ $result['client_name'] }}</h3>
                    <p class="text-sm">Tél. {{ $result['phone'] ?? '—' }} · {{ $result['email'] ?? '—' }}</p>
                    <p class="text-sm">Carte <strong>{{ $result['card_number'] }}</strong> · Statut {{ $result['card_status'] }}</p>
                    <p class="text-xl font-bold text-emerald-700 dark:text-emerald-400">{{ number_format((int) $result['points'], 0, ',', ' ') }} pts
                        ≈ {{ number_format((float) $result['value_dt'], 3, ',', ' ') }} DT</p>
                    <div class="flex flex-wrap gap-2 pt-2">
                        <a href="{{ \App\Filament\Pages\TicketPosPage::getUrl([]) }}?client_id={{ $result['client_id'] }}"
                           class="fi-btn relative grid-flow-col items-center justify-center font-semibold outline-none transition duration-75 fi-btn-color-gray fi-btn-variant-outlined fi-size-md fi-btn-label gap-1.5 px-3 py-2 text-sm inline-flex rounded-lg ring-1 ring-gray-950/10 dark:ring-white/20">
                            Nouveau ticket POS
                        </a>
                    </div>
                </div>
                @if(!empty($result['tickets']))
                    <div class="text-sm">
                        <p class="font-semibold mb-2">Tickets récents</p>
                        <ul class="list-disc pl-5 space-y-1">
                            @foreach($result['tickets'] as $t)
                                <li>{{ $t['numero'] }} — {{ $t['date'] }} — {{ $t['total'] }} DT</li>
                            @endforeach
                        </ul>
                    </div>
                @endif
                @if(!empty($result['transactions']))
                    <div class="text-sm">
                        <p class="font-semibold mb-2">Mouvements récents</p>
                        <ul class="list-disc pl-5 space-y-1">
                            @foreach($result['transactions'] as $x)
                                <li>{{ $x['date'] }} · {{ $x['type'] }} · {{ $x['pts'] }} pts — {{ $x['desc'] }}</li>
                            @endforeach
                        </ul>
                    </div>
                @endif
            @endif
        @endif
    </div>
</x-filament-panels::page>
