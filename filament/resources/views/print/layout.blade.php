{{--
  Layout d'impression A4 pour tous les documents (BL, Facture TVA, Ticket, Devis).
  Variables attendues: $documentTitle, $documentNumber, $documentDate, $client (optional),
  $company (Coordinate), $itemsTable (HTML), $totals (array), $footerNote, $paymentTerms.
  Pour Facture TVA: $showTva = true, colonnes HT/TVA/TTC.
--}}
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $documentTitle ?? 'Document' }} {{ $documentNumber ?? '' }}</title>
    @include('print.partials.print-styles')
    @stack('print-head')
</head>
<body class="print-doc-body">
    @if (!request()->query('embed') && empty($forPdf ?? false))
    <div class="print-toolbar no-print">
        <span class="print-toolbar-label">Aperçu</span>
        <div class="print-toolbar-actions">
            <button type="button" onclick="window.print()" class="print-btn print-btn-primary">
                <svg class="print-btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m3.84 1.86c-.899.96-2.099 1.44-3.3 1.44s-2.403-.48-3.3-1.44m3.3-1.44c.899.96 2.099 1.44 3.3 1.44s2.403-.48 3.3-1.44m-6.6-12.48c-.899.96-2.099 1.44-3.3 1.44s-2.403-.48-3.3-1.44M12 15.66h.01" /></svg>
                Imprimer
            </button>
            <button type="button" onclick="window.close()" class="print-btn print-btn-ghost">Fermer</button>
        </div>
    </div>
    @endif

    <div class="print-sheet" id="print-area">
        <header class="print-header">
            <div class="print-company">
                @if ($company && $company->logo_facture ?? null)
                    @php
                        $logoUrl = filter_var($company->logo_facture, FILTER_VALIDATE_URL)
                            ? $company->logo_facture
                            : \Illuminate\Support\Facades\Storage::url($company->logo_facture);
                    @endphp
                    <img src="{{ $logoUrl }}" alt="" class="print-logo" onerror="this.style.display='none'">
                @endif
                <div class="print-company-name">{{ $company->abbreviation ?? 'SOBITAS' }}</div>
                @if ($company ?? null)
                    <div class="print-company-meta">
                        @if ($company->adresse_fr ?? null) {{ $company->adresse_fr }}<br> @endif
                        @if ($company->phone_1 ?? null) Tél. {{ $company->phone_1 }}@if ($company->phone_2 ?? null) / {{ $company->phone_2 }} @endif<br> @endif
                        @if ($company->email ?? null) {{ $company->email }}<br> @endif
                        @if ($company->registre_commerce ?? null) RC : {{ $company->registre_commerce }}<br> @endif
                        @if ($company->matricule ?? null) MF : {{ $company->matricule }} @endif
                    </div>
                @endif
            </div>
            <div class="print-doc-info">
                <h1 class="print-doc-title">{{ strtoupper($documentTitle ?? 'DOCUMENT') }}</h1>
                <div class="print-doc-accent"></div>
                <dl class="print-meta">
                    <dt>N°</dt><dd>{{ $documentNumber ?? '—' }}</dd>
                    <dt>Date</dt><dd>{{ $documentDate ?? '—' }}</dd>
                </dl>
            </div>
        </header>

        @if (!empty($client))
        <section class="print-client">
            <div class="print-client-label">Client</div>
            <div class="print-client-name">{{ $client->name ?? $client['name'] ?? '—' }}</div>
            <div class="print-client-details">
                @if (($client->adresse ?? $client['adresse'] ?? null)) {{ $client->adresse ?? $client['adresse'] }}<br> @endif
                @if (($client->phone_1 ?? $client['phone_1'] ?? null)) Tél. {{ $client->phone_1 ?? $client['phone_1'] }}<br> @endif
                @if (($client->matricule ?? $client['matricule'] ?? null)) Matricule : {{ $client->matricule ?? $client['matricule'] }} @endif
            </div>
        </section>
        @endif

        <div class="print-table-wrap">
            @yield('print-table')
        </div>

        <div class="print-totals-wrap">
            <div class="print-totals-card">
                @foreach ($totals ?? [] as $row)
                    <div class="print-tot-row {{ $row['class'] ?? '' }}">
                        <span>{{ $row['label'] }}</span>
                        <span class="print-tot-amt">{{ $row['value'] }}</span>
                    </div>
                @endforeach
            </div>
        </div>

        @if (!empty($footerNote) || !empty($paymentTerms))
        <footer class="print-footer">
            @if (!empty($paymentTerms))<p class="print-payment-terms">{{ $paymentTerms }}</p> @endif
            @if (!empty($footerNote))<div class="print-note">{{ $footerNote }}</div> @endif
            <div class="print-signature">Signature et cachet</div>
            @if ($company && ($company->rib ?? null))<div class="print-rib">{{ $company->rib }}</div> @endif
        </footer>
        @else
        <footer class="print-footer">
            <div class="print-signature">Signature client</div>
            <div class="print-signature">Signature responsable</div>
            @if ($company && ($company->rib ?? null))<div class="print-rib">{{ $company->rib }}</div> @endif
        </footer>
        @endif
    </div>

    @stack('print-scripts')
</body>
</html>
