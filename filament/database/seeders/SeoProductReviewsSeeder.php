<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SeoProductReviewsSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Fetch specific target products by ID
        $targetIds = [550, 548, 546, 544, 543, 542, 541, 540];
        $products = Product::query()
            ->whereIn('id', $targetIds)
            ->get();

        if ($products->isEmpty()) {
            $this->command?->error('Aucun produit publié trouvé pour le seeding.');
            return;
        }

        // 2. Prepare high-quality Tunisian names (mix of male & female)
        $usersData = [
            ['name' => 'Firas Ben Amor',    'email' => 'firas.benamor@gmail.com'],
            ['name' => 'Amel Trabelsi',     'email' => 'amel.trabelsi@yahoo.com'],
            ['name' => 'Youssef Gharbi',    'email' => 'youssef.gharbi@gmail.com'],
            ['name' => 'Ons Bousnina',      'email' => 'ons.bousnina@outlook.com'],
            ['name' => 'Hamza Jlassi',      'email' => 'hamza.jlassi@gmail.com'],
            ['name' => 'Meriem Salem',      'email' => 'meriem.salem@gmail.com'],
            ['name' => 'Walid Chaabane',    'email' => 'walid.chaabane@hotmail.com'],
            ['name' => 'Sarra Kallel',      'email' => 'sarra.kallel@gmail.com'],
            ['name' => 'Sami Romdhane',     'email' => 'sami.romdhane@gmail.com'],
            ['name' => 'Asma Gharsalli',    'email' => 'asma.gharsalli@gmail.com'],
            ['name' => 'Anis Mejri',        'email' => 'anis.mejri@yahoo.fr'],
            ['name' => 'Nour Triki',        'email' => 'nour.triki@gmail.com'],
            ['name' => 'Marwen Hmidi',      'email' => 'marwen.hmidi@gmail.com'],
            ['name' => 'Dorra Hannachi',    'email' => 'dorra.hannachi@gmail.com'],
            ['name' => 'Riadh Dhouib',      'email' => 'riadh.dhouib@gmail.com'],
            ['name' => 'Hiba Zouari',       'email' => 'hiba.zouari@yahoo.com'],
            ['name' => 'Fedi Kammoun',      'email' => 'fedi.kammoun@gmail.com'],
            ['name' => 'Ines Chouchane',    'email' => 'ines.chouchane@gmail.com'],
            ['name' => 'Skander Ayari',     'email' => 'skander.ayari@gmail.com'],
            ['name' => 'Wafa Mhamdi',       'email' => 'wafa.mhamdi@gmail.com'],
            ['name' => 'Karim Baccar',      'email' => 'karim.baccar@gmail.com'],
            ['name' => 'Amira Jaziri',      'email' => 'amira.jaziri@gmail.com'],
            ['name' => 'Mohamed Dridi',     'email' => 'mohamed.dridi@gmail.com'],
            ['name' => 'Nada Ferjani',      'email' => 'nada.ferjani@gmail.com'],
            ['name' => 'Bilel Kooli',       'email' => 'bilel.kooli@gmail.com'],
            ['name' => 'Manel Siala',       'email' => 'manel.siala@gmail.com'],
            ['name' => 'Faten Ben Ali',     'email' => 'faten.benali@gmail.com'],
            ['name' => 'Aymen Saidi',       'email' => 'aymen.saidi@gmail.com'],
            ['name' => 'Rania Mezghani',    'email' => 'rania.mezghani@gmail.com'],
            ['name' => 'Zied Bouzouita',    'email' => 'zied.bouzouita@gmail.com'],
        ];

        $users = collect();
        foreach ($usersData as $u) {
            $user = User::query()->firstOrCreate(
                ['email' => $u['email']],
                [
                    'name'     => $u['name'],
                    'password' => Hash::make(Str::random(16)),
                ]
            );
            $users->push($user);
        }

        // 3. Define 30 highly optimized SEO reviews (Natural Tunisian French, Derja, and Arabic)
        $seoReviews = [
            // --- French / Derja Reviews ---
            [
                'stars'   => 5,
                'comment' => "D'après mon expérience de muscu, c'est vraiment la meilleure whey proteine en tunisie. Dilution impeccable, goût parfait et résultats visibles rapidement.",
            ],
            [
                'stars'   => 5,
                'comment' => "Excellent produit pour la prise de masse. Le serious mass tunisie est top et le prix est hyper compétitif par rapport au marché.",
            ],
            [
                'stars'   => 5,
                'comment' => "J'ai fait mon achat proteine tunisie sur ce site et je suis très satisfait. Produit 100% original, livraison express en 24h et packaging bien sécurisé.",
            ],
            [
                'stars'   => 5,
                'comment' => "Si vous cherchez de la whey protein tunisie pas cher avec une qualité certifiée, foncez les yeux fermés. Excellent service.",
            ],
            [
                'stars'   => 5,
                'comment' => "Pour moi c'est le meilleur site complement alimentaire tunisie. Service client hyper réactif, livraison rapide sur Sousse et produits toujours authentiques.",
            ],
            [
                'stars'   => 5,
                'comment' => "La creatine prix tunisie est vraiment la moins chère ici. Excellente qualité, la force a augmenté dès la première semaine d'utilisation.",
            ],
            [
                'stars'   => 5,
                'comment' => "Super efficace pour la récupération et l'endurance. Mon achat creatine tunisie sur protein.tn s'est déroulé parfaitement, je recommande.",
            ],
            [
                'stars'   => 5,
                'comment' => "Meilleur rapport qualité/prix proteine tunisie. Goût chocolat excellent et se mélange facilement dans le shaker.",
            ],
            [
                'stars'   => 5,
                'comment' => "Boutique proteine sousse tunisie très sérieuse. Commande passée le matin, reçue le lendemain à Tunis. Produit original avec code de vérification.",
            ],
            [
                'stars'   => 5,
                'comment' => "Un excellent complement alimentaire tunisie pour booster l'énergie et la congestion pendant le training. Je recommande vivement.",
            ],
            [
                'stars'   => 4,
                'comment' => "Très bon produit pour sécher et garder la masse musculaire. Le prix proteine tunisie est le plus bas du marché avec cette qualité.",
            ],
            [
                'stars'   => 5,
                'comment' => "Dilution facile sans grumeaux, goût vanille super bon. C'est mon troisième achat de proteine en tunisie sur ce site, toujours au top.",
            ],
            [
                'stars'   => 5,
                'comment' => "Excellent isolat de protéine. Pour la définition musculaire c'est parfait, sans lactose et le prix whey protein tunisie est très raisonnable.",
            ],
            [
                'stars'   => 5,
                'comment' => "La qualité Optimum Nutrition tunisie est indiscutable. Produit fiable, livraison rapide et service client très professionnel.",
            ],
            [
                'stars'   => 5,
                'comment' => "Très bon produit pour le pre-workout, pump incroyable et focus maximal pendant la séance de musculation.",
            ],
            [
                'stars'   => 4,
                'comment' => "BCAA bien dosé pour la récupération musculaire. Le prix complement alimentaire tunisie est très correct. Merci protein.tn !",
            ],

            // --- Arabic & Tunisian Darija Reviews ---
            [
                'stars'   => 5,
                'comment' => "هذا أفضل كرياتين في تونس جربته بدون منازع. يعطي قوة واضحة في التمارين الصعبة والذوبان متاعو ممتاز جداً.",
            ],
            [
                'stars'   => 5,
                'comment' => "أنصح بشدة شراء بروتين في تونس من هذا الموقع. المعاملة طيبة، السلعة أصلية ومضمونة والتوصيل سريع في 24 ساعة.",
            ],
            [
                'stars'   => 5,
                'comment' => "سعر البروتين في تونس غالي بزاف في المحلات الأخرى، لكن هنا لقيت سعر مناسب وجودة عالمية. شكراً بروتين تونس.",
            ],
            [
                'stars'   => 5,
                'comment' => "أحسن موقع لبيع مكملات غذائية في تونس. التوصيل سريع والمنتج أصلي 100% معاه كود التحقق من الشركة المصنعة.",
            ],
            [
                'stars'   => 5,
                'comment' => "أفضل موقع مكملات تونس. السلعة نظيفة برشا والتوصيل لباب الدار في وقت قياسي. ربي يوفقكم.",
            ],
            [
                'stars'   => 5,
                'comment' => "شريت كرياتين مونوهيدرات تونس من هنا والنتيجة ظهرت بعد أسبوعين. زادت قوتي العضلية والتحمل في صالة الجيم.",
            ],
            [
                'stars'   => 5,
                'comment' => "بروتين واي أصلي وممتاز لزيادة الكتلة العضلية بدون دهون. أرخص سعر بروتين في تونس مقارة بجودة ممتازة.",
            ],
            [
                'stars'   => 4,
                'comment' => "مكملات غذائية تونس أصلية ومعتمدة من وزارة الصحة. تعامل راقي وتوصيل سريع لجميع الولايات التونسية.",
            ],
            [
                'stars'   => 5,
                'comment' => "من أحسن المكملات الرياضية للضخامة العضلية. السيريوس ماس عطاني نتيجة ممتازة والذوبان متاعو ساهل وخفيف على المعدة.",
            ],
            [
                'stars'   => 5,
                'comment' => "واي بروتين معزول ذو جودة عالية جداً وخالي من السكر. التوصيل كان في وقتو والتعامل محترف وسريع.",
            ],
            [
                'stars'   => 5,
                'comment' => "أفضل متجر لبيع البروتين في سوسة وتونس كاملة. خيارات متنوعة وكل الماركات العالمية الأصلية متوفرة وبأسعار معقولة.",
            ],
            [
                'stars'   => 4,
                'comment' => "منتج رائع جداً ومذاق الفراولة لذيذ وخفيف. يعاون برشا في الاستشفاء العضلي بعد التمارين الشاقة في القاعة.",
            ],
            [
                'stars'   => 5,
                'comment' => "أقوى حارق دهون جربته للتخسيس. ساعدني في خسارة الوزن والوصول لنسبة دهون منخفضة بسرعة. مكملات تونس أصلية وثقة.",
            ],
            [
                'stars'   => 5,
                'comment' => "مجموعة فيتامينات ممتازة لزيادة النشاط والتركيز اليومي. شكراً لفريق العمل على الاحترافية والخدمة السريعة.",
            ],
        ];

        $totalReviews = 0;
        $REVIEWS_PER_PRODUCT = 30;
        $userCount  = $users->count();
        $reviewCount = count($seoReviews);

        // 4. For EVERY product, insert exactly 30 reviews
        foreach ($products as $product) {
            // Skip if this product already has enough reviews
            $existing = Review::where('product_id', $product->id)->count();
            if ($existing >= $REVIEWS_PER_PRODUCT) {
                $this->command?->line("  → Produit ID {$product->id} a déjà {$existing} avis — ignoré.");
                continue;
            }

            $reviewsToAdd = $REVIEWS_PER_PRODUCT - $existing;
            $reviewRecords = [];

            for ($i = 0; $i < $reviewsToAdd; $i++) {
                $user       = $users[$i % $userCount];
                $reviewData = $seoReviews[$i % $reviewCount];

                // Spread dates organically over the last 3 months
                $createdAt = Carbon::now()
                    ->subDays(random_int(1, 90))
                    ->subHours(random_int(0, 23))
                    ->subMinutes(random_int(0, 59));

                $reviewRecords[] = [
                    'product_id' => $product->id,
                    'user_id'    => $user->id,
                    'stars'      => $reviewData['stars'],
                    'comment'    => $reviewData['comment'],
                    'publier'    => 1,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ];
            }

            // Chunk inserts to avoid huge queries
            foreach (array_chunk($reviewRecords, 50) as $chunk) {
                Review::query()->insert($chunk);
            }

            $totalReviews += $reviewsToAdd;
            $this->command?->line("  ✓ Produit ID {$product->id} → {$reviewsToAdd} avis ajoutés.");
        }

        $productCount = $products->count();
        $this->command?->info("Seeding terminé : {$totalReviews} avis SEO insérés pour {$productCount} produits (30 avis/produit).");
    }
}
