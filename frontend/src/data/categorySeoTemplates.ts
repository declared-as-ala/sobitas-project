/**
 * SEO Content Templates for Categories
 * These can be imported into Filament admin or used to generate content programmatically
 */

export interface CategorySeoTemplate {
  slug: string;
  name: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  shortIntro: string;
  longBottomContent: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  faq: { q: string; a: string }[];
}

export const categorySeoTemplates: CategorySeoTemplate[] = [
  // ============ PROTEINES ============
  {
    slug: 'proteine-whey',
    name: 'Protéine Whey',
    metaTitle: 'Whey Protein Tunisie | Acheter Whey Pas Cher',
    metaDescription: 'Whey protein de qualité premium en Tunisie. Whey isolate, concentré, hydrolysé. Livraison rapide dans tout le pays. Protéine authentique au meilleur prix.',
    h1: 'Whey Protein Tunisie',
    shortIntro: `<h2>Votre whey protein en Tunisie</h2>
<p>Découvrez notre large gamme de <strong>whey protein en Tunisie</strong>. Que vous cherchiez du whey isolate pour une absorption rapide ou du whey concentré pour un meilleur rapport qualité-prix, vous trouverez votre bonheur chez Protéine Tunisie.</p>
<p>Tous nos produits sont <strong>authentiques et certifiés</strong>, livrés rapidement dans tout le pays.</p>`,
    longBottomContent: `<h2>Comment choisir sa whey protein en Tunisie ?</h2>
<p>La whey protein est le supplément le plus populaire pour la musculation. Voici les critères pour bien choisir :</p>

<h3>1. Whey Isolate vs Whey Concentré</h3>
<ul>
<li><strong>Whey Isolate :</strong> Plus pur (90%+ protéine), moins de lactose. Idéal pour ceux qui digèrent mal les produits laitiers.</li>
<li><strong>Whey Concentré :</strong> Plus économique, 80% de protéine. Parfait pour les débutants.</li>
<li><strong>Whey Hydrolysé :</strong> Pré-digérée pour une absorption ultra-rapide.</li>
</ul>

<h3>2. Quand prendre sa whey ?</h3>
<ul>
<li><strong>Post-entraînement :</strong> Idéal pour la récupération musculaire</li>
<li><strong>Petit-déjeuner :</strong> Pour un apport protéique mattinal</li>
<li><strong>Collation :</strong> Pour maintenir un apport protéique élevé</li>
</ul>

<h3>3. Dosage recommandé</h3>
<p>30-40g de whey par dose, soit 1-2剂量 selon votre objectifs. À mélanger avec de l'eau ou du lait.</p>

<h2>Livraison en Tunisie</h2>
<p>Nous livrons <strong>partout en Tunisie</strong> : Tunis, Sousse, Sfax, Bizerte, Kairouan, etc. Livraison gratuite dès 200 DT d'achat.</p>`,
    primaryKeyword: 'whey protein tunisie',
    secondaryKeywords: ['whey isolate tunisie', 'whey concentré tunisie', 'whey pas cher tunisie', 'acheter whey tunisie'],
    faq: [
      { q: 'Quelle whey choisir pour la musculation ?', a: 'La whey isolate est recommandée pour une absorption rapide et un apport optimal en protéines. La whey concentré est plus économique.' },
      { q: 'La whey protein fait-elle grossir ?', a: 'Non, la whey protein aide à atteindre vos besoins protéiques. Le surpoids vient dun excédent calorique global.' },
      { q: 'Quand prendre la whey protein ?', a: 'Le moment idéal est après lentraînement pour maximiser la récupération. Elle peut aussi être prise au petit-déjeuner ou en collation.' },
    ],
  },

  // ============ CRÉATINE ============
  {
    slug: 'creatine',
    name: 'Créatine',
    metaTitle: 'Creatine Tunisie | Créatine Monohydrate Pas Cher',
    metaDescription: 'Creatine de qualité professionnelle en Tunisie. Monohydrate, HCL, effets secondaires. Livraison rapide - améliorez vos performances.',
    h1: 'Creatine Tunisie',
    shortIntro: `<h2>Creatine pour la musculation en Tunisie</h2>
<p>La <strong>crétine</strong> est lun des suppléments les plus efficaces pour améliorer vos performances. Disponible en Tunisie chez Protéine Tunisie avec livraison rapide.</p>`,
    longBottomContent: `<h2>Bien utiliser la créatine en Tunisie</h2>

<h3>Les bénéfices de la créatine</h3>
<ul>
<li><strong>Plus de force :</strong> Augmente la puissance de 5-10%</li>
<li><strong>Plus de volume :</strong> Retient plus deau dans les muscles</li>
<li><strong>Meilleure récupération :</strong> Réduit le temps de récupération entre séances</li>
<li><strong>Effet anti-fatigue :</strong> Permet des séances plus longues</li>
</ul>

<h3>Comment prendre la créatine</h3>
<p>Phase de chargement (optionnelle) : 20g/jour pendant 5-7 jours</p>
<p>Phase dentretien : 3-5g par jour, de préférence après lentraînement</p>

<h3>Créatine monohydrate vs HCL</h3>
<ul>
<li><strong>Monohydrate :</strong> La plus étudiée, le meilleur rapport qualité-prix</li>
<li><strong>Créatine HCL :</strong> Plus soluble, moins de rétention deau</li>
</ul>

<h2>Est-ce légal en Tunisie ?</h2>
<p>Oui, la créatine est complètement légale et disponible sans ordonnance en Tunisie.</p>`,
    primaryKeyword: 'crétine tunisie',
    secondaryKeywords: ['créatine monohydrate tunisie', 'creatine musculation tunisie', 'creatine pas cher tunisie'],
    faq: [
      { q: 'La créatine est-elle dangereuse ?', a: 'Non, la créatine est lun des suppléments les plus étudiés et les plus sûrs. Des millions de sportifs lutilisent worldwide.' },
      { q: 'La créatine fait-elle grossir ?', a: 'La créatine retient de leau dans les muscles (3-5% du poids corporel). Cest du poidshydratant, pas de lagraisse.' },
      { q: 'Quand prendre la créatine ?', a: 'Après lentraînement est idéal. Elle peut être prise à tout moment de la journée.' },
    ],
  },

  // ============ GAINERS ============
  {
    slug: 'gainers',
    name: 'Gainers',
    metaTitle: 'Gainer Tunisie | Mass Gainer Pas Cher',
    metaDescription: 'Gainer et mass gainer pour la prise de masse en Tunisie. Calories, protéines, glucides - livraison rapide. Prenez du muscle rapidement!',
    h1: 'Gainer Tunisie',
    shortIntro: `<h2>Gainer pour la prise de masse en Tunisie</h2>
<p>Vous avez du mal à prendre du poids ? Nos <strong>gainers en Tunisie</strong> sont la solution. Haute calorie, riche en protéines pour construire du muscle.</p>`,
    longBottomContent: `<h2>Choisir son gainer en Tunisie</h2>

<h3>Types de gainers</h3>
<ul>
<li><strong>Gainer haute énergie :</strong> 600-1200 kcal par dose. Pour les "hard gainers".</li>
<li><strong>Gainer riche en protéines :</strong> Plus de protéines, moins de calories. Pour une prise de masse sèche.</li>
<li><strong>Gainer équilibre :</strong> Le bon compromis entre calories et définition.</li>
</ul>

<h3>Comment utiliser le gainer</h3>
<ul>
<li><strong>Post-entraînement :</strong> Pour replenir les énergies</li>
<li><strong>Petit-déjeuner :</strong> Pour un apport calorique mattinal</li>
<li><strong>Avant le coucher :</strong> La caséine du gainer nourrit les muscles pendant la nuit</li>
</ul>

<h3>Erreurs à éviter</h3>
<ul>
<li>Ne pas sexercer : le gainer sans entraînement = prise de gras</li>
<li>Ne pas dépasser les doses recommandées</li>
<li>Ne pas remplacer les repas par des gainers</li>
</ul>

<h2>Nos gainers disponibles</h2>
<p>Livraison partout en Tunisie. Commandez sur protein.tn</p>`,
    primaryKeyword: 'gainer tunisie',
    secondaryKeywords: ['mass gainer tunisie', 'prise de masse tunisie', 'gainer pas cher tunisie'],
    faq: [
      { q: 'Le gainer fait-il grossir ?', a: 'Le gainer apporte beaucoup de calories. Utilisé avec un entraînement intensif, il aide à prendre du muscle. Sans exercice, il fait prendre de la gras.' },
      { q: 'Combien de gainer par jour ?', a: '1 à 2 doses maximum par jour selon vos besoins caloriques. Toujours combiné avec des repas normaux.' },
      { q: 'Gainer ou whey ?', a: 'Le gainer = calories + protéines. La whey = que des protéines. Utilisez les deux selon vos besoins.' },
    ],
  },

  // ============ BCAA ============
  {
    slug: 'bcaa',
    name: 'BCAA',
    metaTitle: 'BCAA Tunisie | Acides Aminés Pas Cher',
    metaDescription: 'BCAA et acides aminés en Tunisie. Améliorez votre récupération et préservez votre muscle. Livraison rapide dans tout le pays.',
    h1: 'BCAA Tunisie',
    shortIntro: `<h2>BCAA pour la musculation en Tunisie</h2>
<p>Les <strong>BCAA</strong> (Branch Chain Amino Acids) sont essentiels pour les sportifs. Они aident à la récupération et préviennent la dégradation musculaire.</p>`,
    longBottomContent: `<h2>Pourquoi prendre des BCAA en Tunisie ?</h2>

<h3>Les bénéfices des BCAA</h3>
<ul>
<li><strong>Préservation musculaire :</strong> Empêche le catabolisme pendant lentraînement</li>
<li><strong>Récupération rapide :</strong> Réduit les courbatures</li>
<li><strong>Plus dénergie :</strong> Réduit la fatigue pendant lexercice</li>
<li><strong>Anabolisme :</strong> Stimule la synthèse protéique</li>
</ul>

<h3>BCAA vs EAA</h3>
<ul>
<li><strong>BCAA :</strong> 3 acides aminés branchés (Leucine, Isoleucine, Valine)</li>
<li><strong>EAA :</strong> 9 acides aminés essentiels - plus complets</li>
</ul>

<h3>Quand prendre les BCAA ?</h3>
<ul>
<li><strong>Avant lentraînement :</strong> Pour protéger les muscles</li>
<li><strong>Pendant lentraînement :</strong> Pour maintenir lénergie</li>
<li><strong>Après lentraînement :</strong> Pour la récupération</li>
</ul>

<h2>Disponibilité en Tunisie</h2>
<p>Tous nos BCAA sont disponibles avec livraison rapide.</p>`,
    primaryKeyword: 'bcaa tunisie',
    secondaryKeywords: ['acides aminés tunisie', 'bcaa musculation tunisie', 'bcaa pas cher tunisie'],
    faq: [
      { q: 'Les BCAA sont-ils nécessaires ?', a: 'Si vous mangez suffisamment de protéines (2g/kg), les BCAA ne sont pas essentiels. Utiles en période de régime.' },
      { q: 'BCAA ou whey ?', a: 'La whey apporte tous les acides aminés. Les BCAA sont un complément ciblé pour la récupération.' },
      { q: 'Quel goût de BCAA choisir ?', a: 'Les BCAA sont disponibles en nombreux goûts. Le Tropical et les agrumes sont les plus populaires.' },
    ],
  },

  // ============ PRE-WORKOUT ============
  {
    slug: 'pre-workout',
    name: 'Pré-Workout',
    metaTitle: 'Pre Workout Tunisie | Booster Entraînement',
    metaDescription: 'Pre-workout et boosters dénergie en Tunisie. Maximisez vos séances avec nos stimulants de qualité. Livraison rapide.',
    h1: 'Pre Workout Tunisie',
    shortIntro: `<h2>Pre-Workout pour la musculation en Tunisie</h2>
<p>Boostez vos séances avec nos <strong>pré-workout en Tunisie</strong>. Plus dénergie, plus de concentration, plus de force pour vos entraînements.</p>`,
    longBottomContent: `<h2>Choisir son pre-workout</h2>

<h3>Les ingrédients clés</h3>
<ul>
<li><strong>Caféine :</strong> Lingredient star pour lénergie</li>
<li><strong>Creatine :</strong> Pour la force et le volume</li>
<li><strong>Bêta-alanine :</strong> Pour lendurance</li>
<li><strong>Citrulline :</strong> Pour la泵 musculaire</li>
<li><strong>Tyrosine :</strong> Pour la concentration</li>
</ul>

<h3>Comment utiliser le pre-workout</h3>
<ul>
<li><strong>Timing :</strong> 20-30 minutes avant lentraînement</li>
<li><strong>Dose :</strong> Commencer par une demi-dose pour tester</li>
<li><strong>Cycle :</strong> 4-8 semaines, puis pause</li>
</ul>

<h3>Précautions</h3>
<ul>
<li>Ne pas prendre le soir (perturbation du sommeil)</li>
<li>Ne pas dépasser les doses</li>
<li>Bien shydrater</li>
</ul>

<h2>Nos pre-workout disponibles</h2>
<p>Large choix en livraison nationale.</p>`,
    primaryKeyword: 'pre workout tunisie',
    secondaryKeywords: ['pré-entraînement tunisie', 'booster musculation tunisie', 'stimulant sport tunisie'],
    faq: [
      { q: 'Le pre-workout est-il dangereux ?', a: 'Utilisé selon les recommandations, il est sans danger. Attention aux personnes sensibles à la caféine.' },
      { q: 'Quel pre-workout choisir ?', a: 'Choisir selon vos objectifs: plus de force (plus de créatine) ou plus dénergie (plus de caféine).' },
      { q: 'Pre-workout tous les jours ?', a: 'Non, il est recommandé de faire des pauses pour éviter la tolérance.' },
    ],
  },

  // ============ FAT BURNER ============
  {
    slug: 'fat-burner',
    name: 'Fat Burner',
    metaTitle: 'Fat Burner Tunisie | Brûleur de Graisse',
    metaDescription: 'Fat burners et brûleurs de graisse en Tunisie. Perdez du poids efficacement avec nos supplements thermogéniques. Livraison rapide.',
    h1: 'Fat Burner Tunisie',
    shortIntro: `<h2>Fat Burner pour la perte de poids en Tunisie</h2>
<p>Nos <strong>fat burners en Tunisie</strong> vous aident à brûler plus de calories. Combinés à un régime et de lexercice, ils accélèrent vos résultats.</p>`,
    longBottomContent: `<h2>Comment fonctionne un fat burner ?</h2>

<h3>Mécanismes daction</h3>
<ul>
<li><strong>Thermogénèse :</strong> Augmente la température corporelle</li>
<li><strong>Lipolyse :</strong> Déclenche la dégradation des graisses</li>
<li><strong>Apportit :</strong> Réduit la faim</li>
<li><strong>Énergie :</strong> Maintient le métabolisme actif</li>
</ul>

<h3>Les ingrédients efficaces</h3>
<ul>
<li><strong>Caféine :</strong> Le plus incontourn able</li>
<li><strong>L-Carnitine :</strong> Transporte les graisses vers les muscles</li>
<li><strong>Extrait de thé vert :</strong> Thermogénique naturel</li>
<li><strong>Forskoline :</strong> Active la lipolyse</li>
</ul>

<h3>Comment lutiliser</h3>
<ul>
<li><strong>Matin :</strong> Pour boost Metabolism</li>
<li><strong>Avant lentraînement :</strong> Pour plus dénergie</li>
<li><strong>Ne pas prendre après 16h :</strong> Perturbe le sommeil</li>
</ul>

<h2>Résultat attendu</h2>
<p>Le fat burner seul ne fait pas maigrir. Il aide à brûle 100-200 kcal de plus par jour. Régime + exercice + fat burner = résultats.</p>`,
    primaryKeyword: 'fat burner tunisie',
    secondaryKeywords: ['brûleur de graisse tunisie', 'thermogènique tunisie', 'cla tunisie'],
    faq: [
      { q: 'Le fat burner fonctionne-t-il vraiment ?', a: 'Les fat burners aident à brûle plus dargent mais nécessitent un régime et un exercice pour fonctionner.' },
      { q: 'Effets secondaires des fat burners ?', a: 'Nervosité, insomnie, palpitations possibles. Respecter les dosages et ne pas prendre le soir.' },
      { q: 'Combien de temps utiliser un fat burner ?', a: 'Cycle de 8-12 semaines avec pause de 4 semaines. Le corps saccoutume.' },
    ],
  },

  // ============ L-CARNITINE ============
  {
    slug: 'l-carnitine',
    name: 'L-Carnitine',
    metaTitle: 'L-Carnitine Tunisie | Brûleur de Graisse',
    metaDescription: 'L-Carnitine pour la perte de poids et lendurance en Tunisie. Transportez vos graisses vers lénergie. Livraison rapide.',
    h1: 'L-Carnitine Tunisie',
    shortIntro: `<h2>L-Carnitine en Tunisie</h2>
<p>La <strong>L-Carnitine</strong> est un acide aminé qui aide à utiliser les graisses comme énergie. Idéale pour la sèche et lendurance.</p>`,
    longBottomContent: `<h2>À quoi sert la L-Carnitine ?</h2>

<h3>Mécanisme daction</h3>
<p>La L-Carnitine transporte les acides gras vers les mitochondries (usine énergétique des cellules) pour être brûl és comme énergie.</p>

<h3>Bienfaits</h3>
<ul>
<li><strong>Perte de poids :</strong> Aide à utiliser les graisses</li>
<li><strong>Endurance :</strong> Améliore le temps jusquà lépuisement</li>
<li><strong>Récupération :</strong> Réduit les dommages musculaires</li>
<li><strong>Santé cardiaque :</strong> Améliore la fonction cardiaque</li>
</ul>

<h3>Quand prendre la L-Carnitine ?</h3>
<ul>
<li><strong>30 minutes avant lentraînement :</strong> Pour utiliser les graisses comme énergie</li>
<li><strong>Le matin à jeun :</strong> Pour maximiser lutilisation des graisses</li>
</ul>

<h3>Dosage recommandé</h3>
<p>2-5g par jour selon votre poids et objectifs.</p>`,
    primaryKeyword: 'l-carnitine tunisie',
    secondaryKeywords: ['carnitine musculation tunisie', 'l-carnitine perte de poids tunisie'],
    faq: [
      { q: 'La L-Carnitine fait-elle maigrir ?', a: 'Elle aide le corps à utiliser les graisses comme énergie. Résultats optimaux combiné avec exercice.' },
      { q: 'Quelle forme de L-Carnitine choisir ?', a: 'La forme L-Carnitine Tartrate est la plus étudiée pour les sportifs. La forme Liposomal meilleure absorption.' },
    ],
  },

  // ============ GLUTAMINE ============
  {
    slug: 'glutamine',
    name: 'Glutamine',
    metaTitle: 'Glutamine Tunisie | Récupération Intestinale',
    metaDescription: 'L-Glutamine pour la récupération intestinale et musculaire en Tunisie. Supplément essentiel pour les sportifs. Livraison rapide.',
    h1: 'Glutamine Tunisie',
    shortIntro: `<h2>Glutamine en Tunisie</h2>
<p>La <strong>L-Glutamine</strong> est le complément idéal pour la récupération. Elle soutient le système immunitaire et la réparation musculaire.</p>`,
    longBottomContent: `<h2>Pourquoi prendre de la glutamine ?</h2>

<h3>Bienfaits principaux</h3>
<ul>
<li><strong>Système immunitaire :</strong> Renforce les défenses naturelles</li>
<li><strong>Récupération intestinale :</strong> Répare la paroi intestinale</li>
<li><strong>Synthèse protéique :</strong: Aide à la construction musculaire</li>
<li><strong>Hydratation cellulaire :</strong> Améliore la récupération</li>
</ul>

<h3>Qui devrait prendre de la glutamine ?</h3>
<ul>
<li><strong>Sportifs intensifs :</strong> Entraînement quotidien</li>
<li><strong>Personnes stressées :</strong> Le stress épuise la glutamine</li>
<li><strong>Problèmes digestifs :</strong> Syndrome leaky gut</li>
</ul>

<h3>Dosage</h3>
<p>5-10g par jour, de préférence après lentraînement ou le soir.</p>`,
    primaryKeyword: 'glutamine tunisie',
    secondaryKeywords: ['l-glutamine tunisie', 'glutamine musculation tunisie'],
    faq: [
      { q: 'Quand prendre la glutamine ?', a: 'Après lentraînement ou avant le coucher. Peut aussi être prise le matin.' },
      { q: 'La glutamine est-elle nécessaire ?', a: 'Pour les sportifs intensifs, oui. Pour les incontournants occasionnels, une alimentation riche suffit.' },
    ],
  },

  // ============ SHAKER ============
  {
    slug: 'shakers-bouteilles-sportives',
    name: 'Shakers',
    metaTitle: 'Shaker Tunisie | Bouteille Sport',
    metaDescription: 'Shakers et bouteilles sportives en Tunisie. Préparez vos protéines où que vous soyez. Livraison rapide.',
    h1: 'Shaker Tunisie',
    shortIntro: `<h2>Shaker et accessoires de sport en Tunisie</h2>
<p>Préparez vos <strong>shakes protéinés</strong> facilement avec nos shakers de qualité. Indispensables pour tout sportif en Tunisie.</p>`,
    longBottomContent: `<h2>Choisir son shaker</h2>

<h3>Types de shakers</h3>
<ul>
<li><strong>Shaker classique :</strong> Boule ou ressort pour mélanger</li>
<li><strong>Shaker électrique :</strong> Mixeur intégré piles</li>
<li><strong>Shaker isolé :</strong> Garde votre shake frais</li>
</ul>

<h3>conseils dutilisation</h3>
<ul>
<li>Mettre le liquide en premier</li>
<li>Secouer vigoureusement pendant 15-20 secondes</li>
<li>Nettoyer après chaque utilisation</li>
</ul>

<h2>Pourquoi un shaker ?</h2>
<p>Indispensable pour préparer whey, gainer, BCAA. Le shaker permet un mélange optimal sans grumeaux.</p>`,
    primaryKeyword: 'shaker tunisie',
    secondaryKeywords: ['bouteille sport tunisie', 'shaker gym tunisie', 'accessoire musculation tunisie'],
    faq: [
      { q: 'Le shaker est-il vraiment nécessaire ?', a: 'Il facilite la préparation des shakes. Vous pouvez aussi utiliser un blender ou un thérapeut.' },
      { q: 'Comment nettoyer son shaker ?', a: 'Laver à leau chaude savonneuse après chaque utilisation. Laisser sécher ouvert.' },
    ],
  },

  // ============ BANDES DE SOUTIEN ============
  {
    slug: 'bandes-de-soutien-musculaire',
    name: 'Bandes de Soutien Musculaire',
    metaTitle: 'Bandes de Soutien Musculaire Tunisie | Compression',
    metaDescription: 'Bandes de soutien et de compression pour la récupération et le soutien articulaire en Tunisie. Qualité professionnelle.',
    h1: 'Bandes de Soutien Musculaire Tunisie',
    shortIntro: `<h2>Bandes de soutien en Tunisie</h2>
<p>Nos <strong>bandes de soutien musculaire</strong> offrent compression et soutien pour vos articulations et muscles. Idéales pour la récupération.</p>`,
    longBottomContent: `<h2>Utiliser les bandes de soutien</h2>

<h3>Quand les utiliser ?</h3>
<ul>
<li><strong>Après entraînement :</strong> Pour réduire le gonflement</li>
<li><strong>Entraînement :</strong> Pour soutenir une articulation fragile</li>
<li><strong>Récupération :</strong> Pour accélérer la guérison</li>
</ul>

<h3>Types de bandes</h3>
<ul>
<li><strong>Bandes de compression :</strong> Pour réduire le gonflement</li>
<li><strong>Bandes de soutien :</strong> Pour stabiliser une articulation</li>
<li><strong>Bandes élastique :</strong> Pour la chaleur et le maintien</li>
</ul>

<h3>Comment les appliquer ?</h3>
<p>Envelopper la zone à soutenir sans trop serrer. La circulation doit rester libre.</p>`,
    primaryKeyword: 'bandes de soutien tunisie',
    secondaryKeywords: ['bandage musculation tunisie', 'support articulaire tunisie', 'bandes compression tunisie'],
    faq: [
      { q: 'Comment utiliser les bandes de soutien ?', a: 'Enrouler autour de larticulation ou du muscle. Ne pas trop serrer pour permettre la circulation.' },
      { q: 'Combien de temps porter une bande ?', a: '2-6 heures maximum. Ne pas porter la nuit sauf avis médical.' },
    ],
  },
];

export function getSeoTemplateForCategory(slug: string): CategorySeoTemplate | undefined {
  const normalizedSlug = slug.toLowerCase().replace(/[-\s]+/g, '-');
  return categorySeoTemplates.find(t => t.slug === normalizedSlug);
}

export function getAllTemplateSlugs(): string[] {
  return categorySeoTemplates.map(t => t.slug);
}