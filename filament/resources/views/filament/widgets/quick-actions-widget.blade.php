@php
    $colorMap = [
        'blue'    => '#3b82f6',
        'green'   => '#16a34a',
        'emerald' => '#059669',
        'red'     => '#ef4444',
        'purple'  => '#8b5cf6',
        'indigo'  => '#4f46e5',
        'teal'    => '#0d9488',
        'amber'   => '#f59e0b',
    ];
@endphp

<style>
    /* ── Quick Actions — Solid Button Grid ── */
    .qa-header {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        margin-bottom: 1rem;
    }
    .qa-header-icon {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: linear-gradient(135deg, #f97316, #ef4444);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .qa-header-icon svg { width: 16px; height: 16px; color: #fff; }
    .qa-header-title {
        font-size: 0.9375rem;
        font-weight: 700;
        color: #111827;
        line-height: 1.2;
    }
    .dark .qa-header-title { color: #f9fafb; }
    .qa-header-sub {
        font-size: 0.72rem;
        color: #9ca3af;
    }

    /* Grid */
    .qa-grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 0.625rem;
    }
    @media (max-width: 1280px) { .qa-grid { grid-template-columns: repeat(4, 1fr); } }
    @media (max-width: 800px)  { .qa-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 540px)  { .qa-grid { grid-template-columns: repeat(2, 1fr); } }

    /* Solid button card */
    .qa-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 1.125rem 0.75rem;
        border-radius: 12px;
        text-decoration: none;
        color: #fff;
        font-weight: 600;
        font-size: 0.8rem;
        text-align: center;
        line-height: 1.3;
        transition: all 0.25s ease;
        box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        background-color: var(--qa-color);
    }
    .qa-btn:hover {
        transform: translateY(-3px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.2);
        color: #fff;
        text-decoration: none;
        filter: brightness(1.08);
    }
    .qa-btn:active {
        transform: translateY(-1px);
        box-shadow: 0 3px 10px rgba(0,0,0,0.15);
    }
    .qa-btn svg {
        width: 22px;
        height: 22px;
        flex-shrink: 0;
        opacity: 0.95;
    }
    .qa-btn-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
    }
</style>

<x-filament-widgets::widget>
    <x-filament::section>
        <div class="qa-header">
            <div class="qa-header-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
            </div>
            <div>
                <div class="qa-header-title">Actions Rapides</div>
                <div class="qa-header-sub">Créer rapidement</div>
            </div>
        </div>

        <div class="qa-grid">
            @foreach($this->getActions() as $action)
                @php $color = $colorMap[$action['color']] ?? '#3b82f6'; @endphp
                <a
                    href="{{ $action['url'] }}"
                    class="qa-btn"
                    style="--qa-color: {{ $color }};"
                >
                    <x-filament::icon :icon="$action['icon']" />
                    <span class="qa-btn-label">{{ $action['label'] }}</span>
                </a>
            @endforeach
        </div>
    </x-filament::section>
</x-filament-widgets::widget>
