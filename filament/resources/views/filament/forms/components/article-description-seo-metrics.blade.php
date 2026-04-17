<x-dynamic-component
    :component="$getFieldWrapperView()"
    :field="$field"
>
    @php
        $m = \App\Filament\Support\ArticleDescriptionHtml::seoMetricsFromFormState($get);
    @endphp

    <div
        class="rounded-xl border border-gray-200 bg-gray-50/80 p-4 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
        <p class="mb-2 font-medium text-gray-900 dark:text-white">Indicateurs SEO (aperçu)</p>
        <ul class="grid gap-2 sm:grid-cols-2">
            <li><span class="text-gray-500 dark:text-gray-400">Mots :</span> {{ number_format($m['words'], 0, ',', ' ') }}</li>
            <li><span class="text-gray-500 dark:text-gray-400">Temps de lecture (~200 mots/min) :</span> {{ $m['minutes'] }} min</li>
            <li><span class="text-gray-500 dark:text-gray-400">Titres H2 :</span> {{ $m['h2'] }}</li>
            <li><span class="text-gray-500 dark:text-gray-400">Titres H3 :</span> {{ $m['h3'] }}</li>
            <li class="sm:col-span-2"><span class="text-gray-500 dark:text-gray-400">Liens :</span> {{ $m['links'] }}</li>
        </ul>
        @if (filled($m['plain_sample']))
            <p class="mt-3 border-t border-gray-200 pt-3 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
                Extrait texte : {{ $m['plain_sample'] }}{{ strlen($m['plain_sample']) >= 120 ? '…' : '' }}
            </p>
        @endif
    </div>
</x-dynamic-component>
