@php
    $logoUrl = \App\Models\Coordinate::publicBrandLogoUrl();
@endphp

<x-filament-panels::page.simple>
{{--
    Affiliate-only login. Keeps Filament's exact auth wiring (wire:submit="authenticate" + the form
    render + the submit button) so nothing about sign-in changes; only the surrounding layout is a
    bespoke two-panel affiliate portal. Self-contained CSS — the affilie panel loads no auth.css.
--}}
<style>
    /* Neutralise Filament's default simple-page chrome; our .afl-card is the visible card. */
    .fi-simple-layout {
        min-height: 100vh !important;
        background:
            radial-gradient(1200px 600px at 12% -10%, rgba(213,59,4,0.10), transparent 60%),
            radial-gradient(900px 500px at 110% 110%, rgba(213,59,4,0.08), transparent 55%),
            #f6f7f9 !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
    }
    :is(.dark) .fi-simple-layout {
        background:
            radial-gradient(1200px 600px at 12% -10%, rgba(213,59,4,0.20), transparent 60%),
            #0f1420 !important;
    }
    .fi-simple-layout::before { display: none !important; }
    .fi-simple-header, .fi-simple-layout > div > header { display: none !important; }
    .fi-simple-main-ctn { width: 100% !important; padding: 1.5rem !important; }
    .fi-simple-main {
        max-width: 960px !important; width: 100% !important;
        background: transparent !important; box-shadow: none !important;
        border: 0 !important; padding: 0 !important; backdrop-filter: none !important;
    }

    .afl-card {
        display: grid; grid-template-columns: 1.05fr 1fr; overflow: hidden;
        border-radius: 22px;
        box-shadow: 0 30px 70px rgba(15,23,42,0.22), 0 2px 8px rgba(15,23,42,0.06);
        background: #fff;
    }
    :is(.dark) .afl-card { background: #161c28; box-shadow: 0 30px 70px rgba(0,0,0,0.5); }

    /* ── Brand hero (left) ─────────────────────────────────────────── */
    .afl-hero {
        position: relative; padding: 2.6rem 2.4rem; color: #fff;
        background: linear-gradient(150deg, #E4490B 0%, #C7320A 55%, #9E2708 100%);
        display: flex; flex-direction: column; justify-content: space-between; gap: 1.6rem;
        overflow: hidden; min-height: 520px;
    }
    .afl-hero::after {
        content: ""; position: absolute; right: -80px; top: -80px; width: 320px; height: 320px;
        background: radial-gradient(circle, rgba(255,255,255,0.14), transparent 70%);
    }
    .afl-wordmark { position: relative; font-size: 1.4rem; font-weight: 800; letter-spacing: -0.02em; }
    .afl-wordmark span { opacity: 0.82; font-weight: 600; }
    .afl-badge {
        display: inline-flex; align-items: center; align-self: flex-start; gap: 0.4rem;
        margin-top: 1rem; padding: 0.3rem 0.7rem; border-radius: 999px;
        background: rgba(255,255,255,0.16); font-size: 0.72rem; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.08em; backdrop-filter: none;
    }
    .afl-hero-head { position: relative; }
    .afl-hero-title { font-size: 1.85rem; line-height: 1.15; font-weight: 800; letter-spacing: -0.02em; margin: 1.1rem 0 0.5rem; }
    .afl-hero-sub { font-size: 0.95rem; line-height: 1.5; opacity: 0.9; max-width: 30ch; }
    .afl-props { position: relative; display: flex; flex-direction: column; gap: 0.85rem; }
    .afl-prop { display: flex; align-items: center; gap: 0.65rem; font-size: 0.92rem; font-weight: 500; }
    .afl-prop-ic {
        width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
        display: grid; place-items: center; background: rgba(255,255,255,0.18);
    }
    .afl-prop-ic svg { width: 17px; height: 17px; }

    /* ── Form column (right) ───────────────────────────────────────── */
    .afl-form { padding: 2.8rem 2.6rem; display: flex; flex-direction: column; justify-content: center; }
    .afl-form-logo { height: 34px; width: auto; max-width: 150px; object-fit: contain; margin-bottom: 1.4rem; }
    .afl-form-title { font-size: 1.5rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    :is(.dark) .afl-form-title { color: #f1f5f9; }
    .afl-form-sub { font-size: 0.9rem; color: #64748b; margin: 0.35rem 0 1.6rem; }
    :is(.dark) .afl-form-sub { color: #94a3b8; }
    .afl-form .fi-input-wrp, .afl-form .fi-input { border-radius: 10px; }
    .afl-form .fi-btn[type="submit"] {
        width: 100%; margin-top: 0.4rem; font-weight: 700; font-size: 0.98rem;
        padding-top: 0.72rem; padding-bottom: 0.72rem; border-radius: 11px;
    }
    .afl-foot { margin-top: 1.6rem; font-size: 0.86rem; color: #64748b; text-align: center; }
    :is(.dark) .afl-foot { color: #94a3b8; }
    .afl-foot a { color: #D53B04; font-weight: 700; text-decoration: none; }
    .afl-foot a:hover { text-decoration: underline; }

    /* ── Responsive: stack on tablet/phone ─────────────────────────── */
    @media (max-width: 820px) {
        .afl-card { grid-template-columns: 1fr; }
        .afl-hero { min-height: 0; padding: 2rem 1.8rem; gap: 1.1rem; }
        .afl-hero-title { font-size: 1.5rem; }
        .afl-props { display: none; }
        .afl-form { padding: 2rem 1.6rem; }
    }
    @media (max-width: 480px) {
        .fi-simple-main-ctn { padding: 0.9rem !important; }
        .afl-card { border-radius: 18px; }
    }
</style>

<div class="afl-card">
    <aside class="afl-hero">
        <div class="afl-hero-head">
            <div class="afl-wordmark">protein.tn <span>· Affiliés</span></div>
            <span class="afl-badge">Espace Affilié</span>
            <h2 class="afl-hero-title">Développez vos revenus avec Protein.tn</h2>
            <p class="afl-hero-sub">Gérez vos commandes, suivez vos commissions et vos paiements depuis un seul espace.</p>
        </div>
        <div class="afl-props">
            <div class="afl-prop"><span class="afl-prop-ic"><x-filament::icon icon="heroicon-m-chart-bar" /></span> Commissions suivies en temps réel</div>
            <div class="afl-prop"><span class="afl-prop-ic"><x-filament::icon icon="heroicon-m-banknotes" /></span> Paiements chaque vendredi</div>
            <div class="afl-prop"><span class="afl-prop-ic"><x-filament::icon icon="heroicon-m-shopping-bag" /></span> Créez des commandes pour vos clients</div>
        </div>
    </aside>

    <div class="afl-form">
        @if ($logoUrl)
            <img src="{{ $logoUrl }}" alt="{{ config('app.name', 'Protein.tn') }}" class="afl-form-logo">
        @endif
        <h1 class="afl-form-title">Connexion</h1>
        <p class="afl-form-sub">Connectez-vous à votre espace affilié.</p>

        <form wire:submit="authenticate" id="form" class="fi-form grid gap-y-5">
            {{ $this->form }}

            <x-filament::button type="submit" form="form" class="w-full">
                Se connecter
            </x-filament::button>
        </form>

        <div class="afl-foot">
            Pas encore partenaire ? <a href="https://protein.tn/partenaires">Devenez affilié</a>
        </div>
    </div>
</div>
</x-filament-panels::page.simple>
