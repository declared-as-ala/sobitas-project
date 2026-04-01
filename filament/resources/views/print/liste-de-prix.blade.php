<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Liste de Prix - {{ $pricelist->designation ?? $pricelist->id }}</title>
</head>
<body class="doc-a4-print @if(!empty($forPdf)) is-pdf-print @endif">
@php
    $coordonnee = $coordonnee ?? $company ?? null;
    $logoUrl = null;
    $staticLogoPath = resource_path('views/print/logo_print.png');
    if (is_file($staticLogoPath)) {
        $mime = @mime_content_type($staticLogoPath) ?: 'image/png';
        $logoUrl = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($staticLogoPath));
    }
@endphp

@include('print.partials.styles-a4-bl-aligned', ['forPdf' => $forPdf ?? null])

<div class="page-content">
    <div id="invoice" class="doc-a4-shell">
        @if (empty($forPdf))
        <div class="doc-a4-toolbar hide_print">
            <button type="button" class="doc-a4-btn" onclick="window.print()"><i class="bi bi-printer me-1"></i>Imprimer</button>
            <a class="doc-a4-btn doc-a4-btn--muted" href="{{ $backUrl ?? url()->previous() }}"><i class="bi bi-arrow-left me-1"></i>Retour</a>
        </div>
        @endif

        <div class="invoice">
            <div class="doc-a4-main-wrap">
                <header class="doc-a4-header">
                    <div class="doc-a4-header__brand">
                        @if ($logoUrl)
                            <img src="{{ $logoUrl }}" alt="Logo" class="mb-2" style="max-width: 180px; height: auto; display: block;">
                        @endif
                        <div class="doc-a4-co-name">{{ $coordonnee->abbreviation ?? '' }}</div>
                        <div class="doc-a4-co-line"><b>Email :</b> {{ $coordonnee->email ?? '' }}</div>
                        <div class="doc-a4-co-line"><b>Adresse :</b> {{ $coordonnee->adresse_fr ?? '' }}</div>
                        <div class="doc-a4-co-line"><b>Tél :</b> {{ $coordonnee->phone_1 ?? '' }}@if (!empty($coordonnee->phone_2)) / {{ $coordonnee->phone_2 }}@endif</div>
                        @if (!empty($coordonnee->registre_commerce))
                            <div class="doc-a4-co-line"><b>RC :</b> {{ $coordonnee->registre_commerce }}</div>
                        @endif
                        @if (!empty($coordonnee->matricule))
                            <div class="doc-a4-co-line"><b>MF :</b> {{ $coordonnee->matricule }}</div>
                        @endif
                    </div>
                    <div class="doc-a4-header__meta">
                        <h1>{{ $documentTitle ?? 'Liste de Prix' }}</h1>
                        <div class="doc-a4-meta-line"><b>Date :</b> {{ $documentDate ?? $pricelist->created_at?->format('d/m/Y') }}</div>
                        @if (!empty($documentNumber))
                            <div class="doc-a4-meta-line"><b>Réf :</b> {{ $documentNumber }}</div>
                        @endif
                    </div>
                </header>

                <main>
                    <div class="doc-a4-table-wrap">
                        <table class="doc-a4-lines">
                            <thead>
                                <tr>
                                    <th class="doc-a4-col-num">#</th>
                                    <th class="doc-a4-col-prod">Produit</th>
                                    <th class="doc-a4-col-numcell">Prix Gros</th>
                                    <th class="doc-a4-col-numcell">Prix Unitaire</th>
                                </tr>
                            </thead>
                            <tbody>
                                @php $i = 1; @endphp
                                @foreach ($price_list_rows ?? [] as $row)
                                    <tr>
                                        <td class="doc-a4-td-num">{{ $row['index'] ?? $i }}</td>
                                        <td class="doc-a4-td-prod">{{ $row['designation'] ?? '—' }}</td>
                                        <td class="doc-a4-td-right">{{ number_format((float) ($row['prix_gros'] ?? 0), 3, '.', '') }} DT</td>
                                        <td class="doc-a4-td-right">{{ number_format((float) ($row['prix_unitaire'] ?? 0), 3, '.', '') }} DT</td>
                                    </tr>
                                    @php $i++; @endphp
                                @endforeach
                            </tbody>
                        </table>
                    </div>

                    <div class="doc-a4-summary">
                        Nombre de références : <strong>{{ count($price_list_rows ?? []) }}</strong>
                    </div>

                    @if (! empty($footerNote ?? null))
                        <div class="doc-a4-note">
                            <strong>Note</strong><br>
                            {{ $footerNote }}
                        </div>
                    @endif
                    @if (! empty($paymentTerms ?? null))
                        <p class="doc-a4-payment-terms">{{ $paymentTerms }}</p>
                    @endif
                </main>
                <div class="print-doc-footer-wrap doc-a4-footer-wrap">
                    @include('print.partials.footer-rib-numero', ['documentNumero' => $documentNumber ?? ''])
                </div>
            </div>
        </div>
    </div>
</div>
</body>
</html>
