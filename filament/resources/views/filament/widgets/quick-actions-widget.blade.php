@php
    $colorMap = [
        'blue'    => ['bg' => '#eff6ff', 'accent' => '#2563eb', 'border' => '#bfdbfe', 'dark_bg' => 'rgba(37,99,235,0.12)'],
        'green'   => ['bg' => '#f0fdf4', 'accent' => '#16a34a', 'border' => '#bbf7d0', 'dark_bg' => 'rgba(22,163,74,0.12)'],
        'emerald' => ['bg' => '#ecfdf5', 'accent' => '#059669', 'border' => '#a7f3d0', 'dark_bg' => 'rgba(5,150,105,0.12)'],
        'red'     => ['bg' => '#fef2f2', 'accent' => '#dc2626', 'border' => '#fecaca', 'dark_bg' => 'rgba(220,38,38,0.12)'],
        'purple'  => ['bg' => '#faf5ff', 'accent' => '#9333ea', 'border' => '#e9d5ff', 'dark_bg' => 'rgba(147,51,234,0.12)'],
        'indigo'  => ['bg' => '#eef2ff', 'accent' => '#4f46e5', 'border' => '#c7d2fe', 'dark_bg' => 'rgba(79,70,229,0.12)'],
        'teal'    => ['bg' => '#f0fdfa', 'accent' => '#0d9488', 'border' => '#99f6e4', 'dark_bg' => 'rgba(13,148,136,0.12)'],
        'amber'   => ['bg' => '#fffbeb', 'accent' => '#d97706', 'border' => '#fde68a', 'dark_bg' => 'rgba(217,119,6,0.12)'],
    ];
@endphp

<style>
    /* ── Quick Actions — SaaS Card Grid ── */
    .qa-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.25rem;
    }
    .qa-header-left {
        display: flex;
        align-items: center;
        gap: 0.625rem;
    }
    .qa-header-icon {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: linear-gradient(135deg, #f97316, #ef4444);
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .qa-header-icon svg {
        width: 16px;
        height: 16px;
        color: #fff;
    }
    .qa-header-title {
        font-size: 0.9375rem;
        font-weight: 700;
        color: #111827;
    }
    .dark .qa-header-title { color: #f9fafb; }
    .qa-header-sub {
        font-size: 0.75rem;
        color: #9ca3af;
        margin-top: 0.1rem;
    }

    /* Grid */
    .qa-grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 0.75rem;
    }
    @media (max-width: 1280px) { .qa-grid { grid-template-columns: repeat(4, 1fr); } }
    @media (max-width: 800px)  { .qa-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 540px)  { .qa-grid { grid-template-columns: repeat(2, 1fr); } }

    /* Card */
    .qa-card {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.625rem;
        padding: 1.25rem 0.75rem 1rem;
        background: #fff;
        border: 1px solid #f0f0f0;
        border-radius: 16px;
        text-decoration: none;
        overflow: hidden;
        transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
        cursor: pointer;
    }
    .dark .qa-card {
        background: rgba(255,255,255,0.04);
        border-color: rgba(255,255,255,0.07);
    }

    /* Bottom slide-up accent bar */
    .qa-card::after {
        content: '';
        position: absolute;
        bottom: 0; left: 0; right: 0;
        height: 3px;
        background: var(--qa-accent);
        border-radius: 0 0 16px 16px;
        transform: scaleX(0);
        transform-origin: center;
        transition: transform 0.22s ease;
    }
    .qa-card:hover::after {
        transform: scaleX(1);
    }
    .qa-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 16px 32px rgba(0,0,0,0.1);
        border-color: var(--qa-border);
    }
    .dark .qa-card:hover {
        box-shadow: 0 16px 32px rgba(0,0,0,0.35);
        border-color: var(--qa-accent);
    }

    /* Icon bubble */
    .qa-icon-wrap {
        width: 50px;
        height: 50px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--qa-bg);
        transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
                    background 0.2s ease;
        flex-shrink: 0;
    }
    .dark .qa-icon-wrap { background: var(--qa-dark-bg); }
    .qa-card:hover .qa-icon-wrap {
        transform: scale(1.12) rotate(-3deg);
    }
    .qa-icon {
        width: 22px;
        height: 22px;
        color: var(--qa-accent);
    }

    /* Label */
    .qa-label {
        font-size: 0.8rem;
        font-weight: 700;
        color: #1f2937;
        line-height: 1.35;
    }
    .dark .qa-label { color: #e5e7eb; }

    /* Arrow hint */
    .qa-arrow {
        position: absolute;
        top: 0.625rem;
        right: 0.625rem;
        width: 16px;
        height: 16px;
        color: #d1d5db;
        opacity: 0;
        transform: translate(-4px, 4px);
        transition: all 0.2s ease;
    }
    .qa-card:hover .qa-arrow {
        opacity: 1;
        transform: translate(0, 0);
        color: var(--qa-accent);
    }
</style>

<x-filament-widgets::widget>
    <x-filament::section>
        <div class="qa-header">
            <div class="qa-header-left">
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
        </div>

        <div class="qa-grid">
            @foreach($this->getActions() as $action)
                @php $c = $colorMap[$action['color']] ?? $colorMap['blue']; @endphp
                <a
                    href="{{ $action['url'] }}"
                    class="qa-card"
                    style="--qa-accent: {{ $c['accent'] }}; --qa-bg: {{ $c['bg'] }}; --qa-dark-bg: {{ $c['dark_bg'] }}; --qa-border: {{ $c['border'] }};"
                >
                    {{-- Arrow hint --}}
                    <svg class="qa-arrow" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                    </svg>

                    <div class="qa-icon-wrap">
                        <x-filament::icon :icon="$action['icon']" class="qa-icon" />
                    </div>
                    <span class="qa-label">{{ $action['label'] }}</span>
                </a>
            @endforeach
        </div>
    </x-filament::section>
</x-filament-widgets::widget>
