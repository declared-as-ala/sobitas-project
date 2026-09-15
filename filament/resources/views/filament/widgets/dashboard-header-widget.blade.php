<x-filament-widgets::widget>
<style>
    /* ── Dashboard Header ── */
    .dh-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
    }

    /* Brand */
    .dh-brand {
        display: flex;
        align-items: center;
        gap: 0.875rem;
        min-width: 0;
    }
    .dh-brand-badge {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        background: linear-gradient(135deg, #D53B04 0%, #f2691f 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 4px 12px rgba(213,59,4,0.30);
    }
    .dh-brand-badge svg { width: 20px; height: 20px; color: #fff; }
    .dh-brand-name {
        font-size: 1.0625rem;
        font-weight: 800;
        color: #111827;
        margin: 0;
        line-height: 1.2;
        letter-spacing: -0.01em;
    }
    .dark .dh-brand-name { color: #f9fafb; }
    .dh-brand-tagline {
        font-size: 0.75rem;
        color: #9ca3af;
        margin: 0;
        margin-top: 0.1rem;
    }

    /* Controls */
    .dh-controls {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
    }

    /* Period preset group */
    .dh-presets {
        display: flex;
        align-items: center;
        background: #f3f4f6;
        border-radius: 10px;
        padding: 3px;
        gap: 2px;
    }
    .dark .dh-presets { background: rgba(255,255,255,0.06); }

    .dh-preset-btn {
        padding: 0.3rem 0.75rem;
        border-radius: 8px;
        font-size: 0.8125rem;
        font-weight: 500;
        cursor: pointer;
        border: none;
        background: transparent;
        color: #6b7280;
        transition: all 0.15s ease;
        line-height: 1;
        white-space: nowrap;
    }
    .dh-preset-btn:hover { color: #374151; background: rgba(0,0,0,0.04); }
    .dark .dh-preset-btn { color: #9ca3af; }
    .dark .dh-preset-btn:hover { color: #e5e7eb; background: rgba(255,255,255,0.06); }

    .dh-preset-btn--active {
        background: #ffffff !important;
        color: #111827 !important;
        font-weight: 700 !important;
        box-shadow: 0 1px 4px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04);
    }
    .dark .dh-preset-btn--active {
        background: rgba(255,255,255,0.14) !important;
        color: #f9fafb !important;
        box-shadow: none !important;
    }

    /* Separator */
    .dh-sep {
        width: 1px;
        height: 20px;
        background: #e5e7eb;
        flex-shrink: 0;
    }
    .dark .dh-sep { background: rgba(255,255,255,0.1); }

    /* Refresh button */
    .dh-refresh {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.4375rem 0.875rem;
        border-radius: 8px;
        border: 1.5px solid #e5e7eb;
        background: #fff;
        color: #374151;
        font-size: 0.8125rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
    }
    .dh-refresh:hover:not(:disabled) {
        border-color: #D53B04;
        color: #D53B04;
        background: #fff7ed;
    }
    .dh-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
    .dark .dh-refresh {
        background: rgba(255,255,255,0.05);
        border-color: rgba(255,255,255,0.1);
        color: #d1d5db;
    }
    .dark .dh-refresh:hover:not(:disabled) {
        border-color: #D53B04;
        color: #ff8a4c;
        background: rgba(213,59,4,0.12);
    }
    .dh-refresh svg { width: 14px; height: 14px; }

    /* Current period badge */
    .dh-period-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.3rem 0.7rem;
        background: rgba(213,59,4,0.08);
        border: 1px solid rgba(213,59,4,0.2);
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        color: #D53B04;
    }
    .dark .dh-period-badge { color: #ff8a4c; }
    .dh-period-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #D53B04;
    }

    @media (max-width: 768px) {
        .dh-bar { gap: 0.875rem; }
        .dh-presets { flex-wrap: wrap; }
        .dh-preset-btn { padding: 0.3rem 0.5rem; font-size: 0.75rem; }
    }
    @media (max-width: 540px) {
        .dh-bar { flex-direction: column; align-items: stretch; }
        .dh-controls { justify-content: space-between; }
    }
</style>

    <x-filament::section>
        {{--
            Alpine manages the active-button highlight and badge text client-side.
            DashboardHeaderWidget calls skipRender() in updatedPreset() so there is
            NO Livewire DOM morph when a preset is clicked — eliminating the multi-root
            morph bug that was wiping out sibling widgets.
        --}}
        <div
            class="dh-bar"
            x-data="{
                preset: '{{ $this->preset }}',
                labels: @js($this->getPresets())
            }"
        >
            {{-- Brand --}}
            <div class="dh-brand">
                <div class="dh-brand-badge">
                    <x-filament::icon icon="heroicon-o-building-storefront" class="dh-brand-glyph" />
                </div>
                <div>
                    <p class="dh-brand-name">Protein.tn — Admin</p>
                    <p class="dh-brand-tagline">Tableau de bord marketplace</p>
                </div>
            </div>

            {{-- Controls --}}
            <div class="dh-controls">
                {{-- Period badge — text driven by Alpine so it updates without a server re-render --}}
                <span class="dh-period-badge">
                    <span class="dh-period-dot"></span>
                    <span x-text="labels[preset] || preset"></span>
                </span>

                <span class="dh-sep"></span>

                {{-- Presets --}}
                <div class="dh-presets">
                    @foreach($this->getPresets() as $value => $label)
                        <button
                            type="button"
                            @click="preset = '{{ $value }}'; $wire.set('preset', '{{ $value }}')"
                            class="dh-preset-btn"
                            :class="{ 'dh-preset-btn--active': preset === '{{ $value }}' }"
                        >
                            {{ $label }}
                        </button>
                    @endforeach
                </div>

                <span class="dh-sep"></span>

                {{-- Refresh --}}
                <button
                    type="button"
                    wire:click="refreshStats"
                    wire:loading.attr="disabled"
                    wire:target="refreshStats"
                    class="dh-refresh"
                >
                    <x-filament::icon icon="heroicon-o-arrow-path" class="dh-refresh-glyph" wire:loading.class="animate-spin" wire:target="refreshStats" />
                    <span wire:loading.remove wire:target="refreshStats">Actualiser</span>
                    <span wire:loading wire:target="refreshStats" style="display:none">…</span>
                </button>
            </div>
        </div>
    </x-filament::section>
</x-filament-widgets::widget>
