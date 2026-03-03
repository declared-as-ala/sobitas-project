@php
  $name = $coordinate->nom_societe ?? 'STE SOBITAS';
  $addr = $coordinate->adresse ?? 'Rue Ribat, 4000 Sousse Tunisie';
  $p1 = $coordinate->tel_1 ?? '+216 27 612 500';
  $p2 = $coordinate->tel_2 ?? '+216 73 200 169';
@endphp

<div class="ftva-company">
  <div class="ftva-company-logo">
    <div class="ftva-logo-text">SOBITAS</div>
  </div>

  <div class="ftva-company-info">
    <div class="ftva-company-name">{{ $name }}</div>
    <div class="ftva-company-line">{{ $p1 }} / {{ $p2 }}</div>
    <div class="ftva-company-line">{{ $addr }}</div>
  </div>
</div>

