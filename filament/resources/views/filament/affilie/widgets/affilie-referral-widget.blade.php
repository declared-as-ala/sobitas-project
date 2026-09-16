<x-filament-widgets::widget>
{{--
    Affiliate referral card. Shows the vanity subdomain link and/or promo code that already exist
    in the data model, each with one-tap copy (Alpine). Falls back to a calm activation notice when
    the account has neither yet. Brand accent #D53B04, dark-mode aware, matches quick-actions style.
--}}
@php($ref = $this->getReferral())

<style>
    [x-cloak] { display: none !important; }
    .afref { padding: 0; }
    .afref-head { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.9rem; }
    .afref-head-icon {
        width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        background: rgba(213,59,4,0.10); color: #D53B04;
    }
    .afref-head-icon svg { width: 20px; height: 20px; }
    .dark .afref-head-icon { background: rgba(213,59,4,0.18); color: #ff8a4c; }
    .afref-title { font-size: 0.95rem; font-weight: 700; color: #1e293b; letter-spacing: -0.01em; }
    .afref-subtitle { font-size: 0.78rem; color: #64748b; margin-top: 1px; }
    .dark .afref-title { color: #f1f5f9; }
    .dark .afref-subtitle { color: #94a3b8; }

    .afref-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 0.75rem; }
    @media (max-width: 720px) { .afref-grid { grid-template-columns: 1fr; } }

    .afref-item {
        border: 1px solid #e9ebef; border-radius: 12px; padding: 0.85rem 0.9rem;
        background: #fff; display: flex; flex-direction: column; gap: 0.4rem;
    }
    .dark .afref-item { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.08); }
    .afref-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; }
    .afref-row { display: flex; align-items: center; gap: 0.5rem; }
    .afref-value {
        flex: 1 1 auto; min-width: 0; font-size: 0.85rem; font-weight: 600; color: #0f172a;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        background: #f8fafc; border: 1px solid #eef2f7; border-radius: 8px; padding: 0.45rem 0.6rem;
    }
    .dark .afref-value { color: #e2e8f0; background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); }
    .afref-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 0.06em; color: #D53B04; }
    .afref-copy {
        flex-shrink: 0; display: inline-flex; align-items: center; gap: 0.3rem;
        font-size: 0.78rem; font-weight: 600; color: #fff; background: #D53B04;
        border: none; border-radius: 8px; padding: 0.45rem 0.7rem; cursor: pointer;
        transition: background .15s ease, transform .1s ease; min-height: 36px;
    }
    .afref-copy:hover { background: #b8330a; }
    .afref-copy:active { transform: scale(0.97); }
    .afref-copy.is-done { background: #059669; }
    .afref-hint { font-size: 0.72rem; color: #94a3b8; }

    .afref-empty {
        display: flex; align-items: flex-start; gap: 0.85rem;
        border: 1px dashed #e2e8f0; border-radius: 12px; padding: 1rem 1.1rem; background: #fafbfc;
    }
    .dark .afref-empty { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.10); }
    .afref-empty-icon { color: #D53B04; flex-shrink: 0; margin-top: 2px; }
    .afref-empty-icon svg { width: 26px; height: 26px; }
    .afref-empty-title { font-size: 0.85rem; font-weight: 700; color: #1e293b; }
    .afref-empty-sub { font-size: 0.78rem; color: #64748b; margin-top: 2px; line-height: 1.45; }
    .dark .afref-empty-title { color: #f1f5f9; }
    .dark .afref-empty-sub { color: #94a3b8; }

    .afref-ref { margin-top: 0.8rem; font-size: 0.74rem; color: #94a3b8; }
    .afref-ref strong { color: #64748b; font-weight: 700; letter-spacing: 0.03em; }
    .dark .afref-ref strong { color: #cbd5e1; }
</style>

<div class="afref" x-data="{ copied: '' }">
    <div class="afref-head">
        <div class="afref-head-icon"><x-filament::icon icon="heroicon-o-share" /></div>
        <div>
            <div class="afref-title">Vos outils de parrainage</div>
            <div class="afref-subtitle">Partagez votre lien ou votre code — chaque vente réalisée vous rapporte une commission.</div>
        </div>
    </div>

    @if ($ref['has_any'])
        <div class="afref-grid">
            @if ($ref['link'])
                <div class="afref-item">
                    <span class="afref-label">Votre lien de parrainage</span>
                    <div class="afref-row">
                        <span class="afref-value">{{ $ref['link'] }}</span>
                        <button type="button" class="afref-copy" x-bind:class="copied === 'link' && 'is-done'"
                            x-on:click="navigator.clipboard && navigator.clipboard.writeText(@js($ref['link'])); copied = 'link'; setTimeout(() => copied = '', 1600)">
                            <span x-show="copied !== 'link'">Copier</span>
                            <span x-show="copied === 'link'" x-cloak>Copié ✓</span>
                        </button>
                    </div>
                    <span class="afref-hint">Toute commande passée depuis ce lien vous est attribuée automatiquement.</span>
                </div>
            @endif

            @if ($ref['code'])
                <div class="afref-item">
                    <span class="afref-label">Votre code promo</span>
                    <div class="afref-row">
                        <span class="afref-value afref-code">{{ $ref['code'] }}</span>
                        <button type="button" class="afref-copy" x-bind:class="copied === 'code' && 'is-done'"
                            x-on:click="navigator.clipboard && navigator.clipboard.writeText(@js($ref['code'])); copied = 'code'; setTimeout(() => copied = '', 1600)">
                            <span x-show="copied !== 'code'">Copier</span>
                            <span x-show="copied === 'code'" x-cloak>Copié ✓</span>
                        </button>
                    </div>
                    <span class="afref-hint">À saisir au paiement : votre client bénéficie de la remise et la vente vous est attribuée.</span>
                </div>
            @endif
        </div>
    @else
        <div class="afref-empty">
            <span class="afref-empty-icon"><x-filament::icon icon="heroicon-o-link" /></span>
            <div>
                <div class="afref-empty-title">Votre lien de parrainage arrive bientôt</div>
                <div class="afref-empty-sub">Il sera activé dès la validation de votre compte affilié. En attendant, vous pouvez déjà créer des commandes pour vos clients depuis « Mes commandes » — chacune vous rapporte votre marge.</div>
            </div>
        </div>
    @endif

    @if ($ref['reference'])
        <div class="afref-ref">Référence affilié : <strong>{{ $ref['reference'] }}</strong></div>
    @endif
</div>

</x-filament-widgets::widget>
