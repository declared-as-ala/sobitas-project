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
        return MarketingService::logoUrl();
    }

    private static function emailResponsiveStyles(): string
    {
        return '<style type="text/css">'
            . 'body { margin: 0; padding: 0; } '
            . 'table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; } '
            . 'img { border: 0; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; } '
            . 'a { color: #F97316; text-decoration: none; } '
            . '@media screen and (max-width: 620px) { '
            . '  .email-wrapper { padding: 16px 8px !important; } '
            . '  .email-container { width: 100% !important; max-width: 100% !important; border-radius: 12px !important; } '
            . '  .email-header { padding: 24px 20px 20px !important; } '
            . '  .email-body { padding: 28px 20px !important; } '
            . '  .email-footer { padding: 20px 16px !important; } '
            . '  .email-btn { width: 100% !important; display: block !important; } '
            . '  .email-btn a { display: block !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; } '
            . '  .email-h1 { font-size: 22px !important; } '
            . '  .email-hero-badge { font-size: 52px !important; } '
            . '  .promo-code-box { padding: 20px 16px !important; } '
            . '  .promo-code-text { font-size: 28px !important; letter-spacing: 4px !important; } '
            . '} '
            . '</style>';
    }

    private static function htmlOffers(): string
    {
        $style = self::emailResponsiveStyles();
        return <<<HTML
<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
  <title>Ne ratez pas nos offres – Protein.tn</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  {$style}
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Preheader (hidden preview text) -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#f4f4f5;line-height:1px;">
  Découvrez nos dernières offres et nouveautés sur Protein.tn – votre nutrition, au meilleur prix.
</div>

<!-- Outer wrapper -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-wrapper" style="background-color:#f4f4f5;padding:40px 16px;">
  <tr>
    <td align="center">

      <!-- Main container: max 600px -->
      <table role="presentation" class="email-container" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.04);">

        <!-- Top accent bar -->
        <tr>
          <td style="background:linear-gradient(90deg,#F97316 0%,#fb923c 100%);height:5px;border-radius:16px 16px 0 0;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- Header: logo + tagline -->
        <tr>
          <td class="email-header" align="center" style="padding:32px 40px 24px;border-bottom:1px solid #f3f4f6;">
            <a href="https://protein.tn" style="text-decoration:none;display:inline-block;">
              <img src="{{logo_url}}" alt="Protein.tn" width="240" style="max-width:240px;width:100%;height:auto;display:inline-block;border:0;" />
            </a>
            <p style="margin:10px 0 0;font-size:13px;color:#9ca3af;letter-spacing:0.5px;text-transform:uppercase;font-weight:500;">Votre partenaire nutrition &amp; bien-être</p>
          </td>
        </tr>

        <!-- Hero body -->
        <tr>
          <td class="email-body" style="padding:40px 40px 36px;">

            <!-- Hero icon/badge -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding-bottom:24px;">
                  <div class="email-hero-badge" style="font-size:64px;line-height:1;">💪</div>
                </td>
              </tr>
            </table>

            <!-- Headline -->
            <h1 class="email-h1" style="margin:0 0 16px;font-size:26px;font-weight:700;color:#111827;line-height:1.35;text-align:center;letter-spacing:-0.3px;">
              Ne ratez pas nos offres<br>&amp; nouveautés !
            </h1>

            <!-- Body copy -->
            <p style="margin:0 0 28px;font-size:16px;color:#4b5563;line-height:1.7;text-align:center;">
              Découvrez nos dernières offres exclusives sur <strong style="color:#111827;">Protein.tn</strong>. Whey, créatine, vitamines, snacks fitness — tout ce qu'il vous faut pour atteindre vos objectifs.
            </p>

            <!-- Divider -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:0 0 28px;">
                  <table role="presentation" width="60" cellpadding="0" cellspacing="0" border="0" align="center">
                    <tr>
                      <td style="background:#F97316;height:3px;border-radius:2px;font-size:0;line-height:0;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Feature bullets -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
              <tr>
                <td style="padding:0 0 12px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="width:28px;vertical-align:top;padding-top:2px;">
                        <div style="width:20px;height:20px;background:#fff7ed;border-radius:50%;text-align:center;font-size:11px;line-height:20px;">✓</div>
                      </td>
                      <td style="font-size:15px;color:#374151;line-height:1.5;padding-left:8px;">Produits certifiés, marques internationales</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 0 12px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="width:28px;vertical-align:top;padding-top:2px;">
                        <div style="width:20px;height:20px;background:#fff7ed;border-radius:50%;text-align:center;font-size:11px;line-height:20px;">✓</div>
                      </td>
                      <td style="font-size:15px;color:#374151;line-height:1.5;padding-left:8px;">Livraison rapide partout en Tunisie</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="width:28px;vertical-align:top;padding-top:2px;">
                        <div style="width:20px;height:20px;background:#fff7ed;border-radius:50%;text-align:center;font-size:11px;line-height:20px;">✓</div>
                      </td>
                      <td style="font-size:15px;color:#374151;line-height:1.5;padding-left:8px;">Prix compétitifs &amp; offres régulières</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Primary CTA button -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding:0 0 16px;">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://protein.tn" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="15%" strokecolor="#ea6c0f" fillcolor="#F97316">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:700;">Visiter Protein.tn</center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-->
                  <span class="email-btn" style="display:inline-block;">
                    <a href="https://protein.tn" style="display:inline-block;background:linear-gradient(135deg,#F97316 0%,#ea6c0f 100%);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 48px;border-radius:8px;letter-spacing:0.3px;mso-hide:all;">
                      Visiter Protein.tn &rarr;
                    </a>
                  </span>
                  <!--<![endif]-->
                </td>
              </tr>
            </table>

            <!-- Secondary links -->
            <p style="margin:8px 0 0;font-size:14px;color:#9ca3af;text-align:center;">
              <a href="https://protein.tn/shop" style="color:#F97316;text-decoration:none;font-weight:500;">Voir la boutique</a>
              &nbsp;&nbsp;·&nbsp;&nbsp;
              <a href="https://protein.tn/packs" style="color:#F97316;text-decoration:none;font-weight:500;">Voir les packs</a>
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td class="email-footer" style="padding:24px 40px 32px;border-top:1px solid #f3f4f6;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center">
                  <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#374151;">Protein.tn</p>
                  <p style="margin:0 0 12px;font-size:12px;color:#9ca3af;line-height:1.5;">
                    Vous recevez cet email car vous êtes inscrit à notre newsletter.<br>
                    &copy; 2025 Protein.tn. Tous droits réservés.
                  </p>
                  <p style="margin:0;font-size:12px;">
                    <a href="{{unsubscribe_url}}" style="color:#9ca3af;text-decoration:underline;">Se désabonner</a>
                    &nbsp;&nbsp;·&nbsp;&nbsp;
                    <a href="https://protein.tn" style="color:#9ca3af;text-decoration:underline;">protein.tn</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
      <!-- /Main container -->

    </td>
  </tr>
</table>
<!-- /Outer wrapper -->

</body>
</html>
HTML;
    }

    private static function htmlPromo(): string
    {
        $style = self::emailResponsiveStyles();
        return <<<HTML
<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
  <title>Code Promo – Protein.tn</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  {$style}
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Preheader -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#f4f4f5;line-height:1px;">
  Code promo {{promo_code}} – profitez de -{{discount_percent}}% sur votre prochaine commande. Offre limitée !
</div>

<!-- Outer wrapper -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-wrapper" style="background-color:#f4f4f5;padding:40px 16px;">
  <tr>
    <td align="center">

      <!-- Main container -->
      <table role="presentation" class="email-container" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.04);">

        <!-- Top accent bar -->
        <tr>
          <td style="background:linear-gradient(90deg,#F97316 0%,#fb923c 100%);height:5px;border-radius:16px 16px 0 0;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- Header: logo + tagline -->
        <tr>
          <td class="email-header" align="center" style="padding:32px 40px 24px;border-bottom:1px solid #f3f4f6;">
            <a href="https://protein.tn" style="text-decoration:none;display:inline-block;">
              <img src="{{logo_url}}" alt="Protein.tn" width="240" style="max-width:240px;width:100%;height:auto;display:inline-block;border:0;" />
            </a>
            <p style="margin:10px 0 0;font-size:13px;color:#9ca3af;letter-spacing:0.5px;text-transform:uppercase;font-weight:500;">Votre partenaire nutrition &amp; bien-être</p>
          </td>
        </tr>

        <!-- Hero body -->
        <tr>
          <td class="email-body" style="padding:40px 40px 36px;">

            <!-- Badge "Offre exclusive" -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding-bottom:28px;">
                  <span style="display:inline-block;background:#fff7ed;color:#ea580c;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:6px 16px;border-radius:100px;border:1px solid #fed7aa;">
                    🎁 &nbsp;Offre exclusive
                  </span>
                </td>
              </tr>
            </table>

            <!-- Headline -->
            <h1 class="email-h1" style="margin:0 0 8px;font-size:26px;font-weight:700;color:#111827;line-height:1.35;text-align:center;">
              Une remise spéciale rien que pour vous
            </h1>
            <p style="margin:0 0 32px;font-size:16px;color:#6b7280;line-height:1.6;text-align:center;">
              Utilisez votre code exclusif et économisez <strong style="color:#F97316;">-{{discount_percent}}%</strong> sur toute votre commande.
            </p>

            <!-- Discount percentage badge -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding-bottom:24px;">
                  <div style="display:inline-block;background:linear-gradient(135deg,#F97316 0%,#ea6c0f 100%);color:#ffffff;font-size:48px;font-weight:800;width:96px;height:96px;border-radius:50%;text-align:center;line-height:96px;box-shadow:0 8px 24px rgba(249,115,22,0.35);">
                    -{{discount_percent}}%
                  </div>
                </td>
              </tr>
            </table>

            <!-- Promo code box -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
              <tr>
                <td>
                  <div class="promo-code-box" style="background:#f9fafb;border:2px dashed #F97316;border-radius:12px;padding:24px 20px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#9ca3af;letter-spacing:1.5px;text-transform:uppercase;">Votre code promo</p>
                    <p class="promo-code-text" style="margin:0 0 10px;font-size:34px;font-weight:800;color:#111827;letter-spacing:6px;font-family:'Courier New',Courier,monospace;">{{promo_code}}</p>
                    <p style="margin:0;font-size:13px;color:#6b7280;">
                      Valable jusqu'au &nbsp;<strong style="color:#111827;">{{end_date}}</strong>
                    </p>
                  </div>
                </td>
              </tr>
            </table>

            <!-- How to use -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border-radius:10px;margin-bottom:32px;">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">Comment utiliser ce code ?</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding:4px 0;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="width:22px;font-size:14px;color:#F97316;vertical-align:top;padding-top:1px;">1.</td>
                            <td style="font-size:14px;color:#4b5563;line-height:1.5;">Ajoutez vos produits au panier</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="width:22px;font-size:14px;color:#F97316;vertical-align:top;padding-top:1px;">2.</td>
                            <td style="font-size:14px;color:#4b5563;line-height:1.5;">Entrez le code <strong>{{promo_code}}</strong> à la caisse</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="width:22px;font-size:14px;color:#F97316;vertical-align:top;padding-top:1px;">3.</td>
                            <td style="font-size:14px;color:#4b5563;line-height:1.5;">Profitez de votre remise instantanée !</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Primary CTA button -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding:0 0 12px;">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{highlight_category_url}}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="15%" strokecolor="#ea6c0f" fillcolor="#F97316">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:700;">J'en profite maintenant</center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-->
                  <span class="email-btn" style="display:inline-block;">
                    <a href="{{highlight_category_url}}" style="display:inline-block;background:linear-gradient(135deg,#F97316 0%,#ea6c0f 100%);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 48px;border-radius:8px;letter-spacing:0.3px;mso-hide:all;">
                      J'en profite maintenant &rarr;
                    </a>
                  </span>
                  <!--<![endif]-->
                </td>
              </tr>
            </table>

            <!-- Urgency note -->
            <p style="margin:8px 0 0;font-size:13px;color:#9ca3af;text-align:center;">
              ⏳ &nbsp;Offre limitée — expire le <strong style="color:#374151;">{{end_date}}</strong>
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td class="email-footer" style="padding:24px 40px 32px;border-top:1px solid #f3f4f6;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center">
                  <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#374151;">Protein.tn</p>
                  <p style="margin:0 0 12px;font-size:12px;color:#9ca3af;line-height:1.5;">
                    Vous recevez cet email car vous êtes inscrit à notre newsletter.<br>
                    &copy; 2025 Protein.tn. Tous droits réservés.
                  </p>
                  <p style="margin:0;font-size:12px;">
                    <a href="{{unsubscribe_url}}" style="color:#9ca3af;text-decoration:underline;">Se désabonner</a>
                    &nbsp;&nbsp;·&nbsp;&nbsp;
                    <a href="https://protein.tn" style="color:#9ca3af;text-decoration:underline;">protein.tn</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
      <!-- /Main container -->

    </td>
  </tr>
</table>
<!-- /Outer wrapper -->

</body>
</html>
HTML;
    }

    private static function htmlNewProducts(): string
    {
        $style = self::emailResponsiveStyles();
        return <<<HTML
<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
  <title>{{headline}} – Protein.tn</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  {$style}
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Preheader -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#f4f4f5;line-height:1px;">
  {{headline}} – Découvrez nos nouveaux produits sur Protein.tn. Arrivée fraîche de nouveautés fitness.
</div>

<!-- Outer wrapper -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-wrapper" style="background-color:#f4f4f5;padding:40px 16px;">
  <tr>
    <td align="center">

      <!-- Main container -->
      <table role="presentation" class="email-container" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.04);">

        <!-- Top accent bar -->
        <tr>
          <td style="background:linear-gradient(90deg,#F97316 0%,#fb923c 100%);height:5px;border-radius:16px 16px 0 0;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- Header: logo + tagline -->
        <tr>
          <td class="email-header" align="center" style="padding:32px 40px 24px;border-bottom:1px solid #f3f4f6;">
            <a href="https://protein.tn" style="text-decoration:none;display:inline-block;">
              <img src="{{logo_url}}" alt="Protein.tn" width="240" style="max-width:240px;width:100%;height:auto;display:inline-block;border:0;" />
            </a>
            <p style="margin:10px 0 0;font-size:13px;color:#9ca3af;letter-spacing:0.5px;text-transform:uppercase;font-weight:500;">Votre partenaire nutrition &amp; bien-être</p>
          </td>
        </tr>

        <!-- Hero body -->
        <tr>
          <td class="email-body" style="padding:40px 40px 36px;">

            <!-- "Nouveau" badge -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding-bottom:24px;">
                  <span style="display:inline-block;background:#fff7ed;color:#ea580c;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:6px 16px;border-radius:100px;border:1px solid #fed7aa;">
                    ✨ &nbsp;Nouvel arrivage
                  </span>
                </td>
              </tr>
            </table>

            <!-- Headline -->
            <h1 class="email-h1" style="margin:0 0 16px;font-size:26px;font-weight:700;color:#111827;line-height:1.35;text-align:center;letter-spacing:-0.3px;">
              {{headline}}
            </h1>

            <!-- Intro text -->
            <p style="margin:0 0 32px;font-size:16px;color:#4b5563;line-height:1.7;text-align:center;">
              {{intro_text}}
            </p>

            <!-- Divider -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:0 0 32px;">
                  <table role="presentation" width="60" cellpadding="0" cellspacing="0" border="0" align="center">
                    <tr>
                      <td style="background:#F97316;height:3px;border-radius:2px;font-size:0;line-height:0;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Products HTML block -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-bottom:32px;">
                  {{products_html}}
                </td>
              </tr>
            </table>

            <!-- Primary CTA button -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding:0 0 16px;">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://protein.tn/shop" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="15%" strokecolor="#ea6c0f" fillcolor="#F97316">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:700;">Voir toutes les nouveautés</center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-->
                  <span class="email-btn" style="display:inline-block;">
                    <a href="https://protein.tn/shop" style="display:inline-block;background:linear-gradient(135deg,#F97316 0%,#ea6c0f 100%);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 48px;border-radius:8px;letter-spacing:0.3px;mso-hide:all;">
                      Voir toutes les nouveautés &rarr;
                    </a>
                  </span>
                  <!--<![endif]-->
                </td>
              </tr>
            </table>

            <!-- Secondary link -->
            <p style="margin:8px 0 0;font-size:14px;color:#9ca3af;text-align:center;">
              <a href="https://protein.tn" style="color:#F97316;text-decoration:none;font-weight:500;">Retour à la boutique</a>
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td class="email-footer" style="padding:24px 40px 32px;border-top:1px solid #f3f4f6;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center">
                  <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#374151;">Protein.tn</p>
                  <p style="margin:0 0 12px;font-size:12px;color:#9ca3af;line-height:1.5;">
                    Vous recevez cet email car vous êtes inscrit à notre newsletter.<br>
                    &copy; 2025 Protein.tn. Tous droits réservés.
                  </p>
                  <p style="margin:0;font-size:12px;">
                    <a href="{{unsubscribe_url}}" style="color:#9ca3af;text-decoration:underline;">Se désabonner</a>
                    &nbsp;&nbsp;·&nbsp;&nbsp;
                    <a href="https://protein.tn" style="color:#9ca3af;text-decoration:underline;">protein.tn</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
      <!-- /Main container -->

    </td>
  </tr>
</table>
<!-- /Outer wrapper -->

</body>
</html>
HTML;
    }
}
