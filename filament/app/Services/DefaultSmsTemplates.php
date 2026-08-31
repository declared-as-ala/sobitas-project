<?php

namespace App\Services;

class DefaultSmsTemplates
{
    public const KEY_OFFERS = 'offers_sms';
    public const KEY_PROMO = 'promo_sms';
    public const KEY_NEW_PRODUCTS = 'new_products_sms';

    /**
     * @return array<string, string> key => label for Select options
     */
    public static function options(): array
    {
        $templates = self::all();
        $out = [];
        foreach ($templates as $key => $t) {
            $out[$key] = $t['name'];
        }
        return $out;
    }

    /**
     * @return array<string, array{name: string, body: string, variables_schema: array}>
     */
    public static function all(): array
    {
        return [
            self::KEY_OFFERS => [
                'name' => 'Offres et nouveautés – Protein.tn',
                'body' => 'Protein.tn: découvrez nos offres et nouveaux produits sur protein.tn. {{stop_text}}',
                'variables_schema' => [
                    ['name' => 'stop_text', 'label' => 'Texte désinscription', 'default' => 'STOP'],
                ],
            ],
            self::KEY_PROMO => [
                'name' => 'Code promo – % remise',
                'body' => 'Protein.tn: profitez de -{{discount_percent}}% avec le code {{promo_code}} jusqu\'au {{end_date}} sur protein.tn. {{stop_text}}',
                'variables_schema' => [
                    ['name' => 'promo_code', 'label' => 'Code promo', 'default' => ''],
                    ['name' => 'discount_percent', 'label' => '% remise', 'default' => '10'],
                    ['name' => 'end_date', 'label' => 'Date fin', 'default' => ''],
                    ['name' => 'stop_text', 'label' => 'Texte désinscription', 'default' => 'STOP'],
                ],
            ],
            self::KEY_NEW_PRODUCTS => [
                'name' => 'Nouveaux produits / Nouvel arrivage',
                'body' => 'Protein.tn: {{product_name}} est maintenant disponible: {{product_url}}. Découvrez aussi nos nouveautés. {{stop_text}}',
                'variables_schema' => [
                    ['name' => 'product_name', 'label' => 'Nom produit', 'default' => ''],
                    ['name' => 'product_url', 'label' => 'URL produit', 'default' => 'https://protein.tn'],
                    ['name' => 'stop_text', 'label' => 'Texte désinscription', 'default' => 'STOP'],
                ],
            ],
        ];
    }

    public static function get(string $key): ?array
    {
        $all = self::all();
        return $all[$key] ?? null;
    }

    /**
     * @return list<string>
     */
    public static function getVariableNames(string $key): array
    {
        $t = self::get($key);
        if (!$t) {
            return [];
        }
        $out = [];
        foreach ($t['variables_schema'] ?? [] as $var) {
            $name = is_array($var) ? ($var['name'] ?? $var['key'] ?? '') : (string) $var;
            if ($name) {
                $out[] = $name;
            }
        }
        return $out;
    }

    /**
     * @return array<string, string>
     */
    public static function getDefaultVariables(string $key): array
    {
        $t = self::get($key);
        if (!$t) {
            return [];
        }
        $out = [];
        foreach ($t['variables_schema'] ?? [] as $var) {
            $name = is_array($var) ? ($var['name'] ?? $var['key'] ?? '') : $var;
            $default = is_array($var) ? ($var['default'] ?? '') : '';
            if ($name) {
                $out[$name] = $default;
            }
        }
        return $out;
    }

    public static function renderText(string $key, array $variables): string
    {
        $t = self::get($key);
        if (!$t) {
            return '';
        }
        $body = $t['body'] ?? '';
        foreach ($variables as $k => $v) {
            if (is_array($v) || is_object($v)) {
                continue;
            }
            $body = str_replace('{{' . $k . '}}', (string) $v, $body);
        }
        return $body;
    }

    /**
     * GSM-7 single segment = 160 chars; multi-segment 153 per segment.
     * Non-GSM (UCS-2) = 70 per segment. Simplified: use 160/153.
     */
    public static function estimateSegments(string $message): int
    {
        $len = mb_strlen($message);
        if ($len <= 160) {
            return 1;
        }
        return (int) ceil($len / 153);
    }
}
