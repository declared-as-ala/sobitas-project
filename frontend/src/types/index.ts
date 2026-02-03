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
  rupture?: number;
  meta?: string;
  brand_id?: number;
  sous_categorie_id?: number;
  aromes?: Aroma[];
  tags?: Tag[];
  sous_categorie?: SubCategory;
  brand?: Brand;
  reviews?: Review[];
  qte?: number;
  nutrition_values?: string | null;
  questions?: string | null;
  code_product?: string | null;
}

export interface Category {
  id: number;
  slug: string;
  designation_fr: string;
  cover?: string;
  sous_categories?: SubCategory[];
}

export interface SubCategory {
  id: number;
  slug: string;
  designation_fr: string;
  categorie_id?: number;
  categorie?: Category;
}

export interface Brand {
  id: number;
  designation_fr: string;
  logo?: string;
  alt_cover?: string;
  description_fr?: string;
}

export interface Aroma {
  id: number;
  designation_fr: string;
}

export interface Tag {
  id: number;
  designation_fr: string;
}

export interface Review {
  id: number;
  stars: number;
  comment?: string;
  publier?: number;
  user?: {
    id: number;
    name: string;
    avatar?: string;
  };
  created_at?: string;
}

// Slide Types (backend: type = 'mobile' | 'web' controls which device shows the slide)
export interface Slide {
  id: number;
  type?: 'mobile' | 'web';
  titre?: string;
  description?: string;
  image?: string;
  lien?: string;
  ordre?: number;
}

// Article/Blog Types
export interface Article {
  id: number;
  slug: string;
  designation_fr: string;
  description?: string;
  description_fr?: string;
  cover?: string;
  created_at?: string;
  publier?: number;
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
    nom: string;
    prenom: string;
    email: string;
    phone: string;
    pays?: string;
    region?: string;
    ville?: string;
    code_postale?: string | number | null;
    adresse1: string;
    adresse2?: string;
    livraison?: number; // 1 = livraison activée, 0 = pas de livraison
    frais_livraison?: number;
    note?: string;
    user_id?: number;
    livraison_nom?: string;
    livraison_prenom?: string;
    livraison_email?: string;
    livraison_phone?: string;
    livraison_region?: string;
    livraison_ville?: string;
    livraison_code_postale?: string | null;
    livraison_adresse1?: string;
    livraison_adresse2?: string;
  };
  panier: Array<{
    produit_id: number;
    quantite: number;
    prix_unitaire: number;
  }>;
}

// Auth Types
export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role_id?: number;
  avatar?: string;
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
  phone?: string;
  email?: string;
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
  reponse?: string;
}

// Page Types
export interface Page {
  id: number;
  title: string;
  slug: string;
  body?: string;
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
