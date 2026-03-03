@php
  $name = $coordinate->nom_societe ?? 'STE SOBITAS';
  $addr = $coordinate->adresse ?? 'Rue Ribat, 4000 Sousse Tunisie';
  $p1 = $coordinate->tel_1 ?? '+216 27 612 500';
  $p2 = $coordinate->tel_2 ?? '+216 73 200 169';
  $logo = $coordinate->logo_url ?? null; // set this if you have it
@endphp

<div class="ftva-company ftva-card">
    <div class="ftva-company-logo">
        @if($logo)
            <img src="{{ $logo }}" alt="Logo" />
        @else
            <div class="ftva-company-logo-fallback">SOBITAS</div>
        @endif
    </div>

    <div class="ftva-company-info">
        <div class="ftva-company-name">{{ $name }}</div>
        <div class="ftva-company-line">{{ $p1 }} / {{ $p2 }}</div>
        <div class="ftva-company-line">{{ $addr }}</div>
    </div>
</div>

