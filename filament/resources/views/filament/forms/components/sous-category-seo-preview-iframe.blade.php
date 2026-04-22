<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Aperçu SEO</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous">
    <style>
        body { font-size: 0.875rem; }
        .serp-title { color: #1a0dab; font-size: 1.125rem; line-height: 1.3; word-break: break-word; }
        .serp-url { color: #006621; font-size: 0.8125rem; }
        .serp-snippet { color: #4d5156; font-size: 0.8125rem; line-height: 1.45; }
        @media (prefers-color-scheme: dark) {
            body { background-color: #212529 !important; }
            .card { background-color: #2b3035; border-color: #495057; }
            .card-header { background-color: #343a40 !important; border-color: #495057; color: #e9ecef; }
            .serp-title { color: #8ab4f8; }
            .serp-url { color: #81c995; }
            .serp-snippet { color: #bdc1c6; }
            .text-muted { color: #adb5bd !important; }
            .border-secondary { border-color: #495057 !important; }
        }
    </style>
</head>
<body class="bg-light p-2 p-md-3">
    <div class="container-fluid px-0">
        <div class="card shadow-sm border-secondary">
            <div class="card-header py-2 d-flex align-items-center gap-2 border-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="text-primary flex-shrink-0" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
                <span class="fw-semibold small mb-0">Aperçu Google (approximatif)</span>
            </div>
            <div class="card-body py-3">
                <div class="rounded-3 border bg-white p-3 mb-3 shadow-sm" style="border-color: #e8eaed !important;">
                    <p class="serp-title mb-1 fw-normal">
                        {{ $displayTitle }}
                    </p>
                    <p class="serp-url mb-2 text-truncate" title="{{ $displayUrl }}">
                        {{ $displayUrl }}
                    </p>
                    <p class="serp-snippet mb-0">
                        {{ $displayDesc }}
                    </p>
                </div>
                <div class="row g-2 small">
                    <div class="col-sm-6">
                        <div class="d-flex align-items-center justify-content-between rounded border px-3 py-2 bg-body-secondary">
                            <span class="text-muted">Titre</span>
                            <span class="badge rounded-pill {{ $tBadgeClass }}">{{ $tLen }} / 60</span>
                        </div>
                    </div>
                    <div class="col-sm-6">
                        <div class="d-flex align-items-center justify-content-between rounded border px-3 py-2 bg-body-secondary">
                            <span class="text-muted">Description</span>
                            <span class="badge rounded-pill {{ $dBadgeClass }}">{{ $dLen }} / 160</span>
                        </div>
                    </div>
                </div>
                @if(!$tOk || !$dOk)
                    <div class="alert alert-warning border-0 py-2 px-3 small mb-0 mt-3" role="status">
                        <strong>Conseil :</strong>
                        @if($tLen === 0 || $dLen === 0)
                            Complétez le titre et la description pour un meilleur CTR.
                        @elseif($tLen > 60 || $dLen > 160)
                            Raccourcissez le titre (≤ 60) ou la description (≤ 160 car.) pour limiter la troncature dans Google.
                        @else
                            Vérifiez la longueur des champs pour le SERP.
                        @endif
                    </div>
                @endif
            </div>
        </div>
    </div>
</body>
</html>
