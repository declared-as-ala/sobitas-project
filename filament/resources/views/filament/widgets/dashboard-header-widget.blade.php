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
        background: linear-gradient(135deg, #f97316 0%, #ef4444 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 4px 12px rgba(249,115,22,0.35);
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
        border-color: #2563eb;
        color: #2563eb;
        background: #eff6ff;
    }
    .dh-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
    .dark .dh-refresh {
        background: rgba(255,255,255,0.05);
        border-color: rgba(255,255,255,0.1);
        color: #d1d5db;
    }
    .dark .dh-refresh:hover:not(:disabled) {
        border-color: #3b82f6;
        color: #60a5fa;
        background: rgba(59,130,246,0.1);
    }
    .dh-refresh svg { width: 14px; height: 14px; }

    /* Current period badge */
    .dh-period-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.3rem 0.7rem;
        background: rgba(249,115,22,0.08);
        border: 1px solid rgba(249,115,22,0.2);
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        color: #f97316;
    }
    .dh-period-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #f97316;
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

<x-filament-widgets::widget>
    <x-filament::section>
        <div class="dh-bar">
            {{-- Brand --}}
            <div class="dh-brand">
                <div class="dh-brand-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                    </svg>
                </div>
                <div>
                    <p class="dh-brand-name">Sobitas — Admin</p>
                    <p class="dh-brand-tagline">Tableau de bord marketplace</p>
                </div>
            </div>

            {{-- Controls --}}
            <div class="dh-controls">
                {{-- Period badge --}}
                <span class="dh-period-badge">
                    <span class="dh-period-dot"></span>
                    {{ \App\Services\DateRangeFilterService::getPresets()[$this->preset] ?? $this->preset }}
                </span>

                <span class="dh-sep"></span>

                {{-- Presets --}}
                <div class="dh-presets">
                    @foreach($this->getPresets() as $value => $label)
                        <button
                            type="button"
                            wire:click="$set('preset', '{{ $value }}')"
                            wire:loading.attr="disabled"
                            wire:loading.class="opacity-50"
                            class="dh-preset-btn {{ $this->preset === $value ? 'dh-preset-btn--active' : '' }}"
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
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="2"
                        stroke="currentColor"
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
