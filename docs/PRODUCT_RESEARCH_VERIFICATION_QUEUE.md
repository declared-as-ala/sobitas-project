# Product research verification queue

Last reviewed: 2026-08-30

This queue is deliberately not imported. It contains popular, in-stock products for which the
manufacturer page does not yet prove that the formula on Protein.tn is the same variant. Publishing
a plausible but mismatched nutrition panel is worse than leaving the panel empty.

## C4 Original Pre-Workout - Cellucor

- Protein.tn slug: `c4-original-pre-workout-cellucor`
- Homepage placement: flash sale
- Current Cellucor US documentation describes a newer formula with 200 mg caffeine and 2 g
  CarnoSyn.
- Existing Protein.tn copy refers to a 150 mg caffeine formula, which indicates an older or regional
  label.
- Required evidence: a clear nutrition-label photo, GTIN, net weight and flavour from the exact pot
  held in stock. Do not import the current US panel until these match.

## 100% Pure Whey 2.27 kg - BioTechUSA

- Protein.tn slug: `100-pure-whey-2-27kg-biotech-usa`
- Homepage placement: new products
- Protein.tn offers more than one flavour and already has a nutrition image, while the manufacturer
  has renewed the product line and its current official pages do not expose a stable, exact 2.27 kg
  panel for every listed flavour.
- Required evidence: GTIN plus readable label photos for each flavour sold. Transcribe each flavour
  separately or store only values proven identical across all variants.

## Next audit pass

Run `php artisan seo:health-report --limit=50` on production. The report now scopes the main gaps to
products that are published and genuinely in stock, and prints a separate priority list for best
sellers, new products and promotions missing `nutrition_facts`.
