<style>
    /* ── Status Cards ── */
    .sc-section-header {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        margin-bottom: 1.25rem;
    }
    .sc-section-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #f97316;
        box-shadow: 0 0 0 3px rgba(249,115,22,0.2);
        animation: sc-pulse 2s infinite;
    }
    @keyframes sc-pulse {
        0%, 100% { box-shadow: 0 0 0 3px rgba(249,115,22,0.2); }
        50%       { box-shadow: 0 0 0 6px rgba(249,115,22,0.05); }
    }
    .sc-section-title {
        font-size: 0.875rem;
        font-weight: 700;
        color: #374151;
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }
    .dark .sc-section-title { color: #9ca3af; }

    .sc-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 0.875rem;
    }
    @media (max-width: 1280px) { .sc-grid { grid-template-columns: repeat(4, 1fr); } }
    @media (max-width: 900px)  { .sc-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 600px)  { .sc-grid { grid-template-columns: repeat(2, 1fr); } }

    .sc-card {
        position: relative;
        background: #fff;
        border: 1px solid #f3f4f6;
        border-radius: 14px;
        padding: 1.125rem 1rem 1rem;
        overflow: hidden;
        cursor: default;
        transition: box-shadow 0.2s ease, transform 0.2s ease;
    }
    .sc-card:hover {
        box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        transform: translateY(-2px);
    }
    .dark .sc-card {
        background: rgba(255,255,255,0.04);
        border-color: rgba(255,255,255,0.08);
    }

    /* Top accent line */
    .sc-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 3px;
        background: var(--sc-accent);
        border-radius: 14px 14px 0 0;
    }

    /* Urgent pulse for cards that need attention */
    .sc-card--urgent::before {
        animation: sc-bar-pulse 2s infinite;
    }
    @keyframes sc-bar-pulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.5; }
    }

    .sc-card-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 0.75rem;
    }
    .sc-icon-wrap {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--sc-bg);
        flex-shrink: 0;
    }
    .dark .sc-icon-wrap { background: var(--sc-dark-bg); }
    .sc-icon {
        width: 18px;
        height: 18px;
        color: var(--sc-accent);
    }

    .sc-count {
        font-size: 1.875rem;
        font-weight: 800;
        color: #111827;
        line-height: 1;
        font-variant-numeric: tabular-nums;
    }
    .dark .sc-count { color: #f9fafb; }
    .sc-count--urgent { color: var(--sc-accent); }

    .sc-labels { margin-top: 0.25rem; }
    .sc-label {
        font-size: 0.8125rem;
        font-weight: 600;
        color: #374151;
        line-height: 1.3;
    }
    .dark .sc-label { color: #d1d5db; }
    .sc-sublabel {
        font-size: 0.6875rem;
        color: #9ca3af;
        font-weight: 400;
        margin-top: 0.1rem;
    }
</style>

<x-filament-widgets::widget>
    <x-filament::section>
        <div class="sc-section-header">
            <span class="sc-section-dot"></span>
            <span class="sc-section-title">État en temps réel</span>
        </div>

        <div class="sc-grid">
            @foreach($this->getStatusCards() as $card)
                <div
                    class="sc-card {{ $card['urgent'] ? 'sc-card--urgent' : '' }}"
                    style="--sc-accent: {{ $card['accent'] }}; --sc-bg: {{ $card['bg'] }}; --sc-dark-bg: {{ $card['dark_bg'] }};"
                >
                    <div class="sc-card-top">
                        <div class="sc-icon-wrap">
                            <x-filament::icon :icon="$card['icon']" class="sc-icon" />
                        </div>
                    </div>

                    <div class="sc-count {{ $card['urgent'] && $card['count'] > 0 ? 'sc-count--urgent' : '' }}">
                        {{ number_format($card['count']) }}
                    </div>
                    <div class="sc-labels">
                        <div class="sc-label">{{ $card['label'] }}</div>
                        <div class="sc-sublabel">{{ $card['sublabel'] }}</div>
                    </div>
                </div>
            @endforeach
        </div>
    </x-filament::section>
</x-filament-widgets::widget>
