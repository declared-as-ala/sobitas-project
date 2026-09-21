<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Services\Seo\LegacyProductPage;
use Illuminate\Console\Command;

/**
 * Seed a product FAQ onto the hand-built products whose page body sits under the 250-word content
 * bar (the "BELOW THE GATE" list seo:products-legacy-reindex prints).
 *
 * ADDITIVE ONLY, by design: the owner's `description_fr` prose is never touched. The FAQ column is
 * written only where it is currently EMPTY, so a human-authored FAQ can never be clobbered, and a
 * second run is a no-op. Each save goes through the model, so ProductSeoObserver revalidates the
 * page, refreshes the sitemap and pings IndexNow — the same machinery every other content write
 * uses.
 *
 * The copy below is deliberately conservative: usage timing and audience per product TYPE, the
 * storefront's site-wide true claims (livraison 24-72h partout en Tunisie, paiement à la livraison,
 * produits 100% authentiques), and NO invented numbers — no doses, no serving counts, no prices
 * that are not already in the product's own name. Anything more specific belongs to the owner or
 * the manufacturer label.
 */
class SeoProductsSeedCopy extends Command
{
    protected $signature = 'seo:products-seed-copy
                            {--apply : Write the FAQs (report only without it)}';

    protected $description = 'Seed an additive product FAQ on the thin hand-built products (empty faq column only); enrichment worklist companion of seo:products-legacy-reindex';

    private const DELIVERY_Q = 'Quels sont les délais et modes de livraison en Tunisie ?';

    private const DELIVERY_A = 'Protein.tn livre partout en Tunisie, généralement sous 24 à 72 h ouvrées selon la région (Grand Tunis, Sousse, Sfax et toutes les autres villes). Le paiement à la livraison est disponible, et vous pouvez aussi retirer votre commande directement au magasin à Sousse.';

    private const AUTH_Q = 'Le produit vendu sur Protein.tn est-il authentique ?';

    private const AUTH_A = 'Oui. Protein.tn ne vend que des produits 100 % authentiques, issus de circuits d’importation officiels. Chaque article est vérifiable par son code-barres et son étiquette d’origine, et notre équipe reste disponible pour toute vérification avant ou après votre achat.';

    /** @var array<string, array<int, array{q: string, a: string}>> */
    private const FAQS = [
        'lipo-6-black-ultra-concentrate-60caps' => [
            ['q' => 'À qui s’adresse Lipo 6 Black Ultra Concentrate de Nutrex ?', 'a' => 'C’est un thermogénique concentré destiné aux adultes en phase de sèche ou de perte de poids qui veulent soutenir leur énergie et leur concentration pendant un régime hypocalorique. Il s’adresse à des utilisateurs déjà à l’aise avec les brûleurs contenant des stimulants.'],
            ['q' => 'Comment utiliser ce brûleur de graisse ?', 'a' => 'Respectez strictement le mode d’emploi indiqué par Nutrex sur l’étiquette : commencez par la dose la plus faible pour évaluer votre tolérance, prenez-le plutôt en première partie de journée, et ne dépassez jamais la portion recommandée. Un brûleur accompagne un déficit calorique et un entraînement régulier, il ne les remplace pas.'],
            ['q' => 'Y a-t-il des précautions particulières ?', 'a' => 'Comme tout thermogénique à base de stimulants, il est déconseillé aux personnes sensibles à la caféine, aux femmes enceintes ou allaitantes, aux mineurs et aux personnes suivant un traitement médical sans avis de leur médecin. Évitez de le prendre en fin de journée pour préserver votre sommeil.'],
            ['q' => self::DELIVERY_Q, 'a' => self::DELIVERY_A],
            ['q' => self::AUTH_Q, 'a' => self::AUTH_A],
        ],
        'protein-shaker-450ml-sport-life' => [
            ['q' => 'À quoi sert ce shaker Sport Life 450 ml ?', 'a' => 'C’est l’accessoire de base de toute routine de nutrition sportive : il permet de mélanger rapidement et sans grumeaux votre whey, votre créatine, vos BCAA ou votre pré-workout, à la salle comme au bureau. Sa contenance de 450 ml convient à la grande majorité des portions habituelles.'],
            ['q' => 'Le shaker est-il étanche et facile à transporter ?', 'a' => 'Oui, son couvercle à visser avec bouchon rabattable est conçu pour éviter les fuites dans un sac de sport. Son format compact de 450 ml se glisse facilement dans un sac et se tient bien en main pendant l’entraînement.'],
            ['q' => 'Comment entretenir mon shaker ?', 'a' => 'Rincez-le à l’eau tiède immédiatement après usage pour éviter les odeurs, lavez-le régulièrement à l’eau savonneuse, et laissez-le sécher ouvert. Évitez de laisser une boisson protéinée préparée plusieurs heures à température ambiante.'],
            ['q' => self::DELIVERY_Q, 'a' => self::DELIVERY_A],
            ['q' => 'Puis-je l’acheter avec ma protéine sur Protein.tn ?', 'a' => 'Bien sûr : ajoutez-le simplement à votre panier avec votre whey, votre gainer ou votre créatine, et le tout arrive dans la même livraison partout en Tunisie, avec paiement à la livraison si vous le souhaitez.'],
        ],
        'psychotic-pre-workout' => [
            ['q' => 'À qui s’adresse Psychotic d’Insane Labz ?', 'a' => 'Psychotic est un pré-workout réputé pour son intensité, pensé pour les pratiquants expérimentés qui recherchent un niveau élevé d’énergie, de focus et d’endurance sur leurs séances les plus exigeantes. Ce n’est pas le produit conseillé pour découvrir les pré-workouts.'],
            ['q' => 'Quand et comment le prendre ?', 'a' => 'Prenez-le environ 20 à 30 minutes avant l’entraînement, en respectant la portion indiquée par Insane Labz sur l’étiquette. Commencez par une demi-portion pour évaluer votre tolérance aux stimulants, et évitez toute prise en fin de journée.'],
            ['q' => 'Quelles précautions faut-il connaître ?', 'a' => 'Sa teneur en stimulants le rend déconseillé aux personnes sensibles à la caféine, aux mineurs, aux femmes enceintes et aux personnes souffrant de troubles cardiovasculaires. Ne le combinez pas avec d’autres sources importantes de caféine le même jour.'],
            ['q' => self::DELIVERY_Q, 'a' => self::DELIVERY_A],
            ['q' => self::AUTH_Q, 'a' => self::AUTH_A],
        ],
        'ring-de-boxe-professionnel' => [
            ['q' => 'À qui est destiné ce ring de boxe professionnel ?', 'a' => 'Aux salles de boxe, clubs de sports de combat, salles de sport et structures d’entraînement qui veulent un équipement central durable pour la boxe, le kickboxing ou le MMA. Sa structure stable est prévue pour un usage intensif et régulier.'],
            ['q' => 'La livraison et l’installation d’un équipement aussi volumineux sont-elles possibles ?', 'a' => 'Oui. Pour un équipement de ce gabarit, notre équipe organise avec vous les modalités de transport et de mise en place : contactez Protein.tn après votre commande (ou avant, pour toute question) afin de planifier une livraison adaptée à votre local, partout en Tunisie.'],
            ['q' => 'Quel entretien prévoir ?', 'a' => 'Un contrôle régulier du serrage de la structure, de la tension des cordes et de l’état des protections d’angle suffit à maintenir le ring en condition. Nettoyez la surface avec des produits doux pour préserver le revêtement.'],
            ['q' => 'Puis-je équiper entièrement ma salle chez Protein.tn ?', 'a' => 'Oui : en plus du ring, Protein.tn propose du matériel de musculation, des accessoires de sports de combat et des équipements cardio. Regroupez vos besoins dans une même commande et notre équipe vous accompagne sur la logistique.'],
        ],
        'pump-extreme-pre-workout-challenger-nutrition-30-servings' => [
            ['q' => 'Qu’apporte Pump Extreme de Challenger Nutrition à l’entraînement ?', 'a' => 'C’est un pré-workout au format 30 portions conçu pour soutenir l’énergie, la congestion musculaire et la concentration pendant la séance. Il s’adresse aux pratiquants de musculation et de fitness qui veulent des séances plus denses et mieux senties.'],
            ['q' => 'Comment l’utiliser correctement ?', 'a' => 'Mélangez la portion indiquée sur l’étiquette dans de l’eau et buvez-la environ 20 à 30 minutes avant l’entraînement. Testez d’abord votre tolérance avec une portion réduite, et réservez-le aux jours d’entraînement.'],
            ['q' => 'Convient-il aux séances du soir ?', 'a' => 'Comme la plupart des pré-workouts contenant des stimulants, il est préférable de l’utiliser en journée. Pour une séance tardive, réduisez la portion ou tournez-vous vers un produit axé congestion sans stimulants.'],
            ['q' => self::DELIVERY_Q, 'a' => self::DELIVERY_A],
            ['q' => self::AUTH_Q, 'a' => self::AUTH_A],
        ],
        'ashwagandha-60-gelules-biotech-usa' => [
            ['q' => 'Quels sont les usages traditionnels de l’ashwagandha BioTech USA ?', 'a' => 'L’ashwagandha est une plante adaptogène de la tradition ayurvédique, utilisée pour aider l’organisme à mieux gérer les périodes de stress et pour accompagner l’énergie et l’équilibre général. Ce format 60 gélules de BioTech USA en fait une cure simple à suivre.'],
            ['q' => 'Comment prendre ces gélules ?', 'a' => 'Suivez la posologie indiquée par BioTech USA sur l’étiquette, de préférence au cours d’un repas et à heure régulière. Les plantes adaptogènes s’apprécient sur la durée : une prise régulière sur plusieurs semaines est plus pertinente qu’une prise ponctuelle.'],
            ['q' => 'À qui s’adresse ce complément ?', 'a' => 'Aux adultes actifs, sportifs ou non, qui traversent des périodes chargées et veulent soutenir leur équilibre. Les femmes enceintes ou allaitantes et les personnes sous traitement doivent demander l’avis d’un professionnel de santé avant toute cure.'],
            ['q' => self::DELIVERY_Q, 'a' => self::DELIVERY_A],
            ['q' => self::AUTH_Q, 'a' => self::AUTH_A],
        ],
        'iso-hydro-zero-1800g-william-bonac' => [
            ['q' => 'Qu’est-ce qui distingue ISO Hydro Zero de William Bonac ?', 'a' => 'C’est une whey isolate conçue pour offrir une protéine à absorption rapide avec un profil épuré — l’intérêt classique d’une isolate par rapport à une whey concentrée. Le format généreux de 1 800 g en fait un choix économique pour une utilisation quotidienne.'],
            ['q' => 'Quand consommer cette whey isolate ?', 'a' => 'Le moment le plus courant est autour de l’entraînement, notamment juste après la séance pour accompagner la récupération musculaire. Elle peut aussi compléter l’apport en protéines de la journée, en collation ou au petit-déjeuner, selon vos besoins totaux.'],
            ['q' => 'Une isolate convient-elle aux personnes sensibles au lactose ?', 'a' => 'Les isolates sont généralement mieux tolérées que les whey concentrées car leur filtration réduit fortement la teneur en lactose. En cas d’intolérance avérée, vérifiez l’étiquette du fabricant et testez une petite portion d’abord.'],
            ['q' => self::DELIVERY_Q, 'a' => self::DELIVERY_A],
            ['q' => self::AUTH_Q, 'a' => self::AUTH_A],
        ],
        'whey-testo-mr-x-1-8-kg-v-shapes' => [
            ['q' => 'Qu’est-ce que Whey Testo MR.X de V-Shapes ?', 'a' => 'C’est une formule 2-en-1 qui associe une protéine whey à un complexe « testo booster » à base d’ingrédients traditionnellement utilisés chez les sportifs. Elle s’adresse aux pratiquants qui veulent regrouper leur shake protéiné et leur soutien performance en un seul produit.'],
            ['q' => 'Comment l’intégrer à ma routine ?', 'a' => 'Utilisez-la comme une whey classique — typiquement autour de l’entraînement ou en collation — en suivant la portion indiquée par V-Shapes sur l’étiquette. Le format 1,8 kg couvre plusieurs semaines d’utilisation régulière.'],
            ['q' => 'À qui ce produit est-il destiné ?', 'a' => 'Aux hommes adultes pratiquant la musculation qui cherchent un shake complet orienté performance. Il n’est pas destiné aux mineurs ; en cas de traitement médical ou de doute, demandez conseil à un professionnel de santé.'],
            ['q' => self::DELIVERY_Q, 'a' => self::DELIVERY_A],
            ['q' => self::AUTH_Q, 'a' => self::AUTH_A],
        ],
        'gold-l-carnitine-3000-500ml' => [
            ['q' => 'Qu’est-ce que Gold L-Carnitine 3000 de Kevin Levrone ?', 'a' => 'C’est une L-carnitine liquide concentrée, un format apprécié pour sa praticité et son assimilation rapide. La L-carnitine est un classique des routines de définition musculaire et des sports d’endurance.'],
            ['q' => 'Quand prendre la L-carnitine liquide ?', 'a' => 'Le moment le plus courant est avant l’effort, notamment avant un entraînement cardio ou une séance orientée dépense énergétique. Respectez la portion indiquée sur l’étiquette du fabricant et intégrez-la à une alimentation équilibrée.'],
            ['q' => 'À qui s’adresse ce produit ?', 'a' => 'Aux sportifs adultes en phase de sèche ou de préparation, aux pratiquants de fitness et d’endurance qui veulent accompagner leur travail cardio. Comme tout complément, il vient en soutien d’un entraînement et d’une alimentation sérieux.'],
            ['q' => self::DELIVERY_Q, 'a' => self::DELIVERY_A],
            ['q' => self::AUTH_Q, 'a' => self::AUTH_A],
        ],
        'creatine-monohydrate-150gr-real-pharm' => [
            ['q' => 'Pourquoi choisir la créatine monohydrate Real Pharm 150 g ?', 'a' => 'La créatine monohydrate est la forme la plus étudiée et la plus éprouvée de créatine, reconnue pour soutenir la force et la performance sur les efforts courts et intenses. Ce format 150 g est idéal pour découvrir la créatine ou pour dépanner entre deux gros pots.'],
            ['q' => 'Comment utiliser la créatine monohydrate ?', 'a' => 'L’usage le plus répandu est une petite portion quotidienne régulière, indiquée sur l’étiquette du fabricant, mélangée à de l’eau ou à votre shake, les jours d’entraînement comme de repos. La régularité sur plusieurs semaines est la clé, bien plus que le moment exact de la prise.'],
            ['q' => 'La créatine convient-elle à tous les sportifs ?', 'a' => 'Elle est utilisée aussi bien en musculation qu’en sports collectifs ou de combat par des adultes en bonne santé. Buvez suffisamment d’eau au quotidien ; en cas de condition médicale particulière, demandez l’avis d’un professionnel de santé.'],
            ['q' => self::DELIVERY_Q, 'a' => self::DELIVERY_A],
            ['q' => self::AUTH_Q, 'a' => self::AUTH_A],
        ],
        'multi-vita-120-caps-scenit-nutrition' => [
            ['q' => 'À quoi sert Multi Vita+ de Scenit Nutrition ?', 'a' => 'C’est un complexe multivitamines et minéraux pensé pour compléter l’alimentation quand le rythme quotidien — entraînements, travail, stress — rend difficile un apport parfait par les seuls repas. Le format 120 gélules couvre une longue période d’utilisation.'],
            ['q' => 'Comment et quand le prendre ?', 'a' => 'Prenez la portion indiquée sur l’étiquette au cours d’un repas, idéalement à heure régulière. Un multivitamines s’utilise en continu ou en cures, en complément d’une alimentation variée qu’il ne remplace pas.'],
            ['q' => 'Est-ce utile pour les sportifs ?', 'a' => 'Oui : l’entraînement régulier augmente les besoins généraux de l’organisme, et un complexe complet aide à sécuriser les apports de base qui soutiennent l’énergie, la récupération et l’immunité au fil des semaines.'],
            ['q' => self::DELIVERY_Q, 'a' => self::DELIVERY_A],
            ['q' => self::AUTH_Q, 'a' => self::AUTH_A],
        ],
        'ashwagandha-100-natural-90tabs' => [
            ['q' => 'Qu’est-ce que l’ashwagandha et pourquoi est-elle si populaire ?', 'a' => 'L’ashwagandha est une plante adaptogène majeure de la tradition ayurvédique, utilisée depuis des siècles pour aider l’organisme à faire face au stress et pour accompagner la vitalité générale. Ce format 90 comprimés 100 % naturel permet une cure complète.'],
            ['q' => 'Comment suivre une cure d’ashwagandha ?', 'a' => 'Prenez la portion quotidienne indiquée sur l’étiquette, de préférence au cours d’un repas et à heure fixe. Les effets des adaptogènes s’installent avec la régularité : envisagez une cure de plusieurs semaines plutôt qu’une prise occasionnelle.'],
            ['q' => 'Qui devrait éviter l’ashwagandha ?', 'a' => 'Les femmes enceintes ou allaitantes, les mineurs et les personnes suivant un traitement (notamment thyroïdien ou sédatif) doivent demander l’avis d’un professionnel de santé avant d’en consommer.'],
            ['q' => self::DELIVERY_Q, 'a' => self::DELIVERY_A],
            ['q' => self::AUTH_Q, 'a' => self::AUTH_A],
        ],
        'magnesium-vitamin-b6-90-tablets' => [
            ['q' => 'Pourquoi associer magnésium et vitamine B6 ?', 'a' => 'Le magnésium contribue au fonctionnement normal du système nerveux et musculaire et à la réduction de la fatigue, et la vitamine B6 favorise son utilisation par l’organisme. C’est l’association classique des périodes de charge — entraînements intenses, stress, sommeil perturbé.'],
            ['q' => 'Comment prendre ces comprimés ?', 'a' => 'Suivez la portion quotidienne indiquée sur l’étiquette, au cours d’un repas. Beaucoup d’utilisateurs préfèrent la prise du soir, le magnésium étant traditionnellement associé à la détente et à la qualité de la récupération nocturne.'],
            ['q' => 'Ce complément est-il adapté aux sportifs sujets aux crampes ?', 'a' => 'Le magnésium est le réflexe classique des sportifs sujets aux crampes et à la fatigue musculaire, car l’effort et la transpiration augmentent les besoins. Ce format 90 comprimés couvre une cure complète.'],
            ['q' => self::DELIVERY_Q, 'a' => self::DELIVERY_A],
            ['q' => self::AUTH_Q, 'a' => self::AUTH_A],
        ],
        'hack-squat-jx-fitness' => [
            ['q' => 'Quels muscles travaille la Hack Squat JX Fitness ?', 'a' => 'La hack squat cible principalement les quadriceps, les fessiers et les ischio-jambiers, avec une trajectoire guidée qui sécurise le mouvement et permet de charger le bas du corps sans solliciter l’équilibre comme un squat libre.'],
            ['q' => 'À qui s’adresse cette machine ?', 'a' => 'Aux salles de sport, aux coachs et aux particuliers équipant un home-gym sérieux. Sa structure guidée la rend exploitable aussi bien par des débutants encadrés que par des pratiquants avancés cherchant un travail lourd des jambes en sécurité.'],
            ['q' => 'Comment se passent la livraison et l’installation en Tunisie ?', 'a' => 'Pour un équipement de ce gabarit, notre équipe organise avec vous le transport et la mise en place : contactez Protein.tn après votre commande pour planifier une livraison adaptée à votre local, partout en Tunisie.'],
            ['q' => 'Quel entretien prévoir ?', 'a' => 'Un contrôle périodique du serrage de la visserie, un nettoyage des rails de guidage et une vérification des butées de sécurité suffisent à maintenir la machine en parfait état pour un usage intensif.'],
        ],
    ];

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');

        $products = Product::query()
            ->whereIn('slug', array_keys(self::FAQS))
            ->get();

        $seeded = 0;
        $skipped = 0;

        foreach (self::FAQS as $slug => $faq) {
            /** @var Product|null $product */
            $product = $products->firstWhere('slug', $slug);
            if (! $product) {
                $this->warn(sprintf('  MISSING   %s — no product with this slug', $slug));
                continue;
            }

            // Never clobber: any existing valid pair means a human (or an earlier run) owns it.
            $existing = is_array($product->faq)
                ? array_filter($product->faq, fn ($e) => is_array($e)
                    && trim((string) ($e['q'] ?? $e['question'] ?? '')) !== ''
                    && trim((string) ($e['a'] ?? $e['answer'] ?? '')) !== '')
                : [];
            if ($existing !== []) {
                $skipped++;
                $this->line(sprintf('  KEPT      %s — already has %d FAQ pair(s)', $slug, count($existing)));
                continue;
            }

            $before = LegacyProductPage::bodyWords(
                $product->description_fr, $product->description_cover, $product->nutrition_values, $product->faq
            );
            $after = LegacyProductPage::bodyWords(
                $product->description_fr, $product->description_cover, $product->nutrition_values, $faq
            );

            if ($apply) {
                $product->faq = $faq;
                $product->save();
                $seeded++;
                $this->info(sprintf('  SEEDED    %-58s %4d w -> %4d w  (%d Q/A)', $slug, $before, $after, count($faq)));
            } else {
                $this->line(sprintf('  WOULD SEED %-57s %4d w -> %4d w  (%d Q/A)', $slug, $before, $after, count($faq)));
            }
        }

        $this->line('');
        $this->info($apply
            ? sprintf('Seeded %d product(s), kept %d untouched. Revalidation/sitemap/IndexNow dispatched by ProductSeoObserver.', $seeded, $skipped)
            : 'REPORT ONLY. Re-run with --apply to write the FAQs above.');

        return self::SUCCESS;
    }
}
