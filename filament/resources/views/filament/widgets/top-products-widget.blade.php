<x-filament-widgets::widget>
    <x-filament::section>
        <x-slot name="heading">
            Top Produits — Commandes &amp; Ventes ({{ $periodLabel }})
        </x-slot>

        @if (count($topProducts) > 0)
            @php
                $topByQty    = collect($topProducts)->sortByDesc('total_qty')->first();
                $topByRev    = $topProducts[0] ?? null;
                $topByOrders = collect($topProducts)->sortByDesc('total_orders')->first();
                $maxRevenue  = max((float) ($topProducts[0]['total_revenue_ht'] ?? 1), 0.01);
            @endphp

            {{-- ── Top 3 highlight cards ──────────────────────────────────────── --}}
            <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:20px;">

                @if ($topByRev)
                <div style="position:relative; overflow:hidden; border-radius:14px; border:1px solid #fde68a; background:linear-gradient(135deg,#fffbeb,#fff7ed); padding:14px 16px;">
                    <div style="position:absolute;top:-4px;right:6px;font-size:52px;opacity:.08;line-height:1;pointer-events:none;user-select:none;">💰</div>
                    <span style="display:inline-flex;align-items:center;gap:4px;background:#fef3c7;color:#92400e;border-radius:999px;padding:2px 10px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px;">
                        🥇 Meilleur revenu
                    </span>
                    <p style="font-size:13px;font-weight:600;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px;" title="{{ $topByRev['name'] }}">{{ $topByRev['name'] }}</p>
                    <p style="font-size:20px;font-weight:800;color:#d97706;letter-spacing:-.5px;line-height:1.1;">
                        {{ number_format((float)$topByRev['total_revenue_ht'], 3, ',', ' ') }}
                        <span style="font-size:11px;font-weight:600;color:#b45309;">DT HT</span>
                    </p>
                    <p style="font-size:11px;color:#92400e;opacity:.7;margin-top:3px;">
                        {{ number_format((float)$topByRev['total_qty'], 0, ',', ' ') }} unités &middot; {{ number_format((int)$topByRev['total_orders'], 0, ',', ' ') }} docs
                    </p>
                </div>
                @endif

                @if ($topByQty)
                <div style="position:relative; overflow:hidden; border-radius:14px; border:1px solid #bfdbfe; background:linear-gradient(135deg,#eff6ff,#eef2ff); padding:14px 16px;">
                    <div style="position:absolute;top:-4px;right:6px;font-size:52px;opacity:.08;line-height:1;pointer-events:none;user-select:none;">📦</div>
                    <span style="display:inline-flex;align-items:center;gap:4px;background:#dbeafe;color:#1e40af;border-radius:999px;padding:2px 10px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px;">
                        📦 Plus vendu (qté)
                    </span>
                    <p style="font-size:13px;font-weight:600;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px;" title="{{ $topByQty['name'] }}">{{ $topByQty['name'] }}</p>
                    <p style="font-size:20px;font-weight:800;color:#2563eb;letter-spacing:-.5px;line-height:1.1;">
                        {{ number_format((float)$topByQty['total_qty'], 0, ',', ' ') }}
                        <span style="font-size:11px;font-weight:600;color:#1d4ed8;">unités</span>
                    </p>
                    <p style="font-size:11px;color:#1e40af;opacity:.7;margin-top:3px;">
                        {{ number_format((float)$topByQty['total_revenue_ht'], 3, ',', ' ') }} DT &middot; {{ number_format((int)$topByQty['total_orders'], 0, ',', ' ') }} docs
                    </p>
                </div>
                @endif

                @if ($topByOrders)
                <div style="position:relative; overflow:hidden; border-radius:14px; border:1px solid #a7f3d0; background:linear-gradient(135deg,#ecfdf5,#f0fdfa); padding:14px 16px;">
                    <div style="position:absolute;top:-4px;right:6px;font-size:52px;opacity:.08;line-height:1;pointer-events:none;user-select:none;">📋</div>
                    <span style="display:inline-flex;align-items:center;gap:4px;background:#d1fae5;color:#065f46;border-radius:999px;padding:2px 10px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px;">
                        📋 Forte demande
                    </span>
                    <p style="font-size:13px;font-weight:600;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px;" title="{{ $topByOrders['name'] }}">{{ $topByOrders['name'] }}</p>
                    <p style="font-size:20px;font-weight:800;color:#059669;letter-spacing:-.5px;line-height:1.1;">
                        {{ number_format((int)$topByOrders['total_orders'], 0, ',', ' ') }}
                        <span style="font-size:11px;font-weight:600;color:#047857;">documents</span>
                    </p>
                    <p style="font-size:11px;color:#065f46;opacity:.7;margin-top:3px;">
                        {{ number_format((float)$topByOrders['total_qty'], 0, ',', ' ') }} unités &middot; {{ number_format((float)$topByOrders['total_revenue_ht'], 3, ',', ' ') }} DT
                    </p>
                </div>
                @endif

            </div>

            {{-- ── Ranked product table ────────────────────────────────────────── --}}
            <div style="border-radius:12px;border:1px solid #f3f4f6;overflow:hidden;">
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <thead>
                        <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb;">
                            <th style="padding:9px 14px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9ca3af;width:40px;">#</th>
                            <th style="padding:9px 14px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9ca3af;">Produit</th>
                            <th style="padding:9px 14px;text-align:right;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9ca3af;width:80px;">Qté</th>
                            <th style="padding:9px 14px;text-align:right;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9ca3af;width:60px;">Docs</th>
                            <th style="padding:9px 14px;text-align:right;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9ca3af;width:130px;">Revenu HT</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($topProducts as $index => $product)
                            @php
                                $rank    = $index + 1;
                                $barPct  = round(((float)$product['total_revenue_ht'] / $maxRevenue) * 100);

                                [$rankBg, $rankColor, $rankRing, $rowBg, $barColor] = match($rank) {
                                    1 => ['#fef3c7', '#92400e', '#fbbf24', '#fffdf7', 'linear-gradient(90deg,#f59e0b,#fb923c)'],
                                    2 => ['#f3f4f6', '#6b7280', '#9ca3af', '#fafafa', 'linear-gradient(90deg,#9ca3af,#d1d5db)'],
                                    3 => ['#ffedd5', '#9a3412', '#fb923c', '#fffbf8', 'linear-gradient(90deg,#f97316,#fb923c)'],
                                    default => ['#f9fafb', '#6b7280', '#e5e7eb', '#ffffff', 'linear-gradient(90deg,#6366f1,#818cf8)'],
                                };

                                $isTopRev    = $topByRev    && $product['name'] === $topByRev['name'];
                                $isTopQty    = $topByQty    && $product['name'] === $topByQty['name'];
                                $isTopOrders = $topByOrders && $product['name'] === $topByOrders['name'];
                                $rowStyle    = $rank <= 3 ? "background:{$rowBg};" : '';
                                $borderStyle = $index < count($topProducts) - 1 ? 'border-bottom:1px solid #f3f4f6;' : '';
                            @endphp
                            <tr style="{{ $rowStyle }}{{ $borderStyle }}">

                                {{-- Rank --}}
                                <td style="padding:11px 14px;text-align:center;">
                                    <span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:{{ $rankBg }};border:2px solid {{ $rankRing }};font-size:11px;font-weight:800;color:{{ $rankColor }};">
                                        {{ $rank }}
                                    </span>
                                </td>

                                {{-- Product name + bar + badges --}}
                                <td style="padding:11px 14px;">
                                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:5px;">
                                        <span style="font-size:13px;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px;display:inline-block;" title="{{ $product['name'] }}">
                                            {{ $product['name'] }}
                                        </span>
                                        @if ($isTopRev)
                                            <span style="background:#fef3c7;color:#92400e;border-radius:999px;padding:1px 7px;font-size:10px;font-weight:700;white-space:nowrap;">💰</span>
                                        @endif
                                        @if ($isTopQty)
                                            <span style="background:#dbeafe;color:#1e40af;border-radius:999px;padding:1px 7px;font-size:10px;font-weight:700;white-space:nowrap;">📦</span>
                                        @endif
                                        @if ($isTopOrders)
                                            <span style="background:#d1fae5;color:#065f46;border-radius:999px;padding:1px 7px;font-size:10px;font-weight:700;white-space:nowrap;">📋</span>
                                        @endif
                                    </div>
                                    <div style="height:4px;border-radius:999px;background:#f3f4f6;overflow:hidden;max-width:320px;">
                                        <div style="height:4px;border-radius:999px;background:{{ $barColor }};width:{{ $barPct }}%;"></div>
                                    </div>
                                </td>

                                {{-- Qty --}}
                                <td style="padding:11px 14px;text-align:right;white-space:nowrap;">
                                    <span style="font-size:13px;font-weight:600;color:#374151;font-variant-numeric:tabular-nums;">
                                        {{ number_format((float)$product['total_qty'], 0, ',', ' ') }}
                                    </span>
                                    <span style="font-size:10px;color:#9ca3af;margin-left:2px;">u.</span>
                                </td>

                                {{-- Docs --}}
                                <td style="padding:11px 14px;text-align:right;white-space:nowrap;">
                                    <span style="font-size:13px;font-weight:600;color:#374151;font-variant-numeric:tabular-nums;">
                                        {{ number_format((int)$product['total_orders'], 0, ',', ' ') }}
                                    </span>
                                </td>

                                {{-- Revenue --}}
                                <td style="padding:11px 14px;text-align:right;white-space:nowrap;">
                                    <span style="font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;color:{{ $rank === 1 ? '#d97706' : '#4f46e5' }};">
                                        {{ number_format((float)$product['total_revenue_ht'], 3, ',', ' ') }}
                                    </span>
                                    <span style="font-size:10px;color:#9ca3af;margin-left:2px;">DT</span>
                                </td>

                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>

        @else
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 0;text-align:center;gap:12px;">
                <div style="width:56px;height:56px;border-radius:16px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:28px;">📊</div>
                <div>
                    <p style="font-size:14px;font-weight:600;color:#6b7280;margin:0;">Aucune donnée disponible</p>
                    <p style="font-size:12px;color:#9ca3af;margin:4px 0 0;">Aucun produit vendu sur la période sélectionnée.</p>
                </div>
            </div>
        @endif
    </x-filament::section>
</x-filament-widgets::widget>
