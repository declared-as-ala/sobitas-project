<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    @includeIf('print.partials.print-styles')
    <title>{{ $documentTitle ?? 'Document' }}</title>
</head>
<body class="print-doc-body">
    @if (empty($forPdf))
        <div class="print-toolbar no-print">
            <div class="print-toolbar-label">
                {{ $documentTitle ?? 'Document' }}
            </div>
            <div class="print-toolbar-actions">
                <button type="button" class="print-btn print-btn-primary" onclick="window.print()">
                    <span>Imprimer</span>
                </button>
                <a href="{{ $backUrl ?? url()->previous() }}" class="print-btn print-btn-ghost">
                    <span>Retour</span>
                </a>
            </div>
        </div>
    @endif

    <div class="print-sheet">
        @hasSection('content')
            @yield('content')
        @else
            {{ $slot ?? '' }}
        @endif
    </div>
</body>
</html>

