<?php

namespace App\Console\Commands;

use App\Models\Article;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

/**
 * Seeds a first batch of ORIGINAL French SEO blog articles for the master-plan's priority topics
 * (whey / créatine / prise de masse — "… Tunisie"). Content is hand-written and genuinely useful
 * (not mass-generated filler), with internal links to the shop hubs. Idempotent: skips existing
 * slugs unless --force. Only writes columns that actually exist on the `articles` table, so it can't
 * error on schema drift. Run on the server:
 *   php artisan blog:seed-articles           # create missing
 *   php artisan blog:seed-articles --force   # also refresh existing
 */
class SeedBlogArticles extends Command
{
    protected $signature = 'blog:seed-articles {--force : Overwrite articles whose slug already exists}';

    protected $description = 'Seed a first batch of SEO blog articles (whey / créatine / prise de masse en Tunisie)';

    public function handle(): int
    {
        $force = (bool) $this->option('force');
        $written = 0;
        $skipped = 0;

        foreach ($this->articles() as $article) {
            $existing = Article::where('slug', $article['slug'])->first();

            if ($existing && ! $force) {
                $skipped++;
                $this->line("  · skip {$article['slug']} (exists)");

                continue;
            }

            // Never write a column the live table doesn't have.
            $payload = array_filter(
                $article,
                fn (string $key) => Schema::hasColumn('articles', $key),
                ARRAY_FILTER_USE_KEY
            );

            if ($existing) {
                $existing->fill($payload)->save();
                $this->info("  · updated {$article['slug']}");
            } else {
                Article::create($payload);
                $this->info("  · created {$article['slug']}");
            }
            $written++;
        }

        $this->newLine();
        $this->info("Done. written={$written} skipped={$skipped}. Add cover images in Filament → Articles.");

        return self::SUCCESS;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function articles(): array
    {
        return [
            [
                'designation_fr' => 'Quelle whey protéine choisir en Tunisie ? Le guide complet',
                'slug' => 'quelle-whey-proteine-choisir-tunisie',
                'publier' => 1,
                'meta_title' => 'Quelle whey choisir en Tunisie ? Guide complet 2026 | Protéine Tunisie',
                'seo_title' => 'Quelle whey choisir en Tunisie ? Guide complet 2026 | Protéine Tunisie',
                'meta_description_fr' => 'Concentrée, isolate ou hydrolysée : le guide pour choisir la bonne whey protéine en Tunisie selon votre objectif, votre budget et votre digestion.',
                'seo_description' => 'Concentrée, isolate ou hydrolysée : le guide pour choisir la bonne whey protéine en Tunisie selon votre objectif, votre budget et votre digestion.',
                'description_fr' => $this->wheyBody(),
                'description' => $this->wheyBody(),
            ],
            [
                'designation_fr' => 'Créatine : bienfaits, dosage et comment bien la choisir',
                'slug' => 'creatine-bienfaits-dosage-guide',
                'publier' => 1,
                'meta_title' => 'Créatine : bienfaits, dosage et guide d\'achat | Protéine Tunisie',
                'seo_title' => 'Créatine : bienfaits, dosage et guide d\'achat | Protéine Tunisie',
                'meta_description_fr' => 'La créatine monohydrate expliquée simplement : bienfaits prouvés, dosage (3–5 g/jour), phase de charge et comment la choisir en Tunisie.',
                'seo_description' => 'La créatine monohydrate expliquée simplement : bienfaits prouvés, dosage (3–5 g/jour), phase de charge et comment la choisir en Tunisie.',
                'description_fr' => $this->creatineBody(),
                'description' => $this->creatineBody(),
            ],
            [
                'designation_fr' => 'Prise de masse : le guide pour débuter en Tunisie',
                'slug' => 'prise-de-masse-guide-debutant-tunisie',
                'publier' => 1,
                'meta_title' => 'Prise de masse : guide débutant (gainer, whey, créatine) | Protéine Tunisie',
                'seo_title' => 'Prise de masse : guide débutant (gainer, whey, créatine) | Protéine Tunisie',
                'meta_description_fr' => 'Surplus calorique, choix du gainer, whey et créatine : le guide simple pour prendre de la masse musculaire quand on débute, adapté à la Tunisie.',
                'seo_description' => 'Surplus calorique, choix du gainer, whey et créatine : le guide simple pour prendre de la masse musculaire quand on débute, adapté à la Tunisie.',
                'description_fr' => $this->priseDeMasseBody(),
                'description' => $this->priseDeMasseBody(),
            ],
        ];
    }

    private function wheyBody(): string
    {
        return <<<'HTML'
<p>La whey protéine est le complément le plus utilisé en musculation, et pour une bonne raison : c'est une source de protéines rapide, complète et pratique pour atteindre ses besoins quotidiens. Mais entre concentrée, isolate et hydrolysée, comment choisir la bonne whey en Tunisie ? Voici l'essentiel.</p>
<h2>Concentrée, isolate ou hydrolysée : quelle différence ?</h2>
<p>La <strong>whey concentrée</strong> contient environ 70 à 80 % de protéines, un peu de glucides et de lipides. C'est le meilleur rapport qualité/prix et le choix idéal pour la majorité des sportifs.</p>
<p>La <strong>whey isolate</strong> est filtrée plus finement (85 à 90 % de protéines, très peu de lactose). Elle convient si vous digérez mal le lactose ou si vous êtes en période de sèche et surveillez chaque calorie.</p>
<p>La <strong>whey hydrolysée</strong> est « pré-digérée » pour une absorption encore plus rapide. Elle est plus chère et rarement indispensable pour un pratiquant amateur.</p>
<h2>Comment choisir selon votre objectif</h2>
<ul>
<li><strong>Prise de masse ou entretien :</strong> une whey concentrée de qualité suffit largement.</li>
<li><strong>Sèche / perte de poids :</strong> privilégiez une isolate, pauvre en glucides et lipides.</li>
<li><strong>Digestion sensible au lactose :</strong> isolate ou hydrolysée.</li>
</ul>
<h2>Comment bien lire l'étiquette</h2>
<p>Regardez la quantité de protéines <em>par dose</em> (visez 20 à 25 g), la liste des ingrédients (plus elle est courte, mieux c'est) et la marque. Chez SOBITAS, toutes nos <a href="/whey-proteine">whey protéines</a> sont 100 % authentiques, importées des grandes marques internationales.</p>
<h2>Quand et combien en prendre ?</h2>
<p>Un objectif simple : environ 1,6 à 2 g de protéines par kilo de poids de corps et par jour, en comptant l'alimentation. La whey sert à <em>compléter</em> ce total — typiquement après l'entraînement ou en collation. Une à deux doses par jour suffisent dans la plupart des cas.</p>
<p>Prêt à faire votre choix ? Découvrez notre sélection de <a href="/whey-proteine">whey protéine</a> et l'ensemble de nos <a href="/shop">compléments alimentaires</a>, avec livraison rapide partout en Tunisie et paiement à la livraison.</p>
HTML;
    }

    private function creatineBody(): string
    {
        return <<<'HTML'
<p>La créatine est l'un des rares compléments dont l'efficacité est solidement démontrée par la science. Simple, économique et sûre, elle aide à progresser en force et en volume. Voici comment bien l'utiliser.</p>
<h2>À quoi sert la créatine ?</h2>
<p>La créatine augmente les réserves d'énergie rapidement disponibles dans le muscle. Concrètement, cela se traduit par de meilleures performances sur les efforts courts et intenses (séries de musculation, sprints) et, à terme, une meilleure progression en force et en masse musculaire.</p>
<h2>Quelle forme choisir ?</h2>
<p>La <strong>créatine monohydrate</strong> est la référence : c'est la forme la plus étudiée, la plus efficace et la moins chère. Les labels « Creapure » garantissent une pureté élevée. Les formes « exotiques » (HCl, kre-alkalyn…) sont plus chères sans avantage prouvé pour la majorité des utilisateurs.</p>
<h2>Dosage : faut-il une phase de charge ?</h2>
<ul>
<li><strong>Méthode simple :</strong> 3 à 5 g par jour, tous les jours, sans phase de charge. Les réserves se remplissent en 3 à 4 semaines.</li>
<li><strong>Avec phase de charge (optionnelle) :</strong> 20 g/jour répartis en 4 prises pendant 5–7 jours, puis 3–5 g/jour en entretien.</li>
</ul>
<p>Le moment de la prise a peu d'importance : l'essentiel est la régularité, y compris les jours de repos.</p>
<h2>Est-ce sans danger ?</h2>
<p>Chez une personne en bonne santé, la créatine monohydrate est l'un des compléments les mieux tolérés. Pensez simplement à boire suffisamment d'eau. En cas de problème rénal ou de doute, demandez l'avis d'un professionnel de santé.</p>
<p>Découvrez notre sélection de <a href="/creatine">créatine</a> 100 % authentique, ainsi que nos <a href="/whey-proteine">whey protéines</a> pour compléter votre routine — livraison rapide partout en Tunisie.</p>
HTML;
    }

    private function priseDeMasseBody(): string
    {
        return <<<'HTML'
<p>Prendre de la masse musculaire quand on débute peut sembler compliqué. En réalité, tout repose sur trois piliers simples : manger un peu plus, s'entraîner régulièrement et récupérer. Voici un guide clair pour bien démarrer.</p>
<h2>1. Le surplus calorique, la base de tout</h2>
<p>Pour construire du muscle, il faut apporter à votre corps un peu plus d'énergie qu'il n'en dépense. Visez un surplus modéré (environ 250 à 400 calories au-dessus de votre maintien) pour prendre du muscle en limitant la prise de gras.</p>
<h2>2. Assez de protéines</h2>
<p>Comptez environ 1,6 à 2 g de protéines par kilo de poids de corps et par jour. Si votre alimentation ne suffit pas, une <a href="/whey-proteine">whey protéine</a> est un moyen simple et pratique de compléter, surtout autour de l'entraînement.</p>
<h2>3. Le gainer, pour ceux qui ont du mal à manger</h2>
<p>Si vous êtes de nature mince (« ectomorphe ») et que manger assez est difficile, un <a href="/gainers-proteines">gainer</a> apporte protéines et glucides en une boisson pratique. Ce n'est pas obligatoire, mais c'est un vrai coup de pouce quand l'appétit manque.</p>
<h2>4. La créatine pour progresser en force</h2>
<p>La <a href="/creatine">créatine monohydrate</a> (3 à 5 g par jour) est le complément le plus efficace pour soutenir la force et le volume — un excellent complément de la whey et du gainer.</p>
<h2>5. L'entraînement et la récupération</h2>
<p>Entraînez-vous 3 à 4 fois par semaine en privilégiant les exercices de base (squat, développé couché, tirage, soulevé de terre) et la progression des charges. Dormez suffisamment : le muscle se construit au repos, pas seulement à la salle.</p>
<p>Pour aller plus loin, explorez nos catégories <a href="/prise-de-masse">prise de masse</a> et <a href="/shop">tous nos compléments</a> — produits authentiques, livraison rapide partout en Tunisie et paiement à la livraison.</p>
HTML;
    }
}
