# Reviews: query rules (aggregate & listing)

Seeded reviews are stored with `publier = 1` and are **real** customer reviews for UI/UX and rating distribution testing.

## Rules

- **Listing reviews**  
  Always use the `reviews` relation on `Product`, which is scoped to **published** reviews only (`publier = 1`):
  - `Product::reviews()` in `App\Models\Product` uses `where('publier', 1)`.
  - The API loads reviews via `->with(['reviews.user' => ...])` on the product; only published reviews are included.

- **Aggregate rating**  
  When computing average rating or counts (e.g. for product cards or detail page), use only **published** reviews:
  - Either use the `reviews` relation (already filtered):  
    `$product->reviews()->avg('stars')`, `$product->reviews()->count()`.
  - Or explicitly filter: `Review::where('product_id', $id)->where('publier', 1)->avg('stars')`.
  - Do **not** use `allReviews()` or unfiltered `Review::where(...)` for display or aggregates.

- **Seeder**  
  `ReviewsSeeder` sets `publier = 1` for every inserted review so they are treated as real and included in listing and aggregates.

## Run the seeder

In production, use `--force` to skip the confirmation prompt:

```bash
docker exec sobitas-voyager-backend php artisan db:seed --class=ReviewsSeeder --force
```

Or run all seeders:

```bash
docker exec sobitas-voyager-backend php artisan db:seed --force
```
