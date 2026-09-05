<?php

namespace App\Console\Commands;

use App\Jobs\ProcessCampaignJob;
use App\Models\MarketingCampaign;
use App\Models\Newsletter;
use App\Models\Product;
use App\Services\DefaultEmailTemplates;
use App\Support\Seo\ProductPublicUrl;
use Illuminate\Console\Command;

class SendWeeklyMarketingDigest extends Command
{
    protected $signature = 'marketing:send-weekly-digest {--dry-run : Report the audience and products without queueing mail}';
    protected $description = 'Queue one consent-only, idempotent weekly Protein.tn product digest';

    public function handle(): int
    {
        if (! config('marketing.automation_enabled', true)) {
            $this->info('Marketing automation is disabled.');
            return self::SUCCESS;
        }

        $limit = max(1, min((int) config('marketing.weekly_digest_limit', 1000), 5000));
        $subscribers = Newsletter::subscribed()
            ->whereNotNull('email')->where('email', '!=', '')
            ->orderBy('id')->limit($limit)->get(['id', 'email']);

        $recipients = $subscribers->filter(fn (Newsletter $row) => filter_var($row->email, FILTER_VALIDATE_EMAIL))
            ->unique(fn (Newsletter $row) => strtolower($row->email))
            ->map(fn (Newsletter $row) => ['email' => strtolower(trim($row->email)), 'client_id' => null])
            ->values()->all();

        $products = Product::query()->published()->inStock()
            ->where(fn ($query) => $query->where('new_product', 1)->orWhere('best_seller', 1))
            ->with('sousCategorie:id,slug')
            ->latest('updated_at')->limit(4)
            ->get(['id', 'designation_fr', 'slug', 'cover', 'prix', 'promo', 'promo_expiration_date', 'sous_categorie_id']);

        $this->line(sprintf('%d confirmed subscriber(s), %d product(s).', count($recipients), $products->count()));
        if ($this->option('dry-run') || $recipients === [] || $products->isEmpty()) {
            return self::SUCCESS;
        }

        $automationKey = 'weekly-digest:'.now()->format('o-W');
        if (MarketingCampaign::where('automation_key', $automationKey)->exists()) {
            $this->info('This week already has a campaign.');
            return self::SUCCESS;
        }

        $variables = [
            'headline' => 'Les choix Protein.tn de la semaine',
            'intro_text' => 'Une sélection courte de produits disponibles, choisis pour vous aider à avancer sans perdre de temps.',
            'products_html' => $this->productsHtml($products),
        ];

        $campaign = MarketingCampaign::create([
            'automation_key' => $automationKey,
            'type' => 'email',
            'template_key' => DefaultEmailTemplates::KEY_NEW_PRODUCTS,
            'template_vars' => $variables,
            'subject' => DefaultEmailTemplates::renderSubject(DefaultEmailTemplates::KEY_NEW_PRODUCTS, $variables),
            'recipients' => $recipients,
            'total' => count($recipients),
            'sent' => 0,
            'failed' => 0,
            'skipped' => 0,
            'status' => MarketingCampaign::STATUS_QUEUED,
        ]);

        ProcessCampaignJob::dispatch($campaign->id);
        $this->info("Campaign {$campaign->id} queued.");

        return self::SUCCESS;
    }

    private function productsHtml($products): string
    {
        return $products->map(function (Product $product): string {
            $rawName = (string) $product->designation_fr;
            $name = e($rawName);
            $price = number_format($product->getEffectiveUnitPrice(), 3, ',', ' ');
            $category = $product->sousCategorie?->slug ?: 'shop';
            $url = 'https://protein.tn/'.rawurlencode($category).'/'.rawurlencode((string) $product->slug);
            $image = ProductPublicUrl::fromPath($product->cover);
            $imageHtml = $image ? '<img src="'.e($image).'" alt="'.e($rawName).'" width="82" style="display:block;width:82px;height:82px;object-fit:contain;border:0">' : '';

            return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e7e5e4"><tr>'
                .'<td width="98" style="padding:14px 12px 14px 0">'.$imageHtml.'</td>'
                .'<td style="padding:14px 0"><a href="'.e($url).'" style="color:#171717;text-decoration:none;font-size:15px;font-weight:700;line-height:1.35">'.$name.'</a>'
                .'<div style="margin-top:7px;color:#d93700;font-size:17px;font-weight:800">'.$price.' DT</div></td>'
                .'</tr></table>';
        })->implode('');
    }
}
