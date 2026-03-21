<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Stock — {{ $tab_label }}</title>
<style>
    * { box-sizing: border-box; }
    body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 9pt; color: #222; margin: 0; padding: 0; }
    .header { background: #ff4a00; color: #fff; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { margin: 0; font-size: 14pt; font-weight: 700; }
    .header .meta { font-size: 8pt; opacity: .85; text-align: right; }
    .tab-badge {
        display: inline-block;
        background: #fff3;
        border: 1px solid #fff6;
        border-radius: 4px;
        padding: 2px 8px;
        font-size: 9pt;
        font-weight: 600;
        margin-top: 4px;
    }
    .summary { padding: 8px 16px; background: #fff7ed; border-bottom: 1px solid #fed7aa; font-size: 8.5pt; color: #92400e; }
    table { width: 100%; border-collapse: collapse; margin: 0; }
    thead th {
        background: #1f2937;
        color: #fff;
        padding: 6px 8px;
        text-align: left;
        font-size: 8pt;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .04em;
    }
    thead th.right { text-align: right; }
    thead th.center { text-align: center; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 8.5pt; vertical-align: middle; }
    tbody td.right { text-align: right; }
    tbody td.center { text-align: center; }
    .badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 20px;
        font-size: 7.5pt;
        font-weight: 700;
    }
    .badge-green  { background: #dcfce7; color: #166534; }
    .badge-red    { background: #fee2e2; color: #991b1b; }
    .badge-amber  { background: #fef3c7; color: #92400e; }
    .badge-purple { background: #f3e8ff; color: #6b21a8; }
    .footer { margin-top: 12px; text-align: center; font-size: 7.5pt; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 6px; }
</style>
</head>
<body>

<div class="header">
    <div>
        <h1>Gestion de stock</h1>
        <div class="tab-badge">{{ $tab_label }}</div>
    </div>
    <div class="meta">
        Généré le {{ $generated_at }}<br>
        {{ count($products) }} produit(s)
    </div>
</div>

<div class="summary">
    Export filtré : <strong>{{ $tab_label }}</strong> &mdash; {{ count($products) }} produit(s)
</div>

<table>
    <thead>
        <tr>
            <th style="width:4%">#</th>
            <th style="width:40%">Produit</th>
            <th class="right" style="width:13%">Prix TTC</th>
            <th class="center" style="width:10%">Quantité</th>
            <th class="center" style="width:15%">Statut</th>
            <th style="width:18%">Catégorie</th>
        </tr>
    </thead>
    <tbody>
        @foreach($products as $i => $p)
        @php
            $status = $p->stock_status ?? 'unknown';
            $statusLabel = match($status) {
                'in_stock'     => 'En stock',
                'low_stock'    => 'Stock faible',
                'out_of_stock' => 'Rupture',
                'inconsistent' => 'Incohérence',
                default        => '—',
            };
            $badgeClass = match($status) {
                'in_stock'     => 'badge-green',
                'low_stock'    => 'badge-amber',
                'out_of_stock' => 'badge-red',
                'inconsistent' => 'badge-purple',
                default        => '',
            };
        @endphp
        <tr>
            <td class="center">{{ $i + 1 }}</td>
            <td>{{ $p->designation_fr }}</td>
            <td class="right">{{ number_format((float)($p->prix ?? 0), 3, '.', '') }} DT</td>
            <td class="center">{{ (int) $p->qte }}</td>
            <td class="center"><span class="badge {{ $badgeClass }}">{{ $statusLabel }}</span></td>
            <td>{{ $p->sousCategorie?->designation_fr ?? '—' }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

<div class="footer">
    Sobitas &mdash; Gestion de stock &mdash; {{ $generated_at }}
</div>

</body>
</html>
