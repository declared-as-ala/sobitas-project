<div class="filament-widget rounded-xl bg-white shadow-sm ring-1 ring-gray-950/5 dark:bg-gray-900 dark:ring-white/10">
    <div class="p-6">
        <div class="flex flex-wrap items-end gap-4">
            <div class="flex-1 min-w-[200px]">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 block">
                    Période
                </label>
                <select 
                    wire:model.live="preset" 
                    wire:change="updateFilter"
                    class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                    @foreach($this->getPresets() as $value => $label)
                        <option value="{{ $value }}">{{ $label }}</option>
                    @endforeach
                </select>
            </div>

            @if($preset === 'custom')
                <div class="flex-1 min-w-[150px]">
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 block">
                        Du
                    </label>
                    <input 
                        type="date" 
                        wire:model="customStart"
                        wire:change="updateFilter"
                        class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                </div>

                <div class="flex-1 min-w-[150px]">
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 block">
                        Au
                    </label>
                    <input 
                        type="date" 
                        wire:model="customEnd"
                        wire:change="updateFilter"
                        class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                </div>
            @endif

            <div class="flex items-center gap-2">
                <input 
                    type="checkbox" 
                    id="compare-toggle" 
                    wire:model="compareEnabled"
                    wire:change="updateFilter"
                    class="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900"
                />
                <label for="compare-toggle" class="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer">
                    Comparer à la période précédente
                </label>
            </div>
        </div>
    </div>
</div>
