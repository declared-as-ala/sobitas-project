<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Coordinate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Google Merchant Center & Meta Catalog product feed.
 *
 * GET /api/merchant-feed        → Google RSS 2.0 / Shopping XML
 * GET /api/merchant-feed?format=json  → JSON array (Meta catalog / custom)
 */
class ProductFeedController extends Controller
{
    private const SITE_URL  = 'https://protein.tn';
    private const CACHE_TTL = 1800; // 30 min

    public function feed(Request $request)
    {
        $format = $request->query('format', 'xml');

        $products = Cache::remember('merchant_feed_products', self::CACHE_TTL, function () {
            return Product::where('publier', 1)
                // rupture: 1 = OUT of stock, 0 = in stock (Product.php:153 + saving hook :73-78).
                // Was `!= 0`, which shipped ONLY out-of-stock products. Feed the in-stock ones.
                ->where('rupture', 0)
                // Relationship is sousCategorie() (Product.php:87); `sous_categorie` (snake) is not a
                // real relation and made ->with() throw RelationNotFoundException → the feed 500'd.
                ->with(['sousCategorie', 'brand'])
                ->select([
                    'id', 'designation_fr', 'slug', 'prix', 'promo', 'cover',
                    'description_fr', 'sous_categorie_id', 'brand_id', 'code_product',
                    'new_product', 'best_seller', 'rupture', 'publier',
                ])
                ->limit(5000)
                ->get();
        });

        $coord = Coordinate::getCached();
        $currency = 'TND';

        if ($format === 'json') {
            return response()->json($this->buildJsonFeed($products, $coord, $currency))
                ->header('Cache-Control', 'public, max-age=1800')
                ->header('X-Robots-Tag', 'noindex');
        }

        $xml = $this->buildXmlFeed($products, $coord, $currency);

        return response($xml, 200, [
            'Content-Type'  => 'application/xml; charset=UTF-8',
            'Cache-Control' => 'public, max-age=1800',
            // The feed is a data endpoint on the admin host — do not let it get indexed.
            'X-Robots-Tag'  => 'noindex',
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────
    // XML feed (Google Merchant Center RSS 2.0)
    // ──────────────────────────────────────────────────────────────────────
    private function buildXmlFeed($products, $coord, string $currency): string
    {
        $storeName = $coord->name ?? 'Protéine Tunisie';
        $storeUrl  = self::SITE_URL;
        $now       = now()->toRfc2822();

        $items = '';
        foreach ($products as $p) {
            $price      = $this->effectivePrice($p);
            $productUrl = $this->productUrl($p);
            $imageUrl   = $this->imageUrl($p->cover);
            // Escape brand/product_type too (were raw — a name with & < > broke the XML).
            $category   = htmlspecialchars($p->sousCategorie?->designation_fr ?? 'Compléments alimentaires', ENT_XML1, 'UTF-8');
            $brand      = htmlspecialchars($p->brand?->designation_fr ?? $storeName, ENT_XML1, 'UTF-8');
            $desc       = strip_tags($p->description_fr ?? $p->designation_fr ?? '');
            $desc       = htmlspecialchars(mb_substr($desc, 0, 5000), ENT_XML1, 'UTF-8');
            $title      = htmlspecialchars($p->designation_fr ?? '', ENT_XML1, 'UTF-8');
            $sku        = htmlspecialchars($p->code_product ?? (string) $p->id, ENT_XML1, 'UTF-8');
            // rupture 1 = out of stock, 0 = in stock. Was inverted (labeled OOS items 'in stock').
            $availability = $p->rupture ? 'out of stock' : 'in stock';

            $items .= <<<XML

        <item>
            <g:id>{$p->id}</g:id>
            <g:mpn>{$sku}</g:mpn>
            <title>{$title}</title>
            <description>{$desc}</description>
            <link>{$productUrl}</link>
            <g:image_link>{$imageUrl}</g:image_link>
            <g:availability>{$availability}</g:availability>
            <g:price>{$price} {$currency}</g:price>
            <g:brand>{$brand}</g:brand>
            <g:product_type>{$category}</g:product_type>
            <g:google_product_category>432</g:google_product_category>
            <g:condition>new</g:condition>
            <g:shipping>
                <g:country>TN</g:country>
                <g:price>7.000 TND</g:price>
            </g:shipping>
        </item>
XML;
        }

        return <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
    <channel>
        <title>{$storeName}</title>
        <link>{$storeUrl}</link>
        <description>Flux produit Google Merchant Center — {$storeName}</description>
        <lastBuildDate>{$now}</lastBuildDate>
        {$items}
    </channel>
</rss>
XML;
    }

    // ──────────────────────────────────────────────────────────────────────
    // JSON feed (Meta catalog / generic)
    // ──────────────────────────────────────────────────────────────────────
    private function buildJsonFeed($products, $coord, string $currency): array
    {
        $storeName = $coord->name ?? 'Protéine Tunisie';

        return $products->map(function ($p) use ($currency, $storeName) {
            $price = $this->effectivePrice($p);
            return [
                'id'           => (string) $p->id,
                'title'        => $p->designation_fr,
                'description'  => strip_tags($p->description_fr ?? $p->designation_fr ?? ''),
                'availability' => $p->rupture ? 'out of stock' : 'in stock',
                'condition'    => 'new',
                'price'        => "{$price} {$currency}",
                'link'         => $this->productUrl($p),
                'image_link'   => $this->imageUrl($p->cover),
                'brand'        => $p->brand?->designation_fr ?? $storeName,
                'google_product_category' => '432',
                'custom_label_0' => $p->best_seller ? 'best_seller' : ($p->new_product ? 'new' : 'standard'),
            ];
        })->values()->all();
    }

    private function effectivePrice($product): string
    {
        $prix  = (float) ($product->prix  ?? 0);
        $promo = (float) ($product->promo ?? 0);
        $final = ($promo > 0 && $promo < $prix) ? $promo : $prix;
        return number_format($final, 3, '.', '');
    }

    private function productUrl($product): string
    {
        $subcatSlug = $product->sousCategorie?->slug;
        $slug       = $product->slug ?? $product->id;
        $path       = $subcatSlug ? "/{$subcatSlug}/{$slug}" : "/shop/{$slug}";
        return self::SITE_URL . $path;
    }

    private function imageUrl(?string $cover): string
    {
        if (!$cover) return '';
        if (str_starts_with($cover, 'http')) return $cover;
        return 'https://admin.protein.tn/storage/' . ltrim($cover, '/');
    }
}
