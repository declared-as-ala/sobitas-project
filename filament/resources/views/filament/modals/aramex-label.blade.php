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

        {{--
            PRINTING A PDF FROM A WEB BUTTON: OPEN IT AS THE TOP DOCUMENT, DON'T print() THE IFRAME.
            The old button called `iframe.contentWindow.print()`. Chrome (and Firefox) render a PDF
            inside an <iframe> with the built-in PDF plugin, and that plugin does NOT expose a
            working print() to the parent frame — the call silently no-ops or prints a blank page. So
            the button looked dead: "je ne peux pas l'imprimer". A PDF DOES print reliably when it
            is the top-level document in its own tab, where the native viewer's Ctrl+P works. So the
            primary action opens the bordereau in a new tab; the preview iframe below stays for a
            quick look before printing. `window.open` from a click is not popup-blocked.
        --}}
        <div style="display:flex; align-items:center; gap:8px;">
            <button type="button"
                    onclick="window.open('{{ $url }}', '_blank', 'noopener');"
                    style="display:inline-flex; align-items:center; gap:8px; padding:9px 16px; border:none; border-radius:8px; background:#f59e0b; color:#fff; font-size:14px; font-weight:600; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,.08);">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                </svg>
                Ouvrir et imprimer
            </button>
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
        Cliquez « Ouvrir et imprimer » : le bordereau s'ouvre dans un nouvel onglet où vous pouvez l'imprimer (Ctrl+P), puis collez-le sur le colis.
    </div>
</div>
