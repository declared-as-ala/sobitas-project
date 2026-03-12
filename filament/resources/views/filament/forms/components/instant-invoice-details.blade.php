@php
    function formatMoney($amount) {
        return number_format((float)$amount, 3, '.', ' ');
    }

    $statePath = $getStatePath();
    $formState = $getRecord() ? $getRecord()->toArray() : [];
    
    // We fetch available products for the dropdown
    $products = \App\Models\Product::where('qte', '>', 0)
        ->select('id','code_product','designation_fr','prix','qte')
        ->orderBy('designation_fr')
        ->get();
        
    $productsJson = $products->map(fn($p) => [
        'id' => $p->id,
        'code_product' => $p->code_product,
        'designation_fr' => $p->designation_fr,
        'prix' => $p->getEffectivePriceHt(),
        'qte' => $p->qte
    ])->toJson();
    
    $coordinate = \App\Models\Coordinate::getCached();
    $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
    
    // We get the existing details lines from filament state or default to one empty row
    $details = $getState() ?? [];
    if(empty($details)) {
        $details = [['produit_id' => '', 'qte' => 1, 'prix_unitaire' => 0, 'tva_pct' => $defaultTva]];
    }
    
    $maxRows = 100;
@endphp

<!-- We load Select2 and SweetAlert for this view field since they are needed exclusively here -->
<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

<style>
.instant-inv-table-wrap { overflow-x: auto; margin-bottom: 24px; border-radius: 8px; border: 1px solid #e2e8f0; font-family: 'Inter', sans-serif; background: #fff;}
.instant-inv-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.instant-inv-table thead th { background: #f8fafc; color: #334155; font-weight: 700; text-transform: uppercase; padding: 12px 10px; text-align: left; font-size: 12px; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0; }
.instant-inv-table tbody tr:nth-child(even) { background: #fafaf9; }
.instant-inv-table tbody td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }

.instant-inv-table td .select2-container--default .select2-selection--single,
.instant-inv-table tbody td input {
    border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 13px; width: 100%; background: #fff; height: 34px;
}
.instant-inv-table td .select2-container--default .select2-selection--single .select2-selection__rendered { line-height: 24px; }
.instant-inv-table td .select2-container--default .select2-selection--single .select2-selection__arrow { height: 32px; }

.instant-inv-table tbody td input[readonly], .instant-inv-table tbody td input[disabled] { background: #f1f5f9; color: #64748b; font-weight: 600; border-color: transparent; }

.inv-btn-add { background: #ecfdf5; color: #059669; border: 1px dashed #34d399; border-radius: 6px; padding: 8px 20px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.inv-btn-add:hover { background: #d1fae5; border-color: #10b981; }

.inv-btn-del { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.inv-btn-del:hover { background: #fee2e2; color: #dc2626; border-color: #f87171; }

.inv-barcode-bar { margin-bottom: 20px; background: #fff7ed; padding: 16px; border-radius: 8px; border: 1px solid #fed7aa; }
.inv-barcode-input { width: 100%; border: 1px solid #fdba74; border-radius: 6px; padding: 10px 14px; font-size: 16px; background: #fff; }
</style>

<div x-data="instantInvoiceComponent()" x-init="init()" wire:ignore>
    
    {{-- BARCODE SCAN --}}
    <div class="inv-barcode-bar">
        <label style="display:block; font-size:13px; font-weight:700; color:#c2410c; margin-bottom:6px;">Scanner code à barre (Détails Instantanés)</label>
        <input type="text"
               class="inv-barcode-input"
               placeholder="Cliquez ici pour scanner..."
               id="inv_barcode_input"
               autocomplete="off"
               @change="scanBarcode()">
    </div>

    {{-- TABLE --}}
    <div class="instant-inv-table-wrap">
        <table class="instant-inv-table">
            <thead>
                <tr>
                    <th style="width:35%">Produit</th>
                    <th style="width:10%; text-align:center;">Qté</th>
                    <th style="width:15%">P.U HT (DT)</th>
                    <th style="width:10%">TVA %</th>
                    <th style="width:15%">P.T HT (DT)</th>
                    <th style="width:15%; text-align:center;">Action</th>
                </tr>
            </thead>
            <tbody>
                @for($i = 0; $i < $maxRows; $i++)
                @php
                    $isInit = $i < count($details);
                    $line = $isInit ? $details[$i] : null;
                @endphp
                <tr id="inv-row-{{ $i }}" style="{{ !$isInit ? 'display:none;' : '' }}">
                    <td>
                        <select id="inv-prod-{{ $i }}" style="width:100%" @change="selectProduct({{ $i }})">
                            <option value="">— Choisir un produit —</option>
                            @foreach($products as $p)
                                <option value="{{ $p->id }}" data-prix="{{ $p->getEffectivePriceHt() }}" {{ ($line && $line['produit_id'] == $p->id) ? 'selected' : '' }}>
                                    {{ $p->designation_fr }} ({{ $p->qte ?? 0 }}) - {{ $p->code_product }}
                                </option>
                            @endforeach
                        </select>
                    </td>
                    <td>
                        <input type="number" id="inv-qte-{{ $i }}" min="0.001" step="1" style="text-align:right"
                               value="{{ $line ? $line['qte'] : 1 }}" 
                               @input="calculate()" @change="calculate()">
                    </td>
                    <td>
                        <input type="number" id="inv-pu-{{ $i }}" min="0" step="0.001" style="text-align:right"
                               value="{{ $line ? $line['prix_unitaire'] : 0 }}" 
                               @input="calculate()" @change="calculate()">
                    </td>
                    <td>
                        <input type="number" id="inv-tva-{{ $i }}" min="0" step="1" style="text-align:right"
                               value="{{ $line ? ($line['tva_pct'] ?? $defaultTva) : $defaultTva }}" 
                               @input="calculate()" @change="calculate()">
                    </td>
                    <td>
                        <input type="text" id="inv-ptht-{{ $i }}" value="" readonly style="text-align:right">
                    </td>
                    <td style="text-align:center;">
                        <button type="button" class="inv-btn-del" @click.prevent="removeRow({{ $i }})">Retirer</button>
                    </td>
                </tr>
                @endfor
            </tbody>
        </table>
    </div>
    
    <button type="button" class="inv-btn-add" @click="addRow()">+ Ajouter un produit</button>

    {{-- We trigger the sync just before the Livewire form submits --}}
    <input type="hidden" x-ref="triggerSubmitSync" @click="syncToLivewireState()">

</div>

<script>
function instantInvoiceComponent() {
    return {
        maxRows: {{ $maxRows }},
        defaultTva: {{ $defaultTva }},
        produits: @json(json_decode($productsJson)),

        init() {
            // Apply Select2 to all initialized selects
            for(let i=0; i<this.maxRows; i++) {
                $('#inv-prod-'+i).select2();
                // We need to attach onchange listener back to alpine component because select2 breaks native alpine @change bindings sometimes without explicitly calling it
                $('#inv-prod-'+i).on('change', () => {
                    this.selectProduct(i);
                });
            }
            
            // Initial calculation to populate readonly values
            setTimeout(() => { this.calculate(); }, 500);

            // Global listener on Livewire submit to intercept and attach our manually calculated array
            Livewire.hook('commit', ({ component, commit, respond, succeed, fail }) => {
                this.syncToLivewireState();
            });
            
            // Standard form submit intercept
            document.querySelector('form')?.addEventListener('submit', (e) => {
                this.syncToLivewireState();
            });
        },

        scanBarcode() {
            var barcodeInput = document.getElementById('inv_barcode_input');
            var code = barcodeInput.value.trim();
            if(!code) return;

            var prd = this.produits.find(p => p.code_product == code || p.code_product == '0'+code);
            
            if(prd) {
                // Check if already exist to increment
                let foundIndex = -1;
                for(let i=0; i<this.maxRows; i++) {
                    let r = document.getElementById('inv-row-'+i);
                    if(r.style.display !== 'none') {
                        if($('#inv-prod-'+i).val() == prd.id) {
                            foundIndex = i;
                            break;
                        }
                    }
                }

                if(foundIndex !== -1) {
                    let qtyInput = document.getElementById('inv-qte-'+foundIndex);
                    qtyInput.value = parseFloat(qtyInput.value) + 1;
                    this.calculate();
                } else {
                    let emptyIdx = -1;
                    for(let i=0; i<this.maxRows; i++) {
                        let r = document.getElementById('inv-row-'+i);
                        if(r.style.display === 'none') {
                            emptyIdx = i;
                            break;
                        }
                    }

                    if(emptyIdx !== -1) {
                        let r = document.getElementById('inv-row-'+emptyIdx);
                        r.style.display = '';
                        $('#inv-prod-'+emptyIdx).val(prd.id).trigger('change.select2');
                        document.getElementById('inv-qte-'+emptyIdx).value = 1;
                        document.getElementById('inv-pu-'+emptyIdx).value = prd.prix;
                        document.getElementById('inv-tva-'+emptyIdx).value = this.defaultTva;
                        this.calculate();
                    } else {
                        Swal.fire('Limite atteinte', 'Trop de lignes.', 'warning');
                    }
                }
            } else {
                Swal.fire('Introuvable', 'Aucun produit', 'warning');
            }
            
            barcodeInput.value = '';
            barcodeInput.focus();
        },

        selectProduct(idx) {
            let select = document.getElementById('inv-prod-'+idx);
            if(!select.value) return;

            let opt = select.options[select.selectedIndex];
            if(opt) {
                let prix = opt.getAttribute('data-prix');
                document.getElementById('inv-pu-'+idx).value = prix;
                this.calculate();
            }
        },

        addRow() {
            for(let i=0; i < this.maxRows; i++) {
                let r = document.getElementById('inv-row-'+i);
                if(r.style.display === 'none') {
                    r.style.display = '';
                    $('#inv-prod-'+i).val('').trigger('change.select2');
                    document.getElementById('inv-qte-'+i).value = 1;
                    document.getElementById('inv-pu-'+i).value = 0;
                    document.getElementById('inv-tva-'+i).value = this.defaultTva;
                    break;
                }
            }
        },

        removeRow(idx) {
            let r = document.getElementById('inv-row-'+idx);
            r.style.display = 'none';
            $('#inv-prod-'+idx).val('').trigger('change.select2');
            document.getElementById('inv-qte-'+idx).value = 1;
            document.getElementById('inv-pu-'+idx).value = 0;
            this.calculate();
        },

        calculate() {
            // Read inputs across the form directly via DOM because it's the most robust way in a custom field
            
            let totalHt = 0;
            let totalTva = 0;

            for(let i=0; i<this.maxRows; i++) {
                let r = document.getElementById('inv-row-'+i);
                if(r.style.display !== 'none') {
                    let pid = $('#inv-prod-'+i).val();
                    if(pid) {
                        let qte = parseFloat(document.getElementById('inv-qte-'+i).value) || 0;
                        let pu = parseFloat(document.getElementById('inv-pu-'+i).value) || 0;
                        let tvaPct = parseFloat(document.getElementById('inv-tva-'+i).value) || 0;
                        
                        let ptht = qte * pu;
                        document.getElementById('inv-ptht-'+i).value = ptht.toFixed(3);
                        
                        totalHt += ptht;
                        totalTva += ptht * (tvaPct / 100);
                    } else {
                        document.getElementById('inv-ptht-'+i).value = '';
                    }
                }
            }

            // Sync with Filament SideBar fields dynamically
            // (Assumptions: Document fields have IDs based on Filament schema IDs)
            // Filament generates IDs exactly matching the component name in most forms unless specifically changed
            let getFilInput = (name) => document.querySelector(`[wire\\:model\\.live="data.${name}"]`) || document.querySelector(`[wire\\:model="data.${name}"]`);
            
            let prix_ht_in = getFilInput('prix_ht') || document.getElementById('data.prix_ht');
            if(prix_ht_in) prix_ht_in.value = totalHt.toFixed(3);
            
            let remise_in = getFilInput('remise') || document.getElementById('data.remise');
            let m_remise = remise_in ? (parseFloat(remise_in.value) || 0) : 0;
            
            let tva_in = getFilInput('tva') || document.getElementById('data.tva');
            if(tva_in) tva_in.value = totalTva.toFixed(3);
            
            let htApresRemise = totalHt - m_remise;
            let htApresRemise_in = getFilInput('prix_ht_apres_remise') || document.getElementById('data.prix_ht_apres_remise');
            if(htApresRemise_in) htApresRemise_in.value = htApresRemise.toFixed(3);
            
            let timbre_in = getFilInput('timbre') || document.getElementById('data.timbre');
            let m_timbre = timbre_in ? (parseFloat(timbre_in.value) || 0) : 1.000;
            
            let totalTtc = htApresRemise + totalTva;
            let net = htApresRemise + totalTva + m_timbre;
            
            let ttc_in = getFilInput('prix_ttc') || document.getElementById('data.prix_ttc');
            if(ttc_in) ttc_in.value = totalTtc.toFixed(3);
            
            let net_in = getFilInput('net_a_payer') || document.getElementById('data.net_a_payer');
            if(net_in) net_in.value = net.toFixed(3);
            
            // The display field updating if needed
            let displayNet = document.querySelector('.nap-text');
            if(displayNet) displayNet.innerHTML = net.toFixed(3) + ' TND';
        },

        syncToLivewireState() {
            let finalLines = [];
            for(let i=0; i<this.maxRows; i++) {
                let r = document.getElementById('inv-row-'+i);
                if(r && r.style.display !== 'none') {
                    let pid = $('#inv-prod-'+i).val();
                    if(pid) {
                        finalLines.push({
                            produit_id: pid,
                            qte: document.getElementById('inv-qte-'+i).value,
                            prix_unitaire: document.getElementById('inv-pu-'+i).value,
                            tva_pct: document.getElementById('inv-tva-'+i).value,
                        });
                    }
                }
            }
            // Send back to the custom ViewField's mapped state
            @this.set('{{ $statePath }}', finalLines);
        }
    }
}
</script>
