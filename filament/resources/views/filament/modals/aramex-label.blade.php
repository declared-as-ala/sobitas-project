{{-- Inline styles only: Filament's compiled CSS does not include arbitrary Tailwind utilities used in custom modal views. --}}
<div style="display:flex; flex-direction:column; gap:16px; font-family: ui-sans-serif, system-ui, sans-serif;">

    {{-- Header: HAWB + action buttons --}}
    <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; padding:14px 16px; border:1px solid #fcd34d; border-radius:12px; background:linear-gradient(90deg,#fffbeb,#fff7ed);">
        <div style="display:flex; align-items:center; gap:12px;">
            <div style="display:flex; align-items:center; justify-content:center; width:44px; height:44px; border-radius:10px; background:#f59e0b; color:#fff; flex:0 0 auto;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8l2-2z"/>
                </svg>
            </div>
            <div>
                <div style="font-size:11px; font-weight:600; letter-spacing:.05em; text-transform:uppercase; color:#b45309;">Numéro de suivi Aramex</div>
                <div style="font-family:ui-monospace,monospace; font-size:18px; font-weight:700; color:#111827;">{{ $hawb }}</div>
            </div>
        </div>

        <div style="display:flex; align-items:center; gap:8px;">
            <button type="button"
                    onclick="var f=document.getElementById('aramex-label-iframe'); f.contentWindow.focus(); f.contentWindow.print();"
                    style="display:inline-flex; align-items:center; gap:8px; padding:9px 16px; border:none; border-radius:8px; background:#f59e0b; color:#fff; font-size:14px; font-weight:600; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,.08);">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                </svg>
                Imprimer
            </button>
            <a href="{{ $url }}" target="_blank" rel="noopener"
               style="display:inline-flex; align-items:center; gap:8px; padding:9px 16px; border:1px solid #d1d5db; border-radius:8px; background:#fff; color:#374151; font-size:14px; font-weight:600; text-decoration:none; box-shadow:0 1px 2px rgba(0,0,0,.05);">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                Nouvel onglet
            </a>
        </div>
    </div>

    {{-- PDF preview --}}
    <div style="overflow:hidden; border:1px solid #e5e7eb; border-radius:12px; background:#f3f4f6;">
        <iframe id="aramex-label-iframe"
                src="{{ $url }}"
                style="width:100%; height:68vh; min-height:460px; border:0; background:#fff; display:block;"
                title="Bordereau Aramex {{ $hawb }}">
        </iframe>
    </div>

    <div style="text-align:center; font-size:12px; color:#9ca3af;">
        Bordereau généré par Aramex — imprimez-le et collez-le sur le colis.
    </div>
</div>
