@php
    $hcCssPath = resource_path('css/filament/historique-client.css');
    $hcCss = is_file($hcCssPath) ? file_get_contents($hcCssPath) : '';
@endphp
<x-filament-panels::page :max-content-width="'7xl'">
    @if($hcCss)
        <style>{!! $hcCss !!}</style>
    @endif

    <div class="historique-client-page">

        {{-- ── A) Search card ── --}}
        <div class="hc-search-card">
            <div class="hc-search-header">
                <div class="hc-search-header-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                </div>
                <h3 class="hc-search-heading">Recherche client</h3>
                <span class="hc-search-sub">Commandes · Tickets · BL · Factures · Devis</span>
            </div>
            <div class="hc-search-body">
                <form wire:submit="search">
                    <div class="hc-search-row">
                        <div class="hc-search-input-wrap">
                            <label class="hc-search-label" for="hc-tel">Téléphone</label>
                            <div class="hc-field-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
                                <input
                                    type="tel"
                                    id="hc-tel"
                                    wire:model="tel"
                                    wire:loading.attr="readonly"
                                    class="hc-search-input"
                                    placeholder="Ex: 21004711"
                                    inputmode="numeric"
                                    autocomplete="tel"
                                />
                            </div>
                            <p class="hc-search-hint">8 chiffres · Préfixe +216 optionnel</p>
                        </div>
                        <div class="hc-search-input-wrap">
                            <label class="hc-search-label" for="hc-name">Nom / Société</label>
                            <div class="hc-field-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
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
        </div>

        @if($this->hasSearchCriteria())
            @if($clients->isEmpty())
                <div class="hc-no-results">
                    <svg class="hc-no-results-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                    <p>Aucun client trouvé pour ce numéro ou ce nom.</p>
                    <p>Vérifiez le numéro (8 chiffres), le nom, ou essayez sans espaces.</p>
                </div>
            @else
                @foreach($clients as $client)
                    @php
                        $commandes   = $this->getCommandes($client);
                        $tickets     = $this->getTickets($client);
                        $factureTvas = $this->getFactureTvas($client);
                        $factures    = $this->getFactures($client);
                        $quotations  = $this->getQuotations($client);
                        $hasAny      = $this->hasAnyHistory($client);
                        $stats       = $this->getClientSummaryStats($client);
                        $statusOptions  = \App\Filament\Pages\HistoriqueClient::getCommandeStatusOptions();
                        $paymentOptions = $this->getCommandePaymentOptions($client);

                        // Avatar
                        $avatarPalette = ['#3b82f6','#0ea5e9','#10b981','#f59e0b','#8b5cf6','#ec4899','#ef4444','#14b8a6'];
                        $firstChar     = strtoupper(mb_substr($client->name ?? 'C', 0, 1));
                        $avatarBg      = $avatarPalette[ord($firstChar) % count($avatarPalette)];
                        $initials      = strtoupper(mb_substr($client->name ?? '?', 0, 2));

                        $defaultTab = $commandes->isNotEmpty() ? 'commandes'
                            : ($tickets->isNotEmpty() ? 'tickets' : 'factures_tva');
                    @endphp

                    {{-- Alpine scope wraps identity + layout so stat tiles can switch tabs --}}
                    <div x-data="{ tab: '{{ $defaultTab }}' }">

                        {{-- ── B) Identity card with stat tiles ── --}}
                        <div class="hc-identity-card">
                            <div class="hc-identity-top">
                                <div class="hc-avatar" style="background:{{ $avatarBg }}">{{ $initials }}</div>
                                <div class="hc-identity-info">
                                    <h2 class="hc-identity-name">{{ $client->name ?? '—' }}</h2>
                                    <div class="hc-identity-meta">
                                        @if($client->phone_1)
                                            <a href="tel:{{ preg_replace('/\D/', '', $client->phone_1) }}">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
                                                {{ $client->phone_1 }}
                                            </a>
                                        @endif
                                        @if($client->phone_2)
                                            <a href="tel:{{ preg_replace('/\D/', '', $client->phone_2) }}">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
                                                {{ $client->phone_2 }}
                                            </a>
                                        @endif
                                        @if($client->email)
                                            <a href="mailto:{{ $client->email }}">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
                                                {{ $client->email }}
                                            </a>
                                        @endif
                                    </div>
                                </div>
                                <div class="hc-identity-actions">
                                    <x-filament::button tag="a" :href="$this->getClientEditUrl($client)" size="sm" color="primary" icon="heroicon-o-user-circle">
                                        Voir fiche
                                    </x-filament::button>
                                    <x-filament::button tag="a" :href="$this->getCreateTicketUrl()" size="sm" color="gray" icon="heroicon-o-ticket" outlined>
                                        Nouveau ticket
                                    </x-filament::button>
                                </div>
                            </div>

                            {{-- Clickable stat tiles that switch the active tab --}}
                            <div class="hc-stat-tiles">
                                <div class="hc-stat-tile" :class="{ 'is-active': tab === 'commandes' }" @click="tab = 'commandes'">
                                    <span class="hc-stat-num">{{ $commandes->count() }}</span>
                                    <span class="hc-stat-lbl">Commandes</span>
                                </div>
                                <div class="hc-stat-tile" :class="{ 'is-active': tab === 'tickets' }" @click="tab = 'tickets'">
                                    <span class="hc-stat-num">{{ $tickets->count() }}</span>
                                    <span class="hc-stat-lbl">Tickets</span>
                                </div>
                                <div class="hc-stat-tile" :class="{ 'is-active': tab === 'factures_tva' }" @click="tab = 'factures_tva'">
                                    <span class="hc-stat-num">{{ $factureTvas->count() }}</span>
                                    <span class="hc-stat-lbl">Factures TVA</span>
                                </div>
                                <div class="hc-stat-tile" :class="{ 'is-active': tab === 'bl' }" @click="tab = 'bl'">
                                    <span class="hc-stat-num">{{ $factures->count() }}</span>
                                    <span class="hc-stat-lbl">Bons de livr.</span>
                                </div>
                                <div class="hc-stat-tile" :class="{ 'is-active': tab === 'devis' }" @click="tab = 'devis'">
                                    <span class="hc-stat-num">{{ $quotations->count() }}</span>
                                    <span class="hc-stat-lbl">Devis</span>
                                </div>
                            </div>
                        </div>

                        {{-- ── 2-column layout: tabs + sidebar ── --}}
                        <div class="hc-layout">
                            <div class="hc-main">

                                {{-- ── C) Tabs ── --}}
                                <div class="hc-tabs-card">
                                    <nav class="hc-tabs-nav" aria-label="Onglets">
                                        <button type="button" class="hc-tab-btn" :class="{ 'is-active': tab === 'commandes' }" @click="tab = 'commandes'">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>
                                            Commandes <span class="hc-tab-count">{{ $commandes->count() }}</span>
                                        </button>
                                        <button type="button" class="hc-tab-btn" :class="{ 'is-active': tab === 'tickets' }" @click="tab = 'tickets'">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" /></svg>
                                            Tickets <span class="hc-tab-count">{{ $tickets->count() }}</span>
                                        </button>
                                        <button type="button" class="hc-tab-btn" :class="{ 'is-active': tab === 'factures_tva' }" @click="tab = 'factures_tva'">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>
                                            Factures TVA <span class="hc-tab-count">{{ $factureTvas->count() }}</span>
                                        </button>
                                        <button type="button" class="hc-tab-btn" :class="{ 'is-active': tab === 'bl' }" @click="tab = 'bl'">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
                                            BL <span class="hc-tab-count">{{ $factures->count() }}</span>
                                        </button>
                                        <button type="button" class="hc-tab-btn" :class="{ 'is-active': tab === 'devis' }" @click="tab = 'devis'">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                                            Devis <span class="hc-tab-count">{{ $quotations->count() }}</span>
                                        </button>
                                    </nav>

                                    <div class="hc-tabs-content">

                                        {{-- Commandes --}}
                                        <div x-show="tab === 'commandes'" x-cloak
                                             x-data="{ search: '', statusFilter: '', paymentFilter: '' }">
                                            @if($commandes->isNotEmpty())
                                                <div class="hc-table-filters">
                                                    <div class="hc-table-search">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
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
                                                                <th>N° Commande</th>
                                                                <th>Date</th>
                                                                <th class="hc-cell-right">Total TTC</th>
                                                                <th>Statut</th>
                                                                <th>Paiement</th>
                                                                <th class="hc-cell-action"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            @foreach($commandes as $c)
                                                                @php
                                                                    $statusLabel = \App\Models\Commande::getStatusLabel($c->etat ?? '');
                                                                    $etat = $c->etat ?? '';
                                                                    $sClass = match(true) {
                                                                        in_array($etat, ['livrer','livre','livré','delivered','complete','completed']) => 'hc-status-ok',
                                                                        in_array($etat, ['annuler','annulé','cancelled','canceled','refuse','refusé']) => 'hc-status-danger',
                                                                        in_array($etat, ['confirmer','confirmé','confirmed','en_cours','preparation','shipping','shipped']) => 'hc-status-info',
                                                                        in_array($etat, ['en_attente','attente','pending','nouveau','new','draft']) => 'hc-status-warn',
                                                                        default => 'hc-status-neutral',
                                                                    };
                                                                @endphp
                                                                <tr class="hc-row-link"
                                                                    data-numero="{{ $c->numero ?? '' }}"
                                                                    data-status="{{ $c->etat ?? '' }}"
                                                                    data-status-label="{{ $statusLabel }}"
                                                                    data-payment="{{ $c->payment_method ?? '' }}"
                                                                    x-show="(!search || (($el.dataset.numero||'')+' '+($el.dataset.statusLabel||'')).toLowerCase().includes(search.toLowerCase())) && (!statusFilter || $el.dataset.status===statusFilter) && (!paymentFilter || $el.dataset.payment===paymentFilter)"
                                                                    onclick="window.location='{{ $this->getCommandeEditUrl($c) }}'">
                                                                    <td><span class="hc-number-ref">{{ $c->numero ?? '—' }}</span></td>
                                                                    <td class="hc-cell-muted">{{ $c->created_at?->format('d/m/Y') ?? '—' }}</td>
                                                                    <td class="hc-cell-right"><span class="hc-amount">{{ number_format((float)($c->prix_ttc ?? 0), 2, ',', ' ') }} TND</span></td>
                                                                    <td><span class="hc-status {{ $sClass }}">{{ $statusLabel }}</span></td>
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

                                        {{-- Tickets --}}
                                        <div x-show="tab === 'tickets'" x-cloak>
                                            @if($tickets->isNotEmpty())
                                                <div class="hc-table-wrap">
                                                    <table class="hc-table">
                                                        <thead>
                                                            <tr>
                                                                <th>N° Ticket</th>
                                                                <th>Date</th>
                                                                <th class="hc-cell-right">Total TTC</th>
                                                                <th>Type</th>
                                                                <th class="hc-cell-action"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            @foreach($tickets as $t)
                                                                @php $isBL = $t->type === \App\Models\Ticket::TYPE_BON_LIVRAISON; @endphp
                                                                <tr class="hc-row-link" onclick="window.location='{{ $this->getTicketEditUrl($t) }}'">
                                                                    <td><span class="hc-number-ref">{{ $t->numero ?? '—' }}</span></td>
                                                                    <td class="hc-cell-muted">{{ $t->created_at?->format('d/m/Y') ?? '—' }}</td>
                                                                    <td class="hc-cell-right"><span class="hc-amount">{{ number_format((float)($t->prix_ttc ?? $t->prix_total ?? 0), 2, ',', ' ') }} TND</span></td>
                                                                    <td><span class="hc-status {{ $isBL ? 'hc-status-info' : 'hc-status-neutral' }}">{{ $isBL ? 'BL' : 'Caisse' }}</span></td>
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

                                        {{-- Factures TVA --}}
                                        <div x-show="tab === 'factures_tva'" x-cloak>
                                            @if($factureTvas->isNotEmpty())
                                                <div class="hc-table-wrap">
                                                    <table class="hc-table">
                                                        <thead>
                                                            <tr>
                                                                <th>N° Facture</th>
                                                                <th>Date</th>
                                                                <th class="hc-cell-right">Total TTC</th>
                                                                <th>Statut</th>
                                                                <th class="hc-cell-action"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            @foreach($factureTvas as $f)
                                                                @php
                                                                    $sv = strtolower((string)($f->status?->value ?? $f->status ?? ''));
                                                                    $sc = match(true) {
                                                                        str_contains($sv,'pay')||str_contains($sv,'valid') => 'hc-status-ok',
                                                                        str_contains($sv,'annul')||str_contains($sv,'cancel')||str_contains($sv,'refus') => 'hc-status-danger',
                                                                        str_contains($sv,'envoy')||str_contains($sv,'sent') => 'hc-status-info',
                                                                        str_contains($sv,'attent')||str_contains($sv,'pend')||str_contains($sv,'draft') => 'hc-status-warn',
                                                                        default => 'hc-status-neutral',
                                                                    };
                                                                @endphp
                                                                <tr class="hc-row-link" onclick="window.location='{{ $this->getFactureTvaEditUrl($f) }}'">
                                                                    <td><span class="hc-number-ref">{{ $f->numero ?? '—' }}</span></td>
                                                                    <td class="hc-cell-muted">{{ $f->date_facture?->format('d/m/Y') ?? $f->created_at?->format('d/m/Y') ?? '—' }}</td>
                                                                    <td class="hc-cell-right"><span class="hc-amount">{{ number_format((float)($f->prix_ttc ?? $f->prix_total ?? 0), 2, ',', ' ') }} TND</span></td>
                                                                    <td><span class="hc-status {{ $sc }}">{{ $f->status?->label() ?? $f->status ?? '—' }}</span></td>
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

                                        {{-- BL --}}
                                        <div x-show="tab === 'bl'" x-cloak>
                                            @if($factures->isNotEmpty())
                                                <div class="hc-table-wrap">
                                                    <table class="hc-table">
                                                        <thead>
                                                            <tr>
                                                                <th>N° BL</th>
                                                                <th>Date</th>
                                                                <th class="hc-cell-right">Total TTC</th>
                                                                <th>Statut</th>
                                                                <th class="hc-cell-action"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            @foreach($factures as $f)
                                                                @php
                                                                    $bv = strtolower((string)($f->status?->value ?? $f->status ?? ''));
                                                                    $bc = match(true) {
                                                                        str_contains($bv,'pay')||str_contains($bv,'valid')||str_contains($bv,'livr') => 'hc-status-ok',
                                                                        str_contains($bv,'annul')||str_contains($bv,'cancel') => 'hc-status-danger',
                                                                        str_contains($bv,'attent')||str_contains($bv,'pend') => 'hc-status-warn',
                                                                        default => 'hc-status-neutral',
                                                                    };
                                                                @endphp
                                                                <tr class="hc-row-link" onclick="window.location='{{ $this->getFactureEditUrl($f) }}'">
                                                                    <td><span class="hc-number-ref">{{ $f->numero ?? '—' }}</span></td>
                                                                    <td class="hc-cell-muted">{{ $f->created_at?->format('d/m/Y') ?? '—' }}</td>
                                                                    <td class="hc-cell-right"><span class="hc-amount">{{ number_format((float)($f->prix_ttc ?? 0), 2, ',', ' ') }} TND</span></td>
                                                                    <td><span class="hc-status {{ $bc }}">{{ $f->status?->label() ?? $f->status ?? '—' }}</span></td>
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

                                        {{-- Devis --}}
                                        <div x-show="tab === 'devis'" x-cloak>
                                            @if($quotations->isNotEmpty())
                                                <div class="hc-table-wrap">
                                                    <table class="hc-table">
                                                        <thead>
                                                            <tr>
                                                                <th>N° Devis</th>
                                                                <th>Date</th>
                                                                <th class="hc-cell-right">Total TTC</th>
                                                                <th>Statut</th>
                                                                <th class="hc-cell-action"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            @foreach($quotations as $q)
                                                                @php
                                                                    $qv = strtolower((string)($q->status?->value ?? $q->status ?? ''));
                                                                    $qc = match(true) {
                                                                        str_contains($qv,'accept')||str_contains($qv,'valid') => 'hc-status-ok',
                                                                        str_contains($qv,'refus')||str_contains($qv,'annul')||str_contains($qv,'cancel') => 'hc-status-danger',
                                                                        str_contains($qv,'envoy')||str_contains($qv,'sent') => 'hc-status-info',
                                                                        str_contains($qv,'attent')||str_contains($qv,'pend')||str_contains($qv,'draft')||str_contains($qv,'brouill') => 'hc-status-warn',
                                                                        default => 'hc-status-neutral',
                                                                    };
                                                                @endphp
                                                                <tr class="hc-row-link" onclick="window.location='{{ $this->getQuotationEditUrl($q) }}'">
                                                                    <td><span class="hc-number-ref">{{ $q->numero ?? '—' }}</span></td>
                                                                    <td class="hc-cell-muted">{{ $q->date_quotation?->format('d/m/Y') ?? $q->created_at?->format('d/m/Y') ?? '—' }}</td>
                                                                    <td class="hc-cell-right"><span class="hc-amount">{{ number_format((float)($q->prix_total ?? 0), 2, ',', ' ') }} TND</span></td>
                                                                    <td><span class="hc-status {{ $qc }}">{{ $q->status?->label() ?? $q->status ?? '—' }}</span></td>
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

                                    </div>{{-- /hc-tabs-content --}}
                                </div>{{-- /hc-tabs-card --}}

                                @if(!$hasAny)
                                    <div class="hc-no-results">
                                        <p>Aucun document trouvé pour ce client.</p>
                                        <p>Aucune commande, ticket, BL, facture TVA ou devis.</p>
                                    </div>
                                @endif

                            </div>{{-- /hc-main --}}

                            {{-- ── Sidebar ── --}}
                            <div class="hc-sidebar">
                                <div class="hc-summary-card">
                                    <div class="hc-summary-header">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
                                        Résumé client
                                    </div>
                                    <div class="hc-summary-total-block">
                                        <p class="hc-summary-total-label">Total dépensé</p>
                                        <p class="hc-summary-total-amount">
                                            {{ number_format($stats['total_spent'], 2, ',', ' ') }}<span class="hc-summary-total-cur">TND</span>
                                        </p>
                                    </div>
                                    <div class="hc-summary-stats">
                                        <div class="hc-summary-stat">
                                            <span class="hc-summary-stat-left">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>
                                                Commandes
                                            </span>
                                            <span class="hc-summary-stat-val">{{ $commandes->count() }}</span>
                                        </div>
                                        <div class="hc-summary-stat">
                                            <span class="hc-summary-stat-left">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" /></svg>
                                                Panier moyen
                                            </span>
                                            <span class="hc-summary-stat-val">{{ number_format($stats['avg_basket'], 0, ',', ' ') }} TND</span>
                                        </div>
                                        <div class="hc-summary-stat">
                                            <span class="hc-summary-stat-left">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
                                                Dernière commande
                                            </span>
                                            <span class="hc-summary-stat-val">{{ $stats['last_order_date'] ?? '—' }}</span>
                                        </div>
                                        @php $otherDocs = $tickets->count() + $factureTvas->count() + $factures->count() + $quotations->count(); @endphp
                                        @if($otherDocs > 0)
                                        <div class="hc-summary-stat">
                                            <span class="hc-summary-stat-left">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                                                Autres documents
                                            </span>
                                            <span class="hc-summary-stat-val">{{ $otherDocs }}</span>
                                        </div>
                                        @endif
                                    </div>
                                </div>
                            </div>{{-- /hc-sidebar --}}

                        </div>{{-- /hc-layout --}}

                    </div>{{-- /x-data --}}
                @endforeach
            @endif
        @endif

    </div>{{-- /historique-client-page --}}
</x-filament-panels::page>
