<?php

namespace App\Support;

/**
 * Validates supplementary JSON-LD objects stored per category (enterprise SEO).
 * Does not replace auto-generated CollectionPage / FAQPage / ItemList — merged separately.
 */
final class ExtraJsonLdValidator
{
    private const MAX_JSON_CHARS = 12000;

    private const MAX_OBJECTS = 8;

    /**
     * @return array{ok: bool, errors: list<string>, objects: list<array<string, mixed>>}
     */
    public static function validateJsonString(?string $json): array
    {
        $json = $json === null ? '' : trim($json);
        if ($json === '') {
            return ['ok' => true, 'errors' => [], 'objects' => []];
        }

        if (mb_strlen($json) > self::MAX_JSON_CHARS) {
            return ['ok' => false, 'errors' => ['JSON trop long (max '.self::MAX_JSON_CHARS.' caractères).'], 'objects' => []];
        }

        if (stripos($json, '<script') !== false) {
            return ['ok' => false, 'errors' => ['Le JSON ne doit pas contenir de balises script.'], 'objects' => []];
        }

        try {
            $decoded = json_decode($json, true, 64, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            return ['ok' => false, 'errors' => ['JSON invalide : '.$e->getMessage()], 'objects' => []];
        }

        return self::validateDecoded($decoded);
    }

    /**
     * @param  mixed  $decoded
     * @return array{ok: bool, errors: list<string>, objects: list<array<string, mixed>>}
     */
    public static function validateDecoded(mixed $decoded): array
    {
        if (! is_array($decoded)) {
            return ['ok' => false, 'errors' => ['Le JSON-LD supplémentaire doit être un tableau JSON (liste d’objets).'], 'objects' => []];
        }

        if ($decoded !== [] && ! array_is_list($decoded)) {
            return ['ok' => false, 'errors' => ['Format attendu : tableau de schémas, ex. [ {\"@context\":\"...\",\"@type\":\"Thing\"}, ... ].'], 'objects' => []];
        }

        if (count($decoded) > self::MAX_OBJECTS) {
            return ['ok' => false, 'errors' => ['Trop d’objets JSON-LD (max '.self::MAX_OBJECTS.').'], 'objects' => []];
        }

        $objects = [];
        $errors = [];

        foreach ($decoded as $i => $item) {
            if (! is_array($item)) {
                $errors[] = 'Élément #'.($i + 1).' : doit être un objet.';

                continue;
            }

            $ctx = $item['@context'] ?? null;
            $type = $item['@type'] ?? null;

            if (! is_string($ctx) || trim($ctx) === '') {
                $errors[] = 'Élément #'.($i + 1).' : champ @context obligatoire (chaîne).';
            } elseif (! str_contains(strtolower((string) $ctx), 'schema.org')) {
                $errors[] = 'Élément #'.($i + 1).' : @context doit référencer schema.org.';
            }

            if (! is_string($type) || trim($type) === '') {
                $errors[] = 'Élément #'.($i + 1).' : champ @type obligatoire (chaîne).';
            }

            $objects[] = $item;
        }

        return [
            'ok' => $errors === [],
            'errors' => $errors,
            'objects' => $objects,
        ];
    }

    /**
     * @param  array<int, mixed>|null  $stored  Database JSON column (already array)
     * @return list<array<string, mixed>>
     */
    public static function sanitizedObjectsFromDatabase(?array $stored): array
    {
        if ($stored === null || $stored === []) {
            return [];
        }

        $result = self::validateDecoded($stored);

        return $result['ok'] ? $result['objects'] : [];
    }
}
