<?php

namespace App\Http\Controllers;


use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Client;
use App\Mail\SoumissionMail;

use App\Categ;
use App\Slide;
use App\Coordinate;
use App\Product;
use App\SousCategory;
use App\Brand;
use App\Article;
use App\Aroma;
use App\Tag;
use Carbon\Carbon;
use App\Annonce;
use App\Service;
use App\Contact;
use App\Newsletter;
use TCG\Voyager\Models\Page;
use  App\Services\SmsService;
use App\Faq;
use Illuminate\Support\Facades\Mail;
use App\Mail\OrderShipped;
use App\Commande;
use App\CommandeDetail;
use App\Redirection;
use App\Review;
use App\SeoPage;
use Auth;

class ApisController extends Controller
{



    public function  testSms($tel)
    {

       /*  $service = new SmsService();

        return ['resp' => $service->send_sms($tel, 'test')]; */
    }

    public function accueil(){
        
        $new_product =  Product::where('new_product', 1)->where('publier', 1)->select('id','slug','designation_fr','cover','new_product','best_seller','note', 'alt_cover' , 'description_cover' , 'prix','pack' , 'promo' , 'promo_expiration_date')->latest('created_at')->limit(8)->get();
        $packs = Product::where('pack', 1)->where('publier', 1)->select('id','slug','designation_fr','cover','new_product','best_seller','note', 'alt_cover' , 'description_cover' , 'prix','pack' , 'promo' , 'promo_expiration_date')->latest('created_at')->limit(4)->get();
        $last_articles = Article::where('publier', 1)->latest('created_at')->select('id', 'slug' , 'designation_fr' , 'cover' , 'created_at')->limit(4)->get();
        $ventes_flash = Product::whereNotNull('promo')->where('publier', 1)->whereDate('promo_expiration_date', '>', Carbon::now())->select('id','slug','designation_fr','cover','new_product','best_seller','note', 'alt_cover' , 'description_cover' , 'prix','pack' , 'promo' , 'promo_expiration_date')->get();
        $categories = Categ::select('id','cover', 'slug' , 'designation_fr')->with(['sous_categories' => function ($query) {
            $query->select('id','slug' , 'designation_fr' , 'categorie_id');
        }])->get();
        $best_sellers = Product::where('best_seller', 1)->where('publier', 1)->select('id','slug','designation_fr','cover','new_product','best_seller','note', 'alt_cover' , 'description_cover' , 'prix','pack' , 'promo' , 'promo_expiration_date')->latest('created_at')->limit(4)->get();
        return [ 'categories' =>  $categories,'last_articles'=> $last_articles , 'ventes_flash'=> $ventes_flash ,'new_product' => $new_product, 'packs' => $packs, 'best_sellers' => $best_sellers];

    }

    public function home(){
        
        $new_product =  Product::where('new_product', 1)->where('publier', 1)->select('id','slug','designation_fr','cover','new_product','best_seller','note', 'alt_cover' , 'description_cover' , 'prix','pack' , 'promo' , 'promo_expiration_date')->latest('created_at')->limit(8)->get();
        $packs = Product::where('pack', 1)->where('publier', 1)->select('id','slug','designation_fr','cover','new_product','best_seller','note', 'alt_cover' , 'description_cover' , 'prix','pack' , 'promo' , 'promo_expiration_date')->latest('created_at')->limit(4)->get();
        $last_articles = Article::where('publier', 1)->latest('created_at')->select('id', 'slug' , 'designation_fr' , 'cover' , 'created_at')->limit(4)->get();
        $ventes_flash = Product::whereNotNull('promo')->where('publier', 1)->whereDate('promo_expiration_date', '>', Carbon::now())->select('id','slug','designation_fr','cover','new_product','best_seller','note', 'alt_cover' , 'description_cover' , 'prix','pack' , 'promo' , 'promo_expiration_date')->get();
        
        $best_sellers = Product::where('best_seller', 1)->where('publier', 1)->select('id','slug','designation_fr','cover','new_product','best_seller','note', 'alt_cover' , 'description_cover' , 'prix','pack' , 'promo' , 'promo_expiration_date')->latest('created_at')->limit(4)->get();
        return [ 'last_articles'=> $last_articles , 'ventes_flash'=> $ventes_flash ,'new_product' => $new_product, 'packs' => $packs, 'best_sellers' => $best_sellers];

    }
    public function categories()
    {
        return  Categ::select('id','cover', 'slug' , 'designation_fr')->with(['sous_categories' => function ($query) {
            $query->select('id','slug' , 'designation_fr' , 'categorie_id');
        }])->get();
    }

    public function slides()
    {
        return Slide::all();
    }

    public function coordonnees()
    {
        return Coordinate::first();
    }

    public function latestProducts()
    {
        $new_product =  Product::where('new_product', 1)->where('publier', 1)->select('id','slug','designation_fr','cover','new_product','best_seller','note', 'alt_cover' , 'description_cover' , 'prix','pack' , 'promo' , 'promo_expiration_date')->latest('created_at')->limit(8)->get();
        $packs = Product::where('pack', 1)->where('publier', 1)->select('id','slug','designation_fr','cover','new_product','best_seller','note', 'alt_cover' , 'description_cover' , 'prix','pack' , 'promo' , 'promo_expiration_date')->latest('created_at')->limit(4)->get();
        $best_sellers = Product::where('best_seller', 1)->where('publier', 1)->select('id','slug','designation_fr','cover','new_product','best_seller','note', 'alt_cover' , 'description_cover' , 'prix','pack' , 'promo' , 'promo_expiration_date')->latest('created_at')->limit(4)->get();
        return ['new_product' => $new_product, 'packs' => $packs, 'best_sellers' => $best_sellers];
    }

    public function latestPacks()
    {
        return Product::where('pack', 1)->where('publier', 1)->select('id','slug','designation_fr','cover','new_product','best_seller','note', 'alt_cover' , 'description_cover' , 'prix','pack' , 'promo' , 'promo_expiration_date')->latest('created_at')->limit(4)->get();
    }

    public function productDetails($slug)
    {
        return Product::where('slug', $slug)->where('publier', 1)->with('sous_categorie.categorie')->with('tags')->with('aromes')
        ->with(['reviews.user' => function ($query) {
            $query->select('id','name' , 'avatar' );
        }])
       
        ->first();
    }

    public function allProducts()
    {
        $products =  Product::where('publier', 1)->with('aromes')->with('tags')->get();
        $brands = Brand::whereIn('id', $products->pluck('brand_id'))->get();
        $categories = Categ::all();
        return ['products' => $products, 'brands' => $brands, 'categories' => $categories];
    }


    public function productsByCategoryId($slug)
    {
        $category = Categ::where('slug' , $slug)->first();
        $sous_categories = SousCategory::where('categorie_id', $category->id)->get();
        $products = Product::where('publier', 1)->whereIn('sous_categorie_id', $sous_categories->pluck('id'))
            ->with('aromes')->with('tags')->get();
        $brands = Brand::whereIn('id', $products->pluck('brand_id'))->get();
        return ['category' => $category, 'sous_categories' => $sous_categories, 'products' => $products, 'brands' => $brands];
    }

    public function productsByCategoryId($slug)
    {
        // Try to find the category by slug
        $category = Categ::where('slug', $slug)->first();

        // If the category doesn't exist, return a 404 response
        if (!$category) {
            return response()->json(['error' => 'Category not found'], 404);
        }

        // Now that we know $category is not null, proceed with the rest of the logic
        $sous_categories = SousCategory::where('categorie_id', $category->id)->get();
        $products = Product::where('publier', 1)
            ->whereIn('sous_categorie_id', $sous_categories->pluck('id'))
            ->with('aromes')
            ->with('tags')
            ->get();

        $brands = Brand::whereIn('id', $products->pluck('brand_id'))->get();

        return [
            'category' => $category,
            'sous_categories' => $sous_categories,
            'products' => $products,
            'brands' => $brands
        ];
    }

    public function productsBySubCategoryId($slug)
    {
        $sous_category = SousCategory::where('slug' ,$slug)->first();
        $products = Product::where('sous_categorie_id', @$sous_category->id)->where('publier', 1)
            ->with('aromes')->with('tags')->get();
        $brands = Brand::whereIn('id', $products->pluck('brand_id'))->get();

        $sous_categories = SousCategory::where('categorie_id', @$sous_category->categorie_id)->get();

        return ['sous_category' => $sous_category, 'products' => $products, 'brands' => $brands, 'sous_categories' => $sous_categories];
    }

    public function searchProduct($text)
    {
        $products = Product::where('designation_fr', 'LIKE', '%' . $text . '%')->where('publier', 1)
            ->with('aromes')->with('tags')->get();
        $brands = Brand::whereIn('id', $products->pluck('brand_id'))->get();

        return ['products' => $products, 'brands' => $brands];
    }

    public function searchProductBySubCategoryText($slug, $text)
    {
        $sous_category = SousCategory::where('slug' ,$slug)->first();

        if($sous_category){
            $products = Product::where('sous_categorie_id', @$sous_category->id)->where('publier', 1)
            ->where('designation_fr', 'LIKE', '%' . $text . '%')
            ->with('aromes')->with('tags')
            ->get();
        }else{
            $products = Product::where('publier', 1)
            ->where('designation_fr', 'LIKE', '%' . $text . '%')
            ->with('aromes')->with('tags')
            ->get();
        }
       
        $brands = Brand::whereIn('id', $products->pluck('brand_id'))->get();

        return  ['products' => $products, 'brands' => $brands];
    }

    public function allArticles()
    {
        $articles = Article::where('publier', 1)->get();
        return $articles;
    }
    public function articleDetails($slug)
    {
        $article = Article::where('slug', $slug)->where('publier', 1)->first();
        return $article;
    }

    public function latestArticles()
    {
        $last_articles = Article::where('publier', 1)->latest('created_at')->select('id', 'slug' , 'designation_fr' , 'cover' , 'created_at')->limit(4)->get();
        return $last_articles;
    }

    public function allBrands()
    {
        $all_brands = Brand::select('id' , 'logo' , 'designation_fr' , 'alt_cover')->get();
        return $all_brands;
    }

    public function aromes()
    {
        $aromes = Aroma::all();
        return $aromes;
    }
    public function tags()
    {
        $tags = Tag::all();
        return $tags;
    }
    public function packs()
    {
        return Product::where('pack', 1)->where('publier', 1)->latest('created_at')->select('id','slug','designation_fr','cover','new_product','best_seller','note', 'alt_cover' , 'description_cover' , 'prix','pack' , 'promo' , 'promo_expiration_date')->get();
    }


    public function flash()
    {
        return  Product::whereNotNull('promo')->where('publier', 1)->whereDate('promo_expiration_date', '>', Carbon::now())->select('id','slug','designation_fr','cover','new_product','best_seller','note', 'alt_cover' , 'description_cover' , 'prix','pack' , 'promo' , 'promo_expiration_date')->get();
    }

    public function media()
    {

        return Annonce::first();
    }

    public function newsLetter(Request $request)
    {
        $exist = Newsletter::where('email', $request->input('email'))->get();
        if ($exist->count() > 0) {
            return  response()->json(['error' => 'Vous êtes déjà inscrit!'], 406);
        } else {
            $n = new Newsletter();
            $n->email = $request->input('email');
            $n->save();
            return ['success' => 'Merci de vous inscrire!'];
        }
    }

    public function sendContact(Request $request)
    {
        $new_contact = new Contact();
        $new_contact->name = $request->name;
        $new_contact->email = $request->email;
        $new_contact->message = $request->message;
        $new_contact->save();
        return ['success' => 'Votre message envoyer avec succès'];
    }

    public function services()
    {
        $services = Service::all();
        return $services;
    }
    public function faqs()
    {
        $data = Faq::all();
        return $data;
    }
    public function pages()
    {
        $pages = Page::select('id' , 'title')->get();
        return $pages;
    }
    public function getPageBySlug($slug)
    {
        $pages = Page::where('slug', $slug)->first();
        return $pages;
    }


    public function send_email(Request $request)
    {
        $commande = Commande::find($request->commande_id);

        $details = CommandeDetail::where('commande_id' , $request->commande_id)->get();
        // Ship the order...


        $data = [
            'titre' => 'Nouvelle commande',
            'commande' => $commande,
            'details'=>$details
        ];

        Mail::to('wissemdebech@gmail.com')->send(new SoumissionMail($data));



    }

    public function similar_products($sous_categorie_id)
    {
        $sous_category = SousCategory::find($sous_categorie_id);
        $products = Product::where('sous_categorie_id', $sous_category->id)->where('publier', 1)->where('rupture', 1)->select('slug','designation_fr','cover','new_product','best_seller','note', 'alt_cover' , 'description_cover' , 'prix','pack' , 'promo' , 'promo_expiration_date')->limit(4)->get();



     
        if ($sous_category) {
            $categ_id = $sous_category->categorie_id;

            if ($products->count() < 4) {
                $products2 = Product::where('publier', 1)->where('rupture', 1)->limit(4 - $products->count())
                    ->whereHas('sous_categorie', function ($query) use ($categ_id) {
                        $query->where('categorie_id', $categ_id);
                    })->get();


                $products = $products->merge($products2);
            }
        }


        return ['products' => $products];
    }

    public function redirections()
    {

        return Redirection::all();
    }

    public function add_review(Request $request){

        $review = new Review();
        $review->user_id = Auth::user()->id;
        $review->product_id = @$request->product_id;
        $review->stars = @$request->stars;
        $review->comment = @$request->comment;
        if(!$review->stars){
            $review->stars = 5;
        }
        if($review->stars <4){
            $review->publier = 0;
        }else{
            $review->publier = 1;

        }
        $review->save();
        return $review;

    }
    public function seoPage($name){
        $seo_page = SeoPage::where('page' , $name)->first();
        return $seo_page;
    }

   
}
