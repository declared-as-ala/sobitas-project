{{-- Clean A4 invoice layout (used for Facture TVA) --}}
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $documentTitle ?? 'Document' }} {{ $documentNumber ?? '' }}</title>
    @include('print.partials.print-invoice-a4')
    @stack('print-head')
</head>
<body class="print-doc-body">
@if (!request()->query('embed') && empty($forPdf ?? false))
    <div class="print-toolbar no-print">
        <span class="print-toolbar-label">Aperçu d'impression</span>
        <div class="print-toolbar-actions">
            <button type="button" onclick="window.print()" class="print-btn print-btn-primary">
                <svg class="print-btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m3.84 1.86c-.899.96-2.099 1.44-3.3 1.44s-2.403-.48-3.3-1.44m3.3-1.44c.899.96 2.099 1.44 3.3 1.44s2.403-.48 3.3-1.44m-6.6-12.48c-.899.96-2.099 1.44-3.3 1.44s-2.403-.48-3.3-1.44M12 15.66h.01" />
                </svg>
                Imprimer
            </button>
            <button type="button" onclick="window.close()" class="print-btn print-btn-ghost">Fermer</button>
        </div>
    </div>
@endif

<div class="print-doc-root">
    <div class="invoice-sheet">
        <div class="invoice-sheet-inner">
            <div class="invoice-header-band"></div>

            <div class="invoice-header">
                @php
                    /** @var \App\Models\Coordinate|null $company */
                    $logoPath = public_path('logo.png');
                    if (is_file($logoPath)) {
                        $logoUrl = 'data:' . (mime_content_type($logoPath) ?: 'image/png') . ';base64,' . base64_encode(file_get_contents($logoPath));
                    } else {
                        $logoUrl = asset('logo.png');
                    }
                    $statusValue = $status ?? null;
                    $statusLabel = $status_label ?? null;
                    $statusClass = match ($statusValue) {
                        'issued' => 'invoice-status-badge--issued',
                        'paid' => 'invoice-status-badge--paid',
                        'partially_paid' => 'invoice-status-badge--partially_paid',
                        'canceled', 'cancelled' => 'invoice-status-badge--canceled',
                        default => 'invoice-status-badge--draft',
                    };
                @endphp

                <div class="invoice-company">
                    <img src="{{ $logoUrl }}" alt="{{ $company->abbreviation ?? 'SOBITAS' }}" class="invoice-logo" onerror="this.style.display='none'; var f=document.getElementById('invoice-logo-fallback'); if(f) f.style.display='block';">
                    <span id="invoice-logo-fallback" class="invoice-company-name" style="display:none">{{ $company->abbreviation ?? 'STE SOBITAS' }}</span>

                    <div class="invoice-company-meta">
                        @if(!empty($company->adresse_fr))
                            <div>{{ $company->adresse_fr }}</div>
                        @endif
                        @if(!empty($company->phone_1) || !empty($company->phone_2))
                            <div>
                                {{ $company->phone_1 ?? '' }}@if(!empty($company->phone_2)) / {{ $company->phone_2 }}@endif
                            </div>
                        @endif
                        @if(!empty($company->email))
                            <div>{{ $company->email }}</div>
                        @endif
                    </div>

                    <div class="invoice-company-legal">
                        @if(!empty($company->rc)) RC : {{ $company->rc }}@endif
                        @if(!empty($company->mf))
                            @if(!empty($company->rc)) &nbsp;·&nbsp; @endif
                            MF : {{ $company->mf }}
                        @endif
                    </div>
                </div>

                <div class="invoice-doc-block">
                    <h1 class="invoice-doc-title">{{ strtoupper($documentTitle ?? 'FACTURE') }}</h1>
                    <dl class="invoice-doc-meta">
                        @if(!empty($documentNumber))
                            <dt>N°</dt>
                            <dd>{{ $documentNumber }}</dd>
                        @endif
                        @if(!empty($documentDate))
                            <dt>Date</dt>
                            <dd>{{ $documentDate }}</dd>
                        @endif
                    </dl>

                    @if($statusLabel)
                        <span class="invoice-status-badge {{ $statusClass }}">
                            {{ strtoupper($statusLabel) }}
                        </span>
                    @endif
                </div>
            </div>

            @if($client ?? null)
                <div class="invoice-client">
                    <div class="invoice-client-label">Client</div>
                    <div class="invoice-client-name">
                        {{ $client->name ?? ($client->raison_sociale ?? '') }}
                    </div>
                    <div class="invoice-client-details">
                        @if(!empty($client->adresse))
                            <div>{{ $client->adresse }}</div>
                        @endif
                        @if(!empty($client->phone_1) || !empty($client->phone_2))
                            <div>
                                {{ $client->phone_1 ?? '' }}@if(!empty($client->phone_2)) / {{ $client->phone_2 }}@endif
                            </div>
                        @endif
                        @if(!empty($client->email))
                            <div>{{ $client->email }}</div>
                        @endif
                    </div>
                </div>
            @endif

            <div class="invoice-table-wrap">
                @yield('print-table')
            </div>

            @if(!empty($totals ?? []))
                <div class="invoice-totals-wrap">
                    <div class="invoice-totals-box">
                        @foreach($totals as $row)
                            @php
                                $rowClass = $row['class'] ?? '';
                            @endphp
                            <div class="invoice-tot-row {{ $rowClass }}">
                                <span>{{ $row['label'] }}</span>
                                <span class="invoice-tot-amt">{{ $row['value'] }}</span>
                            </div>
                        @endforeach
                    </div>
                </div>
            @endif

            @if(!empty($sommeEnLettres ?? null))
                <div class="invoice-somme">
                    <strong>Somme en toutes lettres :</strong>
                    {{ $sommeEnLettres }}
                </div>
            @endif

            <div class="invoice-footer">
                @if(!empty($paymentTerms ?? null))
                    <p class="invoice-payment-terms">{{ $paymentTerms }}</p>
                @endif
                @if(!empty($footerNote ?? null))
                    <p class="invoice-note">{{ $footerNote }}</p>
                @endif
            </div>
        </div>
    </div>
</div>

</body>
</html>

