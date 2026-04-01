@php
    $colors = [
        'blue'    => ['bg' => '#eff6ff', 'icon' => '#3b82f6', 'border' => '#bfdbfe', 'hover' => '#dbeafe', 'shadow' => '59,130,246'],
        'green'   => ['bg' => '#f0fdf4', 'icon' => '#16a34a', 'border' => '#bbf7d0', 'hover' => '#dcfce7', 'shadow' => '34,197,94'],
        'emerald' => ['bg' => '#ecfdf5', 'icon' => '#059669', 'border' => '#a7f3d0', 'hover' => '#d1fae5', 'shadow' => '5,150,105'],
        'red'     => ['bg' => '#fef2f2', 'icon' => '#dc2626', 'border' => '#fecaca', 'hover' => '#fee2e2', 'shadow' => '220,38,38'],
        'purple'  => ['bg' => '#faf5ff', 'icon' => '#9333ea', 'border' => '#e9d5ff', 'hover' => '#f3e8ff', 'shadow' => '147,51,234'],
        'indigo'  => ['bg' => '#eef2ff', 'icon' => '#4f46e5', 'border' => '#c7d2fe', 'hover' => '#e0e7ff', 'shadow' => '79,70,229'],
        'teal'    => ['bg' => '#f0fdfa', 'icon' => '#0d9488', 'border' => '#99f6e4', 'hover' => '#ccfbf1', 'shadow' => '13,148,136'],
        'amber'   => ['bg' => '#fffbeb', 'icon' => '#d97706', 'border' => '#fde68a', 'hover' => '#fef3c7', 'shadow' => '217,119,6'],
    ];
@endphp

<x-filament-widgets::widget>
<style>
    .qa-wrap {
        padding: 0;
    }

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
        padding: 0.625rem 0.75rem;
        border-radius: 10px;
        text-decoration: none;
        border: 1px solid var(--qa-border);
        background: var(--qa-bg);
        transition: all 0.18s ease;
        overflow: hidden;
    }
    .qa-tile:hover {
        background: var(--qa-hover);
        border-color: var(--qa-icon);
        box-shadow: 0 2px 8px rgba(var(--qa-shadow), 0.12);
        transform: translateY(-1px);
        text-decoration: none;
    }
    .qa-tile:active {
        transform: translateY(0);
        box-shadow: none;
    }

    .qa-tile-icon {
        width: 34px;
        height: 34px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        background: var(--qa-icon);
    }
    .qa-tile-icon svg {
        width: 17px;
        height: 17px;
        color: #fff;
    }

    .qa-tile-label {
        font-size: 0.8125rem;
        font-weight: 600;
        color: #1e293b;
        line-height: 1.25;
        letter-spacing: -0.01em;
    }
    .dark .qa-tile-label { color: #e2e8f0; }

    .dark .qa-tile {
        background: rgba(255,255,255,0.03);
        border-color: rgba(255,255,255,0.08);
    }
    .dark .qa-tile:hover {
        background: rgba(255,255,255,0.06);
        border-color: var(--qa-icon);
    }
</style>

    <div class="qa-wrap">
        <div class="qa-grid">
            @foreach($this->getActions() as $action)
                @php
                    $c = $colors[$action['color']] ?? $colors['blue'];
                @endphp
                <a
                    href="{{ $action['url'] }}"
                    class="qa-tile"
                    style="
                        --qa-bg: {{ $c['bg'] }};
                        --qa-icon: {{ $c['icon'] }};
                        --qa-border: {{ $c['border'] }};
                        --qa-hover: {{ $c['hover'] }};
                        --qa-shadow: {{ $c['shadow'] }};
                    "
                >
                    <div class="qa-tile-icon">
                        <x-filament::icon :icon="$action['icon']" />
                    </div>
                    <span class="qa-tile-label">{{ $action['label'] }}</span>
                </a>
            @endforeach
        </div>
    </div>

</x-filament-widgets::widget>
