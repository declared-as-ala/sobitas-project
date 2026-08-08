// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Product Types
export interface Product {
  id: number;
  slug: string;
  designation_fr: string;
  designation_ar?: string;
  description_ar?: string;
  description_fr?: string;
  description_cover?: string;
  cover?: string;
  alt_cover?: string;
  prix: number;
  promo?: number;
  promo_expiration_date?: string;
  new_product?: number;
  best_seller?: number;
  pack?: number;
  note?: number;
  publier?: number;
  rupture?: number | boolean;
  meta?: string;
  meta_title?: string;
  meta_description?: string;
  meta_description_fr?: string;
  content_seo?: string;
  brand_id?: number;
  sous_categorie_id?: number;
  aromes?: Aroma[];
  tags?: Tag[];
  /** Legacy single subcategory (backward compatibility) */
  sous_categorie?: SubCategory;
  /** Multiple subcategories (new many-to-many relationship) */
  sous_categories?: SubCategory[];
  brand?: Brand;
  reviews?: Review[];
  qte?: number;
  low_stock_threshold?: number;
  nutrition_values?: string | null;
  /** Array of image paths for the nutrition facts section (stored in storage/public/produits/nutrition) */
  nutrition_images?: string[] | null;
  /** Structured Supplement Facts; nutrition_values above is the HTML DERIVED from it. */
  nutrition_facts?: Record<string, unknown> | null;
  /** One official brand video. The id is re-validated at render — see util/officialVideo.ts. */
  official_video?: {
    youtube_id: string;
    title?: string | null;
    channel?: string | null;
    source_url?: string | null;
    verified_at?: string | null;
  } | null;
  /** Filament repeater: [{ q, a }, …] — product-specific FAQ shown on detail page */
  faq?: Array<{ q?: string; a?: string; question?: string; answer?: string }> | null;
  /** Legacy HTML block (older backends); optional fallback if `faq` is empty */
  questions?: string | null;
  code_product?: string | null;
  sku?: string | null;
  gtin?: string | null;
  mpn?: string | null;
  item_condition?: string | null;
  availability_override?: string | null;
  price_valid_until?: string | null;
  seo_image_alt?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_excerpt?: string | null;
  seo_canonical_url?: string | null;
  seo_robots_index?: boolean | null;
  seo_robots_follow?: boolean | null;
  seo?: {
    title?: string | null;
    description?: string | null;
    excerpt?: string | null;
    canonical_url?: string | null;
    image?: string | null;
    image_alt?: string | null;
    robots?: {
      index?: boolean;
      follow?: boolean;
    };
  };
  schema?: {
    sku?: string | null;
    gtin?: string | null;
    mpn?: string | null;
    brand?: string | null;
    price?: number | null;
    price_currency?: string | null;
    availability?: string | null;
    item_condition?: string | null;
    price_valid_until?: string | null;
    image?: string | null;
    image_alt?: string | null;
    /** Average rating from published reviews (API-computed). */
    rating_value?: number | null;
    review_count?: number | null;
    /** Return policy indicator for schema.org Product */
    has_merchant_return_policy?: boolean | null;
  };
  /** Server-built schema.org Product graph (preferred over client-side `buildProductJsonLd`). */
  json_ld_product?: Record<string, unknown> | null;
  zone1?: string;
  zone2?: string;
  zone3?: string;
  zone4?: string;
  image_mode?: 'cover' | 'contain' | 'cover-zoom';
  image_position?: string;
  image_zoom?: number;
}

export interface Category {
  id: number;
  slug: string;
  designation_fr: string;
  designation_ar?: string;
  cover?: string;
  sous_categories?: SubCategory[];
  /** From Laravel — drives sitemap / indexing hints when present */
  sitemap_include?: boolean;
  sitemap_priority?: number | null;
  sitemap_changefreq?: string | null;
  robots_index?: boolean;
  seo_enabled?: boolean;
}

export interface SubCategory {
  id: number;
  slug: string;
  designation_fr: string;
  designation_ar?: string;
  categorie_id?: number;
  categorie?: Category;
  sitemap_include?: boolean;
  sitemap_priority?: number | null;
  sitemap_changefreq?: string | null;
  robots_index?: boolean;
  seo_enabled?: boolean;
}

export interface Brand {
  id: number;
  designation_fr: string;
  designation_ar?: string;
  logo?: string;
  alt_cover?: string;
  description_fr?: string;
}

export interface Aroma {
  id: number;
  designation_fr: string;
  designation_ar?: string;
}

export interface Tag {
  id: number;
  designation_fr: string;
  designation_ar?: string;
}

export interface Review {
  id: number;
  /** Primary rating (1–5); API usually sends this. */
  stars: number;
  /** Legacy/alternate rating field from some payloads. */
  note?: number;
  comment?: string;
  publier?: number;
  /**
   * Evidence the review came from a real purchase. Structured data requires one of these — see
   * buildAggregateRatingAndReviews in util/structuredData.ts. "Published" is not the same as
   * "genuine": the catalogue carries a large seeded review backlog with verified = 0 and
   * commande_id = null on every row.
   */
  verified?: number | boolean;
  commande_id?: number | null;
  user?: {
    id: number;
    name: string;
    avatar?: string;
  };
  created_at?: string;
}

// Slide types removed. This interface described columns (`titre`/`image`/`lien`) that never
// matched what /slides actually returns (`title`/`cover`/`link`), which is why the old homepage
// code papered over it with an `any` multi-key probe and sorted by an `ordre` field the API did
// not send. The wire format now lives in ONE place, next to its fetcher: `ServerSlide` in
// services/siteChrome.server.ts, with the render-side shape as `HeroSlide` in util/heroImage.ts.

// Article/Blog Types
export interface Article {
  id: number;
  slug: string;
  designation_fr: string;
  description?: string;
  description_fr?: string;
  meta_title?: string | null;
  meta_description_fr?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_excerpt?: string | null;
  seo_canonical_url?: string | null;
  seo_robots_index?: boolean | null;
  seo_robots_follow?: boolean | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  twitter_image?: string | null;
  twitter_card?: string | null;
  seo_author_name?: string | null;
  /** Blog body text direction: auto | ltr | rtl (from CMS). */
  content_text_direction?: 'auto' | 'ltr' | 'rtl' | string | null;
  /** ISO language code for article body (e.g. fr, ar). */
  content_lang?: string | null;
  cover?: string;
  created_at?: string;
  updated_at?: string; // Added for cache busting
  publier?: number;
  /** Admin-set blog category (complements | lifestyle | nutrition | recettes | sport). Legacy articles may omit. */
  blog_type?: string | null;
  /** Optional: category slug for product recommendations (e.g. "whey") */
  category_slug?: string;
  /** Optional: tags/keywords for matching products (legacy) or taxonomy tags from API. */
  tags?: Array<string | BlogTagSummary>;
  /** Optional: admin-set product slugs for "Produits recommandés" (manual override) */
  recommended_product_slugs?: string[];
  categories?: BlogCategorySummary[];
  seo?: {
    title?: string | null;
    description?: string | null;
    excerpt?: string | null;
    canonical_url?: string | null;
    author?: string | null;
    image?: string | null;
    robots?: {
      index?: boolean;
      follow?: boolean;
    };
    open_graph?: {
      title?: string | null;
      description?: string | null;
      image?: string | null;
    };
    twitter?: {
      card?: string | null;
      title?: string | null;
      description?: string | null;
      image?: string | null;
    };
  };
  schema?: {
    type?: string;
    headline?: string | null;
    description?: string | null;
    image?: string | null;
    author?: string | null;
    date_published?: string | null;
    date_modified?: string | null;
    section?: string | null;
  };
  /** Shop category slugs for internal linking (from Filament). */
  related_shop_categories?: Array<{ slug: string; url: string }>;
}

export interface BlogCategorySummary {
  id: number;
  name: string;
  slug: string;
}

export interface BlogTagSummary {
  id: number;
  name: string;
  slug: string;
}

// Order Types
export interface Order {
  id: number;
  numero: string;
  nom: string;
  prenom: string;
  email: string;
  phone: string;
  pays?: string;
  region?: string;
  ville?: string;
  code_postale?: string;
  adresse1: string;
  adresse2?: string;
  livraison?: number; // 1 = livraison activée, 0 = pas de livraison
  frais_livraison?: number;
  note?: string;
  etat: string;
  prix_ht: number;
  prix_ttc: number;
  user_id?: number;
  created_at?: string;
  details?: OrderDetail[];
  // Shipping address fields
  livraison_nom?: string;
  livraison_prenom?: string;
  livraison_email?: string;
  livraison_phone?: string;
  livraison_region?: string;
  livraison_ville?: string;
  livraison_code_postale?: string;
  livraison_adresse1?: string;
  livraison_adresse2?: string;
}

export interface OrderDetail {
  id: number;
  produit_id: number;
  qte: number;
  prix_unitaire: number;
  prix_ht: number;
  prix_ttc: number;
  produit?: Product;
}

export interface OrderRequest {
  commande: {
    // Billing fields removed - only shipping/livraison data is sent
    // Optional for backward compatibility, but should not be sent
    nom?: string;
    prenom?: string;
    email?: string;
    phone?: string;
    pays?: string;
    region?: string;
    ville?: string;
    code_postale?: string | number | null;
    adresse1?: string;
    adresse2?: string;
    // Shipping/Livraison fields (required)
    livraison?: number; // 1 = livraison activée, 0 = pas de livraison
    frais_livraison?: number;
    note?: string;
    user_id?: number;
    livraison_nom: string;
    livraison_prenom: string;
    livraison_email: string;
    livraison_phone: string;
    livraison_region: string;
    livraison_ville: string;
    livraison_code_postale?: string | null;
    livraison_adresse1: string;
    livraison_adresse2?: string;
  };
  panier: Array<{
    produit_id: number;
    quantite: number;
    prix_unitaire: number;
  }>;
}

/** Quick order (commande rapide) – minimal one-item order from product page. Does not modify cart. */
export interface QuickOrderPayload {
  productId: number;
  variantId?: number;
  qty: number;
  /** Required: first name / family name */
  nom: string;
  prenom: string;
  /** Required: customer email */
  email: string;
  phone: string;
  /** New flow: gouvernorat + délégation + localité (like checkout). If set, address is not required. */
  gouvernorat?: string;
  delegation?: string;
  localite?: string;
  codePostal?: string;
  /** Legacy: used only when gouvernorat/delegation/localite not provided */
  city?: string;
  address?: string;
  priceSnapshot: number;
  deliveryFeeSnapshot?: number;
  currency?: string;
  source?: string;
  /** Honeypot – must be empty */
  website?: string;
  /** Code promo (validated via /coupons/apply before submit) */
  couponCode?: string;
}

export interface QuickOrderResponse {
  orderId: number | string;
  status: string;
  numero?: string;
}

// Auth Types
export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role_id?: number;
  avatar?: string;
  /** CRM client id when linked (Laravel `profil` / `update_profile`). */
  client_id?: number | null;
  /** Loyalty points balance (integer). From GET /profil. */
  points_balance?: number;
  /** Monetary value of the balance in DT (balance / 20, 3 dp). From GET /profil. */
  points_value_dt?: number;
}

/** Line item returned by POST /pack/quote (server-computed from real product prices). */
export interface PackQuoteItem {
  produit_id: number;
  designation: string;
  prix_unitaire: number;
  quantite: number;
  line_total: number;
}

/** Authoritative pack-discount quote from POST /pack/quote (bundle tiers on subtotal_ht). */
export interface PackQuote {
  subtotal: number;
  /** 0, 5, 8 or 12 */
  discount_percent: number;
  /** DT, rounded to 3 decimals */
  discount_amount: number;
  /** subtotal - discount_amount */
  total: number;
  /** e.g. "-8%" or null */
  tier_label: string | null;
  next_tier: { threshold: number; percent: number; remaining: number } | null;
  items: PackQuoteItem[];
}

/** A single loyalty-points ledger row from GET /points/history. */
export interface PointsTransaction {
  id: number;
  type: 'earn' | 'redeem' | 'adjustment' | 'expiry';
  points: number;
  balance_after: number;
  description: string;
  commande_id: number | null;
  created_at: string;
}

/** Loyalty-points history + balance from GET /points/history (auth). */
export interface PointsHistory {
  balance: number;
  value_dt: number;
  transactions: PointsTransaction[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  role_id: number;
}

export interface AuthResponse {
  token: string;
  name: string;
  id: number;
}

// Contact & Newsletter Types
export interface ContactRequest {
  name: string;
  email: string;
  message: string;
}

export interface NewsletterRequest {
  email: string;
}

// Coordinate Types
export interface Coordinate {
  id: number;
  gelocalisation?: string;
  adresse?: string;
  adresse_fr?: string;
  phone?: string;
  phone_1?: string;
  phone_2?: string;
  email?: string;
  logo?: string | null;
  logo_footer?: string | null;
  [key: string]: any;
}

// Service Types
export interface Service {
  id: number;
  designation_fr?: string;
  description_fr?: string;
  icon?: string;
}

// FAQ Types
export interface FAQ {
  id: number;
  question?: string;
  /** API (Filament) returns `answer`; legacy may use `reponse` */
  answer?: string;
  reponse?: string;
}

// Page Types
export interface Page {
  id: number;
  author_id?: number;
  title: string;
  slug: string;
  body?: string | null;
  excerpt?: string | null;
  image?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  canonical_url?: string | null;
  robots_index?: boolean | null;
  robots_follow?: boolean | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SiteNavigationItem {
  id: number;
  location: 'navbar' | 'sidebar' | string;
  label: string;
  url: string;
  icon?: string | null;
  is_visible?: boolean;
  sort_order?: number;
  opens_new_tab?: boolean;
}

// SEO Types
export interface SeoPage {
  id: number;
  page: string;
  title?: string;
  description?: string;
  keywords?: string;
}

// Homepage Data Types
export interface HomeData {
  categories?: Category[];
  last_articles?: Article[];
  ventes_flash?: Product[];
  new_product?: Product[];
  packs?: Product[];
  best_sellers?: Product[];
}

export interface AccueilData {
  categories: Category[];
  last_articles: Article[];
  ventes_flash: Product[];
  new_product: Product[];
  packs: Product[];
  best_sellers: Product[];
}

// Address Data Types
export interface Localite {
  Name: string;
  NameAr?: string;
  PostalCode: string;
  Latitude?: number;
  Longitude?: number;
}

export interface Delegation {
  Name: string;
  NameAr?: string;
  Value: string;
  PostalCode?: string;
  Latitude?: number;
  Longitude?: number;
  Localités?: Localite[];
}

export interface AddressData {
  Name: string;
  NameAr?: string;
  Value: string;
  Delegations: Delegation[];
}
