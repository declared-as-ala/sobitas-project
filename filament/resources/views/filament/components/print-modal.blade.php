{{--
  Print preview modal: one centered column, paper-style preview, toolbar under it.
  Variables: $printUrl (required), $title (optional), $documentType ('ticket' | 'a4', default 'a4').
--}}
@php
    $sep = str_contains($printUrl, '?') ? '&' : '?';
    $urlEmbed = $printUrl . $sep . 'embed=1';
    $documentType = $documentType ?? 'a4';
    $isTicket = $documentType === 'ticket';
@endphp
<style>
/* Print preview: single centered column. Break out of any parent grid so we use full width. */
.fi-print-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    min-height: 0;
    flex: 1;
    grid-column: 1 / -1; /* span all columns if parent is grid */
}
.fi-print-preview__inner {
    width: 100%;
    max-width: {{ $isTicket ? '360px' : '900px' }};
    margin-left: auto;
    margin-right: auto;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
}
.fi-print-preview__preview-area {
    flex: 1;
    min-height: 0;
    overflow: auto;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 16px;
    background: #e5e7eb;
}
.fi-print-preview__paper {
    flex-shrink: 0;
    width: 100%;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
    border: 1px solid #e5e7eb;
    overflow: hidden;
}
.fi-print-preview__iframe {
    display: block;
    margin: 0 auto;
    width: 100%;
    border: 0;
    height: 75vh;
    min-height: 420px;
    background: #fff;
}
.fi-print-preview__toolbar {
    flex-shrink: 0;
    padding: 16px;
    border-top: 1px solid #e5e7eb;
    background: #fff;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 12px;
}
.fi-print-preview__toolbar-group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 12px;
}
.fi-print-preview__toolbar-left {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #6b7280;
}
.fi-print-preview__toolbar-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
}
.fi-print-preview .fi-print-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    min-height: 44px;
    font-size: 14px;
    font-weight: 600;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
}
.fi-print-preview .fi-print-btn--primary {
    background: var(--primary-600, #2563eb);
    color: #fff;
}
.fi-print-preview .fi-print-btn--primary:hover {
    background: var(--primary-500, #3b82f6);
}
.fi-print-preview .fi-print-btn--secondary {
    background: #fff;
    color: #374151;
    border: 1px solid #d1d5db;
}
.fi-print-preview .fi-print-btn--secondary:hover {
    background: #f9fafb;
}
.fi-print-preview .fi-print-btn--ghost {
    background: transparent;
    color: #6b7280;
}
.fi-print-preview .fi-print-btn--ghost:hover {
    background: #f3f4f6;
}
</style>
<div
    class="fi-print-preview"
    x-data="{
        src: '{{ $urlEmbed }}',
        get iframeEl() { return this.$refs.previewIframe; },
        doPrint() {
            const ifr = this.iframeEl;
            if (ifr && ifr.contentWindow && typeof ifr.contentWindow.print === 'function') {
                ifr.contentWindow.focus();
                ifr.contentWindow.print();
            } else {
                window.open('{{ $printUrl }}', '_blank');
            }
        },
        doClose() {
            this.$dispatch('close');
            try { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true })); } catch (_) {}
        }
    }"
>
    <div class="fi-print-preview__inner">
        <div class="fi-print-preview__preview-area">
            <div class="fi-print-preview__paper">
                <iframe
                    x-ref="previewIframe"
                    :src="src"
                    class="fi-print-preview__iframe"
                    title="{{ $title ?? 'Aperçu d\'impression' }}"
                ></iframe>
            </div>
        </div>

        <div class="fi-print-preview__toolbar">
            <div class="fi-print-preview__toolbar-group">
            <div class="fi-print-preview__toolbar-actions">
                <button type="button" @click="doPrint()" class="fi-print-btn fi-print-btn--primary">
                    <x-filament::icon icon="heroicon-o-printer" class="size-5" />
                    Imprimer
                </button>
                <button type="button" @click="doClose()" class="fi-print-btn fi-print-btn--ghost">
                    Fermer
                </button>
            </div>
            </div>
        </div>
    </div>
</div>
