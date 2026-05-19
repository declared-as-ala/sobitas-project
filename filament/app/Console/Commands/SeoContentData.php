<?php

namespace App\Console\Commands;

use Illuminate\Support\Str;

class SeoContentData
{
    // ============================================
    // PARENT CATEGORIES SEO DATA
    // ============================================
    
    public static function getCategoriesData(): array
    {
        return [
            'complements-alimentaires' => [
                'name' => 'Compléments Alimentaires',
                'meta_title' => 'Compléments Alimentaires Tunisie | Whey, Créatine & Vitamines',
                'meta_description' => 'Découvrez notre large gamme de compléments alimentaires en Tunisie : whey protein, créatine, BCAA, vitamines et minéraux. Livraison rapide dans tout le pays.',
                'h1_title' => 'Compléments Alimentaires en Tunisie',
                'primary_keyword' => 'compléments alimentaires tunisie',
                'secondary_keywords' => [
                    'compléments alimentaires musculation tunisie',
                    'supplements alimentaires tunisie',
                    'vitamines sport tunisie',
                ],
                'short_intro' => '<p>Votre source de <strong>compléments alimentaires en Tunisie</strong>. Nous proposons les meilleures marques de supplements sportifs : Optimum Nutrition, Biotech USA, Dymatize, et bien plus.</p><p>Tous nos produits sont <strong>authentiques et certifiés</strong>, livrés rapidement dans tout le pays.</p>',
                'long_bottom_content' => '<h2>Pourquoi choisir nos compléments alimentaires ?</h2><p>Les compléments alimentaires sont devenus essentiels pour les sportifs souhaitant optimiser leurs performances. Chez Protéine Tunisie, nous sélectionnons uniquement des produits de qualité professionnelle.</p><h3>Notre sélection</h3><ul><li><strong>Protéines :</strong> Whey, caséine, isolat</li><li><strong>Créatine :</strong> Monohydrate, HCL</li><li><strong>Acides aminés :</strong> BCAA, Glutamine, EAA</li><li><strong>Vitamines :</strong> Multivitamines, zinc, magnesium</li></ul><h2>Livraison en Tunisie</h2><p>Nous livrons <strong>gratuitement dès 200 DT</strong> dans tout le pays : Tunis, Sousse, Sfax, Bizerte, etc. Livraison en 24-72h.</p>',
            ],
            'perte-de-poids' => [
                'name' => 'Perte de Poids',
                'meta_title' => 'Compléments Perte de Poids Tunisie | Fat Burner & L-Carnitine',
                'meta_description' => 'Perdez du poids efficacement avec nos brûleurs de graisse et compléments minceur en Tunisie. Fat burners, L-Carnitine, CLA et plus. Livraison rapide.',
                'h1_title' => 'Compléments pour la Perte de Poids en Tunisie',
                'primary_keyword' => 'perte de poids tunisie',
                'secondary_keywords' => [
                    'compléments minceur tunisie',
                    'fat burner tunisie',
                    'bruleur de graisse tunisie',
                ],
                'short_intro' => '<p>Nos <strong>compléments pour la perte de poids</strong> vous aident à atteindre vos objectifs. Fat burners, L-Carnitine, CLA et plus pour une sèche efficace.</p>',
                'long_bottom_content' => '<h2>Les meilleurs compléments pour maigrir</h2><p>La perte de poids nécessite une approche complète : régime alimentaire, exercice physique, et supplements adaptés. Nos produits vous accompagnent dans votre parcours.</p><h3>Nos brûleurs de graisse</h3><ul><li><strong>Fat Burners :</strong> Thermogéniques pour accélérer le métabolisme</li><li><strong>L-Carnitine :</strong> Transporte les graisses vers les muscles</li><li><strong>CLA :</strong> Aide à réduire la masse grasse</li></ul>',
            ],
            'prise-de-masse' => [
                'name' => 'Prise de Masse',
                'meta_title' => 'Prise de Masse Musculation Tunisie | Gainer & Mass Gainer',
                'meta_description' => 'Prenez du muscle rapidement avec nos gainers et suppléments de prise de masse en Tunisie. Mass gainers haute calorie, protéines et plus.',
                'h1_title' => 'Prise de Masse en Tunisie',
                'primary_keyword' => 'prise de masse tunisie',
                'secondary_keywords' => [
                    'gainer tunisie',
                    'mass gainer tunisie',
                    'compléments prise de masse tunisie',
                ],
                'short_intro' => '<p>Nos <strong>gainer pour prise de masse</strong> vous aident à atteindre vos objectifs. Haute calorie, riche en protéines pour construire du muscle rapidement.</p>',
                'long_bottom_content' => '<h2>Comment réussir sa prise de masse ?</h2><p>La prise de masse nécessite un excédent calorique combiné à un entraînement intense. Nos gainers fournissent les calories et protéines nécessaires.</p><h3>Nos gainers</h3><ul><li><strong>Haute énergie :</strong> 800-1200 kcal par dose</li><li><strong>Riches en protéines :</strong> 40-60g de protéines</li><li><strong>Formules complètes :</strong> Glucides, lipides, vitamines</li></ul>',
            ],
            'proteine' => [
                'name' => 'Protéine',
                'meta_title' => 'Protéine Tunisie | Whey, Caséine & Isolat',
                'meta_description' => 'Votre source de protéines en Tunisie. Whey protein, isolate, caséine et plus. Les meilleures marques aux meilleurs prix. Livraison rapide.',
                'h1_title' => 'Protéines en Tunisie',
                'primary_keyword' => 'protéine tunisie',
                'secondary_keywords' => [
                    'whey protein tunisie',
                    'proteine musculation tunisie',
                    'proteine whey tunisie',
                ],
                'short_intro' => '<p>Découvrez notre large gamme de <strong>protéines en Tunisie</strong>. Whey, isolate, caséine - tous les suppléments protéiques de qualité.</p>',
                'long_bottom_content' => '<h2>Les différentes protéines</h2><p>Chaque type de protéine a ses spécificités. Choisissez celle qui correspond à vos objectifs.</p><h3>Types de protéines</h3><ul><li><strong>Whey :</strong> Absorption rapide, idéal après l\'entraînement</li><li><strong>Whey Isolate :</strong> Plus pur, moins de lactose</li><li><strong>Caséine :</strong> Absorption lente, idéale pour la nuit</li><li><strong>Whey Hydrolysée :</strong> Pré-digérée, absorption ultra-rapide</li></ul>',
            ],
            'complements-d-entrainement' => [
                'name' => 'Compléments d\'Entrainement',
                'meta_title' => 'Compléments Entrainement Tunisie | Pre-Workout & BCAA',
                'meta_description' => 'Boostez vos séances avec nos suppléments d\'entraînement en Tunisie. Pre-workout, BCAA, produits pour la pompe et plus.',
                'h1_title' => 'Compléments d\'Entraînement en Tunisie',
                'primary_keyword' => 'compléments entraînement tunisie',
                'secondary_keywords' => [
                    'pre workout tunisie',
                    'bcaa tunisie',
                    'booster musculation tunisie',
                ],
                'short_intro' => '<p>Optimisez vos séances avec nos <strong>compléments d\'entraînement</strong>. Pre-workout, BCAA, et plus pour des performances optimales.</p>',
                'long_bottom_content' => '<h2>Les essentiels de l\'entraînement</h2><p>Ces suppléments sont conçus pour améliorer vos séances et votre récupération.</p><h3>Nos catégories</h3><ul><li><strong>Pre-Workout :</strong> Énergie et concentration</li><li><strong>BCAA :</strong> Protection musculaire</li><li><strong>Créatine :</strong> Force et puissance</li><li><strong>Citrulline :</strong> Pompe et vascularisation</li></ul>',
            ],
            'equipements-et-accessoires-sportifs' => [
                'name' => 'Équipements et Accessoires Sportifs',
                'meta_title' => 'Accessoires Sportifs Tunisie | Shakers, Gants & Ceintures',
                'meta_description' => 'Tous les accessoires de sport dont vous avez besoin en Tunisie. Shakers, ceintures, glove et plus. Qualité professionnelle.',
                'h1_title' => 'Équipements et Accessoires Sportifs en Tunisie',
                'primary_keyword' => 'accessoires musculation tunisie',
                'secondary_keywords' => [
                    'shaker tunisie',
                    'ceinture musculation tunisie',
                    'gants fitness tunisie',
                ],
                'short_intro' => '<p>Tous les <strong>accessoires de musculation</strong> et fitness dont vous avez besoin. Shakers, ceintures, gloves et plus.</p>',
                'long_bottom_content' => '<h2>Les accessoires essentiels</h2><p>Le bon équipement fait la différence dans vos séances.</p><h3>Notre sélection</h3><ul><li><strong>Shakers :</strong> Pour préparez vos shakes</li><li><strong>Ceintures :</strong> Soutien lombaire</li><li><strong>Gants :</strong> Protection des mains</li><li><strong>Bandes :</strong> Soutien articulaire</li></ul>',
            ],
        ];
    }

    // ============================================
    // SOUS-CATEGORIES SEO DATA
    // ============================================

    public static function getSousCategoriesData(): array
    {
        return [
            // === Compléments Alimentaires ===
            'creatine' => [
                'name' => 'Créatine',
                'meta_title' => 'Creatine Tunisie | Créatine Monohydrate Pas Cher',
                'meta_description' => 'Creatine de qualité professionnelle en Tunisie. Monohydrate, HCL, Capsules. Livraison rapide - améliorez vos performances.',
                'h1_title' => 'Creatine en Tunisie',
                'primary_keyword' => 'creatine tunisie',
                'secondary_keywords' => [
                    'crétine tunisie',
                    'créatine monohydrate tunisie',
                    'creatine musculation tunisie',
                    'acheter creatine tunisie',
                    'prix creatine tunisie',
                ],
                'short_intro' => '<p>La <strong>crétine</strong> est le supplément le plus efficace pour améliorer vos performances en musculation. Disponible en Tunisie chez Protéine Tunisie avec livraison rapide dans tout le pays.</p><p>Tous nos produits sont originaux avec certification.</p>',
                'long_bottom_content' => '<h2>Pourquoi prendre de la créatine ?</h2><p>La créatine est lun des suppléments les plus étudiés et les plus efficaces pour les sportifs.</p><h3>Les bénéfices prouvés</h3><ul><li><strong>Force augmentée :</strong> +5-10% de force en 4-6 semaines</li><li><strong>Volume musculaire :</strong> Rétention deau intracellulaire</li><li><strong>Récupération :</strong> Réduction du temps de récupération</li><li><strong>Endurance :</strong> Plus de reps par série</li></ul><h2>Quelle créatine choisir ?</h2><ul><li><strong>Monohydrate :</strong> Le plus économique et le plus incontourn able</li><li><strong>Créatine HCL :</strong> Meilleure solubilité, moins de rétention</li><li><strong>Créatine Capsules :</strong> Pratique et dosée</li></ul><h2>Comment utiliser la créatine</h2><p>Phase de chargement (optionnelle) : 20g/jour pendant 5-7 jours</p><p>Phase dentretien : 3-5g par jour, de préférence après lentraînement</p><h2>Légalité en Tunisie</h2><p>La créatine est parfaitement légale et disponible sans ordonnance en Tunisie.</p>',
                'faq' => [
                    ['q' => 'Quelle créatine choisir en Tunisie ?', 'a' => 'La créatine monohydrate est recommandée car elle offre le meilleur rapport qualité-prix. La créatine HCL est meilleure pour ceux qui digèrent mal le monohydrate.'],
                    ['q' => 'Comment prendre la créatine ?', 'a' => 'Prenez 3-5g par jour, de préférence après lentraînement. Vous pouvez la prendre à tout moment mais consistency est clé.'],
                    ['q' => 'La créatine est-elle dangereuse ?', 'a' => 'Non, la créatine est très sûre. Cest lun des suppléments les plus étudiés au monde.'],
                    ['q' => 'Combien de temps avant de voir les résultats ?', 'a' => 'Les effets se font sentir après 2-4 semaines dutilisation régulière.'],
                    ['q' => 'Créatine monohydrate ou HCL ?', 'a' => 'Le monohydrate est plus incontourn able et économique. La HCL coûte plus cher mais溶解 mieux.'],
                ],
            ],
            'bcaa' => [
                'name' => 'BCAA',
                'meta_title' => 'BCAA Tunisie | Acides Aminés Branchés Pas Cher',
                'meta_description' => 'BCAA et acides aminés pour la musculation en Tunisie. Améliorez votre récupération et préservez votre masse musculaire.',
                'h1_title' => 'BCAA en Tunisie',
                'primary_keyword' => 'bcaa tunisie',
                'secondary_keywords' => [
                    'bcaa musculation tunisie',
                    'acides aminés tunisie',
                    'acheter bcaa tunisie',
                ],
                'short_intro' => '<p>Les <strong>BCAA</strong> (Branch Chain Amino Acids) sont essentiels pour les sportifs. Ils aident à la récupération et préviennent la dégradation musculaire pendant lentraînement.</p>',
                'long_bottom_content' => '<h2>Pourquoi prendre des BCAA ?</h2><p>Les BCAA représentent environ 35% des protéines musculaires et sont directement utilisés comme énergie pendant lexercice.</p><h3>Bienfaits principaux</h3><ul><li><strong>Protection musculaire :</strong> Empêche le catabolisme</li><li><strong>Récupération :</strong> Réduit les courbatures</li><li><strong>Énergie :</strong> Réduit la fatigue pendant lexercice</li><li><strong>Synthèse :</strong> Stimule la croissance musculaire</li></ul><h2>BCAA vs EAA</h2><ul><li><strong>BCAA :</strong> 3 acides aminés (Leucine, Isoleucine, Valine)</li><li><strong>EAA :</strong> 9 acideaminés essentiels - plus complets</li></ul>',
                'faq' => [
                    ['q' => 'Les BCAA sont-ils nécessaires ?', 'a' => 'Si vous mangez suffisamment de protéines (2g/kg), les BCAA ne sont pas essentiels. Utiles en période de régime.'],
                    ['q' => 'Quand prendre les BCAA ?', 'a' => 'Avant, pendant ou après lentraînement. Le timing nest pas crucial.'],
                ],
            ],
            'proteine-whey' => [
                'name' => 'Protéine Whey',
                'meta_title' => 'Whey Protein Tunisie | Acheter Whey Pas Cher',
                'meta_description' => 'Whey protein de qualité premium en Tunisie. Whey isolate, concentré, hydrolysé. Livraison rapide dans tout le pays.',
                'h1_title' => 'Whey Protein en Tunisie',
                'primary_keyword' => 'whey protein tunisie',
                'secondary_keywords' => [
                    'whey tunisie',
                    'proteine whey tunisie',
                    'whey pas cher tunisie',
                    'acheter whey tunisie',
                ],
                'short_intro' => '<p>Découvrez notre large gamme de <strong>whey protein en Tunisie</strong>. Que vous cherchiez du whey isolate pour une absorption rapide ou du whey concentré pour un meilleur rapport qualité-prix, vous trouverez votre bonheur.</p><p>Tous nos produits sont <strong>authentiques et certifiés</strong>.</p>',
                'long_bottom_content' => '<h2>Comment choisir sa whey protein ?</h2><h3>Whey Isolate vs Whey Concentré</h3><ul><li><strong>Whey Isolate :</strong> 90%+ protéines, moins de lactose. Idéal pour après lentraînement.</li><li><strong>Whey Concentré :</strong> 80% protéines, plus économique. Parfait pour le quotidien.</li><li><strong>Whey Hydrolysé :</strong> Pré-digérée, absorption ultra-rapide.</li></ul><h2>Quand prendre sa whey ?</h2><ul><li><strong>Post-entraînement :</strong> Idéal pour la récupération</li><li><strong>Petit-déjeuner :</strong> Apport protéique mattinal</li><li><strong>Collation :</strong> Maintien dun apport élevé</li></ul><h2>Dosage recommandé</h2><p>30-40g de whey par dose, soit 1-2剂量 selon vos objectifs.</p>',
                'faq' => [
                    ['q' => 'Quelle whey choisir pour la musculation ?', 'a' => 'La whey isolate est recommandée pour une absorption rapide et un apport optimal en protéines.'],
                    ['q' => 'La whey protein fait-elle grossir ?', 'a' => 'Non, la whey vous aide à atteindre vos besoins protéiques. Le surpoids vient dun excédent calorique.'],
                    ['q' => 'Quand prendre la whey protein ?', 'a' => 'Le moment idéal est après lentraînement. Elle peut aussi être prise au petit-déjeuner.'],
                    ['q' => 'Whey isolate ou concentrée ?', 'a' => 'Lisolate contient plus de protéines et moins de lactose. La concentrée est plus économique.'],
                ],
            ],
            'isolate-whey' => [
                'name' => 'Isolat de Whey',
                'meta_title' => 'Whey Isolate Tunisie | Isolat de Protéine Pas Cher',
                'meta_description' => 'Whey isolate de qualité premium en Tunisie. Faible en lactose, haute absorption. Livraison rapide.',
                'h1_title' => 'Whey Isolate en Tunisie',
                'primary_keyword' => 'whey isolate tunisie',
                'secondary_keywords' => [
                    'isolate whey tunisie',
                    'protein isolate tunisie',
                    'iso whey tunisie',
                ],
                'short_intro' => '<p>Le <strong>whey isolate</strong> est la forme la plus pure de whey protein. Avec 90%+ de protéines et moins de lactose, cest le choix idéal pour les sportifs exigeants.</p>',
                'long_bottom_content' => '<h2>Pourquoi choisir le whey isolate ?</h2><ul><li><strong>Plus de protéines :</strong> 90-95% contre 80% pour le concentré</li><li><strong>Moins de lactose :</strong> Idéal pour les sensibles aux produits laitiers</li><li><strong>Absorption rapide :</strong> Digestion facile</li><li><strong>Meilleur pour la sèche :</strong> Moins de lipides et glucides</li></ul><h2>Quand utiliser le whey isolate ?</h2><ul><li>Après lentraînement pour une récupération rapide</li><li>En période de sèche pour maintenir le muscle</li><li>Pour les personnes sensibles au lactose</li></ul>',
                'faq' => [
                    ['q' => 'Quelle différence entre whey isolate et concentré ?', 'a' => 'Lisolate contient plus de protéines (90% vs 80%) et moins de lactose.'],
                    ['q' => 'Le whey isolate est-il meilleur ?', 'a' => 'Pour ceux qui cherchent le maximum de protéines avec moins de lactose, oui.'],
                ],
            ],
            'gainers' => [
                'name' => 'Gainer',
                'meta_title' => 'Gainer Tunisie | Mass Gainer Pas Cher',
                'meta_description' => 'Gainer et mass gainer pour la prise de masse en Tunisie. Haute calorie, riche en protéines. Livraison rapide.',
                'h1_title' => 'Gainer en Tunisie',
                'primary_keyword' => 'gainer tunisie',
                'secondary_keywords' => [
                    'mass gainer tunisie',
                    'prise de masse tunisie',
                    'gainer pas cher tunisie',
                ],
                'short_intro' => '<p>Les <strong>gainer</strong> sont conçus pour les sportifs qui ont du mal à prendre du poids. Haute calorie et riche en protéines pour une prise de masse rapide.</p>',
                'long_bottom_content' => '<h2>Qui a besoin dun gainer ?</h2><ul><li><strong>Hard gainers :</strong> Difficulté à prendre du poids</li><li><strong>Métabolisme rapide :</strong> Brûle beaucoup de calories</li><li><strong>Prise de masse agressive :</strong> Besoin calorique élevé</li></ul><h2>Types de gainers</h2><ul><li><strong>Haute énergie :</strong> 800-1200 kcal - pour les hard gainers</li><li><strong>Riches en protéines :</strong> Plus de protéines, moins de calories</li><li><strong>Équilibrés :</strong> Bon compromis calories/protéines</li></ul><h2>Comment utiliser un gainer</h2><ul><li>1-2 doses par jour selon vos besoins</li><li>Toujours combiner avec un entraînement</li><li>Ne pas remplacer les repas</li></ul>',
                'faq' => [
                    ['q' => 'Le gainer fait-il grossir ?', 'a' => 'Le gainer apporte beaucoup de calories. Utilisé avec entraînement, il aide à prendre du muscle.'],
                    ['q' => 'Combien de gainer par jour ?', 'a' => '1 à 2 doses maximum par jour selon vos besoins caloriques.'],
                    ['q' => 'Gainer ou whey ?', 'a' => 'Le gainer = calories + protéines. La whey = que des protéines.'],
                ],
            ],
            'pre-workout' => [
                'name' => 'Pré-workout',
                'meta_title' => 'Pre Workout Tunisie | Booster Entraînement',
                'meta_description' => 'Pre-workout et boosters dénergie en Tunisie. Maximisez vos séances avec nos stimulants de qualité.',
                'h1_title' => 'Pre-Workout en Tunisie',
                'primary_keyword' => 'pre workout tunisie',
                'secondary_keywords' => [
                    'pré-entraînement tunisie',
                    'booster musculation tunisie',
                    'stimulant sport tunisie',
                ],
                'short_intro' => '<p>Boostez vos séances avec nos <strong>pré-workout</strong>. Plus dénergie, plus de concentration, plus de force pour vos entraînements.</p>',
                'long_bottom_content' => '<h2>Ingrédients clés dun pre-workout</h2><ul><li><strong>Caféine :</strong> Énergie et concentration</li><li><strong>Créatine :</strong> Force et volume</li><li><strong>Bêta-alanine :</strong> Endurance</li><li><strong>Citrulline :</strong> Pompe musculaire</li><li><strong>Tyrosine :</strong> Focus mental</li></ul><h2>Comment utiliser le pre-workout</h2><ul><li><strong>Timing :</strong> 20-30 minutes avant lentraînement</li><li><strong>Dose :</strong> Commencer par une demi-dose</li><li><strong>Cycle :</strong> 4-8 semaines, puis pause</li></ul><h2>Précautions</h2><ul><li>Ne pas prendre le soir</li><li>Ne pas dépasser les doses</li><li>Bien shydrater</li></ul>',
                'faq' => [
                    ['q' => 'Le pre-workout est-il dangereux ?', 'a' => 'Utilisé selon les recommandations, il est sans danger.'],
                    ['q' => 'Quel pre-workout choisir ?', 'a' => 'Choisir selon vos objectifs : plus de force ou plus dénergie.'],
                    ['q' => 'Pre-workout tous les jours ?', 'a' => 'Non, faire des pauses pour éviter la tolérance.'],
                ],
            ],
            'fat-burner' => [
                'name' => 'Fat Burner',
                'meta_title' => 'Fat Burner Tunisie | Brûleur de Graisse',
                'meta_description' => 'Fat burners et brûleurs degraisse en Tunisie. Perdez du poids efficacement avec nos supplements thermogéniques.',
                'h1_title' => 'Fat Burner en Tunisie',
                'primary_keyword' => 'fat burner tunisie',
                'secondary_keywords' => [
                    'bruleur de graisse tunisie',
                    'thermogènique tunisie',
                    'complément perte de poids tunisie',
                ],
                'short_intro' => '<p>Nos <strong>fat burners</strong> vous aident à brûler plus de calories. Combinés à un régime et de lexercice, ils accélèrent vos résultats.</p>',
                'long_bottom_content' => '<h2>Comment fonctionne un fat burner ?</h2><ul><li><strong>Thermogénèse :</strong> Augmente la température corporelle</li><li><strong>Lipolyse :</strong> Déclenche la dégradation des graisses</li><li><strong>Apportit :</strong> Réduit la faim</li><li><strong>Énergie :</strong> Maintient le métabolisme actif</li></ul><h2>Ingrédients efficaces</h2><ul><li>Caféine</li><li>L-Carnitine</li><li>Extrait de thé vert</li><li>Forskoline</li></ul><h2>Résultats attendus</h2><p>Le fat burner seul ne fait pas maigrir. Il aide à brûler 100-200 kcal de plus par jour. Régime + exercice + fat burner = résultats.</p>',
                'faq' => [
                    ['q' => 'Le fat burner fonctionne-t-il vraiment ?', 'a' => 'Les fat burners aident à brûler plus mais nécessitent régime et exercice.'],
                    ['q' => 'Effets secondaires des fat burners ?', 'a' => 'Nervosité, insomnie, palpitations possibles. Respecter les dosages.'],
                ],
            ],
            'l-carnitine' => [
                'name' => 'L-Carnitine',
                'meta_title' => 'L-Carnitine Tunisie | Brûleur de Graisse',
                'meta_description' => 'L-Carnitine pour la perte de poids et lendurance en Tunisie. Transportez vos graisses vers lénergie.',
                'h1_title' => 'L-Carnitine en Tunisie',
                'primary_keyword' => 'l-carnitine tunisie',
                'secondary_keywords' => [
                    'carnitine musculation tunisie',
                    'l-carnitine perte de poids tunisie',
                ],
                'short_intro' => '<p>La <strong>L-Carnitine</strong> est un acide aminé qui aide à utiliser les graisses comme énergie. Idéale pour la sèche et lendurance.</p>',
                'long_bottom_content' => '<h2>À quoi sert la L-Carnitine ?</h2><p>La L-Carnitine transporte les acides gras vers les mitochondries pour être brûlés comme énergie.</p><h3>Bienfaits</h3><ul><li><strong>Perte de poids :</strong> Aide à utiliser les graisses</li><li><strong>Endurance :</strong> Améliore le temps jusquà lépuisement</li><li><strong>Récupération :</strong> Réduit les dommages musculaires</li></ul><h2>Quand prendre la L-Carnitine ?</h2><ul><li>30 minutes avant lentraînement</li><li>Le matin à jeun</li></ul>',
                'faq' => [
                    ['q' => 'La L-Carnitine fait-elle maigrir ?', 'a' => 'Elle aide le corps à utiliser les graisses comme énergie.'],
                    ['q' => 'Quelle forme de L-Carnitine choisir ?', 'a' => 'La forme Tartrate est la plus étudiée pour les sportifs.'],
                ],
            ],
            'glutamine' => [
                'name' => 'Glutamine',
                'meta_title' => 'Glutamine Tunisie | Récupération',
                'meta_description' => 'L-Glutamine pour la récupération intestinale et musculaire en Tunisie. Supplément essentiel pour les sportifs.',
                'h1_title' => 'Glutamine en Tunisie',
                'primary_keyword' => 'glutamine tunisie',
                'secondary_keywords' => [
                    'l-glutamine tunisie',
                    'glutamine musculation tunisie',
                ],
                'short_intro' => '<p>La <strong>L-Glutamine</strong> est le complément idéal pour la récupération. Elle soutient le système immunitaire et la réparation musculaire.</p>',
                'long_bottom_content' => '<h2>Pourquoi prendre de la glutamine ?</h2><ul><li><strong>Système immunitaire :</strong> Renforce les défenses</li><li><strong>Récupération intestinale :</strong> Répare la paroi intestinale</li><li><strong>Synthèse protéique :</strong> Aide à la construction musculaire</li></ul><h2>Qui devrait prendre de la glutamine ?</h2><ul><li>Sportifs intensifs</li><li>Personnes stressées</li><li>Ceux avec des problèmes digestifs</li></ul>',
                'faq' => [
                    ['q' => 'Quand prendre la glutamine ?', 'a' => 'Après lentraînement ou le soir.'],
                ],
            ],
            'acides-amines' => [
                'name' => 'Acides Aminés',
                'meta_title' => 'Acides Aminés Tunisie | EAA & Acides aminés',
                'meta_description' => 'Compléments dacides aminés en Tunisie. BCAA, Glutamine, EAA - pour la performance et la récupération.',
                'h1_title' => 'Acides Aminés en Tunisie',
                'primary_keyword' => 'acides aminés tunisie',
                'secondary_keywords' => [
                    'amino acids tunisie',
                    'eaa tunisie',
                    'compléments aminés tunisie',
                ],
                'short_intro' => '<p>Les <strong>acides aminés</strong> sont les blocs de construction des protéines. Suppléments essentiels pour la musculation et la récupération.</p>',
            ],
            'citrulline' => [
                'name' => 'Citrulline',
                'meta_title' => 'Citrulline Tunisie | L-Citrulline & Malate',
                'meta_description' => 'L-Citrulline pour la pompe musculaire et lendurance en Tunisie. Améliorez vos performances.',
                'h1_title' => 'Citrulline en Tunisie',
                'primary_keyword' => 'citrulline tunisie',
                'secondary_keywords' => [
                    'l-citrulline tunisie',
                    'citrulline malate tunisie',
                ],
                'short_intro' => '<p>La <strong>Citrulline</strong> augmente laproduction d oxyde nitrique pour une meilleure pompe et endurance.</p>',
            ],
            'eaa' => [
                'name' => 'EAA',
                'meta_title' => 'EAA Tunisie | Acides Aminés Essentiels',
                'meta_description' => 'EAA (Acides Aminés Essentiels) en Tunisie. Plus complets que les BCAA pour la musculation.',
                'h1_title' => 'EAA en Tunisie',
                'primary_keyword' => 'eaa tunisie',
                'short_intro' => '<p>Les <strong>EAA</strong> contiennent les 9 acideaminés essentiels, contre seulement 3 pour les BCAA.</p>',
            ],
            'omega3' => [
                'name' => 'Omega 3',
                'meta_title' => 'Omega 3 Tunisie | Poissons Gras & DHA',
                'meta_description' => 'Oméga 3 pour la santé cardiovasculaire et la récupération en Tunisie. Huiles de poisson de qualité.',
                'h1_title' => 'Oméga 3 en Tunisie',
                'primary_keyword' => 'omega 3 tunisie',
                'secondary_keywords' => [
                    'oméga 3 tunisie',
                    'huile poisson tunisie',
                ],
                'short_intro' => '<p>Les <strong>Oméga 3</strong> sont essentiels pour la santé et la récupération. Réduisent linflammation et soutiennent le cœur.</p>',
            ],
            'vitamines' => [
                'name' => 'Vitamines',
                'meta_title' => 'Vitamines Tunisie | Multivitamines',
                'meta_description' => 'Vitamines et minéraux pour les sportifs en Tunisie. Multivitamines, zinc, magnesium et plus.',
                'h1_title' => 'Vitamines en Tunisie',
                'primary_keyword' => 'vitamines tunisie',
                'short_intro' => '<p>Les <strong>vitamines</strong> et minéraux sont essentiels pour les sportifs. Ils soutiennent le métabolisme et la récupération.</p>',
            ],
            'zinc' => [
                'name' => 'Zinc',
                'meta_title' => 'Zinc Tunisie | Complément Zinc',
                'meta_description' => 'Zinc pour le système immunitaire et la-testostérone en Tunisie. Supplément essentiel pour les sportifs.',
                'h1_title' => 'Zinc en Tunisie',
                'primary_keyword' => 'zinc tunisie',
                'short_intro' => '<p>Le <strong>Zinc</strong> est essentiel pour le système immunitaire et la production de testostérone.</p>',
            ],
            'magnesium' => [
                'name' => 'Magnésium',
                'meta_title' => 'Magnésium Tunisie | Magnesium Sport',
                'meta_description' => 'Magnésium pour la récupération musculaire et le sommeil en Tunisie.',
                'h1_title' => 'Magnésium en Tunisie',
                'primary_keyword' => 'magnesium tunisie',
                'short_intro' => '<p>Le <strong>Magnésium</strong> est crucial pour la récupération, le sommeil et la fonction musculaire.</p>',
            ],
            'zma' => [
                'name' => 'ZMA',
                'meta_title' => 'ZMA Tunisie | Zinc Magnesium',
                'meta_description' => 'ZMA (Zinc + Magnésium + B6) pour la récupération en Tunisie.',
                'h1_title' => 'ZMA en Tunisie',
                'primary_keyword' => 'zma tunisie',
                'short_intro' => '<p>Le <strong>ZMA</strong> combine zinc, magnésium et vitamine B6 pour une récupération optimale.</p>',
            ],
            'beta-alanine' => [
                'name' => 'Beta Alanine',
                'meta_title' => 'Beta Alanine Tunisie | Endurance',
                'meta_description' => 'Beta alanine pour améliorer lendurance et les performances en musculation en Tunisie.',
                'h1_title' => 'Beta Alanine en Tunisie',
                'primary_keyword' => 'beta alanine tunisie',
                'short_intro' => '<p>La <strong>Bêta-Alanine</strong> augmente les niveaux de carnosine pour une meilleure endurance.</p>',
            ],
            'ashwagandha' => [
                'name' => 'Ashwagandha',
                'meta_title' => 'Ashwagandha Tunisie | Stress & Récupération',
                'meta_description' => 'Ashwagandha pour le stress et la récupération en Tunisie. Adaptogène naturel.',
                'h1_title' => 'Ashwagandha en Tunisie',
                'primary_keyword' => 'ashwagandha tunisie',
                'short_intro' => '<p>L<strong>Ashwagandha</strong> est une plante adaptogène qui aide à gérer le stress et améliore la récupération.</p>',
            ],
            'tribulus' => [
                'name' => 'Tribulus',
                'meta_title' => 'Tribulus Tunisie | Booster Hormonal',
                'meta_description' => 'Tribulus pour la production naturelle de testostérone en Tunisie.',
                'h1_title' => 'Tribulus en Tunisie',
                'primary_keyword' => 'tribulus tunisie',
                'short_intro' => '<p>Le <strong>Tribulus</strong> est un booster hormonal naturel qui peut aider à la production de testostérone.</p>',
            ],
            'collagene' => [
                'name' => 'Collagène',
                'meta_title' => 'Collagène Tunisie | Articulations',
                'meta_description' => 'Collagène pour les articulations et la peau en Tunisie.',
                'h1_title' => 'Collagène en Tunisie',
                'primary_keyword' => 'collagène tunisie',
                'short_intro' => '<p>Le <strong>Collagène</strong> soutient la santé des articulations, des os et de la peau.</p>',
            ],
            'hmb' => [
                'name' => 'HMB',
                'meta_title' => 'HMB Tunisie | Préservation Musculaire',
                'meta_description' => 'HMB pour préserver la masse musculaire en Tunisie.',
                'h1_title' => 'HMB en Tunisie',
                'primary_keyword' => 'hmb tunisie',
                'short_intro' => '<p>Le <strong>HMB</strong> aide à prévenir la dégradation musculaire et soutient la récupération.</p>',
            ],
            // === Perte de Poids ===
            'cla' => [
                'name' => 'CLA',
                'meta_title' => 'CLA Tunisie | Acide Linoléique Conjugué',
                'meta_description' => 'CLA pour la perte de poids et le maintien musculaire en Tunisie.',
                'h1_title' => 'CLA en Tunisie',
                'primary_keyword' => 'cla tunisie',
                'short_intro' => '<p>Le <strong>CLA</strong> (Acide Linoléique Conjugué) aide à réduire la masse grasse.</p>',
            ],
            'bruleurs-de-graisse' => [
                'name' => 'Brûleurs de Graisse',
                'meta_title' => 'Brûleurs de Graisse Tunisie',
                'meta_description' => 'Brûleurs de graisse efficaces pour la sèche en Tunisie.',
                'h1_title' => 'Brûleurs de Graisse en Tunisie',
                'primary_keyword' => 'brûleurs de graisse tunisie',
                'short_intro' => '<p>Les <strong>brûleurs de graisse</strong> accélèrent le métabolisme pour une perte de poids plus rapide.</p>',
            ],
            // === Prise de Masse ===
            'gainers-haute-energie' => [
                'name' => 'Gainers Haute Energie',
                'meta_title' => 'Gainer Haute Energie Tunisie',
                'meta_description' => 'Gainer haute calorie pour la prise de masse rapide en Tunisie.',
                'h1_title' => 'Gainer Haute Energie',
                'primary_keyword' => 'gainer haute énergie tunisie',
                'short_intro' => '<p>Les <strong>gainer haute énergie</strong> apportent 800-1200 kcal par dose.</p>',
            ],
            'gainers-riches-en-proteines' => [
                'name' => 'Gainers Riches en Protéines',
                'meta_title' => 'Gainer Protéiné Tunisie',
                'meta_description' => 'Gainer riche en protéines pour une prise de masse sèche.',
                'h1_title' => 'Gainer Protéiné',
                'primary_keyword' => 'gainer protéiné tunisie',
                'short_intro' => '<p>Les <strong>gainer riches en protéines</strong> offrent un meilleur ratio protéines/calories.</p>',
            ],
            'carbohydrates' => [
                'name' => 'Carbohydrates',
                'meta_title' => 'Carbohydrates Sportifs Tunisie',
                'meta_description' => 'Supplements de glucides pour lénergie et la récupération.',
                'h1_title' => 'Carbohydrates Sportifs',
                'primary_keyword' => 'carbohydrates sport tunisie',
                'short_intro' => '<p>Les <strong>carbohydrates</strong> sont essentiels pour lénergie et la récupération.</p>',
            ],
            // === Protéine ===
            'proteine-caseine' => [
                'name' => 'Protéine de Caséine',
                'meta_title' => 'Caséine Tunisie | Protéine Night',
                'meta_description' => 'Caseine protein pour la musculation et la récupération nocturne.',
                'h1_title' => 'Caséine en Tunisie',
                'primary_keyword' => 'caseine tunisie',
                'short_intro' => '<p>La <strong>caséine</strong> est une protéine à absorption lente, idéale pour la nuit.</p>',
            ],
            'proteines-completes' => [
                'name' => 'Protéines Complètes',
                'meta_title' => 'Protéines Complètes Tunisie',
                'meta_description' => 'Protéines complètes pour une nutrition optimale.',
                'h1_title' => 'Protéines Complètes',
                'primary_keyword' => 'protéines complètes tunisie',
                'short_intro' => '<p>Les <strong>protéines complètes</strong> contiennent tous les acideaminés essentiels.</p>',
            ],
            'proteine-de-boeuf' => [
                'name' => 'Protéine de Boeuf',
                'meta_title' => 'Protéine Boeuf Tunisie',
                'meta_description' => 'Protéine de boeuf de qualité pour la musculation.',
                'h1_title' => 'Protéine de Boeuf',
                'primary_keyword' => 'protéine boeuf tunisie',
                'short_intro' => '<p>La <strong>protéine de boeuf</strong> est une alternative à la whey, riche en fer.</p>',
            ],
            'whey-hydrolysee' => [
                'name' => 'Whey Hydrolysée',
                'meta_title' => 'Whey Hydrolysée Tunisie',
                'meta_description' => 'Whey hydrolysée pour une absorption ultra-rapide.',
                'h1_title' => 'Whey Hydrolysée',
                'primary_keyword' => 'whey hydrolysée tunisie',
                'short_intro' => '<p>La <strong>whey hydrolysée</strong> est pré-digérée pour une absorption maximale.</p>',
            ],
            // === Compléments d'Entrainement ===
            'pre-entrainement' => [
                'name' => 'Pré Entraînement',
                'meta_title' => 'Pré-Entraînement Tunisie',
                'meta_description' => 'Suppléments pré-entraînement pour plus dénergie.',
                'h1_title' => 'Pré-Entraînement',
                'primary_keyword' => 'pré entraînement tunisie',
                'short_intro' => '<p>Les produits <strong>pré-entraînement</strong> boostent vos séances.</p>',
            ],
            'pendant-entrainement' => [
                'name' => 'Pendant l\'Entraînement',
                'meta_title' => 'Pendant Entraînement Tunisie',
                'meta_description' => 'Produits pour pendant l\'entraînement.',
                'h1_title' => 'Pendant l\'Entraînement',
                'primary_keyword' => 'pendant entraînement tunisie',
                'short_intro' => '<p>Produits pour maintenir vos performances <strong>pendant l\'entraînement</strong>.</p>',
            ],
            'recuperation-apres-entrainement' => [
                'name' => 'Récupération Après Entraînement',
                'meta_title' => 'Récupération Tunisie',
                'meta_description' => 'Produits pour la récupération après l\'entraînement.',
                'h1_title' => 'Récupération',
                'primary_keyword' => 'récupération musculation tunisie',
                'short_intro' => '<p>Optimisez votre <strong>récupération</strong> avec nos suppléments spécialisés.</p>',
            ],
            // === Équipements ===
            'shakers-bouteilles-sportives' => [
                'name' => 'Shakers et Bouteilles Sportives',
                'meta_title' => 'Shaker Tunisie | Bouteille Sport',
                'meta_description' => 'Shakers et bouteilles sportives pour préparer vos shakes.',
                'h1_title' => 'Shakers & Bouteilles',
                'primary_keyword' => 'shaker tunisie',
                'short_intro' => '<p>Les <strong>shakers</strong> sont indispensables pour préparer vos protéinees.</p>',
            ],
            'gants-de-musculation-et-fitness' => [
                'name' => 'Gants de Musculation',
                'meta_title' => 'Gants Musculation Tunisie',
                'meta_description' => 'Gants de musculation et fitness pour protéger vos mains.',
                'h1_title' => 'Gants de Musculation',
                'primary_keyword' => 'gants musculation tunisie',
                'short_intro' => '<p>Les <strong>gants de musculation</strong> protègent vos mains pendant les séances.</p>',
            ],
            'ceinture-de-musculation' => [
                'name' => 'Ceinture de Musculation',
                'meta_title' => 'Ceinture Musculation Tunisie',
                'meta_description' => 'Ceintures de musculation pour le soutien lombaire.',
                'h1_title' => 'Ceinture de Musculation',
                'primary_keyword' => 'ceinture musculation tunisie',
                'short_intro' => '<p>Les <strong>ceintures de musculation</strong> soutiennent le bas du dos.</p>',
            ],
            'bandes-de-soutien-musculaire' => [
                'name' => 'Bandes de Soutien Musculaire',
                'meta_title' => 'Bandes de Soutien Tunisie',
                'meta_description' => 'Bandes de soutien et compression pour la récupération.',
                'h1_title' => 'Bandes de Soutien',
                'primary_keyword' => 'bandes soutien tunisie',
                'short_intro' => '<p>Les <strong>bandes de soutien</strong> aident à la récupération et au soutien articulaire.</p>',
            ],
            'materiel-de-musculation' => [
                'name' => 'Matériel de Musculation',
                'meta_title' => 'Matériel Musculation Tunisie',
                'meta_description' => 'Matériel de musculation et accessoires.',
                'h1_title' => 'Matériel de Musculation',
                'primary_keyword' => 'materiel musculation tunisie',
                'short_intro' => '<p>Le <strong>matériel de musculation</strong> pour votre entraînement.</p>',
            ],
            'equipement-cardio-fitness' => [
                'name' => 'Equipement Cardio Fitness',
                'meta_title' => 'Equipement Cardio Tunisie',
                'meta_description' => 'Équipements de cardio training et fitness.',
                'h1_title' => 'Équipement Cardio',
                'primary_keyword' => 'equipement cardio tunisie',
                'short_intro' => '<p>Les <strong>équipements cardio</strong> pour votre fitness.</p>',
            ],
            't-shirts-de-sport' => [
                'name' => 'T-shirts de Sport',
                'meta_title' => 'T-Shirts Sport Tunisie',
                'meta_description' => 'T-shirts de sport et vêtements de fitness.',
                'h1_title' => 'T-shirts de Sport',
                'primary_keyword' => 't-shirt sport tunisie',
                'short_intro' => '<p>Les <strong>t-shirts de sport</strong> pour vos séances.</p>',
            ],
        ];
    }

    // ============================================
    // BLOG ARTICLES DATA
    // ============================================

    public static function getBlogArticlesData(): array
    {
        return [
            [
                'title' => 'Guide complet de la créatine en Tunisie',
                'slug' => 'guide-complet-creatine-tunisie',
                'excerpt' => 'Tout savoir sur la créatine : bénéfices, dosage, types et comment la choisir en Tunisie.',
                'description' => '<h2>Pourquoi la créatine est essentielle</h2><p>La créatine est lun des suppléments les plus incontourn able pour les sportifs. Elle aumenta la force, le volume et la récupération.</p><h2>Les différents types de créatine</h2><ul><li><strong>Monohydrate :</strong> Le plus incontourn able et économique</li><li><strong>HCL :</strong> Meilleure solubilité</li><li><strong>Ethyl Ester :</strong> Meilleure absorption</li></ul><h2>Comment la prendre</h2><p>Phase de chargement : 20g/jour pendant 5 jours</p><p>Phase dentretien : 3-5g/jour</p>',
                'seo_title' => 'Guide Créatine Tunisie | Tout Savoir sur la Créatine',
                'seo_description' => 'Guide complet sur la créatine en Tunisie. Comment la choisir, la doser et où l\'acheter au meilleur prix.',
                'blog_type' => 'guide',
                'related_category_slugs' => ['creatine'],
                'publier' => 0,
            ],
            [
                'title' => 'Comment choisir sa whey protein en Tunisie',
                'slug' => 'comment-choisir-whey-tunisie',
                'excerpt' => 'Whey isolate, concentré, hydrolysé : quelle différence ? Comment choisir la meilleure whey pour vos objectifs.',
                'description' => '<h2>Les types de whey</h2><p>Comprendre les différences entre whey isolate, concentré et hydrolysé pour faire le bon choix.</p><h2>Critères de choix</h2><ul><li>Votre objectif (prise de masse, sèche)</li><li>Votre budget</li><li>Votre tolérance au lactose</li></ul>',
                'seo_title' => 'Comment Choisir sa Whey en Tunisie | Guide Complet',
                'seo_description' => 'Découvrez comment choisir la meilleure whey protein selon vos objectifs et votre budget en Tunisie.',
                'blog_type' => 'guide',
                'related_category_slugs' => ['proteine-whey', 'isolate-whey'],
                'publier' => 0,
            ],
            [
                'title' => 'Whey isolate vs whey concentrée : quelle différence ?',
                'slug' => 'whey-isolate-vs-concentre-tunisie',
                'excerpt' => 'Comparaison détaillée entre whey isolate et concentré. Avantages, inconvénients et recommandations.',
                'description' => '<h2>Composition nutritionnelle</h2><p>Lisolate contient plus de protéines (90%+) que le concentré (80%).</p><h2>Avantages et inconvénients</h2><p>Lisolate est plus pur mais plus cher. Le concentré est plus économique.</p>',
                'seo_title' => 'Whey Isolate vs Concentré | Quelle Choisir en Tunisie',
                'seo_description' => 'Comparez whey isolate et concentré pour trouver la meilleure whey protein pour vos besoins.',
                'blog_type' => 'comparison',
                'related_category_slugs' => ['proteine-whey', 'isolate-whey'],
                'publier' => 0,
            ],
            [
                'title' => 'Mass gainer : comment réussir une prise de masse',
                'slug' => 'mass-gainer-prise-masse-tunisie',
                'excerpt' => 'Guide complet pour utiliser un mass gainer efficacement et atteindre vos objectifs de prise de masse.',
                'description' => '<h2>Quest-ce quun mass gainer ?</h2><p>Un gainer est un supplément haute calorie conçu pour la prise de masse.</p><h2>Comment lutiliser</h2><p>1-2 doses par jour selon vos besoins caloriques. Toujours combiner avec un entraînement.</p>',
                'seo_title' => 'Mass Gainer Prise de Masse | Guide Complet Tunisie',
                'seo_description' => 'Apprenez à utiliser un mass gainer efficacement pour une prise de masse réussie en Tunisie.',
                'blog_type' => 'guide',
                'related_category_slugs' => ['gainers', 'gainers-haute-energie'],
                'publier' => 0,
            ],
            [
                'title' => 'BCAA vs EAA : lequel choisir ?',
                'slug' => 'bcaa-vs-eaa-tunisie',
                'excerpt' => 'BCAA ou EAA ? Comprendre les différences pour faire le bon choix selon vos besoins.',
                'description' => '<h2>Quest-ce que les BCAA ?</h2><p>Les BCAA (Branch Chain Amino Acids) sont 3 acideaminés : Leucine, Isoleucine, Valine.</p><h2>Quest-ce que les EAA ?</h2><p>Les EAA contiennent les 9 acideaminés essentiels.</p>',
                'seo_title' => 'BCAA vs EAA | Quel Choisir en Tunisie',
                'seo_description' => 'BCAA ou EAA ? Comparez ces suppléments pour trouver celui qui convient à vos objectifs.',
                'blog_type' => 'comparison',
                'related_category_slugs' => ['bcaa', 'eaa', 'acides-amines'],
                'publier' => 0,
            ],
            [
                'title' => 'Quand prendre la glutamine ?',
                'slug' => 'quand-prendre-glutamine-tunisie',
                'excerpt' => 'Guide sur la glutamine : bénéfices, timing et dosage pour une récupération optimale.',
                'description' => '<h2>À quoi sert la glutamine ?</h2><p>La glutamine soutient le système immunitaire et la récupération intestinale.</p><h2>Quand la prendre ?</h2><p>Après lentraînement ou le soir pour une récupération optimale.</p>',
                'seo_title' => 'Glutamine | Quand et Comment la Prendre',
                'seo_description' => 'Découvrez quand et comment prendre la glutamine pour optimiser votre récupération.',
                'blog_type' => 'guide',
                'related_category_slugs' => ['glutamine'],
                'publier' => 0,
            ],
            [
                'title' => 'Pré-workout : comment bien choisir son booster',
                'slug' => 'pre-workout-choisir-booster-tunisie',
                'excerpt' => 'Guide pour choisir le meilleur pre-workout selon vos objectifs et votre tolérance.',
                'description' => '<h2>Les ingrédients clés</h2><p>Caféine, créatine, bêta-alanine, citrulline - comprendre leurs rôles.</p><h2>Comment choisir ?</h2><p>Considérez votre tolérance à la caféine et vos objectifs.</p>',
                'seo_title' => 'Pré-Workout | Guide de Choix en Tunisie',
                'seo_description' => 'Comment choisir le meilleur pre-workout pour vos séances de musculation en Tunisie.',
                'blog_type' => 'guide',
                'related_category_slugs' => ['pre-workout'],
                'publier' => 0,
            ],
            [
                'title' => 'Fat burner : ce qu\'il faut savoir avant d\'acheter',
                'slug' => 'fat-burner-acheter-tunisie',
                'excerpt' => 'Tout sur les fat burners : fonctionnement, efficacité, précautions et comment les utiliser.',
                'description' => '<h2>Comment fonctionne un fat burner ?</h2><p>Thermogénèse, lipolyse, contrôle de lappetit - compréhension des mécanismes.</p><h2>Précautions</h2><p>Ne pas dépasser les doses. Effets secondaires possibles.</p>',
                'seo_title' => 'Fat Burner | Guide Complet en Tunisie',
                'seo_description' => 'Tout savoir sur les fat burners avant d\'acheter en Tunisie.',
                'blog_type' => 'guide',
                'related_category_slugs' => ['fat-burner', 'l-carnitine'],
                'publier' => 0,
            ],
            [
                'title' => 'L-Carnitine : utilisation et conseils',
                'slug' => 'l-carnitine-utilisation-tunisie',
                'excerpt' => 'Guide sur la L-Carnitine : bénéfices, dosage et meilleures pratiques.',
                'description' => '<h2>Comment fonctionne la L-Carnitine ?</h2><p>Elle transporte les acides gras vers les mitochondries pour être utilisés comme énergie.</p><h2>Quand la prendre ?</h2><p>30 minutes avant lentraînement ou le matin à jeun.</p>',
                'seo_title' => 'L-Carnitine | Guide et Conseils en Tunisie',
                'seo_description' => 'Découvrez comment utiliser la L-Carnitine efficacement pour la perte de poids.',
                'blog_type' => 'guide',
                'related_category_slugs' => ['l-carnitine'],
                'publier' => 0,
            ],
            [
                'title' => 'Les meilleurs compléments pour la prise de masse',
                'slug' => 'meilleurs-complements-prise-masse-tunisie',
                'excerpt' => 'TOP 10 des suppléments les plus efficaces pour la prise de masse en musculation.',
                'description' => '<h2>Les essentiels</h2><ul><li>Whey Protein</li><li>Creatine</li><li>Mass Gainer</li><li>BCAA</li></ul><h2>Les complémentaires</h2><ul><li>Glutamine</li><li>ZMA</li><li>Oméga 3</li></ul>',
                'seo_title' => 'Meilleurs Compléments Prise de Masse | TOP 10',
                'seo_description' => 'Découvrez les 10 meilleurs suppléments pour une prise de masse réussie en Tunisie.',
                'blog_type' => 'article',
                'related_category_slugs' => ['proteine-whey', 'gainers', 'creatine'],
                'publier' => 0,
            ],
            [
                'title' => 'Les meilleurs compléments pour la récupération',
                'slug' => 'meilleurs-complements-recuperation-tunisie',
                'excerpt' => 'Optimisez votre récupération avec ces suppléments essentiels.',
                'description' => '<h2>Les incontourn able</h2><ul><li>Protéines</li><li>Glutamine</li><li>BCAA</li></ul><h2>Les complémentaires</h2><ul><li>Magnésium</li><li>ZMA</li><li>Oméga 3</li></ul>',
                'seo_title' => 'Meilleurs Compléments Récupération | Guide',
                'seo_description' => 'Les meilleurs suppléments pour améliorer votre récupération musculaire.',
                'blog_type' => 'article',
                'related_category_slugs' => ['glutamine', 'bcaa', 'omega3'],
                'publier' => 0,
            ],
            [
                'title' => 'Comment choisir un shaker de sport',
                'slug' => 'choisir-shaker-sport-tunisie',
                'excerpt' => 'Guide pour choisir le meilleur shaker selon vos besoins et votre budget.',
                'description' => '<h2>Types de shakers</h2><ul><li>Classique avec boule</li><li>Électrique</li><li>Isolé</li></ul><h2>Critères de choix</h2><p>Matériau, capacité, facilité de nettoyage.</p>',
                'seo_title' => 'Comment Choisir un Shaker | Guide',
                'seo_description' => 'Choisissez le meilleur shaker pour préparer vos supplémentations.',
                'blog_type' => 'guide',
                'related_category_slugs' => ['shakers-bouteilles-sportives'],
                'publier' => 0,
            ],
            [
                'title' => 'Protéine whey ou gainer : que choisir ?',
                'slug' => 'whey-ou-gainer-tunisie',
                'excerpt' => 'Whey protein ou mass gainer ? Comprendre la différence pour faire le bon choix.',
                'description' => '<h2>Whey protein</h2><p>Concentré sur les protéines, peu de calories.</p><h2>Mass gainer</h2><p>Riche en protéines ET en calories.</p><h2>Quand choisir quoi ?</h2><p>Whey pour la sèche, Gainer pour la prise de masse.</p>',
                'seo_title' => 'Whey ou Gainer | Que Choisir en Tunisie',
                'seo_description' => 'Whey protein ou mass gainer ? Guide pour faire le bon choix.',
                'blog_type' => 'comparison',
                'related_category_slugs' => ['proteine-whey', 'gainers'],
                'publier' => 0,
            ],
            [
                'title' => 'Créatine monohydrate : pourquoi c\'est la plus populaire',
                'slug' => 'creatine-monohydrate-populaire-tunisie',
                'excerpt' => 'Découvrez pourquoi la créatine monohydrate reste le choix numéro 1 des sportifs.',
                'description' => '<h2>Pourquoi la monohydrate est incontourn able</h2><p>La forme la plus étudiée, la plus économique, et la plus efficace.</p><h2>Les preuves scientifiques</h2><p>Des centaines détudes confirment son efficacité.</p>',
                'seo_title' => 'Créatine Monohydrate | Pourquoi la Choisir',
                'seo_description' => 'Pourquoi la créatine monohydrate est le choix le plus populaire en Tunisie.',
                'blog_type' => 'article',
                'related_category_slugs' => ['creatine'],
                'publier' => 0,
            ],
            [
                'title' => 'Guide des compléments alimentaires pour débutants',
                'slug' => 'complements-alimentaires-debutants-tunisie',
                'excerpt' => 'Tout ce que les débutants en musculation doivent savoir sur les suppléments.',
                'description' => '<h2>Les essentiels pour commencer</h2><ul><li>Whey protein</li><li>Creatine</li><li>Multivitamines</li></ul><h2>Quand ajouter des suppléments ?</h2><p>Après quelques mois dentraînement régulier.</p>',
                'seo_title' => 'Guide Compléments Débutants | Tunisie',
                'seo_description' => 'Le guide complet des suppléments pour les débutants en musculation.',
                'blog_type' => 'guide',
                'related_category_slugs' => ['complements-alimentaires'],
                'publier' => 0,
            ],
        ];
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    public static function normalizeSlug(string $name): string
    {
        return Str::slug($name, '-', 'fr');
    }

    public static function findCategoryBySlug(array $categories, string $slug): ?array
    {
        foreach ($categories as $cat) {
            if ($cat['slug'] === $slug) {
                return $cat;
            }
        }
        return null;
    }

    public static function findCategoryByName(array $categories, string $name): ?array
    {
        $normalizedSearch = self::normalizeSlug($name);
        foreach ($categories as $cat) {
            if (self::normalizeSlug($cat['designation_fr']) === $normalizedSearch) {
                return $cat;
            }
        }
        return null;
    }
}