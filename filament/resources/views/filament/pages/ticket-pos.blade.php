<x-filament-panels::page>
@php
    $fmt = fn($n) => number_format((float)$n, 3, '.', ' ');
    $logoPath = public_path('logo.png');
    $logoUrl = is_file($logoPath)
        ? 'data:' . (mime_content_type($logoPath) ?: 'image/png') . ';base64,' . base64_encode(file_get_contents($logoPath))
        : asset('logo.png');
    
    // Match legacy Voyager behavior: retrieve clients with default DB order.
    $clients = \App\Models\Client::all(['id','name','adresse','phone_1']);
    $products = \App\Models\Product::query()
        ->select('id','designation_fr','prix','promo','promo_expiration_date','qte','code_product')
        ->orderBy('designation_fr')
        ->get();
    $coordinate = \App\Models\Coordinate::getCached();
    
    $productsJson = '[]';

    // Ticket POS uses Livewire public $lines; if SPA/state leaves it empty while editing, hydrate from DB.
    $lines = isset($lines) && is_array($lines) ? $lines : [];
    $hasRealProductLines = collect($lines)->contains(fn ($l) => ! empty($l['produit_id'] ?? null));
    if (! empty($ticketId) && ! $hasRealProductLines) {
        $t = \App\Models\Ticket::with(['details.product'])->find($ticketId);
        if ($t && $t->details->isNotEmpty()) {
            $lines = $t->details->map(fn ($d) => [
                'produit_id' => $d->produit_id,
                'designation' => $d->product->designation_fr ?? '—',
                'qte' => (float) $d->qte,
                'prix_unitaire' => (float) ($d->prix_unitaire ?? 0),
            ])->toArray();
        }
    }

    // Start lines loaded from Livewire (either existing ticket or 1 empty line)
    $startLines = count($lines) > 0 ? $lines : [['produit_id' => '', 'qte' => 1, 'prix_unitaire' => 0]];
    $maxRows = 100;
    $startProductIds = collect($startLines)->pluck('produit_id')->filter()->values()->all();
    $startProductMeta = [];
    if (! empty($startProductIds)) {
        $startProductMeta = \App\Models\Product::whereIn('id', $startProductIds)
            ->get(['id', 'designation_fr', 'qte', 'code_product'])
            ->keyBy('id')
            ->toArray();
    }
@endphp

<!-- Select2 requirements -->
<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

<style>
/* ── POS modern reset ── */
.pos-wrap {
    margin-top: -2rem; /* Pull up to reduce gap */
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 14px;
    color: #1f2937;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    padding: 24px;
    max-width: 100%;
}

/* ── Top row ── */
.pos-top {
    display: flex;
    gap: 32px;
    margin-bottom: 24px;
    padding-bottom: 24px;
    border-bottom: 1px solid #e5e7eb;
}

.pos-company {
    flex: 0 0 320px;
}

.pos-company img.pos-logo {
    max-width: 280px; /* ENHANCED LOGO SIZE */
    max-height: 120px;
    object-fit: contain;
    display: block;
    margin-bottom: 12px;
}

.pos-company .pos-company-name {
    font-weight: 800;
    font-size: 18px;
    color: #f97316;
}

.pos-company .pos-company-info {
    font-size: 13px;
    color: #4b5563;
    line-height: 1.6;
}

.pos-client-block {
    flex: 1;
    background: #f8fafc;
    border-radius: 8px;
    padding: 16px;
    border: 1px solid #e2e8f0;
}

.pos-field {
    display: flex;
    flex-direction: column;
    margin-bottom: 12px;
}

.pos-field label {
    font-size: 12px;
    font-weight: 600;
    color: #4b5563;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.pos-field select,
.pos-field input[type="text"],
.pos-field input[type="number"],
.select2-container--default .select2-selection--single {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 14px;
    width: 100%;
    background: #fff;
    height: 38px;
    transition: all 0.2s;
}

.pos-field input:focus {
    outline: none;
    border-color: #f97316;
    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15);
}

.select2-container--default .select2-selection--single .select2-selection__rendered {
    line-height: 24px;
    color: #1f2937;
    padding-left: 0;
}
.select2-container--default .select2-selection--single .select2-selection__arrow {
    height: 36px;
}

.pos-field input[readonly],
.pos-field input[disabled] {
    background: #f1f5f9;
    color: #64748b;
    border-color: #e2e8f0;
}

/* Bootstrap 5–style primary button (scoped; avoids loading full Bootstrap over Filament) */
.pos-client-block .btn-add-client-bs {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-weight: 400;
    font-size: 0.875rem;
    line-height: 1.5;
    color: #fff;
    text-align: center;
    vertical-align: middle;
    cursor: pointer;
    user-select: none;
    border: 1px solid #0d6efd;
    padding: 0.25rem 0.65rem;
    border-radius: 0.25rem;
    background-color: #0d6efd;
    transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
    box-shadow: none;
    white-space: nowrap;
}
.pos-client-block .btn-add-client-bs:hover {
    background-color: #0b5ed7;
    border-color: #0a58ca;
    color: #fff;
}
.pos-client-block .btn-add-client-bs:focus-visible {
    outline: 0;
    box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.35);
}
.pos-client-block .btn-add-client-bs:active {
    background-color: #0a58ca;
    border-color: #0a53be;
}

/* ── Barcode bar ── */
.pos-barcode-bar {
    margin-bottom: 20px;
    background: #fff7ed;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #fed7aa;
}

.pos-barcode-bar label {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: #c2410c;
    margin-bottom: 6px;
}

.pos-barcode-input {
    width: 100%;
    border: 1px solid #fdba74;
    border-radius: 6px;
    padding: 10px 14px;
    font-size: 16px;
    background: #fff;
    transition: all 0.2s;
}

.pos-barcode-input:focus {
    outline: none;
    border-color: #ea580c;
    box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.2);
}

/* ── Product Table ── */
.pos-table-wrap { overflow-x: auto; margin-bottom: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }

.pos-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.pos-table thead th {
    background: #f8fafc;
    color: #334155;
    font-weight: 700;
    text-transform: uppercase;
    padding: 12px 10px;
    text-align: left;
    font-size: 12px;
    letter-spacing: 0.05em;
    border-bottom: 2px solid #e2e8f0;
}

.pos-table thead th.th-num { text-align: right; }
.pos-table thead th.th-center { text-align: center; }

.pos-table tbody tr:nth-child(even) { background: #fafaf9; }
.pos-table tbody tr:hover { background: #fff7ed; }

.pos-table tbody td {
    padding: 8px 10px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: middle;
}

.pos-table td .select2-container--default .select2-selection--single,
.pos-table tbody td input {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 13px;
    width: 100%;
    background: #fff;
    height: 34px;
}

.pos-table td .select2-container--default .select2-selection--single .select2-selection__rendered {
    line-height: 24px;
}
.pos-table td .select2-container--default .select2-selection--single .select2-selection__arrow {
    height: 32px;
}

.pos-table tbody td input[readonly],
.pos-table tbody td input[disabled] {
    background: #f1f5f9;
    color: #64748b;
    font-weight: 600;
    border-color: transparent;
}

.pos-table tbody td.td-num input { text-align: right; font-variant-numeric: tabular-nums; }

/* ── Add row button ── */
.pos-btn-add {
    background: #ecfdf5;
    color: #059669;
    border: 1px dashed #34d399;
    border-radius: 6px;
    padding: 8px 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 24px;
    transition: all 0.2s;
}
.pos-btn-add:hover { background: #d1fae5; border-color: #10b981; }

/* ── Delete btn ── */
.pos-btn-del {
    background: #fef2f2;
    color: #ef4444;
    border: 1px solid #fecaca;
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
}
.pos-btn-del:hover { background: #fee2e2; color: #dc2626; border-color: #f87171; }

/* ── Totals block ── */
.pos-totals-wrap {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 24px;
}

.pos-totals {
    width: 400px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.pos-tot-row {
    display: flex;
    align-items: center;
    border-bottom: 1px solid #f1f5f9;
}

.pos-tot-row:last-child { border-bottom: none; }

.pos-tot-label {
    flex: 1;
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 600;
    color: #4b5563;
    background: #f8fafc;
    border-right: 1px solid #f1f5f9;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.pos-tot-value {
    width: 180px;
    padding: 8px 12px;
}

.pos-tot-value input {
    width: 100%;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 14px;
    text-align: right;
    background: #fff;
    font-variant-numeric: tabular-nums;
    transition: all 0.2s;
}

.pos-tot-value input:focus {
    border-color: #f97316;
    outline: none;
    box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.1);
}

.pos-tot-value input[readonly] {
    background: transparent;
    border-color: transparent;
    color: #1f2937;
    font-weight: 600;
}

.pos-tot-row.row-net {
    background: #fff7ed;
    border-top: 2px solid #fdba74;
}

.pos-tot-row.row-net .pos-tot-label {
    font-weight: 800;
    color: #c2410c;
    background: transparent;
    border-right: none;
}

.pos-tot-row.row-net .pos-tot-value input {
    font-weight: 800;
    font-size: 18px;
    color: #ea580c;
    background: transparent;
    border-color: transparent;
}

/* ── Footer ── */
.pos-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
}

.pos-btn-save {
    background: #f97316;
    color: #fff;
    border: 0;
    border-radius: 8px;
    padding: 12px 32px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 6px -1px rgba(249, 115, 22, 0.3);
    transition: all 0.2s;
}

.pos-btn-save:hover { background: #ea580c; box-shadow: 0 6px 8px -1px rgba(234, 88, 12, 0.4); transform: translateY(-1px); }

/* ── Responsive ── */
@media (max-width: 768px) {
    .pos-top { flex-direction: column; gap: 16px; }
    .pos-company { flex: none; display: flex; flex-direction: column; align-items: center; text-align: center; }
    .pos-totals { width: 100%; }
    .pos-totals-wrap { justify-content: stretch; }
}

/* Loyalty panel: always reserve space; stays visible while scrolling ticket lines */
#loyalty-panel.pos-loyalty-sticky-wrap {
    position: sticky;
    top: 4.75rem;
    z-index: 25;
    margin-bottom: 16px;
}
#loyalty-panel .loyalty-placeholder {
    padding: 14px 16px;
    font-size: 13px;
    color: #78716c;
    font-weight: 600;
    text-align: center;
    border-top: 1px solid #fde047;
}

/* Limit Bootstrap reboot conflicts with Filament outside loyalty panel */
#loyalty-panel.ticket-pos-loyalty-bs { font-size: 14px; }
#loyalty-panel.ticket-pos-loyalty-bs .card { --bs-card-spacer-y: 0.75rem; --bs-card-spacer-x: 0.75rem; }
</style>

<div class="pos-wrap" id="pos-ticket-root">

    {{-- Select2 + static client row: keep out of Livewire morphDOM --}}
    <div wire:ignore>
    {{-- ── PRINT BUTTON (edit mode only) ── --}}
    @if($ticketId)
    <div style="display:flex; justify-content:flex-end; margin-bottom:16px;">
        <a href="{{ route('tickets.print', ['ticket' => $ticketId]) }}" target="_blank"
           style="display:inline-flex; align-items:center; gap:8px; background:#f97316; color:#fff; border:none; border-radius:8px; padding:10px 22px; font-size:14px; font-weight:700; cursor:pointer; text-decoration:none; box-shadow:0 4px 6px -1px rgba(249,115,22,.3); transition:all .2s;"
           onmouseover="this.style.background='#ea580c'" onmouseout="this.style.background='#f97316'">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z"/></svg>
            Imprimer
        </a>
    </div>
    @endif

    {{-- ── TOP ROW ── --}}
    <div class="pos-top">

        {{-- LEFT: Company info --}}
        <div class="pos-company">
            <img src="{{ $logoUrl }}" alt="Logo" class="pos-logo" onerror="this.style.display='none'">
            @if($coordinate)
                <div class="pos-company-name">{{ $coordinate->abbreviation ?? $coordinate->name_fr ?? '' }}</div>
                <div class="pos-company-info">
                    {{ $coordinate->phone_1 ?? '' }}@if(!empty($coordinate->phone_2)) / {{ $coordinate->phone_2 }}@endif
                    <br>
                    {{ $coordinate->adresse_fr ?? $coordinate->adresse ?? '' }}
                </div>
            @endif
        </div>

        {{-- RIGHT: Client block --}}
        <div class="pos-client-block">
            <div class="pos-field">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
                    <label style="margin:0;">Client (optionnel)</label>
                    <button type="button" id="pos-btn-add-client" class="btn-add-client-bs">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>
                        Ajouter client
                    </button>
                </div>
                <select id="client_select" style="width:100%">
                    <option value="">— Choisir —</option>
                    @foreach($clients as $c)
                        <option value="{{ $c->id }}" data-adresse="{{ $c->adresse }}" data-phone="{{ $c->phone_1 }}" {{ $client_id == $c->id ? 'selected' : '' }}>
                            {{ $c->name }} ({{ $c->phone_1 }})
                        </option>
                    @endforeach
                </select>
            </div>

            <div class="pos-field">
                <label>Adresse</label>
                <input type="text" id="client_adresse" readonly placeholder="—" value="{{ $client_adresse }}">
            </div>

            <div class="pos-field">
                <label>N° Tél</label>
                <input type="text" id="client_phone" readonly placeholder="—" value="{{ $client_phone }}">
            </div>
        </div>
    </div>

    {{-- ── BARCODE SCAN ── --}}
    <div class="pos-barcode-bar">
        <label>Scanner code à barre <span style="font-size:11px;font-weight:400;color:#6b7280;">(produit ou carte fidélité)</span></label>
        <input type="text"
               class="pos-barcode-input"
               placeholder="Cliquez ici pour scanner..."
               id="barcode_input"
               autocomplete="off"
               onchange="scanBarcode()">
    </div>
    </div>{{-- /wire:ignore client + barcode --}}

    {{-- ── LOYALTY PANEL (+ code partenaire Bootstrap) — sticky on scroll ── --}}
    <div id="loyalty-panel" class="pos-loyalty-sticky-wrap ticket-pos-loyalty-bs">
        <div style="background:#fef9c3;border:1.5px solid #fde047;border-radius:10px;overflow:hidden;">

            {{-- Header --}}
            <div style="background:#fef08a;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #fde047;flex-wrap:wrap;gap:8px;">
                <span style="font-weight:700;color:#713f12;font-size:14px;">🎴 Programme Fidélité</span>
                <span id="lp-card-number" style="font-family:'Courier New',monospace;font-size:13px;color:#92400e;background:#fff;padding:3px 10px;border-radius:5px;border:1px solid #fde047;letter-spacing:1px;">
                    {{ $loyalty_card_number ?? '—' }}
                </span>
            </div>

            {{-- Code partenaire (boutique) — sous l’en-tête fidélité, style Bootstrap --}}
            <div class="card border-0 rounded-0 border-top border-warning bg-white shadow-sm mb-0">
                <div class="card-body py-3 px-3">
                    <h6 class="text-uppercase text-muted small fw-bold mb-3" style="letter-spacing:0.04em;">Code partenaire (boutique)</h6>
                    @if($ticket && $ticket->partner_commission_processed_at)
                        <div class="alert alert-secondary py-2 mb-0" role="status">
                            <p class="small mb-1">
                                <strong>Verrouillé</strong> — code <span class="font-monospace fw-semibold">{{ $ticket->partner_code_snapshot ?? '—' }}</span>
                                @if((float)($ticket->partner_discount_amount ?? 0) > 0)
                                    <span class="text-nowrap">· remise {{ number_format((float)$ticket->partner_discount_amount, 3, '.', ' ') }} DT</span>
                                @endif
                            </p>
                            <p class="mb-0 small text-muted mt-1">La commission ne peut plus être modifiée depuis le POS.</p>
                        </div>
                    @else
                        <div class="row g-2 align-items-end">
                            <div class="col-12 col-md-auto flex-grow-1" style="min-width: 200px;">
                                <label for="partner_code_input_pos" class="form-label small fw-semibold text-secondary mb-1">Code</label>
                                <input type="text" id="partner_code_input_pos"
                                       wire:model.live.debounce.400ms="partner_code_input"
                                       class="form-control form-control-sm"
                                       placeholder="Ex: COACH10" autocomplete="off">
                            </div>
                            <div class="col-6 col-md-auto d-grid d-md-block">
                                <button type="button" wire:click="applyPartnerCode"
                                        class="btn btn-primary btn-sm w-100">
                                    Appliquer
                                </button>
                            </div>
                            <div class="col-6 col-md-auto d-grid d-md-block">
                                <button type="button" wire:click="clearPartnerCode" wire:loading.attr="disabled"
                                        class="btn btn-outline-secondary btn-sm w-100">
                                    Effacer
                                </button>
                            </div>
                        </div>
                        <p class="small text-secondary mt-3 mb-0">
                            Commission estimée (interne, non imprimée) :
                            <strong><span id="pos-partner-commission-est">0.000</span> DT</strong>
                            <span class="text-muted">(<span id="pos-partner-commission-rate">0</span>%)</span>
                        </p>
                    @endif
                </div>
            </div>

            <div wire:ignore>
            <div id="loyalty-panel-placeholder" class="loyalty-placeholder" style="{{ $loyalty_panel_visible ? 'display:none;' : '' }}">
                Sélectionnez un client titulaire d’une carte active pour afficher le solde et utiliser des points.
            </div>

            <div id="loyalty-panel-active" class="loyalty-panel-active" style="{{ $loyalty_panel_visible ? '' : 'display:none;' }}">

            {{-- Stats row --}}
            <div style="padding:14px 16px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div style="background:#fff;border:1px solid #fde047;border-radius:8px;padding:10px 14px;text-align:center;">
                    <div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Solde disponible</div>
                    <div style="font-size:24px;font-weight:900;color:#713f12;line-height:1.1;">
                        <span id="lp-balance">{{ $loyalty_balance }}</span>
                        <span style="font-size:13px;font-weight:600;"> pts</span>
                    </div>
                    <div style="font-size:12px;color:#b45309;margin-top:2px;">= <span id="lp-balance-dt">{{ $loyalty_balance_dt }}</span> DT</div>
                </div>
                <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;text-align:center;">
                    <div style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Points à gagner</div>
                    <div style="font-size:24px;font-weight:900;color:#15803d;line-height:1.1;">
                        +<span id="lp-earn">{{ $loyalty_points_earn }}</span>
                        <span style="font-size:13px;font-weight:600;"> pts</span>
                    </div>
                    <div style="font-size:12px;color:#16a34a;margin-top:2px;">= +<span id="lp-earn-dt">{{ $loyalty_points_earn_dt }}</span> DT</div>
                </div>
            </div>

            {{-- Redeem row --}}
            <div style="padding:0 16px 14px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
                <span style="font-size:12px;font-weight:600;color:#78716c;white-space:nowrap;">Utiliser des pts (min 100) :</span>
                <input type="number"
                       id="loyalty_redeem_input"
                       min="0"
                       step="10"
                       value="{{ $loyalty_redeem_input }}"
                       autocomplete="off"
                       style="width:90px;border:1px solid #d6d3d1;border-radius:6px;padding:5px 8px;font-size:14px;"
                       oninput="syncLoyaltyRedeem(this.value)"
                       onblur="finalizeLoyaltyRedeemInput()" {{ $loyalty_panel_visible ? '' : 'disabled' }} />
                <button type="button"
                        id="btn-loyalty-max"
                        onclick="setMaxLoyaltyRedeem()"
                        style="background:#f59e0b;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;"
                        {{ $loyalty_panel_visible ? '' : 'disabled' }}>
                    Max
                </button>
                <span style="font-size:13px;color:#dc2626;font-weight:600;">
                    − <span id="lp-redeem-dt">{{ $loyalty_redeem_dt }}</span> DT
                </span>
            </div>

            <input type="hidden" id="loyalty_card_id_input" value="{{ $loyalty_card_id }}">
            </div>{{-- /loyalty-panel-active --}}
            </div>{{-- /wire:ignore loyalty body --}}
        </div>
    </div>

    {{-- Product lines + totals: JS + Select2; skip Livewire morph --}}
    <div wire:ignore>

    {{-- ── PRODUCTS TABLE ── --}}
    <div class="pos-table-wrap">
        <table class="pos-table">
            <thead>
                <tr>
                    <th style="width:40%">Produits</th>
                    <th class="th-center" style="width:10%">Qte</th>
                    <th class="th-num" style="width:20%">P.U</th>
                    <th class="th-num" style="width:20%">P.T</th>
                    <th class="th-center" style="width:10%">#</th>
                </tr>
            </thead>
            <tbody>
                {{-- Generate rows exactly like the backend to ensure instant JS performance --}}
                @for($i = 0; $i < $maxRows; $i++)
                @php
                    $isInit = $i < count($startLines);
                    $line = $isInit ? $startLines[$i] : null;
                @endphp
                <tr id="row-{{ $i }}" style="{{ !$isInit ? 'display:none;' : '' }}">
                    <td>
                        <select id="select_produit{{ $i }}" class="form-control select2" style="width:100%" onchange="selectProduit({{ $i }})">
                            @if($line && $line['produit_id'])
                                @php
                                    $meta = $startProductMeta[$line['produit_id']] ?? null;
                                    $lineDesignation = $meta['designation_fr'] ?? ($line['designation'] ?? 'Produit');
                                    $lineQte = $meta['qte'] ?? null;
                                    $lineCode = $meta['code_product'] ?? '';
                                @endphp
                                <option value="{{ $line['produit_id'] }}" data-prix="{{ $line['prix_unitaire'] }}" data-qte="{{ $lineQte }}" selected>
                                    {{ $lineDesignation }}@if($lineQte !== null) ({{ $lineQte }}) @endif - {{ $lineCode }}
                                </option>
                            @else
                                <option value="">— Choisir un produit —</option>
                            @endif
                        </select>
                    </td>
                    <td class="td-num">
                        <input type="number"
                               id="qte{{ $i }}"
                               min="0.001"
                               step="1"
                               value="{{ $line ? $line['qte'] : 1 }}"
                               onkeyup="calculate()"
                               onchange="calculate()">
                    </td>
                    <td class="td-num">
                        <input type="number"
                               id="p_unitaire{{ $i }}"
                               min="0"
                               step="0.001"
                               value="{{ $line ? $line['prix_unitaire'] : 0 }}"
                               onkeyup="calculate()"
                               onchange="calculate()">
                    </td>
                    <td class="td-num">
                        <input type="text"
                               id="p_t_ht{{ $i }}"
                               value=""
                               readonly>
                    </td>
                    <td style="text-align:center">
                        <button type="button" class="pos-btn-del" onclick="removeRow({{ $i }}, event)">✕</button>
                    </td>
                </tr>
                @endfor
            </tbody>
        </table>
    </div>

    <button type="button" class="pos-btn-add" onclick="addRow()">Ajouter</button>

    {{-- ── TOTALS ── --}}
    <div class="pos-totals-wrap">
        <div class="pos-totals">
            <div class="pos-tot-row">
                <div class="pos-tot-label">Montant Total</div>
                <div class="pos-tot-value">
                    <input type="text" id="p_ht" value="{{ $fmt($prix_ht) }}" readonly>
                </div>
            </div>
            <div class="pos-tot-row">
                <div class="pos-tot-label">Montant Remise</div>
                <div class="pos-tot-value">
                    <input type="number" id="m_remise" step="0.001" min="0" value="{{ $remise }}" onkeyup="calculate('mt_remise')" onchange="calculate('mt_remise')">
                </div>
            </div>
            <div class="pos-tot-row">
                <div class="pos-tot-label">Poucentage Remise %</div>
                <div class="pos-tot-value">
                    <input type="number" id="pourcen_remise" step="0.1" min="0" max="100" value="{{ $pourcentage_remise }}" onkeyup="calculate('pourcen_remise')" onchange="calculate('pourcen_remise')">
                </div>
            </div>
            <div class="pos-tot-row" id="partner-discount-row" style="display:none;">
                <div class="pos-tot-label" style="color:#0369a1;">Remise partenaire</div>
                <div class="pos-tot-value" style="color:#0369a1;">
                    − <span id="partner-discount-display">0.000</span> DT
                </div>
            </div>
            {{-- Loyalty discount row — only shown when panel is visible --}}
            <div class="pos-tot-row" id="loyalty-discount-row" style="{{ $loyalty_panel_visible && $loyalty_redeem_input > 0 ? '' : 'display:none;' }}">
                <div class="pos-tot-label" style="color:#dc2626;">Remise fidélité</div>
                <div class="pos-tot-value" style="color:#dc2626;">
                    − <span id="lp-discount-total">{{ $loyalty_redeem_dt }}</span> DT
                </div>
            </div>
            <div class="pos-tot-row row-net">
                <div class="pos-tot-label">Net à payer</div>
                <div class="pos-tot-value">
                    <input type="text" id="apres_remise" value="{{ $fmt($prix_ttc) }}" readonly>
                </div>
            </div>
        </div>
    </div>

    {{-- ── FOOTER: Save button ── --}}
    <div class="pos-footer">
        <button type="button" class="pos-btn-save" id="btn-save" onclick="prepareAndSave()">
            Enregistrer
        </button>
    </div>

    </div>{{-- /wire:ignore products + totals --}}

</div>

<script>
    // Constants
    const maxRows = {{ $maxRows }};
    const pointsPerDtValue = {{ \App\Services\LoyaltyService::POINTS_PER_DT_VALUE }};
    const pointsPerDt = {{ \App\Services\LoyaltyService::POINTS_PER_DT }};
    const minRedeemPoints = {{ \App\Services\LoyaltyService::MIN_REDEEM_POINTS }};
    const produits = @json(json_decode($productsJson)); // Array of products for barcode
    let visibleRows = {{ count($startLines) }};
    window.partnerDiscountHt = window.partnerDiscountHt || 0;
    const loyaltyState = {
        panelVisible: {{ $loyalty_panel_visible ? 'true' : 'false' }},
        balance: {{ (int) $loyalty_balance }},
    };

    /** Livewire action return value shape differs by version — normalize to loyalty snapshot. */
    function unwrapLwPayload(raw) {
        if (raw == null) return null;
        if (typeof raw === 'object' && typeof raw.panel_visible !== 'undefined') return raw;
        if (Array.isArray(raw) && raw.length && typeof raw[0] === 'object' && typeof raw[0].panel_visible !== 'undefined') {
            return raw[0];
        }
        return raw;
    }

    // Format number wrapper
    function fnFormat(n) {
        return parseFloat(n).toFixed(3);
    }

    function ticketPosBootstrap() {
        if (!document.getElementById('pos-ticket-root')) return;
        if (typeof jQuery === 'undefined' || typeof jQuery.fn.select2 === 'undefined') {
            setTimeout(ticketPosBootstrap, 100);
            return;
        }

        // Destroy existing Select2 instances to avoid stale state after SPA navigation
        try {
            if ($('#client_select').hasClass('select2-hidden-accessible')) $('#client_select').select2('destroy');
            for (var i = 0; i < maxRows; i++) {
                if ($('#select_produit' + i).hasClass('select2-hidden-accessible')) $('#select_produit' + i).select2('destroy');
            }
        } catch (e) {}

        var $clientSel = $('#client_select');
        $clientSel.select2({
            width: '100%',
            placeholder: '— Choisir —',
            allowClear: true,
            dropdownParent: $('body'),
        });
        // Select2: native `change` can fire before internal value updates; bind explicit events + change.
        function syncClientFromSelect2() {
            requestAnimationFrame(function () {
                selectClient();
            });
        }
        $clientSel.off('.ticketPosClient');
        $clientSel.on('change.ticketPosClient', syncClientFromSelect2);
        $clientSel.on('select2:select.ticketPosClient select2:clear.ticketPosClient', syncClientFromSelect2);

        var addClientBtn = document.getElementById('pos-btn-add-client');
        if (addClientBtn) addClientBtn.onclick = createTicketClient;

        // Initialize visible rows
        for (var i = 0; i < maxRows; i++) {
            var el = document.getElementById('row-' + i);
            if (el && el.style.display !== "none") {
                initSelect2(i);
            }
        }

        // Focus barcode safely
        setTimeout(function () {
            var bc = document.getElementById('barcode_input');
            if (bc) bc.focus();
        }, 300);

        updateLoyaltyPanel({
            panel_visible: {{ $loyalty_panel_visible ? 'true' : 'false' }},
            card_number: @js($loyalty_card_number),
            card_id: @js($loyalty_card_id),
            balance: {{ (int) $loyalty_balance }},
            balance_dt: @js($loyalty_balance_dt),
            redeem_input: {{ (int) $loyalty_redeem_input }},
            redeem_dt: @js($loyalty_redeem_dt),
            earn: {{ (int) $loyalty_points_earn }},
            earn_dt: @js($loyalty_points_earn_dt),
        });

        calculate();
    }

    function ticketWaitAndBoot() {
        if (typeof $ !== 'undefined' && $.fn && $.fn.select2) {
            ticketPosBootstrap();
        } else {
            setTimeout(ticketWaitAndBoot, 80);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            ticketWaitAndBoot();
            window.addEventListener('keydown', function(e) {
                if(e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    if(e.target.id === 'barcode_input') {
                        scanBarcode();
                    }
                }
            });
        });
    } else {
        ticketWaitAndBoot();
    }

    window.ticketPosReinit = ticketWaitAndBoot;

    if (!window._ticketNavListenerActive) {
        window._ticketNavListenerActive = true;
        document.addEventListener('livewire:navigated', function () {
            if (document.getElementById('pos-ticket-root')) {
                ticketWaitAndBoot();
            }
        });
    }

    function initSelect2(i) {
        var $el = $('#select_produit' + i);
        if ($el.hasClass('select2-hidden-accessible')) {
            try { $el.select2('destroy'); } catch (e) {}
        }
        $el.select2({
            placeholder: "— Choisir un produit —",
            allowClear: true,
            ajax: {
                url: '{{ route("api.pos-products") }}',
                dataType: 'json',
                delay: 250,
                data: function (params) {
                    return { q: params.term || '' };
                },
                cache: true
            }
        });
    }

    // Client → Livewire sync (wire:ignore): use server round-trip so fidelity UI always matches DB.
    function selectClient() {
        var $sel = $('#client_select');
        if (!$sel.length) return;
        var val = $sel.val();
        var addrEl = document.getElementById('client_adresse');
        var phoneEl = document.getElementById('client_phone');

        function applyPayload(res) {
            var d = unwrapLwPayload(res);
            if (d) updateLoyaltyPanel(d);
            calculate();
        }

        if (val === null || val === undefined || val === '') {
            if (addrEl) addrEl.value = '';
            if (phoneEl) phoneEl.value = '';
            @this.call('syncClientFromPos', null).then(applyPayload).catch(function () { calculate(); });
            return;
        }
        var opt = $sel.find('option').filter(function () {
            return String($(this).val()) === String(val);
        }).first();
        if (addrEl) addrEl.value = opt.length ? (opt.attr('data-adresse') || '') : '';
        if (phoneEl) phoneEl.value = opt.length ? (opt.attr('data-phone') || '') : '';
        var cid = parseInt(String(val), 10);
        if (Number.isNaN(cid)) {
            if (addrEl) addrEl.value = '';
            if (phoneEl) phoneEl.value = '';
            @this.call('syncClientFromPos', null).then(applyPayload).catch(function () { calculate(); });
            return;
        }
        @this.call('syncClientFromPos', cid).then(applyPayload).catch(function () { calculate(); });
    }

    function createTicketClient() {
        Swal.fire({
            title: 'Ajouter Client(e)',
            html:
                '<input id="pos_sw_name" class="swal2-input" placeholder="Nom et Prénom">' +
                '<input id="pos_sw_adresse" class="swal2-input" placeholder="Adresse">' +
                '<input id="pos_sw_phone" class="swal2-input" placeholder="Téléphone">' +
                '<input id="pos_sw_email" class="swal2-input" placeholder="Email (optionnel)">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Créer le client',
            cancelButtonText: 'Annuler',
            preConfirm: function () {
                var name = (document.getElementById('pos_sw_name')?.value || '').trim();
                var adresse = (document.getElementById('pos_sw_adresse')?.value || '').trim();
                var phone = (document.getElementById('pos_sw_phone')?.value || '').trim();
                var email = (document.getElementById('pos_sw_email')?.value || '').trim();
                if (!name) {
                    Swal.showValidationMessage('Le nom du client est obligatoire');
                    return false;
                }
                return { name: name, adresse: adresse, phone_1: phone, email: email || null };
            }
        }).then(function (result) {
            if (!result.isConfirmed || !result.value) return;
            var csrfToken = document.querySelector('meta[name="csrf-token"]');
            fetch('/api/pos-clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken ? csrfToken.getAttribute('content') : ''
                },
                body: JSON.stringify(result.value)
            })
            .then(function (res) { return res.json(); })
            .then(function (client) {
                if (!client || !client.id) throw new Error('Création échouée');
                var label = client.text || (client.name ? client.name + (client.phone_1 ? ' (' + client.phone_1 + ')' : '') : ('Client #' + client.id));
                var $sel = $('#client_select');
                var opt = new Option(label, String(client.id), true, true);
                opt.setAttribute('data-adresse', client.adresse || '');
                opt.setAttribute('data-phone', client.phone_1 || '');
                $sel.append(opt);
                document.getElementById('client_adresse').value = client.adresse || '';
                document.getElementById('client_phone').value = client.phone_1 || '';
                $sel.val(String(client.id)).trigger('change');
                Swal.fire({ icon: 'success', title: 'Client créé', timer: 1200, showConfirmButton: false });
            })
            .catch(function (err) {
                console.error('createTicketClient error', err);
                Swal.fire('Erreur', 'Impossible de créer le client. Vérifiez les informations.', 'error');
            });
        });
    }

    // Product Selection
    function selectProduit(i) {
        var select = document.getElementById('select_produit' + i);
        if(!select.value) {
            document.getElementById('p_unitaire' + i).value = 0;
            calculate();
            return;
        }
        
        // If data is from AJAX, get the 'prix' property
        var $data = $(select).select2('data')[0];
        if($data && $data.prix !== undefined) {
            document.getElementById('p_unitaire' + i).value = $data.prix;
            if($data.qte !== undefined) {
                document.getElementById('qte' + i).max = parseFloat($data.qte) || 9999;
            }
        } else {
            // Fallback for pre-loaded lines
            var option = select.options[select.selectedIndex];
            var v_prix = option.getAttribute('data-prix');
            var v_qte = option.getAttribute('data-qte');
            if(v_prix !== null) {
                document.getElementById('p_unitaire' + i).value = v_prix;
            }
            if(v_qte !== null) {
                document.getElementById('qte' + i).max = parseFloat(v_qte) || 9999;
            }
        }
        
        calculate();
    }

    // Adding Rows instantly
    function addRow() {
        for(let i=0; i<maxRows; i++) {
            var el = document.getElementById('row-' + i);
            if (el.style.display === "none") {
                el.style.display = "";
                initSelect2(i);
                // reset values
                $('#select_produit'+i).val('').trigger('change.select2');
                document.getElementById('qte'+i).value = 1;
                document.getElementById('p_unitaire'+i).value = 0;
                document.getElementById('p_t_ht'+i).value = '';
                break;
            }
        }
    }

    // Removing Rows instantly
    function removeRow(i, e) {
        if(e) e.preventDefault();
        var el = document.getElementById('row-' + i);
        el.style.display = "none";
        $('#select_produit'+i).val('').trigger('change.select2');
        document.getElementById('qte'+i).value = 1;
        document.getElementById('p_unitaire'+i).value = 0;
        calculate();
    }

    // Loyalty card detection patterns (same as LoyaltyService::isLoyaltyBarcode)
    var _loyaltyCardRe  = /^[A-Z]{2,12}-\d{4,10}$/;
    var _loyaltyUuidRe  = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    function isLoyaltyCode(code) {
        return _loyaltyCardRe.test(code) || _loyaltyUuidRe.test(code);
    }

    // Scanning Barcode
    function scanBarcode() {
        var input = document.getElementById('barcode_input');
        var code = input.value.trim();
        if (!code) return;

        input.value    = '';
        input.disabled = true;

        // Loyalty card detected → hand off to Livewire
        if (isLoyaltyCode(code)) {
            @this.call('scanLoyaltyCard', code).then(function (res) {
                input.disabled = false;
                input.focus();
                var d = unwrapLwPayload(res);
                if (d) updateLoyaltyPanel(d);
                calculate();
            }).catch(function () {
                input.disabled = false;
                input.focus();
            });
            return;
        }

        // Product barcode → fast REST path
        fetch('{{ route("api.pos-barcode") }}?code=' + encodeURIComponent(code))
            .then(res => res.json())
            .then(search => {
                input.disabled = false;
                input.value = '';
                input.focus();

            if(search) {
                // Check if already in active rows to increment qty
                let foundIndex = -1;
                for(let i=0; i<maxRows; i++) {
                    var el = document.getElementById('row-' + i);
                    if (el.style.display !== "none") {
                        var pid = $('#select_produit'+i).val();
                        if(pid == search.id) {
                            foundIndex = i;
                            break;
                        }
                    }
                }

                if(foundIndex !== -1) {
                    var qteEl = document.getElementById('qte' + foundIndex);
                    qteEl.value = parseFloat(qteEl.value) + 1;
                    calculate();
                } else {
                    // Find empty hidden row
                    let emptyIndex = -1;
                    for(let i=0; i<maxRows; i++) {
                        var el = document.getElementById('row-' + i);
                        if (el.style.display === "none") {
                            emptyIndex = i;
                            break;
                        }
                    }
                    
                    if(emptyIndex !== -1) {
                        var el = document.getElementById('row-' + emptyIndex);
                        el.style.display = "";
                        initSelect2(emptyIndex);
                        
                        // Because this row didn't exist in option list, append it so select2 shows it
                        var optionLabel = search.designation + ' (' + (search.qte ?? 0) + ') - ' + (search.code_product ?? '');
                        var newOption = new Option(optionLabel, search.id, true, true);
                        $('#select_produit'+emptyIndex).append(newOption).trigger('change');
                        
                        document.getElementById('qte'+emptyIndex).value = 1;
                        document.getElementById('qte'+emptyIndex).max = parseFloat(search.qte || 0) || 9999;
                        document.getElementById('p_unitaire'+emptyIndex).value = search.prix_unitaire;
                        calculate();
                    } else {
                        Swal.fire('Limite atteinte', 'Vous avez atteint le maximum de produits.', 'warning');
                    }
                }
            } else {
                Swal.fire('Aucun produit trouvé', 'Le code scanné ne correspond à aucun produit.', 'info');
            }
        });
    }

    // Main calculation engine (Instant!)
    function calculate(type_remise) {
        var m_totale_ht = 0;
        
        for (let i = 0; i < maxRows; i++) {
            var el = document.getElementById('row-' + i);
            if (el.style.display !== "none") {
                var pid = $('#select_produit'+i).val();
                if(pid) {
                    var qte = parseFloat(document.getElementById('qte' + i).value) || 0;
                    var prix = parseFloat(document.getElementById('p_unitaire' + i).value) || 0;
                    
                    var p_t_ht_valeur = prix * qte;
                    document.getElementById('p_t_ht' + i).value = p_t_ht_valeur.toFixed(3);
                    
                    m_totale_ht += p_t_ht_valeur;
                } else {
                    document.getElementById('p_t_ht' + i).value = '';
                }
            }
        }
        
        var m_remise = document.getElementById('m_remise');
        var pourcentage_remise = document.getElementById('pourcen_remise');
        
        if (type_remise == 'mt_remise') {
            if (m_totale_ht != 0) {
                pourcentage_remise.value = ((m_remise.value / m_totale_ht) * 100).toFixed(3);
            } else {
                pourcentage_remise.value = 0;
            }
        } else if (type_remise == 'pourcen_remise') {
            m_remise.value = ((m_totale_ht * pourcentage_remise.value) / 100).toFixed(3);
        }
        
        var totale_remise = parseFloat(m_remise.value) || 0;
        totale_remise = Math.min(totale_remise, m_totale_ht);
        var base_after_regular_discount = Math.max(0, m_totale_ht - totale_remise);
        var pdRaw = typeof window.partnerDiscountHt !== 'undefined' ? window.partnerDiscountHt : 0;
        var partner_discount = Math.min(Math.max(0, parseFloat(pdRaw) || 0), base_after_regular_discount);
        var base_after_partner = Math.max(0, base_after_regular_discount - partner_discount);
        var redeemInput = document.getElementById('loyalty_redeem_input');
        var rawPoints = parseInt(redeemInput?.value || 0, 10);
        if (Number.isNaN(rawPoints)) rawPoints = 0;
        var maxFromTicket = Math.floor(base_after_partner * pointsPerDtValue);
        var maxFromBalance = loyaltyState.balance || 0;
        var redeemPoints = Math.max(0, Math.min(rawPoints, maxFromBalance, maxFromTicket));
        // Do not stomp the field while the user is typing (partial numbers / empty).
        var redeemFocused = redeemInput && document.activeElement === redeemInput;
        if (redeemInput && redeemPoints !== rawPoints && !redeemFocused) {
            redeemInput.value = redeemPoints;
        }

        var loyalty_discount = redeemPoints / pointsPerDtValue;
        loyalty_discount = Math.min(loyalty_discount, base_after_partner);
        var m_totale_ttc = Math.max(0, base_after_partner - loyalty_discount);

        document.getElementById('p_ht').value = m_totale_ht.toFixed(3);
        document.getElementById('apres_remise').value = m_totale_ttc.toFixed(3);

        var pRow = document.getElementById('partner-discount-row');
        var pDisc = document.getElementById('partner-discount-display');
        if (pRow && pDisc) {
            if (partner_discount > 0.0005) {
                pRow.style.display = '';
                pDisc.textContent = partner_discount.toFixed(3);
            } else {
                pRow.style.display = 'none';
                pDisc.textContent = '0.000';
            }
        }

        // Update loyalty earn preview
        var earnPts = Math.floor(Math.max(0, base_after_partner - loyalty_discount) * pointsPerDt);
        var earnEl  = document.getElementById('lp-earn');
        var earnDtEl = document.getElementById('lp-earn-dt');
        if (earnEl)   earnEl.textContent   = earnPts;
        if (earnDtEl) earnDtEl.textContent = (earnPts / pointsPerDtValue).toFixed(3);

        var discEl = document.getElementById('lp-redeem-dt');
        var discTotal = document.getElementById('lp-discount-total');
        if (discEl) discEl.textContent = loyalty_discount.toFixed(3);
        if (discTotal) discTotal.textContent = loyalty_discount.toFixed(3);

        // Show/hide loyalty discount row in totals
        var discRow = document.getElementById('loyalty-discount-row');
        if (discRow) discRow.style.display = loyaltyState.panelVisible && loyalty_discount > 0 ? '' : 'none';
    }

    // Loyalty redeem: while typing, only clamp to balance/ticket cap — never enforce MIN_REDEEM here.
    function syncLoyaltyRedeem(val) {
        var redeemInput = document.getElementById('loyalty_redeem_input');
        if (!redeemInput || redeemInput.disabled) return;

        var parsed = parseInt(String(val).replace(/\s/g, ''), 10);
        var pts = Number.isNaN(parsed) ? 0 : parsed;
        var total = parseFloat(document.getElementById('p_ht')?.value || 0) || 0;
        var regularDiscount = parseFloat(document.getElementById('m_remise')?.value || 0) || 0;
        regularDiscount = Math.min(regularDiscount, total);
        var baseAfterRegularDiscount = Math.max(0, total - regularDiscount);
        var pd = typeof window.partnerDiscountHt !== 'undefined' ? Math.min(Math.max(0, parseFloat(window.partnerDiscountHt) || 0), baseAfterRegularDiscount) : 0;
        var baseAfterPartner = Math.max(0, baseAfterRegularDiscount - pd);
        var maxFromTicket = Math.floor(baseAfterPartner * pointsPerDtValue);
        var maxFromBalance = loyaltyState.balance || 0;
        pts = Math.max(0, Math.min(pts, maxFromBalance, maxFromTicket));

        var redeemFocused = document.activeElement === redeemInput;
        if (String(redeemInput.value) !== String(pts) && !redeemFocused) {
            redeemInput.value = pts;
        }
        calculate();
    }

    function finalizeLoyaltyRedeemInput() {
        var redeemInput = document.getElementById('loyalty_redeem_input');
        if (!redeemInput || redeemInput.disabled) return;
        var pts = parseInt(String(redeemInput.value || '').replace(/\s/g, ''), 10);
        if (Number.isNaN(pts)) pts = 0;
        if (pts > 0 && pts < minRedeemPoints) {
            pts = 0;
            redeemInput.value = 0;
        }
        calculate();
    }

    function setMaxLoyaltyRedeem() {
        if (!loyaltyState.panelVisible) return;
        var redeemInput = document.getElementById('loyalty_redeem_input');
        if (!redeemInput || redeemInput.disabled) return;

        var total = parseFloat(document.getElementById('p_ht')?.value || 0) || 0;
        var regularDiscount = parseFloat(document.getElementById('m_remise')?.value || 0) || 0;
        regularDiscount = Math.min(regularDiscount, total);
        var baseAfterRegularDiscount = Math.max(0, total - regularDiscount);
        var pd = typeof window.partnerDiscountHt !== 'undefined' ? Math.min(Math.max(0, parseFloat(window.partnerDiscountHt) || 0), baseAfterRegularDiscount) : 0;
        var baseAfterPartner = Math.max(0, baseAfterRegularDiscount - pd);
        var maxFromTicket = Math.floor(baseAfterPartner * pointsPerDtValue);
        var maxPts = Math.max(0, Math.min(loyaltyState.balance || 0, maxFromTicket));
        if (maxPts > 0 && maxPts < minRedeemPoints) maxPts = 0;
        redeemInput.value = maxPts;
        calculate();
    }

    // Send the final state directly to Livewire
    function prepareAndSave() {
        var btn = document.getElementById('btn-save');
        btn.innerHTML = "Enregistrement...";
        btn.disabled = true;

        let finalLines = [];
        for(let i=0; i<maxRows; i++) {
            let row = document.getElementById('row-' + i);
            if(row && row.style.display !== 'none') {
                let pid = $('#select_produit'+i).val();
                if(pid) {
                    finalLines.push({
                        produit_id: pid,
                        qte: document.getElementById('qte'+i).value,
                        prix_unitaire: document.getElementById('p_unitaire'+i).value,
                        designation: $('#select_produit'+i+' option:selected').text().split('(')[0].trim() || ''
                    });
                }
            }
        }

        var selClient = $('#client_select').val();
        var parsedClient = selClient ? parseInt(String(selClient), 10) : null;
        if (parsedClient !== null && Number.isNaN(parsedClient)) parsedClient = null;

        var redeemRaw = parseInt(String(document.getElementById('loyalty_redeem_input')?.value || '').replace(/\s/g, ''), 10);
        if (Number.isNaN(redeemRaw)) redeemRaw = 0;
        if (redeemRaw > 0 && redeemRaw < minRedeemPoints) redeemRaw = 0;

        let payload = {
            lines: finalLines,
            client_id: parsedClient,
            remise: document.getElementById('m_remise').value || 0,
            pourcentage_remise: document.getElementById('pourcen_remise').value || 0,
            loyalty_card_id: document.getElementById('loyalty_card_id_input')?.value || null,
            loyalty_redeem_input: redeemRaw,
        };
        
        // Trigger the save method gracefully with payload
        @this.call('save', payload).catch(function () {
            var btn = document.getElementById('btn-save');
            if (btn) {
                btn.innerHTML = "Enregistrer";
                btn.disabled = false;
            }
        });
    }

    // ── Loyalty panel DOM update (server snapshot OR Livewire events) ───────────
    function updateLoyaltyPanel(d) {
        if (!d || typeof d !== 'object') return;
        var panel = document.getElementById('loyalty-panel');
        if (!panel) return;

        var vis = !!d.panel_visible;
        var placeholder = document.getElementById('loyalty-panel-placeholder');
        var active = document.getElementById('loyalty-panel-active');
        if (placeholder) placeholder.style.display = vis ? 'none' : '';
        if (active) active.style.display = vis ? '' : 'none';

        function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
        function setVal(id, val)  { var el = document.getElementById(id); if (el) el.value       = val; }
        setText('lp-card-number',    d.card_number  || '—');
        setText('lp-balance',        String(d.balance ?? '0'));
        setText('lp-balance-dt',     d.balance_dt   || '0.000');
        setText('lp-redeem-dt',      d.redeem_dt    || '0.000');
        setText('lp-discount-total', d.redeem_dt    || '0.000');
        setText('lp-earn',           String(d.earn ?? '0'));
        setText('lp-earn-dt',        d.earn_dt      || '0.000');
        setVal('loyalty_card_id_input',  d.card_id != null && d.card_id !== '' ? d.card_id : '');
        setVal('loyalty_redeem_input',   d.redeem_input ?? 0);

        var redeemInput = document.getElementById('loyalty_redeem_input');
        var maxBtn = document.getElementById('btn-loyalty-max');
        if (redeemInput) {
            redeemInput.disabled = !vis;
            redeemInput.setAttribute('data-balance', d.balance || 0);
        }
        if (maxBtn) maxBtn.disabled = !vis;

        loyaltyState.panelVisible = vis;
        loyaltyState.balance = parseInt(d.balance || 0, 10) || 0;
        calculate();
    }

    function registerTicketPosLivewireListeners() {
        if (window.__ticketPosLwHooks || typeof Livewire === 'undefined') return;
        window.__ticketPosLwHooks = true;

        Livewire.on('loyalty-state-updated', function (data) {
            var raw = Array.isArray(data) ? data[0] : data;
            var d = unwrapLwPayload(raw);
            if (d && typeof d.panel_visible !== 'undefined') updateLoyaltyPanel(d);
        });

        Livewire.on('loyalty-client-synced', function (data) {
            var d = Array.isArray(data) ? data[0] : data;
            if (!d) return;
            var addr = document.getElementById('client_adresse');
            var phone = document.getElementById('client_phone');
            if (addr) addr.value = d.client_adresse || '';
            if (phone) phone.value = d.client_phone || '';
            if (d.client_id) {
                var $sel = $('#client_select');
                var cid = String(d.client_id);
                var hasOpt = $sel.find('option').filter(function () {
                    return String($(this).val()) === cid;
                }).length;
                if (!hasOpt) {
                    var label = (d.client_name || 'Client') + (d.client_phone ? ' (' + d.client_phone + ')' : '');
                    var opt = new Option(label, cid, true, true);
                    opt.setAttribute('data-adresse', d.client_adresse || '');
                    opt.setAttribute('data-phone', d.client_phone || '');
                    $sel.append(opt);
                }
                $sel.val(cid).trigger('change');
            }
            if (typeof d.panel_visible !== 'undefined') updateLoyaltyPanel(d);
            calculate();
        });

        Livewire.on('loyalty-totals-recalc', function () {
            calculate();
        });

        Livewire.on('pos-partner-updated', function (payload) {
            var raw = Array.isArray(payload) ? payload[0] : payload;
            if (!raw || typeof raw !== 'object') return;
            window.partnerDiscountHt = parseFloat(raw.partner_discount) || 0;
            var ce = document.getElementById('pos-partner-commission-est');
            var cr = document.getElementById('pos-partner-commission-rate');
            if (ce) ce.textContent = (parseFloat(raw.commission_estimate) || 0).toFixed(3);
            if (cr) cr.textContent = String(parseFloat(raw.commission_rate) || 0);
            calculate();
        });

        Livewire.on('ticket-saved', function (data) {
            var eventData = Array.isArray(data) ? data[0] : data;
            if (eventData && eventData.printUrl) {
                window.location.href = eventData.printUrl;
                return;
            }
            var btn = document.getElementById('btn-save');
            if (btn) {
                btn.innerHTML = 'Enregistrer';
                btn.disabled = false;
            }
        });

        Livewire.on('ticket-save-failed', function () {
            var btn = document.getElementById('btn-save');
            if (btn) {
                btn.innerHTML = 'Enregistrer';
                btn.disabled = false;
            }
        });
    }

    document.addEventListener('livewire:init', registerTicketPosLivewireListeners);
    document.addEventListener('livewire:initialized', registerTicketPosLivewireListeners);
    registerTicketPosLivewireListeners();

</script>

</x-filament-panels::page>
