<x-filament-widgets::widget>
{{--
    Uniform, branded quick-actions toolbar. Every action is an "Ajouter X" create
    shortcut — semantically identical — so they share ONE treatment (a soft brand-orange
    icon chip that fills solid on hover), not the old per-action rainbow that read as
    unprofessional. Colours come from the SOBITAS brand ramp (#D53B04), not 8 hues.
--}}
<style>
    .qa-wrap { padding: 0; }

    .qa-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.625rem;
    }
    @media (max-width: 900px) { .qa-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.5rem; } }
    @media (max-width: 640px) { .qa-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

    .qa-tile {
        position: relative;
        display: flex;
        align-items: center;
        gap: 0.625rem;
        padding: 0.6875rem 0.8125rem;
        border-radius: 12px;
        text-decoration: none;
        border: 1px solid #e9ebef;
        background: #fff;
        transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
    }
    .qa-tile:hover {
        border-color: #D53B04;
        box-shadow: 0 4px 14px rgba(213,59,4,0.12);
        transform: translateY(-1px);
        text-decoration: none;
    }
    .qa-tile:active { transform: translateY(0); box-shadow: none; }
    .dark .qa-tile {
        background: rgba(255,255,255,0.03);
        border-color: rgba(255,255,255,0.08);
    }
    .dark .qa-tile:hover { border-color: #D53B04; }

    .qa-tile-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        background: rgba(213,59,4,0.10);
        color: #D53B04;
        transition: background .18s ease, color .18s ease;
    }
    .qa-tile-icon svg { width: 18px; height: 18px; }
    .qa-tile:hover .qa-tile-icon { background: #D53B04; color: #fff; }
    .dark .qa-tile-icon { background: rgba(213,59,4,0.18); color: #ff8a4c; }
    .dark .qa-tile:hover .qa-tile-icon { background: #D53B04; color: #fff; }

    .qa-tile-label {
        font-size: 0.8125rem;
        font-weight: 600;
        color: #1e293b;
        line-height: 1.25;
        letter-spacing: -0.01em;
    }
    .dark .qa-tile-label { color: #e2e8f0; }
</style>

    <div class="qa-wrap">
        <div class="qa-grid">
            @foreach($this->getActions() as $action)
                <a href="{{ $action['url'] }}" class="qa-tile">
                    <div class="qa-tile-icon">
                        <x-filament::icon :icon="$action['icon']" />
                    </div>
                    <span class="qa-tile-label">{{ $action['label'] }}</span>
                </a>
            @endforeach
        </div>
    </div>

</x-filament-widgets::widget>
