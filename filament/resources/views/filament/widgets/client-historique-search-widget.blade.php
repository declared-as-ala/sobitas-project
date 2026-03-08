<x-filament-widgets::widget>
    <x-filament::section class="w-full max-w-full">
        <x-slot name="heading">
            <div class="flex items-center gap-2">
                <x-filament::icon icon="heroicon-o-magnifying-glass" class="fi-section-header-icon h-5 w-5 text-gray-600" />
                <span class="fi-section-header-heading text-base font-semibold text-gray-900">Recherche client</span>
            </div>
        </x-slot>
        <x-slot name="description">
            <p class="fi-section-header-description text-sm text-gray-600 mt-0.5">Saisissez le numéro de téléphone et/ou le nom pour afficher tickets, BL, factures TVA et devis.</p>
        </x-slot>

        <form wire:submit="searchHistorique" class="w-full">
            <div class="fi-fo-grid grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-x-4 md:items-end">
                <div class="fi-fo-field-wrp min-w-0 md:col-span-4 lg:col-span-3">
                    <label for="historique-tel" class="fi-fo-field-wrp-label block text-sm font-medium text-gray-900 mb-1.5">
                        Téléphone
                    </label>
                    <input
                        id="historique-tel"
                        type="tel"
                        wire:model.live.debounce.300ms="tel"
                        wire:loading.attr="readonly"
                        placeholder="Ex: 97991266 ou +216 21 004 711"
                        inputmode="numeric"
                        autocomplete="tel"
                        class="fi-input block w-full rounded-lg border-gray-300 shadow-sm outline-none transition duration-75 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 sm:text-sm text-gray-900 bg-white"
                    />
                </div>
                <div class="fi-fo-field-wrp min-w-0 md:col-span-4 lg:col-span-3">
                    <label for="historique-name" class="fi-fo-field-wrp-label block text-sm font-medium text-gray-900 mb-1.5">
                        Nom
                    </label>
                    <input
                        id="historique-name"
                        type="text"
                        wire:model.live.debounce.300ms="name"
                        wire:loading.attr="readonly"
                        placeholder="Ex: Mohamed, Société XYZ"
                        autocomplete="name"
                        class="fi-input block w-full rounded-lg border-gray-300 shadow-sm outline-none transition duration-75 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 sm:text-sm text-gray-900 bg-white"
                    />
                </div>
                <div class="flex flex-wrap items-center gap-2 min-w-0 md:col-span-4 lg:col-span-2">
                    <button
                        type="submit"
                        wire:loading.attr="disabled"
                        wire:target="searchHistorique"
                        @disabled(!$this->hasSearchCriteria())
                        class="fi-btn relative grid-flow-col items-center justify-center font-semibold outline-none transition duration-75 focus:ring-2 rounded-lg fi-size-md fi-btn-color-primary gap-1.5 px-4 py-2.5 text-sm inline-grid shadow-sm bg-primary-600 text-white hover:bg-primary-500 focus:ring-primary-500/50 disabled:opacity-50 disabled:pointer-events-none fi-ac-btn-action w-full md:w-auto"
                    >
                        <x-filament::loading-indicator wire:loading wire:target="searchHistorique" class="size-5 shrink-0" />
                        <x-filament::icon icon="heroicon-o-magnifying-glass" class="size-5 shrink-0" wire:loading.remove wire:target="searchHistorique" />
                        <span wire:loading.remove wire:target="searchHistorique">Chercher</span>
                        <span wire:loading wire:target="searchHistorique">Recherche...</span>
                    </button>
                    @if($this->hasSearchCriteria())
                        <button
                            type="button"
                            wire:click="clearHistorique"
                            wire:loading.attr="disabled"
                            wire:target="searchHistorique"
                            class="fi-btn relative grid-flow-col items-center justify-center font-medium outline-none transition duration-75 focus:ring-2 rounded-lg fi-size-md fi-btn-color-gray gap-1.5 px-3 py-2.5 text-sm inline-grid border border-gray-300 dark:border-white/10 fi-ac-btn-action shrink-0"
                        >
                            Effacer
                        </button>
                    @endif
                </div>
            </div>
        </form>
    </x-filament::section>
</x-filament-widgets::widget>
