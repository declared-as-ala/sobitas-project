<div class="convert-wizard-summary">
    <div class="convert-wizard-step">
        <p class="convert-wizard-label">Document source</p>
        <dl class="convert-wizard-dl">
            <dt>N°</dt><dd>{{ $sourceNumber ?? '—' }}</dd>
            <dt>Client</dt><dd>{{ $client ?? '—' }}</dd>
            <dt>Date</dt><dd>{{ $date ?? '—' }}</dd>
            <dt>Lignes</dt><dd>{{ $itemsCount ?? 0 }}</dd>
            <dt>Total TTC</dt><dd><strong>{{ $totalTtc ?? '—' }}</strong></dd>
        </dl>
        <p class="convert-wizard-hint">Cliquez sur « Confirmer la conversion » pour créer le document cible. Vous serez redirigé vers la nouvelle fiche.</p>
    </div>
</div>
