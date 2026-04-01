@php
    $gradients = [
        'blue'    => ['from' => '#60a5fa', 'mid' => '#3b82f6', 'to' => '#2563eb', 'shadow' => '59,130,246'],
        'green'   => ['from' => '#4ade80', 'mid' => '#22c55e', 'to' => '#16a34a', 'shadow' => '34,197,94'],
        'emerald' => ['from' => '#34d399', 'mid' => '#10b981', 'to' => '#059669', 'shadow' => '16,185,129'],
        'red'     => ['from' => '#f87171', 'mid' => '#ef4444', 'to' => '#dc2626', 'shadow' => '239,68,68'],
        'purple'  => ['from' => '#c084fc', 'mid' => '#a855f7', 'to' => '#9333ea', 'shadow' => '168,85,247'],
        'indigo'  => ['from' => '#818cf8', 'mid' => '#6366f1', 'to' => '#4f46e5', 'shadow' => '99,102,241'],
        'teal'    => ['from' => '#2dd4bf', 'mid' => '#14b8a6', 'to' => '#0d9488', 'shadow' => '20,184,166'],
        'amber'   => ['from' => '#fbbf24', 'mid' => '#f59e0b', 'to' => '#d97706', 'shadow' => '245,158,11'],
    ];
@endphp

<x-filament-widgets::widget>
<style>
    /* ── Hide the generic page header ("Tableau de bord") completely ── */
    body:has(.qa-card) .fi-header {
        display: none !important;
    }
    /* Pull content closer to the top to reduce empty vertical space */
    body:has(.qa-card) .fi-main {
        padding-top: 1.5rem !important;
    }

    /* ── Widget card shell ── */
    .qa-card {
        background: #fff;
        border-radius: 16px;
        padding: 1.5rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); /* Premium soft shadow */
        border: 1px solid rgba(0,0,0,.05);
        opacity: 0;
        animation: fadeUp 0.6s ease-out forwards; /* Subtle animation on load */
    }
    
    @keyframes fadeUp {
        0% { opacity: 0; transform: translateY(15px); }
        100% { opacity: 1; transform: translateY(0); }
    }

    .dark .qa-card {
        background: #1e293b;
        border-color: rgba(255,255,255,.05);
    }

    /* ── Header ── */
    .qa-header {
        display: flex;
        align-items: center;
        gap: .875rem;
        margin-bottom: 1.5rem; /* Clean gap before items */
    }
    .qa-header-icon {
        width: 44px; height: 44px;
        border-radius: 12px;
        background: linear-gradient(135deg, #f97316, #ef4444);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 4px 10px rgba(239,68,68,.3);
    }
    .qa-header-icon svg { width: 22px; height: 22px; color: #fff; }
    .qa-header-title {
        font-size: 1.125rem;
        font-weight: 700;
        color: #0f172a;
        line-height: 1.2;
    }
    .dark .qa-header-title { color: #f1f5f9; }
    .qa-header-sub { font-size: .8125rem; color: #64748b; margin-top: 2px; font-weight: 500; }
    .dark .qa-header-sub { color: #94a3b8; }

    /* ── Grid Layout ── */
    .qa-grid {
        display: grid !important;
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 1.15rem; /* ~18px gap */
    }
    @media (max-width: 1024px) { 
        .qa-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 1rem; } 
    }
    @media (max-width: 768px) { 
        .qa-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 1rem; } 
    }
    @media (max-width: 480px) { 
        .qa-grid { grid-template-columns: repeat(1, 1fr) !important; gap: 0.85rem; } 
    }

    /* ── Button Action Cards ── */
    .qa-btn {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem; /* Better spacing inside */
        padding: 1.5rem 1rem;
        border-radius: 16px; /* Smooth rounded corners */
        text-decoration: none !important;
        color: #fff !important;
        font-weight: 700; /* Bold title */
        font-size: 0.95rem; /* Improved typography */
        text-align: center;
        line-height: 1.35;
        overflow: hidden;
        min-height: 135px;
        background: linear-gradient(135deg, var(--qa-from) 0%, var(--qa-mid) 60%, var(--qa-to) 100%);
        box-shadow: 0 4px 15px rgba(var(--qa-shadow), 0.25);
        transition: all 0.2s ease-in-out;
        cursor: pointer;
    }

    /* Subtle glowing glass effect top */
    .qa-btn::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 1.75rem;
        background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%);
        border-radius: inherit;
        pointer-events: none;
    }

    /* ── Hover Effects ── */
    .qa-btn:hover {
        transform: translateY(-4px) scale(1.02);
        box-shadow: 0 12px 25px rgba(var(--qa-shadow), 0.35); /* scale + elevation */
    }

    .qa-btn:active {
        transform: translateY(0) scale(0.98);
        box-shadow: 0 4px 10px rgba(var(--qa-shadow), 0.2);
    }

    /* ── Icon circle ── */
    .qa-btn-icon-wrap {
        width: 52px; height: 52px;
        border-radius: 50%;
        background: rgba(255,255,255,0.2) !important; /* Soft background inner circle */
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        /* backdrop-filter: blur(4px); */
    }
    .qa-btn-icon-wrap svg { 
        width: 28px; height: 28px; /* Slightly bigger */
        color: #fff; 
    }

    /* ── Label ── */
    .qa-btn-label {
        max-width: 100%;
        text-shadow: 0 1px 2px rgba(0,0,0,0.15); /* Boost readability */
        word-break: break-word;
        letter-spacing: 0.01em;
    }

    /* ── Staggered Reveal Animation ── */
    .qa-btn:nth-child(1) { animation: fadeUp 0.6s 0.05s ease-out forwards; opacity: 0; }
    .qa-btn:nth-child(2) { animation: fadeUp 0.6s 0.10s ease-out forwards; opacity: 0; }
    .qa-btn:nth-child(3) { animation: fadeUp 0.6s 0.15s ease-out forwards; opacity: 0; }
    .qa-btn:nth-child(4) { animation: fadeUp 0.6s 0.20s ease-out forwards; opacity: 0; }
    .qa-btn:nth-child(5) { animation: fadeUp 0.6s 0.25s ease-out forwards; opacity: 0; }
    .qa-btn:nth-child(6) { animation: fadeUp 0.6s 0.30s ease-out forwards; opacity: 0; }
    .qa-btn:nth-child(7) { animation: fadeUp 0.6s 0.35s ease-out forwards; opacity: 0; }
    .qa-btn:nth-child(8) { animation: fadeUp 0.6s 0.40s ease-out forwards; opacity: 0; }
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

        {{-- Grid --}}
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
