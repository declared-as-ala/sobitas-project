<x-dynamic-component
    :component="$getFieldWrapperView()"
    :field="$field"
>
    @php
        $raw = (string) ($get('body') ?? '');
        // Admin preview only: strip scripts for safety; keep other HTML for layout preview.
        $html = $raw === '' ? '' : preg_replace('#<script\b[^>]*>.*?</script>#is', '', $raw);
    @endphp

    <div class="page-html-bs-scope fi-not-prose w-full rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden bg-white dark:bg-gray-950">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" crossorigin="anonymous">

        <style>
            .page-html-bs-scope { --bs-body-font-size: 0.95rem; }
            .page-html-bs-scope .preview-chrome { background: linear-gradient(135deg, #0d6efd 0%, #6610f2 100%); }
            .page-html-bs-scope .preview-body { max-height: 420px; overflow: auto; }
        </style>

        <div class="preview-chrome text-white px-3 py-2 d-flex align-items-center justify-content-between gap-2">
            <span class="small fw-semibold mb-0">Aperçu (rendu HTML + Bootstrap)</span>
            <span class="badge text-bg-light text-dark border">Live</span>
        </div>

        <div class="preview-body p-3 bg-light border-top">
            @if($html === '')
                <p class="text-muted small mb-0">Saisissez du HTML dans le champ « Code HTML » pour voir l’aperçu ici.</p>
            @else
                <div class="container-fluid px-0">
                    {!! $html !!}
                </div>
            @endif
        </div>
    </div>
</x-dynamic-component>
