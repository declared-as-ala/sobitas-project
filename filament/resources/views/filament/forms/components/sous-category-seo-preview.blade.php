<x-dynamic-component
    :component="$getFieldWrapperView()"
    :field="$field"
>
    @php
        $title = (string) ($get('meta_title') ?? '');
        $desc = (string) ($get('meta_description') ?? '');
        $tLen = mb_strlen($title);
        $dLen = mb_strlen($desc);
        $tOk = $tLen > 0 && $tLen <= 60;
        $dOk = $dLen > 0 && $dLen <= 160;
    @endphp

    <div class="fi-not-prose rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-4 space-y-3">
        <div class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            Aperçu Google (approximatif)
        </div>
        <div class="rounded-md border border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-950/50 p-3 text-left">
            <p class="text-blue-700 dark:text-blue-400 text-lg leading-snug line-clamp-2">
                {{ $title !== '' ? $title : 'Titre (meta_title) — à remplir' }}
            </p>
            <p class="text-emerald-800 dark:text-emerald-500/90 text-xs mt-1 truncate">
                {{ config('app.frontend_url', 'https://protein.tn') }}/category/{{ $get('slug') ?: '…' }}
            </p>
            <p class="text-gray-600 dark:text-gray-400 text-sm mt-2 line-clamp-3">
                {{ $desc !== '' ? $desc : 'Meta description — à remplir (≈150–160 caractères).' }}
            </p>
        </div>
        <div class="grid grid-cols-2 gap-3 text-xs">
            <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">Titre :</span>
                <span class="@if($tOk) text-emerald-600 @elseif($tLen === 0) text-amber-600 @else text-red-600 @endif">
                    {{ $tLen }} / 60
                </span>
            </div>
            <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">Description :</span>
                <span class="@if($dOk) text-emerald-600 @elseif($dLen === 0) text-amber-600 @else text-red-600 @endif">
                    {{ $dLen }} / 160
                </span>
            </div>
        </div>
    </div>
</x-dynamic-component>
