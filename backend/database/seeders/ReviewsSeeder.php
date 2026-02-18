<?php

declare(strict_types=1);

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Seed realistic reviews for products: 100 per product (80× 5-star, 20× 4-star).
 * Tunisian-style author names, short French comments, random created_at over last 90 days.
 * Uses bulk inserts and reviewer users so reviews are treated as real.
 */
class ReviewsSeeder extends Seeder
{
    private const REVIEWS_PER_PRODUCT = 100;
    private const FIVE_STAR_COUNT = 80;
    private const FOUR_STAR_COUNT = 20;
    private const BULK_CHUNK_SIZE = 500;
    private const DAYS_AGO = 90;

    /** Tunisian-style first + last names (realistic format) */
    private const FIRST_NAMES = [
        'Ahmed', 'Mohamed', 'Youssef', 'Omar', 'Karim', 'Ali', 'Hassan', 'Khalil',
        'Sami', 'Rami', 'Fares', 'Amine', 'Iheb', 'Malek', 'Anis', 'Wassim',
        'Fatma', 'Amira', 'Salma', 'Ines', 'Nour', 'Sana', 'Rania', 'Leila',
        'Souad', 'Mouna', 'Houda', 'Samar', 'Yosra', 'Rim', 'Sirine', 'Eya',
    ];

    private const LAST_NAMES = [
        'Ben Ali', 'Trabelsi', 'Ben Salem', 'Jlassi', 'Mansouri', 'Ben Ammar',
        'Chaabane', 'Gharbi', 'Bouaziz', 'Hamdi', 'Khelifi', 'Ben Youssef',
        'Mahmoud', 'Abid', 'Ferchichi', 'Oueslati', 'Ben Nasr', 'Zouari',
        'Ben Said', 'Haddad', 'Amamou', 'Ben Mrad', 'Gargouri', 'Ben Romdhane',
    ];

    /** Short positive French comments (ASCII-safe for any DB charset) */
    private const COMMENTS = [
        'Tres bon produit, conforme a la description.',
        'Livraison rapide, produit de qualite. Je recommande.',
        'Satisfait de mon achat, je racheterai.',
        'Efficace et bon gout. Parfait.',
        'Top qualite, rien a redire.',
        'Produit conforme, bien emballe. Merci.',
        'Excellent rapport qualite-prix.',
        'Tres content, livraison soignee.',
        'Je recommande ce vendeur et ce produit.',
        'Produit recu rapidement, nickel.',
        'Parfait pour mon objectif, content.',
        'Bon produit, bon service client.',
        'Conforme a mes attentes. Merci SOBITAS.',
        'RAS, tout est parfait.',
        'Produit serieux, je valide.',
        'Super produit, livraison au top.',
        'Contente de ma commande, rien a dire.',
        'Tres bon rapport qualite-prix, je recommande.',
        'Colis bien recu, produit conforme. Merci.',
        'Rapide et efficace, je reviendrai.',
        'Produit au top, emballage soigne.',
        'Tres satisfait, livraison dans les delais.',
        'Bon achat, je valide a 100%.',
        'Conforme, bien emballe, livraison rapide.',
        'Parfait, exactement ce que je voulais.',
        'Tres bon produit, je recommande SOBITAS.',
        'Livraison nickel, produit de qualite.',
        'Content de mon achat, rien a redire.',
        'Super service, produit conforme. Merci.',
        'Tres bon produit, je racheterai sans hesiter.',
        'Livraison soignee, produit serieux.',
        'Satisfait, bon produit et bon suivi.',
        'Tout est parfait, je recommande.',
        'Produit conforme, livraison rapide. Top.',
        'Tres bon achat, je valide.',
        'Rien a redire, tout est nickel.',
        'Parfait pour mon usage, content.',
        'Bon produit, livraison dans les temps.',
        'Je recommande, tres bon rapport qualite-prix.',
        'Produit recu en parfait etat. Merci.',
        'Tres content, conforme a la description.',
        'Super qualite, je reviendrai commander.',
    ];

    public function run(): void
    {
        $productIds = DB::table('products')->where('publier', 1)->pluck('id')->toArray();
        if (empty($productIds)) {
            $this->command->warn('No published products found. Skipping reviews seed.');
            return;
        }

        $reviewerUserIds = $this->ensureReviewerUsers();
        $now = Carbon::now();
        $comments = self::COMMENTS;
        $commentsCount = count($comments);

        $this->command->info('Seeding ' . self::REVIEWS_PER_PRODUCT . ' reviews per product for ' . count($productIds) . ' products.');

        $allRows = [];
        foreach ($productIds as $productId) {
            $rows = [];
            for ($i = 0; $i < self::FIVE_STAR_COUNT; $i++) {
                $rows[] = $this->reviewRow(5, $productId, $reviewerUserIds, $comments, $commentsCount, $now);
            }
            for ($i = 0; $i < self::FOUR_STAR_COUNT; $i++) {
                $rows[] = $this->reviewRow(4, $productId, $reviewerUserIds, $comments, $commentsCount, $now);
            }
            $allRows = array_merge($allRows, $rows);
        }

        foreach (array_chunk($allRows, self::BULK_CHUNK_SIZE) as $chunk) {
            DB::table('reviews')->insert($chunk);
        }

        $this->command->info('Inserted ' . count($allRows) . ' reviews.');
    }

    /**
     * Create reviewer users (Tunisian-style names). Reuse existing if already seeded.
     */
    private function ensureReviewerUsers(): array
    {
        $count = 200;
        $existing = DB::table('users')->where('email', 'like', 'review.seeder.%@sobitas.local')->pluck('id')->toArray();
        if (count($existing) >= $count) {
            return array_slice($existing, 0, $count);
        }

        $firstNames = self::FIRST_NAMES;
        $lastNames = self::LAST_NAMES;
        $nf = count($firstNames);
        $nl = count($lastNames);
        $password = Hash::make('password');
        $now = now()->toDateTimeString();
        $users = [];

        for ($i = count($existing) + 1; $i <= $count; $i++) {
            $name = trim($firstNames[array_rand($firstNames)] . ' ' . $lastNames[array_rand($lastNames)]);
            $users[] = [
                'name' => $name,
                'email' => 'review.seeder.' . $i . '@sobitas.local',
                'password' => $password,
                'email_verified_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('users')->insert($users);
        return array_slice(DB::table('users')->where('email', 'like', 'review.seeder.%@sobitas.local')->orderBy('id')->pluck('id')->toArray(), 0, 200);
    }

    private function reviewRow(
        int $stars,
        int $productId,
        array $reviewerUserIds,
        array $comments,
        int $commentsCount,
        Carbon $now
    ): array {
        $daysAgo = random_int(0, self::DAYS_AGO);
        $created = $now->copy()->subDays($daysAgo);
        $createdStr = $created->format('Y-m-d H:i:s');

        return [
            'user_id' => $reviewerUserIds[array_rand($reviewerUserIds)],
            'product_id' => $productId,
            'stars' => $stars,
            'comment' => $comments[random_int(0, $commentsCount - 1)],
            'publier' => 1,
            'created_at' => $createdStr,
            'updated_at' => $createdStr,
        ];
    }
}
