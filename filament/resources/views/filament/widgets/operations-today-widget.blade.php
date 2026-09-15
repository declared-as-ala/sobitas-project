<x-filament-widgets::widget>
{{--
    "À traiter aujourd'hui" — actionable ops cards. Each is a link to the filtered orders/stock
    list. Tones flag urgency (brand = the main pile, danger = late, amber = restock). The late
    card gets a stronger red treatment when it is non-zero so it draws the eye.
--}}
<style>
    .ops-head { display: flex; align-items: center; gap: .75rem; margin-bottom: 1rem; }
    .ops-head-icon {
        width: 40px; height: 40px; border-radius: 11px;
        display: grid; place-items: center; flex-shrink: 0;
        background: rgba(213,59,4,.10); color: #D53B04;
    }
    .ops-head-icon svg { width: 21px; height: 21px; }
    .ops-head-title { font-size: .95rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -.01em; }
    .dark .ops-head-title { color: #f1f5f9; }
    .ops-head-sub { font-size: .78rem; color: #94a3b8; margin: .1rem 0 0; }

    .ops-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: .75rem;
    }
    @media (max-width: 1279px) { .ops-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 720px)  { .ops-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 420px)  { .ops-grid { grid-template-columns: 1fr; } }

    .ops-card {
        position: relative;
        display: block;
        padding: .9rem 1rem 1rem;
        border-radius: 14px;
        border: 1px solid #eceef2;
        background: #fff;
        text-decoration: none;
        transition: border-color .16s ease, box-shadow .16s ease, transform .16s ease;
    }
    .ops-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 22px rgba(16,24,40,.09);
        text-decoration: none;
    }
    .dark .ops-card { background: rgba(255,255,255,.03); border-color: rgba(255,255,255,.07); }

    .ops-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: .7rem; }
    .ops-chip {
        width: 36px; height: 36px; border-radius: 10px;
        display: grid; place-items: center; flex-shrink: 0;
    }
    .ops-chip svg { width: 19px; height: 19px; }
    .ops-arrow { color: #cbd5e1; transition: transform .16s ease, color .16s ease; }
    .ops-arrow svg { width: 16px; height: 16px; }
    .ops-card:hover .ops-arrow { transform: translate(2px,-2px); color: #94a3b8; }

    .ops-value { font-size: 1.7rem; font-weight: 800; line-height: 1; color: #0f172a; font-variant-numeric: tabular-nums; letter-spacing: -.02em; }
    .dark .ops-value { color: #f1f5f9; }
    .ops-label { font-size: .82rem; font-weight: 600; color: #334155; margin-top: .4rem; line-height: 1.2; }
    .dark .ops-label { color: #cbd5e1; }
    .ops-hint  { font-size: .72rem; color: #94a3b8; margin-top: .12rem; }

    /* Tones — icon chip + hover border */
    .tone-brand  .ops-chip { background: rgba(213,59,4,.11);  color: #D53B04; }
    .tone-brand:hover  { border-color: #D53B04; }
    .tone-slate  .ops-chip { background: rgba(71,85,105,.12); color: #475569; }
    .tone-slate:hover  { border-color: #94a3b8; }
    .dark .tone-slate .ops-chip { color: #94a3b8; }
    .tone-info   .ops-chip { background: rgba(37,99,235,.11); color: #2563eb; }
    .tone-info:hover   { border-color: #2563eb; }
    .tone-amber  .ops-chip { background: rgba(217,119,6,.13); color: #d97706; }
    .tone-amber:hover  { border-color: #d97706; }
    .tone-danger .ops-chip { background: rgba(220,38,38,.12); color: #dc2626; }
    .tone-danger:hover { border-color: #dc2626; }

    /* Late orders, when non-zero: stronger red so it is impossible to miss */
    .ops-card.is-alert { background: rgba(220,38,38,.05); border-color: rgba(220,38,38,.28); }
    .ops-card.is-alert .ops-value { color: #dc2626; }
    .dark .ops-card.is-alert { background: rgba(220,38,38,.10); border-color: rgba(220,38,38,.4); }
    .dark .ops-card.is-alert .ops-value { color: #f87171; }
</style>

    <x-filament::section>
        <div class="ops-head">
            <div class="ops-head-icon"><x-filament::icon icon="heroicon-o-bolt" /></div>
            <div>
                <p class="ops-head-title">À traiter aujourd'hui</p>
                <p class="ops-head-sub">Commandes et stock nécessitant une action — cliquez pour ouvrir la liste</p>
            </div>
        </div>

        <div class="ops-grid">
            @foreach ($this->getItems() as $item)
                <a
                    href="{{ $item['url'] }}"
                    class="ops-card tone-{{ $item['tone'] }}{{ $item['tone'] === 'danger' && $item['value'] > 0 ? ' is-alert' : '' }}"
                >
                    <div class="ops-top">
                        <span class="ops-chip"><x-filament::icon :icon="$item['icon']" /></span>
                        <span class="ops-arrow"><x-filament::icon icon="heroicon-m-arrow-up-right" /></span>
                    </div>
                    <div class="ops-value">{{ number_format($item['value'], 0, '.', ' ') }}</div>
                    <div class="ops-label">{{ $item['label'] }}</div>
                    <div class="ops-hint">{{ $item['hint'] }}</div>
                </a>
            @endforeach
        </div>
    </x-filament::section>
</x-filament-widgets::widget>
