<style>
    /* ── Header layout ── */
    .dh-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }
    @media (max-width: 640px) {
        .dh-container {
            flex-direction: column;
            align-items: stretch;
        }
    }

    .dh-left {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        min-width: 0;
    }
    .dh-left-icon {
        width: 1.5rem;
        height: 1.5rem;
        flex-shrink: 0;
        color: #6b7280;
    }
    .dark .dh-left-icon { color: #9ca3af; }

    .dh-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: #111827;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .dark .dh-title { color: #ffffff; }

    .dh-right {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
        flex-wrap: wrap;
    }

    /* ── Preset select ── */
    .dh-select {
        padding: 0.5rem 2rem 0.5rem 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
        background-color: #ffffff;
        cursor: pointer;
        outline: none;
        transition: border-color 0.15s;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8.825a.5.5 0 0 1-.354-.146l-3.5-3.5a.5.5 0 0 1 .708-.708L6 7.618l3.146-3.147a.5.5 0 0 1 .708.708l-3.5 3.5A.5.5 0 0 1 6 8.825z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 0.625rem center;
    }
    .dh-select:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 1px #3b82f6;
    }
    .dark .dh-select {
        background-color: rgba(255, 255, 255, 0.05);
        border-color: #4b5563;
        color: #d1d5db;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 8.825a.5.5 0 0 1-.354-.146l-3.5-3.5a.5.5 0 0 1 .708-.708L6 7.618l3.146-3.147a.5.5 0 0 1 .708.708l-3.5 3.5A.5.5 0 0 1 6 8.825z'/%3E%3C/svg%3E");
    }
    .dark .dh-select option {
        background-color: #1f2937;
        color: #d1d5db;
    }
</style>

<x-filament-widgets::widget>
    <x-filament::section>
        <div class="dh-container">
            {{-- Left: Icon + Title --}}
            <div class="dh-left">
                <x-filament::icon icon="heroicon-o-squares-2x2" class="dh-left-icon" />
                <h2 class="dh-title">Tableau de Bord Marketplace</h2>
            </div>

            {{-- Right: Controls --}}
            <div class="dh-right">
                <select wire:model.live="preset" class="dh-select">
                    @foreach($this->getPresets() as $value => $label)
                        <option value="{{ $value }}">{{ $label }}</option>
                    @endforeach
                </select>

                <x-filament::button
                    wire:click="refreshStats"
                    wire:loading.attr="disabled"
                    wire:target="refreshStats"
                    type="button"
                    size="sm"
                    color="gray"
                    outlined
                >
                    <x-slot name="icon">
                        <x-filament::icon
                            icon="heroicon-o-arrow-path"
                            style="width:1rem;height:1rem;"
                            wire:loading.class="animate-spin"
                            wire:target="refreshStats"
                        />
                    </x-slot>
                    <span wire:loading.remove wire:target="refreshStats">Actualiser</span>
                    <span wire:loading wire:target="refreshStats">Actualisation…</span>
                </x-filament::button>

                <x-filament::button
                    wire:click="exportData"
                    wire:loading.attr="disabled"
                    wire:target="exportData"
                    type="button"
                    size="sm"
                    color="gray"
                    outlined
                >
                    <x-slot name="icon">
                        <x-filament::icon
                            icon="heroicon-o-arrow-down-tray"
                            style="width:1rem;height:1rem;"
                            wire:loading.class="animate-spin"
                            wire:target="exportData"
                        />
                    </x-slot>
                    <span wire:loading.remove wire:target="exportData">Exporter</span>
                    <span wire:loading wire:target="exportData">Export…</span>
                </x-filament::button>
            </div>
        </div>
    </x-filament::section>
</x-filament-widgets::widget>
