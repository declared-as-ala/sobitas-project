@php
    $gradients = [
        'blue'    => ['from' => '#3b82f6', 'mid' => '#2563eb', 'to' => '#1e40af', 'shadow' => '59,130,246'],
        'green'   => ['from' => '#22c55e', 'mid' => '#16a34a', 'to' => '#15803d', 'shadow' => '34,197,94'],
        'emerald' => ['from' => '#34d399', 'mid' => '#059669', 'to' => '#047857', 'shadow' => '5,150,105'],
        'red'     => ['from' => '#f87171', 'mid' => '#dc2626', 'to' => '#991b1b', 'shadow' => '220,38,38'],
        'purple'  => ['from' => '#c084fc', 'mid' => '#9333ea', 'to' => '#7e22ce', 'shadow' => '147,51,234'],
        'indigo'  => ['from' => '#818cf8', 'mid' => '#4f46e5', 'to' => '#3730a3', 'shadow' => '79,70,229'],
        'teal'    => ['from' => '#2dd4bf', 'mid' => '#0d9488', 'to' => '#0f766e', 'shadow' => '13,148,136'],
        'amber'   => ['from' => '#fbbf24', 'mid' => '#d97706', 'to' => '#92400e', 'shadow' => '217,119,6'],
    ];
@endphp

<x-filament-widgets::widget>
<style>
    /* ── Page header: pull title closer to top ── */
    .fi-header-heading { padding-top: 0 !important; margin-top: 0 !important; }
    .fi-page-header    { padding-top: 0.25rem !important; padding-bottom: 0.5rem !important; }

    /* ── Widget card shell: no extra top gap ── */
    .qa-card {
        background: #fff;
        border-radius: 20px;
        padding: 1.5rem 1.75rem 1.75rem;
        box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 4px 20px rgba(0,0,0,.07);
        border: 1px solid rgba(0,0,0,.06);
    }
    .dark .qa-card {
        background: #1e2433;
        border-color: rgba(255,255,255,.07);
    }

    /* ── Header ── */
    .qa-header {
        display: flex;
        align-items: center;
        gap: .75rem;
        margin-bottom: 1.375rem;
    }
    .qa-header-icon {
        width: 40px; height: 40px;
        border-radius: 11px;
        background: linear-gradient(135deg, #f97316, #ef4444);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 3px 10px rgba(239,68,68,.4);
    }
    .qa-header-icon svg { width: 20px; height: 20px; color: #fff; }
    .qa-header-title {
        font-size: 1rem;
        font-weight: 800;
        color: #0f172a;
        line-height: 1.2;
        letter-spacing: -.02em;
    }
    .dark .qa-header-title { color: #f1f5f9; }
    .qa-header-sub { font-size: .75rem; color: #94a3b8; margin-top: 1px; }

    /* ── Grid: 4 columns → 2 rows of 4 ── */
    .qa-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1.125rem;
    }
    @media (max-width: 1024px) { .qa-grid { grid-template-columns: repeat(4, 1fr); gap: .875rem; } }
    @media (max-width: 700px)  { .qa-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 380px)  { .qa-grid { grid-template-columns: 1fr 1fr; gap: .625rem; } }

    /* ── Button ── */
    .qa-btn {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: .875rem;
        padding: 2rem 1rem 1.75rem;
        border-radius: 18px;
        text-decoration: none;
        color: #fff;
        font-weight: 800;
        font-size: .875rem;
        text-align: center;
        line-height: 1.35;
        overflow: hidden;
        min-height: 140px;
        background: linear-gradient(160deg, var(--qa-from) 0%, var(--qa-mid) 55%, var(--qa-to) 100%);
        box-shadow:
            0 4px 20px rgba(var(--qa-shadow), .38),
            0 1px 0 rgba(255,255,255,.22) inset,
            0 -1px 0 rgba(0,0,0,.12) inset;
        transition: transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .22s ease, filter .2s ease;
    }
    /* top gloss shine */
    .qa-btn::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 55%;
        background: linear-gradient(180deg, rgba(255,255,255,.22) 0%, rgba(255,255,255,0) 100%);
        border-radius: inherit;
        pointer-events: none;
    }
    /* bottom depth strip */
    .qa-btn::after {
        content: '';
        position: absolute;
        bottom: 0; left: 0; right: 0;
        height: 4px;
        background: rgba(0,0,0,.18);
        border-radius: 0 0 18px 18px;
        pointer-events: none;
    }
    .qa-btn:hover {
        transform: translateY(-6px) scale(1.03);
        box-shadow:
            0 14px 36px rgba(var(--qa-shadow), .45),
            0 1px 0 rgba(255,255,255,.25) inset;
        filter: brightness(1.08);
        color: #fff;
        text-decoration: none;
    }
    .qa-btn:active {
        transform: translateY(-2px) scale(1.01);
        box-shadow: 0 6px 16px rgba(var(--qa-shadow), .35);
    }

    /* ── Icon circle ── */
    .qa-btn-icon-wrap {
        width: 56px; height: 56px;
        border-radius: 50%;
        background: rgba(255,255,255,.22);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        backdrop-filter: blur(6px);
        border: 1.5px solid rgba(255,255,255,.35);
        box-shadow: 0 2px 8px rgba(0,0,0,.12);
    }
    .qa-btn-icon-wrap svg { width: 26px; height: 26px; color: #fff; }

    /* ── Label ── */
    .qa-btn-label {
        max-width: 100%;
        font-size: .84rem;
        font-weight: 800;
        letter-spacing: -.02em;
        text-shadow: 0 1px 3px rgba(0,0,0,.2);
        line-height: 1.3;
        word-break: break-word;
    }
</style>

    <div class="qa-card">

        {{-- Header --}}
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

        {{-- 4 × 2 grid --}}
        <div class="qa-grid">
            @foreach($this->getActions() as $action)
                @php
                    $g = $gradients[$action['color']] ?? $gradients['blue'];
                @endphp
                <a
                    href="{{ $action['url'] }}"
                    class="qa-btn"
                    style="
                        --qa-from:   {{ $g['from'] }};
                        --qa-mid:    {{ $g['mid'] }};
                        --qa-to:     {{ $g['to'] }};
                        --qa-shadow: {{ $g['shadow'] }};
                    "
                >
                    <div class="qa-btn-icon-wrap">
                        <x-filament::icon :icon="$action['icon']" />
                    </div>
                    <span class="qa-btn-label">{{ $action['label'] }}</span>
                </a>
            @endforeach
        </div>

    </div>
</x-filament-widgets::widget>
