<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class SiteNavigationUrl implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $url = trim((string) $value);

        if ($url === '') {
            return;
        }

        $allowed = str_starts_with($url, '/')
            || str_starts_with($url, '#')
            || preg_match('/^(https?:|mailto:|tel:)/i', $url) === 1;

        if (! $allowed) {
            $fail('Utilisez une URL relative (/page), absolue (https://...), mailto:, tel: ou une ancre #.');
        }
    }
}
