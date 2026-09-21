# Repo-authored product copy

Every `*.json` file here is an object keyed by **product slug**. The cloud SEO routine writes
entries; `php artisan seo:products-apply-copy --apply` (vps-run task `seo-copy-apply`, queued
automatically by the land workflow) applies them to the catalogue through the model, so the page
is revalidated, the sitemap refreshed and the URL pinged to IndexNow.

Rules the command enforces (see `app/Console/Commands/SeoProductsApplyCopy.php`):

- additive and idempotent — content is never shrunk, a second run is a no-op;
- `append_html` lands inside a keyed block the next entry with the same `block_key` can replace;
- `meta_title` (≤ 70) / `meta_description` (≤ 170) fill empty columns only unless `"force": true`;
- `faq` pairs merge by question; existing pairs are kept;
- unknown or unpublished slugs are reported and skipped.

Name files by date (`2026-09-22.json`); later files win on the same slug. Keep an entry's
`why` line — it is the audit trail (which query / which GSC number motivated it).

```json
{
  "creatine-monohydrate-300g-ostrovit": {
    "meta_title": "Creatine Monohydrate 300 g Ostrovit – Prix Tunisie | Protein.tn",
    "meta_description": "Créatine monohydrate pure Ostrovit 300 g : 5 g par jour, force et volume. Prix Tunisie, livraison 24-72 h, paiement à la livraison.",
    "append_html": "<h2>Pourquoi choisir la créatine Ostrovit</h2><p>…</p>",
    "block_key": "guide",
    "faq": [{ "q": "Quand prendre la créatine ?", "a": "…" }],
    "why": "GSC 28d: 'creatine ostrovit' 140 impr, pos 6.8, CTR 1.1% — House Nutrition #1"
  }
}
```
