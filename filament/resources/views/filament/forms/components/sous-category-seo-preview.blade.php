<x-dynamic-component
    :component="$getFieldWrapperView()"
    :field="$field"
>
    @php
        $title = (string) ($get('meta_title') ?? '');
        $desc = (string) ($get('meta_description') ?? '');
        $slug = (string) ($get('slug') ?? '');
        $tLen = mb_strlen($title);
        $dLen = mb_strlen($desc);
        $tOk = $tLen > 0 && $tLen <= 60;
        $dOk = $dLen > 0 && $dLen <= 160;
        $base = rtrim((string) config('app.frontend_url', config('app.url', 'https://protein.tn')), '/');
        $pathSlug = $slug !== '' ? $slug : '…';
        $displayUrl = $base.'/category/'.$pathSlug;
        $displayTitle = $title !== '' ? $title : 'Titre (meta_title) — à remplir';
        $displayDesc = $desc !== '' ? $desc : 'Meta description — à remplir (idéal 150–160 caractères).';
        $tBadgeClass = $tOk ? 'text-bg-success' : ($tLen === 0 ? 'text-bg-warning' : 'text-bg-danger');
        $dBadgeClass = $dOk ? 'text-bg-success' : ($dLen === 0 ? 'text-bg-warning' : 'text-bg-danger');
        $iframeDoc = view('filament.forms.components.sous-category-seo-preview-iframe', [
            'displayTitle' => $displayTitle,
            'displayUrl' => $displayUrl,
            'displayDesc' => $displayDesc,
            'tLen' => $tLen,
            'dLen' => $dLen,
            'tOk' => $tOk,
            'dOk' => $dOk,
            'tBadgeClass' => $tBadgeClass,
            'dBadgeClass' => $dBadgeClass,
        ])->render();
        $srcdoc = htmlspecialchars($iframeDoc, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    @endphp

    <div class="fi-not-prose w-full">
        <iframe
            title="Aperçu résultat Google (Bootstrap)"
            class="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-950"
            style="min-height: 380px; height: 400px; max-width: 100%;"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            srcdoc="{{ $srcdoc }}"
        ></iframe>
    </div>
</x-dynamic-component>
