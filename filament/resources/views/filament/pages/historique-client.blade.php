@php
    $hcCssPath = resource_path('css/filament/historique-client.css');
    $hcCss = is_file($hcCssPath) ? file_get_contents($hcCssPath) : '';
@endphp
<x-filament-panels::page :max-content-width="'7xl'">
    @if($hcCss)
        <style>{!! $hcCss !!}</style>
    @endif

    <div class="historique-client-page">
        {{-- A) Search card --}}
        <div class="hc-search-card">
            <h3 class="hc-search-heading">Recherche client</h3>
            <form wire:submit="search">
                <div class="hc-search-row">
                    <div class="hc-search-input-wrap">
                        <label class="hc-search-label" for="hc-tel">Téléphone</label>
                        <input
                            type="tel"
                            id="hc-tel"
                            wire:model="tel"
                            wire:loading.attr="readonly"
                            class="hc-search-input"
                            placeholder="8 chiffres ou +216..."
                            inputmode="numeric"
                            autocomplete="tel"
                        />
                        <p class="hc-search-hint">Format Tunisie : 8 chiffres (ex. 21004711). Préfixe +216 optionnel.</p>
                    </div>
                    <div class="hc-search-input-wrap">
                        <label class="hc-search-label" for="hc-name">Nom</label>
                        <input
                            type="text"
                            id="hc-name"
                            wire:model="name"
                            wire:loading.attr="readonly"
                            class="hc-search-input"
                            placeholder="Ex: Mohamed, Société XYZ"
                            autocomplete="name"
                        />
                    </div>
                    <button type="submit" wire:loading.attr="disabled" class="hc-search-btn">
                        <x-filament::loading-indicator wire:loading wire:target="search" class="size-5 shrink-0" />
                        <x-filament::icon icon="heroicon-o-magnifying-glass" class="size-5 shrink-0" wire:loading.remove wire:target="search" />
                        <span wire:loading.remove wire:target="search">Chercher</span>
                        <span wire:loading wire:target="search">Recherche...</span>
                    </button>
                </div>
            </form>
        </div>

        @if($this->hasSearchCriteria())
            @if($clients->isEmpty())
                <div class="hc-no-results">
                    <p>Aucun client trouvé pour ce numéro ou ce nom.</p>
                    <p>Vérifiez le numéro (8 chiffres), le nom, ou essayez sans espaces.</p>
                </div>
            @else
                @foreach($clients as $client)
                    @php
                        $commandes = $this->getCommandes($client);
                        $tickets = $this->getTickets($client);
                        $factureTvas = $this->getFactureTvas($client);
                        $factures = $this->getFactures($client);
                        $quotations = $this->getQuotations($client);
                        $hasAny = $this->hasAnyHistory($client);
                        $stats = $this->getClientSummaryStats($client);
                        $statusOptions = \App\Filament\Pages\HistoriqueClient::getCommandeStatusOptions();
                        $paymentOptions = $this->getCommandePaymentOptions($client);
                    @endphp

                    <div class="hc-layout">
                        <div class="hc-main">
                            {{-- B) Client identity card --}}
                            <div class="hc-identity-card">
                                <div class="hc-identity-grid">
                                    <div>
                                        <h2 class="hc-identity-name">{{ $client->name ?? '—' }}</h2>
                                        <div class="hc-identity-meta">
                                            @if($client->phone_1)
                                                <a href="tel:{{ preg_replace('/\D/', '', $client->phone_1) }}" title="Copier">{{ $client->phone_1 }}</a>
                                            @endif
                                            @if($client->phone_2)
                                                <a href="tel:{{ preg_replace('/\D/', '', $client->phone_2) }}" title="Copier">{{ $client->phone_2 }}</a>
                                            @endif
                                            @if($client->email)
                                                <a href="mailto:{{ $client->email }}" title="Envoyer un email">{{ $client->email }}</a>
                                            @endif
                                        </div>
                                        <div class="hc-identity-badges">
                                            <span class="hc-badge hc-badge-primary">Commandes ({{ $commandes->count() }})</span>
                                            <span class="hc-badge">Tickets ({{ $tickets->count() }})</span>
                                            <span class="hc-badge">Factures TVA ({{ $factureTvas->count() }})</span>
                                            <span class="hc-badge">BL ({{ $factures->count() }})</span>
                                            <span class="hc-badge">Devis ({{ $quotations->count() }})</span>
                                        </div>
                                    </div>
                                    <div class="hc-identity-actions">
                                        <x-filament::button tag="a" :href="$this->getClientEditUrl($client)" size="sm" color="primary" icon="heroicon-o-user-circle">
                                            Voir fiche client
                                        </x-filament::button>
                                        <x-filament::button tag="a" :href="$this->getCreateTicketUrl()" size="sm" color="gray" icon="heroicon-o-ticket" outlined>
                                            Créer un ticket
                                        </x-filament::button>
                                    </div>
                                </div>
                            </div>

                            {{-- C) Tabs --}}
                            <div class="hc-tabs-card" x-data="{ tab: '{{ $commandes->isNotEmpty() ? 'commandes' : ($tickets->isNotEmpty() ? 'tickets' : 'factures_tva') }}' }">
                                <nav class="hc-tabs-nav" aria-label="Onglets">
                                    <button type="button" class="hc-tab-btn" :class="{ 'is-active': tab === 'commandes' }" @click="tab = 'commandes'">Commandes ({{ $commandes->count() }})</button>
                                    <button type="button" class="hc-tab-btn" :class="{ 'is-active': tab === 'tickets' }" @click="tab = 'tickets'">Tickets ({{ $tickets->count() }})</button>
                                    <button type="button" class="hc-tab-btn" :class="{ 'is-active': tab === 'factures_tva' }" @click="tab = 'factures_tva'">Factures TVA ({{ $factureTvas->count() }})</button>
                                    <button type="button" class="hc-tab-btn" :class="{ 'is-active': tab === 'bl' }" @click="tab = 'bl'">Bons de livraison ({{ $factures->count() }})</button>
                                    <button type="button" class="hc-tab-btn" :class="{ 'is-active': tab === 'devis' }" @click="tab = 'devis'">Devis ({{ $quotations->count() }})</button>
                                </nav>

                                <div class="hc-tabs-content">
                                    {{-- Commandes tab --}}
                                    <div x-show="tab === 'commandes'" x-cloak
                                         x-data="{ search: '', statusFilter: '', paymentFilter: '' }">
                                        @if($commandes->isNotEmpty())
                                            <div class="hc-table-filters">
                                                <div class="hc-table-search">
                                                    <input type="text" x-model="search" placeholder="Rechercher N°, statut..." />
                                                </div>
                                                <select class="hc-table-select" x-model="statusFilter">
                                                    <option value="">Tous les statuts</option>
                                                    @foreach($statusOptions as $val => $label)
                                                        <option value="{{ $val }}">{{ $label }}</option>
                                                    @endforeach
                                                </select>
                                                <select class="hc-table-select" x-model="paymentFilter">
                                                    @foreach($paymentOptions as $val => $label)
                                                        <option value="{{ $val }}">{{ $label }}</option>
                                                    @endforeach
                                                </select>
                                            </div>
                                            <div class="hc-table-wrap">
                                                <table class="hc-table">
                                                    <thead>
                                                        <tr>
                                                            <th>N°</th>
                                                            <th>Date</th>
                                                            <th class="hc-cell-right">Total</th>
                                                            <th>Statut</th>
                                                            <th>Paiement</th>
                                                            <th class="hc-cell-action"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        @foreach($commandes as $c)
                                                            @php $statusLabel = \App\Models\Commande::getStatusLabel($c->etat ?? ''); @endphp
                                                            <tr class="hc-row-link"
                                                                data-numero="{{ $c->numero ?? '' }}"
                                                                data-status="{{ $c->etat ?? '' }}"
                                                                data-status-label="{{ $statusLabel }}"
                                                                data-payment="{{ $c->payment_method ?? '' }}"
                                                                x-show="(!search || (($el.dataset.numero || '') + ' ' + ($el.dataset.statusLabel || '')).toLowerCase().includes(search.toLowerCase())) && (!statusFilter || $el.dataset.status === statusFilter) && (!paymentFilter || $el.dataset.payment === paymentFilter)"
                                                                onclick="window.location='{{ $this->getCommandeEditUrl($c) }}'">
                                                                <td>{{ $c->numero ?? '—' }}</td>
                                                                <td class="hc-cell-muted">{{ $c->created_at?->format('d/m/Y') ?? '—' }}</td>
                                                                <td class="hc-cell-right">{{ number_format((float)($c->prix_ttc ?? 0), 2, ',', ' ') }} TND</td>
                                                                <td class="hc-cell-muted">{{ $statusLabel }}</td>
                                                                <td class="hc-cell-muted">{{ $c->payment_method ?? '—' }}</td>
                                                                <td class="hc-cell-action" @click.stop>
                                                                    <x-filament::icon-button icon="heroicon-o-arrow-top-right-on-square" size="sm" tag="a" :href="$this->getCommandeEditUrl($c)" :tooltip="'Ouvrir'" />
                                                                </td>
                                                            </tr>
                                                        @endforeach
                                                    </tbody>
                                                </table>
                                            </div>
                                        @else
                                            <div class="hc-empty">
                                                <x-filament::icon icon="heroicon-o-shopping-cart" class="hc-empty-icon" />
                                                <p class="hc-empty-title">Aucune commande</p>
                                                <p class="hc-empty-hint">Ce client n'a pas encore passé de commande.</p>
                                            </div>
                                        @endif
                                    </div>

                                    {{-- Tickets tab --}}
                                    <div x-show="tab === 'tickets'" x-cloak>
                                        @if($tickets->isNotEmpty())
                                            <div class="hc-table-wrap">
                                                <table class="hc-table">
                                                    <thead>
                                                        <tr>
                                                            <th>N°</th>
                                                            <th>Date</th>
                                                            <th class="hc-cell-right">Total</th>
                                                            <th>Type</th>
                                                            <th class="hc-cell-action"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        @foreach($tickets as $t)
                                                            <tr class="hc-row-link" onclick="window.location='{{ $this->getTicketEditUrl($t) }}'">
                                                                <td>{{ $t->numero ?? '—' }}</td>
                                                                <td class="hc-cell-muted">{{ $t->created_at?->format('d/m/Y') ?? '—' }}</td>
                                                                <td class="hc-cell-right">{{ number_format((float)($t->prix_ttc ?? $t->prix_total ?? 0), 2, ',', ' ') }} TND</td>
                                                                <td class="hc-cell-muted">{{ $t->type === \App\Models\Ticket::TYPE_BON_LIVRAISON ? 'BL' : 'Caisse' }}</td>
                                                                <td class="hc-cell-action">
                                                                    <x-filament::icon-button icon="heroicon-o-arrow-top-right-on-square" size="sm" tag="a" :href="$this->getTicketEditUrl($t)" :tooltip="'Ouvrir'" />
                                                                </td>
                                                            </tr>
                                                        @endforeach
                                                    </tbody>
                                                </table>
                                            </div>
                                        @else
                                            <div class="hc-empty">
                                                <x-filament::icon icon="heroicon-o-ticket" class="hc-empty-icon" />
                                                <p class="hc-empty-title">Aucun ticket</p>
                                                <p class="hc-empty-hint">Aucun ticket pour ce client.</p>
                                            </div>
                                        @endif
                                    </div>

                                    {{-- Factures TVA tab --}}
                                    <div x-show="tab === 'factures_tva'" x-cloak>
                                        @if($factureTvas->isNotEmpty())
                                            <div class="hc-table-wrap">
                                                <table class="hc-table">
                                                    <thead>
                                                        <tr>
                                                            <th>N°</th>
                                                            <th>Date</th>
                                                            <th class="hc-cell-right">Total</th>
                                                            <th>Statut</th>
                                                            <th class="hc-cell-action"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        @foreach($factureTvas as $f)
                                                            <tr class="hc-row-link" onclick="window.location='{{ $this->getFactureTvaEditUrl($f) }}'">
                                                                <td>{{ $f->numero ?? '—' }}</td>
                                                                <td class="hc-cell-muted">{{ $f->date_facture?->format('d/m/Y') ?? $f->created_at?->format('d/m/Y') ?? '—' }}</td>
                                                                <td class="hc-cell-right">{{ number_format((float)($f->prix_ttc ?? $f->prix_total ?? 0), 2, ',', ' ') }} TND</td>
                                                                <td class="hc-cell-muted">{{ $f->status?->label() ?? $f->status ?? '—' }}</td>
                                                                <td class="hc-cell-action" @click.stop>
                                                                    <x-filament::icon-button icon="heroicon-o-arrow-top-right-on-square" size="sm" tag="a" :href="$this->getFactureTvaEditUrl($f)" :tooltip="'Ouvrir'" />
                                                                </td>
                                                            </tr>
                                                        @endforeach
                                                    </tbody>
                                                </table>
                                            </div>
                                        @else
                                            <div class="hc-empty">
                                                <x-filament::icon icon="heroicon-o-document-text" class="hc-empty-icon" />
                                                <p class="hc-empty-title">Aucune facture TVA</p>
                                                <p class="hc-empty-hint">Aucune facture TVA pour ce client.</p>
                                            </div>
                                        @endif
                                    </div>

                                    {{-- BL tab --}}
                                    <div x-show="tab === 'bl'" x-cloak>
                                        @if($factures->isNotEmpty())
                                            <div class="hc-table-wrap">
                                                <table class="hc-table">
                                                    <thead>
                                                        <tr>
                                                            <th>N°</th>
                                                            <th>Date</th>
                                                            <th class="hc-cell-right">Total</th>
                                                            <th>Statut</th>
                                                            <th class="hc-cell-action"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        @foreach($factures as $f)
                                                            <tr class="hc-row-link" onclick="window.location='{{ $this->getFactureEditUrl($f) }}'">
                                                                <td>{{ $f->numero ?? '—' }}</td>
                                                                <td class="hc-cell-muted">{{ $f->created_at?->format('d/m/Y') ?? '—' }}</td>
                                                                <td class="hc-cell-right">{{ number_format((float)($f->prix_ttc ?? 0), 2, ',', ' ') }} TND</td>
                                                                <td class="hc-cell-muted">{{ $f->status?->label() ?? $f->status ?? '—' }}</td>
                                                                <td class="hc-cell-action">
                                                                    <x-filament::icon-button icon="heroicon-o-arrow-top-right-on-square" size="sm" tag="a" :href="$this->getFactureEditUrl($f)" :tooltip="'Ouvrir'" />
                                                                </td>
                                                            </tr>
                                                        @endforeach
                                                    </tbody>
                                                </table>
                                            </div>
                                        @else
                                            <div class="hc-empty">
                                                <x-filament::icon icon="heroicon-o-truck" class="hc-empty-icon" />
                                                <p class="hc-empty-title">Aucun bon de livraison</p>
                                                <p class="hc-empty-hint">Aucun BL pour ce client.</p>
                                            </div>
                                        @endif
                                    </div>

                                    {{-- Devis tab --}}
                                    <div x-show="tab === 'devis'" x-cloak>
                                        @if($quotations->isNotEmpty())
                                            <div class="hc-table-wrap">
                                                <table class="hc-table">
                                                    <thead>
                                                        <tr>
                                                            <th>N°</th>
                                                            <th>Date</th>
                                                            <th class="hc-cell-right">Total</th>
                                                            <th>Statut</th>
                                                            <th class="hc-cell-action"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        @foreach($quotations as $q)
                                                            <tr class="hc-row-link" onclick="window.location='{{ $this->getQuotationEditUrl($q) }}'">
                                                                <td>{{ $q->numero ?? '—' }}</td>
                                                                <td class="hc-cell-muted">{{ $q->date_quotation?->format('d/m/Y') ?? $q->created_at?->format('d/m/Y') ?? '—' }}</td>
                                                                <td class="hc-cell-right">{{ number_format((float)($q->prix_total ?? 0), 2, ',', ' ') }} TND</td>
                                                                <td class="hc-cell-muted">{{ $q->status?->label() ?? $q->status ?? '—' }}</td>
                                                                <td class="hc-cell-action" @click.stop>
                                                                    <x-filament::icon-button icon="heroicon-o-arrow-top-right-on-square" size="sm" tag="a" :href="$this->getQuotationEditUrl($q)" :tooltip="'Ouvrir'" />
                                                                </td>
                                                            </tr>
                                                        @endforeach
                                                    </tbody>
                                                </table>
                                            </div>
                                        @else
                                            <div class="hc-empty">
                                                <x-filament::icon icon="heroicon-o-clipboard-document-list" class="hc-empty-icon" />
                                                <p class="hc-empty-title">Aucun devis</p>
                                                <p class="hc-empty-hint">Aucun devis pour ce client.</p>
                                            </div>
                                        @endif
                                    </div>
                                </div>
                            </div>

                            @if(!$hasAny)
                                <div class="hc-no-results">
                                    <p>Aucun document trouvé pour ce client.</p>
                                    <p>Aucune commande, ticket, BL, facture TVA ou devis.</p>
                                </div>
                            @endif
                        </div>

                        {{-- Sidebar: Résumé --}}
                        <div class="hc-sidebar">
                            <div class="hc-summary-card">
                                <h3 class="hc-summary-heading">Résumé</h3>
                                <div class="hc-summary-list">
                                    <div class="hc-summary-item">
                                        <span class="hc-label">Total dépensé</span>
                                        <span class="hc-value">{{ number_format($stats['total_spent'], 2, ',', ' ') }} TND</span>
                                    </div>
                                    <div class="hc-summary-item">
                                        <span class="hc-label">Dernière commande</span>
                                        <span class="hc-value">{{ $stats['last_order_date'] ?? '—' }}</span>
                                    </div>
                                    <div class="hc-summary-item">
                                        <span class="hc-label">Panier moyen</span>
                                        <span class="hc-value">{{ number_format($stats['avg_basket'], 2, ',', ' ') }} TND</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                @endforeach
            @endif
        @endif
    </div>
</x-filament-panels::page>
