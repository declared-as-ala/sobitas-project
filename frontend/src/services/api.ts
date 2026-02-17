import axios, { AxiosInstance, AxiosError } from 'axios';
import { apiFetch, ApiError } from '@/services/http';
import type {
  Product,
  Category,
  Brand,
  Article,
  Order,
  OrderRequest,
  OrderDetail,
  QuickOrderPayload,
  QuickOrderResponse,
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ContactRequest,
  NewsletterRequest,
  Coordinate,
  Service,
  FAQ,
  Page,
  SeoPage,
  HomeData,
  AccueilData,
  Review,
} from '@/types';

// Get API URL from .env (NEXT_PUBLIC_API_URL, NEXT_PUBLIC_STORAGE_URL)
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://admin.protein.tn/api';
const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL ?? 'https://admin.protein.tn/storage';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60s - avoids ETIMEDOUT when admin.sobitas.tn is slow
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    // Prevent caching at all levels (browser, proxy, nginx)
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: retry on 429 (max 2, backoff 400/900ms + jitter) and ETIMEDOUT/ECONNRESET, handle 401
const RETRY_429_DELAYS = [400, 900];
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError & { config?: { _retryCount?: number } }) => {
    const retryCount = error.config?._retryCount ?? 0;
    const status = error.response?.status;
    const is429 = status === 429 && retryCount < 2;
    const isNetwork =
      (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') &&
      retryCount < 2;
    const delay = is429
      ? RETRY_429_DELAYS[retryCount]! * (0.8 + Math.random() * 0.4)
      : 1500;
    if ((is429 || isNetwork) && error.config) {
      (error.config as any)._retryCount = retryCount + 1;
      await new Promise((r) => setTimeout(r, Math.floor(delay)));
      return api.request(error.config);
    }
    if (status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper to get storage URL - always use NEXT_PUBLIC_STORAGE_URL (admin.sobitas.tn)
// Rewrites localhost URLs from backend so images load from deployed backend
// For blog images, adds cache busting parameter based on updated_at or created_at
export const getStorageUrl = (path?: string, cacheBust?: string | number): string => {
  if (!path) return '';
  const base = STORAGE_URL.replace(/\/$/, '');
  let finalUrl = '';
  
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const u = new URL(path);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        const pathPart = u.pathname.replace(/^\/storage\/?/, '');
        finalUrl = pathPart ? `${base}/${pathPart}` : base;
      } else {
        finalUrl = path;
      }
    } catch {
      finalUrl = path;
    }
  } else {
    const clean = path.replace(/^\/+/, '');
    finalUrl = clean ? `${base}/${clean}` : base;
  }
  
  // Add cache busting for blog images
  if (cacheBust) {
    const separator = finalUrl.includes('?') ? '&' : '?';
    const timestamp = typeof cacheBust === 'number' 
      ? cacheBust 
      : typeof cacheBust === 'string' 
        ? new Date(cacheBust).getTime() 
        : Date.now();
    finalUrl = `${finalUrl}${separator}v=${timestamp}`;
  }
  
  return finalUrl;
};

// ==================== PUBLIC API ENDPOINTS ====================

// Homepage & Accueil
export const getAccueil = async (): Promise<AccueilData> => {
  try {
    const response = await api.get<AccueilData>('/accueil');
    // Ensure response.data exists and has the expected structure
    if (!response.data) {
      console.warn('[getAccueil] API returned empty data, using defaults');
      return {
        categories: [],
        last_articles: [],
        ventes_flash: [],
        new_product: [],
        packs: [],
        best_sellers: [],
      };
    }
    const ensureReviewCount = (products: any[]): any[] => {
      if (!Array.isArray(products)) return products;
      return products.map((p) => {
        if (!p || typeof p !== 'object') return p;
        const arr = p.reviews ?? p.avis;
        const count = p.reviews_count ?? p.review_count ?? p.avis_count ?? p.nombre_avis;
        if (count != null && count !== '') return p;
        if (Array.isArray(arr) && arr.length > 0) {
          const n = arr.filter((r: any) => typeof r?.stars === 'number' && (r.publier === undefined || r.publier === 1)).length;
          return { ...p, reviews_count: n, review_count: n };
        }
        return p;
      });
    };
    return {
      categories: response.data.categories || [],
      last_articles: response.data.last_articles || [],
      ventes_flash: ensureReviewCount(response.data.ventes_flash || []),
      new_product: ensureReviewCount(response.data.new_product || []),
      packs: ensureReviewCount(response.data.packs || []),
      best_sellers: ensureReviewCount(response.data.best_sellers || []),
    };
  } catch (error) {
    console.error('[getAccueil] API error:', error);
    // Return empty structure on error
    return {
      categories: [],
      last_articles: [],
      ventes_flash: [],
      new_product: [],
      packs: [],
      best_sellers: [],
    };
  }
};

export const getHome = async (): Promise<HomeData> => {
  const response = await api.get<HomeData>('/home');
  return response.data;
};

// Categories
export const getCategories = async (signal?: AbortSignal): Promise<Category[]> => {
  const response = await api.get<Category[]>('/categories', { signal });
  return response.data;
};

// Slides from https://admin.protein.tn/api/slides – image/cover are relative (e.g. "slides/February2026/xxx.jpg"); we build full URLs with admin.protein.tn
const SLIDES_API_BASE = 'https://admin.protein.tn';
const SLIDES_STORAGE_PATH = `${SLIDES_API_BASE}/storage`;

function toSlideImageUrl(path: string | null | undefined): string {
  if (!path || path.startsWith('http://') || path.startsWith('https://')) return path || '';
  const clean = path.replace(/^\//, '');
  return clean ? `${SLIDES_STORAGE_PATH}/${clean}` : '';
}

export const getSlides = async (): Promise<any[]> => {
  const response = await axios.get(`${SLIDES_API_BASE}/api/slides`, {
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
  });
  const raw = response.data?.data ?? response.data;
  const list = Array.isArray(raw) ? raw : [];
  return list.map((slide: any) => {
    const imagePath = slide?.image || slide?.cover || '';
    const coverPath = slide?.cover || slide?.image || '';
    return {
      ...slide,
      image: toSlideImageUrl(imagePath) || slide?.image,
      cover: toSlideImageUrl(coverPath) || slide?.cover,
    };
  });
};

// CMS pages for footer (Services & Ventes) from admin.protein.tn
export interface CmsPage {
  id: number;
  title: string;
  slug: string;
}

export const getCmsPages = async (): Promise<CmsPage[]> => {
  try {
    const response = await axios.get<CmsPage[]>('https://admin.protein.tn/api/pages', {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });
    const data = response.data;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

// Coordinates
export const getCoordinates = async (): Promise<Coordinate> => {
  const response = await api.get<Coordinate>('/coordonnees');
  return response.data;
};

// Products
export type ProductsResponse = {
  products: Product[];
  brands: Brand[];
  categories: Category[];
  pagination?: { total: number; current_page: number; per_page: number; last_page: number };
};

export const getAllProducts = async (params?: {
  page?: number;
  perPage?: number;
  search?: string;
  brand_id?: number;
  min_price?: number;
  max_price?: number;
  sort?: string;
}): Promise<ProductsResponse> => {
  try {
    const requestParams: Record<string, number | string> = {
      per_page: params?.perPage ?? 24,
      page: params?.page ?? 1,
    };
    if (params?.search?.trim()) requestParams.search = params.search.trim();
    if (params?.brand_id != null) requestParams.brand_id = params.brand_id;
    if (params?.min_price != null) requestParams.min_price = params.min_price;
    if (params?.max_price != null) requestParams.max_price = params.max_price;
    if (params?.sort) requestParams.sort = params.sort;

    const response = await api.get('/all_products', { params: requestParams });
    if (!response.data) {
      return { products: [], brands: [], categories: [] };
    }
    const raw = response.data;
    const products = Array.isArray(raw.products) ? raw.products : (raw.products?.data ?? []);
    return {
      products,
      brands: raw.brands || [],
      categories: raw.categories || [],
      pagination: raw.pagination
        ? {
            total: raw.pagination.total,
            current_page: raw.pagination.current_page,
            per_page: raw.pagination.per_page,
            last_page: raw.pagination.last_page,
          }
        : undefined,
    };
  } catch (error) {
    console.error('[getAllProducts] API error:', error);
    return { products: [], brands: [], categories: [] };
  }
};

const RETRY_DELAY_MS = 800;

async function withRetry<T>(fn: () => Promise<T>, isRetryable: (err: any) => boolean): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (!isRetryable(err)) throw err;
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    return fn();
  }
}

export const getProductDetails = async (slug: string, cacheBust?: boolean): Promise<Product> => {
  const cleanSlug = (slug || '').split('?')[0].trim();
  if (!cleanSlug) {
    const err: any = new Error('Product not found');
    err.response = { status: 404 };
    throw err;
  }
  const path = cacheBust
    ? `product_details/${encodeURIComponent(cleanSlug)}?t=${Date.now()}`
    : `product_details/${encodeURIComponent(cleanSlug)}`;
  try {
    const data = await apiFetch<Product>(path);
    if (!data || !(data as any).id) throw new ApiError('Product not found', 404);
    const raw = data as Product & { avis?: Review[] };
    if (Array.isArray(raw.avis) && !Array.isArray(raw.reviews)) {
      return { ...raw, reviews: raw.avis } as Product;
    }
    return data;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      const err: any = new Error('Product not found');
      err.response = { status: 404 };
      throw err;
    }
    throw e;
  }
};

/** Server-friendly: try subcategory first, then category. Uses apiFetch (429 retry, dedupe). */
export async function fetchCategoryOrSubCategory(slug: string): Promise<
  | { type: 'subcategory'; data: { sous_category: any; products: Product[]; brands: Brand[]; sous_categories: any[]; pagination?: any } }
  | { type: 'category'; data: { category: Category; sous_categories: any[]; products: Product[]; brands: Brand[] } }
> {
  const cleanSlug = (slug || '').trim();
  if (!cleanSlug) throw new ApiError('Not found', 404);

  try {
    const sub = await apiFetch<{ sous_category: any; products: Product[]; brands: Brand[]; sous_categories: any[]; pagination?: any }>(
      `productsBySubCategoryId/${encodeURIComponent(cleanSlug)}?per_page=24&page=1`
    );
    if (sub?.sous_category?.id) return { type: 'subcategory', data: sub };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      // try category
    } else {
      throw e;
    }
  }

  try {
    const cat = await apiFetch<{ category: Category; sous_categories: any[]; products: Product[]; brands: Brand[] }>(
      `productsByCategoryId/${encodeURIComponent(cleanSlug)}`
    );
    if (cat?.category?.id) return { type: 'category', data: cat };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) throw e;
    throw e;
  }

  throw new ApiError('Category not found', 404);
}

export const getProductsByCategory = async (slug: string): Promise<{
  category: Category;
  sous_categories: any[];
  products: Product[];
  brands: Brand[];
}> => {
  const cleanSlug = (slug || '').trim();
  if (!cleanSlug) {
    const err: any = new Error('Category not found');
    err.response = { status: 404 };
    throw err;
  }
  return withRetry(
    async () => {
      const response = await api.get(`/productsByCategoryId/${cleanSlug}`);
      if (!response.data || !response.data.category || !response.data.category.id) {
        console.warn(`Category "${cleanSlug}" not found in API response`);
        const err: any = new Error('Category not found');
        err.response = { status: 404 };
        throw err;
      }
      return response.data;
    },
    (err) => err?.response?.status !== 404 && (err?.code === 'ETIMEDOUT' || err?.code === 'ECONNRESET' || err?.code === 'ECONNABORTED' || (err?.response?.status >= 500 && err?.response?.status < 600))
  );
};

export const getProductsBySubCategory = async (
  slug: string,
  options?: { signal?: AbortSignal; page?: number; perPage?: number }
): Promise<{
  sous_category: any;
  products: Product[];
  brands: Brand[];
  sous_categories: any[];
  pagination?: { total: number; current_page: number; per_page: number; last_page: number };
}> => {
  const cleanSlug = (slug || '').trim();
  if (!cleanSlug) {
    const err: any = new Error('Subcategory not found');
    err.response = { status: 404 };
    throw err;
  }
  const signal = options?.signal;
  const params: Record<string, number> = {
    per_page: options?.perPage ?? 24,
    page: options?.page ?? 1,
  };
  return withRetry(
    async () => {
      const response = await api.get(`/productsBySubCategoryId/${cleanSlug}`, { signal, params });
      if (!response.data || !response.data.sous_category || !response.data.sous_category.id) {
        console.warn(`Subcategory "${cleanSlug}" not found in API response`);
        const err: any = new Error('Subcategory not found');
        err.response = { status: 404 };
        throw err;
      }
      return response.data;
    },
    (err) => {
      if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') return false;
      return err?.response?.status !== 404 && (err?.code === 'ETIMEDOUT' || err?.code === 'ECONNRESET' || err?.code === 'ECONNABORTED' || (err?.response?.status >= 500 && err?.response?.status < 600));
    }
  );
};

export const getProductsByBrand = async (brandId: number): Promise<{
  categories: Category[];
  products: Product[];
  brands: Brand[];
  brand: Brand;
}> => {
  const response = await api.get(`/productsByBrandId/${brandId}`);
  return response.data;
};

export const searchProducts = async (text: string): Promise<{
  products: Product[];
  brands: Brand[];
}> => {
  const response = await api.get(`/searchProduct/${text}`);
  return response.data;
};

export const searchProductsBySubCategory = async (slug: string, text: string): Promise<{
  products: Product[];
  brands: Brand[];
}> => {
  const response = await api.get(`/searchProductBySubCategoryText/${slug}/${text}`);
  return response.data;
};

export const getSimilarProducts = async (sousCategorieId: number): Promise<{ products: Product[] }> => {
  const response = await api.get(`/similar_products/${sousCategorieId}`);
  return response.data;
};

export const getLatestProducts = async (): Promise<{
  new_product: Product[];
  packs: Product[];
  best_sellers: Product[];
}> => {
  const response = await api.get('/latest_products');
  return response.data;
};

export const getLatestPacks = async (): Promise<Product[]> => {
  const response = await api.get('/latest_packs');
  return response.data;
};

export const getNewProducts = async (): Promise<Product[]> => {
  const response = await api.get('/new_product');
  return response.data;
};

export const getBestSellers = async (): Promise<Product[]> => {
  const response = await api.get('/best_sellers');
  return response.data;
};

export const getFlashSales = async (): Promise<Product[]> => {
  const response = await api.get('/ventes_flash');
  return response.data;
};

export const getPacks = async (): Promise<Product[]> => {
  const response = await api.get('/packs');
  return response.data;
};

// Brands
export const getAllBrands = async (): Promise<Brand[]> => {
  const response = await api.get('/all_brands');
  return response.data;
};

// Aromas & Tags
export const getAromas = async (): Promise<any[]> => {
  const response = await api.get('/aromes');
  return response.data;
};

export const getTags = async (): Promise<any[]> => {
  const response = await api.get('/tags');
  return response.data;
};

// ==================== ARTICLES / BLOG ====================
//
// Caching strategy:
//   Server-side fetches (getAllArticles, getArticleDetails, getLatestArticles)
//   use `next: { tags: ['blog'] }` which opts into the Next.js Data Cache
//   with on-demand tag-based revalidation.  The cache lives until the admin
//   calls POST /api/revalidate-blog which runs `revalidateTag('blog')`.
//
//   Client-side fetch (getAllArticlesClient) is called from BlogPageClient
//   on mount & visibilitychange as a safety-net.  It uses `cache:'no-store'`
//   + no-cache headers so the browser always hits the origin API.
//
//   ⚠ Do NOT add ?_t=Date.now() to server-side URLs — it defeats the
//   Data Cache entirely (every request looks like a different URL).
// ─────────────────────────────────────────────────────────

export const getAllArticles = async (): Promise<Article[]> => {
  const response = await fetch(`${API_URL}/all_articles`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    next: { tags: ['blog'] }, // ISR: cached until revalidateTag('blog')
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch articles: ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.articles || []);
};

export const getArticleDetails = async (slug: string): Promise<Article> => {
  const response = await fetch(`${API_URL}/article_details/${slug}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    next: { tags: ['blog'] },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Article not found');
    }
    throw new Error(`Failed to fetch article: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
};

export const getLatestArticles = async (): Promise<Article[]> => {
  const response = await fetch(`${API_URL}/latest_articles`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    next: { tags: ['blog'] },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch latest articles: ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.articles || []);
};

/**
 * Client-side fetch for articles — called by BlogPageClient on mount
 * and on visibilitychange to guarantee fresh data in the browser.
 * Uses cache:'no-store' + no-cache headers (browser → origin, no Next.js
 * Data Cache involved).  No ?_t= needed.
 */
export const getAllArticlesClient = async (): Promise<Article[]> => {
  const response = await fetch(`${API_URL}/all_articles`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch articles: ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.articles || []);
};

// Media
export const getMedia = async (): Promise<any> => {
  const response = await api.get('/media');
  return response.data;
};

// Services
export const getServices = async (): Promise<Service[]> => {
  const response = await api.get<Service[]>('/services');
  return response.data;
};

// Pages (main API – for /page/[slug] etc.)
export const getAppPages = async (): Promise<Page[]> => {
  const response = await api.get<Page[]>('/pages');
  return response.data;
};

export const getPageBySlug = async (slug: string): Promise<Page> => {
  const path = `page/${encodeURIComponent(slug)}`;
  try {
    const data = await apiFetch<Page>(path);
    if (!data || !(data as any).title) throw new ApiError('Page not found', 404);
    return data;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) throw e;
    throw e;
  }
};

// FAQs
export const getFAQs = async (): Promise<FAQ[]> => {
  const response = await api.get<FAQ[]>('/faqs');
  return response.data;
};

// SEO
export const getSeoPage = async (name: string): Promise<SeoPage> => {
  const response = await api.get<SeoPage>(`/seo_page/${name}`);
  return response.data;
};

// Contact & Newsletter
export const sendContact = async (data: ContactRequest): Promise<{ success: string }> => {
  const response = await api.post('/contact', data);
  return response.data;
};

export const subscribeNewsletter = async (data: NewsletterRequest): Promise<{ success: string } | { error: string }> => {
  const response = await api.post('/newsletter', data);
  return response.data;
};

// Orders
export const getOrderDetails = async (id: number): Promise<{
  facture: Order;
  details_facture: any[];
}> => {
  const response = await api.get(`/commande/${id}`);
  return response.data;
};

const ORDER_429_DELAYS = [400, 900];
export const createOrder = async (orderData: OrderRequest): Promise<{
  id: number;
  message: string;
  'alert-type': string;
}> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  let response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(orderData),
    cache: 'no-store',
  });
  for (let attempt = 0; response.status === 429 && attempt < 2; attempt++) {
    const delay = ORDER_429_DELAYS[attempt]! * (0.8 + Math.random() * 0.4);
    await new Promise((r) => setTimeout(r, Math.floor(delay)));
    response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(orderData),
      cache: 'no-store',
    });
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as any).error || 'Erreur lors de la création de la commande');
  }
  return response.json();
};

/** Quick order (commande rapide) – one product, minimal form. Does not modify cart. */
export const submitQuickOrder = async (payload: QuickOrderPayload): Promise<QuickOrderResponse> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const response = await fetch('/api/quick-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as any).error || 'Erreur lors de la commande rapide');
  }
  return data as QuickOrderResponse;
};

// ==================== AUTHENTICATED API ENDPOINTS ====================

// Auth
export const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/login', credentials);
  return response.data;
};

export const register = async (data: RegisterRequest): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/register', data);
  return response.data;
};

export const getUser = async (): Promise<User> => {
  const response = await api.get<User>('/user');
  return response.data;
};

export const getProfile = async (): Promise<User> => {
  const response = await api.get<User>('/profil');
  return response.data;
};

export const updateProfile = async (data: Partial<User> & { password?: string }): Promise<User> => {
  const response = await api.post<User>('/update_profile', data);
  return response.data;
};

export const getClientOrders = async (): Promise<Order[]> => {
  const response = await api.get<Order[]>('/client_commandes');
  return response.data;
};

export const getOrderDetail = async (id: number): Promise<{
  commande: Order;
  details: OrderDetail[];
}> => {
  const response = await api.post<{
    commande: Order;
    details: any[];
  }>(`/detail_commande/${id}`);
  return response.data;
};

export const addReview = async (data: {
  product_id: number;
  stars: number;
  comment?: string;
}): Promise<Review> => {
  const response = await api.post<Review>('/add_review', data);
  return response.data;
};

// Redirections
export const getRedirections = async (): Promise<any[]> => {
  const response = await api.get('/redirections');
  return response.data;
};

export default api;
