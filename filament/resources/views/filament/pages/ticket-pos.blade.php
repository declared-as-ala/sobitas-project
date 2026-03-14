<x-filament-panels::page>
@php
    $fmt = fn($n) => number_format((float)$n, 3, '.', ' ');
    $logoPath = public_path('logo.png');
    $logoUrl = is_file($logoPath)
        ? 'data:' . (mime_content_type($logoPath) ?: 'image/png') . ';base64,' . base64_encode(file_get_contents($logoPath))
        : asset('logo.png');
    
    $clients = \App\Models\Client::orderBy('name')->get(['id','name','adresse','phone_1']);
    $products = \App\Models\Product::query()
        ->select('id','designation_fr','prix','promo','promo_expiration_date','qte','code_product')
        ->orderBy('designation_fr')
        ->get();
    
    $productsJson = $products->map(fn($p) => [
        'id' => $p->id,
        'designation_fr' => $p->designation_fr,
        'prix' => $p->getEffectiveUnitPrice(),
        'qte' => $p->qte,
        'code_product' => $p->code_product
    ])->toJson();

    // Start lines loaded from Livewire (either existing ticket or 1 empty line)
    $startLines = (isset($lines) && is_array($lines) && count($lines) > 0) ? $lines : [['produit_id' => '', 'qte' => 1, 'prix_unitaire' => 0]];
    $maxRows = 100;
@endphp

<!-- Select2 requirements -->
<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
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
</style>

<div class="pos-wrap" id="pos-ticket-root" wire:ignore>

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
        </div>

        {{-- RIGHT: Client block --}}
        <div class="pos-client-block">
            <div class="pos-field">
                <label>Client (optionnel)</label>
                <select id="client_select" style="width:100%" onchange="selectClient()">
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
        <label>Scanner code à barre</label>
        <input type="text"
               class="pos-barcode-input"
               placeholder="Cliquez ici pour scanner..."
               id="barcode_input"
               autocomplete="off"
               onchange="scanBarcode()">
    </div>

    {{-- ── PRODUCTS TABLE ── --}}
    <div class="pos-table-wrap">
        <table class="pos-table">
            <thead>
                <tr>
                    <th style="width:40%">Produits</th>
                    <th class="th-center" style="width:10%">Qté</th>
                    <th class="th-num" style="width:20%">P.U</th>
                    <th class="th-num" style="width:20%">P.T</th>
                    <th class="th-center" style="width:10%">Action</th>
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
                            <option value="">— Choisir un produit —</option>
                            @foreach($products as $p)
                                <option value="{{ $p->id }}" data-prix="{{ $p->getEffectiveUnitPrice() }}" data-qte="{{ $p->qte }}" {{ ($line && $line['produit_id'] == $p->id) ? 'selected' : '' }}>
                                    {{ $p->designation_fr }} ( {{ $p->qte ?? 0 }} ) - {{ $p->code_product }}
                                </option>
                            @endforeach
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
                        <button type="button" class="pos-btn-del" onclick="removeRow({{ $i }}, event)">Retirer</button>
                    </td>
                </tr>
                @endfor
            </tbody>
        </table>
    </div>

    <button type="button" class="pos-btn-add" onclick="addRow()">+ Ajouter un produit</button>

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
                <div class="pos-tot-label">Pourcentage Remise %</div>
                <div class="pos-tot-value">
                    <input type="number" id="pourcen_remise" step="0.1" min="0" max="100" value="{{ $pourcentage_remise }}" onkeyup="calculate('pourcen_remise')" onchange="calculate('pourcen_remise')">
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

</div>

<script>
    // Constants
    const maxRows = {{ $maxRows }};
    const produits = @json(json_decode($productsJson)); // Array of products for barcode
    let visibleRows = {{ count($startLines) }};
    
    // Format number wrapper
    function fnFormat(n) {
        return parseFloat(n).toFixed(3);
    }

    document.addEventListener('DOMContentLoaded', function () {
        // Init select2 on all active and hidden rows for fast switching
        $('#client_select').select2();
        for(let i=0; i<maxRows; i++) {
            $('#select_produit'+i).select2();
        }

        // Focus barcode safely
        setTimeout(() => {
            const bc = document.getElementById('barcode_input');
            if(bc) bc.focus();
        }, 300);

        calculate(); // Initial calculation
        
        // Prevent form submit on enter
        window.addEventListener('keydown', function(e) {
            if(e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        });
    });

    // Client Selection
    function selectClient() {
        var select = document.getElementById('client_select');
        var option = select.options[select.selectedIndex];
        if(option.value) {
            document.getElementById('client_adresse').value = option.getAttribute('data-adresse') || '';
            document.getElementById('client_phone').value = option.getAttribute('data-phone') || '';
        } else {
            document.getElementById('client_adresse').value = '';
            document.getElementById('client_phone').value = '';
        }
    }

    // Product Selection
    function selectProduit(i) {
        var select = document.getElementById('select_produit' + i);
        if(!select.value) return;
        
        var option = select.options[select.selectedIndex];
        var v_prix = option.getAttribute('data-prix');
        
        var input_pu = document.getElementById('p_unitaire' + i);
        input_pu.value = v_prix;
        
        calculate();
    }

    // Adding Rows instantly
    function addRow() {
        for(let i=0; i<maxRows; i++) {
            var el = document.getElementById('row-' + i);
            if (el.style.display === "none") {
                el.style.display = "";
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

    // Scanning Barcode
    function scanBarcode() {
        var input = document.getElementById('barcode_input');
        var code = input.value.trim();
        if(!code) return;

        var search = produits.find((prod)=> prod.code_product == code || prod.code_product == '0'+code);

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
                    $('#select_produit'+emptyIndex).val(search.id).trigger('change');
                    document.getElementById('qte'+emptyIndex).value = 1;
                    document.getElementById('p_unitaire'+emptyIndex).value = search.prix;
                    calculate();
                } else {
                    Swal.fire('Limite atteinte', 'Vous avez atteint le maximum de produits.', 'warning');
                }
            }
        } else {
            Swal.fire('Aucun produit trouvé', 'Le code scanné ne correspond à aucun produit.', 'info');
        }

        input.value = '';
        input.focus();
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
        var m_totale_ttc = Math.max(0, m_totale_ht - totale_remise);
        
        document.getElementById('p_ht').value = m_totale_ht.toFixed(3);
        document.getElementById('apres_remise').value = m_totale_ttc.toFixed(3);
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

        let payload = {
            lines: finalLines,
            client_id: document.getElementById('client_select').value,
            remise: document.getElementById('m_remise').value || 0,
            pourcentage_remise: document.getElementById('pourcen_remise').value || 0
        };
        
        // Trigger the save method gracefully with payload
        @this.call('save', payload);
    }

    document.addEventListener('livewire:initialized', () => {
        Livewire.on('ticket-saved', (data) => {
            let eventData = Array.isArray(data) ? data[0] : data;
            
            if(eventData && eventData.printUrl) {
                window.open(eventData.printUrl, '_blank');
            }
            
            if(eventData && eventData.posUrl) {
                window.history.pushState(null, '', eventData.posUrl);
            }
            
            var btn = document.getElementById('btn-save');
            if(btn) {
                btn.innerHTML = "Enregistrer";
                btn.disabled = false;
            }
        });
    });

</script>

</x-filament-panels::page>
