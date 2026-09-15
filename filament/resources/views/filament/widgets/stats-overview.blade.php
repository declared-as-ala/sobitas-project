<x-filament-widgets::widget>
{{--
    Redesigned KPI cards (not a recolor of the old ones): a new anatomy — eyebrow label + icon
    chip on top, a large tabular value, a rounded DELTA PILL (arrow + %) beside muted context,
    and a full-bleed gradient sparkline flush to the card's bottom edge. Data comes from
    StatsOverview::getCards() as a structured model, not flat Filament Stat strings.
--}}
<style>
    .kpi2-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
    }
    @media (max-width: 1279px) { .kpi2-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 560px)  { .kpi2-grid { grid-template-columns: 1fr; } }

    .kpi2 {
        position: relative;
        display: flex;
        flex-direction: column;
        min-height: 148px;
        background: #fff;
        border: 1px solid #eceef2;
        border-radius: 18px;
        overflow: hidden;
        box-shadow: 0 1px 2px rgba(16,24,40,.04);
        transition: box-shadow .18s ease, transform .18s ease, border-color .18s ease;
    }
    .kpi2:hover {
        box-shadow: 0 10px 30px rgba(16,24,40,.10);
        transform: translateY(-2px);
        border-color: #e2e5ea;
    }
    .dark .kpi2 { background: #1e2433; border-color: rgba(255,255,255,.06); box-shadow: none; }

    .kpi2-body { padding: 1.05rem 1.15rem 0.7rem; }

    .kpi2-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: .5rem;
        margin-bottom: .7rem;
    }
    .kpi2-eyebrow {
        font-size: .7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: .06em;
        color: #94a3b8;
        line-height: 1.35;
        padding-top: .28rem;
    }
    .dark .kpi2-eyebrow { color: #6b7688; }

    .kpi2-chip {
        width: 38px; height: 38px;
        border-radius: 11px;
        display: grid; place-items: center;
        flex-shrink: 0;
    }
    .kpi2-chip svg { width: 20px; height: 20px; }
    .tone-brand   .kpi2-chip { background: rgba(213,59,4,.10);  color: #D53B04; }
    .tone-success .kpi2-chip { background: rgba(16,185,129,.13); color: #059669; }
    .tone-neutral .kpi2-chip { background: rgba(100,116,139,.13); color: #475569; }
    .dark .tone-neutral .kpi2-chip { color: #94a3b8; }

    .kpi2-value {
        font-size: 1.7rem;
        font-weight: 800;
        letter-spacing: -.02em;
        color: #0f172a;
        line-height: 1.08;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .kpi2-value.is-long { font-size: 1.28rem; }
    .dark .kpi2-value { color: #f1f5f9; }

    .kpi2-meta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: .4rem;
        margin-top: .55rem;
    }
    .kpi2-pill {
        display: inline-flex;
        align-items: center;
        gap: 1px;
        padding: .12rem .45rem .12rem .3rem;
        border-radius: 9999px;
        font-size: .72rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
    }
    .kpi2-pill svg { width: 13px; height: 13px; }
    .kpi2-pill.dir-up   { background: rgba(16,185,129,.13); color: #059669; }
    .kpi2-pill.dir-down { background: rgba(239,68,68,.13);  color: #dc2626; }
    .kpi2-ctx { font-size: .78rem; color: #64748b; }
    .dark .kpi2-ctx { color: #94a3b8; }

    /* Full-bleed sparkline flush to the card's bottom edge */
    .kpi2-spark { width: 100%; height: 46px; margin-top: auto; }
    .kpi2-spark svg { width: 100%; height: 100%; display: block; }
    .kpi2-nochart-pad { margin-top: auto; height: 12px; }
</style>

@php
    /* Smooth-ish area + line sparkline that bleeds edge to edge. $id keeps gradient defs unique. */
    function kpiSparkline(array $data, string $tone, int $id): string {
        if (count($data) < 2) return '';
        $w = 240; $h = 46;
        $min = min($data); $max = max($data);
        $range = max($max - $min, 0.001);
        $step = $w / (count($data) - 1);
        $pts = [];
        foreach ($data as $i => $v) {
            $x = round($i * $step, 2);
            $y = round($h - (($v - $min) / $range) * ($h * 0.7) - $h * 0.14, 2);
            $pts[] = "$x,$y";
        }
        $poly = implode(' ', $pts);
        [$stroke, $fill] = match ($tone) {
            'success' => ['#10b981', '16,185,129'],
            'neutral' => ['#64748b', '100,116,139'],
            default   => ['#D53B04', '213,59,4'],
        };
        $lx = explode(',', $pts[count($pts) - 1])[0];
        $fx = explode(',', $pts[0])[0];
        $gid = "kspark{$id}";
        return '<svg viewBox="0 0 '.$w.' '.$h.'" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'
            . '<defs><linearGradient id="'.$gid.'" x1="0" y1="0" x2="0" y2="1">'
            . '<stop offset="0%" stop-color="rgba('.$fill.',0.28)"/>'
            . '<stop offset="100%" stop-color="rgba('.$fill.',0)"/></linearGradient></defs>'
            . '<path d="M '.$poly.' L '.$lx.','.$h.' L '.$fx.','.$h.' Z" fill="url(#'.$gid.')"/>'
            . '<polyline points="'.$poly.'" fill="none" stroke="'.$stroke.'" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>'
            . '</svg>';
    }
@endphp

<div class="kpi2-grid">
    @foreach ($this->getCards() as $i => $card)
        @php
            $chart = $card['chart'] ?? [];
            $hasChart = count($chart) >= 2;
            $isLong = mb_strlen((string) $card['value']) > 12;
        @endphp
        <div class="kpi2 tone-{{ $card['tone'] }}">
            <div class="kpi2-body">
                <div class="kpi2-top">
                    <span class="kpi2-eyebrow">{{ $card['label'] }}</span>
                    <span class="kpi2-chip"><x-filament::icon :icon="$card['icon']" /></span>
                </div>

                <div class="kpi2-value {{ $isLong ? 'is-long' : '' }}">{{ $card['value'] }}</div>

                <div class="kpi2-meta">
                    @if ($card['delta'])
                        <span class="kpi2-pill dir-{{ $card['delta']['dir'] }}">
                            <x-filament::icon :icon="$card['delta']['dir'] === 'up' ? 'heroicon-m-arrow-up-right' : 'heroicon-m-arrow-down-right'" />
                            {{ $card['delta']['text'] }}
                        </span>
                    @endif
                    <span class="kpi2-ctx">{{ $card['context'] }}</span>
                </div>
            </div>

            @if ($hasChart)
                <div class="kpi2-spark">{!! kpiSparkline($chart, $card['tone'], $i) !!}</div>
            @else
                <div class="kpi2-nochart-pad"></div>
            @endif
        </div>
    @endforeach
</div>
</x-filament-widgets::widget>
