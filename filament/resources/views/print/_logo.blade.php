@php
    /**
     * @see \App\Support\PrintLogo
     * Use this @php block in the same Blade file as the logo <img> — not via @include from a parent,
     * because variables assigned in an included view are not visible in the parent.
     */
    $logoUrl = \App\Support\PrintLogo::resolve($coordonnee ?? null);
@endphp
