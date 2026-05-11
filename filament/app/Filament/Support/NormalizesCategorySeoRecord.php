<?php

namespace App\Filament\Support;

use App\Support\ExtraJsonLdValidator;
use Filament\Notifications\Notification;
use Filament\Support\Exceptions\Halt;

/**
 * Shared mutateFormDataBeforeFill / BeforeSave for category & sous-category SEO fields.
 *
 * @property mixed $record // Filament EditRecord
 */
trait NormalizesCategorySeoRecord
{
    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function normalizeCategorySeoBeforeFill(array $data): array
    {
        $sk = $data['secondary_keywords'] ?? null;
        if (is_array($sk) && $sk !== [] && array_is_list($sk) && isset($sk[0]) && is_string($sk[0])) {
            $data['secondary_keywords'] = array_map(static fn (string $t): array => ['term' => $t], $sk);
        }

        $rel = $data['related_category_slugs'] ?? null;
        if (is_array($rel) && $rel !== [] && array_is_list($rel) && isset($rel[0]) && is_string($rel[0])) {
            $data['related_category_slugs'] = array_map(static fn (string $s): array => ['slug' => $s], $rel);
        }

        $tags = $data['seo_tags'] ?? null;
        if (is_array($tags) && $tags !== [] && array_is_list($tags) && isset($tags[0]) && is_string($tags[0])) {
            $data['seo_tags'] = array_map(static fn (string $t): array => ['tag' => $t], $tags);
        }

        $extra = $data['extra_json_ld'] ?? null;
        if (is_array($extra) && $extra !== []) {
            $data['_extra_json_ld_editor'] = json_encode($extra, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } else {
            $data['_extra_json_ld_editor'] = '';
        }

        return $data;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function normalizeCategorySeoBeforeSave(array $data): array
    {
        $rows = $data['secondary_keywords'] ?? [];
        if (is_array($rows)) {
            $terms = [];
            foreach ($rows as $row) {
                if (is_array($row) && isset($row['term'])) {
                    $t = trim((string) $row['term']);
                    if ($t !== '') {
                        $terms[] = $t;
                    }
                }
            }
            $data['secondary_keywords'] = $terms;
        }

        $relRows = $data['related_category_slugs'] ?? [];
        if (is_array($relRows)) {
            $slugs = [];
            foreach ($relRows as $row) {
                if (is_array($row) && isset($row['slug'])) {
                    $s = trim((string) $row['slug']);
                    if ($s !== '') {
                        $slugs[] = $s;
                    }
                }
            }
            $data['related_category_slugs'] = array_values(array_unique($slugs));
        }

        $tagRows = $data['seo_tags'] ?? [];
        if (is_array($tagRows)) {
            $tags = [];
            foreach ($tagRows as $row) {
                if (is_array($row) && isset($row['tag'])) {
                    $t = trim((string) $row['tag']);
                    if ($t !== '') {
                        $tags[] = $t;
                    }
                }
            }
            $data['seo_tags'] = array_values(array_unique($tags));
        }

        $editor = trim((string) ($data['_extra_json_ld_editor'] ?? ''));
        unset($data['_extra_json_ld_editor']);

        if ($editor === '') {
            $data['extra_json_ld'] = null;
        } else {
            $v = ExtraJsonLdValidator::validateJsonString($editor);
            if (! $v['ok']) {
                Notification::make()
                    ->title('JSON-LD supplémentaire invalide')
                    ->body(implode("\n", $v['errors']))
                    ->danger()
                    ->persistent()
                    ->send();
                throw new Halt;
            }
            $data['extra_json_ld'] = $v['objects'];
        }

        return $data;
    }
}
