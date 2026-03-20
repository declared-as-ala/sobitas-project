<style>
    .qa-strip {
        display: flex;
        align-items: stretch;
        gap: 0.5rem;
        flex-wrap: wrap;
    }
    .qa-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border-radius: 0.625rem;
        text-decoration: none;
        font-size: 0.8125rem;
        font-weight: 600;
        transition: all 0.18s ease;
        white-space: nowrap;
        border: 1px solid transparent;
        flex: 1;
        justify-content: center;
        min-width: 120px;
    }
    .qa-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 3px 10px rgba(0,0,0,0.12);
    }
    .qa-btn-icon {
        width: 1.1rem;
        height: 1.1rem;
        flex-shrink: 0;
    }

    /* Light color variants */
    .qa-btn-blue    { background:#eff6ff; color:#2563eb; border-color:#bfdbfe; }
    .qa-btn-green   { background:#f0fdf4; color:#16a34a; border-color:#bbf7d0; }
    .qa-btn-emerald { background:#ecfdf5; color:#059669; border-color:#a7f3d0; }
    .qa-btn-red     { background:#fef2f2; color:#dc2626; border-color:#fecaca; }
    .qa-btn-purple  { background:#faf5ff; color:#9333ea; border-color:#e9d5ff; }
    .qa-btn-indigo  { background:#eef2ff; color:#4f46e5; border-color:#c7d2fe; }
    .qa-btn-teal    { background:#f0fdfa; color:#0d9488; border-color:#99f6e4; }
    .qa-btn-amber   { background:#fffbeb; color:#d97706; border-color:#fde68a; }

    /* Dark mode */
    .dark .qa-btn-blue    { background:rgba(30,58,138,0.25);   color:#60a5fa; border-color:rgba(96,165,250,0.2); }
    .dark .qa-btn-green   { background:rgba(20,83,45,0.25);    color:#4ade80; border-color:rgba(74,222,128,0.2); }
    .dark .qa-btn-emerald { background:rgba(6,78,59,0.25);     color:#34d399; border-color:rgba(52,211,153,0.2); }
    .dark .qa-btn-red     { background:rgba(127,29,29,0.25);   color:#f87171; border-color:rgba(248,113,113,0.2); }
    .dark .qa-btn-purple  { background:rgba(88,28,135,0.25);   color:#c084fc; border-color:rgba(192,132,252,0.2); }
    .dark .qa-btn-indigo  { background:rgba(49,46,129,0.25);   color:#818cf8; border-color:rgba(129,140,248,0.2); }
    .dark .qa-btn-teal    { background:rgba(19,78,74,0.25);    color:#2dd4bf; border-color:rgba(45,212,191,0.2); }
    .dark .qa-btn-amber   { background:rgba(120,53,15,0.25);   color:#fbbf24; border-color:rgba(251,191,36,0.2); }

    @media (max-width: 900px) {
        .qa-btn { flex: none; width: calc(50% - 0.25rem); min-width: 0; }
    }
    @media (max-width: 480px) {
        .qa-btn { width: 100%; flex: none; }
    }
</style>

<x-filament-widgets::widget>
    <x-filament::section>
        <x-slot name="heading">
            Actions Rapides
        </x-slot>

        <div class="qa-strip">
            @foreach($this->getActions() as $action)
                <a href="{{ $action['url'] }}" class="qa-btn qa-btn-{{ $action['color'] }}">
                    <x-filament::icon :icon="$action['icon']" class="qa-btn-icon" />
                    <span>{{ $action['label'] }}</span>
                </a>
            @endforeach
        </div>
    </x-filament::section>
</x-filament-widgets::widget>
