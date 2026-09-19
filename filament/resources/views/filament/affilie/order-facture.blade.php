@php
    $money = fn ($value) => number_format((float) $value, 3, ',', ' ') . ' DT';
    $delivery = fn (string $field) => $record->{'livraison_' . $field} ?: $record->{$field};
    $clientName = trim(($delivery('nom') ?? '') . ' ' . ($delivery('prenom') ?? ''));
@endphp

<article class="aff-facture-document" aria-label="Détail de la commande affilié">
    <header class="aff-facture-header">
        <div>
            <p class="aff-facture-kicker">COMMANDE AFFILIÉ</p>
            <h2 class="aff-facture-number">{{ $record->numero }}</h2>
            <p class="aff-facture-date">Date : {{ $record->created_at?->format('d/m/Y H:i') ?? '—' }}</p>
        </div>
        <div class="aff-facture-badges">
            <x-filament::badge :color="\App\Models\Commande::getStatusColor((string) $record->etat)">
                {{ \App\Models\Commande::getStatusLabel((string) $record->etat) }}
            </x-filament::badge>
            <div class="aff-facture-mode">
                <span>Mode de réception</span>
                <x-filament::badge color="gray">
                    {{ $record->fulfillment_mode === \App\Models\Commande::FULFILLMENT_PICKUP ? 'Retrait en magasin' : 'Livraison' }}
                </x-filament::badge>
            </div>
        </div>
    </header>

    <div class="aff-facture-body">
        <div class="aff-facture-parties">
            <section class="aff-facture-party">
                <h3>Affilié (revendeur)</h3>
                <p class="aff-facture-party-name">{{ $record->affilie?->name ?: '—' }}</p>
                <dl class="aff-facture-details">
                    @foreach (['business_name' => 'Entreprise', 'phone' => 'Téléphone', 'email' => 'E-mail', 'city' => 'Ville'] as $field => $label)
                        <div><dt>{{ $label }}</dt><dd>{{ $record->affilie?->{$field} ?: '—' }}</dd></div>
                    @endforeach
                </dl>
            </section>
            <section class="aff-facture-party">
                <h3>Client / livraison</h3>
                <p class="aff-facture-party-name">{{ $clientName ?: '—' }}</p>
                <dl class="aff-facture-details">
                    @foreach (['phone' => 'Téléphone', 'email' => 'E-mail', 'region' => 'Gouvernorat', 'ville' => 'Ville', 'code_postale' => 'Code postal', 'adresse1' => 'Adresse', 'adresse2' => 'Complément'] as $field => $label)
                        <div><dt>{{ $label }}</dt><dd>{{ $delivery($field) ?: '—' }}</dd></div>
                    @endforeach
                </dl>
                @if (filled($record->note))
                    <div class="aff-facture-note"><strong>Note</strong><p>{{ $record->note }}</p></div>
                @endif
            </section>
        </div>

        <div class="aff-facture-table-wrap" role="region" aria-label="Articles de la commande" tabindex="0">
            <table class="aff-facture-table">
                <caption>Articles</caption>
                <thead>
                    <tr>
                        <th scope="col">Produit</th>
                        <th scope="col">Arôme</th>
                        <th scope="col" class="aff-facture-numeric">Qté</th>
                        <th scope="col" class="aff-facture-numeric">P.U (DT)</th>
                        <th scope="col" class="aff-facture-numeric">Total (DT)</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($record->details as $detail)
                        <tr>
                            <td class="aff-facture-product">{{ $detail->product?->designation_fr ?: 'Produit indisponible' }}</td>
                            <td>{{ filled($detail->arome) ? $detail->arome : '—' }}</td>
                            <td class="aff-facture-numeric">{{ $detail->qte }}</td>
                            <td class="aff-facture-numeric">{{ $money($detail->prix_unitaire) }}</td>
                            <td class="aff-facture-numeric">{{ $money((float) $detail->qte * (float) $detail->prix_unitaire) }}</td>
                        </tr>
                    @endforeach
                    @if ($record->details->isEmpty())
                        <tr><td colspan="5" class="aff-facture-empty">Aucun article dans cette commande.</td></tr>
                    @endif
                </tbody>
            </table>
        </div>

        <dl class="aff-facture-totals">
            <div><dt>Total HT</dt><dd>{{ $money($record->prix_ht) }}</dd></div>
            <div><dt>Remise</dt><dd>{{ $money($record->remise) }}</dd></div>
            <div><dt>Frais de livraison</dt><dd>{{ $money($record->frais_livraison) }}</dd></div>
            <div class="aff-facture-total-client"><dt>Total client</dt><dd>{{ $money($record->prix_ttc) }}</dd></div>
            <div class="aff-facture-gain"><dt>Gain affilié</dt><dd>{{ $gain }}</dd></div>
        </dl>
    </div>
</article>
