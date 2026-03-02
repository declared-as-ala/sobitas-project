# SEO Checklist – Whey & Créatine (Page 1 / Top 3)

Objectif : faire ranker les pages catégorie **whey** et **créatine** en première page (idéalement Top 3) pour les requêtes cibles, sans casser filtres, pagination ou panier.

---

## PART 1 – Pages cibles et contenu

### Whey Protein
- **URL** : `https://protein.tn/category/proteine-whey` (slug API utilisé par le backend)
- **H1** : « Whey Protein en Tunisie – Meilleur Prix & Livraison Rapide »
- **Meta title** (≤ 60 car.) : « Whey Protein Tunisie – Prix & Livraison Rapide | Protein.tn »
- **Meta description** : whey protein, Tunisie, prix, livraison, produits originaux (≤ 160 car.)
- **Contenu** : 800–1200 mots (Qu’est-ce que la whey, Pourquoi, Types, Comment choisir, Quand prendre, Prix, Livraison, FAQ 4–6)
- **Fichier** : `content/categories/whey-protein.json`
- **Alias contenu** : slug URL `proteine-whey` → fichier `whey-protein.json` (dans `categorySeoContent.ts`)

### Créatine
- **URL** : `https://protein.tn/category/creatine`
- **H1** : « Créatine en Tunisie – Meilleurs Prix & Livraison Rapide »
- **Meta title** (≤ 60 car.) : « Créatine Tunisie – Prix, Livraison | Protein.tn »
- **Meta description** : créatine, Tunisie, livraison, paiement, produits authentiques (≤ 160 car.)
- **Contenu** : 800–1200 mots + FAQ (déjà en place)
- **Fichier** : `content/categories/creatine.json`

---

## PART 2 – Schémas (Rich Results)

Sur chaque page catégorie :
- **BreadcrumbList** : Accueil > Catégorie (URL canoniques)
- **ItemList** : liste des produits (position, url, name)
- **FAQPage** : questions/réponses visibles sur la page (JSON-LD aligné au contenu)

Vérification : [Test des résultats enrichis](https://search.google.com/test/rich-results) avec l’URL de la page.

---

## PART 3 – Liens internes

### Accueil
- Lien **whey protein** vers `/category/proteine-whey`
- Lien **créatine en Tunisie** vers `/category/creatine`

### Blog
- Articles whey : ancres « whey protein tunisie », « acheter whey en tunisie », « meilleure whey protein » → `/category/proteine-whey`
- Articles créatine : ancres « créatine en Tunisie », « créatine monohydrate » → `/category/creatine`
- Config : `src/config/blogSeoConfig.ts` + blocs automatiques dans `ArticleDetailClient` selon mots-clés

### Fiches produit
- Bloc **« Complétez avec la créatine »** si le produit n’est pas en catégorie créatine → `/category/creatine`
- Bloc **« Complétez avec la whey protein »** si le produit n’est pas whey/protéine → `/category/proteine-whey`

### Catégories associées
- Dans le contenu SEO (whey / créatine) : `relatedCategorySlugs` vers créatine, whey, BCAA, prise de masse, etc.

---

## PART 4 – CTR (titres)

Pattern : **Mot-clé + Bénéfice + Tunisie + Marque**

- Whey : « Whey Protein Tunisie – Meilleur Prix & Livraison Rapide | Protein.tn »
- Créatine : « Créatine Tunisie – Prix, Livraison | Protein.tn »

Les titres sont tronqués à 60 caractères côté code si besoin.

---

## PART 5 – Performance (catégories)

- **Images** : `ProductCard` avec `aspect-square`, `loading="lazy"`, `sizes` adaptés
- **Contenu long** : bloc SEO sous la grille (header + H1 au-dessus, contenu + FAQ en dessous des produits) pour limiter le scroll avant les produits
- **Layout** : pas de changement de structure qui impacterait filtres, pagination ou panier

---

## PART 6 – Google Search Console (monitoring)

### 1. Inspection d’URL
- **Inspection d’URL** → saisir l’URL exacte (ex. `https://protein.tn/category/creatine`, `https://protein.tn/category/proteine-whey`)
- Vérifier : page indexable, titre et meta description corrects
- Après mise à jour SEO : **Demander une indexation**

### 2. Performance
- **Performance** → **Recherche**
- Suivre les requêtes :
  - **Créatine** : creatine tunisie, créatine tunisie, creatine monohydrate tunisie
  - **Whey** : whey protein, whey, whey protein tunisie
- Suivre : **Impressions**, **CTR**, **Position moyenne**

### 3. Données structurées
- **Améliorations** (ou test des résultats enrichis) : vérifier BreadcrumbList, ItemList, FAQPage sans erreur

### 4. Audit local (script)
```bash
# Créatine
npm run seo-audit-category
# ou
node scripts/seo-audit-category.js creatine

# Whey (slug API = proteine-whey)
node scripts/seo-audit-category.js proteine-whey

# Contre la prod
BASE_URL=https://protein.tn node scripts/seo-audit-category.js creatine
BASE_URL=https://protein.tn node scripts/seo-audit-category.js proteine-whey
```

---

## Résumé des fichiers modifiés / utilisés

| Élément | Fichier / lieu |
|--------|-----------------|
| Contenu Whey | `content/categories/whey-protein.json` |
| Contenu Créatine | `content/categories/creatine.json` |
| Alias slug | `src/util/categorySeoContent.ts` (proteine-whey → whey-protein) |
| Liens internes blog | `src/app/blog/[slug]/ArticleDetailClient.tsx`, `src/config/blogSeoConfig.ts` |
| Liens internes home | `src/app/components/HomePageClient.tsx` |
| Liens internes fiche produit | `src/app/products/[id]/ProductDetailClient.tsx` |
| Schémas + meta | Page catégorie `src/app/category/[slug]/page.tsx` + `CategorySeoLanding.tsx` |
| Audit script | `scripts/seo-audit-category.js` |

---

## Critères d’acceptation

- [ ] Meta title ≤ 60 car. et contient le mot-clé principal (whey / créatine)
- [ ] Un seul H1 par page
- [ ] Canonical correct, pas de noindex
- [ ] BreadcrumbList + ItemList + FAQPage valides (test résultats enrichis)
- [ ] Au moins 3 types de pages (home, blog, produit) envoient des liens internes vers whey et créatine
- [ ] Filtres, pagination et panier inchangés
- [ ] Mobile : contenu lisible, grille produits visible sans scroll excessif
