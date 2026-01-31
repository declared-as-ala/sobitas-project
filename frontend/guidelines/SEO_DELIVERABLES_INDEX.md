# SEO Deliverables Index – protein.tn / SOBITAS

Quick reference to what was produced and where it lives.

---

## 1) Keyword Research & Mapping

- **File:** `src/data/keywords-seo-tunisie.json`
- **Plan detail:** `guidelines/SEO_PLAN_PROTEIN_TN.md` § 1  
- Contains: primary/secondary/informational keywords, intent, clusters (protéines/whey, créatine, prise de masse, local).

---

## 2) On-Page SEO (Meta Titles & Descriptions)

- **Implemented in:**  
  - `src/app/layout.tsx` – default title/description + template `"%s | SOBITAS Tunisie"`  
  - `src/app/page.tsx` – accueil (Protéine Tunisie | Whey, Créatine & Compléments – SOBITAS Sousse)  
  - `src/app/shop/page.tsx` – boutique  
  - `src/app/packs/page.tsx` – packs  
  - `src/app/blog/page.tsx` – blog  
  - `src/app/about/page.tsx` – à propos  
  - `src/app/contact/page.tsx` – contact  
  - `src/app/brands/page.tsx` – marques  
  - `src/app/faqs/page.tsx` – FAQ  
  - `src/app/calculators/page.tsx` – calculateurs  
  - `src/app/products/[id]/page.tsx` – `generateMetadata` par produit  
  - `src/app/blog/[slug]/page.tsx` – `generateMetadata` par article  

- **Slugs / Hn:** voir `guidelines/SEO_PLAN_PROTEIN_TN.md` § 2 (slugs conseillés, structures H1/H2/H3).

---

## 3) Technical SEO & Structured Data

- **Sitemap:** `src/app/sitemap.ts`  
  - Génère `/sitemap.xml`  
  - Pages statiques + URLs produits (`/products/[slug]`) + articles (`/blog/[slug]`) via l’API.

- **Robots:** `src/app/robots.ts`  
  - Génère `/robots.txt`  
  - Allow `/`, disallow `/account`, `/checkout`, `/cart`, `/login`, `/register`, `/api/`, `/order-confirmation/`  
  - Référence `Sitemap: {BASE_URL}/sitemap.xml`.

- **Schema (JSON-LD):**  
  - **Organization + LocalBusiness + WebSite:** dans `src/app/layout.tsx` (scripts dans `<head>`).  
  - **Product:** dans `src/app/products/[id]/page.tsx` (fonction `buildProductJsonLd`, script en haut de la page).  
  - **FAQPage:** dans `src/app/faqs/page.tsx` (fonction `buildFAQPageSchema`, script si `faqs.length > 0`).

- **Performance / images:** déjà en place (Next Image, formats, lazy-load) ; rappels dans le plan § 3.

---

## 4) Content Strategy & Blog Plan

- **File:** `guidelines/SEO_PLAN_PROTEIN_TN.md` § 4  
- 12 articles avec titres, mots-clés cibles et intros/descriptions.  
- À rédiger dans le CMS / blog (300+ mots par intro, maillage interne vers shop/catégories/contact/FAQ).

---

## 5) Site Architecture & Internal Linking

- **File:** `guidelines/SEO_PLAN_PROTEIN_TN.md` § 5  
- Schéma Home → Shop / Packs / Blog / Marques / À propos / Contact / FAQ / Calculateurs.  
- Règles de maillage (depuis accueil, blog, fiches produit, footer).

---

## 6) Local SEO, Backlinks, Monitoring

- **Local SEO:** `guidelines/SEO_PLAN_PROTEIN_TN.md` § 6  
  - Google Business Profile (nom, catégories, description, NAP).  
  - Citations et avis locaux.

- **Backlinks & outreach:** `guidelines/SEO_PLAN_PROTEIN_TN.md` § 7  
  - 10 types de sites, exemple d’email d’outreach.

- **Suivi & KPIs:** `guidelines/SEO_PLAN_PROTEIN_TN.md` § 8  
  - GSC, GA4, positions, CTR, conversions, reporting.

---

## 7) Résumé des fichiers créés/modifiés

| Fichier | Rôle |
|--------|------|
| `guidelines/SEO_PLAN_PROTEIN_TN.md` | Plan SEO complet (keywords, on-page, technique, contenu, architecture, local, backlinks, KPIs). |
| `guidelines/SEO_DELIVERABLES_INDEX.md` | Ce fichier – index des livrables. |
| `src/data/keywords-seo-tunisie.json` | Liste de mots-clés structurée (JSON). |
| `src/app/sitemap.ts` | Génération dynamique du sitemap. |
| `src/app/robots.ts` | Génération du robots.txt. |
| `src/app/layout.tsx` | Schemas Organization, LocalBusiness, WebSite + meta par défaut. |
| `src/app/page.tsx` | Meta accueil (Tunisia-focused). |
| `src/app/shop/page.tsx` | Meta boutique. |
| `src/app/packs/page.tsx` | Meta packs. |
| `src/app/blog/page.tsx` | Meta blog. |
| `src/app/about/page.tsx` | Meta à propos. |
| `src/app/contact/page.tsx` | Meta contact. |
| `src/app/brands/page.tsx` | Meta marques. |
| `src/app/faqs/page.tsx` | Meta FAQ + schema FAQPage. |
| `src/app/calculators/page.tsx` | Meta calculateurs. |
| `src/app/products/[id]/page.tsx` | Meta + schema Product par produit. |

Pour toute stratégie détaillée (choix de mots-clés, calendrier de contenu, recommandations local/backlinks), se référer à `guidelines/SEO_PLAN_PROTEIN_TN.md`.
