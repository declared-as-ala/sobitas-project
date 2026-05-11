<x-dynamic-component
    :component="$getFieldWrapperView()"
    :field="$field"
>
    @php
        $title = (string) ($get('meta_title') ?? '');
        $desc = (string) ($get('meta_description') ?? '');
        $h1 = (string) ($get('h1_title') ?? '');
        $ogImg = (string) ($get('og_image') ?? '');
        $faqRaw = $get('faq') ?? [];
        $faqCount = is_array($faqRaw) ? count($faqRaw) : 0;

        $warnings = [];
        $tLen = mb_strlen($title);
        $dLen = mb_strlen($desc);

        if ($tLen === 0) {
            $warnings[] = 'Titre SEO vide — risque de titre automatique peu optimal.';
        } elseif ($tLen > 60) {
            $warnings[] = 'Titre SEO > 60 caractères — risque de troncature dans Google.';
        }

        if ($dLen === 0) {
            $warnings[] = 'Meta description vide.';
        } elseif ($dLen > 160) {
            $warnings[] = 'Meta description > 160 caractères — risque de troncature.';
        }

        if (mb_strlen(trim($h1)) === 0) {
            $warnings[] = 'H1 non renseigné — le nom de la catégorie sera utilisé par défaut.';
        }

        if (trim($ogImg) === '' && trim((string) ($get('seo_banner_desktop') ?? '')) === '') {
            $warnings[] = 'Pas d’og:image ni de bannière desktop — partages sociaux moins attractifs.';
        }

        if ($faqCount === 0) {
            $warnings[] = 'Aucune FAQ — pas de rich résultat FAQPage pour cette page.';
        }

        $extra = trim((string) ($get('_extra_json_ld_editor') ?? ''));
        if ($extra !== '') {
            try {
                $decoded = json_decode($extra, true, 64, JSON_THROW_ON_ERROR);
                $cnt = is_array($decoded) ? count($decoded) : 0;
                if ($cnt > 8) {
                    $warnings[] = 'JSON-LD supplémentaire : plus de 8 objets — risque de rejet.';
                }
            } catch (\Throwable) {
                $warnings[] = 'JSON-LD supplémentaire : JSON invalide (aperçu avant enregistrement).';
            }
        }
    @endphp

    @if ($warnings !== [])
        <div class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
            <p class="font-semibold mb-2">Contrôle SEO — points d’attention</p>
            <ul class="list-disc ps-5 space-y-1">
                @foreach ($warnings as $w)
                    <li>{{ $w }}</li>
                @endforeach
            </ul>
        </div>
    @endif
</x-dynamic-component>
