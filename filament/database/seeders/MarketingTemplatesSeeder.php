<?php

namespace Database\Seeders;

use App\Models\MarketingTemplate;
use Illuminate\Database\Seeder;

class MarketingTemplatesSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            // ─── Template #1: Ne ratez pas nos offres ───
            [
                'type' => 'sms',
                'name' => 'Ne ratez pas nos offres – Visitez Protein.tn',
                'subject' => null,
                'content_text' => "Protein.tn: Ne ratez pas nos offres et nouveautés 💪 Visitez protein.tn dès maintenant. {{stop_text}}",
                'content_html' => null,
                'variables_schema' => [
                    ['name' => 'stop_text', 'label' => 'Texte désinscription', 'default' => 'STOP'],
                ],
                'is_active' => true,
            ],
            [
                'type' => 'email',
                'name' => 'Ne ratez pas nos offres – Visitez Protein.tn',
                'subject' => "Ne ratez pas nos offres sur Protein.tn 💪",
                'content_text' => null,
                'content_html' => null, // stored in next step with placeholder
                'variables_schema' => [],
                'is_active' => true,
            ],
            // ─── Template #2: Code promo ───
            [
                'type' => 'sms',
                'name' => 'Code promo – % remise',
                'subject' => null,
                'content_text' => "Protein.tn: -{{discount_percent}}% avec le code {{promo_code}} jusqu'au {{end_date}}. Commandez sur protein.tn {{stop_text}}",
                'content_html' => null,
                'variables_schema' => [
                    ['name' => 'promo_code', 'label' => 'Code promo', 'default' => ''],
                    ['name' => 'discount_percent', 'label' => '% remise', 'default' => '10'],
                    ['name' => 'end_date', 'label' => 'Date fin', 'default' => ''],
                    ['name' => 'stop_text', 'label' => 'Texte désinscription', 'default' => 'STOP'],
                ],
                'is_active' => true,
            ],
            [
                'type' => 'email',
                'name' => 'Code promo – % remise',
                'subject' => "Code promo {{promo_code}} 🎁 -{{discount_percent}}% sur Protein.tn",
                'content_text' => null,
                'content_html' => null,
                'variables_schema' => [
                    ['name' => 'promo_code', 'label' => 'Code promo', 'default' => ''],
                    ['name' => 'discount_percent', 'label' => '% remise', 'default' => '10'],
                    ['name' => 'end_date', 'label' => 'Valable jusqu\'au', 'default' => ''],
                    ['name' => 'highlight_category_url', 'label' => 'URL catégorie (optionnel)', 'default' => 'https://protein.tn'],
                ],
                'is_active' => true,
            ],
            // ─── Template #3: Nouveaux produits ───
            [
                'type' => 'sms',
                'name' => 'Nouveaux produits / Nouvel arrivage',
                'subject' => null,
                'content_text' => "Protein.tn: Nouvel arrivage 💪 {{product_1_name}} est dispo: {{product_1_url}}. + nouveautés sur protein.tn {{stop_text}}",
                'content_html' => null,
                'variables_schema' => [
                    ['name' => 'product_1_name', 'label' => 'Produit 1 nom', 'default' => ''],
                    ['name' => 'product_1_url', 'label' => 'Produit 1 URL', 'default' => ''],
                    ['name' => 'stop_text', 'label' => 'Texte désinscription', 'default' => 'STOP'],
                ],
                'is_active' => true,
            ],
            [
                'type' => 'email',
                'name' => 'Nouveaux produits / Nouvel arrivage',
                'subject' => "Nouveautés: {{headline}} sur Protein.tn 💪",
                'content_text' => null,
                'content_html' => null,
                'variables_schema' => [
                    ['name' => 'headline', 'label' => 'Titre', 'default' => 'Nouvelles arrivées'],
                    ['name' => 'intro_text', 'label' => 'Texte d\'intro (optionnel)', 'default' => ''],
                    ['name' => 'products', 'label' => 'Produits (JSON array)', 'default' => '[]'],
                ],
                'is_active' => true,
            ],
        ];

        foreach ($templates as $t) {
            MarketingTemplate::updateOrCreate(
                [
                    'type' => $t['type'],
                    'name' => $t['name'],
                ],
                $t
            );
        }

        // Set HTML for email template #1 (simple layout)
        $t1 = MarketingTemplate::where('type', 'email')->where('name', 'Ne ratez pas nos offres – Visitez Protein.tn')->first();
        if ($t1) {
            $t1->content_html = $this->getEmailTemplate1Html();
            $t1->save();
        }

        $t2 = MarketingTemplate::where('type', 'email')->where('name', 'Code promo – % remise')->first();
        if ($t2) {
            $t2->content_html = $this->getEmailTemplate2Html();
            $t2->save();
        }

        $t3 = MarketingTemplate::where('type', 'email')->where('name', 'Nouveaux produits / Nouvel arrivage')->first();
        if ($t3) {
            $t3->content_html = $this->getEmailTemplate3Html();
            $t3->save();
        }
    }

    private function getEmailTemplate1Html(): string
    {
        return <<<'HTML'
<div class="wrapper" style="max-width:600px;margin:0 auto;font-family:sans-serif;background:#f5f5f5;padding:24px;">
  <div class="header" style="text-align:center;padding:16px 0;">
    <img src="{{logo_url}}" alt="Protein.tn" style="max-height:48px;" />
  </div>
  <div class="body" style="background:#fff;border-radius:8px;padding:32px;margin:16px 0;">
    <h1 style="font-size:22px;color:#111;margin:0 0 16px;">Ne ratez pas nos offres & nouveautés</h1>
    <p style="color:#444;line-height:1.5;margin:0 0 24px;">Découvrez nos dernières offres et nouveautés sur Protein.tn. Des produits de qualité pour votre nutrition et bien-être.</p>
    <p style="margin:0 0 24px;"><a href="https://protein.tn" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;">Visiter Protein.tn</a></p>
    <p style="font-size:14px;color:#666;">
      <a href="https://protein.tn" style="color:#2563eb;">Voir la boutique</a> · <a href="https://protein.tn/shop" style="color:#2563eb;">Voir les packs</a>
    </p>
  </div>
  <div class="footer" style="text-align:center;font-size:12px;color:#888;padding:16px;">
    <p style="margin:0;">Protein.tn</p>
    <p style="margin:8px 0 0;"><a href="{{unsubscribe_url}}" style="color:#888;">Se désinscrire</a></p>
  </div>
</div>
HTML;
    }

    private function getEmailTemplate2Html(): string
    {
        return <<<'HTML'
<div class="wrapper" style="max-width:600px;margin:0 auto;font-family:sans-serif;background:#f5f5f5;padding:24px;">
  <div class="header" style="text-align:center;padding:16px 0;">
    <img src="{{logo_url}}" alt="Protein.tn" style="max-height:48px;" />
  </div>
  <div class="body" style="background:#fff;border-radius:8px;padding:32px;margin:16px 0;">
    <div style="background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:#fff;padding:24px;border-radius:8px;text-align:center;margin-bottom:24px;">
      <p style="margin:0;font-size:18px;">Offre exceptionnelle</p>
    </div>
    <p style="text-align:center;font-size:32px;font-weight:700;letter-spacing:4px;margin:0 0 8px;color:#111;">{{promo_code}}</p>
    <p style="text-align:center;color:#666;margin:0 0 24px;">-{{discount_percent}}% sur votre commande</p>
    <p style="text-align:center;color:#444;margin:0 0 24px;">Valable jusqu'au <strong>{{end_date}}</strong></p>
    <p style="text-align:center;"><a href="{{highlight_category_url}}" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;">J'en profite</a></p>
  </div>
  <div class="footer" style="text-align:center;font-size:12px;color:#888;padding:16px;">
    <p style="margin:0;">Protein.tn</p>
    <p style="margin:8px 0 0;"><a href="{{unsubscribe_url}}" style="color:#888;">Se désinscrire</a></p>
  </div>
</div>
HTML;
    }

    private function getEmailTemplate3Html(): string
    {
        return <<<'HTML'
<div class="wrapper" style="max-width:600px;margin:0 auto;font-family:sans-serif;background:#f5f5f5;padding:24px;">
  <div class="header" style="text-align:center;padding:16px 0;">
    <img src="{{logo_url}}" alt="Protein.tn" style="max-height:48px;" />
  </div>
  <div class="body" style="background:#fff;border-radius:8px;padding:32px;margin:16px 0;">
    <h1 style="font-size:22px;color:#111;margin:0 0 8px;">Nouvelles arrivées</h1>
    <p style="color:#444;line-height:1.5;margin:0 0 24px;">{{intro_text}}</p>
    <div class="products">{{products_html}}</div>
    <p style="margin:24px 0 0;text-align:center;"><a href="https://protein.tn/shop" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;">Voir toutes les nouveautés</a></p>
  </div>
  <div class="footer" style="text-align:center;font-size:12px;color:#888;padding:16px;">
    <p style="margin:0;">Protein.tn</p>
    <p style="margin:8px 0 0;"><a href="{{unsubscribe_url}}" style="color:#888;">Se désinscrire</a></p>
  </div>
</div>
HTML;
    }
}
