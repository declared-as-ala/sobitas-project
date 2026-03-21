<x-filament-widgets::widget>
<style>
    /* ── KPI Cards ─────────────────────────────────────────── */
    .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
    }
    @media (max-width: 1280px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px)  { .kpi-grid { grid-template-columns: 1fr; } }

    .kpi-card {
        position: relative;
        background: #fff;
        border-radius: 16px;
        padding: 1.25rem 1.25rem 1rem;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04);
        transition: box-shadow .2s ease, transform .2s ease;
        border: 1px solid rgba(0,0,0,.05);
    }
    .dark .kpi-card {
        background: #1e2433;
        border-color: rgba(255,255,255,.06);
    }
    .kpi-card:hover {
        box-shadow: 0 8px 28px rgba(0,0,0,.10);
        transform: translateY(-2px);
    }

    /* Top accent bar */
    .kpi-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 3px;
        border-radius: 16px 16px 0 0;
    }
    .kpi-card.color-success::before { background: linear-gradient(90deg,#10b981,#34d399); }
    .kpi-card.color-danger::before  { background: linear-gradient(90deg,#ef4444,#f87171); }
    .kpi-card.color-primary::before { background: linear-gradient(90deg,#6366f1,#818cf8); }
    .kpi-card.color-warning::before { background: linear-gradient(90deg,#f59e0b,#fbbf24); }

    /* Icon bubble */
    .kpi-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .kpi-card.color-success .kpi-icon { background: rgba(16,185,129,.12); color: #059669; }
    .kpi-card.color-danger  .kpi-icon { background: rgba(239,68,68,.12);   color: #dc2626; }
    .kpi-card.color-primary .kpi-icon { background: rgba(99,102,241,.12);  color: #4f46e5; }
    .kpi-card.color-warning .kpi-icon { background: rgba(245,158,11,.12);  color: #d97706; }

    .kpi-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: .75rem;
    }

    .kpi-label {
        font-size: .72rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: .07em;
        color: #9ca3af;
        margin-top: .1rem;
        line-height: 1.4;
        flex: 1;
        padding-right: .5rem;
    }
    .dark .kpi-label { color: #6b7280; }

    .kpi-value {
        font-size: 1.65rem;
        font-weight: 800;
        color: #111827;
        line-height: 1.15;
        letter-spacing: -.02em;
        margin-bottom: .35rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .dark .kpi-value { color: #f3f4f6; }

    /* Make the revenue card value slightly smaller since it's long */
    .kpi-card.wide-value .kpi-value {
        font-size: 1.25rem;
    }

    .kpi-desc {
        display: flex;
        align-items: center;
        gap: .3rem;
        font-size: .78rem;
        font-weight: 500;
        margin-top: .25rem;
    }
    .kpi-desc-icon svg {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
    }
    .kpi-card.color-success .kpi-desc { color: #059669; }
    .kpi-card.color-danger  .kpi-desc { color: #dc2626; }
    .kpi-card.color-primary .kpi-desc { color: #4f46e5; }
    .kpi-card.color-warning .kpi-desc { color: #d97706; }

    /* Sparkline */
    .kpi-sparkline {
        margin-top: .9rem;
        height: 36px;
        width: 100%;
        position: relative;
    }
    .kpi-sparkline svg {
        width: 100%;
        height: 100%;
        display: block;
    }

    /* Decorative background circle */
    .kpi-bg-circle {
        position: absolute;
        bottom: -20px;
        right: -20px;
        width: 90px;
        height: 90px;
        border-radius: 50%;
        opacity: .045;
        pointer-events: none;
    }
    .kpi-card.color-success .kpi-bg-circle { background: #10b981; }
    .kpi-card.color-danger  .kpi-bg-circle { background: #ef4444; }
    .kpi-card.color-primary .kpi-bg-circle { background: #6366f1; }
    .kpi-card.color-warning .kpi-bg-circle { background: #f59e0b; }
</style>

@php
    $stats = $this->getStats();

    $colorMap = [
        'success' => 'color-success',
        'danger'  => 'color-danger',
        'primary' => 'color-primary',
        'warning' => 'color-warning',
    ];

    /* Map icon name → inline SVG path */
    $iconPaths = [
        'heroicon-m-arrow-trending-up'   => 'M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941',
        'heroicon-m-arrow-trending-down' => 'M2.25 6 9 12.75l4.306-4.306a11.95 11.95 0 0 1 5.814 5.518l2.74 1.22m0 0-5.94 2.281m5.94-2.28-2.28-5.941',
        'heroicon-m-cube'                => 'm21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9',
        'heroicon-m-users'               => 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
        'heroicon-m-shopping-cart'       => 'M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z',
    ];

    /* Build SVG sparkline from chart data */
    function buildSparklinePath(array $data, string $colorClass): string {
        if (count($data) < 2) return '';
        $w = 200; $h = 36;
        $min = min($data); $max = max($data);
        $range = max($max - $min, 0.001);
        $step = $w / (count($data) - 1);
        $pts = [];
        foreach ($data as $i => $v) {
            $x = round($i * $step, 2);
            $y = round($h - (($v - $min) / $range) * ($h * 0.8) - $h * 0.1, 2);
            $pts[] = "$x,$y";
        }
        $polyline = implode(' ', $pts);

        $colorFill = match($colorClass) {
            'color-success' => 'rgba(16,185,129,',
            'color-danger'  => 'rgba(239,68,68,',
            'color-primary' => 'rgba(99,102,241,',
            default         => 'rgba(245,158,11,',
        };
        $stroke = match($colorClass) {
            'color-success' => '#10b981',
            'color-danger'  => '#ef4444',
            'color-primary' => '#6366f1',
            default         => '#f59e0b',
        };

        /* Closed area path for fill */
        $first = $pts[0]; $last = $pts[count($pts)-1];
        [$lx] = explode(',', $last);
        [$fx] = explode(',', $first);
        $areaD = "M $polyline L $lx,$h L $fx,$h Z";

        return '<svg viewBox="0 0 '.$w.' '.$h.'" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'
            . '<path d="'.$areaD.'" fill="'.$colorFill.'0.12)" />'
            . '<polyline points="'.$polyline.'" fill="none" stroke="'.$stroke.'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
            . '</svg>';
    }
@endphp

<div class="kpi-grid">
    @foreach ($stats as $stat)
        @php
            $colorClass = $colorMap[$stat->getColor() ?? 'primary'] ?? 'color-primary';
            $chartData  = $stat->getChart() ?? [];
            $hasChart   = count($chartData) >= 2;
            $isWide     = strlen((string) $stat->getValue()) > 10;
        @endphp

        <div class="kpi-card {{ $colorClass }}{{ $isWide ? ' wide-value' : '' }}">
            <div class="kpi-bg-circle"></div>

            <div class="kpi-header">
                <span class="kpi-label">{{ $stat->getLabel() }}</span>

                @if ($stat->getDescriptionIcon())
                    <div class="kpi-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                             stroke-width="2" stroke="currentColor" width="22" height="22">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                  d="{{ $iconPaths[$stat->getDescriptionIcon()] ?? 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' }}" />
                        </svg>
                    </div>
                @endif
            </div>

            <div class="kpi-value">{{ $stat->getValue() }}</div>

            @if ($stat->getDescription())
                <div class="kpi-desc">
                    @if ($stat->getDescriptionIcon())
                        <span class="kpi-desc-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                 stroke-width="2.5" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                      d="{{ $iconPaths[$stat->getDescriptionIcon()] ?? '' }}" />
                            </svg>
                        </span>
                    @endif
                    <span>{{ $stat->getDescription() }}</span>
                </div>
            @endif

            @if ($hasChart)
                <div class="kpi-sparkline">
                    {!! buildSparklinePath($chartData, $colorClass) !!}
                </div>
            @endif
        </div>
    @endforeach
</div>
</x-filament-widgets::widget>
