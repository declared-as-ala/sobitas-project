<x-dynamic-component
    :component="$getFieldWrapperView()"
    :field="$field"
>
    @php
        $m = \App\Filament\Support\ArticleDescriptionHtml::seoMetricsFromFormState($get);
        $tiles = [
            ['key' => 'words', 'label' => 'Mots', 'value' => number_format($m['words'], 0, ',', ' ')],
            ['key' => 'read', 'label' => 'Lecture (~200 mots/min)', 'value' => $m['minutes'].' min'],
            ['key' => 'h2', 'label' => 'Titres H2', 'value' => (string) $m['h2']],
            ['key' => 'h3', 'label' => 'Titres H3', 'value' => (string) $m['h3']],
            ['key' => 'links', 'label' => 'Liens', 'value' => (string) $m['links']],
        ];
    @endphp

    <div class="article-seo-metrics fi-not-prose">
        <div class="article-seo-metrics__header">
            <div class="article-seo-metrics__icon" aria-hidden="true">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                </svg>
            </div>
            <div>
                <p class="article-seo-metrics__title">Indicateurs SEO</p>
                <p class="article-seo-metrics__subtitle">Aperçu en direct du contenu (visuel ou HTML)</p>
            </div>
        </div>

        <div class="article-seo-metrics__grid">
            @foreach ($tiles as $tile)
                <div class="article-seo-metrics__tile" data-metric="{{ $tile['key'] }}">
                    <p class="article-seo-metrics__tile-label">{{ $tile['label'] }}</p>
                    <p class="article-seo-metrics__tile-value">{{ $tile['value'] }}</p>
                </div>
            @endforeach
        </div>

        @if (filled($m['plain_sample']))
            <div class="article-seo-metrics__excerpt">
                <span class="article-seo-metrics__excerpt-label">Extrait texte</span>
                <p class="article-seo-metrics__excerpt-body">
                    {{ $m['plain_sample'] }}{{ strlen($m['plain_sample']) >= 120 ? '…' : '' }}
                </p>
            </div>
        @endif
    </div>
</x-dynamic-component>
