<div
    x-data="{
        handleKeydown(e) {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); $refs.searchInput && $refs.searchInput.focus(); return; }
            if (!@js($open)) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); $wire.moveSelection(1); }
            if (e.key === 'ArrowUp') { e.preventDefault(); $wire.moveSelection(-1); }
            if (e.key === 'Enter') { e.preventDefault(); $wire.selectResult(); }
            if (e.key === 'Escape') { $wire.close(); }
        }
    }"
    x-on:keydown.window="handleKeydown($event)"
    class="relative w-full max-w-xl"
>
    <div class="fi-input-wrp relative flex items-center rounded-lg border border-gray-300 bg-white shadow-sm dark:border-white/10 dark:bg-white/5 fi-focused:ring-2 fi-focused:ring-primary-500/50 dark:fi-focused:ring-primary-400/50">
        <span class="fi-input-icon-wrapper flex items-center justify-center text-gray-400 dark:text-gray-500 pl-3">
            <x-heroicon-o-magnifying-glass class="h-5 w-5" />
        </span>
        <input
            x-ref="searchInput"
            type="text"
            wire:model.live.debounce.300ms="query"
            placeholder="Recherche globale (Ctrl+K) — clients, produits, commandes…"
            class="fi-input block w-full border-0 bg-transparent py-2.5 pl-10 pr-3 text-base text-gray-950 placeholder:text-gray-400 focus:ring-0 dark:text-white dark:placeholder:text-gray-500 sm:leading-6"
            autocomplete="off"
            @focus="$wire.query.length >= 2 && ($wire.open = true)"
        />
    </div>

    @if($open)
        <div
            class="absolute left-0 right-0 top-full z-50 mt-1 max-h-[70vh] overflow-auto rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
            x-on:click.outside="$wire.close()"
        >
            @php
                $flat = $component->getFlatResults();
                $hasError = isset($groups['_error']);
            @endphp
            @if(empty($groups) || $hasError)
                <div class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                    @if($hasError)
                        {{ $groups['_error'][0]['label'] ?? 'Erreur' }}
                    @else
                        Aucun résultat
                    @endif
                </div>
            @else
                @foreach($groups as $groupLabel => $items)
                    @if($groupLabel === '_error') @continue @endif
                    <div class="border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <div class="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/80">
                            {{ $groupLabel }}
                        </div>
                        @foreach($items as $idx => $item)
                            @php
                                $globalIndex = 0;
                                foreach ($groups as $lbl => $its) {
                                    if ($lbl === $groupLabel) {
                                        $globalIndex += $idx;
                                        break;
                                    }
                                    $globalIndex += count($its);
                                }
                            @endphp
                            <a
                                href="{{ $item['url'] }}"
                                wire:key="res-{{ $groupLabel }}-{{ $item['id'] }}"
                                wire:click.prevent="selectResultByIndex({{ $globalIndex }})"
                                class="fi-global-search-result flex items-center gap-3 px-3 py-2.5 text-left transition hover:bg-gray-50 dark:hover:bg-gray-700/50 {{ $globalIndex === $selectedIndex ? 'fi-bg-primary/10 dark:fi-bg-primary/20' : '' }}"
                                @if($globalIndex === $selectedIndex) id="global-search-selected" @endif
                            >
                                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                    <x-filament::icon :icon="$item['icon']" class="h-5 w-5" />
                                </span>
                                <div class="min-w-0 flex-1">
                                    <div class="font-medium text-gray-900 dark:text-white truncate">{{ $item['label'] }}</div>
                                    @if(!empty($item['subtitle']))
                                        <div class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ $item['subtitle'] }}</div>
                                    @endif
                                </div>
                            </a>
                        @endforeach
                    </div>
                @endforeach
            @endif
        </div>
    @endif
</div>
