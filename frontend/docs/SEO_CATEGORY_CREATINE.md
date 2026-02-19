# SEO – Catégorie Créatine (/category/creatine)

Ce document décrit les contrôles SEO pour la page **Créatine** et comment vérifier les résultats dans Google Search Console.

## Audit local (script)

Après déploiement ou en local avec le serveur démarré :

```bash
# Audit de la page /category/creatine (par défaut)
npm run seo-audit-category

# Avec un slug différent
node scripts/seo-audit-category.js proteine-whey

# Contre la prod
BASE_URL=https://protein.tn node scripts/seo-audit-category.js creatine
```

Le script vérifie :

- **HTTP 200** pour l’URL de la catégorie
- **Meta title** : longueur 30–60 caractères, présence du mot-clé principal (ex. créatine)
- **Meta description** : présente, idéalement ≤ 160 caractères
- **Canonical** : balise présente et cohérente
- **Un seul H1** sur la page
- **Pas de noindex**
- **Schémas JSON-LD** : BreadcrumbList, ItemList, FAQPage (pour creatine)

## Vérification dans Google Search Console

1. **Inspection d’URL**
   - Aller dans **Inspection d’URL**.
   - Saisir : `https://protein.tn/category/creatine`.
   - Vérifier que la page est « indexable » et que le titre / la meta description affichés correspondent à ceux prévus.
   - Après un déploiement avec changements SEO : utiliser **Demander une indexation** pour accélérer la reprise.

2. **Performance**
   - **Performance** → **Recherche**.
   - Filtrer ou regarder les **Requêtes** contenant par exemple : `creatine tunisie`, `créatine tunisie`, `creatine monohydrate tunisie`, `acheter creatine tunisie`, `prix creatine tunisie`.
   - Suivre l’**évolution des impressions**, du **CTR** et de la **position moyenne** après les optimisations.

3. **Données structurées**
   - Utiliser le [test des résultats enrichis](https://search.google.com/test/rich-results) avec l’URL `https://protein.tn/category/creatine`.
   - Vérifier que **Fil d’Ariane**, **Liste de produits** (ItemList) et **FAQ** (FAQPage) sont détectés sans erreur.

## Objectifs de positionnement

- **Cibles** : Page 1 (idéalement Top 3) pour :
  - creatine tunisie
  - créatine tunisie
  - creatine monohydrate tunisie
  - acheter creatine tunisie
  - prix creatine tunisie

## Liens internes vers /category/creatine

- **Accueil** : lien « créatine en Tunisie » dans le sous-titre.
- **Blog** : bloc « Acheter de la créatine en Tunisie » sur les articles liés à la créatine.
- **Fiche produit** (whey, gainer, etc.) : bloc « Complétez avec la créatine en Tunisie ».
- **Catégories associées** : liens dans le contenu SEO de la page créatine (whey, BCAA, pre-workout, etc.).

## Contenu éditable

Le contenu SEO de la catégorie (titre, H1, intro, FAQ, etc.) est géré via :

- Fichier : `content/categories/creatine.json`
- Champs principaux : `h1`, `metaTitle`, `metaDescription`, `intro`, `howToChooseTitle`, `howToChooseBody`, `faqs`, `relatedCategorySlugs`, `bestProductSlugs`, `ogImage` (optionnel).

Modifier ce fichier et redéployer pour mettre à jour le texte sans toucher au code.
