# Category SEO content

One JSON file per category or subcategory slug: `{slug}.json`.

## Schema

See `src/types/categorySeo.ts` for the full type. Example:

```json
{
  "h1": "Protéines en poudre – Guide d'achat Tunisie",
  "intro": "Les protéines en poudre sont parmi les compléments les plus utilisés... (400-800 mots recommandés)",
  "howToChooseTitle": "Comment choisir sa protéine ?",
  "howToChooseBody": "1. Objectif (prise de masse, sèche, récupération)\n2. Type (whey, isolate, végétale)\n3. Prix au kg...",
  "faqs": [
    { "question": "Quelle protéine pour débutant ?", "answer": "Une whey classique convient..." },
    { "question": "Combien de grammes par jour ?", "answer": "En général 1,6 à 2,2 g/kg..." }
  ],
  "relatedCategorySlugs": ["creatine", "bcaa", "gainer", "vitamines"],
  "bestProductSlugs": ["whey-protein-1kg", "isolate-900g", "whey-gold-standard"]
}
```

- **Slug**: must match the category or subcategory slug from the API (e.g. `proteines`, `whey-protein`).
- **Related categories**: 3–6 slugs of other categories/subcategories.
- **Best products**: 3–6 product slugs from this category (or subcategory).

## Editing

Edit or create `content/categories/{slug}.json` manually.

## Deployment

Content is read at request time from the filesystem. On serverless (e.g. Vercel), ensure these JSON files are part of the deployment (they live in the repo).
