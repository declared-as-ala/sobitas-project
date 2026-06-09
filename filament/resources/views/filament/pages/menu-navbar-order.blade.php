<x-filament-panels::page>
    <div class="space-y-5">

        {{-- Info banner --}}
        <div class="rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-950/20 px-5 py-4 flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5 text-blue-500 shrink-0 mt-0.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
            <p class="text-sm text-blue-800 dark:text-blue-300">
                Utilisez les flèches <strong>↑ ↓</strong> pour changer l'ordre des catégories.
                Cliquez sur une catégorie pour afficher et réordonner ses sous-catégories.
                Les changements sont appliqués immédiatement dans le menu du site.
            </p>
        </div>

        @php
            $categories   = $this->getCategories();
            $sousCategories = $this->getSousCategories();
            $totalCats    = $categories->count();
        @endphp

        {{-- Categories panel --}}
        <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-950/5 dark:bg-gray-900 dark:ring-white/10 overflow-hidden">

            {{-- Panel header --}}
            <div class="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-white/10">
                <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950/40 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>
                </div>
                <div class="flex-1 min-w-0">
                    <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Catégories du menu navbar</h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {{ $totalCats }} catégorie{{ $totalCats !== 1 ? 's' : '' }} —
                        cliquez sur une rangée pour afficher ses sous-catégories
                    </p>
                </div>
            </div>

            {{-- Category list --}}
            <div class="divide-y divide-gray-100 dark:divide-white/[0.05]">
                @foreach($categories as $index => $categ)
                    @php $isSelected = $selectedCategId === $categ->id; @endphp

                    {{-- Category row --}}
                    <div
                        wire:click="selectCategory({{ $categ->id }})"
                        class="flex items-center gap-3 px-6 py-3.5 cursor-pointer select-none transition-colors
                            {{ $isSelected
                                ? 'bg-red-50 dark:bg-red-950/25'
                                : 'hover:bg-gray-50 dark:hover:bg-white/[0.02]' }}"
                    >
                        {{-- Position badge --}}
                        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors
                            {{ $isSelected
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300' }}">
                            {{ $index + 1 }}
                        </span>

                        {{-- Name --}}
                        <span class="flex-1 text-sm font-semibold truncate
                            {{ $isSelected ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white' }}">
                            {{ $categ->designation_fr }}
                        </span>
                        <span class="hidden sm:block text-xs text-gray-400 dark:text-gray-500 font-mono shrink-0">
                            /{{ $categ->slug }}
                        </span>

                        {{-- Up / Down buttons --}}
                        <div class="flex gap-1 shrink-0" wire:click.stop="">
                            <button
                                type="button"
                                wire:click.stop="moveCategoryUp({{ $categ->id }})"
                                @disabled($index === 0)
                                class="h-7 w-7 flex items-center justify-center rounded-lg border
                                    border-gray-200 dark:border-white/10 text-gray-400
                                    hover:border-red-300 hover:bg-white hover:text-red-600
                                    dark:hover:border-red-700 dark:hover:bg-white/10 dark:hover:text-red-400
                                    disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                title="Monter"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5" aria-hidden="true"><path fill-rule="evenodd" d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clip-rule="evenodd" /></svg>
                            </button>
                            <button
                                type="button"
                                wire:click.stop="moveCategoryDown({{ $categ->id }})"
                                @disabled($loop->last)
                                class="h-7 w-7 flex items-center justify-center rounded-lg border
                                    border-gray-200 dark:border-white/10 text-gray-400
                                    hover:border-red-300 hover:bg-white hover:text-red-600
                                    dark:hover:border-red-700 dark:hover:bg-white/10 dark:hover:text-red-400
                                    disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                title="Descendre"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5" aria-hidden="true"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>
                            </button>
                        </div>

                        {{-- Expand chevron --}}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
                            class="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 {{ $isSelected ? 'rotate-90 !text-red-500' : '' }}">
                            <path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
                        </svg>
                    </div>

                    {{-- Subcategories (only when selected) --}}
                    @if($isSelected)
                        <div class="border-t border-red-100 dark:border-red-900/20 bg-red-50/40 dark:bg-red-950/10 px-6 py-3">
                            @if($sousCategories->isEmpty())
                                <p class="text-xs text-gray-400 dark:text-gray-500 italic py-1 pl-10">
                                    Aucune sous-catégorie pour {{ $categ->designation_fr }}
                                </p>
                            @else
                                <p class="text-[11px] font-semibold uppercase tracking-wider text-red-400/70 dark:text-red-500/60 mb-2 pl-10">
                                    Sous-catégories — {{ $categ->designation_fr }}
                                    <span class="ml-1 font-normal normal-case text-gray-400">({{ $sousCategories->count() }})</span>
                                </p>
                                <div class="space-y-1.5">
                                    @foreach($sousCategories as $si => $sub)
                                        <div class="flex items-center gap-3 bg-white dark:bg-white/[0.03]
                                            rounded-xl px-4 py-2.5 border border-gray-100 dark:border-white/[0.06]
                                            ml-8 hover:border-red-200 dark:hover:border-red-900/40 transition-colors">

                                            {{-- Sub position --}}
                                            <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded
                                                text-[10px] font-bold bg-red-100 dark:bg-red-950/50
                                                text-red-600 dark:text-red-400">
                                                {{ $si + 1 }}
                                            </span>

                                            {{-- Name --}}
                                            <span class="flex-1 text-sm text-gray-700 dark:text-gray-200 truncate">
                                                {{ $sub->designation_fr }}
                                            </span>
                                            <span class="hidden sm:block text-xs text-gray-400 dark:text-gray-500 font-mono shrink-0">
                                                /{{ $sub->slug }}
                                            </span>

                                            {{-- Sub Up / Down --}}
                                            <div class="flex gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    wire:click="moveSubUp({{ $sub->id }})"
                                                    @disabled($si === 0)
                                                    class="h-6 w-6 flex items-center justify-center rounded border
                                                        border-gray-200 dark:border-white/10 text-gray-400
                                                        hover:border-red-300 hover:bg-gray-50 hover:text-red-600
                                                        dark:hover:bg-white/10 dark:hover:text-red-400
                                                        disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                                    title="Monter"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-3 w-3" aria-hidden="true"><path fill-rule="evenodd" d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clip-rule="evenodd" /></svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    wire:click="moveSubDown({{ $sub->id }})"
                                                    @disabled($loop->last)
                                                    class="h-6 w-6 flex items-center justify-center rounded border
                                                        border-gray-200 dark:border-white/10 text-gray-400
                                                        hover:border-red-300 hover:bg-gray-50 hover:text-red-600
                                                        dark:hover:bg-white/10 dark:hover:text-red-400
                                                        disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                                    title="Descendre"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-3 w-3" aria-hidden="true"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    @endforeach
                                </div>
                            @endif
                        </div>
                    @endif

                @endforeach
            </div>
        </div>

    </div>
</x-filament-panels::page>
