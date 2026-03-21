@php
    $gradients = [
        'blue'    => ['from' => '#3b82f6', 'to' => '#1d4ed8'],
        'green'   => ['from' => '#22c55e', 'to' => '#15803d'],
        'emerald' => ['from' => '#10b981', 'to' => '#047857'],
        'red'     => ['from' => '#f87171', 'to' => '#dc2626'],
        'purple'  => ['from' => '#a78bfa', 'to' => '#7c3aed'],
        'indigo'  => ['from' => '#818cf8', 'to' => '#4338ca'],
        'teal'    => ['from' => '#2dd4bf', 'to' => '#0f766e'],
        'amber'   => ['from' => '#fbbf24', 'to' => '#b45309'],
    ];
@endphp

<x-filament-widgets::widget>
<style>
    /* ── Quick Actions ── */
    .qa-wrap { display: flex; flex-direction: column; gap: 1rem; }

    .qa-header {
        display: flex;
        align-items: center;
        gap: 0.625rem;
    }
    .qa-header-icon {
        width: 34px; height: 34px;
        border-radius: 9px;
        background: linear-gradient(135deg, #f97316, #ef4444);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(239,68,68,.35);
    }
    .qa-header-icon svg { width: 17px; height: 17px; color: #fff; }
    .qa-header-title { font-size: .9375rem; font-weight: 700; color: #111827; line-height: 1.2; }
    .dark .qa-header-title { color: #f9fafb; }
    .qa-header-sub { font-size: .72rem; color: #9ca3af; }

    /* Grid */
    .qa-grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: .625rem;
    }
    @media (max-width: 1280px) { .qa-grid { grid-template-columns: repeat(4, 1fr); } }
    @media (max-width: 800px)  { .qa-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 480px)  { .qa-grid { grid-template-columns: repeat(2, 1fr); } }

    /* Button */
    .qa-btn {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: .5rem;
        padding: 1.25rem .75rem 1rem;
        border-radius: 14px;
        text-decoration: none;
        color: #fff;
        font-weight: 700;
        font-size: .78rem;
        text-align: center;
        line-height: 1.3;
        overflow: hidden;
        background: linear-gradient(145deg, var(--qa-from), var(--qa-to));
        box-shadow: 0 3px 10px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.18);
        transition: transform .2s ease, box-shadow .2s ease, filter .2s ease;
    }
    /* shine overlay */
    .qa-btn::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(160deg, rgba(255,255,255,.18) 0%, rgba(255,255,255,0) 55%);
        border-radius: inherit;
        pointer-events: none;
    }
    .qa-btn:hover {
        transform: translateY(-4px) scale(1.02);
        box-shadow: 0 10px 28px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.18);
        filter: brightness(1.07);
        color: #fff;
        text-decoration: none;
    }
    .qa-btn:active {
        transform: translateY(-1px) scale(1);
        box-shadow: 0 4px 12px rgba(0,0,0,.18);
    }

    /* Icon circle */
    .qa-btn-icon-wrap {
        width: 40px; height: 40px;
        border-radius: 50%;
        background: rgba(255,255,255,.2);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        backdrop-filter: blur(4px);
        border: 1px solid rgba(255,255,255,.25);
    }
    .qa-btn-icon-wrap svg { width: 20px; height: 20px; color: #fff; }

    .qa-btn-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        letter-spacing: -.01em;
        text-shadow: 0 1px 2px rgba(0,0,0,.15);
    }
</style>

    <x-filament::section>
        <div class="qa-wrap">
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
                    @php
                        $g = $gradients[$action['color']] ?? ['from' => '#3b82f6', 'to' => '#1d4ed8'];
                    @endphp
                    <a
                        href="{{ $action['url'] }}"
                        class="qa-btn"
                        style="--qa-from: {{ $g['from'] }}; --qa-to: {{ $g['to'] }};"
                    >
                        <div class="qa-btn-icon-wrap">
                            <x-filament::icon :icon="$action['icon']" />
                        </div>
                        <span class="qa-btn-label">{{ $action['label'] }}</span>
                    </a>
                @endforeach
            </div>
        </div>
    </x-filament::section>
</x-filament-widgets::widget>
