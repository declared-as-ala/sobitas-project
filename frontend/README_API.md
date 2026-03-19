

## Endpoints called by the frontend

### GET (public)

1. `GET https://admin.protein.tn/api/accueil`
   - Input: none
   - Response (expected by frontend types):
     - `{ categories, last_articles, ventes_flash, new_product, packs, best_sellers }`
   - Each list item is a `Category`, `Article` or `Product` (see `frontend/src/types/index.ts`).

2. `GET https://admin.protein.tn/api/home`
   - Input: none
   - Response: same structure as `/accueil`.

3. `GET https://admin.protein.tn/api/categories?per_page&limit`
   - Input (optional): `per_page` (or `limit`)
   - Response: paginated categories, typically:
     - `{ data: Category[], meta, links }`

4. `GET https://admin.protein.tn/api/coordonnees`
   - Input: none
   - Response:
     - `Coordinate` object (cached on backend)

5. `GET https://admin.protein.tn/api/slides`
   - Input: optional `per_page` (or `limit`)
   - Response: paginated slides, each mapped by the frontend to:
     - `{ id, image, cover, titre, lien }` (see `getSlides()` in `frontend/src/services/api.ts`)
   - Backend also returns `{ data, meta, links }` (pagination).

6. `GET https://admin.protein.tn/api/media`
   - Input: none
   - Response: `any` (frontend expects an object/array and uses it as-is)

7. `GET https://admin.protein.tn/api/services`
   - Input: optional `per_page`/`limit`
   - Response: paginated `Service[]` (pattern `{ data, meta, links }`).

8. `GET https://admin.protein.tn/api/pages`
   - Input: optional `per_page`/`limit`
   - Response: paginated CMS pages:
     - `{ data: {id,title,slug}[], meta, links }`

9. `GET https://admin.protein.tn/api/page/{slug}`
   - Input: path param `slug`
   - Response: a `Page` object (single page)

10. `GET https://admin.protein.tn/api/faqs?per_page&limit`
   - Input: optional `per_page` (or `limit`)
   - Response: paginated FAQs (`{ data, meta, links }`)

11. `GET https://admin.protein.tn/api/seo_page/{name}`
   - Input: path param `name`
   - Response: `SeoPage` object

12. `GET https://admin.protein.tn/api/redirections`
   - Input: none
   - Response: `any[]`

13. Products listing / search

   13.1 `GET https://admin.protein.tn/api/all_products`
   - Input (query params, optional):
     - `per_page` (default 24), `page` (default 1)
     - `search`, `brand_id`, `min_price`, `max_price`, `sort`
   - Response (expected by frontend normalization):
     - `products`: array of `Product`
     - `brands`: array of `Brand`
     - `categories`: array of `Category`
     - `pagination` (optional): `{ total, current_page, per_page, last_page }`

   13.2 `GET https://admin.protein.tn/api/product_details/{slug}`
   - Input: path param `slug`
   - Response: `Product` object; backend may return `avis` which the frontend maps to `reviews`.

   13.3 `GET https://admin.protein.tn/api/productsByCategoryId/{slug}?per_page&...`
   - Input: path param `slug`
   - Response (expected by `fetchCategoryOrSubCategory()`):
     - For category route: `{ category, sous_categories, products, brands }`

   13.4 `GET https://admin.protein.tn/api/productsBySubCategoryId/{slug}?per_page&...`
   - Input: path param `slug`
   - Response (expected by `fetchCategoryOrSubCategory()`):
     - `{ sous_category, products, brands, sous_categories, pagination? }`

   13.5 `GET https://admin.protein.tn/api/productsByBrandId/{brand_id}`
   - Input: path param `brand_id`
   - Response:
     - `{ brand, categories, products }`

   13.6 `GET https://admin.protein.tn/api/searchProduct/{text}`
   - Input: path param `text`
   - Response: `{ products: Product[], brands: Brand[] }`

   13.7 `GET https://admin.protein.tn/api/searchProductBySubCategoryText/{slug}/{text}`
   - Input: `{ slug, text }`
   - Response: `{ products, brands }`

   13.8 `GET https://admin.protein.tn/api/similar_products/{sous_categorie_id}`
   - Input: `{ sous_categorie_id }`
   - Response: `{ products: Product[] }`

   13.9 “homepage” product lists
   - `GET /best_sellers` -> `{ best_sellers?: Product[] }` (frontend applies fallback to `/latest_products` if needed)
   - `GET /latest_products` -> `{ best_sellers?: Product[], new_product?, packs? }` (frontend uses it as fallback)
   - `GET /latest_packs`, `GET /new_product`, `GET /packs`, `GET /ventes_flash`
   - Each returns the relevant arrays; frontend reads:
     - `new_product`, `packs`, `best_sellers`, etc.

14. Blog (Articles)

   14.1 `GET https://admin.protein.tn/api/all_articles`
   - Input: none
   - Response:
     - `Article[]` OR `{ articles: Article[] }` (frontend normalizes)

   14.2 `GET https://admin.protein.tn/api/article_details/{slug}`
   - Input: path param `slug`
   - Response: `Article` object

   14.3 `GET https://admin.protein.tn/api/latest_articles`
   - Input: none
   - Response: `Article[]` OR `{ articles: Article[] }`

15. Auth (login/register requires POST; `/user` and `/profil` require auth)


### POST (public)

1. `POST https://admin.protein.tn/api/login`
   - Body:
     - `{ email: string, password: string }`
   - Response (`AuthResponse`):
     - `{ token: string, name: string, id: number }`

2. `POST https://admin.protein.tn/api/register`
   - Body:
     - `{ name: string, phone: string, email: string, password: string, role_id: number }`
       - Frontend sends `role_id` as required by its types; backend ignores/overrides role to default customer role.
   - Response: `{ token, name, id }`

3. `POST https://admin.protein.tn/api/contact`
   - Body (`ContactRequest`):
     - `{ name: string, email: string, message: string }`
   - Response:
     - `{ success: string }`

4. `POST https://admin.protein.tn/api/newsletter`
   - Body (`NewsletterRequest`):
     - `{ email: string }`
   - Response:
     - `{ success: string }` OR `{ error: string }`

5. `POST https://admin.protein.tn/api/add_review`
   - Body (expected by frontend):
     - `{ product_id: number, stars: number, comment?: string }`
   - Response: `Review`


### POST (authenticated with Sanctum)

1. `GET https://admin.protein.tn/api/user`
   - Headers:
     - `Authorization: Bearer <token>`
   - Response: `User`

2. `GET https://admin.protein.tn/api/profil`
   - Headers: `Authorization: Bearer <token>`
   - Response: `User` (subset: `id, name, email, phone`)

3. `POST https://admin.protein.tn/api/update_profile`
   - Headers: `Authorization: Bearer <token>`
   - Body:
     - `{ name?: string, phone?: string, email?: string, password?: string }`
   - Response: `{ id, name, email, phone }`

4. `GET https://admin.protein.tn/api/client_commandes?per_page&limit`
   - Headers: `Authorization: Bearer <token>`
   - Response paginated Orders:
     - `{ data: Order[], meta, links }`

5. `POST https://admin.protein.tn/api/detail_commande/{id}`
   - Headers: `Authorization: Bearer <token>`
   - Response:
     - `{ commande: Order, details: OrderDetail[] }`


### Checkout / Orders (public backend; usually forwarded by Next proxy)

1. `POST https://admin.protein.tn/api/add_commande`  (this is what the Next proxy calls)
   - Body (`BackendOrderPayload`, built in `frontend/src/lib/orderPayload.ts`):
     - `commande`:
       - `livraison_nom: string`
       - `livraison_prenom: string`
       - `livraison_email: string`
       - `livraison_phone: string`
       - `livraison_region: string`
       - `livraison_ville: string`
       - `livraison_adresse1: string`
       - `livraison_code_postale?: string | number | null`
       - `livraison_adresse2?: string`
       - `livraison?: number` (default 1)
       - `frais_livraison: number`
       - optional: `note?: string`
       - optional: `user_id?: number`
       - Backend mirrors livraison into client fields too:
         - `nom, prenom, email, phone, region, ville, code_postale, adresse1, adresse2`
     - `panier`: array of:
       - `{ produit_id: number, quantite: number, prix_unitaire: number }`
     - optional:
       - `m_remise?: number`
       - `coupon_code?: string`

   - Response (backend implementation):
     - `Commande` model JSON (frontend reads `id` and often `numero`).


### Coupons

1. `POST https://admin.protein.tn/api/coupons/apply`
   - Body:
     - `{ code: string, subtotal_ht: number, frais_livraison?: number, client_id?: number, phone?: string, email?: string }`
   - Response:
     - `{ success: boolean, message: string, coupon?: { code, type, value }, discount_ht?: number, discount_ttc?: number, free_shipping?: boolean, totals?: {...} }`

2. `POST https://admin.protein.tn/api/coupons/remove`
   - Body:
     - `{ subtotal_ht: number, frais_livraison?: number }`
   - Response:
     - `{ success: boolean, message: string, coupon: null, discount_ht: number, discount_ttc: number, free_shipping: false, totals: {...} }`


### Next.js internal API routes (proxy)

These routes are called by the Next frontend (see `frontend/src/services/api.ts`).

1. `POST /api/orders`
   - Body: `BackendOrderPayload`
   - Headers:
     - `Authorization: Bearer <token>` (optional; forwarded if present)
     - `Idempotency-Key` (optional; forwarded)
   - Response: backend JSON from `/api/add_commande`

2. `POST /api/coupons/apply`
   - Body: same as backend `/api/coupons/apply`
   - Response: backend JSON

3. `POST /api/coupons/remove`
   - Body: same as backend `/api/coupons/remove`
   - Response: backend JSON

4. `POST /api/quick-order`
   - Body: `QuickOrderPayload` (see `frontend/src/types/index.ts`)
   - Notes:
     - Next builds the backend checkout payload and forwards to `/api/add_commande`
     - It performs extra validation (rate limiting + required fields checks).
   - Response (`QuickOrderResponse`):
     - `{ orderId, status, numero? }`

5. `GET /api/blog-recommended-products`
   - Query:
     - `articleSlug` (string, used for cache key)
     - `categorySlug` (optional)
     - `productSlugs` (optional; comma-separated)
   - Response:
     - `{ products: Product[] }`

6. `POST /api/revalidate`
   - Query or body:
     - `path` (optional)
     - `tag` (optional)
     - `secret` (optional; checked if `REVALIDATE_SECRET` env is set)
   - Response:
     - `{ revalidated: true, now, path, tag }`

7. `POST /api/revalidate-blog`
   - Headers:
     - `Authorization: Bearer <REVALIDATE_SECRET>` (if env secret set)
   - Body (optional):
     - `{ slug?: string }`
   - Response:
     - `{ revalidated: true, timestamp, slug?: string }`

## Where to update this doc

- If you change a backend route signature, update:
  - `frontend/src/services/api.ts`
  - `frontend/src/types/index.ts`
  - `frontend/src/lib/orderPayload.ts`

