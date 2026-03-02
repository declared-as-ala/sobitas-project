<?php

namespace App\Services;

class DefaultEmailTemplates
{
    public const KEY_OFFERS = 'offers';
    public const KEY_PROMO = 'promo';
    public const KEY_NEW_PRODUCTS = 'new_products';

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
     * @return array<string, array{name: string, subject: string, content_html: string, variables_schema: array}>
     */
    public static function all(): array
    {
        return [
            self::KEY_OFFERS => [
                'name' => 'Ne ratez pas nos offres – Visitez Protein.tn',
                'subject' => 'Ne ratez pas nos offres sur Protein.tn 💪',
                'content_html' => self::htmlOffers(),
                'variables_schema' => [],
            ],
            self::KEY_PROMO => [
                'name' => 'Code promo – % remise',
                'subject' => 'Code promo {{promo_code}} 🎁 -{{discount_percent}}% sur Protein.tn',
                'content_html' => self::htmlPromo(),
                'variables_schema' => [
                    ['name' => 'promo_code', 'label' => 'Code promo', 'default' => ''],
                    ['name' => 'discount_percent', 'label' => '% remise', 'default' => '10'],
                    ['name' => 'end_date', 'label' => 'Valable jusqu\'au', 'default' => ''],
                    ['name' => 'highlight_category_url', 'label' => 'URL catégorie (optionnel)', 'default' => 'https://protein.tn'],
                ],
            ],
            self::KEY_NEW_PRODUCTS => [
                'name' => 'Nouveaux produits / Nouvel arrivage',
                'subject' => 'Nouveautés: {{headline}} sur Protein.tn 💪',
                'content_html' => self::htmlNewProducts(),
                'variables_schema' => [
                    ['name' => 'headline', 'label' => 'Titre', 'default' => 'Nouvelles arrivées'],
                    ['name' => 'intro_text', 'label' => 'Texte d\'intro (optionnel)', 'default' => ''],
                    ['name' => 'products_html', 'label' => 'HTML blocs produits (optionnel)', 'default' => ''],
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
     * @return list<string> Variable names used by the template
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

    public static function renderSubject(string $key, array $variables): string
    {
        $t = self::get($key);
        if (!$t) {
            return '';
        }
        $subject = $t['subject'] ?? '';
        foreach ($variables as $k => $v) {
            if (is_array($v) || is_object($v)) {
                continue;
            }
            $subject = str_replace('{{' . $k . '}}', (string) $v, $subject);
        }
        return $subject;
    }

    public static function renderHtml(string $key, array $variables): string
    {
        $t = self::get($key);
        if (!$t) {
            return '';
        }
        $html = $t['content_html'] ?? '';
        foreach ($variables as $k => $v) {
            if (is_array($v) || is_object($v)) {
                continue;
            }
            $html = str_replace('{{' . $k . '}}', (string) $v, $html);
        }
        return $html;
    }

    /** Default logo URL (absolute) for emails and iframe preview */
    public static function defaultLogoUrl(): string
    {
        return config('marketing.logo_url', rtrim(config('app.url'), '/') . '/icon.png');
    }

    private static function emailResponsiveStyles(): string
    {
        return '<style type="text/css">'
            . '@media screen and (max-width: 600px){ '
            . '.email-container{ width:100% !important; max-width:100% !important; } '
            . '.email-btn{ width:100% !important; max-width:100% !important; display:block !important; box-sizing:border-box !important; word-break:break-word !important; } '
            . '.email-btn a{ display:block !important; width:100% !important; box-sizing:border-box !important; } '
            . '}</style>';
    }

    private static function htmlOffers(): string
    {
        return <<<'HTML'
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
HTML
            . self::emailResponsiveStyles() . '
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;background:#e5e7eb;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e5e7eb;padding:24px 16px;">
<tr><td align="center">
<table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="text-align:center;padding:20px 0 16px;">
<img src="{{logo_url}}" alt="SOBITAS" style="max-width:100%;height:auto;max-height:56px;display:inline-block;" />
<p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Votre partenaire nutrition</p>
</td></tr>
<tr><td style="background:#fff;border-radius:12px;padding:32px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<h1 style="margin:0 0 16px;font-size:24px;color:#111;line-height:1.3;">Ne ratez pas nos offres & nouveautés</h1>
<p style="margin:0 0 24px;color:#4b5563;line-height:1.6;font-size:16px;">Découvrez nos dernières offres et nouveautés sur Protein.tn. Des produits de qualité pour votre nutrition et bien-être.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 24px;">
<span class="email-btn" style="display:inline-block;max-width:100%;box-sizing:border-box;word-break:break-word;"><a href="https://protein.tn" style="display:inline-block;max-width:280px;width:100%;background:#F97316;color:#fff!important;padding:16px 28px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;text-align:center;box-sizing:border-box;">Visiter Protein.tn</a></span>
</td></tr></table>
<p style="font-size:14px;color:#6b7280;margin:0;text-align:center;">
<a href="https://protein.tn" style="color:#F97316;">Voir la boutique</a> &nbsp;·&nbsp; <a href="https://protein.tn/shop" style="color:#F97316;">Voir les packs</a>
</p>
</td></tr>
<tr><td style="text-align:center;font-size:12px;color:#9ca3af;padding:24px 16px;">
<p style="margin:0;">SOBITAS · Protein.tn</p>
<p style="margin:8px 0 0;"><a href="https://protein.tn" style="color:#F97316;">protein.tn</a></p>
<p style="margin:12px 0 0;color:#6b7280;">Vous recevez cet email car vous êtes inscrit à notre liste.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>';
    }

    private static function htmlPromo(): string
    {
        $style = self::emailResponsiveStyles();
        return <<<HTML
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">{$style}</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#e5e7eb;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e5e7eb;padding:24px 16px;">
<tr><td align="center">
<table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="text-align:center;padding:20px 0 16px;">
<img src="{{logo_url}}" alt="SOBITAS" style="max-width:100%;height:auto;max-height:56px;display:inline-block;" />
<p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Votre partenaire nutrition</p>
</td></tr>
<tr><td style="background:#fff;border-radius:12px;padding:32px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<div style="background:#F97316;color:#fff;padding:20px;border-radius:8px;text-align:center;margin-bottom:24px;">
<p style="margin:0;font-size:18px;font-weight:600;">Offre exceptionnelle</p>
</div>
<p style="text-align:center;font-size:28px;font-weight:700;letter-spacing:2px;margin:0 0 8px;color:#111;">{{promo_code}}</p>
<p style="text-align:center;color:#4b5563;margin:0 0 8px;font-size:18px;">-{{discount_percent}}% sur votre commande</p>
<p style="text-align:center;color:#6b7280;margin:0 0 24px;font-size:15px;">Valable jusqu'au <strong>{{end_date}}</strong></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0;">
<span class="email-btn" style="display:inline-block;max-width:100%;box-sizing:border-box;word-break:break-word;"><a href="{{highlight_category_url}}" style="display:inline-block;max-width:280px;width:100%;background:#F97316;color:#fff!important;padding:16px 28px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;text-align:center;box-sizing:border-box;">J'en profite</a></span>
</td></tr></table>
</td></tr>
<tr><td style="text-align:center;font-size:12px;color:#9ca3af;padding:24px 16px;">
<p style="margin:0;">SOBITAS · Protein.tn</p>
<p style="margin:8px 0 0;"><a href="https://protein.tn" style="color:#F97316;">protein.tn</a></p>
<p style="margin:12px 0 0;color:#6b7280;">Vous recevez cet email car vous êtes inscrit à notre liste.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>
HTML;
    }

    private static function htmlNewProducts(): string
    {
        $style = self::emailResponsiveStyles();
        return <<<HTML
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">{$style}</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#e5e7eb;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e5e7eb;padding:24px 16px;">
<tr><td align="center">
<table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="text-align:center;padding:20px 0 16px;">
<img src="{{logo_url}}" alt="SOBITAS" style="max-width:100%;height:auto;max-height:56px;display:inline-block;" />
<p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Votre partenaire nutrition</p>
</td></tr>
<tr><td style="background:#fff;border-radius:12px;padding:32px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<h1 style="margin:0 0 8px;font-size:24px;color:#111;">Nouvelles arrivées</h1>
<p style="color:#4b5563;line-height:1.6;margin:0 0 24px;font-size:16px;">{{intro_text}}</p>
<div style="margin:0 0 24px;">{{products_html}}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0;">
<span class="email-btn" style="display:inline-block;max-width:100%;box-sizing:border-box;word-break:break-word;"><a href="https://protein.tn/shop" style="display:inline-block;max-width:280px;width:100%;background:#F97316;color:#fff!important;padding:16px 28px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;text-align:center;box-sizing:border-box;">Voir toutes les nouveautés</a></span>
</td></tr></table>
</td></tr>
<tr><td style="text-align:center;font-size:12px;color:#9ca3af;padding:24px 16px;">
<p style="margin:0;">SOBITAS · Protein.tn</p>
<p style="margin:8px 0 0;"><a href="https://protein.tn" style="color:#F97316;">protein.tn</a></p>
<p style="margin:12px 0 0;color:#6b7280;">Vous recevez cet email car vous êtes inscrit à notre liste.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>
HTML;
    }
}
