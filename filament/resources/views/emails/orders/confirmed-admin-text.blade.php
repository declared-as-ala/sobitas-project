NOUVELLE COMMANDE #{{ $commande->numero }}

Client : {{ trim(($commande->livraison_nom ?? $commande->nom ?? '').' '.($commande->livraison_prenom ?? $commande->prenom ?? '')) ?: 'Non renseigné' }}
Téléphone : {{ $commande->livraison_phone ?? $commande->phone ?? 'Non renseigné' }}
Email : {{ $commande->livraison_email ?? $commande->email ?? 'Non renseigné' }}
Adresse : {{ collect([$commande->livraison_adresse1 ?? $commande->adresse1 ?? null, $commande->livraison_ville ?? $commande->ville ?? null, $commande->livraison_region ?? $commande->region ?? null, $commande->livraison_code_postale ?? $commande->code_postale ?? null])->filter()->implode(', ') ?: 'Non renseignée' }}

PRODUITS
@foreach($commande->details as $detail)
- {{ $detail->product->designation_fr ?? 'Produit' }} × {{ $detail->qte }} : {{ number_format($detail->qte * $detail->prix_unitaire, 3, '.', ' ') }} TND
@endforeach

TOTAL : {{ number_format((float) $commande->prix_ttc, 3, '.', ' ') }} TND
Paiement : {{ ($commande->payment_method ?? '') === 'card' ? 'Carte bancaire' : 'Paiement à la livraison' }}

Traiter la commande : {{ url(\App\Filament\Resources\CommandeResource::getUrl('edit', ['record' => $commande])) }}
