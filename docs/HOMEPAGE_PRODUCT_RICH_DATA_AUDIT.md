# Homepage product rich-data audit

Live snapshot taken from `https://admin.protein.tn/api/accueil` on 30 August 2026 and compared with
`/whey-proteine/optimum-nutrition-platinum-hydro-whey-velocity-vanilla-16-kg`.

## Result

- 16 unique promoted products were returned by New products, Flash sales and Best sellers.
- 16/16 have the benchmark's core contract: effective SKU, cover, image alt, long description,
  brand, category and nutrition data.
- The benchmark's public SKU is its product id (`11223`), so an explicit barcode is not required for
  the same schema behaviour. The storefront contract is `sku -> code_product -> id`.
- The remaining gaps are enhancements, not invented facts: 12/16 currently need a structured FAQ
  and 11/16 need a second verified gallery image in production.
- The checked research bundle supplies exact-source FAQs for 14/16 promoted products when imported.
  `c4-original-pre-workout-cellucor` and `100-pure-whey-2-27kg-biotech-usa` remain deliberately
  blocked until the exact formula/flavour can be verified. A similar product's facts must not be
  copied onto them.

## Repeatable gate

Run:

```bash
php artisan products:homepage-rich-audit
```

Use `--strict` in a release check to fail only when core commerce data is missing. Gallery and FAQ
gaps stay visible as enrichment warnings. The non-strict audit also runs daily and writes to
`storage/logs/homepage-rich-audit.log`.
