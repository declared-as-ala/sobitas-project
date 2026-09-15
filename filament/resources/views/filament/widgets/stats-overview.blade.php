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
    .kpi-card.color-primary::before { background: linear-gradient(90deg,#D53B04,#f2691f); }
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
    .kpi-icon svg { width: 22px; height: 22px; }
    .kpi-card.color-success .kpi-icon { background: rgba(16,185,129,.12); color: #059669; }
    .kpi-card.color-danger  .kpi-icon { background: rgba(239,68,68,.12);   color: #dc2626; }
    .kpi-card.color-primary .kpi-icon { background: rgba(213,59,4,.12);   color: #D53B04; }
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
    .kpi-card.color-primary .kpi-desc { color: #D53B04; }
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
</style>

@php
    $stats = $this->getStats();

    $colorMap = [
        'success' => 'color-success',
        'danger'  => 'color-danger',
        'primary' => 'color-primary',
        'warning' => 'color-warning',
    ];

    /* Icons now come from the Heroicons set (blade-heroicons) via @svg — no more
       hand-copied path data to drift out of sync. StatsOverview.php emits heroicon-m-* names. */

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
            'color-primary' => 'rgba(213,59,4,',
            default         => 'rgba(245,158,11,',
        };
        $stroke = match($colorClass) {
            'color-success' => '#10b981',
            'color-danger'  => '#ef4444',
            'color-primary' => '#D53B04',
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
            <div class="kpi-header">
                <span class="kpi-label">{{ $stat->getLabel() }}</span>

                @if ($stat->getDescriptionIcon())
                    <div class="kpi-icon">
                        <x-filament::icon :icon="$stat->getDescriptionIcon()" class="kpi-icon-glyph" />
                    </div>
                @endif
            </div>

            <div class="kpi-value">{{ $stat->getValue() }}</div>

            @if ($stat->getDescription())
                <div class="kpi-desc">
                    @if ($stat->getDescriptionIcon())
                        <span class="kpi-desc-icon"><x-filament::icon :icon="$stat->getDescriptionIcon()" class="kpi-desc-glyph" /></span>
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
