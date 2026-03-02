<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Rapport stock</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; }
        h1 { font-size: 16px; margin-bottom: 4px; }
        h2 { font-size: 13px; margin-top: 14px; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
        th { background: #eee; font-weight: bold; }
        .text-right { text-align: right; }
        .meta { color: #666; font-size: 10px; margin-bottom: 12px; }
    </style>
</head>
<body>
    <h1>Rapport stock</h1>
    <p class="meta">Généré le {{ $generated_at }}</p>

    <h2>Valeur du stock par catégorie (Top 10)</h2>
    <table>
        <thead>
            <tr>
                <th>Catégorie</th>
                <th class="text-right">Valeur (DT)</th>
            </tr>
        </thead>
        <tbody>
            @foreach($value_by_category as $row)
                <tr>
                    <td>{{ $row->name }}</td>
                    <td class="text-right">{{ number_format($row->value, 2, ',', ' ') }}</td>
                </tr>
            @empty
                <tr><td colspan="2">Aucune donnée</td></tr>
            @endforeach
        </tbody>
    </table>

    <h2>Indicateurs</h2>
    <table>
        <tr>
            <th>Rupture</th>
            <th>Stock faible</th>
            <th>Stock normal</th>
            <th class="text-right">Valeur totale stock (DT)</th>
        </tr>
        <tr>
            <td>{{ $kpis['rupture'] }}</td>
            <td>{{ $kpis['low_stock'] }}</td>
            <td>{{ $kpis['in_stock'] }}</td>
            <td class="text-right">{{ number_format($total_value, 2, ',', ' ') }}</td>
        </tr>
    </table>

    <h2>Produits en stock faible</h2>
    <table>
        <thead>
            <tr>
                <th>Désignation</th>
                <th class="text-right">Quantité</th>
                <th class="text-right">Seuil</th>
                <th>Catégorie</th>
            </tr>
        </thead>
        <tbody>
            @foreach($low_stock as $row)
                <tr>
                    <td>{{ $row->designation_fr }}</td>
                    <td class="text-right">{{ $row->qte }}</td>
                    <td class="text-right">{{ $row->seuil }}</td>
                    <td>{{ $row->category }}</td>
                </tr>
            @empty
                <tr><td colspan="4">Aucun produit en stock faible</td></tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
