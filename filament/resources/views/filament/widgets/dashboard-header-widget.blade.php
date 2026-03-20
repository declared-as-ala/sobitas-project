<style>
    .dh-wrap {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }
    @media (max-width: 640px) {
        .dh-wrap { flex-direction: column; align-items: stretch; }
    }

    /* Left: icon + title + subtitle */
    .dh-brand {
        display: flex;
        align-items: center;
        gap: 0.875rem;
        min-width: 0;
    }
    .dh-brand-icon {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 0.625rem;
        background: linear-gradient(135deg, #f97316 0%, #ef4444 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .dh-brand-icon svg {
        width: 1.25rem;
        height: 1.25rem;
        color: #fff;
    }
    .dh-brand-text { min-width: 0; }
    .dh-brand-title {
        font-size: 1.125rem;
        font-weight: 700;
        color: #111827;
        margin: 0;
        line-height: 1.3;
    }
    .dark .dh-brand-title { color: #f9fafb; }
    .dh-brand-sub {
        font-size: 0.75rem;
        color: #6b7280;
        margin: 0;
        line-height: 1.3;
    }
    .dark .dh-brand-sub { color: #9ca3af; }

    /* Right: controls */
    .dh-controls {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        flex-shrink: 0;
        flex-wrap: wrap;
    }

    /* Period chips */
    .dh-preset-group {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        background: #f3f4f6;
        border-radius: 0.625rem;
        padding: 0.25rem;
    }
    .dark .dh-preset-group { background: rgba(255,255,255,0.06); }
    .dh-preset-chip {
        padding: 0.3125rem 0.75rem;
        border-radius: 0.4375rem;
        font-size: 0.8125rem;
        font-weight: 500;
        cursor: pointer;
        border: none;
        background: transparent;
        color: #6b7280;
        transition: all 0.15s ease;
        line-height: 1;
    }
    .dh-preset-chip:hover { color: #374151; background: rgba(0,0,0,0.05); }
    .dark .dh-preset-chip { color: #9ca3af; }
    .dark .dh-preset-chip:hover { color: #d1d5db; background: rgba(255,255,255,0.07); }
    .dh-preset-chip--active {
        background: #ffffff;
        color: #111827;
        font-weight: 600;
        box-shadow: 0 1px 4px rgba(0,0,0,0.1);
    }
    .dark .dh-preset-chip--active { background: rgba(255,255,255,0.12); color: #f9fafb; box-shadow: none; }

    /* Refresh button */
    .dh-refresh-btn {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.4375rem 0.875rem;
        border-radius: 0.5rem;
        font-size: 0.8125rem;
        font-weight: 500;
        cursor: pointer;
        border: 1px solid #d1d5db;
        background: #ffffff;
        color: #374151;
        transition: all 0.15s ease;
    }
    .dh-refresh-btn:hover { background: #f9fafb; border-color: #9ca3af; }
    .dh-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .dark .dh-refresh-btn { background: rgba(255,255,255,0.05); border-color: #4b5563; color: #d1d5db; }
    .dark .dh-refresh-btn:hover { background: rgba(255,255,255,0.1); }
    .dh-refresh-icon {
        width: 0.9375rem;
        height: 0.9375rem;
    }
</style>

<x-filament-widgets::widget>
    <x-filament::section>
        <div class="dh-wrap">
            {{-- Brand --}}
            <div class="dh-brand">
                <div class="dh-brand-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6.75v6.75" />
                    </svg>
                </div>
                <div class="dh-brand-text">
                    <p class="dh-brand-title">Tableau de Bord Marketplace</p>
                    <p class="dh-brand-sub">Vue d'ensemble des performances — période filtrée</p>
                </div>
            </div>

            {{-- Controls --}}
            <div class="dh-controls">
                {{-- Period preset chips --}}
                <div class="dh-preset-group">
                    @foreach($this->getPresets() as $value => $label)
                        <button
                            type="button"
                            wire:click="$set('preset', '{{ $value }}')"
                            class="dh-preset-chip {{ $this->preset === $value ? 'dh-preset-chip--active' : '' }}"
                        >
                            {{ $label }}
                        </button>
                    @endforeach
                </div>

                {{-- Refresh --}}
                <button
                    type="button"
                    wire:click="refreshStats"
                    wire:loading.attr="disabled"
                    wire:target="refreshStats"
                    class="dh-refresh-btn"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="2"
                        stroke="currentColor"
                        class="dh-refresh-icon"
                        wire:loading.class="animate-spin"
                        wire:target="refreshStats"
                    >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    <span wire:loading.remove wire:target="refreshStats">Actualiser</span>
                    <span wire:loading wire:target="refreshStats" style="display:none">…</span>
                </button>
            </div>
        </div>
    </x-filament::section>
</x-filament-widgets::widget>
