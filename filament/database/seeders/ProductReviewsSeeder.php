<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ProductReviewsSeeder extends Seeder
{
    public function run(): void
    {
        $reviewsPerProduct = (int) env('REVIEWS_PER_PRODUCT', env('REVIEWS_SEED_COUNT', 100));
        if ($reviewsPerProduct < 1) {
            $reviewsPerProduct = 100;
        }

        $products = Product::query()
            ->where('publier', 1)
            ->select(['id'])
            ->get();

        if ($products->isEmpty()) {
            $this->command?->warn('Aucun produit publie trouve. Seeder annule.');
            return;
        }

        $reviewUsers = $this->prepareReviewUsers();
        if ($reviewUsers->isEmpty()) {
            $this->command?->warn('Aucun utilisateur disponible pour lier les avis.');
            return;
        }

        $comments = $this->derjaComments();
        $starsPool = [5, 5, 5, 5, 4, 4, 4, 3];

        $rows = [];
        foreach ($products as $product) {
            for ($i = 0; $i < $reviewsPerProduct; $i++) {
                $user = $reviewUsers->random();
                $stars = $starsPool[array_rand($starsPool)];
                $createdAt = Carbon::now()->subDays(random_int(0, 180))->subMinutes(random_int(0, 1440));

                $rows[] = [
                    'product_id' => $product->id,
                    'user_id' => $user->id,
                    'stars' => $stars,
                    'comment' => $comments[array_rand($comments)],
                    'publier' => 1,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ];
            }
        }

        // Disable model events to avoid massive admin notifications during seeding.
        Model::withoutEvents(function () use ($rows): void {
            foreach (array_chunk($rows, 1000) as $chunk) {
                Review::query()->insert($chunk);
            }
        });

        $totalInserted = count($rows);
        $this->command?->info("{$reviewsPerProduct} avis par produit inseres ({$totalInserted} total) avec succes.");
    }

    private function prepareReviewUsers()
    {
        $names = [
            'Ahmed Trabelsi', 'Aymen Ben Ali', 'Youssef Gharbi', 'Hamza Jlassi', 'Walid Chaabane',
            'Nidhal Saidi', 'Sami Ben Romdhane', 'Riadh Dhouib', 'Anis Mejri', 'Marwen Hmidi',
            'Sarra Kallel', 'Asma Gharsalli', 'Meriem Ben Salem', 'Rim Mzoughi', 'Ons Bousnina',
            'Hiba Zouari', 'Ines Chouchane', 'Nour Triki', 'Dorra Hannachi', 'Wafa Mhamdi',
            'Fedi Kammoun', 'Skander Ayari', 'Karim Baccar', 'Mohamed Dridi', 'Bilel Kooli',
            'Khouloud Ben Amor', 'Amira Jaziri', 'Nada Ferjani', 'Alaa Mzali', 'Manel Siala',
        ];

        $existing = User::query()
            ->select(['id'])
            ->inRandomOrder()
            ->limit(25)
            ->get();

        if ($existing->count() >= 15) {
            return $existing;
        }

        foreach ($names as $name) {
            $email = 'avis+' . Str::slug($name) . '@protein.tn';

            User::query()->firstOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'password' => Hash::make('password'),
                ]
            );
        }

        return User::query()
            ->where('email', 'like', 'avis+%@protein.tn')
            ->orWhereIn('id', $existing->pluck('id'))
            ->select(['id'])
            ->get();
    }

    private function derjaComments(): array
    {
        return [
            // PROTEIN / WHEY
            'Protein behi barcha w qualité واضحة.',
            'T3amou bnine barcha surtout chocolat.',
            'Whey hedhi من أحسن ما جربت.',
            'Tedhoub sahl w ma تعملش grumeaux.',
            'Khfifa 3al me3da.',
            'Mafamech nafkha.',
            'نتيجة باينة بعد أسابيع.',
            'Prise de masse ممتازة.',
            'Recovery walla أسرع.',
            'Produit original 100%.',
            'Texture mrigla.',
            'Vanilla طعمها هايل.',
            'Cookies cream ممتاز.',
            'Ma fihch sucre زائد.',
            'Protein top qualité.',
            'Nansah bih lel gym.',
            'Ideal ba3d training.',
            'Mrigel lel sèche.',
            'Bon dosage protéines.',
            'Satisfait barcha.',
    
            // CREATINE
            'Creatine أصلية.',
            'Force زادت بشكل واضح.',
            'Performance أفضل.',
            'Micronized top.',
            'Tذوب بسرعة.',
            'Prix behi.',
            'Sans goût مزعج.',
            'Très efficace.',
            'Pump أحسن.',
            'Nansah biha.',
            'ممتازة للناس الجدية.',
            'Resultat mezyen.',
            'Produit fiable.',
            'Packaging محترم.',
            'Service ممتاز.',
    
            // PRE WORKOUT
            'Energy قوية برشا.',
            'Focus عالي.',
            'Pump ممتاز.',
            'Leg day walla نار.',
            'Motivation طلعت.',
            'T3am behi.',
            'Sans crash.',
            'Dosage parfait.',
            'ما عملليش stress.',
            'Excellent preworkout.',
            'Session أقوى.',
            'يعطي boost واضح.',
            'Concentration top.',
            'ينفع للتمارين الثقيلة.',
            'Jawi behi.',
    
            // VITAMINS
            'Multivitamines ممتازين.',
            'نشاط أكثر.',
            'Fatigue نقصت.',
            'Santé générale أحسن.',
            'Omega 3 qualité.',
            'Magnesium فعال.',
            'Capsules سهلة.',
            'Complément محترم.',
            'Produit صحي.',
            'Bon rapport qualité.',
            'نحس روحي خير.',
            'يعاون في recovery.',
            'ممتاز للصحة.',
            'Service سريع.',
            'Worth it.',
    
            // PRICE
            'Soum behi مقارنة بالسوق.',
            'Prix ممتاز.',
            'Rapport qualité prix top.',
            'أرخص من برشا بلايص.',
            'سعر مناسب.',
            'Promo ممتازة.',
            'Bon deal.',
            'Soum m9boul.',
            'Prix compétitif.',
            'Value for money.',
            'معقول برشا.',
            'مناسب للجودة.',
            'تخفيضات باهية.',
            'Worth every dinar.',
            'سوم يفرح.',
    
            // DELIVERY
            'Livraison rapide.',
            'وصلت بسرعة.',
            'Service محترم.',
            'Packaging ممتاز.',
            'Commande منظمة.',
            'وصل سالم.',
            'Service client top.',
            'تعامل ممتاز.',
            'توصيل سريع.',
            'محترفين.',
            'Service مريقل.',
            'في الوقت.',
            'بدون مشاكل.',
            'Site ساهل.',
            'تجربة ممتازة.',
    
            // GENERAL DERJA
            'يعطيكم الصحة.',
            'ما شاء الله produit top.',
            'نعاود نشريه.',
            'أفضل موقع.',
            'خدمة باهية.',
            'منتج ممتاز.',
            'راضي برشا.',
            'مريقل.',
            'سلاعة أصلية.',
            'تستاهل 5 نجوم.',
            'Bravo.',
            'ننصح بيه.',
            'Top top.',
            'ممتاز للغاية.',
            'Produit premium.',
            'نظيف و واضح.',
            'فرق كبير.',
            'Excellent choix.',
            'ممتاز للريجيم.',
            'يعطي نتيجة.',
            'باهي برشا.',
            'أداء ممتاز.',
            'نتائج واضحة.',
            'مفيد.',
            'Original.',
            'ثقة.',
            'جودة عالية.',
            'مضمون.',
            'محترف.',
            'موقع ممتاز.',
    
            // MALE USERS
            'أنا نستعمل فيه كل يوم و مرتاح.',
            'زادني في القوة.',
            'ساعدني برشا.',
            'بدني تبدل.',
            'خدمت بيه programme كامل.',
            'ممتاز للرجال.',
            'باهي للmusculation.',
            'أحسن اختيار.',
            'ولا indispensable.',
            'نتيجة قوية.',
    
            // FEMALE USERS
            'خفيف و باهي.',
            'عاونّي في fitness.',
            'طعمو ممتاز.',
            'ساهل الاستعمال.',
            'ننصح بيه للبنات زادة.',
            'ما ثقلنيش.',
            'نتائج باهية.',
            'جودة محترمة.',
            'يعطي طاقة.',
            'Très satisfaite.',
    
            // ADVANCED REVIEWS
            'بعد شهر شفت فرق واضح.',
            'أفضل من برشا marques.',
            'Quality premium.',
            'حتى coach نصحني بيه.',
            'ثقة و أمان.',
            'ما ندمتش.',
            'الطلبية الثانية و ديما top.',
            'Site محترف.',
            'منتجات أصلية.',
            'Service كامل.',
            'Protein.tn ديما مستوى.',
            'أفضل تجربة شراء.',
            'جودة ثابتة.',
            'طعم و نتيجة.',
            'ينجم يعتمد عليه.',
            'مكمل غذائي ممتاز.',
            'حبيت التجربة.',
            'باهي حتى للمبتدئين.',
            'يعطي دفع قوي.',
            'Soum + qualité parfait.',
    
            // SHORT REVIEWS
            'Top.',
            'Excellent.',
            'Mrigel.',
            'Bahi.',
            'Original.',
            'ننصح.',
            'Perfect.',
            'Satisfied.',
            'Bravo.',
            'Premium.',
            'Great.',
            'Amazing.',
            'Très bon.',
            'ممتاز.',
            'هايل.',
            'يعجب.',
            'روعة.',
            'Best.',
            'Cool.',
            'Super.',
        ];
    }
}

