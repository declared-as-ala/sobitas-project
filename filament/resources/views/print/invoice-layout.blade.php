{{--
  Shared A4 invoice layout: Facture TVA, Devis, BL (reusable).
  Expects: $documentTitle, $documentNumber, $documentDate, $company (Coordinate),
  $client, $totals (array of [label, value, class?), $footerNote, $paymentTerms,
  $status (optional string for badge), $sommeEnLettres (optional).
  @yield('print-table') = the items table.
--}}
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
                <svg class="print-btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m3.84 1.86c-.899.96-2.099 1.44-3.3 1.44s-2.403-.48-3.3-1.44m3.3-1.44c.899.96 2.099 1.44 3.3 1.44s2.403-.48 3.3-1.44m-6.6-12.48c-.899.96-2.099 1.44-3.3 1.44s-2.403-.48-3.3-1.44M12 15.66h.01" /></svg>
                Imprimer
            </button>
            <button type="button" onclick="window.close()" class="print-btn print-btn-ghost">Fermer</button>
        </div>
    </div>
    @endif

    <div class="invoice-sheet" id="print-area">
        <div class="invoice-header-band"></div>
        <div class="invoice-sheet-inner">
            <header class="invoice-header">
                <div class="invoice-company">
                    @php
                        $invoiceLogoUrl = null;
                        if ($company && !empty($company->logo_facture)) {
                            $invoiceLogoUrl = filter_var($company->logo_facture, FILTER_VALIDATE_URL)
                                ? $company->logo_facture
                                : \Illuminate\Support\Facades\Storage::url($company->logo_facture);
                        } else {
                            $invoiceLogoUrl = asset('logo.png');
                        }
                    @endphp
                    @if ($invoiceLogoUrl)
                        <img src="{{ $invoiceLogoUrl }}" alt="SOBITAS PROTEIN.TN" class="invoice-logo" onerror="this.style.display='none'">
                    @endif
                    <h2 class="invoice-company-name">{{ $company->abbreviation ?? 'STE SOBITAS' }}</h2>
                    @if ($company ?? null)
                        <div class="invoice-company-meta">
                            @if ($company->adresse_fr ?? null)<span>{{ $company->adresse_fr }}</span><br>@endif
                            @if ($company->phone_1 ?? null)<span>Tél. {{ $company->phone_1 }}@if ($company->phone_2 ?? null) / {{ $company->phone_2 }}@endif</span><br>@endif
                            @if ($company->email ?? null)<a href="mailto:{{ $company->email }}">{{ $company->email }}</a><br>@endif
                        </div>
                        @if (($company->registre_commerce ?? null) || ($company->matricule ?? null))
                            <div class="invoice-company-legal">
                                @if ($company->registre_commerce ?? null) RC : {{ $company->registre_commerce }} @endif
                                @if ($company->matricule ?? null)@if ($company->registre_commerce ?? null) &nbsp;·&nbsp; @endif MF : {{ $company->matricule }} @endif
                            </div>
                        @endif
                    @endif
                </div>
                <div class="invoice-doc-block">
                    <h1 class="invoice-doc-title">{{ strtoupper($documentTitle ?? 'FACTURE TVA') }}</h1>
                    <dl class="invoice-doc-meta">
                        <dt>N°</dt><dd>{{ $documentNumber ?? '—' }}</dd>
                        <dt>Date</dt><dd>{{ $documentDate ?? '—' }}</dd>
                    </dl>
                    @if (!empty($status) || !empty($status_label))
                        @php
                            $statusVal = $status ?? '';
                            $badgeClass = match ($statusVal) {
                                'draft' => 'invoice-status-badge--draft',
                                'issued' => 'invoice-status-badge--issued',
                                'paid' => 'invoice-status-badge--paid',
                                'partially_paid' => 'invoice-status-badge--partially_paid',
                                'canceled' => 'invoice-status-badge--canceled',
                                default => 'invoice-status-badge--draft',
                            };
                            $badgeLabel = $status_label ?? match ($statusVal) {
                                'draft' => 'Brouillon',
                                'issued' => 'Émise',
                                'paid' => 'Payée',
                                'partially_paid' => 'Partiellement payée',
                                'canceled' => 'Annulée',
                                default => $statusVal,
                            };
                        @endphp
                        <span class="invoice-status-badge {{ $badgeClass }}">{{ $badgeLabel }}</span>
                    @endif
                </div>
            </header>

            @if (!empty($client))
            <section class="invoice-client">
                <div class="invoice-client-label">Client</div>
                <div class="invoice-client-name">{{ $client->name ?? $client['name'] ?? '—' }}</div>
                <div class="invoice-client-details">
                    @if ($client->adresse ?? $client['adresse'] ?? null){{ $client->adresse ?? $client['adresse'] }}<br>@endif
                    @if ($client->phone_1 ?? $client['phone_1'] ?? null)Tél. {{ $client->phone_1 ?? $client['phone_1'] }}<br>@endif
                    @if ($client->email ?? $client['email'] ?? null){{ $client->email ?? $client['email'] }}<br>@endif
                    @if ($client->matricule ?? $client['matricule'] ?? null)Matricule fiscal : {{ $client->matricule ?? $client['matricule'] }}@endif
                </div>
            </section>
            @endif

            <div class="invoice-table-wrap">
                @yield('print-table')
            </div>

            <div class="invoice-totals-wrap">
                <div class="invoice-totals-box">
                    @foreach ($totals ?? [] as $row)
                        <div class="invoice-tot-row {{ $row['class'] ?? '' }}">
                            <span>{{ $row['label'] }}</span>
                            <span class="invoice-tot-amt">{{ $row['value'] }}</span>
                        </div>
                    @endforeach
                </div>
            </div>

            @if (!empty($sommeEnLettres))
            <p class="invoice-somme">Arrêtée la présente facture à la somme de : {{ $sommeEnLettres }}</p>
            @endif

            <footer class="invoice-footer">
                @if (!empty($paymentTerms))<p class="invoice-payment-terms">{{ $paymentTerms }}</p>@endif
                @if (!empty($footerNote))<div class="invoice-note">{{ $footerNote }}</div>@endif
                <div class="invoice-signature">Signature &amp; Cachet</div>
                @if ($company && !empty($company->rib))<div class="invoice-rib">{{ $company->rib }}</div>@endif
                <p class="invoice-thanks">Merci pour votre confiance.</p>
            </footer>
        </div>
    </div>

    @if (!request()->query('embed') && empty($forPdf ?? false))
    <script>
        window.addEventListener('load', function () {
            window.print();
        });
    </script>
    @endif
    @stack('print-scripts')
</body>
</html>
