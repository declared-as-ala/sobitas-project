<style>
    /* ── Quick Actions Grid ── */
    .qa-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
    }
    @media (max-width: 640px) {
        .qa-grid { grid-template-columns: repeat(2, 1fr); }
    }

    /* ── Tile base ── */
    .qa-tile {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 1.25rem 0.75rem;
        border-radius: 0.75rem;
        text-decoration: none;
        transition: all 0.2s ease;
    }
    .qa-tile:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .qa-tile-icon {
        width: 1.75rem;
        height: 1.75rem;
        margin-bottom: 0.625rem;
    }
    .qa-tile-label {
        font-size: 0.875rem;
        font-weight: 600;
        text-align: center;
    }

    /* ── Color variants: light ── */
    .qa-tile-blue   { background: #eff6ff; }
    .qa-tile-blue .qa-tile-icon, .qa-tile-blue .qa-tile-label { color: #2563eb; }

    .qa-tile-green  { background: #f0fdf4; }
    .qa-tile-green .qa-tile-icon, .qa-tile-green .qa-tile-label { color: #16a34a; }

    .qa-tile-emerald { background: #ecfdf5; }
    .qa-tile-emerald .qa-tile-icon, .qa-tile-emerald .qa-tile-label { color: #059669; }

    .qa-tile-red    { background: #fef2f2; }
    .qa-tile-red .qa-tile-icon, .qa-tile-red .qa-tile-label { color: #ef4444; }

    .qa-tile-purple { background: #faf5ff; }
    .qa-tile-purple .qa-tile-icon, .qa-tile-purple .qa-tile-label { color: #9333ea; }

    .qa-tile-indigo { background: #eef2ff; }
    .qa-tile-indigo .qa-tile-icon, .qa-tile-indigo .qa-tile-label { color: #4f46e5; }

    .qa-tile-teal   { background: #f0fdfa; }
    .qa-tile-teal .qa-tile-icon, .qa-tile-teal .qa-tile-label { color: #0d9488; }

    .qa-tile-amber  { background: #fffbeb; }
    .qa-tile-amber .qa-tile-icon, .qa-tile-amber .qa-tile-label { color: #d97706; }

    /* ── Color variants: dark mode ── */
    .dark .qa-tile-blue   { background: rgba(30, 58, 138, 0.3); }
    .dark .qa-tile-blue .qa-tile-icon, .dark .qa-tile-blue .qa-tile-label { color: #60a5fa; }

    .dark .qa-tile-green  { background: rgba(20, 83, 45, 0.3); }
    .dark .qa-tile-green .qa-tile-icon, .dark .qa-tile-green .qa-tile-label { color: #4ade80; }

    .dark .qa-tile-emerald { background: rgba(6, 78, 59, 0.3); }
    .dark .qa-tile-emerald .qa-tile-icon, .dark .qa-tile-emerald .qa-tile-label { color: #34d399; }

    .dark .qa-tile-red    { background: rgba(127, 29, 29, 0.3); }
    .dark .qa-tile-red .qa-tile-icon, .dark .qa-tile-red .qa-tile-label { color: #f87171; }

    .dark .qa-tile-purple { background: rgba(88, 28, 135, 0.3); }
    .dark .qa-tile-purple .qa-tile-icon, .dark .qa-tile-purple .qa-tile-label { color: #c084fc; }

    .dark .qa-tile-indigo { background: rgba(49, 46, 129, 0.3); }
    .dark .qa-tile-indigo .qa-tile-icon, .dark .qa-tile-indigo .qa-tile-label { color: #818cf8; }

    .dark .qa-tile-teal   { background: rgba(19, 78, 74, 0.3); }
    .dark .qa-tile-teal .qa-tile-icon, .dark .qa-tile-teal .qa-tile-label { color: #2dd4bf; }

    .dark .qa-tile-amber  { background: rgba(120, 53, 15, 0.3); }
    .dark .qa-tile-amber .qa-tile-icon, .dark .qa-tile-amber .qa-tile-label { color: #fbbf24; }
</style>

<x-filament-widgets::widget>
    <x-filament::section>
        <x-slot name="heading">
            Actions Rapides
        </x-slot>

        <div class="qa-grid">
            @foreach($this->getActions() as $action)
                <a href="{{ $action['url'] }}" class="qa-tile qa-tile-{{ $action['color'] }}">
                    <x-filament::icon
                        :icon="$action['icon']"
                        class="qa-tile-icon"
                    />
                    <span class="qa-tile-label">{{ $action['label'] }}</span>
                </a>
            @endforeach
        </div>
    </x-filament::section>
</x-filament-widgets::widget>
