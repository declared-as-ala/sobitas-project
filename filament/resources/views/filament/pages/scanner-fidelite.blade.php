<x-filament-panels::page>

<style>
.sf-wrap { max-width: 760px; margin: 0 auto; font-family: 'Inter', sans-serif; }

/* ── Scan zone ── */
.sf-scan-zone {
    background: #1e293b;
    border-radius: 14px;
    padding: 28px 32px;
    margin-bottom: 20px;
    text-align: center;
}
.sf-scan-title {
    color: #94a3b8;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .1em;
    margin-bottom: 14px;
}
.sf-scan-row {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: center;
}
.sf-scan-input {
    flex: 1;
    max-width: 480px;
    border: 2px solid #334155;
    border-radius: 10px;
    padding: 14px 18px;
    font-size: 18px;
    background: #0f172a;
    color: #f1f5f9;
    outline: none;
    transition: border-color .2s;
    font-family: 'Courier New', monospace;
    letter-spacing: 1px;
}
.sf-scan-input:focus { border-color: #f97316; box-shadow: 0 0 0 3px rgba(249,115,22,.2); }
.sf-scan-input::placeholder { color: #475569; font-family: sans-serif; letter-spacing: 0; }
.sf-scan-btn {
    background: #f97316; color: #fff; border: none; border-radius: 10px;
    padding: 14px 24px; font-size: 15px; font-weight: 700; cursor: pointer; transition: background .2s;
}
.sf-scan-btn:hover { background: #ea580c; }

/* ── Not found ── */
.sf-not-found {
    background: #fef2f2; border: 1.5px solid #fecaca; border-radius: 10px;
    padding: 16px 20px; color: #dc2626; font-weight: 600;
    display: flex; align-items: center; gap: 10px; margin-bottom: 20px;
}

/* ── Card panel ── */
.sf-card-panel { background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,.06); }

.sf-card-header {
    background: #1e293b;
    padding: 16px 22px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}
.sf-card-number {
    font-family: 'Courier New', monospace;
    font-size: 20px;
    font-weight: 800;
    color: #e2b96f;
    flex: 1;
}
.sf-status-badge {
    padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .05em;
}
.sf-status-available { background: #e2e8f0; color: #475569; }
.sf-status-active    { background: #dcfce7; color: #166534; }
.sf-status-lost      { background: #fee2e2; color: #991b1b; }
.sf-status-retired   { background: #fef3c7; color: #92400e; }

.sf-batch-tag { font-size: 11px; color: #94a3b8; background: #0f172a; padding: 3px 10px; border-radius: 6px; }
.sf-btn-clear { margin-left: auto; background: transparent; border: 1px solid #475569; color: #94a3b8; border-radius: 6px; padding: 5px 12px; font-size: 13px; cursor: pointer; transition: all .2s; }
.sf-btn-clear:hover { background: #334155; color: #fff; }

.sf-card-body { padding: 24px; }

/* ── Unassigned zone ── */
.sf-unassigned-alert {
    background: #fffbeb; border: 1.5px solid #fcd34d; border-radius: 10px;
    padding: 14px 18px; margin-bottom: 20px;
    display: flex; align-items: center; gap: 10px; color: #92400e; font-weight: 600;
}
.sf-assign-label { font-size: 12px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; }
.sf-search-input {
    width: 100%; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 14px;
    font-size: 15px; outline: none; transition: border-color .2s; margin-bottom: 0;
}
.sf-search-input:focus { border-color: #f97316; }
.sf-results-list { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-top: 4px; }
.sf-result-item {
    padding: 10px 14px; font-size: 14px; cursor: pointer;
    border-bottom: 1px solid #f1f5f9; transition: background .15s;
}
.sf-result-item:last-child { border-bottom: none; }
.sf-result-item:hover { background: #fff7ed; }
.sf-result-item.is-selected { background: #fff7ed; font-weight: 700; color: #c2410c; }

.sf-btn-assign {
    background: #16a34a; color: #fff; border: none; border-radius: 8px;
    padding: 10px 22px; font-size: 14px; font-weight: 700; cursor: pointer;
    margin-top: 10px; width: 100%; transition: background .2s;
}
.sf-btn-assign:hover { background: #15803d; }

.sf-divider { display: flex; align-items: center; gap: 12px; margin: 18px 0; color: #9ca3af; font-size: 13px; }
.sf-divider::before, .sf-divider::after { content:''; flex:1; border-top: 1px solid #e5e7eb; }

.sf-btn-new { background: #f3f4f6; color: #374151; border: 1.5px dashed #d1d5db; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all .2s; width: 100%; }
.sf-btn-new:hover { background: #e5e7eb; }

.sf-new-form { display: flex; flex-direction: column; gap: 10px; }
.sf-form-input {
    border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 14px;
    font-size: 14px; outline: none; transition: border-color .2s;
}
.sf-form-input:focus { border-color: #f97316; }

.sf-form-row { display: flex; gap: 10px; }
.sf-btn-cancel { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; flex: 0 0 auto; }
.sf-btn-create { background: #2563eb; color: #fff; border: none; border-radius: 8px; padding: 10px 22px; font-size: 14px; font-weight: 700; cursor: pointer; flex: 1; transition: background .2s; }
.sf-btn-create:hover { background: #1d4ed8; }

/* ── Assigned zone ── */
.sf-client-card {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border-radius: 12px; padding: 20px 22px;
    display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
    margin-bottom: 20px;
}
.sf-client-avatar {
    width: 52px; height: 52px; border-radius: 50%;
    background: #334155; display: flex; align-items: center; justify-content: center;
    font-size: 22px; font-weight: 800; color: #e2b96f; flex-shrink: 0;
}
.sf-client-info { flex: 1; min-width: 0; }
.sf-client-name  { font-size: 18px; font-weight: 800; color: #f1f5f9; }
.sf-client-phone { font-size: 13px; color: #94a3b8; margin-top: 2px; }

.sf-points-block { text-align: right; }
.sf-points-big { font-size: 28px; font-weight: 900; color: #e2b96f; line-height: 1; }
.sf-points-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .06em; }
.sf-points-dt { font-size: 13px; color: #94a3b8; margin-top: 2px; }

/* ── Actions grid ── */
.sf-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; }
.sf-action-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 12px 16px; border-radius: 10px; font-size: 14px; font-weight: 700;
    cursor: pointer; border: none; text-decoration: none; transition: all .2s;
}
.sf-action-primary   { background: #f97316; color: #fff; }
.sf-action-primary:hover { background: #ea580c; color: #fff; }
.sf-action-secondary { background: #e0f2fe; color: #0369a1; }
.sf-action-secondary:hover { background: #bae6fd; color: #0369a1; }
.sf-action-danger    { background: #fee2e2; color: #dc2626; }
.sf-action-danger:hover { background: #fecaca; color: #991b1b; }

/* ── Transactions ── */
.sf-tx-title { font-size: 13px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 10px; }
.sf-tx-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sf-tx-table thead th { background: #f8fafc; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
.sf-tx-table tbody td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.sf-tx-table tbody tr:last-child td { border-bottom: none; }

.tx-badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
.tx-badge-success { background: #dcfce7; color: #166534; }
.tx-badge-danger  { background: #fee2e2; color: #991b1b; }
.tx-badge-warning { background: #fef3c7; color: #92400e; }
.tx-badge-gray    { background: #f1f5f9; color: #475569; }
.tx-pts-pos { color: #16a34a; font-weight: 700; }
.tx-pts-neg { color: #dc2626; font-weight: 700; }
</style>

<div class="sf-wrap">

    {{-- ── SCAN INPUT ── --}}
    <div class="sf-scan-zone">
        <div class="sf-scan-title">🎴 Scanner une carte fidélité</div>
        <div class="sf-scan-row" x-data>
            <input
                type="text"
                wire:model="scannedCode"
                wire:keydown.enter="scanCard"
                placeholder="Scanner une carte fidélité..."
                class="sf-scan-input"
                autocomplete="off"
                spellcheck="false"
                x-init="$nextTick(() => $el.focus())"
                x-ref="scanInput"
            >
            <button wire:click="scanCard" class="sf-scan-btn">Valider</button>
        </div>
    </div>

    {{-- ── NOT FOUND ── --}}
    @if($cardNotFound)
    <div class="sf-not-found">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        Carte introuvable. Vérifiez le code scanné ou cherchez dans le stock.
    </div>
    @endif

    {{-- ── CARD PANEL ── --}}
    @if($cardData)
    <div class="sf-card-panel">

        {{-- Card header --}}
        <div class="sf-card-header">
            <span class="sf-card-number">{{ $cardData['card_number'] }}</span>
            <span class="sf-status-badge sf-status-{{ $cardData['status'] }}">
                {{ $cardData['status_label'] }}
            </span>
            @if($cardData['batch_name'])
            <span class="sf-batch-tag">{{ $cardData['batch_name'] }}</span>
            @endif
            <button wire:click="clearScan" class="sf-btn-clear">✕ Fermer</button>
        </div>

        <div class="sf-card-body">

            {{-- ════════ NOT ASSIGNED ════════ --}}
            @if(!$cardData['is_assigned'])

            <div class="sf-unassigned-alert">
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                Cette carte n'est pas encore assignée à un client.
            </div>

            {{-- Search existing client --}}
            <div class="sf-assign-label">Assigner à un client existant</div>
            <input
                type="text"
                wire:model.live.debounce.300ms="clientSearch"
                placeholder="Rechercher par nom ou téléphone..."
                class="sf-search-input"
            >

            @if(!empty($clientResults))
            <div class="sf-results-list">
                @foreach($clientResults as $r)
                <div
                    wire:click="selectClient({{ $r['id'] }})"
                    class="sf-result-item {{ $selectedClientId == $r['id'] ? 'is-selected' : '' }}"
                >
                    {{ $r['label'] }}
                    @if($selectedClientId == $r['id'])
                    <span style="float:right;color:#16a34a;">✓</span>
                    @endif
                </div>
                @endforeach
            </div>
            @endif

            @if($selectedClientId)
            <button wire:click="assignCard" class="sf-btn-assign">
                ✓ Assigner cette carte
            </button>
            @endif

            <div class="sf-divider">ou créer un nouveau client</div>

            @if(!$showNewClientForm)
            <button wire:click="$set('showNewClientForm', true)" class="sf-btn-new">
                + Créer un nouveau client
            </button>
            @else
            <div class="sf-new-form">
                <input type="text" wire:model="newClientName"    class="sf-form-input" placeholder="Nom et Prénom *">
                <input type="text" wire:model="newClientPhone"   class="sf-form-input" placeholder="Téléphone">
                <input type="text" wire:model="newClientAdresse" class="sf-form-input" placeholder="Adresse">
                <div class="sf-form-row">
                    <button wire:click="createAndAssign" class="sf-btn-create">✓ Créer et assigner</button>
                    <button wire:click="$set('showNewClientForm', false)" class="sf-btn-cancel">Annuler</button>
                </div>
            </div>
            @endif

            {{-- ════════ ASSIGNED ════════ --}}
            @else

            {{-- Client info card --}}
            <div class="sf-client-card">
                <div class="sf-client-avatar">
                    {{ mb_strtoupper(mb_substr($cardData['client_name'] ?? '?', 0, 1)) }}
                </div>
                <div class="sf-client-info">
                    <div class="sf-client-name">{{ $cardData['client_name'] }}</div>
                    @if($cardData['client_phone'])
                    <div class="sf-client-phone">📞 {{ $cardData['client_phone'] }}</div>
                    @endif
                </div>
                <div class="sf-points-block">
                    <div class="sf-points-label">Solde fidélité</div>
                    <div class="sf-points-big">{{ $cardData['balance'] }}</div>
                    <div style="font-size:12px;color:#e2b96f;">pts</div>
                    <div class="sf-points-dt">{{ $cardData['balance_dt'] }} DT</div>
                </div>
            </div>

            {{-- Actions --}}
            <div class="sf-actions">
                <a href="{{ $this->getPosUrl() }}" class="sf-action-btn sf-action-primary">
                    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    Créer un ticket
                </a>
                <a href="{{ route('filament.admin.resources.loyalty-transactions.index') }}?tableFilters[client_id][value]={{ $cardData['client_id'] }}" class="sf-action-btn sf-action-secondary">
                    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    Historique points
                </a>
                <a href="{{ route('filament.admin.resources.loyalty-transactions.create') }}?client_id={{ $cardData['client_id'] }}" class="sf-action-btn sf-action-secondary">
                    Ajuster points
                </a>
                <a href="{{ route('filament.admin.resources.loyalty-cards.index') }}?tableFilters[status][value]=available" class="sf-action-btn sf-action-secondary">
                    Remplacer carte
                </a>
                @if($cardData['is_usable'])
                <button
                    wire:click="markLost"
                    wire:confirm="Confirmer : marquer la carte {{ $cardData['card_number'] }} comme perdue ?"
                    class="sf-action-btn sf-action-danger"
                >
                    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                    Marquer comme perdue
                </button>
                @endif
            </div>

            {{-- Recent transactions --}}
            @if(!empty($recentTransactions))
            <div>
                <div class="sf-tx-title">Dernières transactions</div>
                <table class="sf-tx-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Points</th>
                            <th>Nouveau solde</th>
                            <th>Ticket</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($recentTransactions as $t)
                        <tr>
                            <td style="color:#64748b;">{{ $t['date'] }}</td>
                            <td>
                                <span class="tx-badge tx-badge-{{ $t['color'] }}">{{ $t['type'] }}</span>
                            </td>
                            <td class="{{ $t['points'] >= 0 ? 'tx-pts-pos' : 'tx-pts-neg' }}">
                                {{ $t['points'] >= 0 ? '+' : '' }}{{ $t['points'] }} pts
                            </td>
                            <td>{{ $t['balance_after'] }} pts</td>
                            <td style="color:#94a3b8;">{{ $t['ticket'] ?? '—' }}</td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
            @else
            <div style="text-align:center;padding:20px;color:#9ca3af;font-size:13px;">
                Aucune transaction pour ce client.
            </div>
            @endif

            @endif {{-- end assigned/not-assigned --}}

        </div>{{-- .sf-card-body --}}
    </div>{{-- .sf-card-panel --}}
    @endif

</div>{{-- .sf-wrap --}}

</x-filament-panels::page>
